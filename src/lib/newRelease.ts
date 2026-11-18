import { listingOrder } from "./lawsonFF";
import { newProductWeek } from "./lawsonNew";
import type { SaleItem } from "./saleItem";

/**
 * 告知の開始日から見て、新商品の何週目か（新商品でなければ null）。
 * 発売日が分かる項目は発売日で決め、分からない項目は手動の「新発売」の印で 1 週目とする。
 */
export function releaseWeek(item: SaleItem, startDate: string): 1 | 2 | null {
  if (item.releaseDate) return newProductWeek(item.releaseDate, startDate);
  return item.newRelease ? 1 : null;
}

/** 告知文で名前の後ろに付ける言葉 */
export function releaseLabel(week: 1 | 2 | null): string {
  if (week === 1) return "新発売";
  if (week === 2) return "新発売（2週目）";
  return "";
}

export type FFGroups = {
  week1: SaleItem[];
  week2: SaleItem[];
  /** 新商品一覧で発売日を確認できないが、掲載が新しい商品（これから発売の可能性がある） */
  unconfirmed: SaleItem[];
  /** 定番（新商品の期間を過ぎた商品を含む） */
  regular: SaleItem[];
};

/**
 * 公式サイトから取り込んだ FF を、新商品の週ごとに分ける。各グループは掲載の新しい順。
 * 発売日が分からない商品のうち、発売日が分かる商品のどれよりも掲載が新しいものは「確認できない新しい掲載」にする。
 */
export function groupFF(items: SaleItem[], startDate: string): FFGroups {
  const order = (i: SaleItem) => listingOrder(i.id.replace(/^ff-/, ""));
  const sorted = [...items].sort((a, b) => order(b) - order(a));
  const dated = sorted.filter((i) => i.releaseDate);
  const newestDated = dated.length > 0 ? Math.max(...dated.map(order)) : Infinity;

  const groups: FFGroups = { week1: [], week2: [], unconfirmed: [], regular: [] };
  for (const item of sorted) {
    if (item.releaseDate) {
      const week = newProductWeek(item.releaseDate, startDate);
      if (week === 1) groups.week1.push(item);
      else if (week === 2) groups.week2.push(item);
      else groups.regular.push(item);
    } else if (order(item) > newestDated) {
      groups.unconfirmed.push(item);
    } else {
      groups.regular.push(item);
    }
  }
  return groups;
}
