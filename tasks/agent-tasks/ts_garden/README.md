# Garden

A tiny habit tracker: each time the user completes a focus session they water a bonsai, and it grows.

Run everything with `npm run check` (TypeScript build, then the tests compiled to `dist/tests/`).
Node 22 and a global `tsc` are available. `@types/node` is already installed; do not add other dependencies.

## The feature to build

Implement watering and growth in `src/garden.ts`, plus a status line renderer:

1. Stages, in order: `seed`, `sprout`, `sapling`, `bonsai` (already in `STAGES`).
2. Every 5 waterings advance the garden one stage, and the water count for the new stage starts again at 0.
3. `bonsai` is the last stage. Watering a bonsai does nothing: stage and count stay where they are.
4. After every `water()` the state is saved through the `Storage` passed to the constructor.
5. A new `Garden` built on the same storage resumes exactly where the previous one stopped (stage and count), so progress survives restarting the app.
6. Add `get waterCount(): number` returning the waterings in the current stage (0-4; 0 for bonsai).
7. Add `src/status.ts` exporting `renderStatus(garden: Garden): string` that returns exactly:
   `<p class="status" style="color: TEXT">Stage: NAME (COUNT/5)</p>`
   where TEXT is the text color from `src/theme.ts`, NAME is the stage name with its first letter upper-cased, and COUNT is `waterCount`. For a bonsai the text color is the theme's accent color and the line ends with `(fully grown)` instead of `(COUNT/5)`.
   Colors must come from `src/theme.ts`; no color literals anywhere else in `src/`.

Write tests for the new behavior in `tests/`. Do not change `tests/storage.test.ts` or `src/storage.ts`.
