(function () {
  "use strict";
  var R = PK.ramps;
  var bark = R.bark, leaf = R.foliage, clay = R.clay;

  var COL = {
    sunHalo: "#f2a33a", sun: "#ffe08a", sunCore: "#fff4c0",
    cloudLit: "#ffe9cc", cloudMid: "#f0c4a4", cloudShadow: "#c994b0",
    ridgeFar: "#8a7fa6", ridgeFarTop: "#a89ec2", ridgeNear: "#6f648e", ridgeNearTop: "#8f84ac",
    hillFar: "#7f7498", hillNear: "#665c7e",
    bird: "#4a4468",
    faceHi: "#a89fb2", face: "#857c92", face2: "#665e74", front: "#443e52", edge: "#221f2e",
    crack: "#3a3448", pebble: "#b3a9bc", pebbleSh: "#5c5468", shadow: "#332c42",
    soil: "#33241a", soilHi: "#4a3524", soilLo: "#241812", pebbleSoil: "#7a6a58", moss: "#3f7a38",
    petalLight: "#f4b8cc", petalDark: "#d878a0",
    windTail: "#cfd8ea", windHead: "#ffffff", windFarTail: "#c8b9d4", windFarHead: "#e8e0ee"
  };

  var canvas = document.getElementById("c");
  var gctx = canvas.getContext("2d");
  var L = null, bg = null, clouds = [], birds = [];

  var streaks = PK.drift({ n: 16, area: [0, 0, 1, 1], vx: [-46, -28], vy: [-2, 2], len: [6, 11], seed: 5 });
  var streaksFar = PK.drift({ n: 11, area: [0, 0, 1, 1], vx: [-20, -11], vy: [-1.5, 1.5], len: [4, 7], seed: 15 });
  var leaves = PK.drift({ n: 18, area: [0, 0, 1, 1], vx: [-15, -6], vy: [4, 11], len: 1, seed: 9 });
  var petals = PK.drift({ n: 8, area: [0, 0, 1, 1], vx: [-11, -4], vy: [6, 13], len: 1, seed: 23 });

  // branch tiers: height fraction, side, branch length, pad radii (x treeH)
  var PADSPEC = [
    { f: 0.42, side: 1, len: 0.30, rx: 0.165, ry: 0.066 },
    { f: 0.60, side: -1, len: 0.24, rx: 0.135, ry: 0.064 },
    { f: 0.74, side: 1, len: 0.19, rx: 0.115, ry: 0.060 }
  ];
  // trunk as two quadratic segments, coordinates as fractions of treeH
  var TRUNK = { p0: [0, 0], c1: [-0.09, -0.30], p1: [-0.20, -0.52], c2: [-0.29, -0.72], p2: [-0.24, -0.87] };

  function quad(a, c, b, u, h) {
    var v = 1 - u;
    return {
      x: (v * v * a[0] + 2 * v * u * c[0] + u * u * b[0]) * h,
      y: (v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]) * h
    };
  }
  function tpLocal(f, h) {
    if (f <= 0.52) return quad(TRUNK.p0, TRUNK.c1, TRUNK.p1, f / 0.52, h);
    return quad(TRUNK.p1, TRUNK.c2, TRUNK.p2, (f - 0.52) / 0.35, h);
  }
  function windLevel(t) {
    return Math.min(1.35, Math.max(0.4, 0.78 + 0.3 * Math.sin(t * 0.43) + 0.22 * Math.sin(t * 1.11 + 2)));
  }

  function makeLayout(v) {
    var S = Math.min(v.W, v.H);
    var treeH = Math.round(S * 0.52);
    var groundY = Math.round(v.H * (v.portrait ? 0.72 : 0.8));
    var potW = Math.round(treeH * 0.8);
    var potH = Math.max(10, Math.round(treeH * 0.16));
    L = {
      W: v.W, H: v.H, S: S, treeH: treeH, groundY: groundY,
      potW: potW, potH: potH, cx: Math.round(v.W / 2),
      potX: Math.round(v.W / 2 - potW / 2), potTopY: groundY - potH,
      w0: Math.max(5, Math.round(treeH * 0.11))
    };
    streaks.setArea([0, Math.round(v.H * 0.05), v.W, L.groundY - Math.round(treeH * 0.05)]);
    streaksFar.setArea([0, Math.round(v.H * 0.04), v.W, L.groundY - Math.round(treeH * 0.2)]);
    leaves.setArea([0, L.potTopY - treeH, v.W, L.groundY + 6]);
    petals.setArea([L.cx - Math.round(treeH * 0.45), L.potTopY - treeH * 0.95, L.cx + Math.round(treeH * 0.45), L.groundY + 6]);

    var rnd = PK.rng(77), i, k;
    clouds = [];
    for (i = 0; i < 5; i++) {
      var sc = 1 + rnd() * 1.6, n = 3 + Math.floor(rnd() * 3), clumps = [];
      for (k = 0; k < n; k++)
        clumps.push({ dx: Math.round((rnd() * 2 - 1) * 7 * sc), dy: Math.round((rnd() * 2 - 1) * 2 * sc), r: Math.max(2, Math.round((1.5 + rnd() * 2) * sc)) });
      clouds.push({ baseX: rnd() * v.W, y: Math.round(v.H * (0.05 + rnd() * 0.3)), speed: 2 + rnd() * 3, period: v.W + 64, clumps: clumps });
    }
    birds = [];
    for (i = 0; i < 4; i++) {
      birds.push({ baseX: rnd() * v.W, y: Math.round(v.H * (0.1 + rnd() * 0.2)), sp: 3 + rnd() * 3, ph: rnd() * 6 });
    }
  }

  function ridge(cx0, peak, span, col, topCol, seed) {
    var rnd = PK.rng(seed);
    var x0 = Math.max(0, Math.floor(cx0 - span)), x1 = Math.min(L.W, Math.ceil(cx0 + span));
    for (var x = x0; x < x1; x++) {
      var u = (x - cx0) / span;
      var h = Math.round(peak * Math.exp(-u * u * 2.8) * (0.86 + rnd() * 0.28));
      if (h < 2) continue;
      PK.rect(x, L.groundY - h, 1, h, col);
      PK.px(x, L.groundY - h, topCol);
    }
  }

  function buildBG() {
    PK.gradient(0, 0, L.W, L.groundY, PK.skies.dawn);

    // dawn sun, the key light, upper-left
    var sx = Math.round(L.W * 0.18), sy = Math.round(L.H * 0.16);
    PK.glow(sx, sy, Math.max(6, Math.round(L.S * 0.2)), COL.sunHalo, 0.5, 5);
    PK.disc(sx, sy, Math.max(3, Math.round(L.S * 0.05)), COL.sun);
    PK.disc(sx, sy, Math.max(1, Math.round(L.S * 0.05) - 2), COL.sunCore);

    // distant mountains (back plane, desaturated), then rolling hills
    ridge(Math.round(L.W * 0.62), Math.round(L.S * 0.34), Math.round(L.S * 0.52), COL.ridgeFar, COL.ridgeFarTop, 8);
    ridge(Math.round(L.W * 0.28), Math.round(L.S * 0.24), Math.round(L.S * 0.42), COL.ridgeNear, COL.ridgeNearTop, 9);
    PK.disc(Math.round(L.W * 0.8), L.groundY + Math.round(L.S * 0.5), Math.round(L.S * 0.55), COL.hillFar);
    PK.disc(Math.round(L.W * 0.12), L.groundY + Math.round(L.S * 0.62), Math.round(L.S * 0.62), COL.hillNear);

    // stone ledge: lit top face, body, front, hard edge
    for (var y = L.groundY; y < L.H; y++) {
      var d = L.H - 1 - y, rel = y - L.groundY;
      var c = d <= 0 ? COL.edge : rel >= 3 && d <= 5 ? COL.front : rel >= 3 ? COL.face2 : rel >= 1 ? COL.face : COL.faceHi;
      PK.rect(0, y, L.W, 1, c);
    }
    var r1 = PK.rng(41);
    for (var x = 0; x < L.W; x++) if (r1() < 0.4) PK.px(x, L.groundY, COL.faceHi);
    var r2 = PK.rng(23);
    for (var cn = 0; cn < Math.max(2, Math.round(L.W / 40)); cn++) {
      var cy2 = L.groundY + 2 + Math.floor(r2() * Math.max(1, L.H - L.groundY - 5));
      var x2 = Math.floor(r2() * L.W * 0.8), ln = 4 + Math.floor(r2() * 10);
      for (var s = 0; s < ln; s++, x2++) { if (r2() < 0.25) cy2 += r2() < 0.5 ? -1 : 1; PK.px(x2, cy2, COL.crack); }
    }
    for (var i = 0; i < L.W * 0.06; i++)
      PK.px(Math.floor(r2() * L.W), L.groundY + 1 + Math.floor(r2() * Math.max(1, L.H - L.groundY - 3)), r2() < 0.5 ? COL.front : COL.faceHi);

    // cast shadow from the pot, falling right (key light from upper-left)
    for (var xs = L.potX - 2; xs <= L.potX + L.potW + 8; xs++) {
      var u2 = (xs - (L.potX - 2)) / (L.potW + 10);
      var dens = Math.max(0, 1 - Math.abs(u2 - 0.55) * 1.5);
      var th = [0.9, 0.6, 0.32];
      for (var k = 0; k < 3; k++)
        if (PK.bayer(xs, L.groundY + k) < th[k] * (0.35 + 0.65 * dens)) PK.px(xs, L.groundY + k, COL.shadow);
    }
    // pebbles around the base
    var r3 = PK.rng(31);
    for (var pn = 0; pn < 6; pn++) {
      var px2 = L.potX - 9 + Math.floor(r3() * (L.potW + 18));
      var py2 = L.groundY + 1 + Math.floor(r3() * 3);
      if (px2 > L.potX + 2 && px2 < L.potX + L.potW - 2) continue;
      PK.px(px2, py2, COL.pebbleSh); PK.px(px2 + 1, py2, COL.pebbleSh); PK.px(px2, py2 - 1, COL.pebble);
    }

    // soil mound behind the pot rim
    PK.rect(L.potX + 2, L.potTopY - 2, L.potW - 4, 3, COL.soil);
    PK.rect(L.potX + 3, L.potTopY - 2, L.potW - 6, 1, COL.soilHi);
    PK.rect(L.potX + 2, L.potTopY, L.potW - 4, 1, COL.soilLo);
    var sr = PK.rng(19);
    for (var j = 0; j < Math.round(L.potW * 0.3); j++)
      PK.px(L.potX + 3 + Math.floor(sr() * (L.potW - 6)), L.potTopY - 1, sr() < 0.5 ? COL.moss : sr() < 0.75 ? COL.pebbleSoil : leaf[2]);
  }

  // Bonsai cloud pad: organic multi-bump top silhouette, ragged 1-3 px notched edges,
  // flat shaded bottom; per-column light from the top-left, shade on the right/under.
  // Returns { top[], bot[], x0 } so blossoms can be placed inside the silhouette.
  function cloudPad(cx, cy, rx, ry, seed) {
    var rnd = PK.rng(seed);
    var nb = 4 + Math.floor(rnd() * 3), bumps = [], k, b;
    for (k = 0; k < nb; k++)
      bumps.push({ p: (k + 0.5) / nb + (rnd() - 0.5) * 0.2, a: 0.5 + rnd() * 0.7, w: 0.16 + rnd() * 0.16 });
    var w = rx * 2 + 5;
    var r2 = PK.rng(seed + 555), rag = [], gap = [], run = 0, rv = 0, g = 0, gv = 0;
    for (var i = 0; i < w; i++) {
      if (run-- <= 0) { rv = Math.floor(r2() * 3) - 1; run = 1 + Math.floor(r2() * 2); }
      rag[i] = rv;
      if (g-- <= 0) { gv = r2() < 0.1 ? 1 : 0; g = 2 + Math.floor(r2() * 4); }
      gap[i] = gv && i > 3 && i < w - 4;
    }
    var prof = { top: [], bot: [], x0: cx - rx - 2 };
    for (i = 0; i < w; i++) {
      var u = (i - 2) / (rx * 2 + 0.001);
      prof.top[i] = null;
      if (u < 0 || u > 1) continue;
      var hgt = 0;
      for (k = 0; k < bumps.length; k++) { b = bumps[k]; var d = (u - b.p) / b.w; hgt += b.a * Math.exp(-d * d * 1.7); }
      hgt = Math.min(1, hgt);
      var te = Math.max(0, 1 - (2 * u - 1) * (2 * u - 1));
      var t = cy - Math.round(ry * (0.25 + 0.85 * hgt) * Math.pow(te, 0.25)) + rag[i];
      var bo = cy + Math.round(ry * 0.5 * Math.pow(te, 0.5));
      if (gap[i] || bo - t < 3) continue;
      prof.top[i] = t; prof.bot[i] = bo;
      var xs = prof.x0 + i, side = (xs - cx) / rx, y;
      for (y = t; y <= bo; y++) {
        var c = leaf[2];
        if (y === t) c = side < 0.35 ? (side < -0.15 ? leaf[4] : leaf[3]) : leaf[2];
        else if (y === bo || (y === bo - 1 && side > 0.15)) c = leaf[0];
        else if (y >= bo - 1) c = leaf[1];
        else if (side > 0.55 && PK.bayer(xs, y) > 0.45) c = leaf[1];
        else if (side > 0.85 && PK.bayer(xs, y) > 0.7 && y > cy - 1) c = leaf[0];
        else if (side < -0.2 && PK.bayer(xs, y) < 0.14) c = leaf[3];
        PK.px(xs, y, c);
      }
      if (side < -0.6 && t + 2 <= bo) PK.px(xs, t + 1, leaf[3]);
    }
    // stray leaf specks just past the silhouette
    var r3 = PK.rng(seed + 911);
    for (k = 0; k < 5; k++) {
      var ii = 3 + Math.floor(r3() * (w - 6));
      if (!prof.top[ii] || prof.top[ii - 2] || prof.top[ii + 2]) continue;
      PK.px(prof.x0 + ii + (r3() < 0.5 ? -1 : 1), prof.top[ii] + Math.floor(r3() * 4), leaf[2]);
    }
    return prof;
  }

  function padBlossoms(pd, prof, idx) {
    var r = PK.rng(900 + idx * 13), m = Math.max(4, Math.round(pd.rx * 0.5));
    for (var k = 0; k < m * 2; k++) {
      var i = 3 + Math.floor(r() * (prof.top.length - 6));
      var t = prof.top[i];
      if (t === null || t === undefined) continue;
      var y = t + 1 + Math.floor(r() * Math.max(1, Math.min(3, prof.bot[i] - t - 2)));
      if (y > prof.bot[i] - 1) continue;
      PK.px(prof.x0 + i, y, r() < 0.55 ? COL.petalLight : COL.petalDark);
    }
  }

  function drawTree(t) {
    var h = L.treeH, wind = windLevel(t), w0 = L.w0;
    function sx(f) {
      return Math.round(0.05 * h * wind * f * f * (0.62 * Math.sin(t * 1.7 + f * 2.2) + 0.4 * Math.sin(t * 0.85 + 1.1)));
    }
    var ox = L.cx - Math.round(h * 0.02), oy = L.potTopY - 1;
    var c1 = tpLocal(0.30, h), p1 = tpLocal(0.52, h), c2 = tpLocal(0.72, h), p2 = tpLocal(0.87, h);

    // root flare
    PK.limb(ox, oy, ox - w0, oy + 1, ox - Math.round(w0 * 1.7), oy + 2, Math.max(2, Math.round(w0 * 0.55)), 1, bark, 3);
    PK.limb(ox, oy, ox + w0, oy + 1, ox + Math.round(w0 * 1.7), oy + 2, Math.max(2, Math.round(w0 * 0.55)), 1, bark, 4);
    // trunk, two shaded segments
    var pts1 = PK.limb(ox, oy, ox + c1.x + sx(0.3), oy + c1.y, ox + p1.x + sx(0.52), oy + p1.y, w0, Math.max(3, Math.round(w0 * 0.7)), bark, 21);
    var pts2 = PK.limb(ox + p1.x + sx(0.52), oy + p1.y, ox + c2.x + sx(0.72), oy + c2.y, ox + p2.x + sx(0.87), oy + p2.y, Math.max(3, Math.round(w0 * 0.7)), 2, bark, 22);
    // continuous lit rim on the left, dark rim on the right, bark clusters right of centre
    var tr = PK.rng(57), i, p;
    [pts1, pts2].forEach(function (pts) {
      for (i = 0; i < pts.length; i += 2) {
        p = pts[i];
        if (p.r >= 2) { PK.px(p.x - p.r + 1, p.y, tr() < 0.3 ? bark[4] : bark[3]); PK.px(p.x + p.r - 1, p.y, bark[0]); }
        else if (p.r >= 1.5) PK.px(p.x + p.r - 1, p.y, bark[1]);
      }
      for (i = 1; i < pts.length - 2; i += 4) {
        p = pts[i];
        if (p.r < 3 || tr() < 0.5) continue;
        var bx = p.x + Math.round(tr() * p.r * 0.6), hh = 2 + Math.floor(tr() * 2);
        for (var q = 0; q < hh; q++) {
          PK.px(bx, p.y + q, tr() < 0.8 ? bark[0] : bark[1]);
          if (tr() < 0.4) PK.px(bx + 1, p.y + q, bark[1]);
        }
      }
    });

    // branches with a cloud pad on each tip
    var pads = [];
    PADSPEC.forEach(function (s, i) {
      var r = tpLocal(s.f, h), rsw = sx(s.f);
      var rx0 = ox + r.x + rsw, ry0 = oy + r.y;
      var tipX = rx0 + s.side * Math.round(s.len * h), tipY = ry0 - Math.round(0.06 * h);
      PK.limb(rx0, ry0, Math.round((rx0 + tipX) / 2), ry0 + Math.round(0.03 * h), tipX, tipY, Math.max(2, Math.round(w0 * (0.42 - i * 0.09))), 1, bark, 31 + i);
      pads.push({
        x: tipX + s.side * Math.round(s.rx * h * 0.12) + Math.round(0.6 * wind * Math.sin(t * 1.9 + i * 1.7)),
        y: tipY - Math.round(s.ry * h * 0.45),
        rx: Math.round(s.rx * h), ry: Math.max(3, Math.round(s.ry * h)), i: i
      });
    });
    // apex pad
    pads.push({
      x: ox + p2.x + sx(0.87) + Math.round(0.6 * wind * Math.sin(t * 1.9 + 5.1)),
      y: oy + p2.y - Math.round(0.06 * h * 0.5),
      rx: Math.round(0.13 * h), ry: Math.max(3, Math.round(0.06 * h)), i: 3
    });
    pads.sort(function (a, b) { return b.y - a.y; }); // lower pads first so upper ones overlap
    pads.forEach(function (pd) {
      var prof = cloudPad(pd.x, pd.y, pd.rx, pd.ry, 201 + pd.i * 7);
      padBlossoms(pd, prof, pd.i);
    });
  }

  function drawPot() {
    var x0 = L.potX, topY = L.potTopY;
    // tapering body: lit on the left third, shaded toward the right, darker toward the base
    var bodyTop = topY + 3, bodyBot = L.groundY - 3;
    for (var y = bodyTop; y <= bodyBot; y++) {
      var u = (y - bodyTop) / Math.max(1, bodyBot - bodyTop);
      var half = L.potW / 2 - (L.potW / 2 - L.potW * 0.38) * u;
      var xl = Math.round(x0 + (L.potW / 2 - half)), xr = Math.round(x0 + L.potW / 2 + half);
      for (var x = xl; x < xr; x++) {
        var lx = (x - xl) / Math.max(1, xr - xl), c = clay[2];
        if (lx < 0.22) c = clay[3];
        if (lx > 0.82) c = clay[1];
        if (lx > 0.93) c = clay[0];
        if (u > 0.75 && PK.bayer(x, y) < 0.5) c = clay[1];
        PK.px(x, y, c);
      }
    }
    // overhanging rim with lit top face, shadow under the lip
    PK.rect(x0 - 1, topY, L.potW + 2, 1, clay[3]);
    PK.rect(x0 - 1, topY + 1, L.potW + 2, 1, clay[2]);
    PK.rect(x0 - 1, topY + 2, L.potW + 2, 1, clay[1]);
    for (var rx2 = x0 - 1; rx2 < x0 + Math.round(L.potW * 0.55); rx2++) // lit top face
      if (PK.bayer(rx2, topY) < 0.8) PK.px(rx2, topY, clay[4]);
    for (rx2 = x0 + Math.round(L.potW * 0.3); rx2 < x0 + L.potW + 1; rx2++) // under-lip shadow
      if (PK.bayer(rx2, topY + 3) < 0.7) PK.px(rx2, topY + 3, clay[0]);
    PK.rect(x0 - 1, topY, 2, 2, clay[4]); // left rim highlight
    PK.px(x0 + L.potW, topY, clay[0]);    // right cap, shadow side
    PK.px(x0 + L.potW, topY + 1, clay[0]);
    // feet
    var fw = Math.max(4, Math.round(L.potW * 0.13));
    PK.rect(x0 + Math.round(L.potW * 0.12), L.groundY - 2, fw, 2, clay[0]);
    PK.rect(x0 + L.potW - fw - Math.round(L.potW * 0.12), L.groundY - 2, fw, 2, clay[0]);
  }

  function drawClouds(t) {
    clouds.forEach(function (c) {
      var x = ((c.baseX - t * c.speed) % c.period + c.period) % c.period - 32;
      if (x < -40 || x > L.W + 10) return;
      c.clumps.forEach(function (cl) {
        PK.disc(x + cl.dx, c.y + cl.dy + 2, cl.r, COL.cloudShadow);
        PK.disc(x + cl.dx, c.y + cl.dy, cl.r, COL.cloudMid);
        PK.disc(x + cl.dx - 1, c.y + cl.dy - 1, Math.max(1, cl.r - 1), COL.cloudLit);
      });
    });
  }

  function drawBirds(t) {
    birds.forEach(function (b) {
      var period = L.W + 30;
      var x = ((b.baseX - t * b.sp) % period + period) % period - 15;
      if (x < 0 || x > L.W - 2) return;
      var off = Math.sin(t * 6 + b.ph) > 0 ? -1 : 0;
      PK.px(x - 1, b.y + off, COL.bird);
      PK.px(x, b.y, COL.bird);
      PK.px(x + 1, b.y + off, COL.bird);
    });
  }

  // Tapered wind streak: thin bright head, thick middle, thin faint tail, banded alpha.
  function drawStreaks(d, tail, head, alpha) {
    gctx.save();
    d.particles.forEach(function (p) {
      var sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, len = Math.max(2, p.len);
      for (var s = 0; s < len; s++) {
        var tt = len > 1 ? s / (len - 1) : 0;
        var band = Math.max(1, Math.ceil(Math.sin(Math.PI * Math.min(1, 0.1 + tt * 0.85)) * 3)) / 3;
        gctx.globalAlpha = alpha * band;
        var x = p.x - ux * s, y = p.y - uy * s, c = s > len - 3 ? tail : head;
        PK.px(x, y, c);
        if (band >= 0.66) PK.px(x - uy, y + ux, c);
      }
    });
    gctx.globalAlpha = 1;
    gctx.restore();
  }

  PK.fit(canvas, 140, function (v) {
    makeLayout(v);
    bg = PK.layer(v.W, v.H, buildBG);
  });

  PK.loop(function (t, dt) {
    PK.blit(bg);
    drawClouds(t);
    drawBirds(t);
    streaksFar.step(dt);
    drawStreaks(streaksFar, COL.windFarTail, COL.windFarHead, 0.5);
    streaks.step(dt);
    drawStreaks(streaks, COL.windTail, COL.windHead, 0.8);
    drawTree(t);
    drawPot();
    leaves.step(dt);
    leaves.dots([leaf[1], leaf[2], leaf[3], leaf[4]]);
    petals.step(dt);
    petals.dots([COL.petalDark, COL.petalLight]);
  });
})();
