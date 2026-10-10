#!/usr/bin/env python3
"""Replay saved screenshots through critic variants and measure agreement with the judge scores.

No pages are rebuilt: every published run already has screenshots and a judge score, so a critic
variant can be scored offline. Variants:
  absolute   the current `look` prompt (1-10 score)
  checklist  brief -> binary observable checks (generated once per brief), critic marks PASS/FAIL,
             score = 10 * passed / total
  anchored   the current prompt plus three judge-scored example screenshots from OTHER briefs
  pairwise   two runs of the same brief side by side, "which is better", asked in both orders

    python3 critic_replay.py --repo ~/Desktop/projects/qwen-benchmarking-dgx-spark --out staging/critic-replay
"""

import argparse
import base64
import itertools
import json
import random
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

ENDPOINT = "http://127.0.0.1:8000/v1"
MODEL = "qwen3-coder"
BRIEF_FILES = {
    "Bonsai": "bonsai.txt",
    "Lighthouse": "lighthouse.txt",
    "Dashboard": "dashboard.txt",
    "Windmill": "windmill.txt",
}
GAP_MS = 1500


def look_prompt() -> str:
    src = (Path(__file__).resolve().parent / "look").read_text()
    return re.search(r'CRITIC_PROMPT = """(.*?)"""', src, re.DOTALL).group(1)


