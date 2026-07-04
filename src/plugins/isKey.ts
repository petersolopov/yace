type ModifierKey = "altKey" | "ctrlKey" | "metaKey" | "shiftKey";

/* c8 ignore next 3 -- browser/platform detection, not reachable in one test run */
const IS_MAC =
  typeof window != "undefined" &&
  window.navigator &&
  /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);

const MODIFIERS: Record<string, ModifierKey> = {
  alt: "altKey",
  control: "ctrlKey",
  ctrl: "ctrlKey",
  meta: "metaKey",
  shift: "shiftKey",
  /* c8 ignore next -- depends on IS_MAC, fixed per environment */
  "ctrl/cmd": IS_MAC ? "metaKey" : "ctrlKey",
};

const KEY_ALIASES: Record<string, string> = {
  add: "=",
};

const PUNCTUATION_CODES: Record<string, string> = {
  ";": "semicolon",
  "=": "equal",
  ",": "comma",
  "-": "minus",
  ".": "period",
  "/": "slash",
  "`": "backquote",
  "[": "bracketleft",
  "\\": "backslash",
  "]": "bracketright",
  "'": "quote",
};

// physical-key fallback keeps shortcuts layout- and shift-independent:
// ctrl+z must match when the active layout puts "я" on the Z key, and
// shift+/ must match although the shifted event.key is "?"
function toCode(key: string): string | null {
  if (/^[a-z]$/.test(key)) {
    return `key${key}`;
  }
  if (/^[0-9]$/.test(key)) {
    return `digit${key}`;
  }
  return PUNCTUATION_CODES[key] || null;
}

function isKey(shortcut: string, event: KeyboardEvent): boolean {
  const keys = shortcut.split("+").reduce<{
    modifiers: Record<ModifierKey, boolean>;
    key: string | null;
  }>(
    (acc, key) => {
      if (MODIFIERS[key]) {
        acc.modifiers[MODIFIERS[key]] = true;
        return acc;
      }

      return {
        ...acc,
        key: KEY_ALIASES[key] || key.toLowerCase(),
      };
    },
    {
      modifiers: {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      },
      key: null,
    },
  );

  const hasModifiers = (Object.keys(keys.modifiers) as ModifierKey[]).every(
    (key) => {
      const value = keys.modifiers[key];
      return value ? event[key] : !event[key];
    },
  );

  if (!keys.key) {
    return hasModifiers;
  }

  const matchesKey = event.key != null && event.key.toLowerCase() === keys.key;
  const code = toCode(keys.key);
  // composition keydowns carry the physical code, but the legacy matcher saw
  // keyCode 229 and never matched them — keep the fallback out of IME input
  const matchesCode =
    !event.isComposing &&
    code != null &&
    event.code != null &&
    event.code.toLowerCase() === code;

  return hasModifiers && (matchesKey || matchesCode);
}

export default isKey;
