/* Lighthouse at night - pixel-art scene drawn with pixel-kit (window.PK).
   Layout is derived from the logical canvas (view.W / view.H) so it composes
   correctly both landscape (desktop) and portrait (phone). */
(function () {
  "use strict";

  const cv = document.getElementById("scene");

  /* ---- night palette: 5 shades dark -> light, shadows cool, highlights warm ---------- */
  const C = {
    sky: ["#05060f", "#080c1e", "#0d1330", "#141c42", "#202b5a"],
    sea: ["#060b1c", "#0c1636", "#132a52", "#21466f", "#5788b4"],
    foam: ["#4d6f96", "#9fc4e0", "#e6f2fb"],
    cliff: ["#12141f", "#22243a", "#333652", "#4a5070", "#6b7599"],
    far: ["#0a0f22", "#141b34", "#1d2745", "#28345a", "#3a4a78"],
    fore: ["#05060c", "#0b0d16", "#121623", "#1c2234", "#2c3654"],
    towerWhite: ["#232839", "#3c445c", "#68728f", "#98a4bd", "#cfd9ea"],
    towerRed: ["#240d12", "#4a161a", "#7e2522", "#b34a30", "#e0875a"],
    metal: ["#0a0c15", "#151929", "#232a40", "#39445f", "#5c6a90"],
    house: ["#12141f", "#1e2231", "#2e3549", "#4a5474", "#7a86ab"],
    roof: ["#0a0b12", "#12151f", "#1b2030", "#28304a", "#3d4a72"],
    lamp: ["#6a3418", "#b4571f", "#ee9b2f", "#ffd873", "#fff4cd"],
    win: ["#6a4018", "#a8681f", "#d99a3a", "#f6c76a", "#ffe9b0"],
    cloud: { a: "#0d1122", b: "#171d36", c: "#29345a", d: "#3f4f80" },
    rain: ["#2a3a68", "#8fa8d6"],
    star: ["#5f6aa4", "#dbe6ff"],
    moon: ["#4d5878", "#7d8bb4", "#c3cfe8", "#f0f5fd"],
    glint: ["#1b3055", "#2d4f80", "#4f7fb0", "#8fb8d8"],
  };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---- layout ------------------------------------------------------------------ */
  let L = null;

  function layout(v) {
    const W = v.W, H = v.H;
    const o = {};
    o.W = W;
    o.H = H;
    o.horizon = Math.round(H * 0.545);

    o.mr = clamp(Math.round(H * 0.045), 4, 18);
    o.mx = clamp(Math.round(W * 0.19), o.mr + 2, W - o.mr - 2);
    o.my = clamp(Math.round(H * 0.13), o.mr + 2, o.horizon - o.mr - 4);

    o.cliffW = clamp(Math.round(W * 0.66), Math.round(H * 0.42), Math.round(H * 0.85));
    o.cliffX = Math.round(W / 2 - o.cliffW / 2);
    o.cliffBaseY = Math.round(H * 0.80);
    o.cliffH = Math.round(H * 0.30);
    o.plateauY = o.cliffBaseY - o.cliffH;

    // keeper's house on a flat rock shelf at the left foot of the cliff
    o.shelfW = clamp(Math.round(o.cliffW * 0.36), 14, Math.round(W * 0.4));
    o.shelfX = o.cliffX + Math.round(o.cliffW * 0.02);
    o.shelfBaseY = o.cliffBaseY + Math.round(H * 0.03);
    o.shelfH = o.shelfBaseY - (o.plateauY + Math.round(H * 0.075));
    o.houseW = clamp(Math.min(Math.round(o.shelfW * 0.62), Math.round(H * 0.115)), 11, 30);
    o.houseH = Math.round(o.houseW * 0.78);
    o.houseX = o.shelfX + Math.round(o.shelfW / 2);
    o.houseBaseY = o.shelfBaseY - o.shelfH + 1;

    // tower
    const t = {};
    t.cx = Math.round(W / 2);
    t.h = Math.round(H * 0.30);
    t.baseY = o.plateauY + Math.max(2, Math.round(H * 0.014));
    t.topY = t.baseY - t.h;
    t.bw = clamp(Math.round(H * 0.062), 7, 30);
    t.tw = clamp(t.bw - Math.round(t.bw * 0.4), 4, t.bw - 2);
    t.lanternW = clamp(t.tw - 2, 4, t.tw);
    t.lanternH = clamp(Math.round(t.h * 0.20), 6, 22);
    t.glassB = t.topY - 3;
    t.glassT = t.glassB - t.lanternH + 1;
    t.beamY = Math.round((t.glassT + t.glassB) / 2);
    t.roofH = clamp(Math.round(t.lanternH * 0.6), 3, 14);
    o.tower = t;

    // foreground rocks in the open water
    o.foreRocks = [
      { x: Math.round(W * 0.03), w: clamp(Math.round(W * 0.17), 8, 46), h: Math.round(H * 0.075), baseY: Math.round(H * 0.95), seed: 31 },
      { x: Math.round(W * 0.79), w: clamp(Math.round(W * 0.19), 8, 50), h: Math.round(H * 0.055), baseY: Math.round(H * 0.895), seed: 77 },
      { x: Math.round(W * 0.62), w: clamp(Math.round(W * 0.09), 6, 24), h: Math.round(H * 0.035), baseY: Math.round(H * 0.845), seed: 91 },
    ];
    // distant skerry on the horizon (low contrast = far away)
    o.skerry = { x: Math.round(W * 0.70), w: clamp(Math.round(W * 0.2), 10, 60), h: Math.round(H * 0.035) };
    o.beamLen = Math.min(W * 0.95, 300);
    return o;
  }

  /* ---- clouds: flat-bottomed height-field sprites, moonlit rim ------------------ */
  function cloudRows(w, h, seed) {
    const rnd = PK.rng(seed);
    const nH = 2 + Math.floor(rnd() * 3);
    const hump = [], cent = [], wid = [];
    for (let k = 0; k < nH; k++) {
      hump.push(0.45 + rnd() * 0.55);
      cent.push(((k + 0.5) / nH + (rnd() - 0.5) * 0.4) * w);
      wid.push(w * (0.09 + rnd() * 0.13));
    }
    const tops = new Array(w);
    for (let i = 0; i < w; i++) {
      let v = 0;
      for (let k = 0; k < nH; k++) {
        const d = (i - cent[k]) / wid[k];
        v = Math.max(v, hump[k] * Math.exp(-d * d));
      }
      tops[i] = clamp(Math.round(v * (h - 1)), 1, h - 1);
    }
    for (let pass = 0; pass < 2; pass++)
      for (let i = 1; i < w - 1; i++) tops[i] = clamp(Math.round((tops[i - 1] + tops[i] * 2 + tops[i + 1]) / 4), 1, h - 1);
    const rows = [];
    for (let y = 0; y < h; y++) {
      let s = "";
      for (let x = 0; x < w; x++) {
        const top = h - tops[x];
        if (y < top) s += ".";
        else if (y === top) s += tops[x] >= (tops[x - 1] || 0) ? "d" : "c";
        else if (y >= h - 1 || tops[x] - (y - top) <= 1) s += "a";
        else s += (x & 1) === (y & 1) ? "c" : "b";
      }
      rows.push(s);
    }
    return rows;
  }

  let clouds = [];
  function buildClouds() {
    const H = L.H, W = L.W;
    const defs = [
      { wf: 0.30, hf: 0.075, yf: 0.075, spd: 1.7, seed: 21 },
      { wf: 0.22, hf: 0.055, yf: 0.185, spd: 2.6, seed: 34 },
      { wf: 0.40, hf: 0.09, yf: 0.03, spd: 1.1, seed: 47 },
      { wf: 0.17, hf: 0.045, yf: 0.27, spd: 3.4, seed: 61 },
    ];
    clouds = defs.map((d, i) => {
      const w = clamp(Math.round(W * d.wf), 12, 90);
      const h = clamp(Math.round(H * d.hf), 5, 20);
      return {
        rows: cloudRows(w, h, d.seed),
        w: w,
        h: h,
        y: clamp(Math.round(H * d.yf), 1, L.horizon - h - 2),
        spd: d.spd,
        x: Math.round((i + 0.2) * W * 0.42 + (i % 2) * W * 0.3),
      };
    });
    // dedicated slow cloud that stays half over the moon
    const mw = clamp(L.mr * 6, 14, 70), mh = clamp(Math.round(L.mr * 1.6), 4, 14);
    clouds.push({
      rows: cloudRows(mw, mh, 88),
      w: mw,
      h: mh,
      y: clamp(L.my - Math.round(mh * 0.45), 1, L.horizon - mh - 2),
      spd: 0,
      x: L.mx - Math.round(mw / 2),
      anchor: true,
    });
  }

  /* ---- static scenery ------------------------------------------------------------ */
  function drawSky() {
    PK.gradient(0, 0, L.W, L.horizon + 1, C.sky);
    // faint high haze band so the top of the sky is not flat
    const rnd = PK.rng(909);
    for (let i = 0; i < Math.round(L.W * 1.6); i++) {
      const x = Math.floor(rnd() * L.W);
      const y = Math.floor(rnd() * L.horizon * 0.55);
      PK.px(x, y, rnd() < 0.5 ? C.sky[1] : C.sky[2]);
    }
  }

  function drawMoon() {
    const { mx, my, mr } = L;
    PK.glow(mx, my, Math.round(mr * 3.2), "#4c5c92", 0.42);
    PK.glow(mx, my, Math.round(mr * 1.8), "#7f8fc0", 0.5);
    PK.disc(mx, my, mr, C.moon[1]);
    PK.disc(mx - Math.round(mr * 0.25), my - Math.round(mr * 0.25), Math.max(1, mr - 1), C.moon[2]);
    PK.disc(mx - Math.round(mr * 0.45), my - Math.round(mr * 0.45), Math.max(1, mr - Math.max(2, Math.round(mr * 0.4))), C.moon[3]);
    // craters (seeded, so they never jitter)
    const rnd = PK.rng(4242);
    for (let i = 0; i < Math.max(3, Math.round(mr * 0.8)); i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * (mr - 1);
      const cx = mx + Math.round(Math.cos(a) * d), cy = my + Math.round(Math.sin(a) * d);
      const r = rnd() < 0.3 ? 1 : 0;
      PK.disc(cx, cy, r, C.moon[1]);
      PK.px(cx - 1, cy - 1, C.moon[2]);
    }
  }

  function mesa(u) {
    // steep sides, flat top: a plateau for the lighthouse to stand on
    if (u < 0.3) return clamp(0.12 + (u / 0.3) * 0.88, 0, 1);
    if (u > 0.68) return clamp(0.12 + ((1 - u) / 0.32) * 0.88, 0, 1);
    return 1;
  }

  function drawCliff() {
    PK.rock(L.cliffX, L.cliffBaseY, L.cliffW, L.cliffH, C.cliff, { profile: mesa, rough: 2, seed: 17 });
    PK.rock(L.shelfX, L.shelfBaseY, L.shelfW, L.shelfH, C.cliff, { profile: mesa, rough: 1, seed: 71 });
    // a few boulders around the foot so it reads as rocky
    const rnd = PK.rng(5);
    for (let i = 0; i < 5; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const bx = L.tower.cx + side * Math.round(L.cliffW * (0.34 + rnd() * 0.22));
      const bw = clamp(Math.round(L.H * (0.04 + rnd() * 0.05)), 4, 18);
      PK.rock(bx - Math.round(bw / 2), L.cliffBaseY + Math.round(L.H * (0.01 + rnd() * 0.03)), bw,
        Math.round(L.H * (0.03 + rnd() * 0.04)), C.cliff, { profile: "mound", rough: 1, seed: 100 + i });
    }
    // distant skerry sitting on the horizon
    PK.rock(L.skerry.x, L.horizon + 1, L.skerry.w, L.skerry.h, C.far, { profile: "mound", rough: 1, seed: 66 });
  }

  /* shaded row helper: lit left edge, body, shaded right edge, dark outline */
  function shadedRow(y, x0, x1, ramp, litEdge) {
    if (x1 < x0) return;
    PK.rect(x0, y, x1 - x0 + 1, 1, ramp[2]);
    if (litEdge) {
      PK.px(x0, y, ramp[3]);
      if (x1 - x0 > 5) PK.px(x0 + 1, y, ramp[3]);
    }
    PK.px(x1, y, ramp[0]);
    if (x1 - x0 > 3) PK.px(x1 - 1, y, ramp[1]);
  }

  function drawTower() {
    const t = L.tower;
    const hbw = Math.floor(t.bw / 2), htw = Math.floor(t.tw / 2);
    const band = Math.max(3, Math.round(t.h / 7));

    // tapered body with horizontal stripes, lit from the top left
    for (let j = 0; j <= t.h; j++) {
      const y = t.topY + j;
      const half = Math.round((t.tw + (t.bw - t.tw) * (j / t.h)) / 2);
      const ramp = Math.floor(j / band) % 2 === 1 ? C.towerRed : C.towerWhite;
      shadedRow(y, t.cx - half, t.cx + half, ramp, true);
      if ((j % band === 1 || j % band === band - 1) && half > 2) {
        // band seam: one row darker on the shadow half
        for (let x = t.cx + 1; x < t.cx + half - 1; x++) PK.px(x, y, ramp[1]);
      }
    }
    // speckle so the paint is not flat
    const rnd = PK.rng(2024);
    for (let i = 0; i < Math.round(t.h * 1.4); i++) {
      const j = 1 + Math.floor(rnd() * (t.h - 1));
      const half = Math.round((t.tw + (t.bw - t.tw) * (j / t.h)) / 2);
      const x = t.cx - half + 1 + Math.floor(rnd() * Math.max(1, half * 2 - 1));
      const ramp = Math.floor(j / band) % 2 === 1 ? C.towerRed : C.towerWhite;
      PK.px(x, t.topY + j, rnd() < 0.55 ? ramp[1] : ramp[3]);
    }

    // plinth
    const pbw = hbw + Math.max(2, Math.round(t.bw * 0.3));
    PK.rect(t.cx - pbw, t.baseY, pbw * 2 + 1, 3, C.metal[2]);
    PK.rect(t.cx - pbw, t.baseY, pbw * 2 + 1, 1, C.metal[3]);
    PK.rect(t.cx - pbw, t.baseY + 2, pbw * 2 + 1, 1, C.metal[0]);
    // door with a sliver of light under it
    const dh = Math.max(4, Math.round(t.h * 0.11));
    PK.rect(t.cx - 1, t.baseY - dh, 3, dh, "#0b0d17");
    PK.px(t.cx - 1, t.baseY - dh, C.metal[3]);
    PK.px(t.cx, t.baseY - dh, C.metal[3]);
    PK.px(t.cx + 1, t.baseY - dh, C.metal[3]);
    PK.rect(t.cx - 1, t.baseY - 1, 3, 1, C.win[2]);
    // two dim windows on the lit half: one halfway up, one below the gallery
    for (const wf of [0.42, 0.68]) {
      const wy = t.topY + Math.round(t.h * wf);
      const half = Math.round((t.tw + (t.bw - t.tw) * wf) / 2);
      const wx = t.cx - Math.max(1, half - 2);
      PK.rect(wx, wy, 2, 3, C.win[1]);
      PK.px(wx, wy, C.win[2]);
      PK.rect(wx, wy + 3, 2, 1, C.metal[0]);
    }

    // gallery: slab that overhangs, then railing
    const hgw = htw + Math.max(2, Math.round(t.bw * 0.25));
    PK.rect(t.cx - hgw, t.topY - 2, hgw * 2 + 1, 1, C.metal[3]);
    PK.rect(t.cx - hgw, t.topY - 1, hgw * 2 + 1, 1, C.metal[2]);
    PK.rect(t.cx - hgw, t.topY, hgw * 2 + 1, 1, C.metal[0]);
    const railY = t.topY - 6;
    for (let x = t.cx - hgw; x <= t.cx + hgw; x++) PK.px(x, railY, C.metal[3]);
    for (let x = t.cx - hgw; x <= t.cx + hgw; x += 2)
      for (let y = railY + 1; y <= t.topY - 3; y++) PK.px(x, y, C.metal[2]);

    // lantern room: warm glass, glazing bars, frame
    const hlw = Math.floor(t.lanternW / 2);
    for (let y = t.glassT; y <= t.glassB; y++) {
      PK.rect(t.cx - hlw, y, t.lanternW, 1, C.lamp[1]);
      PK.rect(t.cx - hlw + 1, y, Math.max(1, t.lanternW - 2), 1, C.lamp[2]);
      if (t.lanternW >= 6) PK.rect(t.cx - hlw + 2, y, Math.max(1, t.lanternW - 4), 1, C.lamp[3]);
    }
    PK.rect(t.cx - 1, t.glassT + 1, 3, Math.max(1, t.lanternH - 2), C.lamp[3]);
    PK.rect(t.cx, t.glassT + 2, 1, Math.max(1, t.lanternH - 4), C.lamp[4]);
    for (let x = t.cx - hlw; x <= t.cx + hlw; x += 2)
      for (let y = t.glassT; y <= t.glassB; y++) PK.px(x, y, "#161a2b");
    PK.rect(t.cx - hlw - 1, t.glassT - 1, t.lanternW + 3, 1, C.metal[3]);
    PK.rect(t.cx - hlw - 1, t.glassB, t.lanternW + 3, 1, C.metal[1]);
    PK.rect(t.cx - hlw - 1, t.glassT, 1, t.lanternH, C.metal[3]);
    PK.rect(t.cx + hlw + 1, t.glassT, 1, t.lanternH, C.metal[0]);

    // domed roof + finial
    for (let j = 0; j < t.roofH; j++) {
      const y = t.glassT - 2 - j;
      const hw = Math.max(1, Math.round((hlw + 1) * (1 - j / t.roofH)));
      shadedRow(y, t.cx - hw, t.cx + hw, C.metal, true);
    }
    PK.rect(t.cx - 1, t.glassT - 2 - t.roofH, 3, 1, C.metal[3]);
    PK.line(t.cx, t.glassT - 3 - t.roofH, t.cx, t.glassT - 5 - t.roofH, C.metal[3]);
    PK.px(t.cx - 1, t.glassT - 5 - t.roofH, C.metal[2]);
    PK.px(t.cx + 1, t.glassT - 5 - t.roofH, C.metal[1]);
  }

  function drawHouse() {
    const hx = L.houseX, hw = L.houseW, hh = L.houseH;
    const baseY = L.houseBaseY;
    const wallH = Math.max(4, hh - Math.max(3, Math.round(hw * 0.34)));
    const roofH = hh - wallH;
    const x0 = hx - Math.floor(hw / 2), x1 = hx + Math.floor(hw / 2);
    const wallTop = baseY - wallH;

    // walls
    for (let y = wallTop; y < baseY; y++) shadedRow(y, x0, x1, C.house, true);
    PK.rect(x0, wallTop, x1 - x0 + 1, 1, C.house[3]);
    const rnd = PK.rng(777);
    for (let i = 0; i < Math.round(hw * wallH * 0.06); i++) {
      const x = x0 + 1 + Math.floor(rnd() * Math.max(1, hw - 2));
      const y = wallTop + Math.floor(rnd() * wallH);
      PK.px(x, y, rnd() < 0.5 ? C.house[1] : C.house[3]);
    }
    // chimney on the right slope, drawn under the roof so the roof cuts its base
    const rw = Math.floor(hw / 2) + 1;
    const chX = hx + Math.max(1, Math.round(rw * 0.55));
    const chRise = Math.round(roofH * (1 - Math.round(rw * 0.55) / rw));
    const chTop = wallTop - 1 - chRise - 2;
    PK.rect(chX - 1, chTop, 3, wallTop - chTop, C.house[1]);
    PK.rect(chX - 1, chTop, 3, 1, C.house[3]);
    PK.px(chX + 1, chTop + 1, C.house[0]);
    L.chimney = { x: chX, y: chTop - 1 };

    // gable roof, eaves overhang by 1 px
    for (let j = 0; j <= roofH; j++) {
      const y = wallTop - 1 - j;
      const hwf = Math.max(0, Math.round(rw * (1 - j / roofH)));
      if (hwf > 0) shadedRow(y, hx - hwf, hx + hwf, C.roof, true);
      else PK.px(hx, y, C.roof[3]);
    }
    for (let x = hx - rw; x <= hx + rw; x++) PK.px(x, wallTop - 1, x <= hx ? C.roof[3] : C.roof[1]);
    // door and two lit windows
    PK.rect(hx - 1, baseY - 4, 3, 4, "#0a0c14");
    PK.px(hx - 1, baseY - 4, C.house[3]);
    PK.px(hx, baseY - 1, C.win[2]);
    const wy = wallTop + Math.max(1, Math.round(wallH * 0.28));
    for (const wx of [hx - Math.round(hw * 0.3), hx + Math.round(hw * 0.3)]) {
      if (wx === hx) continue;
      PK.rect(wx - 1, wy, 2, 2, C.win[2]);
      PK.px(wx - 1, wy, C.win[3]);
      PK.px(wx, wy + 1, C.win[1]);
      PK.px(wx - 1, wy + 2, C.metal[0]);
      PK.px(wx, wy + 2, C.metal[0]);
    }
    // contact shadow where the house meets the rock
    PK.rect(x0 - 1, baseY, hw + 3, 1, C.cliff[0]);
    PK.rect(x0, baseY + 1, hw + 1, 1, C.cliff[0]);
  }

  function drawForegroundRocks() {
    for (const r of L.foreRocks) {
      PK.rock(r.x, r.baseY, r.w, r.h, C.fore, { profile: "mound", rough: 1, seed: r.seed });
    }
  }

  /* ---- moving water and foam ----------------------------------------------------- */
  function drawSea(t) {
    PK.sea(0, L.horizon + 1, L.W, L.H, t, C.sea, 5);
    // moon glint: a shimmering column of light under the moon
    for (let y = L.horizon + 1; y < L.H; y++) {
      const d = (y - L.horizon) / (L.H - L.horizon);
      const half = Math.round(1 + d * L.mr * 0.85);
      const wob = Math.round(Math.sin(t * 0.9 + y * 0.55) * 1.8 * d);
      for (let x = L.mx - half + wob; x <= L.mx + half + wob; x++) {
        if (x < 0 || x >= L.W) continue;
        const k = 0.62 - d * 0.45 + 0.28 * Math.sin(t * 1.7 + x * 0.7 + y * 0.4);
        if (PK.bayer(x, y) < k) PK.px(x, y, C.glint[clamp(Math.floor((1 - d) * 3.6), 0, 3)]);
      }
    }
  }

  function drawFoam(t) {
    const lines = [
      { x0: L.cliffX - 2, x1: L.cliffX + L.cliffW + 2, y: L.cliffBaseY, s: 9 },
      { x0: L.shelfX - 1, x1: L.shelfX + L.shelfW + 1, y: L.shelfBaseY, s: 19 },
    ];
    for (const r of L.foreRocks) lines.push({ x0: r.x - 1, x1: r.x + r.w + 1, y: r.baseY, s: r.seed });
    for (const ln of lines) PK.foam(ln.x0, ln.x1, ln.y, t, [C.foam[0], C.foam[1]], ln.s);
    // surf washing along the bottom edge of the frame
    PK.foam(0, L.W, L.H - 1, t * 0.9, [C.foam[0], C.foam[1]], 121);
  }

  /* ---- the light ----------------------------------------------------------------- */
  // beam is drawn under the foreground layer so the tower occludes it at its source
  function drawBeam(t) {
    const tx = L.tower.cx, ty = L.tower.beamY;
    const sweep = Math.sin(t * 0.3);
    const angle = -Math.PI / 2 + sweep * (Math.PI / 2 + 0.16);
    PK.beam(tx, ty, angle, L.beamLen, 0.085, ["#243a6e", "#6f86c4", "#ffe6a8"], 0.5);
    PK.beam(tx, ty, angle + Math.PI, L.beamLen * 0.7, 0.07, ["#1a2a52", "#41598f", "#a89878"], 0.3);
    L.flare = 0.5 + 0.5 * Math.abs(sweep);
  }

  // the lamp bloom goes over the foreground so it blooms around the lantern room
  function drawLamp() {
    const tx = L.tower.cx, ty = L.tower.beamY, lw = L.tower.lanternW;
    const flare = L.flare == null ? 0.5 : L.flare;
    // bloom behind the tower (so the masonry stays readable); the tight core goes on top
    PK.glow(tx, ty, Math.round(lw * (1.7 + flare * 0.8)), C.lamp[3], 0.3 + flare * 0.15);
    PK.glow(tx, ty, Math.round(lw * 1.2), C.lamp[2], 0.4);
  }

  // the lamp core goes over the foreground so it glows through the lantern glass
  function drawLampCore() {
    const tx = L.tower.cx, ty = L.tower.beamY, lw = L.tower.lanternW, bw = L.tower.bw;
    const flare = L.flare == null ? 0.5 : L.flare;
    PK.glow(tx, ty, Math.max(2, Math.round(lw * 0.75)), C.lamp[4], 0.55 + flare * 0.3);
    PK.rect(tx - 1, ty - 1, 3, 3, C.lamp[4]);
    // spill on the gallery slab and a warm lip on the tower top
    PK.rect(tx - Math.round(bw * 0.6), L.tower.topY - 2, Math.round(bw * 1.2) + 1, 1, C.lamp[3]);
    PK.rect(tx - Math.round(bw * 0.4), L.tower.topY - 5, Math.round(bw * 0.8) + 1, 1, C.lamp[2]);
  }

  /* ---- particles ------------------------------------------------------------------- */
  let rain = PK.drift({ n: 70, seed: 3, area: [0, 0, 1, 1], vx: [-16, -11], vy: [95, 140], len: [3, 6] });
  let smoke = PK.drift({ n: 9, seed: 8, area: [0, 0, 1, 1], vx: [-7, -2], vy: [-9, -4], len: [1, 2] });
  let spray = PK.drift({ n: 16, seed: 21, area: [0, 0, 1, 1], vx: [-9, 9], vy: [-22, -8], len: [1, 1] });

  /* ---- assemble ------------------------------------------------------------------- */
  let bg = null, fg = null;

  PK.fit(cv, 148, function (v) {
    L = layout(v);
    bg = PK.layer(v.W, v.H, function () {
      drawSky();
      drawMoon();
    });
    fg = PK.layer(v.W, v.H, function () {
      drawCliff();
      drawForegroundRocks();
      drawTower();
      drawHouse();
    });
    buildClouds();
    rain.setArea([0, -6, v.W, v.H]);
    smoke.setArea([L.chimney.x - 6, L.chimney.y - Math.round(L.H * 0.13), L.chimney.x + 4, L.chimney.y]);
    spray.setArea([0, L.cliffBaseY - 3, v.W, L.cliffBaseY + Math.max(4, Math.round(L.H * 0.06))]);
  });

  PK.loop(function (t, dt) {
    PK.blit(bg);
    PK.stars(0, 0, L.W, L.horizon - 2, Math.round(L.W * 0.45), t, C.star, 11);
    for (const c of clouds) {
      let x;
      if (c.anchor) x = c.x + Math.round(Math.sin(t * 0.12) * c.w * 0.22);
      else {
        x = Math.round(c.x + t * c.spd) % (L.W + c.w * 2);
        x -= c.w;
      }
      PK.sprite(c.rows, C.cloud, x, c.y);
    }
    drawSea(t);
    drawBeam(t);
    drawLamp();
    PK.blit(fg);
    drawLampCore();
    drawFoam(t);
    smoke.step(dt);
    smoke.dots([C.cliff[3], "#3a456e"]);
    spray.step(dt);
    spray.dots([C.foam[0], C.foam[1]]);
    rain.step(dt);
    rain.streaks(C.rain);
  });
})();
