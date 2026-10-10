(function () {
  "use strict";

  const canvas = document.getElementById("c");
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  PK.light.x = 1;
  PK.light.y = -1;

  const P = {
    sky: ["#141a3e", "#2a2350", "#5a2f5e", "#a8425c", "#e0703f", "#f6a850", "#ffd08a"],
    sun: ["#c8502a", "#f08a3a", "#ffc85a", "#fff0b0"],
    cloud: ["#241f47", "#43356a", "#8a4f74", "#e08a64", "#ffd6a4"],
    treeline: ["#152421", "#1d3226", "#27402c", "#33513a"],
    ground: ["#a9c073", "#7ba14c", "#557e35", "#356026", "#20421d"],
    soil: ["#241612", "#3a2416", "#4d3320"],
    sand: ["#4f3826", "#7a5838", "#a67c4c", "#cba268", "#f0d494"],
    brick: ["#2a1418", "#4a2226", "#7a3a30", "#a85a40", "#d08a60"],
    cap: ["#160f0a", "#2e1c12", "#4a2e1c", "#6a4630", "#8a5e3e"],
    wood: ["#1e120c", "#3a2418", "#5a3a24", "#7a5232", "#9a6e46"],
    door: ["#120a06", "#2a180e", "#3e2414", "#5a3a22"],
    glass: ["#7a3b1e", "#c4612a", "#f2a33a", "#ffd56a", "#fff2c0"],
    stem: ["#132418", "#20401d", "#2f5a20", "#46802a", "#6aa83c"],
    tulipR: ["#4a0f1e", "#7a1626", "#b8263a", "#e0525a", "#ff9088"],
    tulipY: ["#5a420e", "#8a6814", "#c9a01f", "#f2c83c", "#ffe98a"],
    tulipP: ["#4a1440", "#7a2468", "#b8408f", "#e273bd", "#ffb2e2"],
    bird: "#20182c",
  };
  const TULIPS = [P.tulipR, P.tulipY, P.tulipP];

  PK.rng(1);
  const rnd = PK.rng(20240517);
  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const n = 4 + Math.floor(rnd() * 4);
    const blobs = [];
    for (let k = 0; k < n; k++) {
      blobs.push({
        bx: k / (n - 1) + (rnd() - 0.5) * 0.12,
        by: (rnd() - 0.5) * 0.5,
        br: 0.26 + rnd() * 0.22,
      });
    }
    clouds.push({ xn: rnd(), yn: 0.06 + rnd() * 0.34, wf: 0.16 + rnd() * 0.14, spd: 1.4 + rnd() * 2.4, blobs, k: rnd() });
  }
  const birds = [];
  for (let i = 0; i < 5; i++) {
    birds.push({ xn: rnd(), yn: 0.08 + rnd() * 0.3, spd: 12 + rnd() * 9, phase: rnd() * 6.28, size: rnd() < 0.4 ? 1 : 2, k: rnd() });
  }

  let view = null;

  function layout(v) {
    v.cx = Math.round(v.W / 2);
    v.gy = Math.round(v.H * 0.72);
    v.towerH = Math.round(v.H * 0.30);
    v.baseW = clamp(Math.round(v.towerH * 0.44), 9, Math.round(v.W * 0.3));
    v.topW = Math.max(5, Math.round(v.baseW * 0.56));
    v.capH = Math.max(4, Math.round(v.towerH * 0.3));
    v.baseTopY = v.gy - v.towerH;
    v.hx = v.cx;
    v.hy = v.baseTopY - Math.round(v.capH * 0.4);
    v.sailLen = Math.round(Math.min(v.towerH * 0.95, v.W / 2 - 7, v.hy - 8));
    v.sunR = Math.max(4, Math.round(v.H * 0.05));
    v.sunX = clamp(v.cx + Math.round(v.W * 0.22), v.sunR + 2, v.W - v.sunR - 2);
    v.sunY = v.gy - Math.round(v.H * 0.05);
    v.nearHalf = Math.max(5, Math.round(v.W * 0.11));
    v.farHalf = Math.max(2, Math.round(v.towerH * 0.16));

    v.rows = [];
    const nRows = clamp(Math.round(v.H / 12), 6, 9);
    const fieldTop = v.gy + 2;
    const fieldBot = v.H - 1;
    for (let i = 0; i < nRows; i++) {
      const d = nRows === 1 ? 1 : Math.pow(i / (nRows - 1), 1.7);
      const y = Math.round(lerp(fieldTop, fieldBot, d));
      const s = lerp(0.55, 1.6, d);
      const gap = Math.max(3, Math.round(5.5 * s));
      const row = { y, s, tulips: [] };
      const rr = PK.rng(1000 + i * 77);
      let ci = i % 3;
      for (let x = -2; x < v.W + 2; x += gap) {
        if (Math.abs(x + Math.round((rr() - 0.5) * gap) - v.cx) < v.farHalf + (v.nearHalf - v.farHalf) * d + 1) continue;
        let cIdx = ci;
        if (rr() < 0.28) cIdx = Math.floor(rr() * 3);
        row.tulips.push({ x: x + Math.round((rr() - 0.5) * 3), cIdx, ph: (x + i * 3) * 0.32, dy: Math.round((rr() - 0.5) * 1.4), big: rr() < 0.35 });
      }
      v.rows.push(row);
      ci = (ci + 1) % 3;
    }
  }

  function pathHalf(v, y) {
    const depth = clamp((y - v.gy) / Math.max(1, v.H - 1 - v.gy), 0, 1);
    return v.farHalf + (v.nearHalf - v.farHalf) * depth;
  }

  function buildStatic(v) {
    return PK.layer(v.W, v.H, () => {
      PK.gradient(0, 0, v.W, v.gy + 2, P.sky);

      PK.disc(v.sunX, v.sunY, v.sunR, P.sun[1]);
      PK.disc(v.sunX, v.sunY, Math.round(v.sunR * 0.62), P.sun[2]);
      PK.disc(v.sunX - 1, v.sunY - 1, Math.round(v.sunR * 0.3), P.sun[3]);

      const step = 14;
      const tr = PK.rng(555);
      for (let x = -2; x < v.W + 2; x += step) {
        const h = 2 + Math.floor(tr() * 3);
        PK.pad(x + Math.round((tr() - 0.5) * 6), v.gy + 1, 4 + Math.round(tr() * 3), h, P.treeline, { seed: 30 + x, r: 2, n: 4 });
      }

      PK.gradient(0, v.gy, v.W, v.H + 1, P.ground);

      for (const row of v.rows) {
        for (let x = 0; x < v.W; x++) {
          if (PK.bayer(x, row.y) < 0.5) PK.px(x, row.y, P.ground[3]);
          else if (PK.bayer(x, row.y) < 0.72) PK.px(x, row.y, P.ground[4]);
        }
      }

      for (let y = v.gy; y < v.H; y++) {
        const half = pathHalf(v, y);
        const x0 = Math.round(v.cx - half);
        const x1 = Math.round(v.cx + half);
        const depth = clamp((y - v.gy) / Math.max(1, v.H - 1 - v.gy), 0, 1);
        const body = depth > 0.7 ? 1 : depth > 0.4 ? 2 : 3;
        for (let x = x0; x <= x1; x++) {
          let c = P.sand[body];
          if (PK.bayer(x, y) < 0.14 && (x0 < x && x < x1)) c = P.sand[body - 1 < 0 ? 0 : body - 1];
          PK.px(x, y, c);
        }
        for (let k = 0; k < 2; k++) {
          if (PK.bayer(x0 - k - 1, y) < 0.5) PK.px(x0 - k - 1, y, P.ground[2]);
          if (PK.bayer(x1 + k + 1, y) < 0.5) PK.px(x1 + k + 1, y, P.ground[2]);
        }
      }

      PK.ellipse(v.cx, v.gy, Math.round(v.baseW * 0.85), Math.max(2, Math.round(v.towerH * 0.055)), P.ground[4]);
    });
  }

  function drawTower(v) {
    const { cx, baseW, topW, baseTopY, gy } = v;
    for (let y = baseTopY; y <= gy; y++) {
      const t = (y - baseTopY) / Math.max(1, v.towerH);
      const halfW = lerp(topW / 2, baseW / 2, t);
      const xL = Math.round(cx - halfW);
      const xR = Math.round(cx + halfW);
      const course = Math.floor((y - baseTopY) / 3);
      for (let x = xL; x <= xR; x++) {
        const u = (x - xL) / Math.max(1, xR - xL);
        let idx = u < 0.3 ? 1 : u < 0.72 ? 2 : 3;
        if (u > 0.86 && PK.bayer(x, y) < 0.6) idx = 4;
        const mortar = (y - baseTopY) % 3 === 2;
        const joint = (x + (course % 2) * 2) % 5 === 0;
        let c = P.brick[idx];
        if (mortar && PK.bayer(x, y) < 0.72) c = P.brick[0];
        else if (joint && !mortar && PK.bayer(x, y) < 0.5) c = P.brick[idx < 1 ? 0 : idx - 1];
        if (x === xL) c = P.brick[0];
        if (x === xR) c = P.brick[idx >= 3 ? 3 : idx];
        PK.px(x, y, c);
      }
    }
  }

  function drawCap(v) {
    const { cx, topW, baseTopY, capH } = v;
    const r = Math.round(topW / 2) + 2;
    PK.rect(cx - r, baseTopY - 1, r * 2 + 1, 2, P.cap[1]);
    for (let yy = 0; yy <= capH; yy++) {
      const f = yy / Math.max(1, capH);
      const w = Math.max(1, Math.round(r * Math.sqrt(Math.max(0, 1 - f * f))));
      for (let x = cx - w; x <= cx + w; x++) {
        const u = (x - (cx - w)) / Math.max(1, 2 * w);
        let idx = u > 0.62 ? (f < 0.3 ? 4 : 3) : u > 0.3 ? 2 : f < 0.3 ? 2 : 1;
        if (x <= cx - w) idx = 0;
        PK.px(x, baseTopY - yy, P.cap[idx]);
      }
    }
    PK.px(cx, baseTopY - capH - 1, P.cap[3]);
    PK.px(cx, baseTopY - capH - 2, P.cap[4]);
    PK.px(cx, baseTopY - capH - 3, P.cap[1]);
  }

  function drawDoorWindow(v) {
    const { cx, baseW, baseTopY, gy, towerH } = v;
    const dw = Math.max(4, Math.round(baseW * 0.46));
    const dh = Math.max(6, Math.round(towerH * 0.34));
    const dx0 = cx - Math.round(dw / 2);
    const dyTop = gy - dh;
    for (let x = dx0; x < dx0 + dw; x++) {
      for (let y = dyTop; y <= gy; y++) {
        const topRow = y - dyTop;
        if (topRow < 2 && (x === dx0 || x === dx0 + dw - 1)) continue;
        const u = (x - dx0) / Math.max(1, dw - 1);
        const idx = u < 0.35 ? 1 : u < 0.7 ? 2 : 1;
        PK.px(x, y, P.door[idx]);
      }
    }
    for (let x = dx0 - 1; x <= dx0 + dw; x++) {
      PK.px(x, dyTop - 1, P.wood[2]);
      PK.px(x, gy, P.wood[1]);
    }
    for (let y = dyTop; y <= gy; y++) {
      PK.px(dx0 - 1, y, P.wood[1]);
      PK.px(dx0 + dw, y, P.wood[2]);
    }
    PK.px(dx0 + dw - 2, Math.round(dyTop + dh * 0.6), P.wood[4]);

    const ww = Math.max(3, Math.round(baseW * 0.4));
    const wh = Math.max(3, Math.round(ww * 0.9));
    const wx0 = cx - Math.round(ww / 2);
    const wy0 = baseTopY + Math.round(towerH * 0.3);
    for (let y = wy0; y < wy0 + wh; y++) {
      for (let x = wx0; x < wx0 + ww; x++) {
        const frameX = x === wx0 || x === wx0 + ww - 1 || x === wx0 + Math.floor(ww / 2);
        const frameY = y === wy0 || y === wy0 + wh - 1 || y === wy0 + Math.floor(wh / 2);
        if (frameX || frameY) PK.px(x, y, P.wood[0]);
        else PK.px(x, y, PK.bayer(x, y) < 0.4 ? P.glass[2] : P.glass[3]);
      }
    }
    for (let x = wx0 - 1; x <= wx0 + ww; x++) PK.px(x, wy0 + wh, P.wood[1]);
    PK.px(wx0 - 1, wy0 - 1, P.wood[2]);
    PK.px(wx0 + ww, wy0 - 1, P.wood[0]);
  }

  function drawWindmill(v, t) {
    drawTower(v);
    drawCap(v);
    drawDoorWindow(v);

    const base = t * 1.05;
    const len = v.sailLen;
    for (let s = 0; s < 4; s++) {
      const a = base + (s * Math.PI) / 2;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      const nx = -uy;
      const ny = ux;
      const off = Math.max(3, Math.round(len * 0.3));
      const s0 = Math.round(len * 0.14);
      const s1 = len;
      const P_ = (d, o) => [v.hx + ux * d + nx * o, v.hy + uy * d + ny * o];
      const c0 = P_(s0, 0);
      const c1 = P_(s1, 0);
      const c2 = P_(s1, off);
      const c3 = P_(s0, off);
      PK.poly([c0, c1, c2, c3], P.wood[2]);

      const rung = Math.max(2, Math.round(len * 0.085));
      for (let d = s0; d <= s1; d += rung) {
        const e0 = P_(d, 0);
        const e1 = P_(d, off);
        PK.line(e0[0], e0[1], e1[0], e1[1], P.wood[1]);
      }
      const ml0 = P_(s0, 1);
      const ml1 = P_(s1, 1);
      PK.line(ml0[0], ml0[1], ml1[0], ml1[1], P.wood[3]);
      const rl0 = P_(s0, off);
      const rl1 = P_(s1, off);
      PK.line(rl0[0], rl0[1], rl1[0], rl1[1], P.wood[4]);
      PK.line(c0[0], c0[1], c3[0], c3[1], P.wood[0]);
      PK.line(c1[0], c1[1], c2[0], c2[1], P.wood[3]);

      const yl0 = P_(0, 0);
      const yl1 = P_(len, 0);
      PK.line(yl0[0], yl0[1], yl1[0], yl1[1], P.wood[0]);
      const yb0 = P_(0, 1);
      const yb1 = P_(len, 1);
      PK.line(yb0[0], yb0[1], yb1[0], yb1[1], P.wood[3]);
    }

    PK.disc(v.hx, v.hy, Math.max(2, Math.round(v.topW * 0.5)), P.wood[0]);
    PK.disc(v.hx, v.hy, Math.max(1, Math.round(v.topW * 0.3)), P.wood[2]);
    PK.px(v.hx - 1, v.hy - 1, P.wood[4]);
  }

  function drawSunGlow(v, t) {
    const pulse = 0.5 + 0.08 * Math.sin(t * 1.6);
    PK.glow(v.sunX, v.sunY, Math.round(v.sunR * 2.6), P.sun[1], pulse * 0.7);
    PK.glow(v.sunX, v.sunY, Math.round(v.sunR * 1.5), P.sun[2], pulse);
  }

  function drawWindowGlow(v, t) {
    const cx = v.cx;
    const ww = Math.max(3, Math.round(v.baseW * 0.4));
    const wy0 = v.baseTopY + Math.round(v.towerH * 0.3);
    const cy = wy0 + Math.round(Math.max(3, Math.round(ww * 0.9)) / 2);
    const fl = 0.55 + 0.06 * Math.sin(t * 7 + 1) + 0.04 * Math.sin(t * 13.3);
    PK.glow(cx, cy, Math.max(3, Math.round(ww * 1.4)), P.glass[2], fl * 0.5);
  }

  function drawCloud(c, v) {
    const cw = Math.max(8, Math.round(c.wf * v.W));
    const ch = Math.max(3, Math.round(v.H * 0.045));
    const baseX = Math.round(c.xn * (v.W + cw + 20) - (cw + 20) / 2);
    const cy = Math.round(c.yn * v.H);
    for (const b of c.blobs) {
      const X = baseX + Math.round(b.bx * cw);
      const Y = cy + Math.round(b.by * ch);
      const R = Math.max(1, Math.round(b.br * ch));
      PK.disc(X, Y, R, P.cloud[2]);
      PK.disc(X - 1, Y - 1, Math.max(1, R - 1), P.cloud[3]);
      PK.disc(X - 1, Y - 1, Math.max(1, R - 3), P.cloud[4]);
      PK.disc(X + 1, Y + 1, R, P.cloud[1]);
    }
    for (const b of c.blobs) {
      const X = baseX + Math.round(b.bx * cw);
      const Y = cy + Math.round(b.by * ch);
      const R = Math.max(1, Math.round(b.br * ch));
      for (let x = -R; x <= R; x += 1) {
        if (PK.bayer(X + x, Y + R) < 0.5) PK.px(X + x, Y + R, P.cloud[1]);
        if (PK.bayer(X + x, Y - R) < 0.4) PK.px(X + x, Y - R, P.cloud[4]);
      }
    }
  }

  function drawBird(b, t) {
    const x = Math.round(b.xn * (view.W + 30)) - 15;
    const y = Math.round(b.yn * view.H + Math.sin(t * 1.5 + b.phase) * 1.5);
    const wingUp = Math.sin(t * 9 + b.phase) > 0 ? 1 : 0;
    const s = b.size;
    PK.px(x, y, P.bird);
    PK.px(x + 1, y, P.bird);
    if (wingUp) {
      PK.line(x - 1, y, x - 1 - s, y - 1 - s, P.bird);
      PK.line(x + 2, y, x + 2 + s, y - 1 - s, P.bird);
    } else {
      PK.line(x - 1, y, x - 1 - s, y + 1 + s, P.bird);
      PK.line(x + 2, y, x + 2 + s, y + 1 + s, P.bird);
    }
  }

  function drawTulipHead(x, y, s, ramp, big) {
    const pal = { ".": undefined, h: ramp[3], m: ramp[2], b: ramp[4], r: ramp[1] };
    const rows = s > 1.02 ? ["h.h", "mbm", "rmr"] : ["hm", "rm"];
    const w = rows[0].length;
    PK.sprite(rows, pal, Math.round(x - w / 2), Math.round(y), (Math.round(x) & 1) === 0);
    if (big && s > 1.2) PK.px(Math.round(x), y - 1, ramp[3]);
  }

  function drawTulips(v, t) {
    for (const row of v.rows) {
      const swayAmp = clamp(row.s * 1.4, 0.6, 2.6);
      for (const tp of row.tulips) {
        if (Math.abs(tp.x - v.cx) < pathHalf(v, row.y) + 1) continue;
        const sway = Math.round(Math.sin(t * 2.1 + tp.ph) * swayAmp);
        const baseY = row.y + tp.dy;
        const stemH = Math.max(2, Math.round(3 * row.s));
        const topY = baseY - stemH;
        PK.line(tp.x, baseY, tp.x + sway, topY, P.stem[2]);
        if (row.s > 1.1) {
          PK.line(tp.x, baseY - 1, tp.x - 1, topY + 1, P.stem[1]);
          PK.line(tp.x + 1, baseY - 1, tp.x + 1 + Math.round(sway * 0.5), topY + 1, P.stem[3]);
        }
        drawTulipHead(tp.x + sway, topY - 3, row.s, TULIPS[tp.cIdx], tp.big);
      }
    }
  }

  function frame(t, dt) {
    const v = view;
    if (!v || !v.bg) return;
    PK.blit(v.bg);
    drawSunGlow(v, t);
    for (const c of clouds) {
      c.xn -= (c.spd * dt) / Math.max(40, v.W);
      if (c.xn < -0.08) {
        c.xn = 1.08;
        c.yn = 0.05 + rnd() * 0.34;
      }
      drawCloud(c, v);
    }
    for (const b of birds) {
      b.xn -= (b.spd * dt) / Math.max(40, v.W);
      if (b.xn < -0.03) {
        b.xn = 1.03;
        b.yn = 0.07 + rnd() * 0.3;
      }
      drawBird(b, t);
    }
    drawTulips(v, t);
    drawWindmill(v, t);
    drawWindowGlow(v, t);
  }

  function onResize(v) {
    layout(v);
    v.bg = buildStatic(v);
    view = v;
  }

  PK.fit(canvas, 132, onResize);
  PK.loop(frame);
})();
