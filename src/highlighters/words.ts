// shared inline-word scanner for the fun highlighters: finds the configured
// words and hands each match to renderWord, escaping the surrounding text.
// html:false walks raw code (escape everything); html:true walks a prior
// highlighter's output (copy every <…> tag run verbatim, match only inside the
// text between tags, never re-escape) — see the array-highlighter contract in
// the README.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

// mirror code()'s extraRules: strings match literally (regex-escaped,
// case-sensitive, every occurrence); RegExp keeps the author's i/u/s and drops
// g/y for the sticky scan
function compile(words: Array<string | RegExp>): RegExp[] {
  return words.map((word) => {
    if (typeof word === "string") {
      const source = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(source, "y");
    }
    return new RegExp(word.source, word.flags.replace(/[gy]/g, "") + "y");
  });
}

export interface DecorateOptions {
  words: Array<string | RegExp>;
  html: boolean;
  renderWord: (match: { text: string; attr: string }) => string;
}

export function decorate(value: string, options: DecorateOptions): string {
  const { words, html, renderWord } = options;
  const patterns = compile(words);

  // scan one text run: first pattern in array order wins at each position,
  // non-overlapping, left-to-right; a zero-length match cannot advance the
  // cursor so it is skipped as a plain char (guards against /a*/-style patterns)
  const emitRun = (run: string): string => {
    let out = "";
    let plain = "";
    let i = 0;

    const flushPlain = () => {
      if (plain) {
        out += html ? plain : escapeHtml(plain);
        plain = "";
      }
    };

    while (i < run.length) {
      let match = "";
      for (const pattern of patterns) {
        pattern.lastIndex = i;
        const result = pattern.exec(run);
        if (result && result[0].length > 0) {
          match = result[0];
          break;
        }
      }

      if (match === "") {
        plain += run[i];
        i += 1;
        continue;
      }

      flushPlain();
      const escaped = html ? match : escapeHtml(match);
      out += renderWord({
        text: escaped,
        attr: escaped.replace(/"/g, "&quot;"),
      });
      i += match.length;
    }

    flushPlain();
    return out;
  };

  if (!html) {
    return emitRun(value);
  }

  let out = "";
  let last = 0;
  const tagRe = /<[^>]*>/g;
  let tag: RegExpExecArray | null;
  while ((tag = tagRe.exec(value))) {
    out += emitRun(value.slice(last, tag.index));
    out += tag[0];
    last = tagRe.lastIndex;
  }
  out += emitRun(value.slice(last));

  return out;
}
