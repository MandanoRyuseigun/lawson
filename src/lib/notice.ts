import type { SaleItem } from "./saleItem";

/** 1 項目を告知文用の行に整える。入力された値だけを使い、空の欄は出さない。 */
function formatItem(item: SaleItem): string {
  const head = item.price ? `・${item.name}　${item.price}` : `・${item.name}`;
  const lines = [head];
  if (item.period) lines.push(`　📅 ${item.period}`);
  if (item.note) lines.push(`　※${item.note}`);
  return lines.join("\n");
}

/**
 * 選択された項目から、従業員向けの LINE 告知文を作る。
 * 重要項目は先頭の「特に注目」欄にまとめる。
 */
export function generateNotice(items: SaleItem[], startDateLabel: string): string {
  const selected = items.filter((item) => item.selected && item.name.trim() !== "");
  const important = selected.filter((item) => item.important);
  const others = selected.filter((item) => !item.important);

  const sections: string[] = [
    `🎉【${startDateLabel}スタート】今週のセール情報です！`,
  ];

  if (selected.length === 0) {
    sections.push("今回は告知するセールがまだ選ばれていません。");
    return sections.join("\n\n");
  }

  if (important.length > 0) {
    sections.push(["⭐ 特に注目！", ...important.map(formatItem)].join("\n"));
  }

  if (others.length > 0) {
    const title = important.length > 0 ? "✨ そのほかのセール" : "✨ セール内容";
    sections.push([title, ...others.map(formatItem)].join("\n"));
  }

  sections.push("お客様へのお声がけ、よろしくお願いします💪\n今週も一緒にがんばりましょう！");

  return sections.join("\n\n");
}
