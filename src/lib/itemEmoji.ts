import type { SaleItem } from "./saleItem";

/** 名前に含まれる言葉と、頭に付ける絵文字（上から順に当てはめる） */
const KEYWORD_EMOJI: [RegExp, string][] = [
  [/クリスマス/, "🎄"],
  [/おせち|年末|正月|催事/, "🎍"],
  [/チャレンジ|増量|盛り/, "🎉"],
  [/もらえる|無料|引換/, "🎁"],
  [/値引券|クーポン/, "🎟️"],
  [/Ponta|ポイント/i, "💳"],
  [/くじ/, "🎯"],
  [/予約/, "📝"],
  [/円引|%|％|お買い得|セール|割引/, "🉐"],
];

/** どれにも当たらないときの絵文字 */
export const DEFAULT_EMOJI = "📌";

/** 名前から、告知文で頭に付ける絵文字を選ぶ */
export function keywordEmoji(name: string): string {
  return KEYWORD_EMOJI.find(([pattern]) => pattern.test(name))?.[1] ?? DEFAULT_EMOJI;
}

/** 項目の頭に付ける絵文字。編集で入れた絵文字（FF はカテゴリの絵文字）があればそれ、なければ名前から選ぶ */
export function itemEmoji(item: Pick<SaleItem, "emoji" | "name">): string {
  return item.emoji || keywordEmoji(item.name);
}
