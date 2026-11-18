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
 *   （「11724(火)」や「11724-11730」の「7」は「/」が化けたものとみなす）
 */
export function normalizeOcrText(text: string): string {
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
      // 「11724-11730」のような期間も、両方が日付として成り立てば「11/24-11/30」に直す
      .replace(
        /(?<![\d/])(\d{1,2})7(\d{1,2})(\s*[-〜ー]\s*)(\d{1,2})[7/](\d{1,2})(?!\d)/g,
        (match, m1: string, d1: string, sep: string, m2: string, d2: string) =>
          isValidDate(m1, d1) && isValidDate(m2, d2) ? `${m1}/${d1}${sep}${m2}/${d2}` : match,
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
  const text = normalizeOcrText(raw);
  const period = text.match(PERIOD_PATTERN)?.[0].replace(/\s+/g, "") ?? "";
  const price = text.match(PRICE_PATTERN)?.[0].replace(/\s+/g, "") ?? "";

  // 名前は、各行から期間と価格を除いて 2 文字以上残る最初の行
  const name =
    text
      .split(/\r?\n/)
      .map((line) => line.replace(PERIOD_PATTERN, "").replace(PRICE_PATTERN, "").trim())
      .find((rest) => rest.length >= 2) ?? "";

  return { name, price, period, note: "", emoji: "", section: "other" };
}

/**
 * 行頭のチェック欄や箇条書きの記号を除く（店舗資料の「□」は OCR で「ロ」「ロロ」「口」に化けやすい）。
 * 「ロ」1 文字は、続く文字がカタカナでないときだけチェック欄とみなす（「ロールケーキ」などを削らないため）。
 */
function stripLeadingMarks(rawLine: string): string {
  return rawLine
    .trimStart()
    .replace(/^(?:[□■☐◻]|口|ロロ)\s*/, "")
    .replace(/^ロ\s+(?=[^\s\u30A0-\u30FF])/, "")
    .replace(/^[・･•·]\s*/, "");
}

/** 文字として意味のある文字（ひらがな・カタカナ・漢字・英数字） */
const MEANINGFUL = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9]/gu;

/**
 * OCR で読み取ったテキストを、ピックアップしやすい行の一覧にする。
 * 誤読の補正や空白の詰めをした上で、意味のある文字が 2 文字未満の行（罫線や汚れの誤読など）と、
 * 同じ内容の行の重複は除く。
 */
export function splitOcrLines(raw: string): string[] {
  const lines = normalizeOcrText(raw.split(/\r?\n/).map(stripLeadingMarks).join("\n"))
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/[ \t]+/g, " ")
        .replace(/\s*([:：])\s*/g, "$1")
        .replace(/[\s|｜」_]+$/, "")
        .trim(),
    )
    .filter((line) => (line.match(MEANINGFUL) ?? []).length >= 2);
  return [...new Set(lines)];
}
