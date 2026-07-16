import { highlight, escape } from "mdhl";

export const markdown =
  () =>
  (value: string): string => {
    try {
      return highlight(value);
    } catch {
      // a failed highlight must not break the render or pass raw user text to innerHTML
      return escape(value);
    }
  };