def slug(run: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", run.split(" · ", 1)[1].lower()).strip("-")


def img(path: Path) -> dict:
    return {
        "type": "image_url",
        "image_url": {
            "url": "data:image/png;base64,"
            + base64.b64encode(path.read_bytes()).decode()
        },
    }


def chat(content: list, max_tokens: int = 900) -> str:
    body = {
        "model": MODEL,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": max_tokens,
        "temperature": 0.2,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    req = urllib.request.Request(
        f"{ENDPOINT}/chat/completions",
        json.dumps(body).encode(),
        {"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=900) as r:
        return json.load(r)["choices"][0]["message"]["content"].strip()


def shots(run: dict, repo: Path) -> list[Path]:
    d = repo / "results/screenshots" / run["brief"].lower() / slug(run["run"])
    return [
        d / n
        for n in ("desktop-0.png", "desktop-1.png", "phone-0.png")
        if (d / n).exists()
    ]


def score_of(text: str) -> float | None:
    m = re.search(r"SCORE:\s*(\d+(?:\.\d+)?)", text)
    return float(m.group(1)) if m else None


def absolute(run, repo, brief, extra=None):
    s = shots(run, repo)
    prompt = look_prompt().format(goal=brief, n=len(s), gap_ms=GAP_MS, errors="none")
    content = [{"type": "text", "text": prompt}]
    if extra:
        content = extra + content
    content += [img(p) for p in s]
    out = chat(content)
    return {"score": score_of(out), "raw": out}


CHECKLIST_PROMPT = """Turn this brief for a web page into 8 to 12 binary checks that a strict reviewer can verify
only by looking at screenshots (two desktop frames {gap} ms apart, then one phone-sized frame).
Brief:
{brief}

Cover: every element the brief names, each one present AND recognizable as that thing; every motion the
brief names, visibly different between the two desktop frames; composition (subject centered, scene fills
the screen, nothing cut off); craft (for pixel art: crisp pixels, shading with several tones, no flat
single-color blobs; for interfaces: legible text, nothing overlapping or clipped, consistent spacing);
the phone frame holding the layout. Each check must be something a viewer could disagree with if it were
weak, not a box that any attempt ticks. One check per line, starting with "- ". No other text."""

MARK_PROMPT = """You are a strict reviewer. The goal of the page:
{brief}

You see two desktop frames {gap} ms apart, then a phone-sized frame. Mark every check PASS or FAIL
based only on what is visible. PASS only if a demanding designer would clearly agree; anything weak,
crude, ambiguous or only partly there is FAIL.
Checks:
{checks}

Reply with exactly one line per check, in order: "<number>. PASS - <reason>" or "<number>. FAIL - <reason>"."""


def make_checklist(brief: str) -> list[str]:
    out = chat(
        [{"type": "text", "text": CHECKLIST_PROMPT.format(brief=brief, gap=GAP_MS)}],
        max_tokens=1200,
    )
    return [ln[2:].strip() for ln in out.splitlines() if ln.startswith("- ")]


def checklist(run, repo, brief, checks):
    s = shots(run, repo)
    listing = "\n".join(f"{i + 1}. {c}" for i, c in enumerate(checks))
    content = [
        {
            "type": "text",
            "text": MARK_PROMPT.format(brief=brief, gap=GAP_MS, checks=listing),
        }
    ] + [img(p) for p in s]
    out = chat(content, max_tokens=1500)
    marks = re.findall(r"^\s*(\d+)\.\s*(PASS|FAIL)", out, re.MULTILINE)
    passed = sum(1 for _, m in marks if m == "PASS")
    return {
        "score": round(10 * passed / len(checks), 2) if marks else None,
        "passed": passed,
        "marked": len(marks),
        "raw": out,
    }


def anchors_for(target_brief: str, runs: list[dict], repo: Path) -> list[dict]:
    """Three judge-scored examples from other briefs: the best, one near 7, one near 4."""
    pool = [r for r in runs if r["brief"] != target_brief and shots(r, repo)]
    picks = []
    for want in (9.0, 7.0, 4.0):
        r = min(pool, key=lambda r: (abs(r["score"] - want), r["run"]))
        pool.remove(r)
        picks.append(r)
    content = [
        {
            "type": "text",
            "text": "Calibration examples from OTHER briefs, each scored by an expert judge. Use them to anchor your scale; a typical first attempt by a small model lands around 5-7, not 8-9.\n",
        }
    ]
    for r in picks:
        d = [p for p in shots(r, repo) if p.name == "desktop-1.png"]
        content.append(
            {
                "type": "text",
                "text": f"Example ({r['brief']} brief): expert score {r['score']:.1f}. {r['note']}",
            }
        )
        content += [img(p) for p in d]
    content.append({"type": "text", "text": "Now the page to review.\n"})
    return content


PAIR_PROMPT = """Two versions of the same web page, built for this goal:
{brief}

First come version A's desktop frame and phone frame, then version B's desktop frame and phone frame.
Which version better achieves the goal for a demanding senior designer: how clearly it reads as the
subject, craft, composition, motion cues, and how it holds on the phone?
Reply with "WINNER: A" or "WINNER: B" on the first line, then one sentence why."""


def pair(a, b, repo, brief):
    def two(r):
        return [
            img(p) for p in shots(r, repo) if p.name in ("desktop-1.png", "phone-0.png")
        ]

    content = (
        [
            {"type": "text", "text": PAIR_PROMPT.format(brief=brief)},
            {"type": "text", "text": "Version A:"},
        ]
        + two(a)
        + [{"type": "text", "text": "Version B:"}]
        + two(b)
    )
    out = chat(content, max_tokens=200)
    m = re.search(r"WINNER:\s*([AB])", out)
    return m.group(1) if m else None


def spearman(x: list[float], y: list[float]) -> float:
    def ranks(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        r = [0.0] * len(v)
        i = 0
        while i < len(v):
            j = i
            while j + 1 < len(v) and v[order[j + 1]] == v[order[i]]:
                j += 1
            for k in range(i, j + 1):
                r[order[k]] = (i + j) / 2
            i = j + 1
        return r

    rx, ry = ranks(x), ranks(y)
    mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    cov = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    sx = sum((a - mx) ** 2 for a in rx) ** 0.5
    sy = sum((b - my) ** 2 for b in ry) ** 0.5
    return cov / (sx * sy) if sx and sy else float("nan")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--pairs", type=int, default=40)
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    runs = [
        r
        for r in json.loads((a.repo / "results/data/visual_runs.json").read_text())
        if shots(r, a.repo)
    ]
    briefs = {
        b: (a.repo / "tasks" / f).read_text().strip() for b, f in BRIEF_FILES.items()
    }

    ck_file = a.out / "checklists.json"
    checklists = (
        json.loads(ck_file.read_text())
        if ck_file.exists()
        else {b: make_checklist(t) for b, t in briefs.items()}
    )
    ck_file.write_text(json.dumps(checklists, indent=1))
    anchors = {b: anchors_for(b, runs, a.repo) for b in briefs}

    jobs = []
    for r in runs:
        jobs.append(
            ("absolute", r, lambda r=r: absolute(r, a.repo, briefs[r["brief"]]))
        )
        jobs.append(
            (
                "anchored",
                r,
                lambda r=r: absolute(
                    r, a.repo, briefs[r["brief"]], extra=anchors[r["brief"]]
                ),
            )
        )
        jobs.append(
            (
                "checklist",
                r,
                lambda r=r: checklist(
                    r, a.repo, briefs[r["brief"]], checklists[r["brief"]]
                ),
            )
        )
    rng = random.Random(7)
    candidates = [
        (p, q)
        for b in briefs
        for p, q in itertools.combinations([r for r in runs if r["brief"] == b], 2)
        if abs(p["score"] - q["score"]) >= 1.0
    ]
    rng.shuffle(candidates)
    pairs = candidates[: a.pairs]
    for p, q in pairs:
        jobs.append(
            ("pair-ab", (p, q), lambda p=p, q=q: pair(p, q, a.repo, briefs[p["brief"]]))
        )
        jobs.append(
            ("pair-ba", (p, q), lambda p=p, q=q: pair(q, p, a.repo, briefs[p["brief"]]))
        )

    def run_job(job):
        kind, key, fn = job
        try:
            return kind, key, fn()
        except (
            OSError,
            KeyError,
            ValueError,
        ) as exc:  # one failed call should not sink the replay
            return kind, key, {"error": f"{type(exc).__name__}: {exc}"}

    with ThreadPoolExecutor(a.workers) as ex:
        results = list(ex.map(run_job, jobs))

    per = {}
    for kind, key, res in results:
        if kind in ("absolute", "anchored", "checklist"):
            per.setdefault(key["run"], {"judge": key["score"], "brief": key["brief"]})[
                kind
            ] = res
    (a.out / "per_run.json").write_text(json.dumps(per, indent=1))

    lines = [
        "| critic | n | Spearman vs judge | mean offset (critic - judge) | MAE | pairwise agreement |",
        "|---|---|---|---|---|---|",
    ]
    for kind in ("absolute", "anchored", "checklist"):
        rows = [
            (v["judge"], v[kind]["score"])
            for v in per.values()
            if v.get(kind, {}).get("score") is not None
        ]
        js, cs = [x for x, _ in rows], [y for _, y in rows]
        agree = []
        for p, q in pairs:
            sp, sq = (
                per[p["run"]].get(kind, {}).get("score"),
                per[q["run"]].get(kind, {}).get("score"),
            )
            if sp is None or sq is None:
                continue
            agree.append(
                0.5 if sp == sq else float((sp > sq) == (p["score"] > q["score"]))
            )
        lines.append(
            f"| {kind} | {len(rows)} | {spearman(js, cs):.2f} | {sum(c - j for j, c in rows) / len(rows):+.2f} | "
            f"{sum(abs(c - j) for j, c in rows) / len(rows):.2f} | {sum(agree) / len(agree):.2f} ({len(agree)} pairs) |"
        )
    ab = {tuple(r["run"] for r in k): v for kind, k, v in results if kind == "pair-ab"}
    ba = {tuple(r["run"] for r in k): v for kind, k, v in results if kind == "pair-ba"}
    correct = consistent = 0
    for p, q in pairs:
        k = (p["run"], q["run"])
        first = ab.get(k)
        second = {"A": "B", "B": "A"}.get(
            ba.get(k)
        )  # B in the swapped order means p won
        truth = "A" if p["score"] > q["score"] else "B"
        if first and second and first == second:
            consistent += 1
            correct += first == truth
    lines.append(
        f"| pairwise (both orders must agree) | {len(pairs)} pairs | | | | {correct / len(pairs):.2f} correct, {consistent / len(pairs):.2f} order-consistent |"
    )
    table = "\n".join(lines)
    (a.out / "summary.md").write_text(table + "\n")
    print(table)
    return 0


if __name__ == "__main__":
    sys.exit(main())
