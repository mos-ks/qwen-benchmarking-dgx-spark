// visual-supervisor for Pi: the same supervision as kit v7's OpenCode plugin, by calling the shared
// harnesses/supervise.py on the first prompt, after each tool result, and before the run settles.
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const SUPERVISE = process.env.SUPERVISOR_SCRIPT ?? join(homedir(), "local-coder-kit/harnesses/supervise.py");

function call(event: string, ctx: ExtensionContext, extra: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
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

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, ctx) => {
    await call("prompt", ctx, { prompt: event.prompt });
  });

  pi.on("tool_result", async (event, ctx) => {
    const out = await call("tool", ctx);
    const append = typeof out.append === "string" ? out.append : "";
    if (!append) return;
    return {
      content: [...event.content, { type: "text" as const, text: append }],
      structuredContent: event.structuredContent,
    };
  });

  pi.on("agent_before_settle", async (event, ctx) => {
    if (event.outcome !== "completed") return;
    const out = await call("stop", ctx);
    if (out.continue !== true || typeof out.message !== "string") return;
    return {
      entries: [
        ...event.entries,
        { type: "custom_message" as const, customType: "visual-supervisor", content: out.message, display: true },
      ],
      continue: true,
    };
  });
}
