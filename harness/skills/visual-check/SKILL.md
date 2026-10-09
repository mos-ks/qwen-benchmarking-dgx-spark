---
name: visual-check
description: Use after building or changing anything visual (a page, a UI screen, a canvas scene, a chart). Runs the `look` command, which screenshots the page and has a vision model critique it against the goal, then iterates on the fixes. Use it before saying any UI work is done.
license: MIT
---

# Visual check loop

You cannot see the page you wrote. `look` can: it renders the page in a headless browser
(desktop frames over time plus a phone frame), collects console errors, and returns a blunt
critique from a vision model.

    look index.html --goal "<one or two sentences: what the page must show and how it must feel>"
    look http://localhost:5173/ --goal "..." --frames 1      # a running dev server

Loop:

1. Build the first complete version, then run `look` with the goal copied from the request.
2. Read `VERDICT`, `READS AS` and `TOP FIXES`. If `READS AS` is not what the request asked for,
   that is the first thing to fix, before any polish.
3. Fix the top 2-3 items, then run `look` again. Each round, change the code; never argue with the
   critique in prose.
4. Stop when the verdict is GOOD, or when look says its round budget is used up (it enforces 4
   rounds per project); then report the last verdict and any fix you
   did not make.

Console errors listed by `look` are bugs: fix them first. If `look` itself fails (no browser, no
model), say so and fall back to checking the page structure with a script; do not claim the page
looks right.
