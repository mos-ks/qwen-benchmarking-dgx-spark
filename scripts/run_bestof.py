"""Best-of-N through the OpenCode server: N supervised sessions on the same brief in parallel, then
`pick` chooses the winner with the vision model. Records total wall-clock (build + pick).

    python run_bestof.py <server_url> <brief.txt> <out_dir> [--n 3] [--goal "..."]
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent


def run_one(server: str, brief: str, ws: Path) -> str:
    out = subprocess.run(
        [sys.executable, "-I", str(HERE / "run_server_agent.py"), server, brief, str(ws)],
        capture_output=True,
        text=True,
    )
    return out.stdout.strip() or out.stderr.strip()[-300:]


def select_winner(cands: list[Path], goal: str, mode: str, out: Path) -> Path:
    contenders = [c for c in cands if (c / "index.html").exists()] or cands
    log = []
    if mode == "look" and len(contenders) > 1:
        scores = {}
        for c in contenders:
            res = subprocess.run(
                ["look", "index.html", "--goal", goal],
                cwd=c,
                capture_output=True,
                text=True,
                env={**os.environ, "LOOK_MAX_ROUNDS": "1000"},
            )
            m = re.search(r"SCORE:\s*(\d+(?:\.\d+)?)", res.stdout)
            scores[c] = float(m.group(1)) if m else -1.0
            log.append(f"{c.name}: {scores[c]}")
        top = max(scores.values())
        contenders = [c for c in contenders if scores[c] == top]
    if len(contenders) > 1:
        picked = subprocess.run(
            ["pick", "--goal", goal, *map(str, contenders)], capture_output=True, text=True
        )
        log.append(picked.stdout + picked.stderr)
        winner = Path(picked.stdout.strip().splitlines()[-1]) if picked.returncode == 0 else contenders[0]
    else:
        winner = contenders[0]
    (out / "pick.txt").write_text("\n".join(log) + f"\nwinner: {winner.name}\n")
    return winner


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("server")
    ap.add_argument("brief")
    ap.add_argument("out")
    ap.add_argument("--n", type=int, default=3)
    ap.add_argument("--goal", default="")
    ap.add_argument(
        "--select",
        choices=("pick", "look"),
        default="pick",
        help="pick: one batch comparison; look: the calibrated critic scores each candidate, pick breaks ties",
    )
    a = ap.parse_args()
    out = Path(a.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    start = time.time()
    cands = [out / f"cand-{i + 1}" for i in range(a.n)]
    with ThreadPoolExecutor(max_workers=a.n) as pool:
        for line in pool.map(lambda ws: run_one(a.server, a.brief, ws), cands):
            print(line)
    goal = a.goal or Path(a.brief).read_text()[:1200]
    winner = select_winner(cands, goal, a.select, out)
    best = out / "best"
    if best.exists():
        shutil.rmtree(best)
    shutil.copytree(
        winner, best, ignore=shutil.ignore_patterns(".git", ".ocdata", "transcript.json")
    )
    secs = time.time() - start
    result = f"n={a.n} winner={winner.name} total_secs={secs:.0f}"
    (best / ".agent-result").write_text(result + "\n")
    print(result)


if __name__ == "__main__":
    main()
