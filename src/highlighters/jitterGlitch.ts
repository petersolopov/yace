import injectStyles from "./injectStyles.ts";
import { decorate, escapeHtml, escapeAttr } from "./words.ts";

interface JitterGlitchOptions {
  interval?: number;
  duration?: number;
  shift?: number;
  fringe?: number;
  opacity?: number;
  words?: Array<string | RegExp>;
}

// each logical line is a block: a block anchors the absolute colour channels
// exactly over the ink and soft-wraps its text the same way the textarea
// does; the ink layer never moves, only the channels tremble
const BASE_CSS = `
.yace-jitter{position:relative;display:block;color:inherit}
.yace-jitter__main{position:relative;display:block;z-index:2}
.yace-jitter::before,.yace-jitter::after{content:attr(data-text);position:absolute;z-index:1;inset:0;pointer-events:none;font:inherit;letter-spacing:inherit;white-space:pre-wrap;overflow-wrap:break-word;word-break:keep-all;opacity:var(--yjg-op);mix-blend-mode:screen;animation:var(--yjg-dur) steps(1) infinite}
.yace-jitter::before{color:var(--yace-jitter-a,#d6006e)}
.yace-jitter::after{color:var(--yace-jitter-b,#0088b0)}
.yace-jitter~br{display:none}
.yace-jitter-word{position:relative;display:inline-block;color:inherit}
.yace-jitter-word__ink{position:relative;display:inline-block;z-index:2}
.yace-jitter-word::before,.yace-jitter-word::after{content:attr(data-text);position:absolute;z-index:1;inset:0;pointer-events:none;font:inherit;letter-spacing:inherit;opacity:var(--yjg-op);mix-blend-mode:screen;animation:var(--yjg-dur) steps(1) infinite}
.yace-jitter-word::before{color:var(--yace-jitter-a,#d6006e)}
.yace-jitter-word::after{color:var(--yace-jitter-b,#0088b0)}
`;

// burst rows: channel tears, x offsets are em multipliers, y offsets px
const STEPS = [
  { ax: -0.03, ay: -1, bx: 0.03, by: 1 },
  { ax: -0.13, ay: 1, bx: 0.14, by: -1 },
  { ax: 0.045, ay: 0, bx: -0.05, by: 0 },
  { ax: -0.08, ay: 1, bx: 0.09, by: -1 },
];

const BURST_END = 88;

// keyframe percentages cannot read custom properties, so every distinct
// burst-to-interval ratio gets its own generated keyframes + binding class
function variantCss(key: string, burstPct: number): string {
  const start = BURST_END - burstPct;
  const step = burstPct / STEPS.length;
  const pos = (i: number) => (start + i * step).toFixed(2);
  const amp = (x: number, y: number) =>
    `translate(calc(${x}em * var(--yjg-amp)),${y}px)`;
  const fringeA = "translate(calc(-1 * var(--yjg-fringe)),0)";
  const fringeB = "translate(var(--yjg-fringe),0)";

  const a = STEPS.map(
    (s, i) => `${pos(i)}%{transform:${amp(s.ax, s.ay)}}`,
  ).join("");
  const b = STEPS.map(
    (s, i) => `${pos(i)}%{transform:${amp(s.bx, s.by)}}`,
  ).join("");

  // the -word classes reuse the block keyframes but need their own binding
  // selectors: word markup carries distinct classes so it never matches the
  // .yace-jitter~br rule that hides render()'s trailing <br/>
  return `
.yace-jitter--${key}::before{animation-name:yace-jitter-a-${key}}
.yace-jitter--${key}::after{animation-name:yace-jitter-b-${key}}
.yace-jitter-word--${key}::before{animation-name:yace-jitter-a-${key}}
.yace-jitter-word--${key}::after{animation-name:yace-jitter-b-${key}}
@keyframes yace-jitter-a-${key}{0%,${BURST_END}%,100%{transform:${fringeA}}${a}}
@keyframes yace-jitter-b-${key}{0%,${BURST_END}%,100%{transform:${fringeB}}${b}}
`;
}

// fun highlighter: the original yace glitch — RGB channel copies tremble
// around the text in periodic bursts; colours via --yace-jitter-a/-b.
// With `words`, only the matching words tremble inline and the rest is plain text
const jitterGlitch = (
  options: JitterGlitchOptions = {},
): ((value: string, context?: { html: boolean }) => string) => {
  const {
    interval = 3200,
    duration = 800,
    shift = 1,
    fringe = 0.02,
    opacity = 0.95,
    words,
  } = options;

  // the duration/interval fraction drives the keyframe spread; duration ≥
  // interval clamps to the 85% ceiling — a continuous glitch
  const burstPct = Math.min(85, Math.max(3, (duration / interval) * 100));
  const key = `b${burstPct.toFixed(2).replace(".", "-")}`;

  injectStyles("yace-highlighter-jitter", BASE_CSS);
  injectStyles(`yace-highlighter-jitter-${key}`, variantCss(key, burstPct));

  const vars = `--yjg-dur:${interval}ms;--yjg-amp:${shift};--yjg-fringe:${fringe}em;--yjg-op:${opacity}`;

  if (words && words.length > 0) {
    return (value: string, context?: { html: boolean }): string =>
      decorate(value, {
        words,
        html: context?.html ?? false,
        renderWord: ({ text, attr }) =>
          `<span class="yace-jitter-word yace-jitter-word--${key}" style="${vars}" data-text="${attr}"><span class="yace-jitter-word__ink">${text}</span></span>`,
      });
  }

  // line blocks carry the layout, so the newline separators and the trailing
  // <br/> yace appends would each add an extra line box — the blocks replace
  // them (see the .yace-jitter~br rule)
  return (value: string): string =>
    value
      .split("\n")
      .map(
        (line) =>
          `<span class="yace-jitter yace-jitter--${key}" style="${vars}" data-text="${escapeAttr(line)}"><span class="yace-jitter__main">${line === "" ? "<br/>" : escapeHtml(line)}</span></span>`,
      )
      .join("");
};

export default jitterGlitch;
