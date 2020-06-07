import multiInput from "rollup-plugin-multi-input";
import buble from "@rollup/plugin-buble";
import { terser } from "rollup-plugin-terser";
import pkg from './package.json';

const editorConfig = {
  input: ["src/index.js"],
  output: [
    { file: pkg.module, format: "esm" },
    { file: pkg.main, format: "cjs" },
  ],
  plugins: [terser(), buble({ objectAssign: "Object.assign" })],
};

const pluginsConfig = {
  input: ["src/plugins/**.js"],
  output: [
    { format: "cjs", dir: "dist" },
    { format: "esm", dir: "dist/esm" },
  ],
  plugins: [multiInput(), terser(), buble({ objectAssign: "Object.assign" })],
};

export default [editorConfig, pluginsConfig];
