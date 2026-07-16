import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import { nodeResolve } from "@rollup/plugin-node-resolve";

// tsconfig's rewriteRelativeImportExtensions turns the source ".ts" specifiers
// into ".js" at transpile; map them back to the on-disk ".ts" files for rollup
const resolveTsSource = {
  name: "resolve-ts-source",
  resolveId(source, importer) {
    if (!importer || !source.startsWith(".") || !source.endsWith(".js")) {
      return null;
    }
    const tsPath = resolve(dirname(importer), source.replace(/\.js$/, ".ts"));
    return existsSync(tsPath) ? tsPath : null;
  },
};

const typescriptPlugin = typescript({
  tsconfig: "./tsconfig.json",
  compilerOptions: { declaration: false },
});

const editorConfig = {
  input: ["src/index.ts"],
  output: [{ file: "dist/index.js", format: "esm" }],
  plugins: [resolveTsSource, typescriptPlugin, terser()],
};

const pluginsConfig = {
  input: [
    "src/plugins/index.ts",
    "src/plugins/tab.ts",
    "src/plugins/history.ts",
    "src/plugins/preserveIndent.ts",
    "src/plugins/cutLine.ts",
    "src/plugins/autoClose.ts",
    "src/plugins/toggleComment.ts",
    "src/plugins/isKey.ts",
  ],
  output: [
    {
      format: "esm",
      dir: "dist/plugins",
      entryFileNames: "[name].js",
      chunkFileNames: "[name].js",
    },
  ],
  plugins: [resolveTsSource, typescriptPlugin, terser()],
};

const highlightersConfig = {
  input: [
    "src/highlighters/index.ts",
    "src/highlighters/code.ts",
    "src/highlighters/sliceGlitch.ts",
    "src/highlighters/shimmer.ts",
    "src/highlighters/markdown.ts",
  ],
  output: [
    {
      format: "esm",
      dir: "dist/highlighters",
      entryFileNames: "[name].js",
      chunkFileNames: "[name].js",
    },
  ],
  // markdown vendors mdhl; resolveOnly keeps node-resolve off everything else
  plugins: [
    resolveTsSource,
    nodeResolve({ resolveOnly: ["mdhl"] }),
    typescriptPlugin,
    terser(),
  ],
};

export default [editorConfig, pluginsConfig, highlightersConfig];
