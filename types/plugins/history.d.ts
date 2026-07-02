import type { Plugin } from "../index.js";

declare function history(options?: {
  limit?: number;
  coalesceMs?: number;
}): Plugin;

export default history;
