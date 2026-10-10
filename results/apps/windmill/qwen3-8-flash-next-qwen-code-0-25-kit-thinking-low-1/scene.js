/* Dutch windmill in a tulip field at sunset.
   Low-res canvas (PK.fit) scaled up by an integer with image-rendering: pixelated.
   Static scenery is baked into two layers - sky behind the clouds, ground+mill in front of
   them - so each frame only redraws clouds, birds, water, sails and swaying tulips. */
(function () {
  "use strict";

  var R = PK.ramps;

  // One ramp per material, 4-5 shades dark -> light, hue shifted (cool shadows, warm highlights).
  var PAL = {
    sky: ["#1c1740", "#2c1e56", "#472661", "#6b3160", "#98405c", "#c4564c", "#e8794a", "#fba860", "#ffdc96"],
    haze: ["#c8724e", "#f0a066", "#ffd39a"],
    sun: ["#fff2c0", "#ffd782", "#ffab58", "#f4783f"],
    cloud: ["#241d43", "#3b2757", "#67345f", "#a8525e", "#e08a62", "#ffc48a"],
    far: ["#2a2740", "#3b3752", "#4f4964", "#68607a", "#8a7e90"],
    ground: ["#93a862", "#5f8a46", "#3f6b39", "#2a4e30", "#193122"],
    grass: ["#152418", "#22402a", "#34603a", "#4d8549", "#7bb057"],
    sunGrass: ["#26401f", "#3b6029", "#5a8437", "#82ac4a", "#b3cf6b"],
    soil: ["#141122", "#221a30", "#332744", "#473557"],
    water: ["#101a34", "#1b2f52", "#2c4e77", "#47789e", "#7fb4cd"],
    warm: ["#4a2440", "#7c3b52", "#b5605f", "#e08b62", "#ffd49a"],
    brick: ["#2b1119", "#4e1c25", "#752c2e", "#9e4436", "#c9764f"],
    stone: ["#1d1d2a", "#313246", "#4a4d66", "#6f7590", "#999fb6"],
    wood: ["#150f0c", "#2b1d16", "#452f21", "#65452c", "#8d6541"],
    thatch: ["#2a1f11", "#48371c", "#6d5329", "#98743c", "#c8a265"],
    red: ["#420c1c", "#8a1f2b", "#c8393e", "#f4756a"],
    yellow: ["#5f3d0c", "#a87415", "#e0a92a", "#ffdb7c"],
    pink: ["#4d1540", "#8b2d69", "#cb539a", "#ffa3cb"],
    lit: ["#6b4013", "#c07d20", "#f0b445", "#ffe6ac"],
    bird: ["#191426", "#2e2740"],
  };
  PK.light = { x: 1, y: -1 }; // key light from the setting sun on the right

  var SAIL_SPEED = 0.55; // rad/s

  var canvas = document.getElementById("scene");
  var L = null, bgSky = null, bgMain = null;
  var clouds = [], birds = [], ducks = [], tulips = [], tufts = [], streaks = [];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd1(n) { var s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); }

  // ---- layout -----------------------------------------------------------------------------

  function build(v) {
    var W = v.W, H = v.H, u = Math.min(W, H), P = Math.round;
    L = { W: W, H: H, u: u, portrait: v.portrait };

    L.hy = P(H * (v.portrait ? 0.44 : 0.52));          // horizon
    L.vpX = P(W * 0.5);                                  // vanishing point of the tulip rows
    L.sunX = P(W * 0.62);
    L.sunR = Math.max(4, P(u * 0.055));
    L.sunY = L.hy - Math.max(1, P(L.sunR * 0.4));

    // windmill: scaled by the short side, so it reads the same size on a phone and a desktop
    L.millX = P(W * (v.portrait ? 0.40 : 0.38));
    L.millBase = Math.min(P(H * 0.70), L.hy + P(u * 0.34));
    L.towerH = Math.max(20, P(u * 0.30));
    L.baseW = Math.max(14, P(u * 0.155));
    L.topW = Math.max(8, P(u * 0.085));
    L.capH = Math.max(5, P(u * 0.075));
    L.capY = L.millBase - L.towerH;
    L.hubX = L.millX + 1;
    L.hubY = L.capY - Math.max(2, P(L.capH * 0.45));
    L.sailLen = Math.max(12, P(u * 0.19));
    L.sailGap = Math.max(2, P(u * 0.021));
    L.doorW = Math.max(3, P(u * 0.036));
    L.doorH = Math.max(8, P(u * 0.075));
    L.winR = Math.max(2, P(u * 0.022));
    L.winY = Math.round(L.capY + L.towerH * 0.34);

    // canal: recedes from the bottom-right to just under the sun
    L.canalFarX = P(W * 0.615);
    L.canalNearX = P(W * 0.88);
    L.canalNearHW = Math.max(9, P(u * 0.17));
    // miller's path: from the door toward the viewer
    L.pathLean = -0.22;

    // a second mill far away, on the other side of the canal
    L.farMillX = clamp(P(W * 0.90), L.canalFarX + 6, W - 5);
    L.farMillH = Math.max(5, P(u * 0.05));
    L.farMillSail = Math.max(3, P(u * 0.048));

    buildClouds();
    buildBirds();
    buildTulips();
    buildField();

    bgSky = PK.layer(W, H, drawSky);
    bgMain = PK.layer(W, H, drawGround);
  }

  function canalAt(y) {
    var f = clamp((y - L.hy) / Math.max(1, L.H - L.hy), 0, 1);
    return {
      cx: L.canalFarX + (L.canalNearX - L.canalFarX) * f,
      hw: 0.5 + (L.canalNearHW - 0.5) * Math.pow(f, 1.25),
    };
  }

  function onPath(x, y) {
    if (y < L.millBase) return false;
    var d = y - L.millBase;
    return Math.abs(x - (L.millX + L.pathLean * d)) < 3 + d * 0.05;
  }

  // ---- generators -------------------------------------------------------------------------

  function buildClouds() {
    var rnd = PK.rng(2024);
    clouds = [];
    var n = clamp(Math.round(L.W / 26), 5, 12);
    for (var i = 0; i < n; i++) {
      var band = i % 3;
      var t0 = band === 0 ? 0.16 + rnd() * 0.22 : band === 1 ? 0.42 + rnd() * 0.2 : 0.68 + rnd() * 0.18;
      clouds.push({
        x: rnd() * (L.W + 60) - 30,
        y: Math.round(L.hy * t0),
        w: Math.max(9, Math.round(L.u * (0.14 + rnd() * 0.26))),
        h: Math.max(3, Math.round(L.u * (0.022 + rnd() * 0.038))),
        sp: 1.6 + rnd() * 3 + band * 0.8,
        seed: 100 + i * 17,
      });
    }
  }

  function buildBirds() {
    var rnd = PK.rng(77);
    birds = [];
    var n = clamp(3 + Math.round(L.u / 60), 3, 6);
    for (var i = 0; i < n; i++) {
      birds.push({
        x: rnd() * L.W,
        y: L.hy * (0.18 + rnd() * 0.42),
        sp: 11 + rnd() * 9,
        ph: rnd() * 6.283,
        pair: rnd() < 0.4,
      });
    }
  }

  function buildTulips() {
    var rnd = PK.rng(1897);
    tulips = [];
    var rowsN = clamp(Math.round(L.u / 10), 9, 16);
    var order = ["red", "yellow", "pink", "red", "yellow", "pink", "pink", "red", "yellow", "red", "pink", "yellow"];
    var span = L.W * 1.15;
    var nPer = Math.min(46, Math.round(14 + (L.H - L.hy) * 0.25));
    for (var r = 0; r < rowsN; r++) {
      var nearX = L.vpX + ((r + 0.5) / rowsN - 0.5) * span;
      var col = PAL[order[r % order.length]];
      for (var i = 0; i < nPer; i++) {
        var s = Math.min(1, Math.pow((i + 0.15 + rnd() * 0.7) / nPer, 1.75));
        var y = Math.round(L.hy + (L.H - L.hy) * s);
        var x = Math.round(L.vpX + (nearX - L.vpX) * s + (rnd() * 2 - 1) * 1.2);
        if (x < -4 || x > L.W + 4 || y <= L.hy + 1) continue;
        var c = canalAt(y);
        if (x > c.cx - c.hw - 1 && x < c.cx + c.hw + 1) continue;        // in the water
        if (y > L.millBase - 12 && Math.abs(x - L.millX) < 6) continue;   // in front of the door
        if (onPath(x, y)) continue;
        tulips.push({
          x: x, y: y, col: col,
          h: Math.max(1, Math.round((1.1 + 6.4 * s) * (L.u / 150))),
          ph: rnd() * 6.283,
          k: rnd(),
        });
      }
    }
    tulips.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
  }

  function buildField() {
    var rnd = PK.rng(313);
    tufts = [];
    var n = clamp(Math.round((L.W * (L.H - L.hy)) / 260), 10, 90);
    for (var i = 0; i < n; i++) {
      var y = Math.round(L.hy + 3 + rnd() * (L.H - L.hy - 3));
      var x = Math.round(rnd() * L.W);
      var c = canalAt(y);
      if (x > c.cx - c.hw - 2 && x < c.cx + c.hw + 2) continue;
      if (onPath(x, y)) continue;
      if (y > L.millBase - 6 && Math.abs(x - L.millX) < L.baseW / 2 + 2) continue;
      tufts.push({ x: x, y: y, k: rnd(), h: 1 + Math.round(rnd() * Math.max(1, (y - L.hy) / 22)) });
    }
    streaks = [];
    var m = clamp(Math.round(L.W / 7), 12, 46);
    for (var j = 0; j < m; j++) {
      streaks.push({
        x: rnd() * L.W,
        y: L.hy + 3 + rnd() * (L.H - L.hy - 3),
        len: 2 + Math.round(rnd() * 4),
        sp: 9 + rnd() * 16,
        ph: rnd() * 6.283,
      });
    }
    ducks = [
      { y: Math.round(L.hy + (L.H - L.hy) * 0.32), o: -0.35, ph: rnd() * 6.283 },
      { y: Math.round(L.hy + (L.H - L.hy) * 0.62), o: 0.45, ph: rnd() * 6.283 },
    ];
  }

  // ---- static: sky ------------------------------------------------------------------------

  function drawSky() {
    PK.gradient(0, 0, L.W, L.hy + 1, PAL.sky);
    var hb = Math.max(3, Math.round(L.u * 0.07));
    for (var i = 0; i < hb; i++) {
      var y = L.hy - i;
      var a = 1 - i / hb;
      var c = PAL.haze[Math.min(2, Math.floor(a * 3))];
      for (var x = 0; x < L.W; x++) if (PK.bayer(x, y) < a * 0.85) PK.px(x, y, c);
    }
    drawSun();
  }

  function drawSun() {
    var r = L.sunR, cx = L.sunX, cy = L.sunY;
    PK.glow(cx, cy, r * 4, PAL.sun[2], 0.3);
    PK.glow(cx, cy, r * 2.4, PAL.sun[1], 0.55);
    for (var y = -r; y <= r; y++) {
      var dx = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.8 - y * y)));
      var t = (y + r) / (2 * r);
      PK.rect(cx - dx, cy + y, dx * 2 + 1, 1, PAL.sun[t < 0.28 ? 0 : t < 0.55 ? 1 : t < 0.8 ? 2 : 3]);
    }
    for (var k = 0; k < 3; k++) {                       // atmospheric banding across the disc
      var yy = cy - r + Math.round(r * (0.5 + k * 0.42));
      var d = Math.floor(Math.sqrt(Math.max(0, r * r - (yy - cy) * (yy - cy))));
      for (var x2 = cx - d; x2 <= cx + d; x2++) if ((x2 + k) % 3 !== 0) PK.px(x2, yy, k === 1 ? PAL.sky[6] : PAL.sky[5]);
    }
  }

  // ---- static: ground, water, windmill ----------------------------------------------------

  function drawGround() {
    drawFarBank();
    PK.gradient(0, L.hy + 1, L.W, L.H, PAL.ground);
    drawFurrows();
    drawCanal();
    drawPath();
    drawFarThings();
    drawMound();
    drawWindmill();
    drawGrassTufts();
  }

  function drawFarBank() {
    for (var x = 0; x < L.W; x++) {
      PK.px(x, L.hy - 1, PK.bayer(x, L.hy - 1) < 0.5 ? PAL.haze[0] : PAL.far[3]);
      PK.px(x, L.hy, PK.bayer(x, L.hy) < 0.5 ? PAL.far[2] : PAL.far[1]);
    }
  }

  function drawFurrows() {
    var rnd = PK.rng(606);
    var rowsN = clamp(Math.round(L.u / 10), 9, 16);
    var span = L.W * 1.15;
    for (var r = 0; r <= rowsN; r++) {
      var nearX = L.vpX + (r / rowsN - 0.5) * span;
      for (var y = L.hy + 1; y < L.H; y++) {
        var f = (y - L.hy) / Math.max(1, L.H - L.hy);
        var x = Math.round(L.vpX + (nearX - L.vpX) * f);
        if (x < 1 || x >= L.W - 1) continue;
        var c = canalAt(y);
        if (x > c.cx - c.hw - 1 && x < c.cx + c.hw + 1) continue;
        PK.px(x, y, f < 0.45 ? PAL.soil[2] : rnd() < 0.5 ? PAL.soil[1] : PAL.soil[0]);
        PK.px(x + 1, y, f < 0.5 ? PAL.soil[3] : PAL.soil[2]);
      }
    }
  }

  function drawCanal() {
    for (var y = L.hy + 1; y < L.H; y++) {
      var c = canalAt(y);
      var x0 = Math.round(c.cx - c.hw), x1 = Math.round(c.cx + c.hw);
      var f = (y - L.hy) / Math.max(1, L.H - L.hy);
      var b = f < 0.15 ? 3 : f < 0.4 ? 2 : f < 0.7 ? 1 : 0;
      for (var x = x0; x <= x1; x++) {
        if (x < 0 || x >= L.W) continue;
        PK.px(x, y, PAL.water[b]);
      }
      PK.px(x0 - 1, y, PAL.grass[1]);                  // grass lip on both banks
      PK.px(x1 + 1, y, PAL.grass[1]);
      PK.px(x0, y, PAL.water[0]);                      // dark waterline
      if (rnd1(y) < 0.4) PK.px(x1, y, PAL.water[1]);
      for (var k = 2; k < 4; k++) if (rnd1(y + k * 7) < 0.55) PK.px(x1 + k, y, PAL.sunGrass[2]);
    }
    drawFence();
  }

  function drawFence() {
    var posts = Math.max(3, Math.round((L.H - L.hy) / 7));
    function post(i) {
      var f = (i + 0.5) / posts;
      var y = Math.round(L.hy + 2 + (L.H - L.hy) * Math.pow(f, 1.35));
      var c = canalAt(y);
      return { x: Math.round(c.cx + c.hw + 2), y: y, h: Math.max(2, Math.round(2 + f * 5)) };
    }
    for (var i = 0; i < posts; i++) {
      var p = post(i);
      if (p.x >= L.W) continue;
      PK.rect(p.x, p.y - p.h, 1, p.h, PAL.wood[1]);
      PK.px(p.x, p.y - p.h, PAL.wood[3]);
      if (i + 1 < posts) {
        var q = post(i + 1);
        PK.line(p.x, p.y - p.h + 1, q.x, q.y - q.h + 1, PAL.wood[2]);
      }
    }
  }

  function drawPath() {
    for (var y = L.millBase; y < L.H; y++) {
      var d = y - L.millBase;
      var cx = Math.round(L.millX + L.pathLean * d);
      var hw = 3 + d * 0.05;
      for (var x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        if (x < 0 || x >= L.W) continue;
        var edge = Math.abs(x - cx) > hw - 1.2;
        PK.px(x, y, edge ? PAL.soil[2] : rnd1(x * 3 + y * 5) < 0.25 ? PAL.stone[2] : PAL.stone[1]);
      }
    }
  }

  function drawFarThings() {
    var rnd = PK.rng(88);
    for (var x = 0; x < L.W; x++) {                     // distant tree line
      if ((x >> 2) % 7 === 3) continue;                 // gaps let the sky through
      var h = 1 + Math.round(2.2 * (0.5 + 0.5 * Math.sin(x * 0.21)) + rnd() * 1.6);
      for (var y = 0; y < h; y++) {
        PK.px(x, L.hy - 1 - y, y === h - 1 ? PAL.far[3] : y > h - 3 ? PAL.far[2] : PAL.far[1]);
      }
    }
    var pop = [Math.round(L.W * 0.05), Math.round(L.W * 0.09), Math.round(L.W * 0.13)];
    pop.forEach(function (px, i) {                      // poplars along the far dike
      var hgt = Math.max(5, Math.round(L.u * (0.055 + i * 0.008)));
      for (var y = 0; y < hgt; y++) {
        var w = y > hgt - 3 ? 0 : 1;
        for (var dx = -w; dx <= w; dx++) PK.px(px + dx, L.hy - 1 - y, dx > 0 ? PAL.far[2] : PAL.far[1]);
      }
      PK.px(px, L.hy - 1 - hgt, PAL.far[3]);
    });
    var cx = Math.round(L.W * 0.22), ch = Math.max(7, Math.round(L.u * 0.085));
    PK.rect(cx - 2, L.hy - ch, 4, ch, PAL.far[1]);      // village church
    PK.rect(cx + 1, L.hy - ch, 1, ch, PAL.far[2]);
    for (var k = 0; k < 4; k++) PK.rect(cx - 2 + k, L.hy - ch - 1 - k, Math.max(1, 5 - k * 2), 1, PAL.far[k > 1 ? 2 : 1]);
    PK.px(cx, L.hy - ch - 5, PAL.far[3]);
    PK.px(cx - 3, L.hy - 3, PAL.lit[1]);
    PK.px(cx + 2, L.hy - 4, PAL.lit[1]);
    var fm = L.farMillX, b = L.hy - 1, fh = L.farMillH, hw = Math.max(1, Math.round(fh * 0.3));
    PK.poly([[fm - hw, b], [fm + hw, b], [fm + Math.max(1, hw - 1), b - fh], [fm - Math.max(1, hw - 1), b - fh]], PAL.far[1]);
    PK.rect(fm - Math.max(1, hw - 1) - 1, b - fh - 1, (Math.max(1, hw - 1) + 1) * 2 - 1, 1, PAL.far[0]);
    PK.px(fm + hw, b - 2, PAL.far[0]);
  }

  function drawMound() {
    var bw = L.baseW / 2 + Math.max(4, Math.round(L.u * 0.05));
    var top = L.millBase, hgt = Math.max(3, Math.round(L.u * 0.045));
    var rnd = PK.rng(71);
    for (var x = Math.round(L.millX - bw); x <= Math.round(L.millX + bw); x++) {
      var t = (x - L.millX) / bw;
      var y = top + Math.round(hgt * (1 - t * t) * 0.75);
      for (var k = top - 1; k <= y; k++) {
        if (x < 0 || x >= L.W) continue;
        var lit = t > 0.25;
        PK.px(x, k, k === top - 1 ? (lit ? PAL.sunGrass[3] : PAL.grass[3]) : lit ? PAL.sunGrass[2] : PAL.grass[2]);
      }
      if (rnd() < 0.25) PK.px(x, top - 2, PAL.sunGrass[4]);
    }
    var tw = L.baseW / 2;                               // contact shadow, cast left (light from the right)
    for (var i = 0; i < 3; i++) {
      for (var sx = Math.round(L.millX - tw - 5 + i); sx <= Math.round(L.millX + tw - 1 + i); sx++) {
        if (PK.bayer(sx, L.millBase + i) < 0.75) PK.px(sx, L.millBase + i, i === 0 ? PAL.grass[0] : PAL.grass[1]);
      }
    }
  }

  function drawGrassTufts() {
    for (var i = 0; i < tufts.length; i++) {
      var g = tufts[i];
      var base = g.y > (L.hy + L.H) / 2 ? PAL.grass : PAL.sunGrass;
      for (var k = 0; k < g.h; k++) PK.px(g.x - (k % 2), g.y - k, base[2 + (g.k > 0.6 ? 1 : 0)]);
      PK.px(g.x + 1, g.y - 1, base[3]);
    }
  }

  // ---- windmill ---------------------------------------------------------------------------

  function drawWindmill() {
    var mx = L.millX, by = L.millBase, th = L.towerH, bw = L.baseW / 2, tw = L.topW / 2, cy = L.capY;

    PK.poly([[mx - bw - 1, by], [mx + bw + 1, by], [mx + bw + 1, by - 3], [mx - bw - 1, by - 3]], PAL.stone[2]);
    for (var x = Math.round(mx - bw - 1); x <= Math.round(mx + bw + 1); x++) {
      if ((x & 3) === 0) PK.px(x, by - 2, PAL.stone[1]);
      if ((x & 3) === 2) PK.px(x, by - 1, PAL.stone[3]);
    }
    if (L.u > 130) {
      PK.rect(mx - 4, by, 9, 1, PAL.stone[3]);
      PK.rect(mx - 3, by + 1, 7, 1, PAL.stone[2]);
    }

    PK.poly([[mx - bw, by - 3], [mx + bw, by - 3], [mx + tw, cy], [mx - tw, cy]], PAL.brick[2]);
    PK.poly([[mx + bw * 0.3, by - 3], [mx + bw, by - 3], [mx + tw, cy], [mx + tw * 0.35, cy]], PAL.brick[3]);
    PK.poly([[mx - bw, by - 3], [mx - bw * 0.5, by - 3], [mx - tw * 0.55, cy], [mx - tw, cy]], PAL.brick[1]);

    var rnd = PK.rng(41);                               // mortar courses + speckle
    for (var y = by - 5; y > cy; y -= 3) {
      var f = (by - y) / th, hw = bw + (tw - bw) * f;
      for (var bx = Math.round(mx - hw); bx <= Math.round(mx + hw); bx++) if (((bx + y) & 3) === 0) PK.px(bx, y, PAL.brick[1]);
    }
    for (var i = 0; i < Math.round(th * 3); i++) {
      var sy = cy + 2 + Math.floor(rnd() * (th - 4));
      var sf = (by - sy) / th, sh = Math.max(1, (bw + (tw - bw) * sf) - 1);
      PK.px(mx - sh + Math.floor(rnd() * (sh * 2 + 1)), sy, rnd() < 0.6 ? PAL.brick[1] : PAL.brick[3]);
    }
    for (var oy = cy; oy <= by - 3; oy++) {              // silhouette: cool dark edge, warm rim on the sun side
      var of2 = (oy - cy) / th, ohw = Math.round(tw + (bw - tw) * of2);
      PK.px(mx - ohw, oy, PAL.brick[0]);
      PK.px(mx + ohw, oy, PAL.brick[0]);
      if (ohw > 3) PK.px(mx + ohw - 1, oy, PAL.brick[4]);
    }

    drawDoor(mx, by);
    drawWindows(mx, cy, th);
    drawCap(mx, cy, tw);
    drawTail(mx, cy, bw, tw);
    PK.pad(mx - bw - Math.round(L.u * 0.05), by - 1, Math.max(3, Math.round(L.u * 0.035)), Math.max(2, Math.round(L.u * 0.022)), R.pine, { seed: 5 });
    PK.pad(mx + bw + Math.round(L.u * 0.04), by - 1, Math.max(4, Math.round(L.u * 0.045)), Math.max(2, Math.round(L.u * 0.025)), R.pine, { seed: 9 });
  }

  function drawDoor(mx, by) {
    var h = L.doorH, w = L.doorW;
    PK.rect(mx - w - 1, by - h - 1, w * 2 + 3, h + 2, PAL.wood[0]);
    PK.rect(mx - w, by - h, w * 2 + 1, h, PAL.wood[2]);
    PK.rect(mx - w, by - h - 1, w * 2 + 1, 1, PAL.wood[1]);
    PK.px(mx - w - 1, by - h, PAL.wood[1]);
    PK.px(mx + w + 1, by - h, PAL.wood[1]);
    for (var y = by - h; y < by; y++) {
      PK.px(mx - 1, y, PAL.wood[1]);
      if (w > 2) PK.px(mx + 2, y, PAL.wood[1]);
    }
    PK.rect(mx - w, by - Math.round(h * 0.35), w * 2 + 1, 1, PAL.stone[1]);   // iron band
    for (var ly = by - h + 1; ly < by - 1; ly++) PK.px(mx + w, ly, ly % 3 === 0 ? PAL.lit[2] : PAL.lit[1]);
    PK.px(mx + w - 2, by - Math.round(h * 0.5), PAL.lit[3]);                   // brass knob
    PK.rect(mx - w - 1, by - 1, w * 2 + 3, 1, PAL.stone[3]);                   // threshold
  }

  function drawWindows(mx, cy, th) {
    win(mx, L.winY, L.winR);
    win(mx + 1, Math.round(cy + th * 0.72), Math.max(1, Math.round(L.u * 0.014)));
    var hy = Math.round(L.millBase - th * 0.42);
    PK.rect(mx - 3, hy, 7, 4, PAL.wood[1]);
    PK.rect(mx - 2, hy + 1, 5, 2, PAL.wood[0]);
    PK.px(mx - 3, hy, PAL.wood[3]);
    PK.px(mx + 3, hy, PAL.wood[3]);
  }

  function win(cx, cy, r) {
    var s = r * 2 + 1;
    PK.rect(cx - r - 1, cy - r - 1, s + 2, s + 2, R.whitePaint[2]);   // white-painted frame
    PK.rect(cx - r, cy - r, s, s, PAL.lit[1]);
    PK.rect(cx - r, cy - r, Math.max(1, r), Math.max(1, r), PAL.lit[2]);
    PK.px(cx + r, cy + r, PAL.lit[0]);
    PK.px(cx, cy, PAL.wood[0]);
    PK.px(cx, cy - r, PAL.wood[0]);
    PK.px(cx, cy + r, PAL.wood[0]);
    PK.px(cx - r, cy, PAL.wood[0]);
    PK.px(cx + r, cy, PAL.wood[0]);
    PK.rect(cx - r - 1, cy + r + 1, s + 2, 1, PAL.stone[3]);
  }

  function drawCap(mx, cy, tw) {
    var ch = L.capH;
    PK.rect(mx - tw - 1, cy - 1, tw * 2 + 3, 2, PAL.wood[0]);         // collar
    PK.rect(mx - tw, cy - 1, tw * 2 + 1, 1, PAL.wood[2]);
    var rnd = PK.rng(23);
    for (var k = 0; k < ch; k++) {                                     // thatched cap, narrowing up
      var f = k / Math.max(1, ch - 1);
      var hw = Math.max(1, Math.round((tw + 1) * (1 - 0.72 * Math.pow(f, 1.25))));
      var y = cy - 1 - k;
      for (var x = mx - hw; x <= mx + hw; x++) {
        var lit = x - mx > -hw * 0.2;
        PK.px(x, y, k === ch - 1 ? PAL.thatch[3]
          : lit ? (rnd() < 0.18 ? PAL.thatch[4] : PAL.thatch[3])
                : (rnd() < 0.15 ? PAL.thatch[1] : PAL.thatch[2]));
      }
      PK.px(mx - hw, y, PAL.thatch[0]);
      PK.px(mx + hw, y, PAL.thatch[0]);
      if (k > 1 && k < ch - 1 && rnd() < 0.5) PK.px(mx + Math.round(rnd() * hw * 2 - hw), y, PAL.thatch[1]);
    }
    PK.px(mx, cy - ch - 1, PAL.stone[4]);                              // ridge knob and vane
    PK.px(mx - 1, cy - ch, PAL.stone[2]);
    PK.px(mx + 1, cy - ch, PAL.stone[3]);
    PK.px(mx, cy - ch - 2, PAL.stone[3]);
    PK.px(mx + 1, cy - ch - 3, PAL.stone[2]);
    PK.px(mx + 2, cy - ch - 3, PAL.stone[3]);
    PK.rect(L.hubX - 2, L.hubY - 2, 5, 5, PAL.wood[0]);                 // sail stock through the cap
    PK.rect(L.hubX - 1, L.hubY - 1, 3, 3, PAL.wood[2]);
  }

  function drawTail(mx, cy, bw, tw) {
    var x0 = mx + tw + 1, y0 = cy - Math.round(L.capH * 0.35);
    var x1 = Math.round(mx + bw + Math.round(L.u * 0.06)), y1 = Math.round(L.millBase - L.towerH * 0.34);
    PK.line(x0, y0, x1, y1, PAL.wood[1]);
    PK.line(x0, y0 + 1, x1, y1 + 1, PAL.wood[0]);
    for (var i = 1; i <= 5; i++) {
      var f = i / 6, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
      PK.line(x, y - 3, x + 2, y + 1, PAL.wood[2]);
      PK.px(x + 2, y + 1, PAL.wood[3]);
    }
    PK.px(x0, y0, PAL.wood[3]);
  }

  // ---- animated ---------------------------------------------------------------------------

  function drawSails(cx, cy, len, ang, scale) {
    var big = scale > 0.6;
    var gap = Math.max(2, Math.round(L.sailGap * scale));
    var rung = Math.max(2, Math.round(2 * scale));
    var dark = big ? PAL.wood[0] : PAL.far[0];
    var rail = big ? PAL.wood[2] : PAL.far[1];
    var lat = big ? PAL.wood[1] : PAL.far[2];
    var rim = big ? PAL.warm[3] : PAL.far[3];
    for (var k = 0; k < 4; k++) {
      var a = ang + (k * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a);
      var pxn = -sa, pyn = ca;
      var x0 = cx + ca * 2, y0 = cy + sa * 2, x1 = cx + ca * len, y1 = cy + sa * len;
      var sunward = ca > 0.15;
      PK.line(x0, y0, x1, y1, dark);
      PK.line(x0 + pxn, y0 + pyn, x1 + pxn, y1 + pyn, rail);
      if (sunward) PK.line(x0 + pxn * 2, y0 + pyn * 2, x1 + pxn * 2, y1 + pyn * 2, rim);
      var lx1 = x1 + pxn * gap, ly1 = y1 + pyn * gap;
      PK.line(x0 + pxn * gap, y0 + pyn * gap, lx1, ly1, rail);
      for (var t = 0.4; t <= 1.0001; t += rung / len) {                 // lattice rungs on the outer 60%
        var rx = x0 + (x1 - x0) * t, ry = y0 + (y1 - y0) * t;
        PK.line(rx, ry, rx + pxn * gap, ry + pyn * gap, lat);
      }
      PK.line(x1, y1, lx1, ly1, rail);                                   // buck (hooped tip)
      PK.line(x1 + pxn, y1 + pyn, lx1 - pxn, ly1 - pyn, dark);
      if (sunward) PK.px(lx1, ly1, rim);
    }
    PK.disc(cx, cy, Math.max(1, Math.round(2 * scale)), dark);
    PK.px(cx, cy, big ? PAL.stone[3] : PAL.far[3]);
  }

  function cloud(cl) {
    var rnd = PK.rng(cl.seed);
    var litSide = Math.abs(cl.x + cl.w * 0.5 - L.sunX) < L.W * 0.35;
    var i = 0, top = 0;
    while (i < cl.w) {
      var run = 2 + Math.floor(rnd() * 5);
      top = clamp(top + Math.round(rnd() * 3 - 1.5), 0, Math.max(1, cl.h * 0.7));
      var hh = Math.max(2, Math.round(cl.h * (0.5 + rnd() * 0.6)));
      for (var k = 0; k < run && i < cl.w; k++, i++) {
        var u = cl.w > 1 ? i / (cl.w - 1) : 0.5;
        var taper = Math.pow(Math.sin(Math.PI * clamp(u, 0.02, 0.98)), 0.55);
        var t0 = cl.y + Math.round(top * (1 - taper) + cl.h * 0.12);
        var b0 = t0 + Math.max(1, Math.round(hh * taper));
        for (var y = t0; y <= b0; y++) {                                  // cool top, sun-lit underbelly
          var d = b0 - y;
          PK.px(cl.x + i, y, d === 0 ? (litSide ? PAL.cloud[5] : PAL.cloud[4])
            : d === 1 ? (litSide ? PAL.cloud[4] : PAL.cloud[3])
              : d <= 3 ? PAL.cloud[3] : d <= 5 ? PAL.cloud[2] : PAL.cloud[1]);
        }
      }
    }
    var r2 = PK.rng(cl.seed + 3);
    var sn = 2 + Math.floor(r2() * 3);
    for (var s = 0; s < sn; s++) {                                        // wind-blown streaks trailing off
      var sx = cl.x + Math.round(r2() * cl.w) - 3;
      var sy = cl.y + Math.round(cl.h * (0.9 + r2() * 1.1));
      var sl = 2 + Math.round(r2() * (cl.w * 0.3));
      for (var q = 0; q < sl; q++) if (PK.bayer(sx + q, sy) < 0.7) PK.px(sx + q, sy, q < sl * 0.6 ? PAL.cloud[3] : PAL.cloud[2]);
    }
  }

  function drawClouds(t) {
    var span = L.W + 60;
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var x = (((cl.x - t * cl.sp) % span) + span) % span - 30;
      var keep = cl.x;
      cl.x = Math.round(x);
      cloud(cl);
      cl.x = keep;
    }
  }

  var BIRD_UP = ["x..x", ".xx."], BIRD_MID = ["xxxx"], BIRD_DOWN = [".xx.", "x..x"];

  function drawBirds(t) {
    var span = L.W + 24;
    for (var i = 0; i < birds.length; i++) {
      var b = birds[i];
      var x = Math.round(((b.x + t * b.sp) % span) - 12);
      var y = Math.round(b.y + Math.sin(t * 0.7 + b.ph) * 2);
      var f = Math.sin(t * 6 + b.ph);
      var rows = f > 0.55 ? BIRD_UP : f < -0.55 ? BIRD_DOWN : BIRD_MID;
      var c = Math.abs(x - L.sunX) < 14 ? PAL.bird[1] : PAL.bird[0];
      var pal = { x: c };
      PK.sprite(rows, pal, x, y);
      if (b.pair) { PK.sprite(rows, pal, x + 4, y + 2); PK.sprite(rows, pal, x - 4, y + 1); }
    }
  }

  function drawWater(t) {
    for (var y = L.hy + 2; y < L.H; y += 2) {                             // rolling crests
      var c = canalAt(y), f = (y - L.hy) / Math.max(1, L.H - L.hy);
      var period = 7 + f * 16, speed = 6 + f * 22, ph = y * 2.1;
      for (var x = Math.round(c.cx - c.hw); x <= Math.round(c.cx + c.hw); x++) {
        if (x < 0 || x >= L.W) continue;
        var s = Math.sin(((x + t * speed + ph) / period) * 6.283);
        if (s < 0.62) continue;
        PK.px(x, y - (s > 0.9 ? 1 : 0), f > 0.5 ? PAL.water[3] : PAL.water[4]);
      }
    }
    for (var yy = L.hy + 1; yy < L.H; yy++) {                             // sun glitter down the canal
      var c2 = canalAt(yy), f2 = (yy - L.hy) / Math.max(1, L.H - L.hy);
      var w = Math.max(1, c2.hw * (0.55 - f2 * 0.2));
      var wob = Math.sin(yy * 0.55 + t * 2.6) * (0.6 + f2 * 2.2);
      var dens = 0.85 - f2 * 0.45;
      for (var gx = Math.round(c2.cx - w + wob); gx <= Math.round(c2.cx + w + wob); gx++) {
        if (gx < 0 || gx >= L.W || PK.bayer(gx, yy + Math.round(t * 6)) > dens) continue;
        var d = Math.abs(gx - (c2.cx + wob)) / Math.max(1, w);
        PK.px(gx, yy, d < 0.3 ? PAL.warm[4] : d < 0.7 ? PAL.warm[3] : PAL.warm[2]);
      }
    }
    for (var i = 0; i < ducks.length; i++) {                              // ducks on the current
      var dk = ducks[i], c3 = canalAt(dk.y);
      var dx = Math.round(c3.cx + dk.o * c3.hw + Math.sin(t * 0.22 + dk.ph) * c3.hw * 0.55);
      var dy = dk.y;
      var body = dx > c3.cx ? PAL.wood[1] : PAL.wood[0];
      PK.rect(dx - 1, dy, 3, 1, body);
      PK.px(dx + 2, dy - 1, body);
      PK.px(dx + 3, dy - 1, PAL.warm[3]);
      PK.px(dx - 2, dy + 1, PAL.water[0]);
      PK.px(dx - 3, dy + 1, PAL.water[1]);
    }
  }

  function drawFieldWind(t) {
    var gust = clamp(0.55 + 0.45 * Math.abs(Math.sin(t * 0.31)) + 0.25 * Math.sin(t * 1.9), 0.2, 1.4);
    for (var i = 0; i < streaks.length; i++) {
      var s = streaks[i];
      var x = Math.round(((s.x - t * s.sp) % L.W + L.W) % L.W);
      var y = Math.round(s.y + Math.sin(t * 0.8 + s.ph));
      if (y <= L.hy + 1) continue;
      var c = canalAt(y);
      for (var k = 0; k < s.len; k++) {
        var xx = x - k;
        if (xx < 0 || xx >= L.W) continue;
        if (xx > c.cx - c.hw - 1 && xx < c.cx + c.hw + 1) continue;
        if (k > 0 && gust < 0.8) continue;
        PK.px(xx, y, k === 0 ? PAL.sunGrass[4] : PAL.sunGrass[3]);
      }
    }
    return gust;
  }

  var TULIP_BIG = ["a.a.a", "abcbc", "bbbbb", ".dcd."];
  var TULIP_SMALL = ["a.a", "bcb", ".d."];

  function drawTulips(t, gust) {
    for (var i = 0; i < tulips.length; i++) {
      var f = tulips[i], h = f.h, col = f.col;
      var off = Math.round(Math.sin(t * 1.55 + f.ph) * gust * clamp(h / 6, 0.2, 1.15) - gust * 0.35);
      var x = f.x, y = f.y;
      if (h <= 2) {
        PK.px(x, y - 1, PAL.grass[2]);
        PK.px(x + off, y - h, f.k > 0.75 ? col[3] : col[2]);
        continue;
      }
      PK.line(x, y, x + off, y - h + 2, PAL.grass[1]);                    // stem leans with the gust
      PK.px(x + (off > 0 ? 1 : -1), y - 1, PAL.grass[3]);
      if (h > 4) PK.px(x - (off > 0 ? 1 : -1), y - 2, PAL.sunGrass[2]);
      var hx = x + off, hy = y - h;
      if (h >= 5) PK.sprite(TULIP_BIG, { a: col[1], b: col[2], c: col[3], d: col[0] }, hx - 2, hy);
      else PK.sprite(TULIP_SMALL, { a: col[1], b: col[2], c: col[3], d: col[0] }, hx - 1, hy);
    }
  }

  function drawWindowGlow(t) {
    var fl = 0.5 + 0.12 * Math.sin(t * 7.3) + 0.08 * Math.sin(t * 11.7);
    PK.glow(L.millX, L.winY, L.winR * 3, PAL.lit[2], fl * 0.5);
    PK.rect(L.millX - L.winR, L.winY - L.winR, L.winR * 2 + 1, L.winR * 2 + 1, PAL.lit[2]);
    PK.rect(L.millX - L.winR, L.winY - L.winR, Math.max(1, L.winR), Math.max(1, L.winR), PAL.lit[3]);
    PK.px(L.millX, L.winY, PAL.lit[1]);
    PK.glow(L.millX + L.doorW, L.millBase - Math.round(L.doorH / 2), Math.max(2, L.winR * 2), PAL.lit[1], fl * 0.28);
  }

  var petals = PK.drift({ n: 14, seed: 55, area: [0, 0, 1, 1], vx: [-16, -7], vy: [-3, 4], len: [1, 1] });

  function frame(t) {
    if (!L) return;
    PK.blit(bgSky);
    drawClouds(t);
    drawBirds(t);
    PK.blit(bgMain);
    drawWater(t);
    drawWindowGlow(t);
    var gust = drawFieldWind(t);
    drawTulips(t, gust);
    drawSails(L.hubX, L.hubY, L.sailLen, t * SAIL_SPEED, 1);
    drawSails(L.farMillX, L.hy - 1 - L.farMillH - 2, L.farMillSail, -t * SAIL_SPEED * 0.7 + 0.4, 0.5);
    petals.dots([PAL.red[2], PAL.yellow[2], PAL.pink[2], PAL.warm[3]]);
  }

  var view = PK.fit(canvas, 150, function (v) {
    build(v);
    petals.setArea([0, L.hy + 2, L.W, L.H - 2]);
  });

  PK.loop(frame);

  // exposed for the headless check in check.mjs
  window.SCENE = {
    layout: function () { return L; },
    view: function () { return view; },
    palette: PAL,
    tulips: function () { return tulips; },
    birds: function () { return birds; },
    clouds: function () { return clouds; },
    frame: frame,
  };
})();
