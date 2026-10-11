# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml==6.0.2"]
# ///
"""Run the coding_agents_oc cases through the live OpenCode server and score them with their hidden
checks: scaffold -> workspace, the case input as the brief, run_server_agent.py, then every
workspace command with its weight. Writes <out>/<case>/score.json and prints one line per case.

    uv run run_code_cases.py <out_dir> [case_id ...] [--parallel 2] [--server URL] [--prepare | --rescore]

--prepare only builds the workspaces and briefs (for an agent run elsewhere, such as the Opus
reference); --rescore re-runs only the hidden checks on workspaces an earlier run left behind. Commands may use
${env:NAME} or ${env:NAME:fallback}, as in the aeval suite files; AEVAL_CASE_PYTHON defaults to the
agents_eval venv, which has pytest and Playwright.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
SUITE = HERE.parent / "suites" / "coding_agents_oc"
SERVER = "http://127.0.0.1:4096"
os.environ.setdefault("AEVAL_CASE_PYTHON", str(HERE.parents[1] / ".venv" / "bin" / "python"))
ENV_REF = re.compile(r"\$\{env:([A-Za-z_][A-Za-z0-9_]*)(?::([^}]*))?\}")


def expand(arg: str) -> str:
    def sub(m: re.Match) -> str:
        if m.group(1) in os.environ:
            return os.environ[m.group(1)]
        if m.group(2) is not None:
            return m.group(2)
        raise KeyError(f"environment variable {m.group(1)} is not set")

    return ENV_REF.sub(sub, str(arg))


def load_cases() -> list[dict]:
    cases = []
    for f in sorted((SUITE / "cases").glob("*.yaml")):
        cases.extend(yaml.safe_load(f.read_text()))
    return cases


def score(ws: Path, commands: list[dict]) -> dict:
    total = got = 0.0
    checks = []
    for c in commands:
        w = float(c.get("weight", 1))
        total += w
        try:
            res = subprocess.run(
                [expand(a) for a in c["run"]],
                cwd=ws,
                capture_output=True,
                text=True,
                timeout=300,
                check=False,
            )
            ok = res.returncode == c.get("must_exit", 0)
            tail = (res.stdout + res.stderr)[-300:]
        except (subprocess.TimeoutExpired, OSError, KeyError) as exc:
            ok, tail = False, f"{type(exc).__name__}: {exc}"
        got += w if ok else 0
        checks.append(
            {"run": " ".join(map(str, c["run"]))[:120], "weight": w, "ok": ok, "tail": tail}
        )
    return {"score": round(got / total, 3) if total else 0.0, "checks": checks}


def write_score(case: dict, out: Path, ws: Path, result: str) -> str:
    s = score(ws, case["expect"]["workspace_commands"])
    s.update(case=case["id"], agent=result)
    (out / f"{case['id']}.score.json").write_text(json.dumps(s, indent=1))
    return f"{case['id']}: score={s['score']} | {result}"


def agent_result(ws: Path, fallback: str) -> str:
    marker = ws / ".agent-result"
    return marker.read_text().strip() if marker.exists() else fallback


def rescore_case(case: dict, out: Path) -> str:
    ws = out / case["id"]
    if not ws.exists():
        return f"{case['id']}: no workspace"
    return write_score(case, out, ws, agent_result(ws, "no .agent-result"))


def prepare_case(case: dict, out: Path) -> Path:
    ws = out / case["id"]
    if ws.exists():
        shutil.rmtree(ws)
    scaffold = case.get("vars", {}).get("scaffold")
    if scaffold:
        shutil.copytree(
            SUITE / "scaffolds" / scaffold, ws, ignore=shutil.ignore_patterns("node_modules", "__pycache__")
        )
    else:
        ws.mkdir(parents=True)
    if (ws / "package.json").exists():
        subprocess.run(
            ["npm", "install", "--silent", "--no-audit", "--no-fund"],
            cwd=ws,
            capture_output=True,
            check=False,
        )
    (out / f"{case['id']}.brief.txt").write_text(case["input"])
    return ws


def run_case(case: dict, out: Path, server: str = SERVER) -> str:
    ws = prepare_case(case, out)
    brief = out / f"{case['id']}.brief.txt"
    agent = subprocess.run(
        [sys.executable, "-I", str(HERE / "run_server_agent.py"), server, str(brief), str(ws)],
        capture_output=True,
        text=True,
        check=False,
    )
    return write_score(case, out, ws, agent_result(ws, agent.stderr[-200:]))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("cases", nargs="*")
    ap.add_argument("--parallel", type=int, default=2)
    ap.add_argument("--server", default=SERVER, help="OpenCode server to run the agent on")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--prepare", action="store_true")
    mode.add_argument("--rescore", action="store_true")
    a = ap.parse_args()
    out = Path(a.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    cases = [c for c in load_cases() if not a.cases or c["id"] in a.cases]
    with ThreadPoolExecutor(a.parallel) as ex:
        run = (
            (lambda c, o: f"{c['id']}: prepared {prepare_case(c, o)}")
            if a.prepare
            else rescore_case
            if a.rescore
            else lambda c, o: run_case(c, o, a.server)
        )
        for line in ex.map(lambda c: run(c, out), cases):
            print(line, flush=True)


if __name__ == "__main__":
    main()
