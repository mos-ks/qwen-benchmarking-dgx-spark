/* bonsai.js — a pixel-art bonsai in the wind. Draws on the #c canvas using PK (pixel-kit.js). */
(function () {
  "use strict";
  const R = PK.ramps;

  const soil = ["#170f0a", "#241610", "#3a2418", "#543624"];
  const turf = ["#0c1a12", "#13281c", "#1d3b2a", "#2f5d34"];
  const hillFar = "#7d6084";
  const hillNear = "#5c4a70";
  const blossom = ["#c65f8a", "#f2a7c3"];
  const leafCols = ["#1d3b2a", "#2f5d34", "#78b84a"];
  const glaze = { l: "#9cc0e8", m: "#5a80b8", d: "#355488", s: "#22345a", k: "#141c30" };
  const fire = R.fire;

  const canvas = document.getElementById("c");

  // ---- particles (declared before fit; areas set in the fit callback) --------------------------
  const streaks = PK.drift({ n: 22, seed: 5, area: [0, 0, 1, 1], vx: [24, 42], vy: [-1, 1.5], len: [5, 10] });
  const canopyWind = PK.drift({ n: 7, seed: 9, area: [0, 0, 1, 1], vx: [20, 36], vy: [0, 1.5], len: [4, 8] });
  const grassWind = PK.drift({ n: 8, seed: 10, area: [0, 0, 1, 1], vx: [22, 34], vy: [0, 1], len: [3, 5] });
  const leaves = PK.drift({ n: 30, seed: 19, area: [0, 0, 1, 1], vx: [10, 20], vy: [2.5, 7], len: [1, 3] });

  let bg = null;
  let W = 0, H = 0, S = 0, groundY = 0, cx = 0, T = 60, potW = 30;
  let pot = { w: 30, h: 9, top: 0, left: 0 };

  // ---- static scenery ---------------------------------------------------------------------------

  function hillPoly(x0, x1, peak, baseY, seed) {
    const rnd = PK.rng(seed);
    const pts = [];
    const n = Math.max(8, Math.round((x1 - x0) / 3));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const jitter = rnd() < 0.3 ? Math.round((rnd() * 2 - 1) * 1.5) : 0;
      pts.push([x0 + u * (x1 - x0), baseY - peak * Math.sin(Math.PI * u) ** 1.15 + jitter]);
    }
    pts.push([x1, baseY + 2], [x0, baseY + 2]);
    return pts;
  }

  // shallow rectangular bonsai pot: wide flat rim, straight slab sides, two separated feet
  function buildPot(w) {
    const t = Math.max(22, Math.min(42, w));
    const rows = [];
    rows.push("l".repeat(t));                       // rim top, catching light
    rows.push("m".repeat(t - 3) + "sss");            // rim body, shaded right
    rows.push("." + "k".repeat(t - 2) + ".");        // shadow under the overhanging lip
    const bodyRows = 5;
    for (let i = 0; i < bodyRows; i++) {
      const ind = 1 + Math.floor(i / 2);             // barely-there taper keeps it slab-like
      const n = t - ind * 2;
      rows.push(".".repeat(ind) + "m" + "d".repeat(Math.max(0, n - 3)) + "ss" + ".".repeat(ind));
    }
    const ind = 1 + Math.floor(bodyRows / 2) + 1;
    rows.push(".".repeat(ind) + "k".repeat(Math.max(2, t - ind * 2)) + ".".repeat(ind));
    const fw = Math.max(3, Math.round(t * 0.11));
    const fi = Math.round(t * 0.13);
    rows.push(".".repeat(fi) + "k".repeat(fw) + ".".repeat(t - fi * 2 - fw * 2) + "k".repeat(fw) + ".".repeat(fi));
    return { rows, t };
  }

  function buildBg() {
    const p = buildPot(potW);
    pot = { w: p.t, h: p.rows.length, top: groundY - p.rows.length, left: cx - Math.round(p.t / 2) };

    bg = PK.layer(W, H, () => {
      // dusk sky
      PK.gradient(0, 0, W, groundY + 1, PK.skies.dusk);

      // low sun as warm backlight, right of centre, behind the hills
      const sx = Math.round(W * 0.74);
      const sy = groundY - Math.round(S * 0.24);
      PK.glow(sx, sy, Math.round(S * 0.13), fire[2], 0.45, 4);
      PK.glow(sx, sy, Math.round(S * 0.08), fire[3], 0.6, 3);
      PK.disc(sx, sy, Math.max(3, Math.round(S * 0.05)), fire[2]);
      PK.disc(sx - 1, sy - 1, Math.max(2, Math.round(S * 0.032)), fire[4]);

      // two soft hill ridges on the horizon
      PK.poly(hillPoly(0, Math.round(W * 0.66), Math.round(S * 0.13), groundY, 31), hillFar);
      PK.poly(hillPoly(Math.round(W * 0.42), W, Math.round(S * 0.09), groundY, 32), hillNear);

      // ground band with banded gradient (far = lighter)
      PK.gradient(0, groundY, W, H + 1, [turf[2], turf[1], turf[1], turf[0]]);
      const rnd = PK.rng(41);
      for (let x = 0; x < W; x++) {
        if (rnd() < 0.5) PK.px(x, groundY, rnd() < 0.5 ? turf[3] : turf[2]);
        for (let y = groundY + 2; y < H; y++) {
          const r = rnd();
          if (r < 0.03) PK.px(x, y, turf[2]);
          else if (r < 0.045) PK.px(x, y, turf[0]);
        }
        if (rnd() < 0.22) { // 1-2 px grass blades near the ground line
          const h = 1 + (rnd() < 0.5 ? 1 : 0);
          for (let k = 0; k < h; k++) PK.px(x, groundY - k, rnd() < 0.6 ? turf[2] : turf[3]);
        }
      }
      for (let i = 0; i < 4; i++) { // a few tiny pale flowers, kept sparse
        const fx = Math.round(rnd() * (W - 8)) + 4;
        const fy = groundY + 2 + Math.round(rnd() * Math.max(2, H - groundY - 4));
        PK.px(fx, fy, "#e8d9a0");
      }
      for (let i = 0; i < 12; i++) { // leaves already fallen, resting in the grass
        const fx = Math.round(rnd() * (W - 6)) + 3;
        const fy = groundY + 1 + Math.round(rnd() * Math.max(2, (H - groundY) * 0.5));
        const c = rnd() < 0.2 ? blossom[0] : leafCols[Math.floor(rnd() * 3)];
        PK.px(fx, fy, c);
        if (rnd() < 0.4) PK.px(fx + 1, fy, leafCols[0]);
      }

      // mossy rock accent left of the bonsai
      const rw = Math.max(10, Math.round(S * 0.15));
      const rk = PK.rock(cx - Math.round(S * 0.42) - Math.round(rw / 2), groundY + 1, rw, Math.max(4, Math.round(S * 0.07)), R.stone, { seed: 7, profile: "mound", rough: 2 });
      const rr = PK.rng(8);
      for (let i = 1; i < rw - 1; i++) {
        if (rr() < 0.35) PK.px(rk.x + i, rk.top(rk.x + i), R.foliage[1]);
        if (rr() < 0.12) PK.px(rk.x + i, rk.top(rk.x + i) + 1, R.foliage[2]);
      }

      // contact shadow under the pot, then the pot sprite, then soil
      PK.ellipse(cx, groundY + 1, Math.round(p.t / 2) + 3, 2, turf[0]);
      PK.sprite(p.rows, glaze, pot.left, pot.top);
      // glaze ridge highlight across the slab body
      const ridgeY = pot.top + 5;
      for (let x = pot.left + 4; x < pot.left + p.t - 4; x++) {
        if (x & 1) PK.px(x, ridgeY, glaze.m);
      }
      // soil surface inside the rim with a mound under the trunk
      PK.ellipse(cx, pot.top + 1, Math.round(p.t / 2) - 3, 1, soil[2]);
      PK.ellipse(cx, pot.top, 5, 2, soil[2]);
      const sr = PK.rng(23);
      for (let i = 0; i < 14; i++) {
        const x = cx - 7 + Math.round(sr() * 14);
        const y = pot.top + Math.round(sr() * 2) - 1;
        PK.px(x, y, sr() < 0.5 ? soil[1] : soil[3]);
      }
      // grass tuft on the rim corner
      PK.px(pot.left + 3, pot.top - 1, turf[2]);
      PK.px(pot.left + 4, pot.top - 2, turf[3]);
      PK.px(pot.left + 4, pot.top - 1, turf[2]);
    });
  }

  // ---- foliage pad: rounded top of shaded clumps, dead-flat bottom edge -------------------------

  function bonsaiPad(cxPad, baseY, rx, seed) {
    rx = Math.max(6, rx);
    const h = Math.max(4, Math.round(rx * 0.62));
    const rnd = PK.rng(seed);
    const topY = baseY - h;
    // dome body: narrow at the top row, widening to the flat bottom; ragged 1-2 px edges
    for (let y = topY + 1; y <= baseY; y++) {
      const dy = (y - topY) / h;
      let hw = Math.round(rx * Math.sqrt(Math.max(0, dy * (2 - dy))));
      if (rnd() < 0.4) hw += Math.round(rnd() * 2 - 1);
      hw = Math.max(1, hw);
      PK.rect(cxPad - hw, y, hw * 2 + 1, 1, y >= baseY - 1 ? R.foliage[0] : R.foliage[1]);
    }
    // flat, straight bottom edge in the darkest shade
    PK.rect(cxPad - rx + 2, baseY, (rx - 2) * 2, 1, R.foliage[0]);
    // clump bumps across the rounded top, each lit from the top-left
    const bumps = 3 + (rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < bumps; i++) {
      const bx = cxPad - rx + 2 + Math.round((i + 0.5) * ((rx * 2 - 4) / bumps));
      const by = topY + 1 + Math.round(Math.abs(Math.sin(i * 2.1 + seed)) * 2);
      const br = Math.max(2, Math.round(rx * (0.24 + (i % 3) * 0.05)));
      PK.disc(bx, by, br, R.foliage[1]);
      PK.disc(bx - 1, by - 1, Math.max(1, br - 1), R.foliage[2]);
      if (br >= 3) PK.disc(bx - 2, by - 2, 1, R.foliage[3]);
      if (br >= 4) PK.px(bx - 2, by - 3, R.foliage[4]);
    }
    // a few lit sparkles top-left, a few dark speckles bottom-right
    for (let i = 0; i < rx; i++) {
      const hx = cxPad - rx + 1 + Math.round(rnd() * rx);
      const hy = topY + 1 + Math.round(rnd() * h * 0.55);
      PK.px(hx, hy, rnd() < 0.5 ? R.foliage[3] : R.foliage[2]);
      const sx = cxPad + 1 + Math.round(rnd() * (rx - 2));
      const sy = baseY - 2 - Math.round(rnd() * h * 0.3);
      PK.px(sx, sy, R.foliage[0]);
    }
    return { cx: cxPad, baseY, rx, h, seed };
  }

  // sparse pink blossoms on the upper clumps of a pad (seeded, so they are stable)
  function blossoms(p) {
    const rnd = PK.rng(p.seed * 7 + 3);
    const n = Math.round(p.rx / 3);
    for (let i = 0; i < n; i++) {
      const x = p.cx - p.rx + 1 + Math.round(rnd() * (p.rx * 2 - 2));
      const y = p.baseY - p.h + 1 + Math.round(rnd() * p.h * 0.6);
      PK.px(x, y, rnd() < 0.5 ? blossom[0] : blossom[1]);
      if (rnd() < 0.3) PK.px(x + 1, y - 1, blossom[1]);
    }
  }

  // ---- the bonsai (redrawn each frame so the crown can sway) ------------------------------------

  const q = (a, c, b, f) => {
    const u = 1 - f;
    return { x: u * u * a.x + 2 * u * f * c.x + f * f * b.x, y: u * u * a.y + 2 * u * f * c.y + f * f * b.y };
  };

  function drawBonsai(t) {
    const baseY = pot.top + 1; // trunk springs from the soil mound
    const w0 = Math.max(5, Math.round(T * 0.17));
    const sway = (f) => Math.round(0.5 + Math.sin(t * 1.15 + f * 1.8) * (0.5 + 1.2 * f) + 0.5 * f);

    // pronounced S-curve: kicks right, sweeps back left, returns right into the crown
    const A0 = { x: cx, y: baseY };
    const A1 = { x: cx + Math.round(T * 0.20) + sway(0.36), y: baseY - Math.round(T * 0.36) };
    const A2 = { x: cx - Math.round(T * 0.04) + sway(0.70), y: baseY - Math.round(T * 0.70) };
    const A3 = { x: cx + Math.round(T * 0.12) + sway(1), y: baseY - Math.round(T * 0.95) };
    const C01 = { x: cx + Math.round(T * 0.16), y: baseY - Math.round(T * 0.16) };
    const C12 = { x: cx + Math.round(T * 0.30), y: baseY - Math.round(T * 0.54) };
    const C23 = { x: cx - Math.round(T * 0.17), y: baseY - Math.round(T * 0.85) };

    // root flare into the soil
    for (const dir of [-1, 1]) {
      PK.limb(A0.x, baseY - 1, A0.x + dir * Math.round(T * 0.05), baseY + 1, A0.x + dir * Math.round(T * 0.09), baseY + 2, Math.max(2, w0 * 0.5), 1, R.bark, 11 + dir);
    }
    // three tapered trunk segments with knobbly nodes at the joins
    PK.limb(A0.x, A0.y, C01.x, C01.y, A1.x, A1.y, w0, Math.round(w0 * 0.72), R.bark, 21);
    node(A1, Math.round(w0 * 0.72 * 0.8));
    PK.limb(A1.x, A1.y, C12.x, C12.y, A2.x, A2.y, Math.round(w0 * 0.72), Math.round(w0 * 0.45), R.bark, 22);
    node(A2, Math.round(w0 * 0.45 * 0.8) + 1);
    PK.limb(A2.x, A2.y, C23.x, C23.y, A3.x, A3.y, Math.round(w0 * 0.45), 2, R.bark, 23);

    // three branches at alternating sides; each pad sits just above its tip so the branch stays visible
    const wb = Math.max(2, Math.round(w0 * 0.45));
    const b1 = q(A0, C01, A1, 0.55);
    const t1 = { x: b1.x - Math.round(T * 0.26) + sway(0.45), y: b1.y - Math.round(T * 0.01) };
    PK.limb(b1.x, b1.y, b1.x - Math.round(T * 0.12), b1.y - 1, t1.x, t1.y, wb, 1, R.bark, 31);
    node(b1, wb);

    const b2 = q(A1, C12, A2, 0.5);
    const t2 = { x: b2.x + Math.round(T * 0.28) + sway(0.75), y: b2.y - Math.round(T * 0.01) };
    PK.limb(b2.x, b2.y, b2.x + Math.round(T * 0.13), b2.y - 1, t2.x, t2.y, wb, 1, R.bark, 32);
    node(b2, wb);

    const b3 = q(A2, C23, A3, 0.5);
    const t3 = { x: b3.x - Math.round(T * 0.18) + sway(0.88), y: b3.y - Math.round(T * 0.02) };
    PK.limb(b3.x, b3.y, b3.x - Math.round(T * 0.07), b3.y - 1, t3.x, t3.y, Math.max(2, wb - 1), 1, R.bark, 33);
    node(b3, Math.max(2, wb - 1));

    const pads = [
      bonsaiPad(Math.round(t1.x), Math.round(t1.y) - 2, Math.round(T * 0.19), 51),
      bonsaiPad(Math.round(t2.x), Math.round(t2.y) - 2, Math.round(T * 0.17), 52),
      bonsaiPad(Math.round(t3.x), Math.round(t3.y) - 2, Math.round(T * 0.12), 53),
      bonsaiPad(Math.round(A3.x), Math.round(A3.y) + 2, Math.round(T * 0.20), 54),
    ];
    pads.sort((a, b) => b.baseY - a.baseY); // lower pads first so upper clumps overlap them
    for (const p of pads) blossoms(p);
  }

  // a knobbly branch node: a slightly wider lit disc where limbs join the trunk
  function node(pt, r) {
    PK.disc(pt.x, pt.y, r, R.bark[1]);
    PK.disc(pt.x - 1, pt.y - 1, Math.max(1, r - 1), R.bark[2]);
    if (r >= 3) PK.px(pt.x - 2, pt.y - 2, R.bark[3]);
  }

  // ---- frame loop ---------------------------------------------------------------------------------

  PK.fit(canvas, 140, (v) => {
    W = v.W; H = v.H; S = Math.min(W, H);
    cx = Math.round(W / 2);
    const portrait = H > W;
    groundY = Math.round(H * (portrait ? 0.66 : 0.72));
    // trunk height: scale with the view, clamped by the narrow side so the crown always fits
    T = Math.max(40, Math.round(Math.min(H * (portrait ? 0.42 : 0.46), W * 0.66)));
    potW = Math.round(Math.max(22, Math.min(42, T * 0.52)));
    buildBg();
    streaks.setArea([0, 2, W, Math.max(8, groundY - Math.round(T * 0.3))]);
    canopyWind.setArea([0, groundY - T, W, groundY]);
    grassWind.setArea([0, groundY + 2, W, H - 1]);
    leaves.setArea([0, 0, W, H]);
  });

  PK.loop((t, dt) => {
    PK.blit(bg);
    drawBonsai(t);

    // wind streaks high in the sky, around the canopy, and skimming the grass
    streaks.step(dt);
    canopyWind.step(dt);
    grassWind.step(dt);
    leaves.step(dt);
    streaks.streaks(["#a792b8", "#e3d3ec"]);
    canopyWind.streaks(["#8d7f9e", "#dcc8e8"]);
    grassWind.streaks(["#3f6a4a", "#77a878"]);

    // fluttering leaves: sine wobble, 1-3 px sprites in 2 shades, some pink petals
    for (const p of leaves.particles) {
      const wob = Math.round(Math.sin(t * 2.6 + p.k * 50) * 1.6);
      const x = Math.round(p.x) + wob;
      const y = Math.round(p.y);
      const petal = p.k < 0.15;
      const c = petal ? blossom[1] : leafCols[Math.min(2, Math.floor((p.k - 0.15) / 0.284))];
      PK.px(x, y, c);
      if (p.len > 1) PK.px(x - 1, y, petal ? blossom[0] : leafCols[0]);
      if (p.len > 2) PK.px(x - 2, y + 1, petal ? blossom[0] : leafCols[0]);
    }
  });
})();
