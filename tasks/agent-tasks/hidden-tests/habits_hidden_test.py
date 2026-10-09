"""Hidden acceptance tests for the py_habits_api case.

Run from the agent's workspace: starts the agent's own server.py on a free port with a temporary
database and drives it over HTTP. Standard library only.
"""

import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

TODAY = "2026-03-10"


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Server:
    def __init__(self, db: str) -> None:
        self.db = db
        self.port = free_port()
        self.proc: subprocess.Popen[bytes] | None = None

    def start(self) -> None:
        env = {**os.environ, "HABITS_TODAY": TODAY}
        self.proc = subprocess.Popen(
            [sys.executable, "server.py", "--port", str(self.port), "--db", self.db],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        deadline = time.time() + 15
        while time.time() < deadline:
            if self.proc.poll() is not None:
                raise RuntimeError(f"server.py exited with {self.proc.returncode} before listening")
            try:
                with socket.create_connection(("127.0.0.1", self.port), timeout=0.5):
                    return
            except OSError:
                time.sleep(0.1)
        raise RuntimeError("server did not start listening within 15 s")

    def stop(self) -> None:
        if self.proc:
            self.proc.terminate()
            self.proc.wait(timeout=10)

    def call(self, method: str, path: str, body: object = None, raw: bytes | None = None):
        data = raw if raw is not None else (None if body is None else json.dumps(body).encode())
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}{path}",
            data=data,
            method=method,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                text = r.read().decode()
                return r.status, (json.loads(text) if text else None)
        except urllib.error.HTTPError as e:
            text = e.read().decode()
            try:
                return e.code, json.loads(text)
            except json.JSONDecodeError:
                return e.code, text


class HabitsApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.db = os.path.join(self.tmp.name, "habits.db")
        self.server = Server(self.db)
        self.server.start()

    def tearDown(self) -> None:
        self.server.stop()
        self.tmp.cleanup()

    def assertError(self, resp, status: int, code: str) -> None:
        got_status, body = resp
        self.assertEqual(got_status, status, body)
        self.assertIsInstance(body, dict, body)
        self.assertEqual(body.get("error", {}).get("code"), code, body)
        self.assertIsInstance(body["error"].get("message"), str)
        self.assertNotIn("Traceback", json.dumps(body))

    def create(self, name: str = "Read", target: int = 3) -> dict:
        status, body = self.server.call(
            "POST", "/habits", {"name": name, "target_per_week": target}
        )
        self.assertEqual(status, 201, body)
        return body

    def test_create_returns_trimmed_habit(self) -> None:
        h = self.create("  Stretch  ", 5)
        self.assertEqual(h["name"], "Stretch")
        self.assertEqual(h["target_per_week"], 5)
        self.assertEqual(h["created_at"], TODAY)
        self.assertIsInstance(h["id"], int)

    def test_create_validation(self) -> None:
        for body in (
            {"name": "", "target_per_week": 3},
            {"name": "   ", "target_per_week": 3},
            {"name": "x" * 81, "target_per_week": 3},
            {"name": "ok", "target_per_week": 0},
            {"name": "ok", "target_per_week": 15},
            {"name": "ok", "target_per_week": True},
            {"name": "ok", "target_per_week": "3"},
            {"name": 5, "target_per_week": 3},
            {"target_per_week": 3},
        ):
            with self.subTest(body=body):
                self.assertError(self.server.call("POST", "/habits", body), 422, "validation_error")

    def test_bad_json(self) -> None:
        self.assertError(self.server.call("POST", "/habits", raw=b"{not json"), 400, "bad_json")
        self.assertError(self.server.call("POST", "/habits", raw=b"[1, 2]"), 400, "bad_json")

    def test_keyset_pagination(self) -> None:
        ids = [self.create(f"h{i}")["id"] for i in range(5)]
        status, page1 = self.server.call("GET", "/habits?limit=2")
        self.assertEqual(status, 200)
        self.assertEqual([h["id"] for h in page1["items"]], ids[:2])
        self.assertEqual(page1["next_after"], ids[1])
        _, page2 = self.server.call("GET", f"/habits?limit=2&after={page1['next_after']}")
        self.assertEqual([h["id"] for h in page2["items"]], ids[2:4])
        _, page3 = self.server.call("GET", f"/habits?limit=2&after={page2['next_after']}")
        self.assertEqual([h["id"] for h in page3["items"]], ids[4:])
        self.assertIsNone(page3["next_after"])
        _, default = self.server.call("GET", "/habits")
        self.assertEqual(len(default["items"]), 5)
        self.assertIsNone(default["next_after"])
        for q in ("limit=0", "limit=101", "limit=abc", "after=xyz"):
            with self.subTest(q=q):
                self.assertError(self.server.call("GET", f"/habits?{q}"), 422, "validation_error")

    def test_checkins_and_conflicts(self) -> None:
        hid = self.create()["id"]
        status, body = self.server.call("POST", f"/habits/{hid}/checkins", {"date": "2026-03-09"})
        self.assertEqual(status, 201, body)
        self.assertEqual(body, {"habit_id": hid, "date": "2026-03-09"})
        self.assertError(
            self.server.call("POST", f"/habits/{hid}/checkins", {"date": "2026-03-09"}),
            409,
            "conflict",
        )
        self.assertError(
            self.server.call("POST", f"/habits/{hid}/checkins", {"date": "2026-03-11"}),
            422,
            "validation_error",
        )
        for bad in ("2026-02-30", "2026-3-1", "yesterday", 20260301):
            with self.subTest(bad=bad):
                self.assertError(
                    self.server.call("POST", f"/habits/{hid}/checkins", {"date": bad}),
                    422,
                    "validation_error",
                )
        self.assertError(
            self.server.call("POST", "/habits/99999/checkins", {"date": "2026-03-01"}),
            404,
            "not_found",
        )

    def test_streaks(self) -> None:
        hid = self.create()["id"]
        for d in (
            "2026-02-20",
            "2026-02-21",
            "2026-02-22",
            "2026-02-23",
            "2026-03-08",
            "2026-03-09",
        ):
            self.assertEqual(
                self.server.call("POST", f"/habits/{hid}/checkins", {"date": d})[0], 201
            )
        status, s = self.server.call("GET", f"/habits/{hid}/streak")
        self.assertEqual(status, 200)
        self.assertEqual(s, {"current_streak": 2, "longest_streak": 4})
        self.server.call("POST", f"/habits/{hid}/checkins", {"date": TODAY})
        self.assertEqual(
            self.server.call("GET", f"/habits/{hid}/streak")[1],
            {"current_streak": 3, "longest_streak": 4},
        )
        other = self.create("Old")["id"]
        self.server.call("POST", f"/habits/{other}/checkins", {"date": "2026-03-01"})
        self.assertEqual(
            self.server.call("GET", f"/habits/{other}/streak")[1],
            {"current_streak": 0, "longest_streak": 1},
        )
        empty = self.create("New")["id"]
        self.assertEqual(
            self.server.call("GET", f"/habits/{empty}/streak")[1],
            {"current_streak": 0, "longest_streak": 0},
        )

    def test_delete_and_not_found(self) -> None:
        hid = self.create()["id"]
        self.server.call("POST", f"/habits/{hid}/checkins", {"date": "2026-03-01"})
        status, body = self.server.call("DELETE", f"/habits/{hid}")
        self.assertEqual(status, 204)
        self.assertIn(body, (None, ""))
        self.assertError(self.server.call("DELETE", f"/habits/{hid}"), 404, "not_found")
        self.assertError(self.server.call("GET", f"/habits/{hid}/streak"), 404, "not_found")
        self.assertError(self.server.call("GET", "/nope"), 404, "not_found")
        self.assertError(self.server.call("PUT", "/habits"), 405, "method_not_allowed")

    def test_survives_restart(self) -> None:
        hid = self.create("Persist", 7)["id"]
        self.server.call("POST", f"/habits/{hid}/checkins", {"date": "2026-03-09"})
        self.server.stop()
        self.server = Server(self.db)
        self.server.start()
        _, page = self.server.call("GET", "/habits")
        self.assertEqual(
            [(h["id"], h["name"], h["target_per_week"]) for h in page["items"]],
            [(hid, "Persist", 7)],
        )
        self.assertError(
            self.server.call("POST", f"/habits/{hid}/checkins", {"date": "2026-03-09"}),
            409,
            "conflict",
        )


if __name__ == "__main__":
    unittest.main()
