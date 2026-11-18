import { sectionOf, type SaleItem } from "./saleItem";

type Rule = [RegExp, string];

/** キャンペーンの内容から選ぶ絵文字（上から順に当てはめる） */
const CAMPAIGN_EMOJI: Rule[] = [
  [/クリスマス/, "🎄"],
  [/おせち|年末|正月|催事/, "🎍"],
  [/チャレンジ|増量|盛り/, "🎉"],
  [/もらえる|無料|引換/, "🎁"],
  [/値引券|クーポン|レシート/, "🎟️"],
  [/Ponta|ポイント/i, "💳"],
  [/くじ/, "🎯"],
  [/予約/, "📝"],
  [/円引|%|％|お買い得|セール|割引/, "🉐"],
];

/** 商品（主に FF）から選ぶ絵文字（上から順に当てはめる） */
const PRODUCT_EMOJI: Rule[] = [
  [/からあげクン/, "🐔"],
  [/まん/, "🥟"],
  [/チキ|から揚|からあげ|唐揚|鶏|フライ|コロッケ|カツ|揚げ/, "🍗"],
  [/おでん|串|焼き鳥|焼鳥/, "🍢"],
  [/ポテト/, "🍟"],
  [/コーヒー|ラテ|フラッペ|カフェ|ブレンド/, "☕"],
  [/いも|芋/, "🍠"],
  [/弁当|丼|おにぎり/, "🍱"],
];

/** どれにも当たらないときの絵文字 */
export const DEFAULT_EMOJI = "📌";

function firstMatch(name: string, ...ruleSets: Rule[][]): string | undefined {
  for (const rules of ruleSets) {
    const hit = rules.find(([pattern]) => pattern.test(name));
    if (hit) return hit[1];
  }
  return undefined;
}

/**
 * 名前から、告知文で頭に付ける絵文字を選ぶ。
 * メイン欄（FF）は商品を先に、その他欄はキャンペーンの内容を先に見る。
 */
export function keywordEmoji(name: string, section: "main" | "other" = "other"): string {
  const order = section === "main" ? [PRODUCT_EMOJI, CAMPAIGN_EMOJI] : [CAMPAIGN_EMOJI, PRODUCT_EMOJI];
  return firstMatch(name, ...order) ?? DEFAULT_EMOJI;
}

/** 項目の頭に付ける絵文字。編集で入れた絵文字（FF はカテゴリの絵文字）があればそれ、なければ名前から選ぶ */
export function itemEmoji(item: Pick<SaleItem, "emoji" | "name" | "section">): string {
  return item.emoji || keywordEmoji(item.name, sectionOf(item));
}
