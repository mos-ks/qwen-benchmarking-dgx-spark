"""One labelled comparison sheet per brief: Opus first, then local runs by score.

uv run --with pillow python scripts/make_sheets.py
"""

import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "results" / "screenshots"
runs = json.loads((ROOT / "results" / "data" / "visual_runs.json").read_text())

W, H, PW, LH = 640, 400, 185, 30
try:
    FONT = ImageFont.truetype(
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 17
    )
except OSError:
    FONT = ImageFont.load_default()


def slug(run: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", run.split(" · ", 1)[1].lower()).strip("-")


for brief in ("Bonsai", "Lighthouse", "Dashboard"):
    rows = [r for r in runs if r["brief"] == brief]
    rows.sort(key=lambda r: (r["model"] != "Opus 5.5", -r["score"], r["minutes"]))
    rows = [
        r
        for r in rows
        if (SHOTS / brief.lower() / slug(r["run"]) / "desktop-1.png").exists()
    ]
    if not rows:
        continue
    sheet = Image.new("RGB", (W + PW + 12, len(rows) * (H + LH)), "white")
    draw = ImageDraw.Draw(sheet)
    for n, r in enumerate(rows):
        y = n * (H + LH)
        label = f"{r['model']} · {r['kit']} {'' if r['attempt'] in ('ref', 'best') else r['attempt']}".strip()
        draw.text(
            (6, y + 5),
            f"{label} | {r['minutes']:.1f} min | {r['score']:.1f}",
            fill="black",
            font=FONT,
        )
        for name, box, x in (("desktop-1", (W, H), 0), ("phone-0", (PW, H), W + 12)):
            f = SHOTS / brief.lower() / slug(r["run"]) / f"{name}.png"
            if f.exists():
                im = Image.open(f).convert("RGB")
                im.thumbnail(box)
                sheet.paste(im, (x, y + LH))
    out = SHOTS / f"sheet-{brief.lower()}.png"
    sheet.save(out, optimize=True)
    print(out.relative_to(ROOT), len(rows), "rows")
