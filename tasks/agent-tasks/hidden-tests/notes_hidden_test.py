"""Hidden acceptance tests for the team notes full-stack case. Run from the agent's workspace:

    python3 notes_hidden_test.py <auth|isolation|pagination|concurrency|idempotency|restart|ui>

Each mode starts the app the README way (./start.sh with PORT and DB_PATH), runs its checks, stops it,
and exits 0 only if every check in that mode passed. `ui` needs Playwright.
"""

import contextlib
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
import uuid
from pathlib import Path


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


def call(base, method, path, body=None, token=None, headers=None, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    h = {"Content-Type": "application/json", **(headers or {})}
    if token:
        h["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(base + path, data=data, method=method, headers=h)
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


def user(base: str, name: str | None = None) -> str:
    name = name or "u" + uuid.uuid4().hex[:10]
    st, b = call(base, "POST", "/api/users", {"username": name, "password": "correct horse"})
    check(
        st == 201 and b.get("username") == name and isinstance(b.get("id"), int),
        f"signup -> {st} {b}",
    )
    st, b = call(base, "POST", "/api/sessions", {"username": name, "password": "correct horse"})
    check(st == 201 and isinstance(b.get("token"), str) and b["token"], f"signin -> {st} {b}")
    return b["token"]


def walk(base: str, token: str, limit: int) -> list[dict]:
    seen, cursor = [], None
    for _ in range(100):
        q = f"?limit={limit}" + (f"&cursor={urllib.request.quote(cursor)}" if cursor else "")
        st, page = call(base, "GET", "/api/notes" + q, token=token)
        check(st == 200 and isinstance(page.get("items"), list), f"list page -> {st} {page}")
        check(len(page["items"]) <= limit, f"page larger than limit {limit}: {len(page['items'])}")
        seen += page["items"]
        cursor = page.get("next_cursor")
        if cursor is None:
            return seen
    raise AssertionError("pagination never ended")


def m_auth(base: str, db: str) -> None:
    st, b = call(base, "POST", "/api/users", {"username": "Al", "password": "correct horse"})
    check(st == 400 and err_code(b) == "validation", f"bad username -> {st} {b}")
    st, b = call(base, "POST", "/api/users", {"username": "alice", "password": "short"})
    check(st == 400 and err_code(b) == "validation", f"short password -> {st} {b}")
    token = user(base, "alice")
    st, b = call(base, "POST", "/api/users", {"username": "alice", "password": "another pass"})
    check(st == 409 and err_code(b) == "conflict", f"taken username -> {st} {b}")
    st, b = call(base, "POST", "/api/sessions", {"username": "alice", "password": "wrong horse"})
    check(st == 401 and err_code(b) == "unauthorized", f"wrong password -> {st} {b}")
    st, b = call(base, "POST", "/api/sessions", {"username": "nobody", "password": "correct horse"})
    check(st == 401 and err_code(b) == "unauthorized", f"unknown user -> {st} {b}")
    st, b = call(base, "GET", "/api/notes")
    check(st == 401 and err_code(b) == "unauthorized", f"no token -> {st} {b}")
    st, b = call(base, "GET", "/api/notes", token="not-a-real-token")
    check(st == 401 and err_code(b) == "unauthorized", f"bad token -> {st} {b}")
    st, _ = call(base, "GET", "/api/notes", token=token)
    check(st == 200, f"valid token -> {st}")
    st, b = call(base, "DELETE", "/api/sessions", token=token)
    check(st == 204 and b in (None, ""), f"sign out -> {st} {b!r}")
    st, b = call(base, "GET", "/api/notes", token=token)
    check(st == 401, f"signed-out token still works -> {st} {b}")
    raw = b"".join(p.read_bytes() for p in Path(db).parent.glob(Path(db).name + "*") if p.is_file())
    check(b"correct horse" not in raw, "password stored in plain text")
    st, b = call(base, "POST", "/api/users", raw=b"{nope")
    check(st == 400 and err_code(b) == "bad_json", f"bad json -> {st} {b}")


def m_isolation(base: str, db: str) -> None:
    a, b = user(base), user(base)
    st, note = call(base, "POST", "/api/notes", {"title": "  A secret  ", "body": "x"}, token=a)
    check(
        st == 201 and note["title"] == "A secret" and note["version"] == 1, f"create -> {st} {note}"
    )
    check(
        isinstance(note.get("updated_at"), str) and "T" in note["updated_at"], f"updated_at: {note}"
    )
    nid = note["id"]
    for method, body in (
        ("GET", None),
        ("PATCH", {"version": 1, "title": "mine"}),
        ("DELETE", None),
    ):
        st, r = call(base, method, f"/api/notes/{nid}", body, token=b)
        check(st == 404 and err_code(r) == "not_found", f"{method} other user's note -> {st} {r}")
    st, r = call(base, "GET", "/api/notes/99999999", token=b)
    check(st == 404 and err_code(r) == "not_found", f"missing note -> {st} {r}")
    st, page = call(base, "GET", "/api/notes", token=b)
    check(st == 200 and page["items"] == [], f"other user's list -> {page}")
    st, r = call(base, "GET", f"/api/notes/{nid}", token=a)
    check(st == 200 and r["title"] == "A secret", f"owner reads -> {st} {r}")
    for body in (
        {"title": "   ", "body": ""},
        {"title": "x" * 121, "body": ""},
        {"title": "ok", "body": "y" * 10001},
    ):
        st, r = call(base, "POST", "/api/notes", body, token=a)
        check(st == 400 and err_code(r) == "validation", f"{str(body)[:40]} -> {st} {r}")
    st, r = call(base, "DELETE", f"/api/notes/{nid}", token=a)
    check(st == 204, f"owner delete -> {st} {r}")
    st, r = call(base, "GET", f"/api/notes/{nid}", token=a)
    check(st == 404, f"deleted note -> {st} {r}")


def m_pagination(base: str, db: str) -> None:
    a, other = user(base), user(base)
    made = set()
    for i in range(105):
        st, n = call(base, "POST", "/api/notes", {"title": f"n{i}", "body": ""}, token=a)
        check(st == 201, f"create {i} -> {st} {n}")
        made.add(n["id"])
    call(base, "POST", "/api/notes", {"title": "not yours", "body": ""}, token=other)
    st, page = call(base, "GET", "/api/notes", token=a)
    check(
        st == 200 and len(page["items"]) == 20 and page["next_cursor"],
        f"default page: {len(page['items'])}",
    )
    items = walk(base, a, 20)
    ids = [n["id"] for n in items]
    check(
        len(ids) == len(set(ids)) == 105 and set(ids) == made,
        f"walk returned {len(ids)} ids, {len(set(ids))} distinct",
    )
    keys = [(n["updated_at"], n["id"]) for n in items]
    check(keys == sorted(keys, reverse=True), "walk not in updated_at desc, id desc order")
    st, page = call(base, "GET", "/api/notes?limit=500", token=a)
    check(
        st == 200 and len(page["items"]) == 100 and page["next_cursor"],
        "limit=500 should clamp to 100",
    )
    for q in ("limit=0", "limit=-3", "limit=abc", "cursor=%%%garbage"):
        st, r = call(base, "GET", f"/api/notes?{q}", token=a)
        check(st == 400 and err_code(r) == "validation", f"{q} -> {st} {r}")
    time.sleep(
        1.1
    )  # a later second, so timestamps stored to the second still order the update first
    st, n = call(
        base, "PATCH", f"/api/notes/{min(made)}", {"version": 1, "body": "bumped"}, token=a
    )
    check(st == 200, f"patch oldest -> {st} {n}")
    st, page = call(base, "GET", "/api/notes?limit=1", token=a)
    check(page["items"][0]["id"] == min(made), "an updated note should move to the top")
    check(
        len({n["id"] for n in walk(base, a, 30)}) == 105, "walk after update lost or repeated notes"
    )


def m_concurrency(base: str, db: str) -> None:
    a = user(base)
    _, n = call(base, "POST", "/api/notes", {"title": "draft", "body": "v1"}, token=a)
    st, r = call(base, "PATCH", f"/api/notes/{n['id']}", {"body": "no version"}, token=a)
    check(st == 400 and err_code(r) == "validation", f"missing version -> {st} {r}")
    st, tab1 = call(
        base, "PATCH", f"/api/notes/{n['id']}", {"version": 1, "body": "tab one"}, token=a
    )
    check(
        st == 200
        and tab1["version"] == 2
        and tab1["body"] == "tab one"
        and tab1["title"] == "draft",
        f"first save -> {st} {tab1}",
    )
    st, r = call(base, "PATCH", f"/api/notes/{n['id']}", {"version": 1, "body": "tab two"}, token=a)
    check(st == 409 and err_code(r) == "version_conflict", f"stale save -> {st} {r}")
    cur = r["error"].get("current") or {}
    check(
        cur.get("version") == 2 and cur.get("body") == "tab one",
        f"conflict should carry the current note: {r}",
    )
    st, r = call(base, "GET", f"/api/notes/{n['id']}", token=a)
    check(r["body"] == "tab one" and r["version"] == 2, f"stale save overwrote the note: {r}")
    st, r = call(
        base, "PATCH", f"/api/notes/{n['id']}", {"version": 2, "title": "  final  "}, token=a
    )
    check(
        st == 200 and r["version"] == 3 and r["title"] == "final" and r["body"] == "tab one",
        f"second save -> {st} {r}",
    )


def m_idempotency(base: str, db: str) -> None:
    a, b = user(base), user(base)
    key = {"Idempotency-Key": "retry-" + uuid.uuid4().hex}
    st1, n1 = call(base, "POST", "/api/notes", {"title": "once", "body": "b"}, token=a, headers=key)
    st2, n2 = call(base, "POST", "/api/notes", {"title": "once", "body": "b"}, token=a, headers=key)
    check(st1 == 201 and st2 == 201 and n1 == n2, f"replay -> {st1} {n1} / {st2} {n2}")
    _, page = call(base, "GET", "/api/notes", token=a)
    check(len(page["items"]) == 1, f"replay created {len(page['items'])} notes")
    st, r = call(
        base, "POST", "/api/notes", {"title": "different", "body": "b"}, token=a, headers=key
    )
    check(st == 422 and err_code(r) == "idempotency_mismatch", f"same key, other body -> {st} {r}")
    st, nb = call(base, "POST", "/api/notes", {"title": "theirs", "body": ""}, token=b, headers=key)
    check(
        st == 201 and nb["id"] != n1["id"] and nb["title"] == "theirs",
        f"key scoped per user -> {st} {nb}",
    )
    st, n3 = call(base, "POST", "/api/notes", {"title": "once", "body": "b"}, token=a)
    check(st == 201 and n3["id"] != n1["id"], "no key means a new note every time")


def m_restart(db: str) -> None:
    with app(db) as base:
        token = user(base, "keeper")
        _, n = call(base, "POST", "/api/notes", {"title": "persist me", "body": "b"}, token=token)
        call(base, "PATCH", f"/api/notes/{n['id']}", {"version": 1, "body": "edited"}, token=token)
    with app(db) as base:
        st, r = call(base, "GET", f"/api/notes/{n['id']}", token=token)
        check(
            st == 200 and r["body"] == "edited" and r["version"] == 2,
            f"after restart (same session) -> {st} {r}",
        )
        st, b = call(
            base, "POST", "/api/sessions", {"username": "keeper", "password": "correct horse"}
        )
        check(st == 201, f"sign in after restart -> {st} {b}")


def m_ui(base: str, db: str) -> None:
    from playwright.sync_api import expect, sync_playwright

    name = "ui" + uuid.uuid4().hex[:8]
    with sync_playwright() as pw:
        page = pw.chromium.launch().new_page()
        page.goto(base + "/")
        page.get_by_label("Username", exact=True).fill(name)
        page.get_by_label("Password", exact=True).fill("wrong password")
        page.get_by_role("button", name="Sign in", exact=True).click()
        expect(page.get_by_role("button", name="Sign out", exact=True)).to_have_count(
            0, timeout=3000
        )
        check(page.locator("body").inner_text().strip() != "", "page empty after failed sign-in")
        page.get_by_label("Password", exact=True).fill("correct horse")
        page.get_by_role("button", name="Create account", exact=True).click()
        expect(page.get_by_role("button", name="Sign out", exact=True)).to_be_visible(timeout=5000)
        page.evaluate("window.__noReload = 1")
        page.get_by_label("Title", exact=True).fill("Groceries")
        page.get_by_label("Body", exact=True).fill("eggs, milk")
        page.get_by_role("button", name="Save note", exact=True).click()
        expect(page.get_by_text("Groceries").first).to_be_visible(timeout=5000)
        page.get_by_label("Title", exact=True).fill("Later note")
        page.get_by_role("button", name="Save note", exact=True).click()
        expect(page.get_by_text("Later note").first).to_be_visible(timeout=5000)
        check(page.evaluate("window.__noReload") == 1, "saving a note reloaded the page")
        text = page.locator("body").inner_text()
        check(text.find("Later note") < text.find("Groceries"), "notes not shown newest first")
        page.reload()
        expect(page.get_by_text("Groceries").first).to_be_visible(timeout=5000)
        expect(page.get_by_role("button", name="Sign out", exact=True)).to_be_visible(timeout=5000)
        page.get_by_role("button", name="Sign out", exact=True).click()
        expect(page.get_by_role("button", name="Sign in", exact=True)).to_be_visible(timeout=5000)
        expect(page.get_by_text("Groceries")).to_have_count(0, timeout=5000)
        page.reload()
        expect(page.get_by_role("button", name="Sign in", exact=True)).to_be_visible(timeout=5000)
        page.get_by_label("Username", exact=True).fill(name)
        page.get_by_label("Password", exact=True).fill("correct horse")
        page.get_by_role("button", name="Sign in", exact=True).click()
        expect(page.get_by_text("Groceries").first).to_be_visible(timeout=5000)


def main() -> int:
    mode = sys.argv[1]
    check(Path("start.sh").exists(), "start.sh missing")
    db = str(Path(tempfile.mkdtemp()) / "notes.db")
    try:
        if mode == "restart":
            m_restart(db)
        else:
            fn = {
                "auth": m_auth,
                "isolation": m_isolation,
                "pagination": m_pagination,
                "concurrency": m_concurrency,
                "idempotency": m_idempotency,
                "ui": m_ui,
            }[mode]
            with app(db) as base:
                fn(base, db)
    except Exception as exc:  # report any failure as a failed check, never a traceback storm
        print(f"FAIL {mode}: {type(exc).__name__}: {exc}")
        return 1
    print(f"PASS {mode}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
