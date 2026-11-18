import { htmlToText, stripComments } from "./html";
import { SITE_ORIGIN } from "./lawsonSale";

/** 集める FF（ファストフード）のカテゴリ */
export const FF_CATEGORIES = [
  { key: "fry", label: "揚げ物", emoji: "🍗" },
  { key: "chukaman", label: "中華まん", emoji: "🥟" },
  { key: "coffee", label: "コーヒー・フラッペ", emoji: "☕" },
  { key: "machikadochubo", label: "まちかど厨房", emoji: "🍱" },
] as const;

export type FFCategoryKey = (typeof FF_CATEGORIES)[number]["key"];

/** 公式サイトから取り込んだ FF 商品 1 件 */
export type FFProduct = {
  /** 詳細ページの番号（例: "1534413_1996"） */
  id: string;
  name: string;
  /** ローソン標準価格（例: "288円(税込)"） */
  price: string;
  category: FFCategoryKey;
  url: string;
};

export function isFFCategory(key: string): key is FFCategoryKey {
  return FF_CATEGORIES.some((c) => c.key === key);
}

export function ffCategoryUrl(key: FFCategoryKey): string {
  return `${SITE_ORIGIN}/recommend/original/${key}/`;
}

export function ffCategoryLabel(key: FFCategoryKey): string {
  return FF_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/** 告知文で商品の頭に付ける絵文字。からあげクンは 🐔、それ以外はカテゴリごと */
export function ffEmoji(name: string, category: FFCategoryKey): string {
  if (name.includes("からあげクン")) return "🐔";
  return FF_CATEGORIES.find((c) => c.key === category)?.emoji ?? "";
}

/** 詳細ページの番号の先頭の数字。大きいほど新しく掲載された商品 */
export function listingOrder(id: string): number {
  return Number(id.split("_")[0]) || 0;
}

const ITEM_PATTERN =
  /<a href="\/recommend\/original\/detail\/(\d+_\d+)\.html">\s*<div class="img">[\s\S]*?<p class="ttl">([\s\S]*?)<\/p>([\s\S]*?)<\/a>/g;

/** FF カテゴリページの HTML から商品を取り出し、掲載の新しい順に並べる */
export function parseFFCategory(html: string, category: FFCategoryKey): FFProduct[] {
  const source = stripComments(html);
  const products = new Map<string, FFProduct>();

  for (const m of source.matchAll(ITEM_PATTERN)) {
    const [, id, rawName, rest] = m;
    const name = htmlToText(rawName);
    if (!name || products.has(id)) continue;
    const priceMatch = rest.match(/<p class="price">([\s\S]*?)<\/p>/);
    products.set(id, {
      id,
      name,
      price: priceMatch ? htmlToText(priceMatch[1]).replace(/\s+/g, "") : "",
      category,
      url: `${SITE_ORIGIN}/recommend/original/detail/${id}.html`,
    });
  }

  return [...products.values()].sort((a, b) => listingOrder(b.id) - listingOrder(a.id));
}
