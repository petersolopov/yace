const CODES = {
  backspace: 8,
  tab: 9,
  enter: 13,
  shift: 16,
  control: 17,
  alt: 18,
  pause: 19,
  capslock: 20,
  escape: 27,
  " ": 32,
  pageup: 33,
  pagedown: 34,
  end: 35,
  home: 36,
  arrowleft: 37,
  arrowup: 38,
  arrowright: 39,
  arrowdown: 40,
  insert: 45,
  delete: 46,
  meta: 91,
  numlock: 144,
  scrolllock: 145,
  ";": 186,
  "=": 187,
  ",": 188,
  "-": 189,
  ".": 190,
  "/": 191,
  "`": 192,
  "[": 219,
  "\\": 220,
  "]": 221,
  "'": 222,

  // aliases
  add: 187,
};

const IS_MAC =
  typeof window != "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);

const MODIFIERS = {
  alt: "altKey",
  control: "ctrlKey",
  meta: "metaKey",
  shift: "shiftKey",
  "ctrl/cmd": IS_MAC ? "metaKey" : "ctrlKey",
};

function toKeyCode(name) {
  return CODES[name] || name.toUpperCase().charCodeAt(0);
}

function isKey(string, event) {
  const keys = string.split("+").reduce(
    (acc, key) => {
      if (MODIFIERS[key]) {
        acc.modifiers[MODIFIERS[key]] = true;
        return acc;
      }

      return {
        ...acc,
        keyCode: toKeyCode(key),
      };
    },
    {
      modifiers: {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      },
      keyCode: null,
    }
  );

  const hasModifiers = Object.keys(keys.modifiers).every((key) => {
    const value = keys.modifiers[key];
    return value ? event[key] : !event[key];
  });

  const hasKey = keys.keyCode ? event.which === keys.keyCode : true;

  return hasModifiers && hasKey;
}

export default isKey;
