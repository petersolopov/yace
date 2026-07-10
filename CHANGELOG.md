# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.0.0-beta.2](https://github.com/petersolopov/yace/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2026-07-10)


### ⚠ BREAKING CHANGES

* rename the basic highlighter to code

### Features

* rename the basic highlighter to code ([ddd3d73](https://github.com/petersolopov/yace/commit/ddd3d7353b803558f3c5499fc4109947cb8aa365))

## [1.0.0-beta.1](https://github.com/petersolopov/yace/compare/v0.0.8...v1.0.0-beta.1) (2026-07-08)


### ⚠ BREAKING CHANGES

* switch the public API to named exports
* ship ESM-only packaging
* drop the jitterGlitch highlighter

### Features

* add yace/plugins and yace/highlighters barrel entries ([259b2a2](https://github.com/petersolopov/yace/commit/259b2a2a6f47196368263ff09c5639fc55302764))
* drop the jitterGlitch highlighter ([e4e90a0](https://github.com/petersolopov/yace/commit/e4e90a00bfc86a9ce29bfce4616feec040ecfd2b))
* ship ESM-only packaging ([3e5b42c](https://github.com/petersolopov/yace/commit/3e5b42cf3205b1c10cbc5b78074fa49d17ed2ec1))
* switch the public API to named exports ([80f6d61](https://github.com/petersolopov/yace/commit/80f6d614458d0bc7b0dee1683873845970430c12))


### Bug Fixes

* right-align line number digits in the gutter ([8900fbb](https://github.com/petersolopov/yace/commit/8900fbb9297cea4723c8fc9f3397cfdeaccb2c52))

### [0.0.8](https://github.com/petersolopov/yace/compare/v0.0.7...v0.0.8) (2026-07-07)


### ⚠ BREAKING CHANGES

* the singular `highlighter` option is replaced by a `highlighters` array that composes left to right as an html-aware pipeline ([6df293a](https://github.com/petersolopov/yace/commit/6df293a15e57b5071462a203fea052e9a5366fb0))

### Features

* package bundled highlighters via `yace/highlighters/{basic,sliceGlitch,jitterGlitch,shimmer}` subpaths — `basic` is an extensible tokenizer, slice/jitter/shimmer are decorative ([560abcd](https://github.com/petersolopov/yace/commit/560abcd5e119c3d9195c1870f80483aa4e33ca53))
* run highlighters as an html-aware pipeline in the core ([6df293a](https://github.com/petersolopov/yace/commit/6df293a15e57b5071462a203fea052e9a5366fb0))


### Bug Fixes

* inherit textarea letter-spacing to keep the caret aligned ([5d3b1c4](https://github.com/petersolopov/yace/commit/5d3b1c40120e6df7d340ae90174512d985530855))

### [0.0.7](https://github.com/petersolopov/yace/compare/v0.0.6...v0.0.7) (2026-07-01)


### Bug Fixes

* prevent doubled indentation when pressing enter before line indent ([bb95df3](https://github.com/petersolopov/yace/commit/bb95df3822b6cb8c576286ceb1e00655760d114e))

### [0.0.6](https://github.com/petersolopov/yace/compare/v0.0.5...v0.0.6) (2020-08-29)

### [0.0.5](https://github.com/petersolopov/yace/compare/v0.0.4...v0.0.5) (2020-06-20)


### Features

* add default fontSize and fontFamily ([fe8ff47](https://github.com/petersolopov/yace/commit/fe8ff47dc8e1309b7401e79088163ddc07994e4a))
* add preserve indent plugin ([5181bb9](https://github.com/petersolopov/yace/commit/5181bb97f6f51d2216868b8ddda7a27565cd90e2))
* history more accurate ([910e397](https://github.com/petersolopov/yace/commit/910e397af2b7dfa8fa561ae1dffe0ed96adf9938))


### Bug Fixes

* specify lineHeight: textarea line height and pre can be different. ([2f6ed69](https://github.com/petersolopov/yace/commit/2f6ed69decce3adb66334235ec742ff6509521a4))

### [0.0.4](https://github.com/petersolopov/yace/compare/v0.0.3...v0.0.4) (2020-06-14)

### [0.0.3](https://github.com/petersolopov/yace/compare/v0.0.2...v0.0.3) (2020-06-14)

### [0.0.2](https://github.com/petersolopov/yace/compare/v0.0.1...v0.0.2) (2020-06-14)


### Features

* **plugin:** add history plugin ([8d5bb1a](https://github.com/petersolopov/yace/commit/8d5bb1a65cb2ca1473d8cb15021f3e244164a654))
* runPlugins in input handler, update isKey signature, update plugins ([7d1ed35](https://github.com/petersolopov/yace/commit/7d1ed35f9f1fe41b9dd2da3eec768af778fcb988))


### Bug Fixes

* escape value in default highlighter ([40dbffd](https://github.com/petersolopov/yace/commit/40dbffda90fb3eb5efc0c389b25eabd19d9992ac))
* **cutLine:** check navigator api ([ccb4b2a](https://github.com/petersolopov/yace/commit/ccb4b2a76b609122573342769f0e8817fbafb346))
* catch navigator clipboard error ([5a2d029](https://github.com/petersolopov/yace/commit/5a2d029edca83b9f5e8dbaed9632a304a1dd8e27))
* pre and lines should inherit fontFamily for correct render if fontFamily is set for root ([1de542f](https://github.com/petersolopov/yace/commit/1de542ff0b1e932805283baac4987c5fe4de56f4))
* prevent render markup ([b5f079c](https://github.com/petersolopov/yace/commit/b5f079c6063fc8eec7e729dbd706a931fb3d18ef))
* updating selectionStart and selectionEnd without updating value in update() method ([d09aca4](https://github.com/petersolopov/yace/commit/d09aca491ea4096df3eb1af87b15d9899901af49))

### 0.0.1 (2020-06-09)
