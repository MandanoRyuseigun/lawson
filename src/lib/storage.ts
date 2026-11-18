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
    typeof v.important === "boolean"
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
