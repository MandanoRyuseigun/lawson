import { ffEmoji, type FFCategoryKey, type FFProduct } from "./lawsonFF";
import { formatPeriod, isAvailableInArea, type WebSale } from "./lawsonSale";
import type { NoticeSection, SaleItem } from "./saleItem";

/** 公式サイトから取り込む 1 件（セール・FF 共通の形） */
export type WebEntry = {
  id: string;
  name: string;
  period: string;
  url: string;
  section: NoticeSection;
  emoji?: string;
  category?: FFCategoryKey;
  startDate?: string;
  targets?: string[];
};

/** セール項目の id の頭。以前から保存されている項目に合わせて "web-" のまま */
export const SALE_PREFIX = "web-";
export const FF_PREFIX = "ff-";

/** セールを取り込む形にする。お店の地域で実施されないものは除く */
export function saleEntries(sales: WebSale[]): WebEntry[] {
  return sales
    .filter((s) => isAvailableInArea(s.title))
    .map((s) => ({
      id: `${SALE_PREFIX}${s.id}`,
      name: s.title,
      period: formatPeriod(s.startDate, s.endDate),
      url: s.url,
      section: "other",
      startDate: s.startDate,
    }));
}

/** FF 商品を取り込む形にする。標準価格は確認用の情報として持つ */
export function ffEntries(products: FFProduct[]): WebEntry[] {
  return products.map((p) => ({
    id: `${FF_PREFIX}${p.id}`,
    name: p.name,
    period: "",
    url: p.url,
    section: "main",
    emoji: ffEmoji(p.name, p.category),
    category: p.category,
    targets: p.price ? [`標準価格 ${p.price}`] : undefined,
  }));
}

export type MergeResult = {
  items: SaleItem[];
  added: number;
  changed: number;
  removed: number;
  /** この種類（セール / FF）を初めて取り込んだか */
  isFirstFetch: boolean;
};

/**
 * 公式サイトから取り込んだ項目を、今の一覧に反映する。対象は id が prefix で始まる項目だけ。
 * - 増えた項目には「新着」、名前や期間が変わった項目には「変更」の印を付ける（初回は付けない）
 * - 選択・重要・新発売・絵文字・補足など、画面で変えた内容は保つ
 * - サイトから消えた項目は外す。ほかの種類の項目や手入力・写真の項目には触れない
 */
export function mergeWebEntries(current: SaleItem[], entries: WebEntry[], prefix: string): MergeResult {
  const inScope = (i: SaleItem) => i.source === "web" && i.id.startsWith(prefix);
  const previous = new Map(current.filter(inScope).map((i) => [i.id, i]));
  const isFirstFetch = previous.size === 0;
  let added = 0;
  let changed = 0;

  const merged: SaleItem[] = entries.map((e) => {
    const before = previous.get(e.id);

    if (!before) {
      added++;
      return {
        id: e.id,
        name: e.name,
        price: "",
        period: e.period,
        note: "",
        source: "web",
        selected: false,
        important: false,
        section: e.section,
        emoji: e.emoji,
        category: e.category,
        targets: e.targets,
        startDate: e.startDate,
        url: e.url,
        webStatus: isFirstFetch ? undefined : "new",
      };
    }

    const isChanged = before.name !== e.name || before.period !== e.period;
    if (isChanged) changed++;
    return {
      ...before,
      name: e.name,
      period: e.period,
      url: e.url,
      category: e.category,
      startDate: e.startDate,
      section: before.section ?? e.section,
      emoji: before.emoji ?? e.emoji,
      // セールの対象商品は詳細ページから別に取るので、取り込み済みのものを残す
      targets: e.targets ?? before.targets,
      webStatus: isChanged ? "changed" : undefined,
    };
  });

  const keptIds = new Set(merged.map((i) => i.id));
  const removed = [...previous.keys()].filter((id) => !keptIds.has(id)).length;

  // 取り込んだ項目をサイトの順で先頭に、それ以外の項目は元の順のまま後ろに置く
  const others = current.filter((i) => !inScope(i));
  return { items: [...merged, ...others], added, changed, removed, isFirstFetch };
}
