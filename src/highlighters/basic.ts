export interface BasicRule {
  type: string;
  pattern: RegExp;
}

const DEFAULT_RULES: BasicRule[] = [
  { type: "com", pattern: /\/\/[^\n]*|\/\*[\s\S]*?\*\// },
  {
    type: "str",
    pattern: /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/,
  },
  {
    type: "kw",
    pattern:
      /\b(?:const|let|var|function|return|import|from|export|default|new|if|else|for|while|class|extends|true|false|null|undefined|async|await|this|void|interface|type|number|string)\b/,
  },
  { type: "num", pattern: /\d+\.?\d*/ },
  { type: "punc", pattern: /[{}()[\];,.:=>+\-*/%!<>&|?]/ },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

// tiny extensible highlighter: rules are tried in order at every position,
// extra rules take priority over the built-in ones; classes are `yace-tok yace-tok--*`,
// colors are the consumer's CSS
export const basic = (extraRules: BasicRule[] = []) => {
  const rules = [...extraRules, ...DEFAULT_RULES].map(({ type, pattern }) => ({
    type,
    // sticky is required for the position-anchored scan; keep the caller's
    // other flags (i, u, s) and drop the ones we override (g, y)
    pattern: new RegExp(
      pattern.source,
      pattern.flags.replace(/[gy]/g, "") + "y",
    ),
  }));

  return (value: string): string => {
    let html = "";
    let plain = "";
    let i = 0;

    const flush = () => {
      html += escapeHtml(plain);
      plain = "";
    };

    while (i < value.length) {
      const match = rules.find((rule) => {
        rule.pattern.lastIndex = i;
        return rule.pattern.test(value);
      });

      if (!match) {
        plain += value[i];
        i += 1;
        continue;
      }

      match.pattern.lastIndex = i;
      const [text] = match.pattern.exec(value) as RegExpExecArray;
      // a zero-length match (e.g. /a*/ off its char) cannot advance i; treat it
      // as a plain char so the scan never spins in place
      if (text.length === 0) {
        plain += value[i];
        i += 1;
        continue;
      }
      flush();
      html += `<span class="yace-tok yace-tok--${escapeAttr(match.type)}">${escapeHtml(text)}</span>`;
      i += text.length;
    }

    flush();
    return html;
  };
};
