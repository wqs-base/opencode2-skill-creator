# AGENTS.md — plugin/

## Purpose

The OpenCode 2 plugin package `opencode2-skill-creator`. It registers the skill
validation, eval, description-optimization, benchmark, and review tools, and
auto-installs the bundled skill into the global skills directory.

## Ownership

- Owns `plugin/`: entrypoint, `lib/`, build script, installer, tests, bundled
  `skill/` copy, and generated `dist/`.
- Does not own the skill markdown source. `opencode2-skill-creator/` is owned by
  the root `AGENTS.md`; `plugin/skill/` must stay a byte-identical copy.

## Local Contracts

- Targets the OpenCode 2 plugin API from `@opencode/plugin` (peer `>=2.0.0`).
- `skill-creator.ts` default-exports `Plugin.define({ id, setup })` and keeps
  named helper exports for tests. `runtime-entry.ts` is the build entrypoint.
- Tools register inside `setup` through `ctx.tool.transform(...)` with a JSON
  Schema `input`, `options: { codemode: true }`, and `{ content }` results.
- Skill conflict detection uses `ctx.skill.list()`; `opencode debug skill` no
  longer exists in V2.
- `build.mjs` externalizes `@opencode/plugin` with the space form
  (`--external @opencode/plugin`); the `--external:pkg` colon form silently
  bundles it instead.
- The installer writes the native `plugins` array and appends to a legacy V1
  `plugin` array when one already exists.
- Trigger evals shell out to `opencode run --format json` and detect `tool_use`
  parts named `skill` or `read`. V2 still emits these part events.

## Work Guidance

- Keep each tool's JSON Schema properties in sync with the fields its
  `execute` reads.
- Do not reintroduce V1 glue: `@opencode-ai/plugin`, the `tool()` helper,
  returned `tool` maps, or `opencode debug skill`.
- Keep `plugin/skill/` in sync with `opencode2-skill-creator/` and rebuild
  `dist/` after any source change.

## Verification

- `npm run build` rebuilds `dist/` and the build manifest.
- `npm test` runs the Node test-runner suite (installer, compiled entrypoint,
  review server).
- `bun test --isolate test/*.test.ts` runs the TypeScript library and plugin
  setup tests.
- `npm run prepack` runs build plus both suites.

## Child DOX Index

None. `lib/` and `test/` are owned by this file.
