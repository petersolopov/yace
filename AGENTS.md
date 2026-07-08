# AGENTS.md

Instructions for coding agents and humans working on yace.

## What this is

yace is a tiny (~1.7KB gzip core, zero dependencies) framework-agnostic
browser code editor: a transparent `textarea` stacked over a `pre`. The
`textarea` owns input, caret, IME, and accessibility; the `pre` renders
highlighted HTML produced by a highlighter function. Plugins transform
textarea state on each keystroke. The repo also holds a promo landing
site under `site/` (see `## site`); the library is the product, the site
is a consumer of it.

## Commands

- `npm test` — c8 coverage enforced at 100% lines / 100% functions /
  99% branches
- `npm run typecheck`
- `npm run test:e2e` — all Playwright projects (see `## site` for the
  groups)
- `npm run dev` — the landing on `http://localhost:5714`,
  live-transpiles `src/*.ts`
- `npm run build`
- `npm run attw` — packaging check; its flags are load-bearing, see
  Gotchas
- `npm run prettier:check` — prettier 3 defaults; `test/.prettierrc`
  (tests) and the root `.prettierrc` (`*.html`) widen printWidth to 120,
  intentional per-context overrides

## Architecture in five lines

- `src/index.ts` — the editor: renders textarea + pre into the given
  root, syncs them on every input
- `src/styles.ts` — inline styles that keep the two layers pixel-aligned
- Highlighters are external and run as a pipeline: the `highlighters`
  option is an array of `(value, context?) => html`; the core bundle
  ships none (keeps it tiny), but ready-made ones live under
  `yace/highlighters/*`
- Plugins: `(props, event) => Partial<props> | void`, reduced left to
  right on keydown/input/compositionend; results merge into the textarea
  state
- `history()` must be FIRST in the plugin chain — it checkpoints state
  before other plugins transform it

## Import contract

- `import Yace from "yace"` — default export, core only; plugins and
  highlighters are never re-exported from the root (keeps the core
  bundle tiny)
- Plugins only via subpath: `import tab from "yace/plugins/tab"`
  (camelCase mirrors the import name); `isKey` lives under plugins as
  plugin-authoring tooling
- Highlighters via subpath:
  `yace/highlighters/{basic,sliceGlitch,shimmer}`. These
  are enumerated explicitly, not a wildcard, so the internal shared
  chunks (the `words` scanner, `injectStyles`) stay unexported
- The exports map is the encapsulation boundary: deep paths like
  `yace/dist/...` are closed, internal dist layout may change freely
- Current dist ships dual ESM/CJS. Decided direction: 1.0.0 goes
  ESM-only (drop `.cjs` and `.d.cts`, add
  `export { X as "module.exports" }` so `require()` keeps returning the
  callable on Node 22+); adding CJS back later is additive and
  non-breaking
- After 1.0.0 the contract is frozen; evolution is additive only (new
  plugin or highlighter = new subpath = minor)

## Invariants and their WHY

- The highlighter pipeline is the XSS boundary. Stage 0 receives the raw
  value with `{ html: false }` and MUST HTML-escape it. Later stages
  receive the previous stage's HTML with `{ html: true }` and must be
  HTML-aware: copy tag runs verbatim, match only inside text, and never
  re-escape. An empty `highlighters` array falls back to the escaping
  default rather than passing the raw value through; a bare function is
  tolerated at runtime but the typed option is an array
- Highlighters MUST NOT change font metrics — bold or ligatures in a
  non-strictly-monospace font misalign the textarea and pre layers
- Never rely on UA defaults for styles the alignment depends on
  (`overflowWrap`, `caretColor`, `letterSpacing` are set explicitly —
  see the comments in `src/styles.ts`); form controls in particular do
  not inherit `letter-spacing`, so a spaced root would drift the caret
  glyph by glyph
- IME guard: input/keydown handlers bail on `event.isComposing ||
  event.keyCode === 229`; the plugin pipeline runs on `compositionend`
  instead — writing `textarea.value` mid-composition corrupts CJK input
- `destroy()` is a full teardown: removes nodes via their actual parent
  (a framework may have detached them already), restores the pre-init
  style snapshot; `update()` after `destroy()` is a deliberate silent
  no-op so late callbacks in wrappers do not crash
- `0`, `""` are valid option values — absence checks use `== null`

## Bundled highlighters

- `basic` is a tiny extensible tokenizer; the glitch and shimmer
  factories are decorative (channel copies that shatter, or a gradient
  band that sweeps)
- Their timing options are milliseconds; the derived duration/interval
  fraction is silently clamped, raw option values are not validated
  (GIGO) — the deliberate cost of keeping them tiny
