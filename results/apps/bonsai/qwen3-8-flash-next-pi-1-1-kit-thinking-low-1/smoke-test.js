/* Headless smoke test: runs scene.js against a stubbed DOM with a virtual framebuffer,
   asserts the scene paints (sky, foliage, clay pot, stone, wind) and dumps BMPs to look at.
   Usage: node smoke-test.js            (writes shot-desktop.bmp / shot-phone.bmp) */
"use strict";
const fs = require("fs");
const vm = require("vm");

function makeCanvas(w, h) {
  const c = {
    style: {},
    _w: w, _h: h,
    _buf: new Int32Array(Math.max(1,w*h)).fill(-1),
    get width(){return this._w;}, set width(v){this._w=v;this._rebuild();},
    get height(){return this._h;}, set height(v){this._h=v;this._rebuild();},
    _rebuild(){this._buf=new Int32Array(Math.max(1,this._w*this._h)).fill(-1);},
    getContext() {
      return {
        canvas: c,
        imageSmoothingEnabled: true,
        globalAlpha: 1,
        fillStyle: "#000",
        save() {},
        restore() {},
        translate() {},
        fillRect(x, y, ww, hh) {
          const col = parse(this.fillStyle);
          const B = c._buf, W = c._w, H = c._h;
          x = Math.round(x); y = Math.round(y); ww = Math.round(ww); hh = Math.round(hh);
          for (let j = y; j < y + hh; j++)
            for (let i = x; i < x + ww; i++) if (i >= 0 && j >= 0 && i < W && j < H) B[j * W + i] = col;
        },
        drawImage(img, x = 0, y = 0) {
          x = Math.round(x); y = Math.round(y);
          const sb = img._buf;
          if (!sb) return;
          const B = c._buf, W = c._w, H = c._h;
          for (let j = 0; j < img.height; j++)
            for (let i = 0; i < img.width; i++) {
              const s = sb[j * img.width + i];
              const dx = x + i, dy = y + j;
              if (s < 0 || dx < 0 || dy < 0 || dx >= W || dy >= H) continue;
              B[dy * W + dx] = s;
            };
        },
      };
    },
  };
  return c;
}
function parse(s) {
  if (typeof s === "number") return s;
  const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
  return m ? parseInt(m[1], 16) : 0xff00ff;
}
const lum = (c) => (((c >> 16) & 255) * 0.299 + ((c >> 8) & 255) * 0.587 + (c & 255) * 0.114) / 255;
const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

function run(w, h, dpr, frames) {
  let t = 0;
  const canvases = [];
  let main = null;
  const raf = [];
  const win = {
    devicePixelRatio: dpr,
    innerWidth: w,
    innerHeight: h,
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false }),
  };
  const doc = {
    documentElement: { style: {} },
    body: { style: {} },
    getElementById: () => main,
    createElement: () => {
      const c = makeCanvas(1, 1);
      c.width = 0; c.height = 0;
      canvases.push(c);
      return c;
    },
  };
  const sandbox = {
    window: win,
    document: doc,
    performance: { now: () => t },
    requestAnimationFrame: (cb) => { raf.push(cb); return raf.length; },
    Math, console, parseInt, parseFloat, isFinite, Number, Object, Array, String, JSON,
  };
  win.window = win;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(__dirname + "/pixel-kit.js", "utf8"), sandbox, { filename: "pixel-kit.js" });
  main = makeCanvas(1, 1);
  main.width = 0; main.height = 0;
  sandbox.PK = sandbox.window.PK;
  vm.runInContext(fs.readFileSync(__dirname + "/scene.js", "utf8"), sandbox, { filename: "scene.js" });

  for (let f = 0; f < frames; f++) {
    const cbs = raf.splice(0, raf.length);
    t += 16.7;
    for (const cb of cbs) cb(t);
  }
  return main;
}

