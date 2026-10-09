---
name: pixel-art
description: Use before drawing any pixel-art scene, sprite, icon or animation in a browser (canvas or CSS). Gives the rendering setup, palette ramps, shading rules, shape rasterizers and animation patterns that make pixel art look crafted instead of blurry blobs. Ships pixel-kit.js, a tested drawing library to copy into the project.
license: MIT
---

# Pixel art in the browser

Pixel art is a low-resolution image where every pixel is a deliberate choice, shown scaled up with
hard edges. Two things make it look amateur: blur (antialiasing or non-integer scaling) and flat
single-color shapes. Avoid both from the first line of code.

## 1. Start from pixel-kit.js (do exactly this)

This skill ships a tested helper library. Copy it into the project and build the scene from it;
do not write your own rasterizers, scaling code or particle loops.

```bash
cp "{{SKILLS_DIR}}/pixel-art/pixel-kit.js" ./pixel-kit.js
```

```html
<canvas id="c"></canvas>
<script src="pixel-kit.js"></script>  <!-- a plain local file: no module, works from file:// -->
<script>
const R = PK.ramps;
let bg, rain = PK.drift({ n: 60, area: [0, 0, 1, 1], vx: [-12, -8], vy: [70, 90], len: [3, 5] });
// fit() sizes the canvas to cover the whole viewport at an integer scale and calls the
// callback right away and on every resize: declare your state BEFORE calling it.
const view = PK.fit(document.getElementById("c"), 140, (v) => {
  bg = PK.layer(v.W, v.H, () => { /* static scenery: sky, rocks, trunk, buildings */ });
  rain.setArea([0, -8, v.W, v.H]);
});
PK.loop((t, dt) => {           // t, dt in seconds; reduced motion is handled
  PK.blit(bg);                 // static layer first
  /* moving parts: sway, beams, water, particles */
  rain.step(dt); rain.streaks(["#3a4a7a", "#8aa0d0"]);
});
</script>
```

Lay everything out from `view.W` and `view.H` (they change with the viewport: landscape on a
desktop, portrait on a phone), anchored to a ground line such as `Math.round(view.H * 0.8)`.
The second argument of `fit` is the logical size of the short side (120-160): the subject should
be about 40-60% of it.

| Call | Draws |
|---|---|
| `PK.px / rect / disc / ellipse / line / poly(points)` | hard-edged pixels, filled circle, ellipse, Bresenham line, filled polygon |
| `PK.sprite(rows, palette, x, y, flipX)` | a hand-drawn sprite from strings, `.` = empty: use for anything that needs an exact silhouette (pot, house, lantern room, animal, window, sign) |
| `PK.gradient(x0, y0, x1, y1, colors)` | banded sky or water gradient with ordered dither between bands |
| `PK.glow(cx, cy, r, color, strength)` | dithered halo (moon, lamp, fire) |
| `PK.beam(x, y, angle, len, spread, [faint, mid, bright], alpha)` | light beam wedge, bright on axis and near the source |
| `PK.limb(x0, y0, cx, cy, x1, y1, w0, w1, ramp, seed)` | shaded trunk or branch along a curve, wide to narrow; returns the points |
| `PK.pad(cx, cy, rx, ry, ramp, {seed})` | foliage pad: shaded clumps, flat bottom |
| `PK.rock(x, baseY, w, h, ramp, {profile: "mound" or "cliff", seed})` | jagged faceted rock or cliff; returns `{ top(x) }` so things can stand on it |
| `PK.sea(x0, y0, x1, y1, t, ramp)` / `PK.foam(x0, x1, y, t)` | rolling sea with moving crests / foam surging against rock or sand |
| `PK.stars(x0, y0, x1, y1, n, t)` | twinkling star field |
| `PK.drift({n, area, vx, vy, len})` | particles: `.setArea(a)` in the fit callback, `.step(dt)` then `.streaks(colors)` (rain, wind) or `.dots(colors)` (snow, leaves, sparks) |
| `PK.ramps.*`, `PK.skies.*` | 5-shade ramps dark to light: foliage, pine, bark, stone, nightStone, sand, water, nightWater, snow, fire, warmLight, brickRed, whitePaint, clay, glaze, fur; skies: night, dusk, day, dawn |

Before writing code, list every object the brief names with its silhouette in a few words and its
size in logical pixels, and pick the call that draws it. Anything with a specific outline (a pot, a
house, a lantern room, an animal) is a `PK.sprite`, not a pile of discs.

## 2. Without the kit

