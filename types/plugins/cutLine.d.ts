import type { Plugin } from "../index.js";

declare function cutLine(predicate?: (event: KeyboardEvent) => boolean): Plugin;

export default cutLine;
