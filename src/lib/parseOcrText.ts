import type { SaleItemFields } from "./saleItem";

const WEEKDAY_PAREN = String.raw`\([日月火水木金土]\)`;

/** 月・日として成り立つ数字か */
function isValidDate(month: string, day: string): boolean {
  const m = Number(month);
  const d = Number(day);
  return m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

/**
 * OCR の結果を判定しやすい形にそろえる。
 * - 全角の数字・記号を半角にする
 * - 日本語の前後に入る余計な空白を詰める（例:「か ら あ げ」「( 火 )」）
 * - よくある誤読を直す: 日付の「/」→「7」、期間の「〜」→「ー」
 */
function normalize(text: string): string {
  return (
    text
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/[／]/g, "/")
      .replace(/[（]/g, "(")
      .replace(/[）]/g, ")")
      .replace(/[~〜～]/g, "〜")
      .replace(/[ \t　]+(?=[^\x00-\x7F])|(?<=[^\x00-\x7F])[ \t　]+/g, "")
      // 曜日の直前の「11724」は「11/24」の「/」が「7」に化けたものとみなす
      .replace(
        new RegExp(String.raw`(?<![\d/])(\d{1,2})7(\d{1,2})(?=${WEEKDAY_PAREN})`, "g"),
        (match, month: string, day: string) => (isValidDate(month, day) ? `${month}/${day}` : match),
      )
      // 曜日の後ろの長音や横棒は期間の「〜」とみなす
      .replace(new RegExp(String.raw`(?<=${WEEKDAY_PAREN})\s*[ー一−—–-]\s*(?=\d)`, "g"), "〜")
  );
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

  // 名前は、各行から期間と価格を除いて 2 文字以上残る最初の行
  const name =
    text
      .split(/\r?\n/)
      .map((line) => line.replace(PERIOD_PATTERN, "").replace(PRICE_PATTERN, "").trim())
      .find((rest) => rest.length >= 2) ?? "";

  return { name, price, period, note: "" };
}
