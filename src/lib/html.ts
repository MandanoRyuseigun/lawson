const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  reg: "®",
  copy: "©",
  trade: "™",
};

/** HTML の文字参照（&amp; &reg; &#12354; など）を元の文字に戻す */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * タグを除いて文字だけにする。<br> は空白にし、改行などの半角の空白は詰める。
 * 全角スペースはサイトの表記どおり残す。
 */
export function htmlToText(fragment: string): string {
  return decodeEntities(fragment.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""))
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

/** コメントアウトされた部分を除く */
export function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}
