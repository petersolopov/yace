import { Yace } from "yace";
import { tab } from "yace/plugins/tab";
import { history } from "yace/plugins/history";
import { preserveIndent } from "yace/plugins/preserveIndent";
import { code } from "yace/highlighters/code";
import { sliceGlitch } from "yace/highlighters/sliceGlitch";
import { shimmer } from "yace/highlighters/shimmer";
import { initTheme } from "./theme.js";

const BUBBLES = [
  { left: "10%", size: 12, delay: 0, digit: "0" },
  { left: "26%", size: 10, delay: 3.4, digit: "1" },
  { left: "40%", size: 13, delay: 6.1, digit: "1" },
  { left: "54%", size: 10, delay: 2.2, digit: "0" },
  { left: "68%", size: 12, delay: 7.5, digit: "1" },
  { left: "80%", size: 11, delay: 4.8, digit: "0" },
  { left: "90%", size: 13, delay: 1.3, digit: "1" },
];

const SNIPPET = `// the setup behind this editor — it's live, edit it
import { Yace } from "yace";

// core plugins — if you need them: tab key, undo/redo, indentation
import { tab } from "yace/plugins/tab";
import { history } from "yace/plugins/history";
import { preserveIndent } from "yace/plugins/preserveIndent";

// bundled highlighter; any (code) => html function works here
import { code } from "yace/highlighters/code";

const editor = new Yace("#editor", {
  value: "console.log('yace')",
  lineNumbers: true,
  highlighters: [code()],
  plugins: [history(), tab(), preserveIndent()],
});

// fires after every change
editor.onUpdate((value) => console.log(value));`;

const TAGLINE_TEXT = `Not just code. Bring any highlighter — paint tokens, shimmer keywords or glitch errors as you type.`;

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

// stage 0 of the tagline pipeline: escapes and paints the static accents;
// the packaged word highlighters ride on top as html-aware stages
function taglineBase(value) {
  return escapeHtml(value).replace(
    /\bpaint tokens\b/,
    '<span class="hero__token hero__token--a">paint</span><span class="hero__token hero__token--b"> tokens</span>',
  );
}

function initLiveTagline() {
  const tagline = new Yace("#hero-tagline-live", {
    value: TAGLINE_TEXT,
    highlighters: [
      taglineBase,
      shimmer({ words: ["shimmer keywords"] }),
      sliceGlitch({
        words: ["glitch errors"],
        interval: 4000,
        duration: 450,
        shift: 1.75,
      }),
    ],
    styles: {
      fontFamily: "inherit",
      fontSize: "var(--tagline-font-size)",
      lineHeight: "var(--tagline-line-height)",
      // the glitch channels poke a couple px out of the word box
      overflow: "visible",
    },
  });

  // display piece, not an input; hide from AT since the pre already exposes the
  // text and a bare disabled textarea leaks into some AT combinations
  tagline.textarea.disabled = true;
  tagline.textarea.setAttribute("aria-hidden", "true");
  shieldFromAutofill(tagline.textarea, "tagline-demo");
}

// password managers court anonymous fields near the top of the page: a
// neutral name plus the vendor opt-outs stops them from offering credentials
function shieldFromAutofill(textarea, name) {
  textarea.id = name;
  textarea.name = name;
  textarea.setAttribute("data-1p-ignore", "");
  textarea.setAttribute("data-lpignore", "true");
  textarea.setAttribute("data-bwignore", "true");
}

function initBubbles() {
  const bubbles = document.querySelector(".hero__bubbles");
  for (const bubble of BUBBLES) {
    const span = document.createElement("span");
    span.className = "hero__bubble";
    span.textContent = bubble.digit;
    span.style.left = bubble.left;
    span.style.fontSize = `${bubble.size}px`;
    span.style.animationDelay = `${bubble.delay}s`;
    bubbles.appendChild(span);
  }
}

function initEditor() {
  const editor = new Yace("#editor", {
    value: SNIPPET,
    lineNumbers: true,
    highlighters: [code()],
    plugins: [history(), tab(), preserveIndent()],
    styles: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--editor-font-size)",
      lineHeight: "var(--editor-line-height)",
      paddingTop: "var(--editor-padding)",
      paddingRight: "var(--editor-padding)",
      paddingBottom: "var(--editor-padding)",
      paddingLeft: "var(--editor-padding)",
    },
  });

  editor.textarea.style.caretColor = "var(--accent)";
  shieldFromAutofill(editor.textarea, "snippet-demo");
}

function initCopyButton() {
  const button = document.querySelector(".hero__button--primary");
  const label = button.querySelector(".hero__button-label");
  const command = label.textContent;
  // lock the width so swapping in the shorter feedback text does not shift the row
  button.style.minWidth = `${button.offsetWidth}px`;

  let revert;
  const flash = (text) => {
    label.textContent = text;
    clearTimeout(revert);
    revert = setTimeout(() => (label.textContent = command), 1500);
  };

  button.addEventListener("click", () => {
    const clipboard = navigator.clipboard;
    if (!clipboard) {
      flash("copy failed");
      return;
    }
    clipboard.writeText(command).then(
      () => flash("copied"),
      () => flash("copy failed"),
    );
  });
}

initTheme();
initBubbles();
initLiveTagline();
initEditor();
initCopyButton();
