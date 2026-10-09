"""Screenshot a simple bonsai page: 3 desktop frames 1.5 s apart (animation) and one phone frame."""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ws = Path(sys.argv[1]).resolve()
out = ws / "shots"
out.mkdir(exist_ok=True)
errors: list[str] = []
index = ws / "index.html"
with sync_playwright() as p:
    browser = p.chromium.launch()
    for vw, vh, tag, frames in ((1280, 800, "desktop", 3), (390, 844, "phone", 1)):
        page = browser.new_page(viewport={"width": vw, "height": vh})
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None)
        if not index.exists():
            errors.append("no index.html")
            break
        page.goto(index.as_uri())
        page.wait_for_timeout(1000)
        for i in range(frames):
            page.screenshot(path=str(out / f"{tag}-{i}.png"))
            page.wait_for_timeout(1500)
        page.close()
    browser.close()
(out / "report.json").write_text(json.dumps({"errors": errors}, indent=2))
print(json.dumps({"errors": errors[:6]}))
