import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

// tsconfig sets rewriteRelativeImportExtensions, so the plugin transpiles the
// source ".ts" specifiers to ".js"; map those back to the on-disk ".ts" files
// so rollup can resolve them (final chunk names carry the right extension).
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
    "src/plugins/tab.ts",
    "src/plugins/history.ts",
    "src/plugins/preserveIndent.ts",
    "src/plugins/cutLine.ts",
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
    "src/highlighters/basic.ts",
    "src/highlighters/sliceGlitch.ts",
    "src/highlighters/shimmer.ts",
  ],
  output: [
    {
      format: "esm",
      dir: "dist/highlighters",
      entryFileNames: "[name].js",
      chunkFileNames: "[name].js",
    },
  ],
  plugins: [resolveTsSource, typescriptPlugin, terser()],
};

export default [editorConfig, pluginsConfig, highlightersConfig];
