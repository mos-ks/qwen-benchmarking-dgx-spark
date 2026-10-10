#!/usr/bin/env python3
"""Harness-neutral visual supervisor: the logic of kit v7's OpenCode plugin, driven by hooks.

The same rules for every harness so a harness comparison measures the harness, not the supervisor:
  prompt  first user prompt of a session: record the goal and the start time
  tool    after each tool call: one mid-course look at CHECKPOINT_MIN, wrap-up notes after WRAP_UP_MIN
  stop    when the agent wants to stop: look at the page, keep the best version, and either send the
          critique back (continue) or let it stop

Input is the hook's JSON on stdin (Qwen Code hook events, or {"cwd", "session_id", "prompt"} from
the Pi extension). Output format: --format qwen prints Qwen Code hook JSON; --format generic prints
{"continue": bool, "message": str} for stop and {"append": str} for tool.
"""

import argparse
import fcntl
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

MAX_ROUNDS = int(os.environ.get("VISUAL_SUPERVISOR_ROUNDS", "4"))
TARGET_SCORE = float(os.environ.get("VISUAL_SUPERVISOR_TARGET", "8"))
BUDGET_MIN = float(os.environ.get("VISUAL_SUPERVISOR_BUDGET_MIN", "25"))
WRAP_UP_MIN = float(os.environ.get("VISUAL_SUPERVISOR_WRAP_UP_MIN", "20"))
NUDGE_EVERY_MIN = float(os.environ.get("VISUAL_SUPERVISOR_NUDGE_EVERY_MIN", "3"))
CHECKPOINT_MIN = float(os.environ.get("VISUAL_SUPERVISOR_CHECKPOINT_MIN", "10"))
PAGE = os.environ.get("VISUAL_SUPERVISOR_PAGE", "index.html")
LOOK = (
    os.environ.get("SUPERVISOR_LOOK")
    or shutil.which("look")
    or str(Path.home() / ".local/bin/look")
)
LOG = os.environ.get("VISUAL_SUPERVISOR_LOG")
SNAP = ".supervisor-best"
STATE_DIR = ".supervisor"
SNAP_MAX_BYTES = 20 * 1024 * 1024
SKIP = {"node_modules", "dist", "build"}


def log(msg: str) -> None:
    if LOG:
        with open(LOG, "a") as f:
            f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S')} {msg}\n")


class State:
    """Per-session state in the project, locked so parallel tool hooks do not race."""

    def __init__(self, cwd: Path, session: str):
        d = cwd / STATE_DIR
        d.mkdir(exist_ok=True)
        self.path = d / f"{re.sub(r'[^A-Za-z0-9_.-]', '_', session or 'default')}.json"
        # Held open until save(): the lock spans the whole read-modify-write of one hook call.
        self.lock = open(self.path.with_suffix(".lock"), "w")  # noqa: SIM115
        fcntl.flock(self.lock, fcntl.LOCK_EX)
        self.data = json.loads(self.path.read_text()) if self.path.exists() else {}

    def save(self) -> None:
        self.path.write_text(json.dumps(self.data))
        fcntl.flock(self.lock, fcntl.LOCK_UN)
        self.lock.close()


def entries(cwd: Path) -> list[str]:
    return [n for n in os.listdir(cwd) if not n.startswith(".") and n not in SKIP]


def size_of(p: Path) -> int:
    if p.is_symlink():
        return 0
    if p.is_dir():
        return sum(size_of(c) for c in p.iterdir())
    return p.stat().st_size


def snapshot(cwd: Path) -> bool:
    names = entries(cwd)
    if sum(size_of(cwd / n) for n in names) > SNAP_MAX_BYTES:
        return False
    dst = cwd / SNAP
    shutil.rmtree(dst, ignore_errors=True)
    dst.mkdir()
    for n in names:
        src = cwd / n
        if src.is_dir():
            shutil.copytree(src, dst / n, symlinks=True)
        else:
            shutil.copy2(src, dst / n)
    return True


def restore(cwd: Path) -> bool:
    """Overwrite the snapshotted files only; files created after the snapshot are left alone."""
    src = cwd / SNAP
    if not src.is_dir():
        return False
    for n in os.listdir(src):
        if (src / n).is_dir():
            shutil.copytree(src / n, cwd / n, symlinks=True, dirs_exist_ok=True)
        else:
            shutil.copy2(src / n, cwd / n)
    return True


def wrote_the_page(cwd: Path, st: dict) -> bool:
    page = cwd / PAGE
    # The kernel stamps files with a coarse clock that can trail time.time() by a few ms.
    return page.exists() and page.stat().st_mtime >= st.get("started", 0) - 2


def run_look(cwd: Path, goal: str) -> tuple[str, float | None, str]:
    res = subprocess.run(
        [LOOK, PAGE, "--goal", goal[:1500] or "the page the user asked for"],
        cwd=cwd,
        capture_output=True,
        text=True,
        env={**os.environ, "LOOK_MAX_ROUNDS": "1000"},
        timeout=600,
        check=False,  # a failed render is reported in the output and ends supervision
    )
    out = res.stdout
    log(f"look returned {len(out)} chars: {out[:160].replace(chr(10), ' ')}")
    m = re.search(r"SCORE:\s*(\d+(?:\.\d+)?)", out)
    critique = re.sub(r"^screenshots:.*$", "", out, flags=re.MULTILINE).strip()
    return out, float(m.group(1)) if m else None, critique


