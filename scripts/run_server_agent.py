"""Run one brief through an OpenCode *server* session (the path the user's API takes), including
any turns the visual-supervisor plugin adds, and record wall-clock until the session settles.

    python run_server_agent.py <server_url> <brief.txt> <workspace_dir> [--timeout 2700] [--settle 60]

A session counts as settled once it has been idle for `--settle` seconds in a row: the supervisor
needs a few seconds after idle to screenshot and critique before it re-opens the session.
"""

import argparse
import json
import subprocess
import time
import urllib.request
from pathlib import Path


def call(method: str, url: str, body: object | None = None, timeout: float = 30) -> object:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url, data=data, method=method, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        text = r.read().decode()
        return json.loads(text) if text else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("server")
    ap.add_argument("brief")
    ap.add_argument("workspace")
    ap.add_argument("--timeout", type=float, default=2700)
    ap.add_argument("--settle", type=float, default=60)
    a = ap.parse_args()
    ws = Path(a.workspace).resolve()
    ws.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "init", "-q"], cwd=ws, check=True)
    q = f"?directory={ws}"
    start = time.time()
    sid = call("POST", f"{a.server}/session{q}", {"title": ws.name})["id"]  # type: ignore[index]
    brief = Path(a.brief).read_text()
    call(
        "POST",
        f"{a.server}/session/{sid}/prompt_async{q}",
        {"parts": [{"type": "text", "text": brief}]},
    )
    idle_since = None
    outcome = "timeout"
    while time.time() - start < a.timeout:
        time.sleep(5)
        status = call("GET", f"{a.server}/session/status{q}") or {}
        busy = isinstance(status, dict) and sid in status and status[sid].get("type") != "idle"
        if busy:
            idle_since = None
            continue
        idle_since = idle_since or time.time()
        if time.time() - idle_since >= a.settle:
            outcome = "settled"
            break
    elapsed = time.time() - start - (a.settle if outcome == "settled" else 0)
    if outcome == "timeout":
        call("POST", f"{a.server}/session/{sid}/abort{q}", {})
    msgs = call("GET", f"{a.server}/session/{sid}/message{q}", timeout=60) or []
    supervisor_rounds = sum(
        1
        for m in msgs  # type: ignore[union-attr]
        for p in m["parts"]
        if p.get("type") == "text" and p.get("text", "").startswith("Automatic visual check")
    )
    (ws / "transcript.json").write_text(json.dumps(msgs, indent=1))
    result = f"outcome={outcome} secs={elapsed:.0f} messages={len(msgs)} supervisor_rounds={supervisor_rounds}"  # type: ignore[arg-type]
    (ws / ".agent-result").write_text(result + "\n")
    print(ws.name, result)


if __name__ == "__main__":
    main()
