import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

const plugins = [
  "tab",
  "history",
  "preserveIndent",
  "cutLine",
  "autoClose",
  "toggleComment",
  "isKey",
];
const highlighters = ["code", "sliceGlitch", "shimmer"];

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

// every entry exposes exactly one named binding matching its subpath; guard the
// shape so a future revert to `export default` or the module.exports alias fails
// the build instead of shipping a declaration consumers cannot destructure
async function assertNamedExport(relativePath, name) {
  const file = `${dist}${relativePath}`;
  const source = await readFile(file, "utf8");
  const declared = new RegExp(
    `export declare (?:const|function|class) ${name}\\b`,
  ).test(source);
  if (!declared) {
    throw new Error(`build-dts: ${relativePath} lacks named export "${name}"`);
  }
  if (/export default|as default|"module\.exports"/.test(source)) {
    throw new Error(`build-dts: stale default export in ${relativePath}`);
  }
}

// a barrel re-exports its siblings, so tsc leaves ".ts" specifiers in its
// declaration (rewriteRelativeImportExtensions skips declaration output);
// rewrite them to ".js" like the highlighter entries
async function fixBarrelImports(dir) {
  const file = `${dist}${dir}/index.d.ts`;
  const source = await readFile(file, "utf8");
  const fixed = source.replace(/from "(\.[^"]*)\.ts"/g, 'from "$1.js"');
  if (/from "\.[^"]*\.ts"/.test(fixed)) {
    throw new Error(`build-dts: unrewritten .ts import in ${dir}/index.d.ts`);
  }
  await writeFile(file, fixed);
}

// a barrel is re-export form, which assertNamedExport's `export declare` regex
// never matches; assert every expected name is re-exported and no default
// leaked, so a broken barrel shape fails the build
async function assertBarrelExports(dir, names) {
  const file = `${dist}${dir}/index.d.ts`;
  const source = await readFile(file, "utf8");
  for (const name of names) {
    // `X as Y` exports Y, so the bare name must not be renamed away
    const reexported = new RegExp(
      `export \\{[^}]*\\b${name}\\b(?!\\s+as\\b)[^}]*\\} from`,
    ).test(source);
    if (!reexported) {
      throw new Error(
        `build-dts: ${dir}/index.d.ts does not re-export "${name}"`,
      );
    }
  }
  if (/export default|as default|"module\.exports"/.test(source)) {
    throw new Error(`build-dts: stale default export in ${dir}/index.d.ts`);
  }
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

await fixBarrelImports("plugins");
await fixBarrelImports("highlighters");

await assertNamedExport("index.d.ts", "Yace");

for (const name of plugins) {
  await assertNamedExport(`plugins/${name}.d.ts`, name);
}

for (const name of highlighters) {
  await assertNamedExport(`highlighters/${name}.d.ts`, name);
}

await assertBarrelExports("plugins", plugins);
await assertBarrelExports("highlighters", [...highlighters, "CodeRule"]);
