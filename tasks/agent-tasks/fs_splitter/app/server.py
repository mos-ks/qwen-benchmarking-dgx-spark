"""HTTP server: routing, request parsing and JSON responses. Run with `python3 -m app.server`."""

import datetime as dt
import json
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from app import db, ledger

STATIC = Path(__file__).resolve().parent.parent / "static"
TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css"}
CONN = None


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def bad(message: str) -> ApiError:
    return ApiError(400, "validation", message)


def clean_name(value, what: str, limit: int) -> str:
    if not isinstance(value, str) or not 1 <= len(value.strip()) <= limit:
        raise bad(f"{what} must be 1-{limit} characters")
    return value.strip()


def load_group(group_id: int) -> dict:
    row = CONN.execute("select id, name from groups where id = ?", (group_id,)).fetchone()
    if not row:
        raise ApiError(404, "not_found", "no such group")
    members = CONN.execute(
        "select id, name from members where group_id = ? order by id", (group_id,)
    ).fetchall()
    return {"id": row[0], "name": row[1], "members": [{"id": m[0], "name": m[1]} for m in members]}


def expense_json(row) -> dict:
    return {
        "id": row[0],
        "payer_id": row[1],
        "description": row[2],
        "amount_cents": row[3],
        "created_at": row[4],
    }


def list_expenses(group_id: int) -> list[dict]:
    rows = CONN.execute(
        "select id, payer_id, description, amount_cents, created_at from expenses where group_id = ? order by id desc",
        (group_id,),
    ).fetchall()
    return [expense_json(r) for r in rows]


def create_group(body: dict) -> tuple[int, dict]:
    name = clean_name(body.get("name"), "name", 40)
    members = body.get("members")
    if not isinstance(members, list) or not 2 <= len(members) <= 20:
        raise bad("a group has 2-20 members")
    names = [clean_name(m, "member name", 40) for m in members]
    if len(set(names)) != len(names):
        raise bad("member names must be distinct")
    with db.locked(), CONN:
        gid = CONN.execute("insert into groups(name) values (?)", (name,)).lastrowid
        CONN.executemany(
            "insert into members(group_id, name) values (?, ?)", [(gid, n) for n in names]
        )
    return 201, load_group(gid)


def create_expense(group_id: int, body: dict) -> tuple[int, dict]:
    group = load_group(group_id)
    payer = body.get("payer_id")
    if not isinstance(payer, int) or payer not in {m["id"] for m in group["members"]}:
        raise bad("payer_id must be a member of the group")
    description = clean_name(body.get("description"), "description", 80)
    amount = body.get("amount_cents")
    if not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0:
        raise bad("amount_cents must be a positive integer")
    created = dt.datetime.now(dt.UTC).isoformat(timespec="seconds")
    with db.locked(), CONN:
        eid = CONN.execute(
            "insert into expenses(group_id, payer_id, description, amount_cents, created_at) values (?, ?, ?, ?, ?)",
            (group_id, payer, description, amount, created),
        ).lastrowid
    row = CONN.execute(
        "select id, payer_id, description, amount_cents, created_at from expenses where id = ?",
        (eid,),
    ).fetchone()
    return 201, expense_json(row)


def group_expenses(group_id: int) -> tuple[int, list]:
    load_group(group_id)
    return 200, list_expenses(group_id)


def group_balances(group_id: int) -> tuple[int, list]:
    group = load_group(group_id)
    ids = [m["id"] for m in group["members"]]
    totals = ledger.balances(ids, list_expenses(group_id))
    return 200, [
        {"member_id": m["id"], "name": m["name"], "balance_cents": totals[m["id"]]}
        for m in group["members"]
    ]


ROUTES = [
    ("POST", r"/api/groups", lambda m, b: create_group(b)),
    ("GET", r"/api/groups/(\d+)", lambda m, b: (200, load_group(int(m[1])))),
    ("POST", r"/api/groups/(\d+)/expenses", lambda m, b: create_expense(int(m[1]), b)),
    (
        "GET",
        r"/api/groups/(\d+)/expenses",
        lambda m, b: group_expenses(int(m[1])),
    ),
    ("GET", r"/api/groups/(\d+)/balances", lambda m, b: group_balances(int(m[1]))),
]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def reply(
        self, status: int, payload=None, raw: bytes | None = None, ctype: str = "application/json"
    ):
        data = (
            raw if raw is not None else (b"" if payload is None else json.dumps(payload).encode())
        )
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except ValueError as exc:
            raise ApiError(400, "bad_json", "request body is not valid JSON") from exc
        if not isinstance(body, dict):
            raise ApiError(400, "bad_json", "request body must be a JSON object")
        return body

    def dispatch(self, method: str):
        path = self.path.split("?", 1)[0]
        try:
            if method == "GET" and not path.startswith("/api/"):
                return self.static(path)
            for verb, pattern, handler in ROUTES:
                match = re.fullmatch(pattern, path)
                if match and verb == method:
                    status, payload = handler(match, self.read_json() if method == "POST" else {})
                    return self.reply(status, payload)
            raise ApiError(404, "not_found", "no such route")
        except ApiError as e:
            self.reply(e.status, {"error": {"code": e.code, "message": e.message}})

    def static(self, path: str):
        name = path.lstrip("/")
        target = (STATIC / name).resolve()
        if (
            not name
            or re.fullmatch(r"groups/\d+", name)
            or not target.is_file()
            or STATIC not in target.parents
        ):
            target = STATIC / "index.html"
        self.reply(
            200, raw=target.read_bytes(), ctype=TYPES.get(target.suffix, "application/octet-stream")
        )

    def do_GET(self):
        self.dispatch("GET")

    def do_POST(self):
        self.dispatch("POST")


def main():
    global CONN
    CONN = db.connect()
    port = int(os.environ.get("PORT", "8080"))
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