def on_prompt(cwd: Path, st: dict, prompt: str) -> None:
    if "started" not in st:
        st.update(started=time.time(), goal=prompt, rounds=0, done=False, nudged=0.0)


def on_tool(cwd: Path, st: dict) -> str:
    if "started" not in st:
        st.update(started=time.time(), goal="", rounds=0, done=False, nudged=0.0)
    elapsed = (time.time() - st["started"]) / 60
    out = ""
    if (
        CHECKPOINT_MIN >= 0
        and not st.get("checkpointed")
        and not st["done"]
        and st["rounds"] == 0
        and elapsed >= CHECKPOINT_MIN
        and wrote_the_page(cwd, st)
    ):
        st["checkpointed"] = True
        raw, score, critique = run_look(cwd, st["goal"])
        log(f"checkpoint score={score} at {elapsed:.1f}min")
        if "VERDICT:" in raw:
            if (
                score is not None
                and (st.get("best") is None or score > st["best"])
                and snapshot(cwd)
            ):
                st["best"], st["best_critique"] = score, critique
            out += (
                f"\n\n[mid-course visual check by the harness at minute {round(elapsed)}, not part of the tool output] "
                f"A vision model looked at {PAGE} as it is now:\n\n{critique}\n\n"
                "Fold the unmet requirements and top fixes into the work you are doing now. If the page is still "
                "unfinished, finish it first. Do not run look yourself; the harness checks again when you stop."
            )
    if (
        WRAP_UP_MIN
        and elapsed >= WRAP_UP_MIN
        and (time.time() - st["nudged"]) / 60 >= NUDGE_EVERY_MIN
        and wrote_the_page(cwd, st)
    ):
        st["nudged"] = time.time()
        used = round(elapsed)
        note = (
            f"{used} minutes used, the budget was about {BUDGET_MIN:g}. Stop now: no more checks or polish."
            if used >= BUDGET_MIN
            else f"{used} of about {BUDGET_MIN:g} minutes used. The harness screenshots and critiques {PAGE} every time "
            "you stop, so do not write your own check scripts or verification loops. Finish the change you are making, then stop."
        )
        out += f"\n\n[note from the harness, not from the tool] {note}"
        log(f"nudge at {elapsed:.1f}min")
    return out


def on_stop(cwd: Path, st: dict) -> str | None:
    """Return the message to continue with, or None to let the agent stop."""
    if "started" not in st or st["done"] or not wrote_the_page(cwd, st):
        return None
    last_look = st["rounds"] >= MAX_ROUNDS
    raw, score, critique = run_look(cwd, st["goal"])
    elapsed = (time.time() - st["started"]) / 60
    log(f"score={score} elapsed={elapsed:.1f}min")
    regressed = False
    if score is not None:
        if st.get("best") is None or score > st["best"]:
            if snapshot(cwd):
                st["best"], st["best_critique"] = score, critique
                log(f"best={score:g} snapshot saved")
        elif score < st["best"] and restore(cwd):
            regressed = True
            log(f"score {score:g} < best {st['best']:g}: restored the best version")
    finished = (
        score >= TARGET_SCORE if score is not None else "VERDICT: GOOD" in raw
    ) or elapsed >= BUDGET_MIN
    if finished or last_look or "VERDICT:" not in raw:
        st["done"] = True
        return None
    st["rounds"] += 1
    head = (
        f"Automatic visual check, round {st['rounds']} of {MAX_ROUNDS} (sent by the harness, not the user). "
        f"The target is {TARGET_SCORE:g}/10 and there is time left to reach it. "
    )
    if regressed:
        return head + (
            f"Your last changes made the page worse ({score:g}/10, below the best version so far at {st['best']:g}/10), "
            "so the harness restored the best version on disk. "
            f"This was the critique of that best version:\n\n{st['best_critique']}\n\n"
            "Make one different, smaller fix for the most important unmet requirement. Re-read the files first: they changed. "
            "Do not run look yourself; the harness checks again when you stop."
        )
    return head + (
        f"A vision model looked at {PAGE} in a browser:\n\n{critique}\n\n"
        "Fix the console errors first, then the unmet requirements, then the top fixes. Keep what already works. "
        "Do not run look yourself; the harness checks again when you stop."
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("event", choices=("prompt", "tool", "stop"))
    ap.add_argument("--format", choices=("qwen", "generic"), default="qwen")
    a = ap.parse_args()
    if os.environ.get("VISUAL_SUPERVISOR") == "off":
        return 0
    try:
        inp = json.load(sys.stdin)
    except ValueError:
        inp = {}
    cwd = Path(inp.get("cwd") or os.getcwd())
    session = str(inp.get("session_id") or "default")
    state = State(cwd, session)
    st = state.data
    try:
        if a.event == "prompt":
            on_prompt(cwd, st, str(inp.get("prompt") or ""))
            result = None
        elif a.event == "tool":
            text = on_tool(cwd, st)
            if a.format == "generic":
                result = {"append": text}
            else:
                result = (
                    {
                        "hookSpecificOutput": {
                            "hookEventName": "PostToolUse",
                            "additionalContext": text,
                        }
                    }
                    if text
                    else None
                )
        else:
            msg = on_stop(cwd, st)
            if a.format == "generic":
                result = {"continue": msg is not None, "message": msg or ""}
            else:
                result = {"decision": "block", "reason": msg} if msg else None
    finally:
        state.save()
    if result is not None:
        print(json.dumps(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
