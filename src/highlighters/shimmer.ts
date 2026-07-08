import injectStyles from "./injectStyles.ts";
import { decorate, escapeHtml, escapeAttr } from "./words.ts";

interface ShimmerOptions {
  interval?: number;
  duration?: number;
  words?: Array<string | RegExp>;
  colors?: { base?: string; band?: string };
}

// muted base + bright band, tuned to the site's dark hero (base = --muted,
// band = --accent2); both overridable via --yace-shimmer-base/-band or `colors`
const BASE_CSS = `
.yace-shimmer{background:linear-gradient(100deg,var(--yace-shimmer-base,#6b6b8a) 38%,var(--yace-shimmer-band,#00e9ff) 50%,var(--yace-shimmer-base,#6b6b8a) 62%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:var(--ysh-dur) linear infinite}
`;

// the gradient tiles every 166.67% of position, so one sweep (133.34% →
// -33.33%) travels exactly one period and the loop restart is invisible; after
// the sweep the band parks off-screen for the rest of the cycle (the rest phase)
function variantCss(key: string, active: number): string {
  return `
.yace-shimmer--${key}{animation-name:yace-shimmer-${key}}
@keyframes yace-shimmer-${key}{0%{background-position:133.34% 0}${active.toFixed(2)}%{background-position:-33.33% 0}100%{background-position:-33.33% 0}}
`;
}

// fun highlighter: a light band sweeps across the text every `interval`, then
// rests; colours via --yace-shimmer-base/-band or `colors`. With `words`, only
// the matching words shimmer inline and the rest is plain text
const shimmer = (
  options: ShimmerOptions = {},
): ((value: string, context?: { html: boolean }) => string) => {
  const { interval = 3400, duration = 1530, words, colors = {} } = options;

  // fraction of the cycle spent sweeping; ceiling 100 is a continuous shimmer
  // (unlike sliceGlitch's 85 — a full-cycle sweep is meaningful here), floor 3
  // keeps a tiny duration from collapsing into a one-frame flash
  const active = Math.min(100, Math.max(3, (duration / interval) * 100));
  const key = `a${active.toFixed(2).replace(".", "-")}`;

  injectStyles("yace-highlighter-shimmer", BASE_CSS);
  injectStyles(`yace-highlighter-shimmer-${key}`, variantCss(key, active));

  // colors are user strings baked into the quoted style attribute — attr-escape
  // them so a stray quote cannot break out and inject markup
  let vars = `--ysh-dur:${interval}ms`;
  if (colors.base != null) {
    vars += `;--yace-shimmer-base:${escapeAttr(colors.base)}`;
  }
  if (colors.band != null) {
    vars += `;--yace-shimmer-band:${escapeAttr(colors.band)}`;
  }

  if (words && words.length > 0) {
    return (value: string, context?: { html: boolean }): string =>
      decorate(value, {
        words,
        html: context?.html ?? false,
        renderWord: ({ text }) =>
          `<span class="yace-shimmer yace-shimmer--${key}" style="${vars}">${text}</span>`,
      });
  }

  return (value: string): string =>
    `<span class="yace-shimmer yace-shimmer--${key}" style="${vars}">${escapeHtml(value)}</span>`;
};

export default shimmer;
