import { formatPeriod, isAvailableInArea, type WebSale } from "./lawsonSale";
import type { SaleItem } from "./saleItem";

export type MergeResult = {
  items: SaleItem[];
  added: number;
  changed: number;
  removed: number;
};

/**
 * 公式サイトから取り込んだセールを、今の項目一覧に反映する。
 * - 増えた項目には「新着」、内容が変わった項目には「変更」の印を付ける（初回は付けない）
 * - 選択・重要の状態は保つ
 * - サイトから消えた項目は外す。手入力・写真の項目には触れない
 */
export function mergeWebSales(current: SaleItem[], sales: WebSale[]): MergeResult {
  const previous = new Map(current.filter((i) => i.source === "web").map((i) => [i.id, i]));
  const isFirstFetch = previous.size === 0;
  let added = 0;
  let changed = 0;

  const webItems: SaleItem[] = sales.filter((s) => isAvailableInArea(s.title)).map((s) => {
    const id = `web-${s.id}`;
    const name = s.title;
    const period = formatPeriod(s.startDate, s.endDate);
    const before = previous.get(id);

    if (!before) {
      added++;
      return {
        id,
        name,
        price: "",
        period,
        note: "",
        source: "web",
        selected: false,
        important: false,
        startDate: s.startDate,
        url: s.url,
        webStatus: isFirstFetch ? undefined : "new",
      };
    }

    const isChanged = before.name !== name || before.period !== period;
    if (isChanged) changed++;
    return {
      ...before,
      name,
      period,
      startDate: s.startDate,
      url: s.url,
      webStatus: isChanged ? "changed" : undefined,
    };
  });

  const keptIds = new Set(webItems.map((i) => i.id));
  const removed = [...previous.keys()].filter((id) => !keptIds.has(id)).length;
  const others = current.filter((i) => i.source !== "web");

  return { items: [...webItems, ...others], added, changed, removed };
}
