import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

const plugins = ["tab", "history", "preserveIndent", "cutLine", "isKey"];
const highlighters = ["basic", "jitterGlitch", "sliceGlitch", "shimmer"];

// every transform asserts its post-condition: a silent regex miss here would
// publish wrong declarations that only break in consumer projects

// private slots would make the class nominal; the published type contract is
// structural (the old handwritten declarations exposed public members only)
async function fixIndexEsm() {
  const file = `${dist}index.d.ts`;
  const source = await readFile(file, "utf8");
  const fixed = source.replace(/^\s*private [\w$]+\??;\n/gm, "");
  if (/private/.test(fixed)) {
    throw new Error("build-dts: a private member survived in index.d.ts");
  }
  await writeFile(file, fixed);
  return fixed;
}

// tsc does not apply rewriteRelativeImportExtensions to declaration output, so
// the emitted plugin .d.ts still points at "../index.ts"; the published ESM
// declaration must reference "../index.js".
async function fixPluginEsmImport(name) {
  const file = `${dist}plugins/${name}.d.ts`;
  const source = await readFile(file, "utf8");
  const fixed = source.replace(/from "\.\.\/index\.ts"/g, 'from "../index.js"');
  if (fixed.includes("../index.ts")) {
    throw new Error(
      `build-dts: unrewritten ../index.ts import in ${name}.d.ts`,
    );
  }
  await writeFile(file, fixed);
  return fixed;
}

// tsc cannot emit `export =`, so the CJS declarations are derived from the ESM
// ones: swap the sibling extension and the export form.
async function writePluginCts(name, esm) {
  const cts = esm
    .replace(/from "\.\.\/index\.js"/g, 'from "../index.cjs"')
    .replace(/^export default (\w+);/m, "export = $1;");
  if (cts.includes("../index.js") || !/^export = \w+;/m.test(cts)) {
    throw new Error(`build-dts: bad derived ${name}.d.cts`);
  }
  await writeFile(`${dist}plugins/${name}.d.cts`, cts);
}

// index re-exports named types alongside the default class; the CJS form is the
// `export =` class/namespace merge that the require() types contract expects.
async function writeIndexCts(esm) {
  const body = esm
    .replace(/^export interface /gm, "interface ")
    .replace(/^export type /gm, "type ")
    .replace(/^export default class Yace/m, "declare class Yace");
  if (
    /^export (default|interface|type) /m.test(body) ||
    !body.includes("declare class Yace")
  ) {
    throw new Error("build-dts: bad derived index.d.cts");
  }
  const cts = `${body}declare namespace Yace {
    export { TextareaProps, Plugin, YaceOptions, Highlighter };
}
export = Yace;
`;
  await writeFile(`${dist}index.d.cts`, cts);
}

// styles is inlined into index at bundle time; its declaration has no runtime
// module in dist.
await rm(`${dist}styles.d.ts`, { force: true });

const indexEsm = await fixIndexEsm();
await writeIndexCts(indexEsm);

for (const name of plugins) {
  const esm = await fixPluginEsmImport(name);
  await writePluginCts(name, esm);
}

// highlighters only import their own siblings, so the rewrite is generic:
// any relative ".ts" specifier becomes ".js" (ESM) / ".cjs" (derived CJS)
async function fixHighlighterEsmImport(name) {
  const file = `${dist}highlighters/${name}.d.ts`;
  const source = await readFile(file, "utf8");
  const fixed = source.replace(/from "(\.[^"]*)\.ts"/g, 'from "$1.js"');
  if (/from "\.[^"]*\.ts"/.test(fixed)) {
    throw new Error(`build-dts: unrewritten .ts import in ${name}.d.ts`);
  }
  await writeFile(file, fixed);
  return fixed;
}

// a highlighter that exports named types beside its default (basic's
// BasicRule) needs the same const/namespace merge writeIndexCts builds:
// `export =` cannot sit next to `export interface`, so the types move into a
// `declare namespace` that merges with the default value.
async function writeHighlighterCts(name, esm) {
  const withCjsImports = esm.replace(/from "(\.[^"]*)\.js"/g, 'from "$1.cjs"');
  const namedTypes = [
    ...withCjsImports.matchAll(/^export (?:interface|type) (\w+)/gm),
  ].map(([, type]) => type);
  const body = withCjsImports
    .replace(/^export interface /gm, "interface ")
    .replace(/^export type /gm, "type ");
  const merge = namedTypes.length
    ? `declare namespace $1 {\n    export { ${namedTypes.join(", ")} };\n}\n`
    : "";
  const cts = body.replace(/^export default (\w+);/m, `${merge}export = $1;`);
  if (
    /^export (default|interface|type) /m.test(cts) ||
    !/^export = \w+;/m.test(cts)
  ) {
    throw new Error(`build-dts: bad derived ${name}.d.cts`);
  }
  await writeFile(`${dist}highlighters/${name}.d.cts`, cts);
}

for (const name of highlighters) {
  const esm = await fixHighlighterEsmImport(name);
  await writeHighlighterCts(name, esm);
}
