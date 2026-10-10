/* Windmill in a tulip field at sunset — built on pixel-kit.js (window.PK). */
(function () {
  "use strict";
  const R = PK.rng;
  const canvas = document.getElementById("scene");

  // ---- palette -------------------------------------------------------------
  const PAL = {
    sky: ["#241f54", "#3c3272", "#623c7e", "#8f4a78", "#c25e60", "#e57e50", "#f59e5a", "#fbbd6c", "#fdd98e", "#fdeab8"],
    sun: ["#c85f52", "#e07a52", "#f09a5e", "#f9bd78", "#fff0b4"],
    cloudLit: ["#f9c28e", "#f0d2ac", "#fbe4c8"],
    cloudShad: ["#8a4674", "#a85a76", "#c67a84"],
    farBank: "#6e4f68",
    farBankLit: "#8a6478",
    water: ["#232c52", "#33406e", "#465a8a", "#5f7aa6", "#8fb0d4"],
    towPath: ["#3a2c3e", "#4e3c4c", "#66505e", "#82687a"],
    grass: ["#20301f", "#2c4426", "#3c5a2e", "#4e7038", "#688a46"],
    road: ["#4a3c52", "#5e4e64", "#746278", "#8e7a90"],
    millBody: ["#3a151c", "#67202a", "#933430", "#bf5440", "#e08158"],
    trim: ["#3c4058", "#585e7c", "#7e86a2", "#a8aec4"],
    wood: ["#241610", "#3a2418", "#543824", "#7a5636", "#a87c4c"],
    sail: ["#31405a", "#4d607e", "#7288a4", "#a4b6cc", "#e2eaf4"],
    glow: ["#b06a2e", "#e0913e", "#ffd078"],
    tulips: {
      red: ["#4e121e", "#8a1e2c", "#c9303c", "#e85a52", "#ff9a86"],
      yellow: ["#7a4c14", "#c2801e", "#e8ad2c", "#f8d24e", "#fff0a0"],
      pink: ["#6e1e4e", "#b03276", "#d8529a", "#f07cb4", "#ffb8d8"],
    },
    bird: ["#241a36", "#3c2c52"],
  };
  const SUNX_F = 0.22; // sun sits at 22% of the width

  // ---- hand-drawn sprites ----------------------------------------------------
  const CAP = [
    "..kkkkkkk.",
    ".kKKKKKKKk",
    "kKAAAAAAAK",
    "kAAAAAAAAa",
    "kAAAAAA.aa",
    "kKAAAA..aa",
  ];
  const CAPP = { k: PAL.trim[0], K: PAL.trim[1], A: PAL.millBody[2], a: PAL.millBody[3] };

  const FANTAIL = [
    "..ggg",
    ".gGGg",
    "gGGGg",
    ".gGGg",
    "..ggg",
    "...g.",
    "...g.",
  ];
  const FANTAILP = { g: PAL.trim[0], G: PAL.trim[2] };

  const TULIP = [
    ".c.c.c.",
    "ccccccc",
    "CCCCCCC",
    "CCCCCCC",
    "ccccccc",
    "..sss..",
    "..sss..",
    ".LsssL.",
    "..sss..",
    "..sss..",
  ];
  const TULIPP = { c: PAL.tulips.red[1], C: PAL.tulips.red[2], s: PAL.grass[2], L: PAL.grass[3] };

  function tulipPal(key) {
    return { c: PAL.tulips[key][1], C: PAL.tulips[key][2], s: PAL.grass[2], L: PAL.grass[3] };
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  // ---- geometry ----------------------------------------------------------------
  let W = 0, H = 0, groundY = 0, millX = 0, portrait = false;
  let tower = null, hub = null, sails = null;
  let rows = [], clouds = null, birds = null, bg = null;

  const ROAD_HALF_H = (w) => Math.max(7, Math.round(w * 0.035));
  const ROAD_HALF_F = 3;
  const NEAR_F = 0.7; // depth past which the field gets a single dense flower band

  // ---- static background layer ---------------------------------------------------
  function drawStatic() {
    PK.gradient(0, 0, W, groundY + 1, PAL.sky);

    // distant dike silhouette with far windmill silhouettes
    const rnd = PK.rng(21);
    for (let x = 0; x < W; x++) {
      const h = 2 + Math.round(2.2 * (0.5 + 0.5 * Math.sin(x * 0.045 + 1.4)) + rnd() * 1.2);
      PK.rect(x, groundY - h, 1, h, x % 7 < 3 ? PAL.farBank : PAL.farBankLit);
    }
    for (const sx of [Math.round(W * 0.12), Math.round(W * 0.86)]) {
      if (Math.abs(sx - millX) < 24) continue;
      const base = groundY - 3;
      PK.line(sx, base, sx, base - 5, PAL.farBank);
      PK.line(sx - 3, base - 6, sx + 3, base - 2, PAL.farBank);
      PK.line(sx - 3, base - 2, sx + 3, base - 6, PAL.farBank);
    }

    // canal water (animated every frame in drawCanalWater; base bands here)
    PK.rect(0, groundY, W, 8, PAL.water[1]);

    // towpath
    PK.rect(0, groundY + 8, W, 3, PAL.towPath[1]);
    const rnd2 = PK.rng(5);
    for (let i = 0; i < W * 0.06; i++) PK.px(rnd2() * W, groundY + 8 + (rnd2() < 0.5 ? 0 : 2), PAL.towPath[rnd2() < 0.5 ? 0 : 2]);
    PK.rect(0, groundY + 11, W, 1, PAL.grass[0]);

    // field ground
    PK.gradient(0, groundY + 12, W, H, PAL.grass.slice(0, 4));
    const rnd3 = PK.rng(9);
    for (let i = 0; i < W * (H - groundY) * 0.004; i++) {
      const x = Math.floor(rnd3() * W), y = groundY + 12 + Math.floor(rnd3() * (H - groundY - 12));
      PK.px(x, y, rnd3() < 0.5 ? PAL.grass[0] : PAL.grass[3]);
    }

    // furrow rows: darker strips with lit ridges; flowers are planted on the ridges
    let y = groundY + 15;
    let i = 0;
    while (y < H) {
      const f = (y - groundY) / (H - groundY);
      const th = 1 + Math.round(f * 2.2);
      PK.rect(0, y, W, th, PAL.grass[0]);
      for (let x = (i * 5) % 7; x < W; x += 5 + Math.round(f * 4)) PK.px(x, y, PAL.grass[3]);
      y += th + 1 + Math.round(f * 2);
      i++;
    }

    // road perspective stripes + center line
    const roadHalfH = ROAD_HALF_H(W), roadHalfF = ROAD_HALF_F;
    for (let yy = H - 1; yy > groundY + 12; yy--) {
      const f = (yy - (groundY + 12)) / (H - groundY - 12);
      const half = Math.max(1, Math.round(roadHalfF + (roadHalfH - roadHalfF) * f));
      const shade = Math.floor(yy / 6) % 2 ? PAL.road[1] : PAL.road[2];
      PK.rect(millX - half, yy, half * 2, 1, shade);
      if (yy % 5 < 2) PK.px(millX, yy, PAL.road[3]);
    }
    PK.line(millX - roadHalfH, groundY + 13, millX - roadHalfF, H - 1, PAL.grass[0]);
    PK.line(millX + roadHalfH, groundY + 13, millX + roadHalfF, H - 1, PAL.grass[0]);

    // contact shadow of the tower
    const sw = Math.max(3, Math.round(tower.bw * 0.55));
    PK.rect(millX - sw, groundY - 1, sw * 2, 2, "rgba(20,10,24,0.45)");

    drawMillStatic();
  }

  function towerW(y) {
    const { ty, by, bw, tw } = tower;
    const f = (y - ty) / (by - ty);
    return tw + (bw - tw) * Math.pow(f, 1.35);
  }

  function drawMillStatic() {
    const { ty, by, bw, tw, towerH } = tower;

    // tapered brick body, sunset-lit from the left, running-bond brick courses
    const brickDark = shade(PAL.millBody[1], 0.65);
    for (let y = ty; y < by; y++) {
      const w = towerW(y);
      const lx = millX - w / 2;
      const course = Math.floor(y / 3);
      for (let x = lx; x < millX + w / 2; x++) {
        const xr = Math.round(x), u = (x - lx) / w;
        let c;
        if (u < 0.22) c = PAL.millBody[1];
        else if (u < 0.74) c = PAL.millBody[2];
        else if (u < 0.82) c = PAL.millBody[3];
        else c = PAL.millBody[4];
        if (y % 3 === 0 || (Math.round(x) + (course % 2) * 2) % 4 === 0) c = brickDark; // mortar lines
        if (u > 0.3 && PK.bayer(Math.round(x), y) < 0.05) c = PAL.millBody[3];
        PK.px(xr, y, c);
      }
      PK.px(Math.round(lx), y, PAL.millBody[0]);
      PK.px(Math.round(lx + w - 1), y, PAL.millBody[0]);
    }

    // string course + base plinth
    const beltY = Math.round(ty + (by - ty) * 0.45);
    const bw2 = towerW(beltY);
    PK.rect(millX - bw2 / 2 - 1, beltY, bw2 + 2, 2, PAL.trim[1]);
    PK.rect(millX - bw2 / 2 - 1, beltY, bw2 + 2, 1, PAL.trim[2]);
    // base plinth meeting the ground so the tower is firmly seated
    const plinthH = Math.max(3, Math.round(towerH * 0.12));
    const plinthY = by - plinthH;
    PK.rect(millX - bw / 2 - 1, plinthY, bw + 2, plinthH, PAL.trim[1]);
    PK.rect(millX - bw / 2 - 1, plinthY, bw + 2, 1, PAL.trim[2]);
    PK.rect(millX - bw / 2 - 1, by - 1, bw + 2, 1, PAL.trim[0]);

    // door
    const dw = 7, dh = Math.min(13, Math.max(8, Math.round((by - plinthY) * 0.85)));
    const dx = millX - dw / 2, dy = plinthY - dh;
    for (let j = 0; j < dh; j++) {
      for (let i2 = 0; i2 < dw; i2++) {
        if (j === 0 && (i2 === 0 || i2 === dw - 1)) continue;
        let c = i2 < 2 ? PAL.wood[1] : i2 < dw - 2 ? PAL.wood[2] : PAL.wood[3];
        if (i2 % 3 === 0 && j > 1) c = PAL.wood[1];
        PK.px(dx + i2, dy + j, c);
      }
    }
    PK.rect(dx - 1, dy - 1, dw + 2, 1, PAL.wood[0]);
    PK.rect(dx - 1, dy, 1, dh, PAL.wood[0]);
    PK.rect(dx + dw, dy, 1, dh, PAL.wood[0]);
    PK.px(dx + dw - 2, dy + dh - 4, PAL.trim[3]);

    // window with warm glow
    const wy = ty + Math.round((by - ty) * 0.24);
    PK.rect(millX - 2, wy, 5, 5, PAL.wood[0]);
    PK.rect(millX - 1, wy + 1, 3, 3, PAL.glow[2]);
    PK.px(millX - 1, wy + 1, PAL.glow[1]);
    PK.px(millX, wy, PAL.wood[1]);
    PK.px(millX, wy + 5, PAL.wood[1]);
    PK.glow(millX, wy + 2, 6, PAL.glow[1], 0.28);

    // cap + fantail: dark cap band over a lighter dome, clearly distinct from the brick
    PK.sprite(CAP, CAPP, millX - 5, ty - 6);
    PK.rect(millX - 6, ty - 1, 11, 2, PAL.trim[0]);
    PK.rect(millX - 6, ty - 1, 11, 1, PAL.trim[1]);
    PK.rect(millX + 5, ty - 3, 2, 1, PAL.trim[1]);
    PK.sprite(FANTAIL, FANTAILP, millX + 6, ty - 7);
  }

  // ---- dynamic pieces ------------------------------------------------------------
  function drawSun(t) {
    const sx = Math.round(W * SUNX_F), sy = groundY - 4;
    PK.glow(sx, sy, 26, PAL.sun[1], 0.4);
    PK.glow(sx, sy, 16, PAL.sun[2], 0.6);
    PK.glow(sx, sy, 9, PAL.sun[3], 0.9);
    PK.disc(sx, sy, 6, PAL.sun[3]);
    PK.disc(sx - 1, sy - 1, 4, PAL.sun[4]);
  }

  function drawClouds(dt) {
    clouds.step(dt);
    const rnd = PK.rng(clouds.seed + 1);
    for (const c of clouds.particles) {
      for (let j = 0; j < c.h; j++) {
        const lit = j < c.h / 2 ? PAL.cloudLit : PAL.cloudShad;
        for (const [bx, bw] of c.blobs[j]) {
          const x0 = Math.round(c.x + bx * c.s);
          const w = Math.max(2, Math.round(bw * c.s));
          PK.rect(x0, Math.round(c.y + j), w - 1, 1, lit[j % lit.length]);
          if (j === 0 || j === c.h - 1) for (let x = x0; x < x0 + w; x++) {
            if (rnd() < 0.25) PK.px(x, Math.round(c.y + j), lit[(j + 1) % lit.length]);
          }
        }
      }
    }
  }

  function drawBirds(dt) {
    birds.step(dt);
    for (const b of birds.particles) {
      const x = Math.round(b.x), y = Math.round(b.y + Math.sin(b.k * 40 + b.x * 0.12) * 1.2);
      if (b.k > 0.5) {
        PK.line(x - 2, y - 1, x - 1, y, PAL.bird[1]);
        PK.px(x, y, PAL.bird[0]);
        PK.px(x + 1, y, PAL.bird[0]);
        PK.line(x + 1, y, x + 2, y - 1, PAL.bird[1]);
      } else {
        PK.line(x - 2, y, x - 1, y + 1, PAL.bird[1]);
        PK.px(x, y, PAL.bird[0]);
        PK.px(x + 1, y, PAL.bird[0]);
        PK.line(x + 2, y, x + 1, y + 1, PAL.bird[1]);
      }
    }
  }

  function drawCanalWater(t) {
    // deep blue water: bright sky reflection at the far bank, deep shadow at the towpath
    for (let y = groundY; y < groundY + 8; y++) {
      const d = (y - groundY) / 7;
      PK.rect(0, y, W, 1, d < 0.35 ? PAL.water[3] : d < 0.75 ? PAL.water[1] : PAL.water[0]);
    }
    // dithered sky band right under the far bank
    for (let x = 0; x < W; x++) if (PK.bayer(x, groundY) < 0.5) PK.px(x, groundY, PAL.water[4]);
    // crisp ripple lines every 2px drifting with the current
    for (let k = 0; k < 3; k++) {
      const yy = groundY + 2 + k * 2;
      for (let x = 0; x < W; x++) {
        const s = Math.sin((x + t * (6 + k * 3)) / (14 + k * 5) * Math.PI * 2);
        if (s > 0.7) PK.px(x, yy, PAL.water[4]);
        else if (s > 0.35) PK.px(x, yy, PAL.water[3]);
      }
    }
    // glint flecks
    const rnd = PK.rng(31);
    for (let k = 0; k < 24; k++) {
      const yy = groundY + 1 + Math.floor(rnd() * 6);
      const x = (Math.floor(rnd() * W) + Math.round(t * (2 + rnd() * 4))) % W;
      if (Math.sin(t * 2 + x * 0.4 + k) > 0.85) PK.rect(x, yy, 2, 1, PAL.water[4]);
    }
    // shimmering sun reflection: a cohesive bright column from the sun down the canal
    const sunX = Math.round(W * SUNX_F);
    for (let k = 0; k < 8; k++) {
      const yy = groundY + k;
      const s = Math.sin(t * 2.4 + k * 1.7);
      const w = (k < 3 ? 5 : 3) + Math.round(2 * (0.5 + 0.5 * s));
      const wob = Math.round(Math.sin(t * 1.3 + k) * 1.5);
      const x0 = sunX - Math.floor(w / 2) + wob;
      PK.rect(x0, yy, w, 1, k % 2 ? PAL.sun[3] : PAL.sun[4]);
      PK.px(x0 - 1, yy, PAL.sun[2]);
      PK.px(x0 + w, yy, PAL.sun[2]);
      if (k > 3 && s < 0) PK.rect(x0 + Math.floor(w / 2) - 1, yy, 2, 1, PAL.water[1]);
    }
    // dark waterline at the towpath
    PK.rect(0, groundY + 7, W, 1, shade(PAL.water[0], 0.7));
  }

  function drawSails(t, front) {
    const ang = t * 0.5;
    for (const s of sails) if (s.back === front) drawSail(s, ang);
  }

  function drawSail(s, ang) {
    const base = ang + (s.n.charCodeAt(0) - 65) * Math.PI / 2;
    const c = Math.cos(base), si = Math.sin(base);
    const pxv = -si, pyv = c;
    const hw = s.w / 2;
    // lattice frame: dark blue frame, bright bars on the yard, dark tail edge
    if (!s.back) {
      PK.line(hub.x + pxv * (hw + 0.5), hub.y + pyv * (hw + 0.5), hub.x + c * s.len + pxv * (hw + 0.5), hub.y + si * s.len + pyv * (hw + 0.5), PAL.sail[0]);
      PK.line(hub.x + pxv * (hw - 0.5), hub.y + pyv * (hw - 0.5), hub.x + c * s.len + pxv * (hw - 0.5), hub.y + si * s.len + pyv * (hw - 0.5), PAL.wood[1]);
      PK.line(hub.x + pxv * (hw - 1.5) + c, hub.y + pyv * (hw - 1.5) + si, hub.x + c * (s.len + 1) + pxv * (hw - 1.5), hub.y + si * (s.len + 1) + pyv * (hw - 1.5), PAL.wood[3]);
      PK.line(hub.x - pxv * (hw + 0.5), hub.y - pyv * (hw + 0.5), hub.x + c * s.len - pxv * (hw + 0.5), hub.y + si * s.len - pyv * (hw + 0.5), PAL.sail[0]);
    } else {
      PK.line(hub.x + pxv * hw, hub.y + pyv * hw, hub.x + c * s.len + pxv * hw, hub.y + si * s.len + pyv * hw, PAL.sail[0]);
      PK.line(hub.x - pxv * hw, hub.y - pyv * hw, hub.x + c * s.len - pxv * hw, hub.y + si * s.len - pyv * hw, PAL.sail[0]);
    }
    // slats every 2px, 1px sky gap, alternating light/dark like cloth panels
    const nSlat = Math.max(2, Math.floor(s.len / 2) - 1);
    for (let k = 1; k <= nSlat; k++) {
      const d = k * 2;
      const ax = hub.x + c * d + pxv * (hw - 0.5), ay = hub.y + si * d + pyv * (hw - 0.5);
      const bx = hub.x + c * d - pxv * (hw - 0.5), by2 = hub.y + si * d - pyv * (hw - 0.5);
      PK.line(ax, ay, bx, by2, s.back ? PAL.sail[1] : k % 2 ? PAL.sail[2] : PAL.sail[3]);
    }
    // stringers parallel to the yard, 1px gaps: completes the grid
    for (const off of [hw - 1.5, 0]) {
      PK.line(hub.x + pxv * off, hub.y + pyv * off, hub.x + c * s.len + pxv * off, hub.y + si * s.len + pyv * off,
        s.back ? PAL.sail[1] : PAL.sail[2]);
    }
  }

  function drawHub() {
    PK.rect(millX - 1, hub.y - 1, 3, 2, PAL.trim[1]);
    PK.disc(hub.x, hub.y, 3, PAL.trim[0]);
    PK.disc(hub.x, hub.y, 2, PAL.trim[2]);
    PK.px(hub.x - 1, hub.y - 1, PAL.trim[3]);
  }

  function drawTulips(t) {
    for (const row of rows) {
      if (!row.tulip) continue;
      const amp = 0.55 + row.f * 1.15;
      for (const tp of row.tulip) {
        const off = Math.round(Math.sin(t * 1.5 + tp.ph) * amp);
        PK.sprite(TULIP, tp.pal, tp.x + off, row.y);
      }
    }
  }

  // ---- layout + main loop -----------------------------------------------------------
  function layout(view) {
    W = view.W; H = view.H; portrait = view.portrait;
    groundY = Math.round(H * (portrait ? 0.5 : 0.56));
    millX = Math.round(W / 2);
    const towerH = Math.max(28, Math.min(52, Math.round(H * 0.34)));
    const by = groundY;
    const ty = by - towerH;
    tower = { ty, by, bw: Math.max(10, Math.round(towerH * 0.46)), tw: Math.max(6, Math.round(towerH * 0.26)), towerH };
    hub = { x: millX, y: ty - 2 };

    const sc = Math.max(0.8, Math.min(1.35, towerH / 36));
    sails = [
      { n: "A", len: Math.round(19 * sc), w: Math.max(3, Math.round(4 * sc)), back: false },
      { n: "B", len: Math.round(14 * sc), w: 3, back: false },
      { n: "C", len: Math.round(19 * sc), w: Math.max(3, Math.round(4 * sc)), back: true },
      { n: "D", len: Math.round(14 * sc), w: 3, back: true },
    ];

    // clouds
    const crnd = PK.rng(77);
    const nClouds = Math.max(4, Math.round(W / 55));
    const defs = [];
    for (let i = 0; i < nClouds; i++) {
      const h = 3 + Math.floor(crnd() * 4);
      const blobs = [];
      const wBase = 8 + Math.floor(crnd() * 14);
      for (let j = 0; j < h; j++) {
        const rw = [];
        const n = 2 + Math.floor(crnd() * 3);
        let bx = -wBase / 2 + crnd() * 3;
        for (let k = 0; k < n; k++) {
          rw.push([bx, 4 + crnd() * 9]);
          bx += 3 + crnd() * 6;
        }
        blobs.push(rw);
      }
      defs.push({ h, blobs, s: 0.8 + crnd() * 0.5 });
    }
    clouds = PK.drift({ n: nClouds, seed: 77, area: [0, 0, W, Math.max(1, groundY - 12)], vx: [2, 7], vy: [0, 0] });
    clouds.particles.forEach((p, i) => Object.assign(p, defs[i]));
    clouds.seed = 77;

    birds = PK.drift({ n: 5, seed: 41, area: [0, 0, W, Math.max(1, groundY - 18)], vx: [11, 17], vy: [0, 0] });

    // flowers: a dense band right of the path at the horizon, then spaced clusters to the bottom
    rows = [];
    const trnd = PK.rng(101);
    const roadHalfH = ROAD_HALF_H(W), roadHalfF = ROAD_HALF_F;
    const palKeys = ["red", "yellow", "pink"];
    const denseY = groundY + Math.round(NEAR_F * (H - groundY));
    const rowYs = [];
    {
      let yy = groundY + 16;
      while (yy < H) {
        rowYs.push(yy);
        const f = (yy - groundY) / (H - groundY);
        yy += 3 + Math.round(f * 4);
      }
    }
    let band = 0;
    for (const ry of rowYs) {
      const f = (ry - groundY) / (H - groundY);
      const row = { y: ry, f, tulip: null };
      if (f >= 0.1) {
        const inBand = ry <= denseY && band % 3 !== 2;
        const items = [];
        const fy = (ry - (groundY + 12)) / Math.max(1, H - groundY - 12);
        const half = Math.max(1, Math.round(roadHalfF + (roadHalfH - roadHalfF) * Math.max(0, fy)));
        const spacing = inBand ? 6 : Math.max(5, Math.round(7 + (1 - f) * 9));
        let x = 3 + (band % 2);
        while (x < W - 4) {
          const cx = x + Math.round(trnd() * 2 - 1);
          if (!(cx > millX - half - 4 && cx < millX + half + 4)) {
            const pal = tulipPal(palKeys[band % 3]);
            items.push({ x: cx, ph: trnd() * 6.28, pal });
            if (trnd() < (inBand ? 0.55 : 0.3)) items.push({ x: cx + 1, ph: trnd() * 6.28, pal: tulipPal(palKeys[(band + 1) % 3]) });
            if (inBand && trnd() < 0.3) items.push({ x: cx + 2, ph: trnd() * 6.28, pal: tulipPal(palKeys[(band + 2) % 3]) });
          }
          x += spacing + Math.round(trnd() * 3);
        }
        row.tulip = items;
        band++;
      }
      rows.push(row);
    }

    bg = PK.layer(W, H, drawStatic);
  }

  PK.fit(canvas, 150, layout);

  PK.loop((t, dt) => {
    PK.blit(bg);
    drawSun(t);
    drawClouds(dt);
    drawCanalWater(t);
    drawSails(t, false);
    drawHub();
    drawSails(t, true);
    drawTulips(t);
    drawBirds(dt);
  });
})();
