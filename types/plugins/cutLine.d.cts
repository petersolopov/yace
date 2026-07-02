import type { Plugin } from "../index.cjs";

declare function cutLine(predicate?: (event: KeyboardEvent) => boolean): Plugin;

export = cutLine;