- Colours are a public CSS-variable contract so a consumer themes them
  without JS: `--yace-slice-a`/`-b` and `--yace-shimmer-base`/`-band`
  (shimmer's `colors` option just bakes those vars inline)
- A `words` option switches a highlighter from whole-line block mode to
  inline word mode. In the glitch the word markup uses its own `-word`
  classes on purpose: its block classes carry a `~br { display: none }`
  rule that would otherwise hide the trailing `<br/>` the editor appends
  and break the last-line caret. Shimmer has no such machinery — one
  `.yace-shimmer` class serves both modes
- In a pipeline, the glitch/shimmer factories are HTML-aware (safe after
  stage 0) only in `words` mode; block mode escapes the whole value and
  belongs in stage 0 only

## Build toolchain

- rollup 4 + `@rollup/plugin-typescript` + `@rollup/plugin-terser`;
  declarations via `tsc -p tsconfig.build.json` plus
  `scripts/build-dts.js`
- esbuild was evaluated and rejected: without bundling it does not
  rewrite `.ts` import specifiers (dist would reference nonexistent
  files), and with bundling it inlines shared modules into every entry;
  its CJS emit also wraps exports in `.default` interop
- Source imports use explicit `.ts` extensions — required because unit
  tests import live `src/` under Node's native type stripping
- `scripts/build-dts.js` derives `.d.cts` and strips private class slots
  by text transform; every transform asserts its post-condition, so an
  export-shape change that breaks a transform fails the build instead of
  publishing wrong declarations
- A new public subpath is wired by hand — exports map, rollup input, and
  the `build-dts` list — and a new exported core type is added to the
  `build-dts` namespace list; there is no highlighters wildcard, so
  every public subpath is an intentional choice

## Browser support

Evergreen only: Chromium, Firefox, WebKit, current mobile versions. No
IE. Compile target is ES2020; e2e runs exactly these three engines.

## Non-goals

Large documents, multicursor, decorations, rich text, SSR (client-only
library). These need a document model — out of scope by design.

## site

The landing lives in `site/public/` — vanilla HTML, BEM CSS, native ES
modules, zero npm dependencies, no build of its own. `site/server.js`
serves that directory from `/` in dev and transpiles `/src/*` live;
`pages.yml` copies `site/public` into `_site` and `tsc`-builds `src`
into `_site/src`. dev and prod are therefore structurally identical,
which is the point — site e2e exercises the real prod layout.

Invariants:

- Imports resolve through the page's import map — explicit entries for
  `yace` and each plugin/highlighter the page uses, no wildcards — to
  the live `src`. The prod base is `/yace/`, so root-absolute paths like
  `/src/...` are forbidden — they break under the project-Pages base
- The page makes zero external requests: fonts are self-hosted, no CDN,
  so site e2e runs offline
- The hero headline is static markup (CSS-only look). Two live yace
  instances run on the page, both on packaged highlighters:
  `#hero-tagline-live` is a disabled, autofill-shielded display piece
  that dogfoods the pipeline (a site stage-0 escaper, then `shimmer` and
  `sliceGlitch` in `words` mode) with the site palette bridged in
  through the `--yace-*` vars; the getting-started `#editor` is the
  interactive one on `basic()`. Their containers reserve `min-height` so
  mounting does not shift layout
- The highlighter contract still holds; the getting-started alignment
  spec guards it
- `/examples/` is a redirect stub to the landing
  (`site/public/examples/index.html`); the old `examples/*.html` stands
  are gone

Two servers exist on purpose: `site/server.js` (:5714, `site/public` as
web root) and `e2e/server.js` (:5715, repo root, library fixtures at
`/e2e/fixtures/index.html`), started by Playwright. Playwright runs two
project groups, `site-*` and `lib-*`, each across
chromium/firefox/webkit. The Pages `deploy` job is gated on the
`site-e2e` job.

## Gotchas

- undom (unit-test DOM) is not a browser: it does not expand style
  shorthands and does not move the caret on value assignment; caret and
  alignment behavior is only provable in e2e
- Publishing runs from CI on a `v*` tag push via OIDC trusted
  publishing; a bare `npm publish` targets the `latest` dist-tag, so
  pre-1.0 betas need `--tag next`
- attw exit code: the npm script pins `--profile node16` (node10
  resolution is deliberately unsupported — legacy resolvers ignore the
  exports map) and `--ignore-rules false-export-default` (the dual
  default export is intentional CJS interop, not a real fault); without
  those flags attw exits non-zero and reddens CI

## Conventions

- Comments and commit messages in English only; no links to personal
  notes or trackers — repo files must be self-contained
- Comments only for a non-obvious WHY (workaround, external constraint,
  invariant); never restate what the code says, and state each WHY once
- Conventional Commits
- Coverage thresholds are a floor, not a target to game: new branches
  need real tests, and a deliberately broken assertion must fail the run
- Prefer early returns over nesting; no one-off helpers

## Release checklist

In order:

- `npm test`
- `npm run typecheck`
- `npm run test:e2e`
- `npm run attw` (includes the build)
- `npm pack`, install the tarball into a clean project, verify `import`
  and `require` of the core and each plugin return callables
- external demo and example links resolve (README badges and examples,
  site links)
