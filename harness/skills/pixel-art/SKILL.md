---
name: pixel-art
description: Use before drawing any pixel-art scene, sprite, icon or animation in a browser (canvas or CSS). Gives the rendering setup, palette ramps, shading rules, shape rasterizers and animation patterns that make pixel art look crafted instead of blurry blobs.
license: MIT
---

# Pixel art in the browser

Pixel art is a low-resolution image where every pixel is a deliberate choice, shown scaled up with
hard edges. Two things make it look amateur: blur (antialiasing or non-integer scaling) and flat
single-color shapes. Avoid both from the first line of code.

## 1. Render setup (do exactly this)

- Draw into a small logical canvas, for example 160x120 or 192x128. The whole scene lives in that
  grid; never draw at screen resolution.
- Scale by an integer: `scale = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)))`,
  then `canvas.style.width = W * scale + "px"` (same for height), center it with flexbox, and set
  `image-rendering: pixelated` on the canvas. Recompute on `resize`.
- Keep `ctx.imageSmoothingEnabled = false`. Do not use `ctx.arc`, `ctx.ellipse`, `bezierCurveTo`
  or `lineWidth` strokes for the art: at low resolution they antialias into soft half-transparent
  edges. Rasterize shapes yourself with `fillRect(x, y, 1, 1)` (helpers below).
- Use a seeded random generator so the art is identical every frame (no flicker):

```js
function mulberry32(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rand = mulberry32(42);
```

## 2. Pixel helpers

```js
const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
function disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x*x + y*y <= r*r + r*0.8) px(cx + x, cy + y, c); }
function ellipse(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x*x)/(rx*rx) + (y*y)/(ry*ry) <= 1.0) px(cx + x, cy + y, c); }
// Tapered stroke along a quadratic curve: thick at the start, thin at the end (trunks, branches, tails, hair).
function taper(x0, y0, cx, cy, x1, y1, w0, w1, c) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    const x = u*u*x0 + 2*u*t*cx + t*t*x1, y = u*u*y0 + 2*u*t*cy + t*t*y1;
    disc(x, y, Math.max(0, Math.round((w0 + (w1 - w0) * t) / 2)), c);
  }
}
const dither = (x, y) => (x + y) % 2 === 0; // checkerboard for 2-tone gradients
```

Draw a lit shape in passes: the dark outline/shadow version first, then the mid tone shifted 1px
toward the light, then highlights on the light-facing edge. That alone gives volume.

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

- Trees: trunk = `taper` from base (wide) to top (narrow) along a curve; add root flare at the base
  (2-3 short tapers spreading sideways); branches = shorter tapers leaving the trunk at alternating
  sides, getting thinner. Foliage = clusters of 5-12 overlapping `disc`s per pad, flatter at the
  bottom (cut the bottom rows or use `ellipse` with rx > ry), shaded in 3 passes (shadow, mid,
  highlight discs offset toward the light). Several separate pads at different heights, not one
  blob, with sky visible between them.
- Rocks and cliffs: polygons with jagged top edges (random steps of 1-3 px), a light top face, a
  darker vertical face, and cracks as 1px dark lines.
- Water: horizontal bands of the water ramp, short 1-3px highlight dashes that move, foam as
  clusters of near-white pixels where water meets rocks.
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
