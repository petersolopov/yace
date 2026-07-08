import { injectStyles } from "./injectStyles.ts";
import { decorate, escapeHtml, escapeAttr } from "./words.ts";

interface SliceGlitchOptions {
  interval?: number;
  duration?: number;
  shift?: number;
  fringe?: number;
  opacity?: number;
  words?: Array<string | RegExp>;
}

// each logical line is a block: a block anchors the absolute colour channels
// exactly over the ink and soft-wraps its text the same way the textarea
// does; the ink layer is never transformed so text stays under the caret
const BASE_CSS = `
.yace-slice{position:relative;display:block;color:inherit}
.yace-slice__main{position:relative;display:block;z-index:2;animation:var(--ysg-dur) steps(1) infinite}
.yace-slice::before,.yace-slice::after{content:attr(data-text);position:absolute;z-index:1;inset:0;pointer-events:none;font:inherit;letter-spacing:inherit;white-space:pre-wrap;overflow-wrap:break-word;word-break:keep-all;opacity:var(--ysg-op);animation:var(--ysg-dur) steps(1) infinite}
.yace-slice::before{color:var(--yace-slice-a,#d6006e)}
.yace-slice::after{color:var(--yace-slice-b,#0088b0)}
.yace-slice~br{display:none}
.yace-slice-word{position:relative;display:inline-block;color:inherit}
.yace-slice-word__ink{position:relative;display:inline-block;z-index:2;animation:var(--ysg-dur) steps(1) infinite}
.yace-slice-word::before,.yace-slice-word::after{content:attr(data-text);position:absolute;z-index:1;inset:0;pointer-events:none;font:inherit;letter-spacing:inherit;opacity:var(--ysg-op);animation:var(--ysg-dur) steps(1) infinite}
.yace-slice-word::before{color:var(--yace-slice-a,#d6006e)}
.yace-slice-word::after{color:var(--yace-slice-b,#0088b0)}
`;

// burst rows: the ink is cut into bands so no whole letters survive while the
// colour channels shift into the gaps; x offsets are em multipliers
const STEPS = [
  { m: "0 0 72% 0", a: "30% 0 44% 0", ax: 0.16, b: "62% 0 12% 0", bx: -0.17 },
  { m: "22% 0 52% 0", a: "58% 0 18% 0", ax: -0.18, b: "14% 0 66% 0", bx: 0.19 },
  { m: "46% 0 30% 0", a: "6% 0 74% 0", ax: 0.13, b: "44% 0 32% 0", bx: -0.12 },
  { m: "64% 0 14% 0", a: "40% 0 34% 0", ax: -0.15, b: "72% 0 6% 0", bx: 0.16 },
  { m: "80% 0 4% 0", a: "70% 0 8% 0", ax: 0.1, b: "28% 0 50% 0", bx: -0.14 },
  { m: "12% 0 62% 0", a: "24% 0 54% 0", ax: -0.2, b: "54% 0 24% 0", bx: 0.2 },
  { m: "38% 0 40% 0", a: "52% 0 26% 0", ax: 0.14, b: "4% 0 80% 0", bx: -0.1 },
  { m: "58% 0 22% 0", a: "84% 0 2% 0", ax: -0.08, b: "36% 0 40% 0", bx: 0.07 },
];

const BURST_END = 88;

// keyframe percentages cannot read custom properties, so every distinct
// burst-to-interval ratio gets its own generated keyframes + binding class
function variantCss(key: string, burstPct: number): string {
  const start = BURST_END - burstPct;
  const step = burstPct / STEPS.length;
  const pos = (i: number) => (start + i * step).toFixed(2);
  const amp = (x: number) => `translate(calc(${x}em * var(--ysg-amp)),0)`;
  const fringeA = "translate(calc(-1 * var(--ysg-fringe)),0)";
  const fringeB = "translate(var(--ysg-fringe),0)";

  const m = STEPS.map((s, i) => `${pos(i)}%{clip-path:inset(${s.m})}`).join("");
  const a = STEPS.map(
    (s, i) => `${pos(i)}%{clip-path:inset(${s.a});transform:${amp(s.ax)}}`,
  ).join("");
  const b = STEPS.map(
    (s, i) => `${pos(i)}%{clip-path:inset(${s.b});transform:${amp(s.bx)}}`,
  ).join("");

  // the -word classes reuse the block keyframes but need their own binding
  // selectors: word markup carries distinct classes so it never matches the
  // .yace-slice~br rule that hides render()'s trailing <br/>
  return `
.yace-slice__main--${key}{animation-name:yace-slice-m-${key}}
.yace-slice--${key}::before{animation-name:yace-slice-a-${key}}
.yace-slice--${key}::after{animation-name:yace-slice-b-${key}}
.yace-slice-word__ink--${key}{animation-name:yace-slice-m-${key}}
.yace-slice-word--${key}::before{animation-name:yace-slice-a-${key}}
.yace-slice-word--${key}::after{animation-name:yace-slice-b-${key}}
@keyframes yace-slice-m-${key}{0%,${BURST_END}%,100%{clip-path:inset(0 0 0 0)}${m}}
@keyframes yace-slice-a-${key}{0%,${BURST_END}%,100%{clip-path:inset(0 0 0 0);transform:${fringeA}}${a}}
@keyframes yace-slice-b-${key}{0%,${BURST_END}%,100%{clip-path:inset(0 0 0 0);transform:${fringeB}}${b}}
`;
}

// fun highlighter: periodically shatters each line into displaced slices with
// RGB channel copies; channel colours are overridable via --yace-slice-a/-b.
// With `words`, only the matching words glitch inline and the rest is plain text
export const sliceGlitch = (
  options: SliceGlitchOptions = {},
): ((value: string, context?: { html: boolean }) => string) => {
  const {
    interval = 3600,
    duration = 900,
    shift = 1,
    fringe = 0.035,
    opacity = 0.95,
    words,
  } = options;

  // the duration/interval fraction drives the keyframe spread; duration ≥
  // interval clamps to the 85% ceiling — a continuous glitch
  const burstPct = Math.min(85, Math.max(3, (duration / interval) * 100));
  const key = `b${burstPct.toFixed(2).replace(".", "-")}`;

  injectStyles("yace-highlighter-slice", BASE_CSS);
  injectStyles(`yace-highlighter-slice-${key}`, variantCss(key, burstPct));

  const vars = `--ysg-dur:${interval}ms;--ysg-amp:${shift};--ysg-fringe:${fringe}em;--ysg-op:${opacity}`;

  if (words && words.length > 0) {
    return (value: string, context?: { html: boolean }): string =>
      decorate(value, {
        words,
        html: context?.html ?? false,
        renderWord: ({ text, attr }) =>
          `<span class="yace-slice-word yace-slice-word--${key}" style="${vars}" data-text="${attr}"><span class="yace-slice-word__ink yace-slice-word__ink--${key}">${text}</span></span>`,
      });
  }

  // line blocks carry the layout, so the newline separators and the trailing
  // <br/> yace appends would each add an extra line box — the blocks replace
  // them (see the .yace-slice~br rule)
  return (value: string): string =>
    value
      .split("\n")
      .map(
        (line) =>
          `<span class="yace-slice yace-slice--${key}" style="${vars}" data-text="${escapeAttr(line)}"><span class="yace-slice__main yace-slice__main--${key}">${line === "" ? "<br/>" : escapeHtml(line)}</span></span>`,
      )
      .join("");
};
