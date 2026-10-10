# Qwen benchmarking on DGX Spark

Can a local model on one NVIDIA DGX Spark, wrapped in the right agent harness, build front-end work
at the quality of Claude Opus 5.5, in at most twice Opus's time?

**Not yet.** The best local setup is Qwen3.8-Flash-Next (the strongest model that fits on one
Spark) in OpenCode, with a harness that screenshots the page, critiques it and hands the agent a
tested pixel-art drawing library. It scores 7.5 on the bonsai and lighthouse briefs inside the time
budget, against Opus's 9.0. With thinking switched on at low effort it reached 8.0 on the windmill
brief, which no harness change was tuned on, in Opus's time (17.8 vs 17.7 minutes). See
[Status](#status) for the dashboard and the open experiments.

![Bonsai brief: quality against time](results/charts/bonsai_quality_vs_time.png)

![Best run per brief](results/charts/best_per_brief.png)

## Headline results

| Brief | Opus 5.5 (reference) | Best local run | Gap |
|---|---|---|---|
| Pixel-art bonsai with wind | 9.0 in 14 min | 7.5 in 10.9 min (Qwen3.8-Flash-Next + kit v3) | -1.5 |
| Pixel-art lighthouse at night (held out) | 9.0 in 24.5 min | 8.0 in 15.0 min (Qwen3.8-Flash-Next + kit v7, thinking medium) | -1.0 |
| Pixel-art windmill in a tulip field (held out from every kit change) | 9.0 in 17.7 min | 8.0 in 17.8 min (Qwen3.8-Flash-Next + kit v5, thinking low) | -1.0 |
| Personal finance dashboard (held out) | 9.5 in 11.6 min | 7.5 in 17.9 min (Qwen3.6-35B-A3B + kit v3) and 7.5 in 21.7 min (Qwen3.8-Flash-Next + kit v5.1); 8.0 in 26.7 min, just over budget (Flash-Next + kit v5.1) | -2.0 in budget |

**[Open the results viewer](https://mos-ks.github.io/qwen-benchmarking-dgx-spark/)**: Opus's page
on the left, every local run on a slider on the right, per brief.

Static comparison sheets (Opus first, then runs by score):
[bonsai](results/screenshots/sheet-bonsai.png) ·
[lighthouse](results/screenshots/sheet-lighthouse.png) ·
[dashboard](results/screenshots/sheet-dashboard.png) ·
[windmill](results/screenshots/sheet-windmill.png)

Open the pages live (they animate):

| Brief | Opus 5.5 | Best local run |
|---|---|---|
| Bonsai | [open](https://mos-ks.github.io/qwen-benchmarking-dgx-spark/results/apps/bonsai/opus-5-5-claude-code-ref/) | [open](https://mos-ks.github.io/qwen-benchmarking-dgx-spark/results/apps/bonsai/qwen3-8-flash-next-kit-v3-1/) (Flash-Next + kit v3) |
| Lighthouse | [open](https://mos-ks.github.io/qwen-benchmarking-dgx-spark/results/apps/lighthouse/opus-5-5-claude-code-ref/) | [open](https://mos-ks.github.io/qwen-benchmarking-dgx-spark/results/apps/lighthouse/qwen3-8-flash-next-kit-v7-thinking-medium-1/) (Flash-Next + kit v7, thinking medium) |
| Windmill | [open](https://mos-ks.github.io/qwen-benchmarking-dgx-spark/results/apps/windmill/opus-5-5-claude-code-ref/) | [open](https://mos-ks.github.io/qwen-benchmarking-dgx-spark/results/apps/windmill/qwen3-8-flash-next-kit-v5-thinking-low-1/) (Flash-Next + kit v5, thinking low) |
| Dashboard | [open](https://mos-ks.github.io/qwen-benchmarking-dgx-spark/results/apps/dashboard/opus-5-5-claude-code-ref/) | [open](https://mos-ks.github.io/qwen-benchmarking-dgx-spark/results/apps/dashboard/qwen3-6-35b-a3b-kit-v3-1/) (Qwen3.6-35B-A3B + kit v3) |

All generated pages are in [`results/apps/`](results/apps/) and open directly in a browser; the
frames are in [`results/screenshots/`](results/screenshots/). Raw numbers:
[`results/data/`](results/data/).

## What moved the needle

1. **The harness has to make the model look at its own output.** Telling a model "check your page"
   in its rules does little: one run called the screenshot tool 0 times and shipped a blank page,
   another called it 19 times and ran out of time. Kit v3 moves that decision into the harness: an
   OpenCode plugin screenshots the page whenever the agent stops, a vision model critiques it, and
   the critique goes back as the next turn (3 rounds at most). No broken page has shipped since.
2. **The model needs eyes.** Qwen3-Coder-Next is text-only; it cannot use the loop and drew floating
   circles and blobs in every harness. Vision-capable Qwen3.8-27B and Qwen3.6-35B-A3B can.
3. **Speed decides whether the loop fits the budget.** Qwen3.8-27B (dense, 20 tok/s) produced real
   pixel art with kit v2 but hit the 45-minute limit every time; Qwen3.6-35B-A3B (3B active,
   134.8 tok/s) runs the same loop in 7 to 19 minutes.
4. **Best-of-N removes bad draws but does not raise the ceiling.** Three parallel attempts with the
   vision model picking the winner landed on the same 6.5 as the best single run.
5. **A "write less code" skill hurts visual work.** Ponytail tells the agent to build the smallest
   version that does the core job. On from-scratch pixel art that cut craft (stacked round pads, a
   flat slab pot) without saving time: 6.0 and 6.5 against kit v4's 7.0 and 7.0.
6. **Thinking at low effort beats thinking off.** Every Flash-Next run before kit v5 had thinking
   switched off. Across kits v5 to v7, thinking low averages 7.4 over twelve runs against 6.9 for
   thinking off over nine, never fell below 6.0 (thinking off produced a 3.5), and averaged 7.7 on
   the held-out windmill against 6.8. Medium effort was not better (7.1) and swung more.
7. **Give the agent tested building blocks, not more critique.** The critic kept naming the same
   unmet shapes (jagged rocks, breaking foam) and the model kept failing to draw them; shipping a
   small drawing library (kit v5) fixed those shapes at once.
8. **A small critic needs anchors.** Replaying saved screenshots showed the plain self-critic calling
   7/10 pages 8/10 and stopping the fix loop; three judge-scored example screenshots fixed that
   (Spearman 0.63 to 0.74). A binary checklist made it worse.
9. **Easy, well-scoped coding tasks do not separate anything.** Every model and harness passed five
   small agent tasks and a feature added to an existing codebase. Differences only appear on
   from-scratch and visual work.

![Decode speed](results/charts/decode_speed.png)

## Setup

| | |
|---|---|
| Hardware | 1x NVIDIA DGX Spark (GB10 Grace-Blackwell, 128 GB unified memory, aarch64) |
| Serving | vLLM (OpenAI-compatible API), served name `qwen3-coder` whatever the model; settings per model in [`serving/`](serving/README.md) |
| Harness | [OpenCode](https://opencode.ai) 1.18 in server mode (its HTTP API, the path a user's tools take) |
| Reference | Claude Opus 5.5 as a Claude Code subagent, same brief, same 45-minute limit, allowed to screenshot its page |
| Models | Qwen3-Coder-Next NVFP4 (80B / 3B active), Qwen3.8-27B NVFP4 + MTP-3 (dense), Qwen3.6-35B-A3B NVFP4 + MTP-3 (NVIDIA build), Qwen3.8-Flash-Next NVFP4 (125B / 6B active, in progress) |

### Harness versions

| Version | Adds |
|---|---|
| kit v1 | [`harness/AGENTS.md`](harness/AGENTS.md) rules (done = a check passed, read before writing, check library versions, no summary files, git) and 17 on-demand skills |
| kit v2 | the `pixel-art`, `visual-check` and `dataviz` skills, the [`look`](harness/tools/look) tool (screenshots + vision critique, round budget enforced), thinking off |
| kit v3 | the [`visual-supervisor`](harness/plugins/visual-supervisor.js) OpenCode plugin: the harness runs `look` when the agent stops and sends the critique back, up to 3 rounds |
| best of 3 | three kit v3 sessions in parallel, [`pick`](harness/tools/pick) chooses the winner with the vision model |
| kit v4 | score-driven supervision: the critic first lists the brief's requirements, scores 1 to 10 and names the unmet ones; the plugin keeps sending fixes until 8/10, 4 rounds or 25 minutes. The `pixel-art` skill gains a fill-the-screen rule |
| kit v4 + ponytail | kit v4 with the [ponytail](https://github.com/DietrichGebert/ponytail) "smallest change that works" skill as always-on instructions |
| kit v5 | the `pixel-art` skill ships [`pixel-kit.js`](harness/skills/pixel-art/pixel-kit.js), a tested drawing library the agent copies into the project (full-screen integer scaling, shaded trunks and foliage pads, jagged faceted rocks, rolling sea and foam, beams, glows, particles, text-grid sprites, 16 colour ramps); the agent may read, never edit, the skills folder |
| kit v5.1 | kit v5 plus a wrap-up note: from minute 20 of a page-building session the supervisor appends "the harness checks the page when you stop; do not write your own check scripts; finish and stop" to tool results |
| kit v6 | kit v5.1 plus a calibrated critic (three judge-scored example screenshots from other briefs, see [Critic calibration](#critic-calibration)), measured page checks handed to the critic (blank page, share of pixels that move between frames, phone overflow), and keep-best: the project is snapshotted whenever a round beats the best score and restored when a later round scores lower |
| kit v7 | kit v6 plus one mid-course check: at minute 10 the supervisor looks at the page once and appends the critique to the agent's next tool result |

Third-party skills used (not redistributed here; install from their repos):
[obra/superpowers](https://github.com/obra/superpowers) (TDD, debugging, verification, plans),
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (incremental work, source-driven development, security, API design),
[pbakaus/impeccable](https://github.com/pbakaus/impeccable),
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill),
[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (React, React Native, web design guidelines),
[microsoft/playwright-cli](https://github.com/microsoft/playwright-cli),
[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md), and ui-ux-pro-max.

## Method

- **Briefs**: [`tasks/`](tasks/). One-shot prompts, identical for every model. The bonsai brief is the
  one the harness was iterated on; the lighthouse and dashboard briefs are held out. Their
  critiques informed kit v5, so the windmill brief was added afterwards as a fresh held-out test.
- **Timing**: wall clock from the first prompt until the session settles (idle for 60 s after any
  supervisor round), capped at 45 minutes. The goal is at most 2x Opus's time on the same brief.
- **Scoring**: screenshots (three desktop frames 1.5 s apart, one phone frame) judged 1 to 10 on
  recognizability, visual craft, animation, layout and polish. **The judge is Claude Opus 5.5 and is
  not blind**: it knew which run came from which model and belongs to the reference's own family,
  so expect a bias toward the reference. Every screenshot and page is published so you can judge
  for yourself.
- **Code checks** (deterministic, no judge): BigCodeBench-Hard (89 tasks, partial credit = share of
  unit tests passed), five small agent tasks, a feature added to an existing TypeScript project and
  a standard-library HTTP + SQLite API built from an empty folder, both scored by
  [hidden tests](tasks/agent-tasks/hidden-tests/) the agent never sees.

| Check | Qwen3-Coder-Next | Qwen3.8-27B |
|---|---|---|
| BigCodeBench-Hard, bare / terse prompt | 0.579 / 0.608 | 0.633 / 0.582 |
| 5 agent tasks, OpenCode + kit (10 attempts) | 10/10 | 10/10 |
| Greenfield API, OpenCode + kit (mean of 3) | 0.57 | 0.60 |
| Greenfield API, OpenCode without rules or skills | 0.2 | |
| Greenfield API, Qwen Code 0.25 | 0.60 | |

Small samples (2 to 3 runs per cell); treat differences under about one point as noise.

## Flash-Next configurations side by side

Mean judged score over the four briefs (bonsai, lighthouse, windmill, dashboard), one run per brief
unless noted. Opus 5.5 averages 9.1 on the same briefs.

| Configuration | Bonsai | Lighthouse | Windmill | Dashboard | Mean |
|---|---|---|---|---|---|
| kit v5 / v5.1, thinking off | 7.5 | 7.5 | 6.5 | 7.5, 8.0 | 7.3 |
| kit v5 / v5.1, thinking low | 7.0 | 7.5 | 8.0 | 6.0 | 7.1 |
| kit v6, thinking off | 7.0 | 3.5 | 7.0 | 7.5 | 6.3 |
| kit v6, thinking low | 7.5 | 7.0 | 8.0 | 8.0 | 7.6 |
| kit v7, thinking low | 7.5 | 7.5 | 7.0 | 7.5 | 7.4 |
| kit v7, thinking medium | 6.5 | 8.0 | 6.0 | 8.0 | 7.1 |
| kit v7, thinking low, best of 2 (calibrated critic picks) | 7.0 | 7.5 | 7.0 | 7.5 | 7.3 |

Single runs swing by a point or more (the same setup produced a 3.5 and a 7.5 lighthouse), so read
the means, not single cells. Thinking low wins on the windmill every time (8.0, 8.0 against 6.5, 7.0)
and has not produced a collapse; kit v6 with thinking low is the best configuration so far.

## Critic calibration

The supervisor's critic is the local model judging its own page, and a lenient critic stops the fix
loop early. `harness/tools/critic_replay.py` replays the saved screenshots of all 35 judged runs
through four critic designs and compares them with the judge's scores (the judge is itself not
blind, so this measures agreement with the judge used everywhere in this repo):

| critic | Spearman vs judge | mean offset | MAE | pairwise agreement |
|---|---|---|---|---|
| absolute 1-10 (kit v4 and v5) | 0.63 | +0.12 | 0.93 | 0.90 |
| absolute + three judge-scored example screenshots from other briefs | 0.74 | -0.11 | 0.82 | 0.91 |
| binary checklist generated from the brief | 0.25 | +1.55 | 2.43 | 0.82 |
| direct pairwise, both orders must agree | | | | 0.88 |

The binary checklist, which several papers recommend for large judges, was the worst here: the
model passed almost every check, including 12 of 12 on a windmill page without lattice sails or tulip
rows. Anchoring with scored examples helped most where it matters for stopping: on pages the judge
gave 7.0, the plain critic said 8 (stop) on four of seven; the anchored critic never went above 7.
Full numbers: [`results/data/critic_replay.md`](results/data/critic_replay.md).

## Harness traps found on the way

- Qwen Code 0.25 hides some tool schemas behind `tool_search`; Qwen3-Coder-Next then calls those
  tools with guessed arguments, and three bad calls in one turn stop the turn ("The model got stuck
  while using tools"). Fix: `tools.toolSearch.threshold: 20`.
- `opencode run` hangs if stdin stays open (pass `< /dev/null`), its SQLite database locks when
  several runs share it (set `XDG_DATA_HOME` per run), and it exits on idle before a plugin can act,
  so the supervisor only works in server mode.
- In server mode with nobody at the UI, three permission defaults block forever: `question`
  (the model asks the user something), `external_directory` (it opens a screenshot outside the
  project) and `doom_loop`. [`harness/opencode.json`](harness/opencode.json) denies all three.
- Qwen3.8-27B with thinking on sometimes ends a turn with an announcement and no tool call; thinking
  off avoided it, and that choice was carried over to Flash-Next for too long. Flash-Next's chat
  template defaults to `reasoning_effort: xhigh` when thinking is on; `low` (set through
  `chat_template_kwargs`, or a top-level `reasoning_effort` on vLLM) is the kit default now. vLLM's `tool_choice: "required"` returned an empty tool-call list on the build used
  (`auto` works).
- Qwen3.8-Flash-Next takes nearly all of the Spark's memory; under four parallel agent sessions
  (each with a headless browser for screenshots) the recipe's memory watchdog stopped it twice. It
  now runs with a smaller KV cache and two sessions at a time.

## Status

- Done: Qwen3-Coder-Next, Qwen3.8-27B, Qwen3.6-35B-A3B on all briefs and harness versions above.
- Qwen3.8-Flash-Next with kit v3: bonsai 7.5 (10.9 and 21.7 min), lighthouse 7.0 (hit the 45 min cap), dashboard 8.5 (37.3 min, over its 23 min budget). Best quality so far, but slower than the budget on the larger briefs.
- Qwen3.8-Flash-Next with kit v4: bonsai 7.0 (15.8 min), lighthouse 7.0 (27.7 min, down from the 45 min cap with kit v3). The 25-minute supervision budget stopped the overrun; quality did not move (one run each, so within noise).
- Kit v4 plus the [ponytail](https://github.com/DietrichGebert/ponytail) skill (loaded as always-on instructions) on Flash-Next: bonsai 6.0 (30.1 min), lighthouse 6.5 (27.3 min). Lower on both briefs and no faster, so it stays out of the kit.
- Kit v4 on the new windmill brief: 5.0 (25.5 min). On the dashboard it wrote its own Playwright check script and verified for the whole 45 minutes, so the supervisor never got a turn: 7.0, timeout.
- Kit v5 (drawing library): bonsai 7.5 in 11.9 min, lighthouse 7.5 in 25.9 min, the best lighthouse and the fastest good bonsai so far. The critic scored both 8 or more on its first look, so no supervisor rounds ran.
- Kit v5 on the windmill brief: 6.5 in 30.9 min, up from kit v4's 5.0. The drawing library carried over to a scene it was not built for.
- Kit v5.1 on the dashboard (from minute 20, tool results carry a note to stop self-checking and finish): 8.0 in 26.7 min and 7.5 in 21.7 min. Both stopped on their own, against kit v4's 45-minute timeout.
- Kit v5 with thinking on at `reasoning_effort: low` (every earlier run had thinking off): windmill 8.0 in 17.8 min (from 6.5 in 30.9 min, with real lattice sails and tulip rows in perspective), bonsai 7.0 in 23.0 min (from 7.5 in 11.9 min). One run each; the windmill jump is the largest single gain so far, on the brief no harness change was tuned on.
- Thinking low on the other two briefs: lighthouse 7.5 in 20.7 min (same score, 5 min faster), dashboard 6.0 (the category donut rendered as an empty ring) against 8.0 and 7.5 with thinking off. Across the four briefs thinking low moved scores by +1.5, -0.5, 0 and about -1.75: not a consistent win on single runs, so the next rounds use two runs per cell.
- Critic calibration (offline, no new pages): every saved screenshot replayed through four critic designs and compared with the judge, see [Critic calibration](#critic-calibration).
- Kit v6, thinking off: bonsai 7.0, lighthouse 3.5 (the agent first stopped at minute 27, after the supervisor's budget, so no fix round ran), windmill 7.0, dashboard 7.5. Thinking low: 7.5, 7.0, 8.0, 8.0.
- Kit v7 (one mid-course critique at minute 10, folded into the agent's next tool result, so every run gets feedback even if it never stops), thinking low: bonsai 7.5, lighthouse 7.5, windmill 7.0, dashboard 7.5. Same mean as kit v6 within noise; no run below 7.
- Kit v7 with thinking medium: bonsai 6.5 (tree too small), lighthouse 8.0 in 15 min, windmill 6.0 (sails drawn as a dark disc), dashboard 8.0. Mean 7.1, against 7.4 for low: medium is not better and swings more.
- Best-of-2 with kit v7 and thinking low (two attempts per brief in parallel, the calibrated critic picks, `pick` breaks ties): 7.0, 7.5, 7.0, 7.5. No gain over single runs: the two drafts were usually close, and the critic picked the weaker windmill. Its wall clock is the slower draft plus selection, so the dashboard ran 5 minutes over budget.
- This repository is updated as runs finish.

## Reproduce

1. Serve a model as in [`serving/README.md`](serving/README.md).
2. Install [OpenCode](https://opencode.ai), copy [`harness/opencode.json`](harness/opencode.json) and
   [`harness/AGENTS.md`](harness/AGENTS.md) to `~/.config/opencode/`, the plugin to
   `~/.config/opencode/plugins/`, and put [`harness/tools/look`](harness/tools/look) and
   [`pick`](harness/tools/pick) on `PATH` (they need [uv](https://docs.astral.sh/uv/) and Playwright's
   Chromium). Keep [`harness/tools/anchors/`](harness/tools/anchors/) next to `look` (link `look`
   rather than copying it): those are the critic's calibration screenshots.
3. Start `opencode serve --port 4096` and run a brief:
   `python scripts/run_server_agent.py http://127.0.0.1:4096 tasks/bonsai.txt out/bonsai-1`.
4. Screenshot it with `scripts/capture_simple.py out/bonsai-1`; charts come from
   `uv run --with matplotlib python scripts/make_charts.py`.

## License

MIT for everything in this repository (see [LICENSE](LICENSE)). The pages under `results/apps/`
were written by the models named in their folder names.
