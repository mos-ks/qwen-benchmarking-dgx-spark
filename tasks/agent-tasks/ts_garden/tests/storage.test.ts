import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileStorage } from "../src/storage.js";

test("FileStorage round-trips state", () => {
  const storage = new FileStorage(join(mkdtempSync(join(tmpdir(), "garden-")), "state.json"));
  assert.equal(storage.load(), null);
  storage.save({ stageIndex: 2, waterCount: 3 });
  assert.deepEqual(storage.load(), { stageIndex: 2, waterCount: 3 });
});
