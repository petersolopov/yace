import multiInput from "rollup-plugin-multi-input";
import buble from "@rollup/plugin-buble";
import { terser } from "rollup-plugin-terser";

const bublePlugin = buble({ objectAssign: "Object.assign" });

const editorConfig = {
  input: ["src/index.js"],
  output: [
    { file: "dist/index.js", format: "esm" },
    { file: "dist/index.cjs", format: "cjs", exports: "default" },
  ],
  plugins: [terser(), bublePlugin],
};

const pluginsConfig = {
  input: ["src/plugins/**.js"],
  output: [
    {
      format: "esm",
      dir: "dist",
      entryFileNames: "[name].js",
      chunkFileNames: "[name].js",
    },
    {
      format: "cjs",
      dir: "dist",
      entryFileNames: "[name].cjs",
      chunkFileNames: "[name].cjs",
      exports: "default",
    },
  ],
  plugins: [multiInput(), terser(), bublePlugin],
};

export default [editorConfig, pluginsConfig];
