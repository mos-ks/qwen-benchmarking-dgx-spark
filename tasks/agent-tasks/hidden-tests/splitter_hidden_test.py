"""Hidden acceptance tests for the Splitter change request (a bug fix and a feature in an existing app).
Run from the agent's workspace:

    python3 splitter_hidden_test.py <regression|rounding|custom|settle|migrate|ui|owntests>

Each mode starts the app the README way (./start.sh with PORT and DB_PATH), runs its checks, stops it,
and exits 0 only if every check in that mode passed. `ui` needs Playwright.
"""

import contextlib
import json
import os
import signal
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

# The schema every database in the field is on: version 1 of the shipped app.
V1_SCHEMA = """
create table groups(id integer primary key, name text not null);
create table members(id integer primary key, group_id integer not null references groups(id), name text not null);
create table expenses(id integer primary key, group_id integer not null references groups(id),
  payer_id integer not null references members(id), description text not null, amount_cents integer not null,
  created_at text not null);
create index expenses_by_group on expenses(group_id, id);
pragma user_version = 1;
"""


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@contextlib.contextmanager
def app(db_path: str):
    port = free_port()
    proc = subprocess.Popen(
        ["bash", "./start.sh"],
        env={**os.environ, "PORT": str(port), "DB_PATH": db_path},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    base = f"http://127.0.0.1:{port}"
    try:
        for _ in range(100):
            try:
                urllib.request.urlopen(base + "/", timeout=1)
                break
            except urllib.error.HTTPError:
                break
            except (urllib.error.URLError, ConnectionError, OSError):
                time.sleep(0.2)
        else:
            raise AssertionError("server did not answer GET / within 20 s")
        yield base
    finally:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(proc.pid, signal.SIGTERM)
        proc.wait(timeout=10)


def call(base, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        base + path, data=data, method=method, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            text = r.read().decode()
            return r.status, (json.loads(text) if text.strip() else None)
    except urllib.error.HTTPError as e:
        text = e.read().decode()
        try:
            return e.code, json.loads(text)
        except ValueError:
            return e.code, text


def check(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)


def err_code(body):
    return body.get("error", {}).get("code") if isinstance(body, dict) else None


def group(base, *names):
    st, g = call(base, "POST", "/api/groups", {"name": "Trip", "members": list(names)})
    check(st == 201, f"create group -> {st} {g}")
    return g, [m["id"] for m in g["members"]]


def expense(base, gid, payer, amount, shares=None, description="x"):
    body = {"payer_id": payer, "description": description, "amount_cents": amount}
    if shares is not None:
        body["shares"] = shares
    return call(base, "POST", f"/api/groups/{gid}/expenses", body)


def balances(base, gid) -> dict[int, int]:
    st, b = call(base, "GET", f"/api/groups/{gid}/balances")
    check(st == 200, f"balances -> {st} {b}")
    return {x["member_id"]: x["balance_cents"] for x in b}


def shares_of(e) -> dict[int, int]:
    check(isinstance(e.get("shares"), list), f"expense without shares: {e}")
    ids = [s["member_id"] for s in e["shares"]]
    check(ids == sorted(ids), f"shares not sorted by member_id: {e['shares']}")
    return {s["member_id"]: s["share_cents"] for s in e["shares"]}


def m_regression(base, db):
    g, (ann, bob, cy) = group(base, " Ann ", "Bob", "Cy")
    check([m["name"] for m in g["members"]] == ["Ann", "Bob", "Cy"], f"members {g}")
    st, again = call(base, "GET", f"/api/groups/{g['id']}")
    check(st == 200 and again["members"] == g["members"], f"read group -> {st} {again}")
    for body in (
        {"name": "", "members": ["a", "b"]},
        {"name": "x", "members": ["a"]},
        {"name": "x", "members": ["a", "a"]},
    ):
        st, r = call(base, "POST", "/api/groups", body)
        check(st == 400 and err_code(r) == "validation", f"{body} -> {st} {r}")
    st, r = call(base, "GET", "/api/groups/987654")
    check(st == 404 and err_code(r) == "not_found", f"unknown group -> {st} {r}")
    st, e = expense(base, g["id"], ann, 3000, description="Dinner")
    check(
        st == 201 and e["amount_cents"] == 3000 and e["description"] == "Dinner",
        f"expense -> {st} {e}",
    )
    check(
        balances(base, g["id"]) == {ann: 2000, bob: -1000, cy: -1000},
        "equal split balances changed",
    )
    expense(base, g["id"], bob, 300, description="later")
    st, items = call(base, "GET", f"/api/groups/{g['id']}/expenses")
    check([x["description"] for x in items] == ["later", "Dinner"], f"newest first: {items}")
    for body in (
        {"payer_id": 999999, "description": "x", "amount_cents": 100},
        {"payer_id": ann, "description": " ", "amount_cents": 100},
        {"payer_id": ann, "description": "x", "amount_cents": 0},
    ):
        st, r = call(base, "POST", f"/api/groups/{g['id']}/expenses", body)
        check(st == 400 and err_code(r) == "validation", f"{body} -> {st} {r}")
    st, r = call(base, "POST", f"/api/groups/{g['id']}/expenses", None)
    check(st in (400,), f"empty body -> {st} {r}")


def m_rounding(base, db):
    g, (ann, bob, cy) = group(base, "Ann", "Bob", "Cy")
    st, e = expense(base, g["id"], cy, 1000)
    check(st == 201, f"expense -> {st} {e}")
    b = balances(base, g["id"])
    check(sum(b.values()) == 0, f"balances do not add up to zero: {b}")
    check(b == {ann: -334, bob: -333, cy: 667}, f"balances {b}")
    g2, ids = group(base, *"ABCDEFG")
    for amount in (1, 2, 5, 99, 101, 1003):
        expense(base, g2["id"], ids[3], amount)
    check(sum(balances(base, g2["id"]).values()) == 0, "seven-way balances do not add up to zero")


def m_custom(base, db):
    g, (ann, bob, cy) = group(base, "Ann", "Bob", "Cy")
    _, (zed, _) = group(base, "Zed", "Yan")
    gid = g["id"]
    for shares in (
        [{"member_id": bob, "share_cents": 700}, {"member_id": cy, "share_cents": 200}],
        [{"member_id": bob, "share_cents": 1100}, {"member_id": cy, "share_cents": -100}],
        [{"member_id": bob, "share_cents": 500}, {"member_id": bob, "share_cents": 500}],
        [{"member_id": zed, "share_cents": 1000}],
        [{"member_id": bob, "share_cents": 999.5}, {"member_id": cy, "share_cents": 0.5}],
        "all on Bob",
    ):
        st, r = expense(base, gid, ann, 1000, shares)
        check(st == 400 and err_code(r) == "validation", f"shares {shares} -> {st} {r}")
    check(balances(base, gid) == {ann: 0, bob: 0, cy: 0}, "a rejected expense changed balances")
    st, e = expense(
        base,
        gid,
        ann,
        1000,
        [{"member_id": cy, "share_cents": 300}, {"member_id": bob, "share_cents": 700}],
    )
    check(st == 201, f"custom expense -> {st} {e}")
    check(shares_of(e) == {ann: 0, bob: 700, cy: 300}, f"custom shares: {e.get('shares')}")
    check(
        balances(base, gid) == {ann: 1000, bob: -700, cy: -300},
        f"custom balances {balances(base, gid)}",
    )
    st, e = expense(base, gid, bob, 900)
    check(st == 201 and shares_of(e) == {ann: 300, bob: 300, cy: 300}, f"equal split shares: {e}")
    g3, (p, q, r) = group(base, "P", "Q", "R")
    st, e = expense(base, g3["id"], r, 1000)
    check(shares_of(e) == {p: 334, q: 333, r: 333}, f"1000 / 3 shares: {e.get('shares')}")
    check(
        balances(base, gid) == {ann: 700, bob: -100, cy: -600},
        f"mixed balances {balances(base, gid)}",
    )
    st, items = call(base, "GET", f"/api/groups/{gid}/expenses")
    check(
        st == 200
        and [shares_of(x) for x in items]
        == [{ann: 300, bob: 300, cy: 300}, {ann: 0, bob: 700, cy: 300}],
        f"listed shares {items}",
    )


def settle_ok(base, gid, ids):
    st, pays = call(base, "GET", f"/api/groups/{gid}/settlements")
    check(st == 200 and isinstance(pays, list), f"settlements -> {st} {pays}")
    bal = balances(base, gid)
    check(len(pays) <= max(0, len(ids) - 1), f"{len(pays)} payments for {len(ids)} members")
    for p in pays:
        f, t, a = p.get("from_member_id"), p.get("to_member_id"), p.get("amount_cents")
        check(f in bal and t in bal and f != t and isinstance(a, int) and a > 0, f"bad payment {p}")
        bal[f] += a
        bal[t] -= a
    check(all(v == 0 for v in bal.values()), f"after the payments balances are {bal}")
    return pays


def m_settle(base, db):
    g, ids = group(base, "Ann", "Bob", "Cy", "Dee", "Eve")
    check(settle_ok(base, g["id"], ids) == [], "a settled group needs no payments")
    expense(base, g["id"], ids[0], 10000)
    expense(base, g["id"], ids[1], 2333)
    expense(
        base,
        g["id"],
        ids[2],
        4000,
        [{"member_id": ids[3], "share_cents": 3000}, {"member_id": ids[4], "share_cents": 1000}],
    )
    expense(base, g["id"], ids[4], 777)
    settle_ok(base, g["id"], ids)
    g2, ids2 = group(base, "P", "Q")
    expense(base, g2["id"], ids2[0], 101)
    pays = settle_ok(base, g2["id"], ids2)
    check(
        pays == [{"from_member_id": ids2[1], "to_member_id": ids2[0], "amount_cents": 50}],
        f"two-person settle {pays}",
    )
    st, r = call(base, "GET", "/api/groups/987654/settlements")
    check(st == 404 and err_code(r) == "not_found", f"unknown group settlements -> {st} {r}")


def m_migrate(_unused, db):
    conn = sqlite3.connect(db)
    conn.executescript(V1_SCHEMA)
    conn.execute("insert into groups(id, name) values (7, 'Flat')")
    conn.executemany(
        "insert into members(id, group_id, name) values (?, 7, ?)",
        [(21, "Ann"), (22, "Bob"), (23, "Cy")],
    )
    conn.executemany(
        "insert into expenses(group_id, payer_id, description, amount_cents, created_at) values (7, ?, ?, ?, ?)",
        [
            (21, "Rent", 90000, "2026-09-01T10:00:00+00:00"),
            (23, "Pizza", 1000, "2026-09-02T19:30:00+00:00"),
        ],
    )
    conn.commit()
    conn.close()
    with app(db) as base:
        st, g = call(base, "GET", "/api/groups/7")
        check(
            st == 200 and [m["name"] for m in g["members"]] == ["Ann", "Bob", "Cy"],
            f"old group after upgrade -> {st} {g}",
        )
        st, items = call(base, "GET", "/api/groups/7/expenses")
        check(
            st == 200 and [x["description"] for x in items] == ["Pizza", "Rent"],
            f"old expenses -> {st} {items}",
        )
        check(
            shares_of(items[0]) == {21: 334, 22: 333, 23: 333},
            f"old expense shares {items[0].get('shares')}",
        )
        check(
            balances(base, 7) == {21: 59666, 22: -30333, 23: -29333},
            f"old balances {balances(base, 7)}",
        )
        st, e = expense(base, 7, 22, 600, [{"member_id": 21, "share_cents": 600}])
        check(st == 201, f"custom expense on an old group -> {st} {e}")
    with app(db) as base:
        check(
            balances(base, 7) == {21: 59066, 22: -29733, 23: -29333},
            "data lost on the second start",
        )
        settle_ok(base, 7, [21, 22, 23])


def m_ui(base, db):
    from playwright.sync_api import expect, sync_playwright

    g, (ann, bob, cy) = group(base, "Ann", "Bob", "Cy")
    with sync_playwright() as pw:
        page = pw.chromium.launch().new_page()
        page.goto(f"{base}/groups/{g['id']}")
        expect(page.get_by_label("Description", exact=True)).to_be_visible(timeout=5000)
        page.evaluate("window.__noReload = 1")
        page.get_by_label("Description", exact=True).fill("Taxi")
        page.get_by_label("Amount", exact=True).fill("30.00")
        page.get_by_label("Paid by", exact=True).select_option(label="Ann")
        page.get_by_label("Split", exact=True).select_option(label="Custom")
        page.get_by_label("Ann", exact=True).fill("0")
        page.get_by_label("Bob", exact=True).fill("20.00")
        page.get_by_label("Cy", exact=True).fill("10")
        page.get_by_role("button", name="Add expense", exact=True).click()
        deadline = time.time() + 5
        while True:
            _, items = call(base, "GET", f"/api/groups/{g['id']}/expenses")
            if items:
                break
            check(time.time() < deadline, "the custom expense was never saved")
            time.sleep(0.2)
        check(
            shares_of(items[0]) == {ann: 0, bob: 2000, cy: 1000},
            f"UI saved shares {items[0].get('shares')}",
        )
        check(page.evaluate("window.__noReload") == 1, "adding an expense reloaded the page")
        page.get_by_label("Description", exact=True).fill("Snacks")
        page.get_by_label("Amount", exact=True).fill("3.00")
        page.get_by_label("Paid by", exact=True).select_option(label="Bob")
        page.get_by_label("Split", exact=True).select_option(label="Equally")
        page.get_by_role("button", name="Add expense", exact=True).click()
        expect(page.get_by_text("Snacks").first).to_be_visible(timeout=5000)
        page.get_by_role("button", name="Settle up", exact=True).click()
        expect(page.get_by_text("Bob pays Ann 18.00").first).to_be_visible(timeout=5000)
        expect(page.get_by_text("Cy pays Ann 11.00").first).to_be_visible(timeout=5000)


def m_owntests(_unused, db):
    texts = [p.read_text(errors="ignore") for p in Path("tests").rglob("*.py")]
    check(
        any("settle" in t for t in texts) and any("shares" in t for t in texts),
        "tests do not cover shares and settlements",
    )
    runs = [
        [sys.executable, "-m", "unittest", "discover", "-s", "tests"],
        [sys.executable, "-m", "pytest", "-q", "tests"],
    ]
    results = [subprocess.run(cmd, capture_output=True, text=True, timeout=240) for cmd in runs]
    check(
        any(r.returncode == 0 and ("OK" in r.stderr or "passed" in r.stdout) for r in results),
        "the project's tests fail",
    )


def main() -> int:
    mode = sys.argv[1]
    check(Path("start.sh").exists(), "start.sh missing")
    db = str(Path(tempfile.mkdtemp()) / "splitter.db")
    fn = {
        "regression": m_regression,
        "rounding": m_rounding,
        "custom": m_custom,
        "settle": m_settle,
        "migrate": m_migrate,
        "ui": m_ui,
        "owntests": m_owntests,
    }[mode]
    try:
        if mode in ("migrate", "owntests"):
            fn(None, db)
        else:
            with app(db) as base:
                fn(base, db)
    except Exception as exc:  # report any failure as a failed check, never a traceback storm
        print(f"FAIL {mode}: {type(exc).__name__}: {exc}")
        return 1
    print(f"PASS {mode}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
