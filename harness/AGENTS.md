# Working rules for the coding agent

These rules apply in every project. A project's own AGENTS.md adds to them and wins where they conflict.

## Done means a check passed

- Before you write code, find the project's check command: `npm run check`, `make check`, `uv run pytest`, `pnpm test`, or what README/package.json/pyproject.toml defines. If there is none, propose one and add it first: lint + type check + tests in a single command.
- After every change, run the check command and read its output.
- Never say a task is done, working, fixed or verified unless the check command passed in this session. Paste the last lines of its output in your final message.
- If a check fails, say what is broken. Do not describe failing work as complete.
- Bundling, exporting or compiling is not running. For an app, start it or render it in a test and read the output.

## Read before you write

- List the files and read the ones related to the task before creating new ones.
- Search for an existing helper, component, type, theme or constant before adding one. Reuse it.
- Use the project's existing theme, config and naming. Never hardcode a value that already lives in a shared module.
- When a file you wrote earlier matters, read it again. Do not work from memory of it.

## Versions and APIs

- Your memory of library APIs and versions is out of date. Read the installed version first (package.json, lockfile, `npm ls <pkg>`, `uv pip show <pkg>`).
- Install with the ecosystem's version-aware command (`npx expo install`, `uv add`, `pnpm add`), never by guessing a version number.
- Look up any function signature you are not certain of in the installed package's types or docs.

## Scope and size

- One feature per step. For anything beyond a one-line fix, write a 3-5 bullet plan first, then implement it in the same reply.
- Every behavior change gets a test that exercises the behavior (not just that it renders).
- Small diffs. Never bundle a refactor with a bug fix.
- No TODOs, placeholder bodies, dummy data or hardcoded results in place of real logic.
- Do not create summary, report, notes or README files unless asked.

## Git

- Work inside a git repository. If the project is not one, run `git init` before the first edit.
- Check `git diff` before you report back, so you know exactly what you changed.
- Never commit, push, reset or delete without being asked.

## Working without a human in the loop

- Do not ask the user questions mid-task: there may be nobody to answer. Pick the most sensible
  default, build it, and state the choice in your final message.
- Stay inside the project directory. Paths outside it are denied.

## When stuck

- Same error three times: stop, re-read the error and the code it points at, and reason from first principles before trying again.

## Skills: load the one that fits before you start

| Task | Load first |
|---|---|
| Any new feature or multi-step change | `writing-plans`, then `incremental-implementation` |
| Writing or changing behavior | `test-driven-development` |
| A bug, failing test or crash | `systematic-debugging` |
| About to say done, fixed or working | `verification-before-completion` |
| Using a library API you have not checked in this project | `source-driven-development` |
| Building or restyling UI | `impeccable`, plus `design-taste-frontend` for new screens |
| UI should look like a known product, or no design system yet | `design-md-library` |
| Picking colors, fonts and layout for a new product | `ui-ux-pro-max` |
| React / Next.js code | `vercel-react-best-practices` |
| React Native / Expo code | `vercel-react-native-skills` |
| After building or changing anything visual (page, screen, canvas, chart) | `visual-check` (runs `look`), before saying it is done |
| Pixel art, sprites, retro game scenes | `pixel-art` |
| Clicking through a web page, forms, flows | `playwright-cli` |
| Charts, dashboards, KPI tiles | `dataviz` |
| HTTP APIs, auth, input handling | `api-and-interface-design`, `security-and-hardening` |
