"""Render the README charts from results/data/*.json.

    uv run --with matplotlib python scripts/make_charts.py

Colors: a fixed categorical order per model (validated for color-vision deficiency, direct labels
everywhere because two slots sit below 3:1 contrast on white). The Opus reference is neutral gray.
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "results" / "data"
OUT = ROOT / "results" / "charts"
OUT.mkdir(parents=True, exist_ok=True)

MODEL_COLORS = {
    "Opus 5.5": "#52514e",
    "Qwen3-Coder-Next": "#2a78d6",
    "Qwen3.8-27B": "#eb6834",
    "Qwen3.6-35B-A3B": "#1baf7a",
    "Qwen3.8-Flash-Next": "#eda100",
}
INK, MUTED, GRID, SURFACE = "#0b0b0b", "#52514e", "#e6e5e0", "#fcfcfb"

plt.rcParams.update(
    {
        "font.family": "DejaVu Sans",
        "font.size": 10,
        "axes.edgecolor": GRID,
        "axes.labelcolor": MUTED,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "savefig.facecolor": SURFACE,
    }
)

runs = json.loads((DATA / "visual_runs.json").read_text())
speed = json.loads((DATA / "speed.json").read_text())


def quality_vs_time() -> None:
    rows = [r for r in runs if r["brief"] == "Bonsai"]
    opus = next(r for r in rows if r["model"] == "Opus 5.5")
    fig, ax = plt.subplots(figsize=(9, 5.2), dpi=150)
    ax.grid(axis="y", color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    budget = 2 * opus["minutes"]
    ax.axvline(budget, color=MUTED, linestyle=(0, (4, 4)), linewidth=1)
    ax.text(budget + 0.6, 9.75, "time budget (2x Opus)", color=MUTED, fontsize=9, va="top")
    ax.axhline(opus["score"], color=MUTED, linestyle=(0, (4, 4)), linewidth=1)
    ax.text(
        47.5, opus["score"] + 0.15, "Opus score", color=MUTED, fontsize=9, ha="right", va="bottom"
    )
    seen = set()
    for i, r in enumerate(rows):
        x = r["minutes"] + ((i % 3) - 1) * 0.6 if r["minutes"] >= 44.9 else r["minutes"]
        label = r["model"] if r["model"] not in seen else None
        seen.add(r["model"])
        ax.scatter(
            x,
            r["score"],
            s=110 if r["model"] == "Opus 5.5" else 70,
            color=MODEL_COLORS[r["model"]],
            edgecolor=SURFACE,
            linewidth=1.5,
            zorder=3,
            label=label,
        )
        tag = r["kit"] + (" " + r["attempt"] if r["attempt"] not in ("ref", "best") else "")
        if r["model"] == "Opus 5.5":
            tag = "Opus 5.5"
        ax.annotate(
            tag, (x, r["score"]), xytext=(6, 4), textcoords="offset points", fontsize=7.5, color=INK
        )
    ax.set_xlim(0, 48)
    ax.set_ylim(-0.4, 10)
    ax.set_xlabel("minutes to finished page")
    ax.set_ylabel("score (1-10, judged)")
    ax.set_title(
        "Pixel-art bonsai brief: quality against time, every run",
        loc="left",
        color=INK,
        fontsize=12,
    )
    ax.legend(frameon=False, loc="upper left", bbox_to_anchor=(0, -0.13), ncol=4, fontsize=8.5)
    fig.tight_layout()
    fig.savefig(OUT / "bonsai_quality_vs_time.png")
    plt.close(fig)


def best_per_brief() -> None:
    briefs = ["Bonsai", "Lighthouse", "Dashboard"]
    order = list(MODEL_COLORS)
    best: dict[tuple[str, str, str], dict] = {}
    for r in runs:
        k = (r["brief"], r["model"], r["kit"])
        if k not in best or r["score"] > best[k]["score"]:
            best[k] = r
    fig, axes = plt.subplots(1, 3, figsize=(13, 4.8), dpi=150, sharex=True)
    for ax, brief in zip(axes, briefs, strict=True):
        rows = sorted(
            (v for k, v in best.items() if k[0] == brief),
            key=lambda r: (order.index(r["model"]), r["kit"]),
        )
        labels = [
            "Opus 5.5 (reference)"
            if r["model"] == "Opus 5.5"
            else f"{r['model']} · {r['kit']}"
            for r in rows
        ]
        ys = list(range(len(rows)))[::-1]
        ax.barh(
            ys,
            [r["score"] for r in rows],
            color=[MODEL_COLORS[r["model"]] for r in rows],
            height=0.6,
        )
        for y, r in zip(ys, rows, strict=True):
            ax.text(
                r["score"] + 0.15,
                y,
                f"{r['score']:.1f} · {r['minutes']:.0f} min",
                va="center",
                fontsize=8,
                color=INK,
            )
        ax.set_yticks(ys, labels, fontsize=8)
        ax.set_xlim(0, 12.5)
        ax.set_xticks([0, 5, 10])
        ax.grid(axis="x", color=GRID)
        ax.set_axisbelow(True)
        ax.set_title(brief, loc="left", color=INK, fontsize=11)
    fig.suptitle(
        "Best run per brief and setup (score, minutes)", x=0.01, ha="left", color=INK, fontsize=12
    )
    fig.tight_layout()
    fig.savefig(OUT / "best_per_brief.png")
    plt.close(fig)


def decode_speed() -> None:
    rows = sorted(speed, key=lambda r: r["tok_s"])
    fig, ax = plt.subplots(figsize=(8, 3.2), dpi=150)
    ys = range(len(rows))
    ax.barh(
        list(ys),
        [r["tok_s"] for r in rows],
        color=[MODEL_COLORS[r["model"]] for r in rows],
        height=0.55,
    )
    for y, r in zip(ys, rows, strict=True):
        ax.text(
            r["tok_s"] + 2,
            y,
            f"{r['tok_s']:.1f} tok/s · {r['active_b']}B active"
            + (" · vision" if r["vision"] == "yes" else ""),
            va="center",
            fontsize=8.5,
            color=INK,
        )
    ax.set_yticks(list(ys), [r["model"] for r in rows], fontsize=9)
    ax.set_xlim(0, max(r["tok_s"] for r in rows) * 1.55)
    ax.grid(axis="x", color=GRID)
    ax.set_axisbelow(True)
    ax.set_title("Single-stream decode speed on the DGX Spark", loc="left", color=INK, fontsize=12)
    fig.tight_layout()
    fig.savefig(OUT / "decode_speed.png")
    plt.close(fig)


if __name__ == "__main__":
    quality_vs_time()
    best_per_brief()
    decode_speed()
    print("charts ->", OUT)
