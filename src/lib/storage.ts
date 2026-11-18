import type { SaleItem } from "./saleItem";

const STORAGE_KEY = "lawson-sale-notice:items:v1";

function isSaleItem(value: unknown): value is SaleItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.price === "string" &&
    typeof v.period === "string" &&
    typeof v.note === "string" &&
    (v.source === "web" || v.source === "photo" || v.source === "manual") &&
    typeof v.selected === "boolean" &&
    typeof v.important === "boolean" &&
    (v.startDate === undefined || typeof v.startDate === "string") &&
    (v.url === undefined || typeof v.url === "string") &&
    (v.webStatus === undefined || v.webStatus === "new" || v.webStatus === "changed")
  );
}

/** 保存された文字列から項目一覧を復元する。壊れたデータは読み飛ばす。 */
export function parseStoredItems(raw: string | null): SaleItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isSaleItem) : [];
  } catch {
    return [];
  }
}

export function loadItems(): SaleItem[] {
  try {
    return parseStoredItems(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // プライベートブラウズなどで保存領域が使えない場合
    return [];
  }
}

export function saveItems(items: SaleItem[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 保存できなくても画面の操作は続けられるようにする
  }
}

const FETCHED_AT_KEY = "lawson-sale-notice:fetchedAt:v1";

/** 公式サイトから最後に取り込んだ日時（ISO 形式） */
export function loadFetchedAt(): string | null {
  try {
    return window.localStorage.getItem(FETCHED_AT_KEY);
  } catch {
    return null;
  }
}

export function saveFetchedAt(iso: string): void {
  try {
    window.localStorage.setItem(FETCHED_AT_KEY, iso);
  } catch {
    // 保存できなくても続ける
  }
}