If you cannot use the file, keep the same rules by hand: a small logical canvas scaled by an
integer with `image-rendering: pixelated`, `imageSmoothingEnabled = false`, no `arc`, `ellipse`,
`bezierCurveTo` or stroked lines for the art (they antialias), shapes rasterized with
`fillRect(x, y, 1, 1)`, and a seeded random generator so nothing flickers.

## 3. Palette

- 16-32 colors total. Each material gets a ramp of 4-5 shades. Shift hue along the ramp:
  shadows go cooler (toward blue or purple), highlights warmer (toward yellow). Do not just darken
  with black or lighten with white.
- Example ramps (dark to light):
  - foliage: `#1d3b2a #2f5d34 #4a8a3c #78b84a #b8e070`
  - wood/bark: `#2b1a14 #4a2c1f #6e4430 #9a6646 #c79a6b`
  - stone: `#23222e #3d3d52 #5e6178 #8b90a6 #c2c7d6`
  - water: `#0f2240 #1b3f6b #2e6a9e #4fa0c8 #a6e0f0`
  - night sky: `#0b0d1f #161a3a #262b5c #3b3f7a`
  - warm light: `#7a3b1e #c4612a #f2a33a #ffe08a`
- Outlines: one shade darker than the darkest fill of that object, never pure `#000`. Outline only
  the silhouette's shadow side or the whole silhouette (selective outlining); interior lines use
  the ramp, not black.

## 4. Shading and light

- Pick one light direction for the whole scene (top-left is the default) and keep it.
- Every object: highlight on light-facing edges, mid tone body, shadow on the far side and
  underneath, plus a soft contact shadow (1-2 rows, darker ground color) where it meets the ground.
- Use dithering only for large gradients (sky, light cones, fog), not on small objects.
- Add small-scale texture with the seeded random: a few darker or lighter pixels scattered inside
  large areas (bark streaks, stone speckles, leaf highlights). 3-8% of pixels is enough.

## 5. Organic shapes that read correctly

- Trees: trunk = `PK.limb` from base (wide) to top (narrow) along a curve; root flare = 2-3 short
  limbs spreading sideways at the base; branches = thinner limbs leaving the trunk at alternating
  sides. Foliage = several `PK.pad`s at different heights at the branch tips, not one blob, with sky
  visible between them.
- Rocks and cliffs: `PK.rock` with `profile: "cliff"` for a cliff, `"mound"` for boulders; stand
  buildings on `rock.top(x)`. Add 2-4 smaller rocks around the base so it reads as rocky.
- Water: `PK.sea` for the body, `PK.foam` along every line where water meets rock or shore.
- Buildings: hard rectangles; windows as 2x2 or 3x3 lit squares; roofs one ramp darker on the
  shadow side.

## 6. Composition

- Subject centered horizontally, its visual center at about 55-60% of the canvas height; it should
  fill roughly 40-60% of the canvas height.
- Back to front layers: sky gradient, far shapes (mountains, city) in desaturated light colors,
  mid ground, subject, foreground details. Farther layers have less contrast.
- Leave breathing room; do not let the subject touch the canvas edges.
- Fill the screen. The scene's background (sky, ground, water) runs edge to edge of the viewport; the
  low-res canvas is scaled up to cover it (integer scale, letterbox only with scene-colored bars),
  never a small framed box floating in an empty page. Choose the logical canvas aspect ratio from
  the viewport (landscape on desktop, portrait on a phone) and recompute on resize.

## 7. Animation

- One `requestAnimationFrame` loop; derive everything from elapsed time `t` in seconds, not from
  frame count, and clear and redraw the whole low-res canvas each frame.
- Sway: offset each element by `Math.round(Math.sin(t * speed + phase) * amp * heightFactor)`
  where parts higher up move more. Whole-pixel offsets only.
- Particles (leaves, rain, snow, sparks, wind streaks): an array of `{x, y, vx, vy, life}`; update
  with `dt`; wrap or respawn at the edges; draw as 1-3 pixel sprites in 2 shades; vary speed and
  size per particle; 20-80 particles is plenty.
- Light beams and glows: draw a dithered translucent wedge or band (`globalAlpha` 0.15-0.35) and
  keep its edge pixels hard.
- Respect `matchMedia('(prefers-reduced-motion: reduce)')`: keep the scene, slow or stop motion.

## 8. Check it

Run the page and look at it (with the `look` command when available:
`look index.html --goal "<what the scene must show>"`). Fix what the critique names, then look
again. Repeat until the subject is recognizable at a glance, edges are hard, and motion is visible.
