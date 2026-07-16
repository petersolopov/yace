import type { Plugin } from "../index.ts";

export const autoClose = (
  pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" },
): Plugin => {
  const closes = new Set(Object.values(pairs));

  return (props, event): ReturnType<Plugin> => {
    if (event.type !== "keydown") {
      return;
    }

    // keydown fires before the browser suppresses input on a readonly textarea,
    // so without this the pair would still be written into a field that rejects
    // native typing
    const target = event.target as HTMLTextAreaElement | null;
    if (target != null && target.readOnly) {
      return;
    }

    const keyEvent = event as KeyboardEvent;

    // the pipeline sees every non-IME keydown, chords included: cmd+[ is
    // browser-back and ctrl+shift+9 types "(" — bail on command/control chords
    // so they are not hijacked. the !altKey carve-out keeps AltGr layouts
    // working: AltGr reports ctrl+alt and legitimately types brackets
    if ((keyEvent.ctrlKey || keyEvent.metaKey) && !keyEvent.altKey) {
      return;
    }

    const { value, selectionStart, selectionEnd } = props;
    const { key } = keyEvent;
    const collapsed = selectionStart === selectionEnd;

    // branch order is load-bearing: backspace-pair, then skip-over, then
    // insert. skip-over must precede insert or a symmetric pair (a quote added
    // via the option, open === close) could never be closed — every keystroke
    // would insert a fresh pair instead of stepping over the one already there
    if (key === "Backspace" && collapsed && selectionStart > 0) {
      const open = value[selectionStart - 1];
      const close = pairs[open];
      if (close != null && value[selectionStart] === close) {
        event.preventDefault();
        const caret = selectionStart - 1;
        return {
          value:
            value.slice(0, selectionStart - 1) +
            value.slice(selectionStart + 1),
          selectionStart: caret,
          selectionEnd: caret,
        };
      }
      return;
    }

    if (collapsed && closes.has(key) && value[selectionStart] === key) {
      event.preventDefault();
      const caret = selectionStart + 1;
      return {
        value,
        selectionStart: caret,
        selectionEnd: caret,
      };
    }

    const close = pairs[key];
    if (close == null) {
      return;
    }

    event.preventDefault();
    const selected = value.slice(selectionStart, selectionEnd);
    return {
      value:
        value.slice(0, selectionStart) +
        key +
        selected +
        close +
        value.slice(selectionEnd),
      selectionStart: selectionStart + 1,
      selectionEnd: selectionEnd + 1,
    };
  };
};
