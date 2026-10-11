"""Hidden acceptance tests for the plant care full-stack case. Run from the agent's workspace:

    python3 plants_hidden_test.py <create|validation|water|sort|delete|restart|ui>

Each mode starts the app the README way (./start.sh with PORT and DB_PATH), runs its checks, stops it,
and exits 0 only if every check in that mode passed. `ui` needs Playwright.
"""

import contextlib
import datetime as dt
import json
import os
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

TODAY = dt.date.today()


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
                urllib.request.urlopen(base + "/api/plants", timeout=1)
                break
            except (urllib.error.URLError, ConnectionError, OSError):
                time.sleep(0.2)
        else:
            raise AssertionError("server did not answer GET /api/plants within 20 s")
        yield base
    finally:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(proc.pid, signal.SIGTERM)
        proc.wait(timeout=10)


def call(base: str, method: str, path: str, body=None, raw: bytes | None = None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
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


def err_code(body) -> str | None:
    return body.get("error", {}).get("code") if isinstance(body, dict) else None


def m_create(base: str) -> None:
    st, p = call(
        base,
        "POST",
        "/api/plants",
        {"name": "  Fern  ", "species": " Nephrolepis ", "water_every_days": 3},
    )
    check(st == 201, f"create -> {st}")
    check(p["name"] == "Fern" and p["species"] == "Nephrolepis", f"trimmed fields: {p}")
    check(
        isinstance(p["id"], int) and p["last_watered"] is None and p["next_water"] is None,
        f"new plant shape: {p}",
    )
    st, lst = call(base, "GET", "/api/plants")
    check(st == 200 and any(x["id"] == p["id"] for x in lst), "created plant listed")


def m_validation(base: str) -> None:
    for body, field in (
        ({"name": "   ", "species": "", "water_every_days": 3}, "name"),
        ({"name": "x" * 61, "species": "", "water_every_days": 3}, "name"),
        ({"name": "Ok", "species": "", "water_every_days": 0}, "water_every_days"),
        ({"name": "Ok", "species": "", "water_every_days": 61}, "water_every_days"),
        ({"name": "Ok", "species": "", "water_every_days": "3"}, "water_every_days"),
    ):
        st, b = call(base, "POST", "/api/plants", body)
        check(
            st == 400 and err_code(b) == "validation" and b["error"].get("field") == field,
            f"{body} -> {st} {b}",
        )
    st, b = call(base, "POST", "/api/plants", raw=b"{not json")
    check(st == 400 and err_code(b) == "bad_json", f"bad json -> {st} {b}")


def m_water(base: str) -> None:
    _, p = call(
        base, "POST", "/api/plants", {"name": "Ficus", "species": "", "water_every_days": 7}
    )
    st, w = call(base, "POST", f"/api/plants/{p['id']}/water", {"date": "2026-02-25"})
    check(
        st == 200 and w["last_watered"] == "2026-02-25" and w["next_water"] == "2026-03-04",
        f"explicit date: {w}",
    )
    st, w = call(base, "POST", f"/api/plants/{p['id']}/water", {})
    want = (TODAY + dt.timedelta(days=7)).isoformat()
    check(
        st == 200 and w["last_watered"] == TODAY.isoformat() and w["next_water"] == want,
        f"default today: {w}",
    )
    st, b = call(base, "POST", f"/api/plants/{p['id']}/water", {"date": "2026-02-30"})
    check(st == 400 and err_code(b) == "validation", f"invalid date -> {st} {b}")
    st, b = call(base, "POST", "/api/plants/999999/water", {})
    check(st == 404 and err_code(b) == "not_found", f"water unknown -> {st} {b}")


def m_sort(base: str) -> None:
    ids = {}
    for name, every, date in (
        ("A", 10, "2026-01-01"),
        ("B", 1, "2026-01-01"),
        ("C", 5, None),
        ("D", 1, "2026-01-01"),
    ):
        _, p = call(
            base, "POST", "/api/plants", {"name": name, "species": "", "water_every_days": every}
        )
        ids[name] = p["id"]
        if date:
            call(base, "POST", f"/api/plants/{p['id']}/water", {"date": date})
    _, lst = call(base, "GET", "/api/plants")
    order = [x["name"] for x in lst if x["name"] in ids]
    check(order == ["C", "B", "D", "A"], f"sort order {order}")


def m_delete(base: str) -> None:
    _, p = call(base, "POST", "/api/plants", {"name": "Gone", "species": "", "water_every_days": 2})
    st, body = call(base, "DELETE", f"/api/plants/{p['id']}")
    check(st == 204 and body in (None, ""), f"delete -> {st} {body!r}")
    st, b = call(base, "DELETE", f"/api/plants/{p['id']}")
    check(st == 404 and err_code(b) == "not_found", f"delete again -> {st} {b}")


def m_restart(db: str) -> None:
    with app(db) as base:
        _, p = call(
            base,
            "POST",
            "/api/plants",
            {"name": "Keeper", "species": "Cactus", "water_every_days": 14},
        )
        call(base, "POST", f"/api/plants/{p['id']}/water", {"date": "2026-03-01"})
    with app(db) as base:
        _, lst = call(base, "GET", "/api/plants")
        got = [x for x in lst if x["name"] == "Keeper"]
        check(got and got[0]["next_water"] == "2026-03-15", f"after restart: {got}")


def date_texts(d: dt.date) -> list[str]:
    """Ways a UI may write a date. The README asks for the next watering date, not a format."""
    month, abbr = d.strftime("%B"), d.strftime("%b")
    return [
        d.isoformat(),
        f"{abbr} {d.day}",
        f"{month} {d.day}",
        f"{d.day} {abbr}",
        f"{d.day} {month}",
        f"{d.month}/{d.day}",
        f"{d.day}/{d.month}",
        f"{d.month:02d}/{d.day:02d}",
        f"{d.day:02d}/{d.month:02d}",
        f"{d.day}.{d.month}.",
        f"{d.day:02d}.{d.month:02d}.",
    ]


def m_ui(base: str) -> None:
    from playwright.sync_api import expect, sync_playwright

    _, old = call(
        base, "POST", "/api/plants", {"name": "Thirsty", "species": "", "water_every_days": 2}
    )
    call(
        base,
        "POST",
        f"/api/plants/{old['id']}/water",
        {"date": (TODAY - dt.timedelta(days=10)).isoformat()},
    )
    with sync_playwright() as pw:
        page = pw.chromium.launch().new_page()
        page.goto(base + "/")
        expect(page.get_by_text("Overdue").first).to_be_visible(timeout=5000)
        page.evaluate("window.__noReload = 1")
        page.get_by_label("Name", exact=True).fill("Basil")
        page.get_by_label("Species", exact=True).fill("Ocimum")
        page.get_by_label("Water every (days)", exact=True).fill("4")
        page.get_by_role("button", name="Add plant").click()
        water = page.get_by_role("button", name="Water", exact=True)
        # The smallest container holding both the name and its Water button is the plant's row.
        row = (
            page.locator("li, tr, article, section, div")
            .filter(has_text="Basil")
            .filter(has=water)
            .last
        )
        expect(row).to_be_visible(timeout=5000)
        check(page.evaluate("window.__noReload") == 1, "adding a plant reloaded the page")
        row.get_by_role("button", name="Water", exact=True).click()
        due = TODAY + dt.timedelta(days=4)
        deadline = time.time() + 5
        while not any(t in row.inner_text() for t in date_texts(due)):
            check(
                time.time() < deadline, f"row never showed {due} after Water: {row.inner_text()!r}"
            )
            time.sleep(0.2)
        check(page.evaluate("window.__noReload") == 1, "watering reloaded the page")
        page.reload()
        expect(page.get_by_text("Basil").first).to_be_visible(timeout=5000)


def main() -> int:
    mode = sys.argv[1]
    check(Path("start.sh").exists(), "start.sh missing")
    db = str(Path(tempfile.mkdtemp()) / "plants.db")
    try:
        if mode == "restart":
            m_restart(db)
        else:
            fn = {
                "create": m_create,
                "validation": m_validation,
                "water": m_water,
                "sort": m_sort,
                "delete": m_delete,
                "ui": m_ui,
            }[mode]
            with app(db) as base:
                fn(base)
    except Exception as exc:  # report any failure as a failed check, never a traceback storm
        print(f"FAIL {mode}: {type(exc).__name__}: {exc}")
        return 1
    print(f"PASS {mode}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
