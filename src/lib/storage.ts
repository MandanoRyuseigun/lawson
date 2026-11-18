import { isFFCategory } from "./lawsonFF";
import type { SaleItem } from "./saleItem";

const optionalString = (v: unknown) => v === undefined || typeof v === "string";

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
    optionalString(v.startDate) &&
    optionalString(v.url) &&
    optionalString(v.emoji) &&
    optionalString(v.releaseDate) &&
    (v.section === undefined || v.section === "main" || v.section === "other") &&
    (v.newRelease === undefined || typeof v.newRelease === "boolean") &&
    (v.category === undefined || (typeof v.category === "string" && isFFCategory(v.category))) &&
    (v.targets === undefined || (Array.isArray(v.targets) && v.targets.every((t) => typeof t === "string"))) &&
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

const NOTICE_SETTINGS_KEY = "lawson-sale-notice:noticeSettings:v1";

/** 告知文の入力欄（お礼・結び）の下書き */
export type NoticeSettings = { thanks: string; closing: string; closingMonth: number };

export function loadNoticeSettings(): NoticeSettings | null {
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(NOTICE_SETTINGS_KEY) ?? "null");
    if (typeof data !== "object" || data === null) return null;
    const v = data as Record<string, unknown>;
    if (typeof v.thanks !== "string" || typeof v.closing !== "string" || typeof v.closingMonth !== "number") {
      return null;
    }
    return { thanks: v.thanks, closing: v.closing, closingMonth: v.closingMonth };
  } catch {
    return null;
  }
}

export function saveNoticeSettings(settings: NoticeSettings): void {
  try {
    window.localStorage.setItem(NOTICE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 保存できなくても続ける
  }
}
