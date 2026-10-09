// visual-supervisor: when a session goes idle after writing a web page, look at the page and
// send the critique back as the next turn, up to VISUAL_SUPERVISOR_ROUNDS times.
//
// Why a plugin and not a rule: models told "check your page with look" mostly do not (one run
// called look 0 times and shipped a blank page with a JS error, another called it 19 times and
// ran out of time). The harness decides when to look and how often; the model only fixes.
import { appendFileSync, existsSync, statSync } from "node:fs";
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
const sessions = new Map(); // sessionID -> { started, rounds, done, nudged }
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

function wroteThePage(directory, s) {
  const page = join(directory, PAGE);
  return existsSync(page) && statSync(page).mtimeMs >= s.started;
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
      nudge(directory, input, output);
    } catch (err) {
      log(`nudge error: ${err?.stack ?? err}`);
    }
  },
});

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
    if (s.rounds >= MAX_ROUNDS) {
      s.done = true;
      return;
    }

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
    const elapsedMin = (Date.now() - s.started) / 60000;
    log(`score=${score} elapsed=${elapsedMin.toFixed(1)}min`);
    if ((Number.isFinite(score) ? score >= TARGET_SCORE : /VERDICT:\s*GOOD/i.test(out)) || elapsedMin >= BUDGET_MIN) {
      s.done = true;
      return;
    }
    if (!/VERDICT:/i.test(out)) {
      // look could not render or reach the model; say nothing rather than send noise.
      s.done = true;
      return;
    }
    log(`verdict not good, round ${s.rounds + 1}`);
    s.rounds += 1;
    const critique = out.replace(/^screenshots:.*$/m, "").trim();
    const text =
      `Automatic visual check, round ${s.rounds} of ${MAX_ROUNDS} (sent by the harness, not the user). The target is ${TARGET_SCORE}/10 and there is time left to reach it. ` +
      `A vision model looked at ${PAGE} in a browser:\n\n${critique}\n\n` +
      `Fix the console errors first, then the unmet requirements, then the top fixes. Keep what already works. ` +
      `Do not run look yourself; the harness checks again when you stop.`;
    // Not awaited: the follow-up turn ends in its own session.idle, which re-enters this handler.
    client.session.prompt({ path: { id }, body: { parts: [{ type: "text", text }] } }).catch(() => {});
  }
}
