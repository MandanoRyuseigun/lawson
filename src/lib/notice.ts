import { sectionOf, type SaleItem } from "./saleItem";

export type NoticeOptions = {
  /** 開始日の表示（例: "11/17"） */
  dateLabel: string;
  /** 前週のメインの取り組み（例: 「からあげクンmilkコラボの拡販」） */
  thanks: string;
  /** 結びの挨拶 */
  closing: string;
};

/** 1 項目を告知文の行にする。入力された値だけを使い、空の欄は出さない */
function formatItem(item: SaleItem): string {
  let line = `${item.emoji ?? ""}${item.name}`;
  if (item.newRelease) line += "　新発売";
  if (item.price) line += `　${item.price}`;
  if (item.note) line += `\n→${item.note}`;
  return line;
}

/** ⭐重要の項目を先に、それ以外は元の順で並べる */
function importantFirst(items: SaleItem[]): SaleItem[] {
  return [...items.filter((i) => i.important), ...items.filter((i) => !i.important)];
}

/**
 * 選ばれた項目から、従業員向けの LINE 告知文を作る。
 * 構成: 挨拶 → 前週のお礼 → 今週のお知らせ（メイン欄: FF） → その他 → 結び
 */
export function generateNotice(items: SaleItem[], options: NoticeOptions): string {
  const selected = items.filter((item) => item.selected && item.name.trim() !== "");
  const main = importantFirst(selected.filter((i) => sectionOf(i) === "main"));
  const others = importantFirst(selected.filter((i) => sectionOf(i) === "other"));

  const thanks = options.thanks.trim();
  const blocks: string[] = [
    `お疲れ様です。\n今週も${thanks}ありがとうございました🙇‍♂️`,
  ];

  const announcement = [`${options.dateLabel}からのお知らせです。`, ...main.map(formatItem)];
  // メイン欄が空なら、その他の項目を見出しなしでお知らせの下に続ける
  if (main.length === 0) announcement.push(...others.map(formatItem));
  blocks.push(announcement.join("\n"));

  if (main.length > 0 && others.length > 0) {
    blocks.push(["その他", ...others.map(formatItem)].join("\n"));
  }

  const closing = options.closing.trim();
  if (closing) blocks.push(closing);

  return blocks.join("\n\n");
}

/** 月ごとの結びの挨拶の例文 */
export function seasonalClosing(month: number): string {
  if (month === 12 || month <= 2) return "寒い日が続くので、体調管理に気をつけて頑張っていきましょう！";
  if (month <= 5) return "季節の変わり目なので、体調管理に気をつけて頑張っていきましょう！";
  if (month <= 8) return "暑い日が続くので、こまめな水分補給を忘れずに頑張っていきましょう！";
  if (month === 9) return "朝晩の気温差が大きくなってきたので、体調管理に気をつけて頑張っていきましょう！";
  return "朝晩の冷え込みも激しいので、体調管理に気をつけて頑張っていきましょう！";
}

/** "2026-11-17" を「11/17」にする */
export function formatMonthDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}
