/* pixel-kit.js: crisp pixel-art primitives for a low-res canvas scaled up by an integer.
   A classic script (no modules) so the page still works when opened from file://.
   Everything hangs off window.PK. Colors are CSS strings; a ramp is an array dark -> light. */
(function () {
  "use strict";

  let ctx = null;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

  function rng(seed) {
    let a = seed | 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- canvas setup -------------------------------------------------------------------------

  // Fill the whole viewport: the scale is the largest integer that keeps the short side of the
  // logical canvas at least `shortSide` pixels, and W x H grow to the viewport's aspect ratio
  // (landscape on desktop, portrait on a phone). Lay the scene out from view.W / view.H.
  function fit(canvas, shortSide, onResize) {
    const view = { W: 0, H: 0, scale: 1, portrait: false, ctx: null };
    function apply() {
      const dpr = window.devicePixelRatio || 1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.max(1, Math.floor((Math.min(vw, vh) * dpr) / shortSide));
      view.W = Math.ceil((vw * dpr) / scale);
      view.H = Math.ceil((vh * dpr) / scale);
      view.scale = scale;
      view.portrait = vh > vw;
      canvas.width = view.W;
      canvas.height = view.H;
      Object.assign(canvas.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: (view.W * scale) / dpr + "px",
        height: (view.H * scale) / dpr + "px",
        imageRendering: "pixelated",
      });
      document.documentElement.style.overflow = "hidden";
      document.body.style.margin = "0";
      view.ctx = ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      if (onResize) onResize(view);
    }
    apply();
    window.addEventListener("resize", apply);
    return view;
  }

  // Draw static parts once into an offscreen canvas; blit it every frame. Rebuild on resize.
  function layer(W, H, draw) {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const prev = ctx;
    ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    draw();
    ctx = prev;
    return c;
  }
  const blit = (img, x = 0, y = 0) => ctx.drawImage(img, Math.round(x), Math.round(y));

  // rAF loop with t and dt in seconds; prefers-reduced-motion slows time to a quarter.
  function loop(frame) {
    const slow = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.25 : 1;
    let last = performance.now();
    let t = 0;
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000) * slow;
      last = now;
      t += dt;
      frame(t, dt);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---- raster primitives (no antialiasing anywhere) ----------------------------------------

  function px(x, y, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  function rect(x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function disc(cx, cy, r, c) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    r = Math.max(0, Math.round(r));
    ctx.fillStyle = c;
    for (let y = -r; y <= r; y++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.8 - y * y)));
      ctx.fillRect(cx - dx, cy + y, dx * 2 + 1, 1);
    }
  }
  function ellipse(cx, cy, rx, ry, c) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    ctx.fillStyle = c;
    for (let y = -ry; y <= ry; y++) {
      const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      ctx.fillRect(cx - dx, cy + y, dx * 2 + 1, 1);
    }
  }
  function line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    ctx.fillStyle = c;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  // Filled polygon, even-odd scanline. points = [[x, y], ...].
  function poly(points, c) {
    ctx.fillStyle = c;
    const ys = points.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5;
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        if (ay <= sy !== by <= sy) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const a = Math.round(xs[i]);
        const b = Math.round(xs[i + 1]);
        if (b > a) ctx.fillRect(a, y, b - a, 1);
      }
    }
  }
  // Hand-drawn sprite: rows of characters, palette maps a character to a color; "." is empty.
  function sprite(rows, palette, x, y, flipX = false) {
    const w = Math.max(...rows.map((r) => r.length));
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = palette[row[i]];
        if (c) px(x + (flipX ? w - 1 - i : i), y + j, c);
      }
    });
  }

  // ---- gradients and light -----------------------------------------------------------------

  // Vertical banded gradient through `colors`: solid bands with a short ordered-dither seam at each
  // boundary. Dithering whole bands reads as a checkerboard once scaled up; crafted skies band.
  function gradient(x0, y0, x1, y1, colors, seam = 3) {
    const n = colors.length - 1;
    const h = Math.max(1, y1 - y0);
    for (let y = Math.round(y0); y < y1; y++) {
      const f = ((y - y0) / h) * (n + 1);
      const i = Math.min(n, Math.floor(f));
      const into = (f - i) * (h / (n + 1)); // rows into this band
      const seamRow = i < n ? Math.floor(h / (n + 1) - into) : seam + 1; // rows left before the next band
      if (seamRow > seam) {
        rect(x0, y, x1 - x0, 1, colors[i]);
        continue;
      }
      const t = 1 - seamRow / (seam + 1); // 0..1 across the seam
      for (let x = Math.round(x0); x < x1; x++) px(x, y, bayer(x, y) < t * 0.75 ? colors[i + 1] : colors[i]);
    }
  }
  // Round glow (sun, moon halo, lantern, fire): concentric bands of rising opacity, hard-edged pixels.
  // Banding instead of an ordered dither: a dithered halo reads as a dotted grid when scaled up.
  function glow(cx, cy, r, c, strength = 0.6, bands = 4) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    ctx.save();
    ctx.fillStyle = c;
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const d = Math.sqrt(x * x + y * y) / r;
        if (d >= 1) continue;
        const band = Math.ceil((1 - d) * bands) / bands;
        ctx.globalAlpha = Math.min(1, band * band * strength);
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    ctx.restore();
  }
  // Light beam: a wedge from (x, y) at `angle` (radians, 0 = right), brightest on its axis and
  // near its source, fading in opacity bands. colors = [faint, mid, bright].
  function beam(x, y, angle, len, spread, colors, alpha = 0.55) {
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const reach = Math.ceil(len);
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let j = -reach; j <= reach; j++)
      for (let i = -reach; i <= reach; i++) {
        const along = i * ca + j * sa;
        if (along <= 0 || along > len) continue;
        const across = Math.abs(-i * sa + j * ca);
        const half = along * Math.tan(spread) + 1;
        if (across > half) continue;
        const k = (1 - across / half) ** 0.6 * (1 - (along / len) ** 1.5);
        const band = Math.ceil(k * 4) / 4; // banded falloff: hard pixels, no dotted dither
        if (band <= 0) continue;
        ctx.globalAlpha = alpha * band;
        px(x + i, y + j, colors[Math.min(colors.length - 1, Math.floor(band * colors.length * 0.999))]);
      }
    ctx.restore();
  }

  // ---- organic shapes ------------------------------------------------------------------------

  const light = { x: -1, y: -1 }; // top-left key light; change PK.light to move it

  function curve(x0, y0, cx, cy, x1, y1, w0, w1) {
    const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2);
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      pts.push({
        x: u * u * x0 + 2 * u * t * cx + t * t * x1,
        y: u * u * y0 + 2 * u * t * cy + t * t * y1,
        r: Math.max(0.5, (w0 + (w1 - w0) * t) / 2),
        t,
      });
    }
    return pts;
  }
  // Tapered flat stroke along a quadratic curve.
  function taper(x0, y0, cx, cy, x1, y1, w0, w1, c) {
    for (const p of curve(x0, y0, cx, cy, x1, y1, w0, w1)) disc(p.x, p.y, p.r, c);
  }
  // Shaded trunk or branch: outline, shadow side, lit side, highlight, bark grooves.
  // ramp needs 5 shades dark -> light. Wide at the start, narrow at the end.
  function limb(x0, y0, cx, cy, x1, y1, w0, w1, ramp, seed = 1) {
    const pts = curve(x0, y0, cx, cy, x1, y1, w0, w1);
    const rnd = rng(seed);
    for (const p of pts) disc(p.x, p.y, p.r + 1, ramp[0]);
    for (const p of pts) disc(p.x, p.y, p.r, ramp[1]);
    for (const p of pts) if (p.r >= 1.5) disc(p.x + light.x, p.y + light.y, p.r - 1, ramp[2]);
    for (const p of pts) {
      if (p.r < 2.5) continue;
      const k = Math.round(p.r * 0.5);
      disc(p.x + light.x * k, p.y + light.y * k, Math.round(p.r * 0.3), ramp[3]);
    }
    for (let i = 0; i < pts.length; i += 2) {
      const p = pts[i];
      if (p.r < 2 || rnd() > 0.35) continue;
      const off = (rnd() * 2 - 1) * (p.r - 1);
      px(p.x + off, p.y, rnd() < 0.7 ? ramp[0] : ramp[4]);
    }
    return pts;
  }
  // Foliage pad: a cluster of overlapping discs, flatter at the bottom, each disc shaded toward
  // the light so the pad reads as clumps. ramp needs 5 shades. opts: { seed, n, r }.
  function pad(cx, cy, rx, ry, ramp, opts = {}) {
    const rnd = rng(opts.seed || 7);
    const r = opts.r || Math.max(2, Math.round(Math.min(rx, ry) * 0.55));
    const n = opts.n || Math.max(5, Math.min(14, Math.round((rx * ry) / (r * r)) + 3));
    const blobs = [];
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd());
      const bx = cx + Math.cos(a) * d * Math.max(0, rx - r);
      const by = cy + Math.min(Math.sin(a) * d * Math.max(0, ry - r), (ry - r) * 0.3);
      blobs.push({ x: Math.round(bx), y: Math.round(by), r: r + (rnd() < 0.5 ? 0 : -1) });
    }
    blobs.sort((p, q) => q.y - p.y); // back clumps (lower) first so upper clumps overlap them
    for (const b of blobs) disc(b.x, b.y + 1, b.r + 1, ramp[0]);
    for (const b of blobs) disc(b.x, b.y, b.r, ramp[1]);
    for (const b of blobs) disc(b.x + light.x, b.y + light.y, b.r - 1, ramp[2]);
    for (const b of blobs) disc(b.x + light.x * 2, b.y + light.y * 2, Math.max(1, b.r - 3), ramp[3]);
    for (const b of blobs) {
      for (let k = 0; k < b.r; k++) {
        const hx = b.x + light.x * 2 + Math.round((rnd() * 2 - 1) * (b.r - 2));
        const hy = b.y + light.y * 2 + Math.round((rnd() * 2 - 1) * (b.r - 2));
        px(hx, hy, rnd() < 0.5 ? ramp[4] : ramp[3]);
      }
    }
    return blobs;
  }
  // Rock or cliff as a height field: jagged stepped top edge, a lit top face, faceted sides
  // (lighter toward the light), cracks and speckle. Returns { top(x) } so things can stand on it.
  // profile: "mound" | "cliff" | (u in 0..1) => height share 0..1. ramp needs 5 shades.
  function rock(x, baseY, w, h, ramp, opts = {}) {
    const rnd = rng(opts.seed || 3);
    const rough = opts.rough == null ? Math.max(2, Math.round(h * 0.15)) : opts.rough;
    const shape =
      typeof opts.profile === "function"
        ? opts.profile
        : opts.profile === "cliff"
          ? (u) => Math.min(1, u / 0.18, (1 - u) / 0.12)
          : (u) => Math.sin(Math.PI * u) ** 0.7;
    x = Math.round(x);
    w = Math.round(w);
    baseY = Math.round(baseY);
    const lo = -Math.ceil(rough * 0.5);
    const tops = new Array(w);
    let jitter = 0;
    for (let i = 0; i < w; ) {
      const run = 2 + Math.floor(rnd() * 4);
      const r = rnd();
      const jump = Math.ceil(rough * 0.6);
      if (r < 0.12) jitter = Math.min(rough, jitter + jump); // notch
      else if (r < 0.2) jitter = Math.max(lo, jitter - jump); // spire
      else jitter = Math.max(lo, Math.min(rough, jitter + Math.round((rnd() * 2 - 1) * Math.max(1, rough / 3))));
      for (let k = 0; k < run && i < w; k++, i++)
        tops[i] = Math.min(baseY, Math.round(baseY - h * shape(i / (w - 1)) + jitter));
    }
    const top = (i) => tops[Math.max(0, Math.min(w - 1, i))];
    const facets = [];
    for (let i = 0; i < w; ) {
      const run = 6 + Math.floor(rnd() * 12);
      facets.push({ from: i, to: Math.min(w, i + run), dark: rnd() < 0.4 });
      i += run;
    }
    for (const f of facets) {
      for (let i = f.from; i < f.to; i++) {
        const t0 = tops[i];
        if (t0 >= baseY) continue;
        const u = i / Math.max(1, w - 1);
        const side = light.x < 0 ? u : 1 - u; // 0 = the side facing the light
        let body = side < 0.3 ? 2 : side < 0.7 ? (f.dark ? 1 : 2) : f.dark ? 0 : 1;
        const lit = (top(i + 1) - top(i - 1)) * -light.x <= 0;
        const face = 2 + (rnd() < 0.5 ? 1 : 0);
        for (let y = t0; y < baseY; y++) {
          let c;
          if (y === t0) c = lit ? ramp[4] : ramp[0];
          else if (y - t0 < face) c = lit ? ramp[3] : ramp[2];
          else if (y < top(i - 1) && light.x < 0) c = ramp[3]; // exposed step facing the light
          else if (y < top(i + 1) && light.x < 0) c = ramp[0]; // exposed step facing away
          else if (baseY - y <= Math.max(2, h * 0.12) && bayer(x + i, y) < 0.6) c = ramp[Math.max(0, body - 1)];
          else c = ramp[body];
          if (y - t0 >= face && rnd() < 0.05) c = ramp[Math.max(0, body - 1)];
          px(x + i, y, c);
        }
      }
      if (f.from > 0 && rnd() < 0.5) {
        // fracture running down from the facet boundary, with a lit lip on the light side
        const slope = (rnd() * 2 - 1) * 0.35;
        const y0 = tops[f.from] + 3;
        const len = (0.2 + 0.35 * rnd()) * (baseY - y0);
        for (let s = 0; s < len; s++) {
          const ci = f.from + Math.round(s * slope);
          const cy = y0 + s;
          if (ci <= 0 || ci >= w - 1 || cy <= top(ci) + 1 || cy >= baseY - 1) continue;
          if (rnd() < 0.85) px(x + ci, cy, ramp[0]);
          if (rnd() < 0.5 && cy > top(ci + light.x) + 1) px(x + ci + light.x, cy, ramp[3]);
        }
      }
    }
    const ledges = opts.ledges == null ? Math.round(h / 16) : opts.ledges;
    for (let k = 0; k < ledges; k++) {
      let y = baseY - Math.round(h * (0.15 + 0.65 * rnd()));
      const i0 = Math.floor(rnd() * w * 0.8);
      const i1 = Math.min(w, i0 + Math.round(w * (0.12 + 0.3 * rnd())));
      for (let i = i0; i < i1; i++) {
        if (rnd() < 0.2) y += rnd() < 0.5 ? -1 : 1;
        if (tops[i] >= y - 2 || y >= baseY - 2) continue;
        px(x + i, y, (light.x < 0 ? i / w : 1 - i / w) < 0.6 ? ramp[3] : ramp[2]);
        px(x + i, y + 1, ramp[0]);
      }
    }
    const cracks = opts.cracks == null ? Math.round(w / 24) : opts.cracks;
    for (let k = 0; k < cracks; k++) {
      let ci = Math.floor(rnd() * w);
      let cy = tops[ci] + 3;
      const len = 3 + Math.floor(rnd() * (h * 0.3));
      for (let s = 0; s < len && cy < baseY - 2 && ci >= 0 && ci < w; s++) {
        if (cy > tops[ci] + 1) px(x + ci, cy, ramp[0]);
        cy += 1;
        if (rnd() < 0.4) ci += rnd() < 0.5 ? -1 : 1;
      }
    }
    return { top: (gx) => top(Math.round(gx) - x), x, w, baseY };
  }

  // ---- water ---------------------------------------------------------------------------------

  // Sea from y0 (horizon) to y1 across [x0, x1): bands from light (far) to dark (near), rolling
  // crest lines that move with t, glints. ramp needs 5 shades dark -> light.
  function sea(x0, y0, x1, y1, t, ramp, seed = 5) {
    const rnd = rng(seed);
    const bands = [3, 2, 2, 1, 1, 0];
    for (let y = y0; y < y1; y++) {
      const b = bands[Math.min(bands.length - 1, Math.floor(((y - y0) / (y1 - y0)) * bands.length))];
      rect(x0, y, x1 - x0, 1, ramp[b]);
    }
    const rows = Math.max(2, Math.floor((y1 - y0) / 5));
    for (let k = 0; k < rows; k++) {
      const depth = (k + 1) / rows;
      const yy = y0 + 2 + k * ((y1 - y0 - 3) / rows);
      const period = 10 + depth * 18 + rnd() * 6;
      const amp = 0.6 + depth * 1.6;
      const speed = 3 + depth * 10 + rnd() * 4;
      const phase = rnd() * 100;
      for (let x = x0; x < x1; x++) {
        const s = Math.sin(((x + t * speed + phase) / period) * Math.PI * 2);
        if (s < 0.55) continue;
        const y = Math.round(yy - amp * s);
        px(x, y, s > 0.9 ? ramp[4] : ramp[3]);
        if (s > 0.9 && depth > 0.5) px(x, y + 1, ramp[2]);
      }
    }
  }
  // Breaking foam along a waterline segment (where the sea meets rock or sand): a white band
  // whose height surges with t, plus spray pixels thrown up on each surge.
  function foam(x0, x1, y, t, colors = ["#cfe8f2", "#ffffff"], seed = 9) {
    const rnd = rng(seed);
    for (let x = Math.round(x0); x < x1; x++) {
      const ph = rnd() * 6.28;
      const surge = Math.sin(t * 2.2 + x * 0.35 + ph) * 0.5 + 0.5;
      const hgt = Math.round(1 + surge * 3);
      for (let k = 0; k < hgt; k++) px(x, y - k, k === hgt - 1 ? colors[1] : colors[0]);
      if (surge > 0.85 && rnd() < 0.5) px(x + Math.round(rnd() * 2 - 1), y - hgt - 1 - Math.floor(rnd() * 3), colors[1]);
    }
  }

  // ---- sky and particles ---------------------------------------------------------------------

  function stars(x0, y0, x1, y1, n, t, colors = ["#8a90c0", "#ffffff"], seed = 11) {
    const rnd = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = x0 + Math.floor(rnd() * (x1 - x0));
      const y = y0 + Math.floor(rnd() * (y1 - y0));
      const tw = Math.sin(t * (0.8 + rnd() * 2) + rnd() * 6.28);
      px(x, y, tw > 0.6 ? colors[1] : colors[0]);
      if (tw > 0.95 && i % 5 === 0) {
        px(x - 1, y, colors[0]);
        px(x + 1, y, colors[0]);
        px(x, y - 1, colors[0]);
        px(x, y + 1, colors[0]);
      }
    }
  }
  // Drifting particles (rain, snow, leaves, wind streaks, sparks, embers) that wrap around an area.
  // spec: { n, seed, area: [x0, y0, x1, y1], vx: [min, max], vy: [min, max], len: [min, max] }
  // draw(p, ctxHelpers) is up to you; p has x, y, vx, vy, len, k (0..1 random per particle).
  function drift(spec) {
    const rnd = rng(spec.seed || 13);
    const [ax0, ay0, ax1, ay1] = spec.area;
    const pick = (r) => r[0] + rnd() * (r[1] - r[0]);
    const ps = Array.from({ length: spec.n }, () => ({
      x: ax0 + rnd() * (ax1 - ax0),
      y: ay0 + rnd() * (ay1 - ay0),
      vx: pick(spec.vx || [0, 0]),
      vy: pick(spec.vy || [0, 0]),
      len: Math.round(pick(spec.len || [1, 1])),
      k: rnd(),
    }));
    return {
      particles: ps,
      area: spec.area,
      // Move to a new area (call it from the fit callback): positions keep their relative spot,
      // so particles created in a placeholder area spread evenly over the real one.
      setArea(a) {
        const [ox0, oy0, ox1, oy1] = this.area;
        for (const p of ps) {
          p.x = a[0] + ((p.x - ox0) / (ox1 - ox0 || 1)) * (a[2] - a[0]);
          p.y = a[1] + ((p.y - oy0) / (oy1 - oy0 || 1)) * (a[3] - a[1]);
        }
        this.area = a;
      },
      step(dt) {
        const [x0, y0, x1, y1] = this.area;
        for (const p of ps) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.x < x0) p.x += x1 - x0;
          if (p.x >= x1) p.x -= x1 - x0;
          if (p.y < y0) p.y += y1 - y0;
          if (p.y >= y1) p.y -= y1 - y0;
        }
      },
      // A streak drawn back along the velocity: head in colors[1], tail in colors[0].
      streaks(colors) {
        for (const p of ps) {
          const sp = Math.hypot(p.vx, p.vy) || 1;
          for (let s = 0; s < p.len; s++)
            px(p.x - (p.vx / sp) * s, p.y - (p.vy / sp) * s, s === 0 ? colors[1] : colors[0]);
        }
      },
      dots(colors) {
        for (const p of ps) px(p.x, p.y, colors[Math.floor(p.k * colors.length)]);
      },
    };
  }

  // ---- palettes: 5 shades dark -> light, hue-shifted (cool shadows, warm highlights) -------------

  const ramps = {
    foliage: ["#1d3b2a", "#2f5d34", "#4a8a3c", "#78b84a", "#b8e070"],
    pine: ["#0f2a2a", "#18403a", "#25604a", "#3f8458", "#79b06a"],
    bark: ["#2b1a14", "#4a2c1f", "#6e4430", "#9a6646", "#c79a6b"],
    stone: ["#23222e", "#3d3d52", "#5e6178", "#8b90a6", "#c2c7d6"],
    nightStone: ["#0e0e18", "#1c1c2c", "#2c2d42", "#44475e", "#6b7090"],
    sand: ["#5a3f2e", "#8a6442", "#b8905a", "#dcbc7c", "#f4e2a8"],
    water: ["#0f2240", "#1b3f6b", "#2e6a9e", "#4fa0c8", "#a6e0f0"],
    nightWater: ["#070d20", "#0e1a3a", "#17305a", "#2a5080", "#6a9cc8"],
    snow: ["#4a5a7a", "#7a8cb0", "#aebcd8", "#d8e2f0", "#ffffff"],
    fire: ["#5a1414", "#b8321a", "#f07a1e", "#ffc23a", "#fff4b0"],
    warmLight: ["#7a3b1e", "#c4612a", "#f2a33a", "#ffd56a", "#fff2c0"],
    brickRed: ["#3a1218", "#6e1e22", "#a8322c", "#d65a40", "#f09070"],
    whitePaint: ["#4a4a5c", "#7c7e92", "#b0b4c4", "#dfe2ea", "#ffffff"],
    clay: ["#3a1c14", "#6a3220", "#9a4e2e", "#c8764a", "#e8a874"],
    glaze: ["#141c30", "#22345a", "#355488", "#5a80b8", "#9cc0e8"],
    fur: ["#4a1c0c", "#8a3414", "#c85a1e", "#ee8a3a", "#ffc890"],
  };
  const skies = {
    night: ["#06071a", "#0b0d24", "#141838", "#20264e", "#2e3666"],
    dusk: ["#1e2350", "#3d3770", "#7a4a80", "#c86a70", "#f2a070"],
    day: ["#4f8fd0", "#6aa6dc", "#8cbee6", "#b0d4ee", "#d6eaf6"],
    dawn: ["#2a3a6a", "#5a5a8a", "#a07898", "#e0a090", "#f8d0a0"],
  };

  window.PK = {
    rng, bayer, fit, layer, blit, loop, use: (c) => (ctx = c),
    px, rect, disc, ellipse, line, poly, sprite,
    gradient, glow, beam,
    light, taper, limb, pad, rock,
    sea, foam, stars, drift,
    ramps, skies,
  };
})();
