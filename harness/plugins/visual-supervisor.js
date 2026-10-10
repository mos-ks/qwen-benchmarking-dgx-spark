// visual-supervisor: when a session goes idle after writing a web page, look at the page and
// send the critique back as the next turn, up to VISUAL_SUPERVISOR_ROUNDS times.
//
// Why a plugin and not a rule: models told "check your page with look" mostly do not (one run
// called look 0 times and shipped a blank page with a JS error, another called it 19 times and
// ran out of time). The harness decides when to look and how often; the model only fixes.
import { appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const MAX_ROUNDS = Number(process.env.VISUAL_SUPERVISOR_ROUNDS ?? 4);
// Keep polishing while the critic scores below this and time remains: a model that is "done" at
// minute 11 of a 28-minute budget leaves quality on the table.
const TARGET_SCORE = Number(process.env.VISUAL_SUPERVISOR_TARGET ?? 8);
const BUDGET_MIN = Number(process.env.VISUAL_SUPERVISOR_BUDGET_MIN ?? 25);
const PAGE = process.env.VISUAL_SUPERVISOR_PAGE ?? "index.html";
// From this minute on, tool results in a page-building session carry a wrap-up note (at most every
// NUDGE_EVERY_MIN). Without it a model verified its own dashboard with a self-written Playwright
// script for the whole 45 minutes and never stopped, so the supervisor never got a turn.
const WRAP_UP_MIN = Number(process.env.VISUAL_SUPERVISOR_WRAP_UP_MIN ?? 20);
const NUDGE_EVERY_MIN = Number(process.env.VISUAL_SUPERVISOR_NUDGE_EVERY_MIN ?? 3);
// One mid-course look. An agent that keeps building never goes idle, so the supervisor never got a
// turn: a lighthouse shipped as a tiny tower on an empty sea after 27 minutes without a stop. At this
// minute the harness looks once and puts the critique into the tool result the agent reads next.
// Set to "off" to disable.
const CHECKPOINT_MIN = Number(process.env.VISUAL_SUPERVISOR_CHECKPOINT_MIN ?? 10);
// Keep the best round: models often make a page worse while "fixing" it (scores 8 then 7), so the
// harness snapshots the project after every critique that beats the best so far, restores that
// snapshot when a round scores lower, and leaves the best version on disk when supervision ends.
const SNAP = ".supervisor-best";
const SNAP_MAX_BYTES = 20 * 1024 * 1024;
const SKIP = new Set(["node_modules", "dist", "build"]);
const sessions = new Map(); // sessionID -> { started, rounds, done, nudged, best, bestCritique }
const LOG = process.env.VISUAL_SUPERVISOR_LOG;
function log(msg) {
  if (LOG) appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`);
}

function textOf(parts) {
  return (parts ?? []).filter((p) => p.type === "text").map((p) => p.text).join("\n");
}

async function firstUserRequest(client, id) {
  const res = await client.session.messages({ path: { id } });
  const msgs = res.data ?? res;
  const first = msgs.find((m) => m.info?.role === "user");
  return first ? textOf(first.parts) : "";
}

function session(id) {
  let s = sessions.get(id);
  if (!s) {
    s = { started: Date.now(), rounds: 0, done: false, nudged: 0 };
    sessions.set(id, s);
  }
  return s;
}

function projectEntries(directory) {
  return readdirSync(directory).filter((n) => !n.startsWith(".") && !SKIP.has(n));
}

function sizeOf(path) {
  const st = lstatSync(path);
  if (st.isSymbolicLink()) return 0;
  if (!st.isDirectory()) return st.size;
  return readdirSync(path).reduce((sum, n) => sum + sizeOf(join(path, n)), 0);
}

function snapshot(directory) {
  const entries = projectEntries(directory);
  const bytes = entries.reduce((sum, n) => sum + sizeOf(join(directory, n)), 0);
  if (bytes > SNAP_MAX_BYTES) return false;
  const dst = join(directory, SNAP);
  rmSync(dst, { recursive: true, force: true });
  mkdirSync(dst, { recursive: true });
  for (const n of entries) cpSync(join(directory, n), join(dst, n), { recursive: true });
  return true;
}

// Overwrites the snapshotted files only; files created after the snapshot are left alone.
function restore(directory) {
  const src = join(directory, SNAP);
  if (!existsSync(src)) return false;
  for (const n of readdirSync(src)) cpSync(join(src, n), join(directory, n), { recursive: true, force: true });
  return true;
}

function wroteThePage(directory, s) {
  const page = join(directory, PAGE);
  // The kernel stamps files with a coarse clock that can trail Date.now() by a few ms.
  return existsSync(page) && statSync(page).mtimeMs >= s.started - 2000;
}

export const VisualSupervisor = async ({ client, $, directory }) => ({
  event: async ({ event }) => {
    try {
      await handle({ client, $, directory, event });
    } catch (err) {
      log(`error: ${err?.stack ?? err}`);
    }
  },
  "tool.execute.after": async (input, output) => {
    try {
      await checkpoint({ client, $, directory }, input, output);
      nudge(directory, input, output);
    } catch (err) {
      log(`tool hook error: ${err?.stack ?? err}`);
    }
  },
});

async function runLook({ client, $, directory }, id) {
  const request = (await firstUserRequest(client, id)).slice(0, 1500);
  const goal = request || "the page the user asked for";
  const out = await $`look ${PAGE} --goal ${goal}`
    .cwd(directory)
    .env({ ...process.env, LOOK_MAX_ROUNDS: "1000" })
    .quiet()
    .nothrow()
    .text();
  log(`look returned ${out.length} chars: ${out.slice(0, 160).replace(/\n/g, " ")}`);
  const score = Number((out.match(/SCORE:\s*(\d+(?:\.\d+)?)/i) || [])[1] ?? NaN);
  return { out, score, critique: out.replace(/^screenshots:.*$/m, "").trim() };
}

async function checkpoint(ctx, input, output) {
  if (!(CHECKPOINT_MIN >= 0) || process.env.VISUAL_SUPERVISOR === "off" || typeof output?.output !== "string") return;
  const s = session(input.sessionID);
  if (s.checkpointed || s.done || s.rounds > 0) return;
  const elapsedMin = (Date.now() - s.started) / 60000;
  if (elapsedMin < CHECKPOINT_MIN || !wroteThePage(ctx.directory, s)) return;
  s.checkpointed = true;
  const { out, score, critique } = await runLook(ctx, input.sessionID);
  log(`checkpoint ${input.sessionID} score=${score} at ${elapsedMin.toFixed(1)}min`);
  if (!/VERDICT:/i.test(out)) return;
  // Snapshot only: restoring files under an agent that is mid-edit would only confuse it.
  if (Number.isFinite(score) && (s.best === undefined || score > s.best) && snapshot(ctx.directory)) {
    s.best = score;
    s.bestCritique = critique;
  }
  output.output +=
    `\n\n[mid-course visual check by the harness at minute ${Math.round(elapsedMin)}, not part of the tool output] ` +
    `A vision model looked at ${PAGE} as it is now:\n\n${critique}\n\n` +
    `Fold the unmet requirements and top fixes into the work you are doing now. If the page is still unfinished, finish it first. ` +
    `Do not run look yourself; the harness checks again when you stop.`;
}

function nudge(directory, input, output) {
  if (!WRAP_UP_MIN || process.env.VISUAL_SUPERVISOR === "off" || typeof output?.output !== "string") return;
  const s = session(input.sessionID);
  const elapsedMin = (Date.now() - s.started) / 60000;
  if (elapsedMin < WRAP_UP_MIN || (Date.now() - s.nudged) / 60000 < NUDGE_EVERY_MIN) return;
  if (!wroteThePage(directory, s)) return;
  s.nudged = Date.now();
  const used = Math.round(elapsedMin);
  const note =
    used >= BUDGET_MIN
      ? `${used} minutes used, the budget was about ${BUDGET_MIN}. Stop now: no more checks or polish.`
      : `${used} of about ${BUDGET_MIN} minutes used. The harness screenshots and critiques ${PAGE} every time you stop, ` +
        `so do not write your own check scripts or verification loops. Finish the change you are making, then stop.`;
  output.output += `\n\n[note from the harness, not from the tool] ${note}`;
  log(`nudge ${input.sessionID} tool=${input.tool} at ${elapsedMin.toFixed(1)}min`);
}

async function handle({ client, $, directory, event }) {
  {
    const id = event.properties?.sessionID;
    if (!id || process.env.VISUAL_SUPERVISOR === "off") return;
    const s = session(id);
    if (event.type !== "session.idle" || s.done) return;

    const page = join(directory, PAGE);
    log(`idle ${id} page=${existsSync(page)} rounds=${s.rounds}`);
    // Only sessions that wrote or changed the page in this session: everything else is not UI work.
    if (!wroteThePage(directory, s)) return;
    // After the last fix round there is one more look, so a final regression is still reverted.
    const lastLook = s.rounds >= MAX_ROUNDS;

    const { out, score, critique } = await runLook({ client, $, directory }, id);
    const elapsedMin = (Date.now() - s.started) / 60000;
    log(`score=${score} elapsed=${elapsedMin.toFixed(1)}min`);
    let regressed = false;
    if (Number.isFinite(score)) {
      if (s.best === undefined || score > s.best) {
        if (snapshot(directory)) {
          s.best = score;
          s.bestCritique = critique;
          log(`best=${score} snapshot saved`);
        }
      } else if (score < s.best && restore(directory)) {
        regressed = true;
        log(`score ${score} < best ${s.best}: restored the best version`);
      }
    }
    const finished =
      (Number.isFinite(score) ? score >= TARGET_SCORE : /VERDICT:\s*GOOD/i.test(out)) || elapsedMin >= BUDGET_MIN;
    if (finished || lastLook || !/VERDICT:/i.test(out)) {
      // Done, or look could not render or reach the model: stop, and leave the best version on disk.
      s.done = true;
      return;
    }
    log(`verdict not good, round ${s.rounds + 1}`);
    s.rounds += 1;
    const head = `Automatic visual check, round ${s.rounds} of ${MAX_ROUNDS} (sent by the harness, not the user). The target is ${TARGET_SCORE}/10 and there is time left to reach it. `;
    const text = regressed
      ? head +
        `Your last changes made the page worse (${score}/10, below the best version so far at ${s.best}/10), so the harness restored the best version on disk. ` +
        `This was the critique of that best version:\n\n${s.bestCritique}\n\n` +
        `Make one different, smaller fix for the most important unmet requirement. Re-read the files first: they changed. ` +
        `Do not run look yourself; the harness checks again when you stop.`
      : head +
        `A vision model looked at ${PAGE} in a browser:\n\n${critique}\n\n` +
        `Fix the console errors first, then the unmet requirements, then the top fixes. Keep what already works. ` +
        `Do not run look yourself; the harness checks again when you stop.`;
    // Not awaited: the follow-up turn ends in its own session.idle, which re-enters this handler.
    client.session.prompt({ path: { id }, body: { parts: [{ type: "text", text }] } }).catch(() => {});
  }
}
