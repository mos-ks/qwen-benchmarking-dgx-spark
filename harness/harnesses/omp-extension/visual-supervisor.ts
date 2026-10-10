// visual-supervisor for oh-my-pi: the same supervision as kit v7's OpenCode plugin, by calling the
// shared harnesses/supervise.py on the first prompt, after each tool result, and when the session
// would stop (omp's session_stop accepts a continuation with model-visible context).
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const SUPERVISE = process.env.SUPERVISOR_SCRIPT ?? join(homedir(), "local-coder-kit/harnesses/supervise.py");

type Ctx = { cwd: string; sessionManager: { getSessionId(): string } };

function call(event: string, ctx: Ctx, extra: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const payload = JSON.stringify({ cwd: ctx.cwd, session_id: ctx.sessionManager.getSessionId(), ...extra });
  return new Promise((resolve) => {
    const child = execFile(
      "python3",
      [SUPERVISE, event, "--format", "generic"],
      { timeout: 900_000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout.trim()) return resolve({});
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve({});
        }
      },
    );
    child.stdin?.end(payload);
  });
}

// biome-ignore lint/suspicious/noExplicitAny: the omp ExtensionAPI type lives in the installed package
export default function (pi: any) {
  pi.on("before_agent_start", async (event: { prompt: string }, ctx: Ctx) => {
    await call("prompt", ctx, { prompt: event.prompt });
  });

  pi.on("tool_result", async (event: { content: unknown[] }, ctx: Ctx) => {
    const out = await call("tool", ctx);
    const append = typeof out.append === "string" ? out.append : "";
    if (!append) return;
    return { content: [...event.content, { type: "text", text: append }] };
  });

  pi.on("session_stop", async (_event: unknown, ctx: Ctx) => {
    const out = await call("stop", ctx);
    if (out.continue !== true || typeof out.message !== "string") return;
    return { continue: true, additionalContext: out.message };
  });
}
