// Hidden acceptance tests for the ts_garden case. Run from the agent's workspace after tsc, so
// the modules under test are the agent's own build output in ./dist.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const load = (rel) => import(pathToFileURL(join(process.cwd(), "dist", "src", rel)).href);
const { Garden } = await load("garden.js");
const { FileStorage } = await load("storage.js");
const { renderStatus } = await load("status.js");
const { theme } = await load("theme.js");

class MemoryStorage {
  state = null;
  saves = 0;
  load() { return this.state === null ? null : { ...this.state }; }
  save(s) { this.state = { ...s }; this.saves += 1; }
}
const waterN = (g, n) => { for (let i = 0; i < n; i++) g.water(); };

test("fresh garden is a seed with no water", () => {
  const g = new Garden(new MemoryStorage());
  assert.equal(g.stage, "seed");
  assert.equal(g.waterCount, 0);
});

test("five waterings advance one stage and reset the count", () => {
  const g = new Garden(new MemoryStorage());
  waterN(g, 4);
  assert.equal(g.stage, "seed");
  assert.equal(g.waterCount, 4);
  g.water();
  assert.equal(g.stage, "sprout");
  assert.equal(g.waterCount, 0);
  waterN(g, 7);
  assert.equal(g.stage, "sapling");
  assert.equal(g.waterCount, 2);
});

test("bonsai is final and watering it changes nothing", () => {
  const g = new Garden(new MemoryStorage());
  waterN(g, 15);
  assert.equal(g.stage, "bonsai");
  assert.equal(g.waterCount, 0);
  waterN(g, 12);
  assert.equal(g.stage, "bonsai");
  assert.equal(g.waterCount, 0);
});

test("state is saved after every watering", () => {
  const s = new MemoryStorage();
  const g = new Garden(s);
  for (let i = 1; i <= 7; i++) {
    g.water();
    assert.ok(s.saves >= i, `expected a save per watering, got ${s.saves} after ${i}`);
    assert.deepEqual(s.load(), { stageIndex: i >= 5 ? 1 : 0, waterCount: i % 5 });
  }
});

test("progress survives a restart through FileStorage", () => {
  const path = join(mkdtempSync(join(tmpdir(), "garden-hidden-")), "state.json");
  waterN(new Garden(new FileStorage(path)), 12);
  const resumed = new Garden(new FileStorage(path));
  assert.equal(resumed.stage, "sapling");
  assert.equal(resumed.waterCount, 2);
  waterN(resumed, 3);
  const again = new Garden(new FileStorage(path));
  assert.equal(again.stage, "bonsai");
  assert.equal(again.waterCount, 0);
});

test("renderStatus matches the specified markup", () => {
  const g = new Garden(new MemoryStorage());
  assert.equal(renderStatus(g), `<p class="status" style="color: ${theme.colors.text}">Stage: Seed (0/5)</p>`);
  waterN(g, 7);
  assert.equal(renderStatus(g), `<p class="status" style="color: ${theme.colors.text}">Stage: Sprout (2/5)</p>`);
  waterN(g, 8);
  assert.equal(renderStatus(g), `<p class="status" style="color: ${theme.colors.accent}">Stage: Bonsai (fully grown)</p>`);
});

test("renderStatus reads colors from the theme at call time", () => {
  const g = new Garden(new MemoryStorage());
  const original = theme.colors.text;
  theme.colors.text = "#010203";
  try {
    assert.match(renderStatus(g), /color: #010203/);
  } finally {
    theme.colors.text = original;
  }
});
