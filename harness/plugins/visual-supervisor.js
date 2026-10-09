// visual-supervisor: when a session goes idle after writing a web page, look at the page and
// send the critique back as the next turn, up to VISUAL_SUPERVISOR_ROUNDS times.
//
// Why a plugin and not a rule: models told "check your page with look" mostly do not (one run
// called look 0 times and shipped a blank page with a JS error, another called it 19 times and
// ran out of time). The harness decides when to look and how often; the model only fixes.
import { appendFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const MAX_ROUNDS = Number(process.env.VISUAL_SUPERVISOR_ROUNDS ?? 3);
const PAGE = process.env.VISUAL_SUPERVISOR_PAGE ?? "index.html";
const sessions = new Map(); // sessionID -> { started, rounds, done }
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

export const VisualSupervisor = async ({ client, $, directory }) => ({
  event: async ({ event }) => {
    try {
      await handle({ client, $, directory, event });
    } catch (err) {
      log(`error: ${err?.stack ?? err}`);
    }
  },
});

async function handle({ client, $, directory, event }) {
  {
    const id = event.properties?.sessionID;
    if (!id || process.env.VISUAL_SUPERVISOR === "off") return;
    let s = sessions.get(id);
    if (!s) {
      s = { started: Date.now(), rounds: 0, done: false };
      sessions.set(id, s);
    }
    if (event.type !== "session.idle" || s.done) return;

    const page = join(directory, PAGE);
    log(`idle ${id} page=${existsSync(page)} rounds=${s.rounds}`);
    // Only sessions that wrote or changed the page in this session: everything else is not UI work.
    if (!existsSync(page) || statSync(page).mtimeMs < s.started) return;
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
    if (/VERDICT:\s*GOOD/i.test(out)) {
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
      `Automatic visual check, round ${s.rounds} of ${MAX_ROUNDS} (sent by the harness, not the user). ` +
      `A vision model looked at ${PAGE} in a browser:\n\n${critique}\n\n` +
      `Fix the console errors first, then the top fixes that are real. Keep what already works. ` +
      `Do not run look yourself; the harness checks again when you stop.`;
    // Not awaited: the follow-up turn ends in its own session.idle, which re-enters this handler.
    client.session.prompt({ path: { id }, body: { parts: [{ type: "text", text }] } }).catch(() => {});
  }
}
