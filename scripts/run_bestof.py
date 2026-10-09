"""Best-of-N through the OpenCode server: N supervised sessions on the same brief in parallel, then
`pick` chooses the winner with the vision model. Records total wall-clock (build + pick).

    python run_bestof.py <server_url> <brief.txt> <out_dir> [--n 3] [--goal "..."]
"""

import argparse
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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("server")
    ap.add_argument("brief")
    ap.add_argument("out")
    ap.add_argument("--n", type=int, default=3)
    ap.add_argument("--goal", default="")
    a = ap.parse_args()
    out = Path(a.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    start = time.time()
    cands = [out / f"cand-{i + 1}" for i in range(a.n)]
    with ThreadPoolExecutor(max_workers=a.n) as pool:
        for line in pool.map(lambda ws: run_one(a.server, a.brief, ws), cands):
            print(line)
    goal = a.goal or Path(a.brief).read_text()[:1200]
    picked = subprocess.run(
        ["pick", "--goal", goal, *map(str, cands)], capture_output=True, text=True
    )
    (out / "pick.txt").write_text(picked.stdout + picked.stderr)
    winner = Path(picked.stdout.strip().splitlines()[-1]) if picked.returncode == 0 else cands[0]
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
