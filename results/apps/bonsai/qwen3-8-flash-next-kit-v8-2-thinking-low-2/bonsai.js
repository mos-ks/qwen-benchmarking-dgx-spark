(function () {
  "use strict";

  var R = PK.ramps;

  // Shallow terracotta bonsai pot: rim slab (rows 0-2), tapered body (3-7), two feet (8-9).
  // 28 cols wide; drawn with the column run stretched to the target pot width.
  var POT_ROWS = (function () {
    function r() {
      return Array.prototype.slice.call(arguments)
        .map(function (p) { return p[0].repeat(p[1]); })
        .join("");
    }
    var rows = [
      r(["o", 28]),
      r(["o", 1], ["h", 1], ["l", 11], ["m", 5], ["s", 9], ["o", 1]),
      r(["o", 1], ["s", 26], ["o", 1])
    ];
    [[2, 25], [3, 24], [3, 24], [4, 23], [4, 23]].forEach(function (b) {
      var L = b[0], Rg = b[1];
      var fill = Rg - L - 3, mc = Math.ceil(fill / 2), sc = fill - mc;
      rows.push(r([".", L], ["o", 1], ["h", 1], ["l", 2], ["m", mc], ["s", sc], ["o", 1], [".", 26 - Rg]));
    });
    var L = 4, Rg = 23, gap = Rg - 2 - (L + 4), right = 28 - (Rg + 1);
    rows.push(r([".", L + 1], ["s", 3], [".", gap], ["s", 3], [".", right]));
    rows.push(r([".", L + 1], ["o", 3], [".", gap], ["o", 3], [".", right]));
    return rows;
  })();
  var POT_PAL = { o: R.clay[0], s: R.clay[1], m: R.clay[2], l: R.clay[3], h: R.clay[4] };

  function qpt(l, t) {
    var u = 1 - t;
    return {
      x: u * u * l.x0 + 2 * u * t * l.cx + t * t * l.x1,
      y: u * u * l.y0 + 2 * u * t * l.cy + t * t * l.y1
    };
  }

  function buildLayout(v) {
    var cx = Math.round(v.W / 2);
    var h = Math.max(40, Math.min(v.portrait ? 96 : 78, Math.round(Math.min(v.W * 0.72, v.H * 0.46))));
    h = Math.min(h, Math.max(40, Math.floor((v.W - 12) / 1.2)));
    var gy = Math.round(Math.min(v.H * 0.82, Math.max(v.H * 0.6, v.H * 0.5 + h * 0.45)));
    var potW = Math.max(22, Math.round(h * 0.55));
    var potTop = gy - POT_ROWS.length;
    var baseY = potTop - 1;
    var seed = 21;
    var w0 = Math.max(5, Math.round(h * 0.13));
    var mid = { x: cx + Math.round(h * 0.13), y: baseY - Math.round(h * 0.44) };
    var apex = { x: cx - Math.round(h * 0.02), y: baseY - Math.round(h * 0.78) };

    var trunkLo = {
      x0: cx, y0: baseY + 1,
      cx: cx - Math.round(h * 0.1), cy: baseY - Math.round(h * 0.2),
      x1: mid.x, y1: mid.y, w0: w0, w1: Math.max(3, Math.round(w0 * 0.5)), seed: seed
    };
    var trunkUp = {
      x0: mid.x, y0: mid.y,
      cx: mid.x + Math.round(h * 0.18), cy: baseY - Math.round(h * 0.62),
      x1: apex.x, y1: apex.y,
      w0: trunkLo.w1, w1: Math.max(2, Math.round(w0 * 0.16)), seed: seed + 1
    };

    function branch(l, t, tip, bw, sd) {
      var o = qpt(l, t);
      return {
        x0: o.x, y0: o.y,
        cx: (o.x + tip.x) / 2, cy: (o.y + tip.y) / 2 + 1,
        x1: tip.x, y1: tip.y,
        w0: bw, w1: 1, seed: sd, tip: tip
      };
    }
    var branches = [
      branch(trunkLo, 0.3, { x: cx + Math.round(h * 0.42), y: baseY - Math.round(h * 0.26) }, Math.max(2, Math.round(w0 * 0.42)), seed + 10),
      branch(trunkLo, 0.82, { x: cx - Math.round(h * 0.4), y: baseY - Math.round(h * 0.44) }, Math.max(2, Math.round(w0 * 0.38)), seed + 11),
      branch(trunkUp, 0.45, { x: apex.x - Math.round(h * 0.24), y: apex.y + Math.round(h * 0.08) }, Math.max(2, Math.round(w0 * 0.32)), seed + 12)
    ];

    function padFor(tip, side, rx) {
      var ry = Math.max(3, Math.round(rx * 0.45));
      return {
        cx: tip.x + side * Math.round(rx * 0.12),
        cy: tip.y - Math.round(ry * 0.45),
        rx: rx, ry: ry
      };
    }
    var pads = [
      padFor(branches[0].tip, 1, Math.round(h * 0.2)),
      padFor(branches[1].tip, -1, Math.round(h * 0.18)),
      padFor(branches[2].tip, -1, Math.round(h * 0.14)),
      { cx: apex.x, cy: apex.y - 2, rx: Math.round(h * 0.15), ry: Math.max(3, Math.round(h * 0.07)) }
    ];
    pads.forEach(function (p, i) { p.phase = i * 1.7; p.seed = seed + 100 + i; });

    return { gy: gy, cx: cx, h: h, potW: potW, potTop: potTop, baseY: baseY, seed: seed, w0: w0, trunkLo: trunkLo, trunkUp: trunkUp, branches: branches, pads: pads };
  }

  function drawStatic(v, L) {
    var gy = L.gy, cx = L.cx, h = L.h;
    PK.gradient(0, 0, 0, gy, PK.skies.dusk);

    var sx = Math.max(8, Math.min(v.W - 8, cx - Math.round(h * 0.78)));
    var sy = Math.max(8, gy - Math.round(h * 1.08));
    PK.glow(sx, sy, Math.round(h * 0.38), "#ffd56a", 0.5, 4);
    var sr = Math.max(3, Math.round(h * 0.09));
    PK.disc(sx, sy, sr + 1, R.warmLight[2]);
    PK.disc(sx, sy, sr, R.warmLight[3]);
    PK.px(sx - 1, sy - 1, R.warmLight[4]);
    PK.px(sx, sy, R.warmLight[4]);

    PK.ellipse(cx - Math.round(h * 1.1), gy + 3, Math.round(h * 1.15), Math.round(h * 0.42), "#6e4a78");
    PK.ellipse(cx + Math.round(h * 0.9), gy + 4, Math.round(h * 1.3), Math.round(h * 0.5), "#59406c");

    var bands = [3, 3, 2, 2, 1, 1];
    for (let y = gy; y < v.H; y++) {
      var f = (y - gy) / Math.max(1, v.H - gy);
      PK.rect(0, y, v.W, 1, R.sand[bands[Math.min(5, Math.floor(f * 6))]]);
    }
    for (let y = gy + 3; y < v.H; y += 4)
      for (let x = 0; x < v.W; x++)
        if (PK.bayer(x, y) < 0.16) PK.px(x, y, R.sand[1]);

    PK.rock(Math.min(cx + Math.round(h * 0.62), v.W - 18), gy + 2, Math.round(h * 0.26), Math.round(h * 0.2), R.stone, { profile: "mound", seed: 3 });
    PK.rock(Math.max(2, cx - Math.round(h * 0.78)), gy + 2, Math.round(h * 0.16), Math.round(h * 0.13), R.stone, { profile: "mound", seed: 8 });

    PK.rect(cx - Math.round(L.potW / 2) - 1, gy, L.potW + 2, 2, R.sand[1]);
    for (let x = cx - Math.round(L.potW / 2) - 1; x < cx + Math.round(L.potW / 2) + 1; x++)
      if (PK.bayer(x, gy + 2) < 0.5) PK.px(x, gy + 2, R.sand[0]);

    var potL = Math.round(cx - L.potW / 2);
    for (let j = 0; j < POT_ROWS.length; j++)
      for (let i = 0; i < POT_ROWS[j].length; i++) {
        var c = POT_PAL[POT_ROWS[j][i]];
        if (!c) continue;
        var x0 = Math.round(potL + (i * L.potW) / 28);
        var x1 = Math.round(potL + ((i + 1) * L.potW) / 28);
        if (x1 > x0) PK.rect(x0, L.potTop + j, x1 - x0, 1, c);
      }

    PK.rect(cx - Math.round(L.potW / 2) + 3, L.potTop - 1, Math.max(4, L.potW - 6), 1, "#3a2a1a");
    [-1, 1].forEach(function (m) {
      var mx = cx + m * (Math.round(L.potW / 2) - 6);
      PK.disc(mx, L.potTop - 1, 2, R.foliage[0]);
      PK.disc(mx - 1, L.potTop - 2, 1, R.foliage[2]);
    });

    [-1, 1].forEach(function (dir) {
      PK.limb(cx + dir * 2, L.baseY + 1, cx + dir * Math.round(h * 0.04), gy - 2,
        cx + dir * Math.round(h * 0.09), gy, Math.max(2, Math.round(L.w0 * 0.55)), 2, R.bark, L.seed + dir * 3);
    });
    PK.limb(L.trunkLo.x0, L.trunkLo.y0, L.trunkLo.cx, L.trunkLo.cy, L.trunkLo.x1, L.trunkLo.y1, L.trunkLo.w0, L.trunkLo.w1, R.bark, L.trunkLo.seed);
    PK.limb(L.trunkUp.x0, L.trunkUp.y0, L.trunkUp.cx, L.trunkUp.cy, L.trunkUp.x1, L.trunkUp.y1, L.trunkUp.w0, L.trunkUp.w1, R.bark, L.trunkUp.seed);
    L.branches.forEach(function (b) {
      PK.limb(b.x0, b.y0, b.cx, b.cy, b.x1, b.y1, b.w0, b.w1, R.bark, b.seed);
    });
  }

  var PAD_DARK = [R.foliage[0], R.foliage[0], R.foliage[1], R.foliage[1], R.foliage[2]];
  var PAD_LIT = [R.foliage[2], R.foliage[3], R.foliage[3], R.foliage[4], R.foliage[4]];

  function drawPad(p, dx, dy) {
    var x = p.cx + dx, y = p.cy + dy;
    var big = Math.max(3, Math.round(p.rx * 0.3));
    PK.pad(x, y + Math.max(2, Math.round(p.ry * 0.5)), p.rx, Math.max(2, Math.round(p.ry * 0.55)), PAD_DARK, { seed: p.seed + 40, r: big, n: 7 });
    PK.pad(x, y, p.rx, p.ry, R.foliage, { seed: p.seed, r: big, n: 9 });
    PK.pad(x - 1, y - Math.max(1, Math.round(p.ry * 0.4)), Math.max(3, Math.round(p.rx * 0.62)), Math.max(2, Math.round(p.ry * 0.5)), PAD_LIT, { seed: p.seed + 7, r: Math.max(2, big - 1), n: 6 });
  }

  function drawGrass(L, t) {
    [-0.5, 0.47].forEach(function (off, gi) {
      var bx = L.cx + Math.round(L.h * off), by = L.gy + 1;
      for (var k = -1; k <= 1; k++) {
        var tipx = bx + k * 2 + (k === 0 ? 0 : k) + Math.round(Math.sin(t * 2.2 + gi * 1.4 + k) * 1);
        var tipy = by - 3 - (gi + k + 2) % 2;
        PK.line(bx + k * 2, by, tipx, tipy, "#2f5d34");
        PK.px(tipx, tipy, "#4a8a3c");
      }
    });
  }

  function main() {
    var canvas = document.getElementById("scene");
    var scene = null;
    var streaks = PK.drift({ n: 46, seed: 5, area: [0, 0, 1, 1], vx: [7, 20], vy: [-1, 1.6], len: [2, 8] });
    var leaves = PK.drift({ n: 30, seed: 9, area: [0, 0, 1, 1], vx: [3.5, 10], vy: [-1.6, 2.4], len: [1, 2] });

    PK.fit(canvas, 140, function (v) {
      var L = buildLayout(v);
      scene = L;
      scene.sortedPads = L.pads.slice().sort(function (a, b) { return b.cy - a.cy; });
      scene.bg = PK.layer(v.W, v.H, function () { drawStatic(v, L); });
      var bottom = Math.max(3, L.gy - 2);
      streaks.setArea([0, 0, v.W, bottom]);
      leaves.setArea([-8, 0, v.W + 8, Math.max(4, L.gy - 1)]);
    });

    PK.loop(function (t, dt) {
      PK.blit(scene.bg);
      drawGrass(scene, t);
      streaks.step(dt);
      streaks.streaks(["#b98a9a", "#f4d6a8"]);
      leaves.step(dt);
      leaves.particles.forEach(function (p) {
        var ly = p.y + Math.round(Math.sin(t * 2.6 + p.k * 12));
        var c = p.k > 0.92 ? R.warmLight[2] : p.k > 0.6 ? R.foliage[3] : R.foliage[2];
        PK.px(p.x, ly, c);
        if (p.len > 1) PK.px(p.x + 1, ly, p.k > 0.6 ? R.foliage[2] : R.foliage[3]);
      });
      scene.sortedPads.forEach(function (p) {
        var hf = (scene.gy - p.cy) / scene.h;
        var dx = Math.round(Math.sin(t * 1.15 + p.phase) * (1.5 + hf * 2.5));
        var dy = Math.round(Math.sin(t * 1.7 + p.phase * 1.3) * 0.8 * hf);
        drawPad(p, dx, dy);
      });
    });
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
    else main();
  }
})();
