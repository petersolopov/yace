import type { Plugin, TextareaProps } from "../index.ts";
import isKey from "./isKey.ts";

function history(
  options: { limit?: number; coalesceMs?: number } = {},
): Plugin {
  const limit = Math.max(1, options.limit == null ? 300 : options.limit);
  const coalesceMs = options.coalesceMs == null ? 300 : options.coalesceMs;

  let stack: TextareaProps[] = [];
  let activeIndex: number | null = null;
  let lastEditTime: number | null = null;

  const push = (record: TextareaProps): void => {
    stack = stack.slice(0, activeIndex! + 1);
    stack.push(record);
    if (stack.length > limit) {
      stack = stack.slice(stack.length - limit);
    }
    activeIndex = stack.length - 1;
  };

  return (props, event): ReturnType<Plugin> => {
    const isUndo =
      event.type === "keydown" && isKey("ctrl/cmd+z", event as KeyboardEvent);
    const isRedo =
      event.type === "keydown" &&
      (isKey("ctrl/cmd+shift+z", event as KeyboardEvent) ||
        isKey("ctrl+y", event as KeyboardEvent));

    if (isUndo || isRedo) {
      // always block native undo: a plugin writing textarea.value corrupts the
      // browser's own undo stack, so it must never run alongside ours
      event.preventDefault();
    }

    if (activeIndex === null) {
      stack = [props];
      activeIndex = 0;
      return;
    }

    if (isUndo) {
      lastEditTime = null; // an undo must not coalesce into the restored record
      if (stack[activeIndex].value !== props.value) {
        push(props); // record the current state first so redo can return to it
      } else {
        stack[activeIndex] = props;
      }
      activeIndex = Math.max(0, activeIndex - 1);
      return stack[activeIndex];
    }

    if (isRedo) {
      lastEditTime = null;
      // an edit not yet recorded (e.g. a programmatic one that fired no
      // input) invalidates the redo branch — checkpoint it instead
      if (stack[activeIndex].value !== props.value) {
        push(props);
        return;
      }
      activeIndex = Math.min(stack.length - 1, activeIndex + 1);
      return stack[activeIndex];
    }

    if (event.type === "keydown") {
      // keydown carries pre-edit props; a differing value is a programmatic
      // edit by a later plugin that fires no input, so checkpoint it
      if (stack[activeIndex].value !== props.value) {
        lastEditTime = null;
        push(props);
        return;
      }
      // caret-only move stays out of undo; refresh the active record's
      // selection so undo lands on the latest caret position
      stack[activeIndex] = props;
      return;
    }

    if (event.type === "input") {
      const time = event.timeStamp;
      const withinWindow =
        time != null &&
        lastEditTime != null &&
        time - lastEditTime <= coalesceMs;
      lastEditTime = time == null ? null : time;

      if (withinWindow) {
        stack[activeIndex] = props;
        return;
      }

      push(props);
    }
  };
}

export default history;
