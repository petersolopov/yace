# AGENTS.md

Instructions for coding agents and humans working on yace.

## What this is

yace is a tiny (under 2KB gzip core, zero dependencies) framework-agnostic
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

- `import { Yace } from "yace"` — named export, core only; plugins and
  highlighters are never re-exported from the root (keeps the core
  bundle tiny)
- Plugins only via subpath: `import { tab } from "yace/plugins/tab"`
  (the named export mirrors the subpath name); `isKey` lives under
  plugins as plugin-authoring tooling
- Highlighters via subpath:
  `yace/highlighters/{basic,sliceGlitch,shimmer}`. These
  are enumerated explicitly, not a wildcard, so the internal shared
  chunks (the `words` scanner, `injectStyles`) stay unexported
- Barrels re-export the whole set: `import { history, tab } from
  "yace/plugins"` and `import { basic, shimmer } from "yace/highlighters"`
  (the highlighters barrel also re-exports the `BasicRule` type). A
  bundler tree-shakes a pure re-export barrel down to byte-identical
  deep-import output (probed); a no-bundler consumer (CDN, import map)
  fetching a barrel pays for every sibling instead (+2158B / +4 requests
  for plugins, +5940B / +4 for highlighters when one entry is needed).
  So deep subpaths stay the documented path for CDN/import-map use, and
  the site/e2e fixtures keep their deep imports on purpose
- Barrel shaking rests on two facts, it is not free: `sideEffects: false`
  in package.json AND every re-exported module being free of top-level
  side effects — the highlighter factories inject their CSS inside the
  factory call, never at import. rollup emits a bare `import "./words.js"`
  on the highlighters facade (words is a shared internal chunk); a
  consumer drops it only because `sideEffects: false` permits it. A
  module-level side effect anywhere in the set would defeat the shake and
  pull dead siblings into every consumer bundle
- The exports map is the encapsulation boundary: deep paths like
  `yace/dist/...` are closed, internal dist layout may change freely
- Dist is ESM-only, exports are named. `require("yace")` on Node 22+
  (`require` of an ESM module) returns the module namespace, so
  `const { Yace } = require("yace")` works with no interop shim; native
  `import` is unaffected. Jest's default CJS runtime cannot load ESM —
  vitest or jest's ESM mode works. Typed CJS consumers need TS
  `module` `nodenext` (implies the matching `moduleResolution`, 5.8+):
  `node16` models older Node and rejects `require` of ESM with TS1471
  (verified against the tarball).
  Re-adding `.cjs`/`.d.cts` later is additive and non-breaking (a minor)
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
- `tslib` stays a devDependency even though `importHelpers` is off and
  no emitted code uses it: `@rollup/plugin-typescript` preflight-fails
  the whole build when tslib is not resolvable (probed 2026-07)
- esbuild was evaluated and rejected: without bundling it does not
  rewrite `.ts` import specifiers (dist would reference nonexistent
  files), and with bundling it inlines shared modules into every entry
- Source imports use explicit `.ts` extensions — required because unit
  tests import live `src/` under Node's native type stripping
- `scripts/build-dts.js` strips private class slots, rewrites the
  emitted `.ts` import specifiers to `.js`, and asserts each entry's
  export shape — a named `export declare` for the deep entries, a
  re-export of every expected name for the barrels (the `export declare`
  regex never matches a re-export, so barrels get their own assert);
  every step checks its post-condition, so a reverted export
  (`export default` or the old `module.exports` alias), a leaked private
  slot, or an unrewritten import fails the build instead of publishing
  wrong declarations
- A new public subpath is wired by hand — rollup input and the
  `build-dts` list, plus the exports map for highlighters; a barrel
  entry also needs its re-export module updated and its names added to
  the `build-dts` barrel assert list. Plugins resolve through the
  `./plugins/*` wildcard (a new plugin needs no package.json edit), so
  everything emitted into `dist/plugins/` is public by construction —
  private shared chunks must not land there (`yace/plugins/index`
  resolving as a harmless barrel alias is the accepted cost).
  Highlighters are enumerated explicitly instead because their dir holds
  private chunks (the `words` scanner, `injectStyles`)

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
  the live `src`. These are the deep paths, not the `yace/plugins` /
  `yace/highlighters` barrels: the page is no-bundler (see the barrel
  bullet under Import contract). The prod base is `/yace/`, so
  root-absolute paths like `/src/...` are forbidden — they break under
  the project-Pages base
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
  publishing; the publish step routes by version: a prerelease suffix
  (`1.0.0-beta.1`) publishes under the `next` dist-tag, a stable version
  publishes bare and becomes `latest`. The routing assumes releases move
  forward: npm repoints `latest` to whatever stable is published last,
  so a backport below the current latest would drag `latest` backwards —
  if a maintenance line ever appears, publish it with an explicit
  `--tag`. A wrong dist-tag is repointed without unpublishing:
  `npm dist-tag add yace@<version> latest`
- attw exit code: the npm script pins `--profile esm-only`. For an
  ESM-only package attw's CJS and node10 resolutions are expected to
  fail (`require(esm)` shows as "dynamic import only") and the profile
  ignores them; the ESM and bundler resolutions must stay green. A real
  fault still reddens CI — a types path pointing at a missing file exits
  non-zero (verified). Note attw's static check does not model the
  `require(esm)` runtime on Node 22+, where `require("yace")` returns the
  live module namespace, so the require() smoke test in the release
  checklist is the real proof

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
- `npm pack`, install the tarball into a clean project, verify each
  entry's named `import` returns a callable and, on Node 22+,
  `require("yace").Yace` and the per-entry equivalents are callable
- external demo and example links resolve (README badges and examples,
  site links)
