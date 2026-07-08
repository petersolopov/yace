import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

const plugins = ["tab", "history", "preserveIndent", "cutLine", "isKey"];
const highlighters = ["basic", "sliceGlitch", "shimmer"];

// every transform asserts its post-condition: a silent regex miss here would
// publish wrong declarations that only break in consumer projects

// private slots would make the class nominal; the published type contract is
// structural (the old handwritten declarations exposed public members only)
async function stripPrivateSlots() {
  const file = `${dist}index.d.ts`;
  const source = await readFile(file, "utf8");
  const fixed = source.replace(/^\s*private [\w$]+\??;\n/gm, "");
  if (/private/.test(fixed)) {
    throw new Error("build-dts: a private member survived in index.d.ts");
  }
  await writeFile(file, fixed);
}

// tsc does not apply rewriteRelativeImportExtensions to declaration output, so
// the emitted plugin .d.ts still points at "../index.ts"; the published
// declaration must reference "../index.js".
async function fixPluginImport(name) {
  const file = `${dist}plugins/${name}.d.ts`;
  const source = await readFile(file, "utf8");
  const fixed = source.replace(/from "\.\.\/index\.ts"/g, 'from "../index.js"');
  if (fixed.includes("../index.ts")) {
    throw new Error(
      `build-dts: unrewritten ../index.ts import in ${name}.d.ts`,
    );
  }
  await writeFile(file, fixed);
}

// highlighters only import their own siblings, so the rewrite is generic:
// any relative ".ts" specifier becomes ".js"
async function fixHighlighterImport(name) {
  const file = `${dist}highlighters/${name}.d.ts`;
  const source = await readFile(file, "utf8");
  const fixed = source.replace(/from "(\.[^"]*)\.ts"/g, 'from "$1.js"');
  if (/from "\.[^"]*\.ts"/.test(fixed)) {
    throw new Error(`build-dts: unrewritten .ts import in ${name}.d.ts`);
  }
  await writeFile(file, fixed);
}

// styles is inlined into index at bundle time; its declaration has no runtime
// module in dist.
await rm(`${dist}styles.d.ts`, { force: true });

await stripPrivateSlots();

for (const name of plugins) {
  await fixPluginImport(name);
}

for (const name of highlighters) {
  await fixHighlighterImport(name);
}