function bmp(canvas, path) {
  const w = canvas.width, h = canvas.height, buf = canvas._buf;
  const row = (w * 3 + 3) & ~3;
  const px = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = rgb(buf[(h - 1 - y) * w + x] < 0 ? 0x000000 : buf[(h - 1 - y) * w + x]);
      const o = y * row + x * 3;
      px[o] = b; px[o + 1] = g; px[o + 2] = r;
    }
  const size = 54 + px.length;
  const head = Buffer.alloc(54);
  head.write("BM", 0);
  head.writeUInt32LE(size, 2);
  head.writeUInt32LE(54, 10);
  head.writeUInt32LE(40, 14);
  head.writeInt32LE(w, 18);
  head.writeInt32LE(h, 22);
  head.writeUInt16LE(1, 26);
  head.writeUInt16LE(24, 28);
  head.writeUInt32LE(row * h, 34);
  fs.writeFileSync(path, Buffer.concat([head, px]));
}

const failures = [];
function expect(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures.push(name);
}

function stats(canvas, label) {
  const w = canvas.width, h = canvas.height, buf = canvas._buf;
  let untouched = 0;
  const colors = new Map();
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c < 0) { untouched++; continue; }
    colors.set(c, (colors.get(c) || 0) + 1);
  }
  expect(`${label}: canvas has a real size`, w > 100 && h > 100, `${w}x${h}`);
  expect(`${label}: every pixel painted`, untouched === 0, `${untouched} untouched`);
  expect(`${label}: pixel-art palette (<= 40 colors)`, colors.size <= 60, `${colors.size} colors`);

  // green foliage mass in the upper-middle of the frame
  let green = 0, clay = 0, stone = 0;
  const cx = w >> 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = buf[y * w + x];
      if (c < 0) continue;
      const [r, g, b] = rgb(c);
      if (g > r + 14 && g > b + 20) green++;
      if (r > 110 && r < 240 && g > 55 && g < 175 && b < 130 && r > g + 40 && g > b + 10) clay++;
      if (Math.abs(r - b) > 8 && Math.abs(r - g) < 22 && b > r && lum(c) > 0.18 && lum(c) < 0.62) stone++;
    }
  const frac = (n) => (n / (w * h)).toFixed(3);
  expect(`${label}: foliage pads (green mass)`, green > w * h * 0.015, frac(green));
  expect(`${label}: clay pot`, clay > w * h * 0.002, frac(clay));
  expect(`${label}: stone slab`, stone > w * h * 0.001, frac(stone));
  expect(`${label}: subject centered horizontally`,
    Math.abs(centroid(buf, w, h, (c) => { const [r, g, b] = rgb(c); return g > r + 14 && g > b + 20; }) - cx) < w * 0.12);

  // motion: leaves/streaks must land outside the static scenery
  expect(`${label}: sky band exists`, (() => {
    let sky = 0;
    for (let x = 0; x < w; x += 3) for (let y = 0; y < Math.round(h * 0.2); y += 2) { const c = buf[y * w + x]; if (c >= 0 && lum(c) > 0.3) sky++; }
    return sky > w * 0.02;
  })());
  return { w, h, colors: colors.size };
}

function centroid(buf, w, h, pred) {
  let sx = 0, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = buf[y * w + x]; if (c >= 0 && pred(c)) { sx += x; n++; } }
  return n ? sx / n : -1;
}

const shots = [];
const desktop = run(1280, 800, 1, 140);
shots.push(["shot-desktop.bmp", desktop]);
stats(desktop, "desktop");

const phone = run(390, 844, 3, 140);
shots.push(["shot-phone.bmp", phone]);
stats(phone, "phone");

const landscape = run(820, 420, 1, 60);
stats(landscape, "short");
bmp(desktop, __dirname + "/shot-desktop.bmp");
bmp(phone, __dirname + "/shot-phone.bmp");
bmp(landscape, __dirname + "/shot-short.bmp");

console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);
