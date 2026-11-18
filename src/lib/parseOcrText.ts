import type { SaleItemFields } from "./saleItem";

// OCR は全角・半角が混ざるので、数字と記号を半角にそろえてから判定する
function normalize(text: string): string {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[／]/g, "/")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[~〜～]/g, "〜");
}

const PERIOD_PATTERN = /\d{1,2}\/\d{1,2}(?:\s*\([日月火水木金土]\))?\s*(?:〜|-|から)\s*(?:\d{1,2}\/)?\d{1,2}(?:\s*\([日月火水木金土]\))?/;
const PRICE_PATTERN = /(?:税込\s*)?\d[\d,]*\s*円(?:引き?|引)?|\d{1,2}\s*%\s*(?:OFF|オフ|引き?)/i;

/**
 * OCR で読み取ったテキストから、入力欄の下書きを作る。
 * 読み取りは誤りを含む前提なので、見つからない欄は空のままにする（推測で埋めない）。
 */
export function parseOcrText(raw: string): SaleItemFields {
  const text = normalize(raw);
  const period = text.match(PERIOD_PATTERN)?.[0].replace(/\s+/g, "") ?? "";
  const price = text.match(PRICE_PATTERN)?.[0].replace(/\s+/g, "") ?? "";

  // 名前は、期間や価格だけの行を除いた最初の行
  const name =
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => {
        if (line.length < 2) return false;
        const rest = line.replace(PERIOD_PATTERN, "").replace(PRICE_PATTERN, "").trim();
        return rest.length >= 2;
      }) ?? "";

  return { name, price, period, note: "" };
}
