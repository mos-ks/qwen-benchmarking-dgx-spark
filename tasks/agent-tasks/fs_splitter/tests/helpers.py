"""Start the real server on a free port with a throwaway database, and talk JSON to it."""

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
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class ServerTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        port = free_port()
        env = {**os.environ, "PORT": str(port), "DB_PATH": str(Path(self.tmp.name) / "test.db")}
        self.proc = subprocess.Popen(
            [sys.executable, "-m", "app.server"],
            cwd=ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        self.base = f"http://127.0.0.1:{port}"
        for _ in range(100):
            try:
                urllib.request.urlopen(self.base + "/", timeout=1)
                return
            except OSError:
                time.sleep(0.05)
        raise RuntimeError("server did not start")

    def tearDown(self):
        self.proc.terminate()
        self.proc.wait(timeout=5)
        self.proc.stderr.close()
        self.tmp.cleanup()

    def call(self, method: str, path: str, body=None):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(
            self.base + path, data=data, method=method, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as r:
                text = r.read().decode()
                return r.status, json.loads(text) if text else None
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode())

    def group(self, *names: str) -> dict:
        status, g = self.call("POST", "/api/groups", {"name": "Trip", "members": list(names)})
        self.assertEqual(status, 201, g)
        return g
