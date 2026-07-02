import type { Plugin } from "../index.cjs";

declare function history(options?: {
  limit?: number;
  coalesceMs?: number;
}): Plugin;

export = history;
