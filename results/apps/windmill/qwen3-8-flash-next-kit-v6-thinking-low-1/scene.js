/* Dutch windmill in a tulip field at sunset — animated pixel art.
   Static scenery is baked into one offscreen layer; sails, tulips, clouds,
   birds and water shimmer are redrawn every frame from a single rAF loop. */
(function () {
  "use strict";

  const canvas = document.getElementById("c");

  // ---- palettes (5 shades dark -> light unless noted) ----------------------------------------
  const SKY = ["#221b52", "#4a2a64", "#8a3f6f", "#cf5b48", "#f08a3a", "#ffcf6b", "#ffe9b0"];
  const FAR = "#3a2750"; // far treeline / distant polder silhouette
  const GRASS = ["#14260f", "#23431b", "#356227", "#4d8034", "#74a648"];
  const GRASS_FRONT = ["#101f0c", "#1d3716", "#2d5322", "#3f6f2c"];
  const MILLWOOD = ["#221410", "#3c271e", "#5c3d2c", "#855a3e", "#b98256"];
  const CAP = ["#2a1012", "#4a1d19", "#6e2d20", "#9a4630", "#c66a44"];
  const LEAF = ["#142a14", "#234a22", "#3a6e2c", "#5a9440"];
  const BRICK = ["#3a1218", "#6e1e22", "#a8322c", "#d65a40", "#f09070"];
  const PLINTH = ["#1d1b28", "#34323f", "#4e4c5e", "#6f6d80", "#9a98ac"];
  const WATER = ["#161a3a", "#262a5e", "#3a3f86", "#5660a8", "#86a0cc"];
  const WATER_WARM = ["#7a3f2a", "#c4622c", "#f2a33a", "#ffd56a"];
  const CLOUD = { dark: "#4a2f5e", mid: "#a85a78", lit: "#ffc07a" };
  const BIRD = "#1a1430";
  const TULIPS = [
    ["#5a1020", "#b22234", "#e8524f"],
    ["#8a5a0a", "#e0a80a", "#ffe066"],
    ["#5a1848", "#c04a86", "#ff9ac0"],
    ["#5a3a52", "#c08ab0", "#ffeaf2"],
  ];

  // ---- color helpers ---------------------------------------------------------------------------
  function hex2rgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function mix(a, b, t) {
    const A = hex2rgb(a), B = hex2rgb(b);
    const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
    return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function pick(rnd, arr) {
    return arr[Math.floor(rnd() * arr.length)];
  }

  // ---- persistent (resize-stable) animated actors, normalized 0..1 -----------------------------
  function seeded(n) {
    let s = n;
    return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  }
  const cloudRnd = seeded(4);
  const clouds = Array.from({ length: 5 }, () => {
    const nP = 3 + Math.floor(cloudRnd() * 3);
    const puffs = [];
    const w = 16 + Math.round(cloudRnd() * 16);
    for (let i = 0; i < nP; i++)
      puffs.push({
        dx: Math.round((i / (nP - 1) - 0.5) * w),
        dy: Math.round((cloudRnd() * 2 - 1) * 2),
        r: 3 + Math.round(cloudRnd() * 3),
      });
    return {
      u: cloudRnd(),
      v: 0.12 + cloudRnd() * 0.5,
      speed: 0.004 + cloudRnd() * 0.01,
      puffs,
    };
  });
  const birdRnd = seeded(9);
  const birds = Array.from({ length: 5 }, () => ({
    u: birdRnd(),
    v: 0.08 + birdRnd() * 0.34,
    speed: 0.03 + birdRnd() * 0.03,
    phase: birdRnd() * 6.28,
    flap: 6 + birdRnd() * 5,
  }));

  // ---- layout (rebuilt each resize) --------------------------------------------------------------
  let W = 0, H = 0, S = 0, L = null, bg = null, tulips = [];

  function halfAt(y) {
    const t = clamp((y - L.capTopY) / (L.baseY - L.capTopY), 0, 1);
    return lerp(L.topHalf, L.baseHalf, t);
  }
  function canalAt(y) {
    const t = clamp((y - L.horizonY) / (H - L.horizonY), 0, 1);
    return { c: lerp(L.canalTopC, L.canalBotC, t), h: lerp(L.canalTopHalf, L.canalBotHalf, t) };
  }
  function pathAt(y) {
    const t = clamp((y - L.horizonY) / (H - L.horizonY), 0, 1);
    return { c: lerp(L.pathTopC, L.pathBotC, t), h: lerp(L.pathTopHalf, L.pathBotHalf, t) };
  }
  function inTrapezoid(x, y, f) {
    if (y < L.horizonY + 2 || y > H) return false;
    const t = f(y);
    return Math.abs(x - t.c) <= t.h + 1;
  }

  function buildTulips() {
    tulips = [];
    const rows = Math.max(8, Math.round((H - L.horizonY) / (S * 0.05)));
    for (let f = 0; f < L.furrows.length; f++) {
      const bottomX = L.furrows[f];
      const col = TULIPS[Math.floor(f / 2) % TULIPS.length]; // one color per row = classic tulip beds
      for (let k = 1; k <= rows; k++) {
        const t = k / rows;
        if (t < 0.14) continue;
        const y = Math.round(L.horizonY + (H - L.horizonY) * Math.pow(t, 1.5));
        const x = Math.round(lerp(L.vpx, bottomX, t));
        if (y < L.horizonY + 3) continue;
        if (y >= L.capTopY - 2 && y <= L.baseY + 2 && Math.abs(x - L.cx) <= halfAt(y) + 2) continue;
        if (inTrapezoid(x, y, canalAt) || inTrapezoid(x, y, pathAt)) continue;
        const size = Math.max(1, Math.round(lerp(0.9, 5, t)));
        tulips.push({ x, y, size, col, phase: k * 0.7 + f * 1.3, stem: 2 + size });
      }
    }
  }

  // ---- static scenery --------------------------------------------------------------------------
  function drawField() {
    for (let y = L.horizonY; y < H; y++) {
      const t = (y - L.horizonY) / (H - L.horizonY);
      const ramp = y > L.baseY ? GRASS_FRONT : GRASS;
      const idx = clamp(Math.floor(t * 3.4), 0, ramp.length - 2);
      // far rows blend toward the warm sky for depth, near rows stay rich
      let c = ramp[idx];
      if (y <= L.baseY) c = mix(c, "#f0913a", clamp(0.5 - t * 0.6, 0, 0.4));
      PK.rect(0, y, W, 1, c);
    }
    // furrow lines converging on the vanishing point => crisp rows running to the horizon
    for (const bx of L.furrows) {
      for (let y = L.horizonY + 2; y < H; y += 1) {
        const t = (y - L.horizonY) / (H - L.horizonY);
        const x = Math.round(lerp(L.vpx, bx, t));
        const dark = y > L.baseY ? GRASS_FRONT[0] : GRASS[0];
        PK.px(x, y, mix(dark, "#f0913a", clamp(0.3 - t * 0.45, 0, 0.25)));
      }
    }
  }

  function drawCanal() {
    const rnd = seeded(7);
    for (let y = L.horizonY + 2; y < H; y++) {
      const { c, h } = canalAt(y);
      const t = (y - L.horizonY) / (H - L.horizonY);
      const b = clamp(Math.floor((1 - t) * 4), 0, WATER.length - 1);
      PK.rect(Math.round(c - h), y, Math.max(1, Math.round(h * 2)), 1, WATER[b]);
      // far water carries the warm sky; a sunlit band runs down the near side
      PK.rect(Math.round(c - h), y, Math.max(1, Math.round(h * 2)), 1, mix(WATER[b], "#cf5b48", clamp(0.45 - t * 0.5, 0, 0.4)));
      if (rnd() < 0.08 && h > 2) PK.px(Math.round(c - h) + Math.floor(rnd() * h * 2), y, WATER[4]);
    }
    // grassy banks
    const rnd2 = seeded(12);
    for (let y = L.horizonY + 2; y < H; y++) {
      const { c, h } = canalAt(y);
      const l = Math.round(c - h - 1), r = Math.round(c + h + 1);
      PK.px(l, y, GRASS[1]); PK.px(r, y, GRASS[1]);
      if (rnd2() < 0.2) PK.px(l - 1, y, GRASS[2]);
      if (rnd2() < 0.2) PK.px(r + 1, y, GRASS[2]);
    }
  }

  function drawPath() {
    const rnd = seeded(19);
    for (let y = L.horizonY + 2; y < H; y++) {
      const { c, h } = pathAt(y);
      const t = (y - L.horizonY) / (H - L.horizonY);
      const col = mix(GRASS[1], "#caa15a", 0.55);
      PK.rect(Math.round(c - h), y, Math.max(1, Math.round(h * 2)), 1, mix(col, "#f0913a", clamp(0.4 - t * 0.5, 0, 0.35)));
      if (rnd() < 0.12) PK.px(Math.round(c - h) + Math.floor(rnd() * h * 2), y, "#7a5a34");
    }
  }

  function drawFarBank() {
    const rnd = seeded(31);
    PK.rect(0, L.horizonY - 1, W, 3, mix(FAR, "#cf5b48", 0.25));
    for (let x = 0; x < W; x++) {
      if (rnd() < 0.4) {
        const h = 1 + Math.floor(rnd() * 3);
        PK.rect(x, L.horizonY - 1 - h, 1, h, mix(FAR, "#1d1530", 0.4));
      }
    }
  }

  function drawDistantMill(mx, baseY, s) {
    const c = mix(FAR, "#3a2750", 0.5);
    PK.rect(mx - s, baseY - 2 * s, Math.max(1, s), 2 * s, c); // body
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.6;
      PK.line(mx, baseY - 2 * s, mx + Math.cos(a) * s * 1.6, baseY - 2 * s + Math.sin(a) * s * 1.6, c);
    }
  }

  function drawMillBody() {
    const rnd = seeded(66);
    const cx = L.cx;
    for (let y = L.capTopY; y <= L.baseY; y++) {
      const hw = Math.round(halfAt(y));
      const x0 = cx - hw;
      const w = hw * 2 + 1;
      const t = (y - L.capTopY) / (L.baseY - L.capTopY);
      for (let i = 0; i < w; i++) {
        const u = i / w;
        let c;
        if (u < 0.16) c = BRICK[3];
        else if (u < 0.5) c = BRICK[2];
        else if (u < 0.82) c = BRICK[1];
        else c = BRICK[0];
        // lit sun-facing left edge
        if (u < 0.08) c = mix(BRICK[3], "#f09070", 0.5);
        // darken slightly toward the base, cool the shadow side
        if (u > 0.6) c = mix(c, "#221b52", 0.15 * t);
        if (rnd() < 0.06) c = BRICK[Math.max(0, (BRICK.indexOf(c) || 1) - 1)];
        if (rnd() < 0.03) c = BRICK[0];
        PK.px(x0 + i, y, c);
      }
      // horizontal mortar courses
      if ((y - L.capTopY) % 4 === 0) {
        for (let i = 0; i < w; i++) if (rnd() < 0.7) PK.px(x0 + i, y, mix(BRICK[1], "#1a0d10", 0.3));
      }
    }
    // stone plinth at the foot
    const ph = Math.max(3, Math.round(S * 0.03));
    for (let y = L.baseY - ph; y <= L.baseY; y++) {
      const hw = Math.round(halfAt(y)) + 1;
      for (let i = -hw; i <= hw; i++) {
        const u = (i + hw) / (hw * 2);
        let c = u < 0.3 ? PLINTH[3] : u < 0.7 ? PLINTH[2] : PLINTH[1];
        if (rnd() < 0.1) c = PLINTH[1];
        PK.px(cx + i, y, c);
      }
    }
    // grass tufts + soil hugging the foundation so the mill is grounded, not floating
    PK.rect(cx - L.baseHalf - 3, L.baseY + 1, (L.baseHalf + 3) * 2 + 1, 2, mix(GRASS_FRONT[0], "#000000", 0.25));
    const tr = seeded(48);
    for (let i = -L.baseHalf - 3; i <= L.baseHalf + 3; i++) {
      if (tr() > 0.55) continue;
      const bx = cx + i;
      const h = 1 + Math.floor(tr() * 3);
      const g = tr() < 0.5 ? LEAF[1] : LEAF[2];
      for (let k = 0; k < h; k++) PK.px(bx, L.baseY + 1 - k, k === h - 1 ? LEAF[3] : g);
    }
    PK.line(cx - L.baseHalf - 1, L.baseY + 1, cx + L.baseHalf + 1, L.baseY + 1, GRASS[0]);
  }

  function drawGallery() {
    const gy = L.galleryY;
    const hw = Math.round(halfAt(gy)) + Math.round(S * 0.05);
    PK.rect(L.cx - hw, gy, hw * 2 + 1, 2, MILLWOOD[1]);
    PK.rect(L.cx - hw, gy, hw * 2 + 1, 1, MILLWOOD[3]);
    for (let i = -hw; i <= hw; i += 3) {
      PK.px(L.cx + i, gy - 2, MILLWOOD[2]);
      PK.px(L.cx + i, gy - 1, MILLWOOD[2]);
    }
    PK.rect(L.cx - hw, gy + 2, hw * 2 + 1, 1, MILLWOOD[0]);
  }

  function drawCap() {
    const cx = L.cx;
    const capH = Math.max(4, L.hubY - L.capTopY + 1);
    for (let j = 0; j < capH; j++) {
      const yy = L.capTopY + j;
      const f = j / (capH - 1);
      const hw = Math.round(lerp(L.topHalf * 0.55, L.topHalf * 1.3, Math.pow(f, 0.8)));
      for (let i = -hw; i <= hw; i++) {
        const u = (i + hw) / (hw * 2);
        let c = u < 0.32 ? CAP[3] : u < 0.7 ? CAP[2] : CAP[1];
        if (u < 0.12) c = mix(CAP[3], "#ffd56a", 0.55);
        if (u > 0.9) c = CAP[0];
        PK.px(cx + i, yy, c);
      }
      if (j === 0) PK.px(cx - Math.round(L.topHalf * 0.55) + 1, yy, mix(CAP[3], "#ffd56a", 0.4));
    }
    // overhanging brim at the cap foot separates the roof from the brickwork
    const brim = Math.round(L.topHalf * 1.3);
    PK.rect(cx - brim, L.hubY, brim * 2 + 1, 1, CAP[0]);
    PK.rect(cx - brim, L.hubY - 1, brim * 2 + 1, 1, CAP[2]);
    // windshaft stub poking from the cap front, where the sails root
    PK.disc(cx, L.hubY, Math.max(2, Math.round(S * 0.022)), MILLWOOD[1]);
  }

  function drawDoor() {
    const cx = L.cx;
    const dw = Math.max(5, Math.round(S * 0.085) | 1);
    const dh = Math.max(8, Math.round(S * 0.15));
    const bx = cx - (dw >> 1);
    const byBottom = L.baseY - 2;
    for (let r = 0; r < dh; r++) {
      const yy = byBottom - r;
      // arched top: narrow the last few rows
      let inset = 0;
      if (r > dh - Math.ceil(dw / 2)) inset = Math.ceil((r - (dh - Math.ceil(dw / 2))) / 1.6);
      for (let i = inset; i < dw - inset; i++) {
        const edge = i === inset || i === dw - inset - 1;
        let c = edge ? MILLWOOD[0] : (i % 2 === 0 ? MILLWOOD[2] : MILLWOOD[3]);
        PK.px(bx + i, yy, c);
      }
    }
    // frame + hinge side and a small knob
    PK.rect(bx - 1, byBottom - dh + Math.ceil(dw / 2) - 1, 1, dh, MILLWOOD[1]);
    PK.rect(bx + dw, byBottom - dh + Math.ceil(dw / 2) - 1, 1, dh, MILLWOOD[0]);
    PK.px(bx + dw - 2, byBottom - Math.round(dh * 0.45), MILLWOOD[4]);
    PK.rect(bx - 1, byBottom + 1, dw + 2, 1, PLINTH[3]);
  }

  function drawWindow() {
    const cx = L.cx;
    const wy = L.windowY;
    const ww = 3, wh = 4;
    PK.rect(cx - ww - 1, wy - 1, ww * 2 + 2, wh + 2, MILLWOOD[0]); // recess frame
    PK.rect(cx - ww, wy, ww * 2, wh, "#ffe1a0");                    // warm lit glass
    PK.rect(cx - ww, wy, ww, wh, "#ffc86a");
    PK.px(cx - 1, wy - 1, "#ffd56a");
    // muntin cross
    PK.px(cx, wy + 1, MILLWOOD[0]); PK.px(cx, wy + 2, MILLWOOD[0]);
    PK.px(cx - 1, wy + 2, MILLWOOD[1]);
  }

  function drawSun() {
    const r = Math.round(S * 0.07);
    PK.glow(L.sunX, L.sunY, Math.round(S * 0.22), "#ff9a3a", 0.55);
    PK.glow(L.sunX, L.sunY, Math.round(S * 0.13), "#ffd56a", 0.6);
    PK.disc(L.sunX, L.sunY, r, "#ffd27a");
    PK.disc(L.sunX, L.sunY, Math.round(r * 0.72), "#ffe9b0");
    PK.disc(L.sunX - 1, L.sunY - 1, Math.round(r * 0.4), "#fff6d8");
  }

  function drawStars() {
    const rnd = seeded(77);
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(rnd() * W);
      const y = Math.floor(rnd() * L.horizonY * 0.32);
      PK.px(x, y, "#c9c7ee");
    }
  }

  // crisp horizontal bands (no dither) so the sky reads as hard-edged pixel art
  function skyColor(t) {
    const x = clamp(t, 0, 1) * (SKY.length - 1);
    const i = Math.min(SKY.length - 2, Math.floor(x));
    return mix(SKY[i], SKY[i + 1], x - i);
  }
  function drawSky() {
    const N = 12;
    const bottom = L.horizonY + 2;
    let prev = null;
    for (let y = 0; y <= bottom; y++) {
      const level = clamp(Math.floor((y / bottom) * N), 0, N - 1);
      const c = skyColor(level / (N - 1));
      PK.rect(0, y, W, 1, c);
      prev = c;
    }
  }

  function buildScene(v) {
    W = v.W; H = v.H; S = Math.min(W, H);
    L = {
      cx: Math.round(W * 0.5),
      horizonY: Math.round(H * 0.5),
      baseY: Math.round(H * 0.84),
    };
    L.millH = Math.round(S * 0.55);
    L.capTopY = L.baseY - L.millH;
    L.hubY = L.capTopY + Math.round(S * 0.1);
    L.windowY = L.capTopY + Math.round(L.millH * 0.44);
    L.galleryY = L.baseY - Math.round(S * 0.17);
    L.topHalf = Math.max(6, Math.round(S * 0.085));
    L.baseHalf = Math.max(11, Math.round(S * 0.15));
    L.sailLen = Math.round(S * 0.235);
    L.sunX = Math.round(W * 0.3);
    L.sunY = L.horizonY - Math.round(S * 0.05);
    L.vpx = L.cx;
    L.canalTopC = Math.round(W * 0.44);
    L.canalBotC = Math.round(W * 0.21);
    L.canalTopHalf = Math.max(2, Math.round(S * 0.02));
    L.canalBotHalf = Math.round(S * 0.14);
    L.pathTopC = Math.round(W * 0.5);
    L.pathBotC = Math.round(W * 0.53);
    L.pathTopHalf = Math.max(1, Math.round(S * 0.006));
    L.pathBotHalf = Math.round(S * 0.075);
    const fCount = Math.round(clamp(W / (S * 0.045), 16, 44));
    L.furrows = Array.from({ length: fCount }, (_, i) => Math.round(lerp(-0.12 * W, 1.12 * W, i / (fCount - 1))));

    buildTulips();

    bg = PK.layer(W, H, function () {
      drawSky();
      drawStars();
      drawSun();
      drawFarBank();
      // a couple of tiny far-off windmills on the polder for depth
      drawDistantMill(Math.round(W * 0.78), L.horizonY, Math.max(2, Math.round(S * 0.02)));
      drawDistantMill(Math.round(W * 0.86), L.horizonY, Math.max(2, Math.round(S * 0.016)));
      drawField();
      drawCanal();
      drawPath();
      PK.ellipse(L.cx, L.baseY + 1, Math.round(L.baseHalf * 1.4), 2, mix(GRASS[0], "#000000", 0.2));
      drawMillBody();
      drawGallery();
      drawCap();
      drawDoor();
      drawWindow();
    });
  }

  // ---- per-frame actors ------------------------------------------------------------------------
  function drawClouds(dt) {
    for (const c of clouds) {
      c.u += c.speed * dt;
      if (c.u > 1.2) c.u -= 2.4;
      const wmax = 8 + Math.max(...c.puffs.map((p) => p.dx + p.r));
      const x = Math.round(c.u * (W + 2 * wmax)) - wmax;
      const y = Math.round(L.horizonY * c.v);
      for (const p of c.puffs) {
        PK.disc(x + p.dx, y + p.dy, p.r, CLOUD.dark);
        PK.disc(x + p.dx - 1, y + p.dy - 1, p.r - 1, CLOUD.mid);
        PK.disc(x + p.dx - 2, y + p.dy - 2, Math.max(1, p.r - 3), CLOUD.lit);
      }
    }
  }

  function drawBirds(t, dt) {
    for (const b of birds) {
      b.u += b.speed * dt;
      if (b.u > 1.08) b.u -= 1.16;
      const x = Math.round(b.u * W);
      const y = Math.round(L.horizonY * b.v + Math.sin(t * 0.8 + b.phase) * 1.5);
      const up = Math.round(Math.sin(t * b.flap + b.phase));
      const draw = (xx, yy, u) => {
        PK.line(xx - 2, yy + u, xx - 1, yy, BIRD);
        PK.line(xx - 1, yy, xx, yy, BIRD);
        PK.line(xx, yy, xx + 1, yy, BIRD);
        PK.line(xx + 1, yy, xx + 2, yy + u, BIRD);
      };
      if (x > -3 && x < W + 3) draw(x, y, up);
    }
  }

  function drawWaterShimmer(t) {
    const rnd = seeded(3);
    for (let k = 0; k < 22; k++) {
      const fy = rnd();
      const y = Math.round(L.horizonY + 3 + fy * (H - L.horizonY - 3));
      const { c, h } = canalAt(y);
      if (h < 2) continue;
      const phase = rnd() * 6.28;
      const sx = c - h + ((Math.sin(t * 1.5 + phase) * 0.5 + 0.5) * (h * 2));
      const warm = fy > 0.35; // warm glints concentrate in the sun-lit upper reach
      PK.px(Math.round(sx), y, warm ? WATER_WARM[3] : WATER[4]);
      if (rnd() < 0.5) PK.px(Math.round(sx) + 1, y, warm ? WATER_WARM[2] : WATER[3]);
    }
  }

  function tulipHead(hx, hy, s, col) {
    if (s <= 1) {
      PK.px(hx, hy, col[1]);
      return;
    }
    const x0 = hx - (s >> 1);
    PK.rect(x0, hy + 1, s, s - 1, col[2]);                 // cup body
    PK.rect(x0, hy + 1, Math.max(1, s >> 1), s - 1, col[1]); // lit left side
    PK.px(x0, hy, col[2]);                                   // left petal tip
    PK.px(x0 + s - 1, hy, col[2]);                           // right petal tip
    if (s >= 3) {
      PK.px(x0 + 1, hy, col[1]);
      PK.px(x0 + s - 2, hy, col[2]);
    }
    PK.px(hx, hy + 1, col[0]);                               // dark notch between the two petals
    if (s >= 4) PK.px(hx - 1, hy + 1, col[0]);
  }

  function drawTulips(t) {
    for (const f of tulips) {
      const heightFactor = f.size / 5;
      const sway = Math.round(Math.sin(t * 1.7 + f.phase + f.y * 0.05) * 1.5 * heightFactor);
      const hx = f.x + sway;
      const hy = f.y - f.stem;
      // stem + a leaf on each side
      PK.line(f.x, f.y, hx, hy + f.size, LEAF[1]);
      PK.px(f.x - 1, f.y - 1, LEAF[2]);
      PK.px(f.x + 1, f.y - 2, LEAF[2]);
      if (f.size >= 3) {
        PK.px(f.x - 1, f.y - 3, LEAF[3]);
        PK.px(f.x + 1, f.y - 4, LEAF[3]);
      }
      tulipHead(hx, hy, f.size, f.col);
    }
  }

  // ---- loop ------------------------------------------------------------------------------------
  PK.loop(function (t, dt) {
    if (!bg) return;
    PK.blit(bg);
    drawClouds(dt);
    drawWaterShimmer(t);
    // sails over the cap and tower, sweeping in front
    const base = t * 0.55;
    for (let k = 0; k < 4; k++) drawSail(base + k * (Math.PI / 2) + Math.PI / 4);
    // hub cap on top of the sail roots
    PK.disc(L.cx, L.hubY, Math.max(2, Math.round(S * 0.022)), MILLWOOD[2]);
    PK.disc(L.cx - 1, L.hubY - 1, Math.max(1, Math.round(S * 0.011)), MILLWOOD[4]);
    drawTulips(t);
    drawBirds(t, dt);
  });

  function drawSail(a) {
    const hubX = L.cx, hubY = L.hubY, len = L.sailLen;
    const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
    // central stock (spar): dark lower edge, lit spine
    for (let i = 0; i <= len; i++) {
      const X = hubX + dx * i, Y = hubY + dy * i;
      PK.px(X - px, Y - py, MILLWOOD[0]);
      PK.px(X, Y, MILLWOOD[3]);
      PK.px(X + px, Y + py, MILLWOOD[2]);
    }
    // lattice panel on the leading side of the stock (open, sky shows through)
    const s0 = Math.round(len * 0.2), s1 = len;
    const sw = Math.max(4, Math.round(len * 0.32));
    const skew = Math.round(sw * 0.32);
    const ix0 = hubX + dx * s0, iy0 = hubY + dy * s0;
    const ix1 = hubX + dx * s1, iy1 = hubY + dy * s1;
    // thin frame so the panel reads as a structure, not a plank
    PK.line(ix0 + px, iy0 + py, ix1 + px, iy1 + py, MILLWOOD[2]);
    PK.line(ix0 + px * sw + dx * skew, iy0 + py * sw + dy * skew, ix1 + px * sw + dx * skew, iy1 + py * sw + dy * skew, MILLWOOD[1]);
    PK.line(ix0 + px, iy0 + py, ix0 + px * sw + dx * skew, iy0 + py * sw + dy * skew, MILLWOOD[2]);
    PK.line(ix1 + px, iy1 + py, ix1 + px * sw + dx * skew, iy1 + py * sw + dy * skew, MILLWOOD[2]);
    // widely spaced thin slats (the open lattice) with clear gaps between them
    for (let s = s0; s <= s1; s += 3) {
      PK.line(hubX + dx * s + px, hubY + dy * s + py, hubX + dx * s + px * sw + dx * skew, hubY + dy * s + py * sw + dy * skew, MILLWOOD[4]);
    }
  }

  // ---- boot ------------------------------------------------------------------------------------
  PK.fit(canvas, 150, buildScene);
})();
