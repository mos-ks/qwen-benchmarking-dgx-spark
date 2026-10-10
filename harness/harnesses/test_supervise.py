"""Behaviour of the harness-neutral supervisor, driven through its CLI with a scripted critic.

uv run --with pytest pytest harnesses/test_supervise.py -q
"""

import json
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def make_env(tmp_path: Path, scores: list[int], **extra: str) -> dict:
    queue = tmp_path / "scores.txt"
    queue.write_text("\n".join(map(str, scores)))
    fake = tmp_path / "fake_look.py"
    fake.write_text(
        "import sys\n"
        f"q = open({str(queue)!r}).read().split()\n"
        f"open({str(queue)!r}, 'w').write(' '.join(q[1:]))\n"
        "print('errors: none'); print(f'SCORE: {q[0]}'); print('VERDICT: NEEDS WORK'); print('UNMET REQUIREMENTS: x')\n"
    )
    look = tmp_path / "look"
    look.write_text(f'#!/bin/sh\nexec {sys.executable} {fake} "$@"\n')
    look.chmod(0o755)
    return {
        **os.environ,
        "SUPERVISOR_LOOK": str(look),
        "VISUAL_SUPERVISOR_ROUNDS": "3",
        **extra,
    }


def call(
    event: str, project: Path, env: dict, fmt: str = "qwen", **payload
) -> dict | None:
    res = subprocess.run(
        [sys.executable, str(HERE / "supervise.py"), event, "--format", fmt],
        input=json.dumps({"cwd": str(project), "session_id": "s1", **payload}),
        capture_output=True,
        text=True,
        env=env,
        check=True,
    )
    return json.loads(res.stdout) if res.stdout.strip() else None


def test_worse_round_is_reverted_and_the_agent_is_told(tmp_path):
    project = tmp_path / "p"
    project.mkdir()
    env = make_env(tmp_path, [6, 7, 5])
    call("prompt", project, env, prompt="build a page")
    assert call("stop", project, env) is None, "no page yet: let it stop"
    (project / "index.html").write_text("v1")
    assert call("stop", project, env)["decision"] == "block"  # 6, best
    (project / "index.html").write_text("v2")
    call("stop", project, env)  # 7, new best
    (project / "index.html").write_text("v3")
    (project / "extra.js").write_text("new file")
    out = call("stop", project, env)  # 5, worse: restore v2
    assert (project / "index.html").read_text() == "v2"
    assert (project / "extra.js").read_text() == "new file"
    assert "restored the best version" in out["reason"]


def test_final_look_after_last_round_still_reverts(tmp_path):
    project = tmp_path / "p"
    project.mkdir()
    env = make_env(tmp_path, [7, 6, 6, 6, 4])
    call("prompt", project, env, prompt="build a page")
    (project / "index.html").write_text("best")
    call("stop", project, env)  # 7
    blocks = 1
    for v in ("a", "b", "c"):
        (project / "index.html").write_text(v)
        if call("stop", project, env):
            blocks += 1
    assert (project / "index.html").read_text() == "best"
    assert blocks == 3, "three fix rounds, then the final look lets it stop"


def test_target_score_stops_supervision(tmp_path):
    project = tmp_path / "p"
    project.mkdir()
    env = make_env(tmp_path, [8])
    call("prompt", project, env, prompt="build a page")
    (project / "index.html").write_text("good")
    assert call("stop", project, env) is None
    assert call("stop", project, env) is None, "done: no further looks"


def test_checkpoint_once_with_snapshot_in_generic_format(tmp_path):
    project = tmp_path / "p"
    project.mkdir()
    env = make_env(
        tmp_path,
        [4, 9],
        VISUAL_SUPERVISOR_CHECKPOINT_MIN="0",
        VISUAL_SUPERVISOR_WRAP_UP_MIN="0.0001",
    )
    call("prompt", project, env, fmt="generic", prompt="a lighthouse")
    assert call("tool", project, env, fmt="generic") == {"append": ""}, (
        "no page, no look"
    )
    (project / "index.html").write_text("draft")
    first = call("tool", project, env, fmt="generic")["append"]
    assert "mid-course visual check" in first and "note from the harness" in first
    assert (project / ".supervisor-best" / "index.html").read_text() == "draft"
    second = call("tool", project, env, fmt="generic")["append"]
    assert "mid-course" not in second
    stop = call("stop", project, env, fmt="generic")
    assert stop == {"continue": False, "message": ""}, "9 >= target"
