import { itemEmoji } from "./itemEmoji";
import { releaseLabel, releaseWeek } from "./newRelease";
import { sectionOf, type SaleItem } from "./saleItem";

export type NoticeOptions = {
  /** 告知の開始日（YYYY-MM-DD）。新商品の何週目かの判定にも使う */
  startDate: string;
  /** 前週のメインの取り組み（例: 「からあげクンmilkコラボの拡販」） */
  thanks: string;
  /** 結びの挨拶 */
  closing: string;
};

/** 1 項目を告知文の行にする。頭に絵文字を付け、入力された値だけを使い、空の欄は出さない */
function formatItem(item: SaleItem, startDate: string): string {
  let line = `${itemEmoji(item)}${item.name}`;
  const label = releaseLabel(releaseWeek(item, startDate));
  if (label) line += `　${label}`;
  if (item.price) line += `　${item.price}`;
  if (item.note) line += `\n→${item.note}`;
  return line;
}

/** ⭐重要 → 新発売（1 週目） → 新発売（2 週目） → それ以外 の順に並べる（同じ順位の中は元の順） */
function orderForNotice(items: SaleItem[], startDate: string): SaleItem[] {
  const rank = (i: SaleItem) => {
    if (i.important) return 0;
    const week = releaseWeek(i, startDate);
    return week === 1 ? 1 : week === 2 ? 2 : 3;
  };
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index)
    .map(({ item }) => item);
}

/**
 * 選ばれた項目から、従業員向けの LINE 告知文を作る。
 * 構成: 挨拶 → 前週のお礼 → 今週のお知らせ（メイン欄: FF） → その他 → 結び
 */
export function generateNotice(items: SaleItem[], options: NoticeOptions): string {
  const selected = items.filter((item) => item.selected && item.name.trim() !== "");
  const { startDate } = options;
  const format = (item: SaleItem) => formatItem(item, startDate);
  const main = orderForNotice(selected.filter((i) => sectionOf(i) === "main"), startDate);
  const others = orderForNotice(selected.filter((i) => sectionOf(i) === "other"), startDate);

  const thanks = options.thanks.trim();
  const blocks: string[] = [
    `お疲れ様です。\n今週も${thanks}ありがとうございました🙇‍♂️`,
  ];

  const announcement = [`${formatMonthDay(startDate)}からのお知らせです。`, ...main.map(format)];
  // メイン欄が空なら、その他の項目を見出しなしでお知らせの下に続ける
  if (main.length === 0) announcement.push(...others.map(format));
  blocks.push(announcement.join("\n"));

  if (main.length > 0 && others.length > 0) {
    blocks.push(["その他", ...others.map(format)].join("\n"));
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
