/* Pixel-art bonsai in the wind. Built on pixel-kit.js (local file, no libraries, no build step).
   Everything is drawn into a low-res canvas scaled by an integer with image-rendering: pixelated. */
(() => {
  "use strict";

  const canvas = document.getElementById("c");

  // ---- palette (5 shades dark -> light, hue shifted: cool shadows, warm lights) --------------
  const SKY = ["#2f76bc", "#4f92d2", "#7fb6e2", "#b4d6ec", "#ecdcbc"];
  const FIELD = ["#f2e4c0", "#ddc79c", "#c1a679", "#9a8059", "#6b593d"];
  const HILL_FAR = "#b7cddb";
  const HILL_FAR_TOP = "#d2e2ec";
  const HILL_NEAR = "#93b1c6";
  const HILL_NEAR_TOP = "#b0c8da";
  const SOIL = ["#211811", "#3a2a1a", "#543c25", "#6f5233", "#8b6b46"];
  const FOLIAGE = ["#163423", "#28562f", "#43873a", "#74b549", "#b6e06f"];
  const FOLIAGE_BACK = ["#102a1d", "#1d4227", "#2f6330", "#4b8a3c", "#7bb457"];
  const BARK = ["#241610", "#432820", "#68402e", "#946246", "#c2966b"];
  const CLAY = ["#2f160f", "#5c2a1b", "#8b4526", "#bd6f41", "#e59f6e"];
  const STONE = ["#22222e", "#3d3d52", "#5e6178", "#8b90a6", "#c2c7d6"];
  const LEAF = ["#3d7a34", "#63a83f", "#93cf5f", "#d3ea8f", "#c97a3c"];
  const WIND = ["#a8ccea", "#eaf6ff"];
  const GRASS = ["#2c5030", "#3f7238", "#63a045", "#8fc95d"];
  const BIRD = ["#3c4f74", "#647ca4"];
  const CLOUD = ["#c6dcea", "#e4f0f8", "#f8fcff"];

  // ---- the bonsai, in model units (150 logical px = the short side of the canvas) -------------
  // limb = [x0, y0, cx, cy, x1, y1, w0, w1, seed]; y is negative upward from the soil line.
  const MODEL = {
    roots: [
      [-1, -1, -6, 0, -12, 2, 5, 2, 41],
      [1, -1, 7, 0, 13, 2, 5, 2, 42],
      [0, -1, 2, 1, 6, 3, 4, 1.6, 43],
      [0, -2, -3, 1, -6, 3, 4, 1.6, 44],
    ],
    trunk: [
      [0, 0, 6, -11, 4, -23, 12, 8, 11],
      [4, -23, -3, -33, -1, -43, 8, 5.5, 12],
      [-1, -43, 4, -51, 8, -58, 5.5, 3, 13],
    ],
    // arm = branch limb, pad = [dx, dy, rx, ry, seed] hanging off its tip
    branches: [
      { arm: [2, -13, -7, -12, -19, -16, 5, 2, 51], pad: [-25, -21, 17, 6.5, 61], back: true },
      { arm: [1, -4, 8, -3, 14, -6, 3.6, 1.8, 55], pad: [19, -10, 10, 5, 65] },
      { arm: [4, -27, 12, -26, 22, -30, 4.5, 2, 52], pad: [28, -35, 14, 6, 62] },
      { arm: [-1, -41, -7, -41, -15, -44, 3.6, 1.8, 53], pad: [-19, -49, 12, 5.5, 63] },
      { arm: [8, -56, 9, -59, 10, -62, 3, 2, 54], pad: [10, -67, 15, 6.5, 64] },
    ],
    backPads: [
      [-7, -30, 11, 5, 71],
      [16, -50, 8.5, 4.5, 72],
    ],
    topY: -74, // highest foliage pixel, model units
  };

  // ---- scene state -----------------------------------------------------------------------------
  let L = null; // layout, rebuilt on resize
  let gust = 0; // click/tap boost, decays over time
  const rnd = PK.rng(20261010);

  const leaves = PK.drift({ n: 26, seed: 31, area: [0, 0, 1, 1], vx: [9, 24], vy: [2, 9], len: [1, 1] });
  const gusts = PK.drift({ n: 15, seed: 7, area: [0, 0, 1, 1], vx: [30, 54], vy: [-1.2, 1.2], len: [5, 12] });
  const falling = [];

  function seedFalling() {
    falling.length = 0;
    for (let i = 0; i < 9; i++) falling.push(resetFalling({}));
  }
  function resetFalling(f) {
    f.x = L.canopyX + (rnd() * 2 - 1) * L.canopyR;
    f.y = L.canopyY + (rnd() * 2 - 1) * L.canopyRy;
    f.vx = 6 + rnd() * 15;
    f.vy = 3 + rnd() * 8;
    f.k = rnd();
    return f;
  }

  // ---- layout ----------------------------------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function layout(v) {
    const S = Math.min(v.W, v.H);
    const portrait = v.H > v.W * 1.12;
    const s = (S / 150) * (portrait ? 1.3 : 1);
    const cx = Math.round(v.W / 2);

    const potW = Math.max(30, Math.round(56 * s));
    const potH = Math.max(9, Math.round(15 * s));
    const slabH = Math.max(4, Math.round(6 * s));
    const treeH = Math.round(-MODEL.topY * s);

    const groundY = clamp(
      Math.round(v.H * 0.5 + treeH * 0.55),
      treeH + 8 + potH,
      Math.round(v.H * 0.8)
    );
    const potX = cx - Math.round(potW / 2);
    const potY = groundY - potH;
    const soilY = potY + Math.max(1, Math.round(potH * 0.18));
    const baseX = cx - Math.round(5 * s);
    const baseY = soilY;
    const horizonY = clamp(groundY - Math.round(S * 0.3), 6, groundY - Math.round(14 * s));
    const slabW = Math.round(potW * 1.6);

    const m = (n) => Math.round(n * s);
    L = {
      v, S, s, cx, groundY, horizonY, potX, potY, potW, potH, soilY, baseX, baseY, slabH, slabW,
      canopyX: baseX + m(4),
      canopyY: baseY + MODEL.topY * s * 0.55,
      canopyR: m(36),
      canopyRy: m(16),
      ripples: clamp(Math.round((v.H - groundY) / Math.max(4, Math.round(5 * s))), 1, 7),
      hills: [
        { cx: Math.round(v.W * 0.22), w: Math.round(v.W * 0.75), h: Math.round(S * 0.2), far: true, seed: 3 },
        { cx: Math.round(v.W * 0.86), w: Math.round(v.W * 0.6), h: Math.round(S * 0.15), far: true, seed: 4 },
        { cx: Math.round(v.W * 0.55), w: Math.round(v.W * 0.95), h: Math.round(S * 0.12), far: false, seed: 5 },
      ],
      clouds: makeClouds(v, S),
      tufts: [],
      pebbles: [],
      birds: Array.from({ length: 3 }, (_, i) => ({
        x: (v.W * (0.15 + 0.3 * i) + i * 17) % v.W,
        y: Math.round(horizonY * (0.24 + 0.14 * i)),
        sp: 4 + i * 1.6,
        ph: i * 1.7,
        sc: Math.max(1, Math.round(S / 90)),
      })),
      pot: potRows(potW, potH),
      rimH: clamp(Math.round(potH * 0.24), 2, 4),
      m,
    };
    L.tufts = makeTufts(v, S);
    L.pebbles = makePebbles(v);
    seedFalling();
    return L;
  }

  function makeClouds(v, S) {
    const r = PK.rng(88);
    const out = [];
    const n = v.W > 260 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const cy = Math.round(S * (0.08 + 0.14 * r()));
      const blobs = [];
      const bn = 4 + Math.floor(r() * 3);
      const cr = Math.max(3, Math.round(S * (0.045 + 0.03 * r())));
      for (let k = 0; k < bn; k++) {
        blobs.push({
          dx: Math.round((r() * 2 - 1) * cr * 1.7),
          dy: Math.round((r() * 2 - 1) * cr * 0.35),
          r: Math.max(2, Math.round(cr * (0.55 + r() * 0.6))),
        });
      }
      out.push({ x: r() * v.W, y: cy, blobs, sp: 1.4 + r() * 1.8, r: cr });
    }
    return out;
  }

  function makeTufts(v, S) {
    const r = PK.rng(1907);
    const out = [];
    const far = Math.round(clamp(v.W / 22, 4, 12));
    for (let i = 0; i < far; i++) {
      out.push({
        x: Math.round(r() * v.W),
        y: L.horizonY + 2 + Math.round((L.groundY - L.horizonY) * (0.4 + r() * 0.5)),
        h: Math.max(2, Math.round(S * 0.024)),
        blades: 3,
        ph: r() * 6.28,
        c: 1,
      });
    }
    const near = Math.round(clamp(v.W / 30, 3, 8));
    for (let i = 0; i < near; i++) {
      const left = i % 2 === 0;
      out.push({
        x: Math.round(left ? r() * v.W * 0.2 : v.W * (0.8 + 0.19 * r())),
        y: Math.round(L.groundY + L.slabH + 3 + r() * Math.max(2, (v.H - L.groundY - L.slabH) * 0.7)),
        h: Math.max(4, Math.round(S * (0.05 + 0.04 * r()))),
        blades: 4 + Math.floor(r() * 3),
        ph: r() * 6.28,
        c: 2,
      });
    }
    return out;
  }

  function makePebbles(v) {
    const r = PK.rng(4242);
    const out = [];
    const n = Math.round(clamp(v.W / 16, 6, 18));
    const top = L.groundY + L.slabH + 1;
    for (let i = 0; i < n; i++) {
      const side = r() < 0.5 ? -1 : 1;
      out.push({
        x: Math.round(v.W / 2 + side * (v.W * (0.18 + r() * 0.4))),
        y: Math.round(top + 1 + r() * Math.max(2, v.H - top - 3)),
        r: Math.max(1, Math.round(1 + r() * (Math.min(v.W, v.H) / 75))),
      });
    }
    return out;
  }

  // ---- the pot: a hand-shaped silhouette generated row by row, drawn with PK.sprite ------------
  // L = lit face, M = body, S = shadow side, D = outline (shadow side + underside)
  function potRows(w, h) {
    const rimH = clamp(Math.round(h * 0.24), 2, 4);
    const footH = clamp(Math.round(h * 0.16), 1, 3);
    const bodyH = Math.max(2, h - rimH - footH);
    const insetMax = Math.max(1, Math.round(w * 0.1));
    const rows = [];
    for (let y = 0; y < h; y++) {
      let row = "";
      for (let x = 0; x < w; x++) {
        const u = x / (w - 1);
        let c = ".";
        if (y < rimH) {
          if (y === 0) c = u < 0.6 ? "L" : "M";
          else if (y === rimH - 1) c = u < 0.66 ? "M" : "S";
          else c = u < 0.28 ? "L" : u < 0.7 ? "M" : "S";
        } else if (y < h - footH) {
          const t = (y - rimH) / bodyH;
          const inset = Math.round(Math.pow(t, 0.85) * insetMax);
          if (x === inset) c = u < 0.5 ? "M" : "S";
          else if (x === w - inset - 1) c = "D";
          else if (x < inset + 2) c = "L";
          else if (u < 0.33) c = t > 0.7 ? "M" : "L";
          else if (u < 0.67) c = t > 0.7 ? "S" : "M";
          else if (u < 0.94) c = t > 0.7 ? "D" : "S";
          else c = "D";
        } else {
          const span = (w - insetMax * 2) / 3;
          const k = Math.floor((x - insetMax) / span);
          const within = x - insetMax - k * span;
          if (x >= insetMax && x < w - insetMax && within < Math.max(2, Math.round(span * 0.4)))
            c = y === h - 1 ? "D" : "S";
        }
        row += c;
      }
      rows.push(row);
    }
    return rows;
  }

  // ---- static scenery (drawn once per resize into an offscreen layer) -------------------------
  function drawStatic() {
    const { v, S, s, cx, groundY, horizonY } = L;

    PK.gradient(0, 0, v.W, horizonY + 1, SKY);

    // sun with a dithered halo, on the light side (top-left)
    const sx = Math.round(v.W * 0.19);
    const sy = Math.round(horizonY * 0.34);
    PK.glow(sx, sy, Math.round(S * 0.13), "#fff3c8", 0.34);
    PK.glow(sx, sy, Math.round(S * 0.08), "#fff8dc", 0.55);
    PK.disc(sx, sy, Math.max(2, Math.round(S * 0.038)), "#fffbE6");

    // haze hills, far (light, low contrast) to near
    for (const h of L.hills) hill(h.cx, horizonY + 1, h.w, h.h, h.far ? HILL_FAR_TOP : HILL_NEAR_TOP, h.far ? HILL_FAR : HILL_NEAR, h.seed);

    // ground plane, light at the horizon warming to dark near the viewer
    PK.gradient(0, horizonY, v.W, v.H, FIELD);
    for (let y = horizonY; y < horizonY + Math.max(2, Math.round(4 * s)); y++)
      for (let x = 0; x < v.W; x++) if (PK.bayer(x, y) < 0.5) PK.px(x, y, "#e8dcc4");
    for (let x = 0; x < v.W; x++) if (PK.bayer(x, horizonY) < 0.7) PK.px(x, horizonY, "#cbb894");

    rake();
    pebbles();

    // stone plinth the pot stands on, plus two natural rocks at its feet
    const slabX = cx - Math.round(L.slabW / 2);
    const baseBottom = groundY + L.slabH;
    PK.rock(slabX - Math.round(9 * s), baseBottom, Math.round(16 * s), Math.max(3, Math.round(5 * s)), STONE, { profile: "mound", rough: 2, seed: 31, cracks: 1, ledges: 0 });
    PK.rock(cx + Math.round(L.slabW / 2) + Math.round(6 * s), baseBottom, Math.round(13 * s), Math.max(3, Math.round(4 * s)), STONE, { profile: "mound", rough: 2, seed: 32, cracks: 1, ledges: 0 });
    plinth();
    // contact shadow of the plinth on the gravel
    for (let x = slabX - 2; x < cx + L.slabW / 2 + 3; x++)
      for (let k = 0; k < 2; k++)
        if (PK.bayer(x, baseBottom + k) < 0.55) PK.px(x, baseBottom + k, FIELD[4]);

    // soil mound, then the pot over its lower half
    PK.ellipse(cx, L.soilY - 1, Math.round(L.potW * 0.42), Math.max(2, Math.round(2.5 * s)), SOIL[1]);
    PK.disc(cx - Math.round(6 * s), L.soilY - 2, Math.max(2, Math.round(3 * s)), SOIL[2]);
    PK.disc(cx + Math.round(7 * s), L.soilY - 1, Math.max(2, Math.round(2.5 * s)), SOIL[1]);
    const soilR = PK.rng(9);
    for (let i = 0; i < Math.round(L.potW * 1.2); i++) {
      const x = cx - Math.round(L.potW * 0.42) + Math.floor(soilR() * L.potW * 0.84);
      const y = L.soilY - Math.floor(soilR() * 3);
      if (soilR() < 0.5) PK.px(x, y, soilR() < 0.5 ? SOIL[0] : SOIL[3]);
    }

    PK.sprite(L.pot, { L: CLAY[4], M: CLAY[3], S: CLAY[2], D: CLAY[1] }, L.potX, L.potY);
    // carved band + under-rim shadow + speckle
    const bandY = L.potY + L.rimH + Math.round((L.potH - L.rimH) * 0.55);
    PK.rect(L.potX + 3, bandY, L.potW - 6, 1, CLAY[1]);
    PK.rect(L.potX + 3, bandY - 1, L.potW - 6, 1, CLAY[2]);
    PK.rect(L.potX + 1, L.potY + L.rimH, L.potW - 2, 1, CLAY[1]);
    const pr = PK.rng(77);
    for (let i = 0; i < Math.round(L.potW * 0.5); i++) {
      const x = L.potX + 2 + Math.floor(pr() * (L.potW - 4));
      const y = L.potY + Math.round(L.potH * 0.3) + Math.floor(pr() * L.potH * 0.5);
      PK.px(x, y, pr() < 0.55 ? CLAY[1] : CLAY[4]);
    }
    // moss at the pot's foot and on the slab
    PK.pad(cx - Math.round(L.potW * 0.36), groundY - 1, Math.max(3, Math.round(5 * s)), Math.max(2, Math.round(2.5 * s)), FOLIAGE_BACK, { seed: 91, r: 2 });
    PK.pad(cx + Math.round(L.potW * 0.42), groundY - 1, Math.max(3, Math.round(4 * s)), Math.max(2, Math.round(2 * s)), FOLIAGE_BACK, { seed: 92, r: 2 });
    // the pot's own contact shadow, drawn over the slab
    for (let x = L.potX - 2; x < L.potX + L.potW + 2; x++)
      if (PK.bayer(x, groundY) < 0.6 && (x < L.potX || x >= L.potX + L.potW)) PK.px(x, groundY, STONE[0]);
  }

  // A hard-edged stone plinth: lit top face, shaded front, bevelled ends, speckle and a crack.
  function plinth() {
    const { cx, s, groundY, slabW, slabH } = L;
    const x0 = cx - Math.round(slabW / 2);
    const bev = Math.max(1, Math.round(2 * s));
    PK.rect(x0, groundY, slabW, 1, STONE[4]);
    PK.rect(cx + Math.round(slabW * 0.18), groundY, Math.round(slabW * 0.34), 1, STONE[3]);
    for (let y = groundY + 1; y < groundY + slabH; y++) {
      const last = groundY + slabH - y <= 1;
      PK.rect(x0, y, slabW, 1, last ? STONE[0] : STONE[2]);
      PK.rect(x0 + slabW - bev, y, bev, 1, last ? STONE[0] : STONE[1]);
      PK.rect(x0, y, Math.max(1, bev - 1), 1, last ? STONE[1] : STONE[3]);
    }
    // bevelled corners read as chamfered stone
    PK.rect(x0, groundY + slabH - 1, bev, 1, STONE[0]);
    PK.rect(x0 + slabW - bev, groundY + slabH - 2, bev, 1, STONE[0]);
    const r = PK.rng(23);
    for (let i = 0; i < slabW * 0.5; i++) {
      const x = x0 + 1 + Math.floor(r() * (slabW - 2));
      const y = groundY + 1 + Math.floor(r() * (slabH - 1));
      PK.px(x, y, r() < 0.55 ? STONE[1] : STONE[3]);
    }
    let ci = x0 + Math.round(slabW * (0.25 + r() * 0.5));
    for (let y = groundY + 1; y < groundY + slabH - 1; y++) {
      PK.px(ci, y, STONE[0]);
      if (r() < 0.4) ci += r() < 0.5 ? -1 : 1;
    }
  }

  function hill(cx, baseY, w, h, topC, bodyC, seed) {
    const r = PK.rng(seed);
    const steps = Math.max(8, w);
    const wob = [];
    for (let i = 0; i <= steps; i++) wob.push(r());
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const sh = Math.pow(Math.sin(Math.PI * u), 1.15);
      const y = baseY - Math.round(h * sh + (wob[i] - 0.5) * h * 0.16);
      pts.push([cx - Math.round(w / 2) + i, y]);
    }
    const close = [[cx + Math.round(w / 2), baseY + 6], [cx - Math.round(w / 2), baseY + 6]];
    PK.poly(pts.map((p) => [p[0], p[1] - 1]).concat(close), topC);
    PK.poly(pts.concat(close), bodyC);
  }

  function rake() {
    const { v, s, cx, groundY, slabH, slabW, ripples } = L;
    const cy = groundY + Math.round(slabH * 0.55);
    for (let k = 0; k < ripples; k++) {
      const rx = Math.round(slabW * 0.5 + 4 + k * Math.max(4, Math.round(5 * s)));
      const ry = Math.max(2, Math.round(rx * 0.3));
      for (let a = 0; a < Math.PI * 2; a += 0.012) {
        const x = Math.round(cx + Math.cos(a) * rx);
        const y = Math.round(cy + Math.sin(a) * ry);
        if (y <= groundY + 1 || y >= v.H - 1 || x < 0 || x >= v.W) continue;
        if (PK.bayer(x, y) > 0.82) continue;
        PK.px(x, y, FIELD[4]);
        PK.px(x, y - 1, FIELD[1]);
      }
    }
  }

  function pebbles() {
    for (const p of L.pebbles) {
      if (p.y <= L.groundY + L.slabH) continue;
      PK.disc(p.x, p.y, p.r, FIELD[3]);
      PK.px(p.x - 1, p.y - 1, FIELD[1]);
      if (p.r > 1) PK.px(p.x + 1, p.y + 1, FIELD[4]);
    }
  }

  // ---- moving parts -----------------------------------------------------------------------------
  function sway(ph, hf, t, amp) {
    return Math.round(Math.sin(t * 1.15 + ph) * amp * hf * (0.7 + 0.45 * gust));
  }

  function drawTree(t) {
    const { s, baseX, baseY, m } = L;
    const amp = 1.7;
    const li = PK.light;

    // shaded limb: outline, body, lit side, highlight, plus sparse bark grooves
    const q = (g, t2) => {
      const u = 1 - t2;
      return [u * u * g[0] + 2 * u * t2 * g[2] + t2 * t2 * g[4], u * u * g[1] + 2 * u * t2 * g[3] + t2 * t2 * g[5]];
    };
    function limbShaded(g, w0, w1, ramp, seed) {
      const x0 = baseX + m(g[0]), y0 = baseY + m(g[1]);
      const cx0 = baseX + m(g[2]), cy0 = baseY + m(g[3]);
      const x1 = baseX + m(g[4]), y1 = baseY + m(g[5]);
      const a = m(w0), b = m(w1);
      PK.taper(x0, y0, cx0, cy0, x1, y1, a + 2, b + 2, ramp[0]);
      PK.taper(x0, y0, cx0, cy0, x1, y1, a, b, ramp[1]);
      PK.taper(x0 + li.x, y0 + li.y, cx0 + li.x, cy0 + li.y, x1 + li.x, y1 + li.y, a - 2, b - 2, ramp[2]);
      PK.taper(x0 + li.x * 2, y0 + li.y * 2, cx0 + li.x * 2, cy0 + li.y * 2, x1 + li.x * 2, y1 + li.y * 2, a * 0.5, b * 0.5, ramp[3]);
      const r = PK.rng(seed);
      const len = Math.hypot(x1 - x0, y1 - y0);
      for (let i = 0, n = Math.max(1, Math.round(len / 6)); i < n; i++) {
        const t2 = 0.12 + r() * 0.76;
        const p = q(g, t2);
        const gx = Math.round(baseX + m(p[0]) + (r() < 0.5 ? -1 : 1) * (0.3 + r() * 0.45) * a * 0.5);
        const gy = Math.round(baseY + m(p[1]) + (r() * 2 - 1));
        const c = r() < 0.6 ? ramp[0] : ramp[4];
        PK.px(gx, gy, c);
        if (r() < 0.45) PK.px(gx, gy + 1, c);
      }
    }

    for (const g of MODEL.roots) limbShaded(g, g[6], g[7], BARK, g[8]);
    for (const g of MODEL.trunk) limbShaded(g, g[6], g[7], BARK, g[8]);

    // branches: root end pinned to the trunk, tip bends with the wind
    const tips = [];
    MODEL.branches.forEach((b, i) => {
      const hf = clamp(-b.pad[1] / -MODEL.topY, 0.2, 1);
      const dx = sway(i * 1.3, hf, t, amp);
      const dy = sway(i * 1.3 + 0.6, hf, t, amp * 0.45);
      const x0 = baseX + m(b.arm[0]), y0 = baseY + m(b.arm[1]);
      const x1 = baseX + m(b.arm[4]) + dx, y1 = baseY + m(b.arm[5]) + dy;
      const g = [b.arm[0], b.arm[1], b.arm[2] + dx / (2 * s), b.arm[3] + dy / (2 * s), b.arm[4] + dx / s, b.arm[5] + dy / s, 0, 0, b.arm[8]];
      limbShaded(g, b.arm[6], b.arm[7], BARK, b.arm[8]);
      tips.push({ dx, dy, hf, i });
    });

    // back pads (darker, seen through the canopy), then the front pads low -> high
    for (const p of MODEL.backPads) {
      const hf = clamp(-p[1] / -MODEL.topY, 0.2, 1);
      padLayered(baseX + m(p[0]) + sway(p[4], hf, t, amp), baseY + m(p[1]), m(p[2]), m(p[3]), FOLIAGE_BACK, p[4]);
    }
    const order = MODEL.branches.map((b, i) => i).sort((a, b) => MODEL.branches[b].pad[1] - MODEL.branches[a].pad[1]);
    for (const i of order) {
      const b = MODEL.branches[i];
      const p = b.pad;
      const tip = tips[i];
      // the pad lags its branch tip slightly: secondary motion
      const dx = tip.dx + sway(p[4] * 0.3, tip.hf, t + 0.18, amp * 0.5);
      padLayered(baseX + m(p[0]) + dx, baseY + m(p[1]) + tip.dy, m(p[2]), m(p[3]), b.back ? FOLIAGE_BACK : FOLIAGE, p[4]);
    }
  }

  // a pad made of two overlapping clouds, the upper one offset toward the light, so each pad
  // reads as layered foliage rather than one round blob
  function padLayered(cx, cy, rx, ry, ramp, seed) {
    PK.pad(cx, cy, rx, ry, ramp, { seed });
    PK.pad(cx - Math.round(rx * 0.42) + PK.light.x, cy - Math.round(ry * 0.7), Math.max(3, Math.round(rx * 0.6)), Math.max(2, Math.round(ry * 0.7)), ramp, { seed: seed + 13 });
    PK.pad(cx + Math.round(rx * 0.5), cy - Math.round(ry * 0.4), Math.max(3, Math.round(rx * 0.5)), Math.max(2, Math.round(ry * 0.6)), ramp, { seed: seed + 29 });
  }

  function drawLeaf(x, y, k, spin) {
    const c = LEAF[Math.min(LEAF.length - 1, Math.floor(k * LEAF.length))];
    const d = LEAF[Math.max(0, Math.floor(k * LEAF.length) - 1)];
    const f = Math.round(spin);
    if (f === 0) { PK.px(x, y, d); PK.px(x + 1, y, c); PK.px(x + 1, y - 1, c); }
    else if (f === 1) { PK.px(x, y, c); PK.px(x, y + 1, d); }
    else if (f === 2) { PK.px(x, y, c); PK.px(x + 1, y + 1, d); PK.px(x - 1, y, d); }
    else PK.px(x, y, c);
  }

  function drawClouds(t) {
    const { v } = L;
    const span = v.W + 60;
    for (const c of L.clouds) {
      const x = Math.round(((c.x + t * c.sp * (1 + gust)) % span) + span) % span - 30;
      const y = c.y;
      for (const b of c.blobs) PK.disc(x + b.dx, y + b.dy + 1, b.r, CLOUD[0]);
      for (const b of c.blobs) PK.disc(x + b.dx, y + b.dy, b.r, CLOUD[1]);
      for (const b of c.blobs) PK.disc(x + b.dx - 1, y + b.dy - 1, Math.max(1, b.r - 2), CLOUD[2]);
    }
  }

  function drawGrass(t) {
    for (const g of L.tufts) {
      const c = GRASS[g.c];
      for (let b = 0; b < g.blades; b++) {
        const off = b - (g.blades - 1) / 2;
        const bend = Math.round(Math.sin(t * 1.9 + g.ph + b * 0.5) * (1 + gust) + off * 0.6);
        PK.line(g.x + off, g.y, g.x + off + bend, g.y - g.h - (b % 2), b === 0 ? c : GRASS[Math.max(0, g.c - 1)]);
      }
    }
  }

  function drawBirds(t, dt) {
    for (const b of L.birds) {
      b.x += b.sp * dt * (1 + gust * 0.5);
      if (b.x > L.v.W + 6) { b.x = -8; b.y = Math.round(L.horizonY * (0.18 + 0.3 * ((b.ph * 0.3) % 1))); }
      const flap = Math.sin(t * 6 + b.ph) > 0 ? -1 : 1;
      const c = BIRD[b.sc > 1 ? 1 : 0];
      PK.px(b.x - 2, b.y + flap, c);
      PK.px(b.x - 1, b.y, c);
      PK.px(b.x, b.y, c);
      PK.px(b.x + 1, b.y, c);
      PK.px(b.x + 2, b.y + flap, c);
      if (b.sc > 1) PK.px(b.x, b.y + 1, BIRD[0]);
    }
  }

  function drawFalling(t, dt) {
    const wind = 1 + gust * 1.4;
    for (const f of falling) {
      f.x += f.vx * dt * wind;
      f.y += (f.vy + Math.sin(t * 2 + f.k * 20) * 4) * dt;
      if (f.x > L.v.W + 3 || f.y > L.v.H + 3 || f.y > L.groundY + L.slabH + 1) resetFalling(f);
      drawLeaf(Math.round(f.x), Math.round(f.y), f.k, Math.sin(t * 4 + f.k * 30) * 2 + 1.5);
    }
  }

  // ---- boot ------------------------------------------------------------------------------------
  let bg = null;
  PK.fit(canvas, 150, (v) => {
    layout(v);
    leaves.setArea([-6, -8, v.W + 8, v.H + 8]);
    gusts.setArea([-10, 4, v.W + 10, L.groundY + 2]);
    bg = PK.layer(v.W, v.H, drawStatic);
  });

  window.addEventListener("pointerdown", () => { gust = 1.3; });

  PK.loop((t, dt) => {
    gust = Math.max(0, gust - dt * 0.9);
    const wind = 1 + gust * 1.4;

    PK.blit(bg);
    drawClouds(t);
    drawGrass(t);
    drawBirds(t, dt);

    gusts.step(dt * wind);
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.25 * Math.min(1, gust);
    gusts.streaks(WIND);
    ctx.restore();

    // leaves behind the tree, then the tree, then leaves in front
    leaves.step(dt * wind);
    for (const p of leaves.particles) {
      if (p.k >= 0.35) continue;
      const yy = p.y + Math.sin(t * 2.4 + p.k * 30) * 2;
      drawLeaf(Math.round(p.x), Math.round(yy), p.k, Math.sin(t * 3 + p.k * 40) * 2 + 1.5);
    }
    drawTree(t);
    for (const p of leaves.particles) {
      if (p.k < 0.35) continue;
      const yy = p.y + Math.sin(t * 2.4 + p.k * 30) * 2;
      drawLeaf(Math.round(p.x), Math.round(yy), p.k, Math.sin(t * 3 + p.k * 40) * 2 + 1.5);
    }
    drawFalling(t, dt);
  });
})();
