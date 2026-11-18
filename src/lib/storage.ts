import { isFFCategory } from "./lawsonFF";
import type { SaleItem } from "./saleItem";
import type { DailyWeather } from "./weather";
import { parseWeeklyNotes, type WeeklyNotes } from "./weeklyNotes";

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
    optionalString(v.siteName) &&
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

const WEEKLY_NOTES_KEY = "lawson-sale-notice:weeklyNotes:v1";

/** 週ごとの取り組み・お礼のメモ */
export function loadWeeklyNotes(): WeeklyNotes {
  try {
    return parseWeeklyNotes(window.localStorage.getItem(WEEKLY_NOTES_KEY));
  } catch {
    return {};
  }
}

export function saveWeeklyNotes(notes: WeeklyNotes): void {
  try {
    window.localStorage.setItem(WEEKLY_NOTES_KEY, JSON.stringify(notes));
  } catch {
    // 保存できなくても続ける
  }
}

const WEATHER_KEY = "lawson-sale-notice:weather:v1";

/** 最後に取得したここ数日の天気（気象庁・高松） */
export type StoredWeather = { fetchedAt: string; days: DailyWeather[] };

export function loadWeather(): StoredWeather | null {
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(WEATHER_KEY) ?? "null");
    if (typeof data !== "object" || data === null) return null;
    const v = data as Record<string, unknown>;
    if (typeof v.fetchedAt !== "string" || !Array.isArray(v.days)) return null;
    const days = v.days.filter(
      (d): d is DailyWeather =>
        typeof d === "object" && d !== null && typeof (d as DailyWeather).date === "string",
    );
    return { fetchedAt: v.fetchedAt, days };
  } catch {
    return null;
  }
}

export function saveWeather(weather: StoredWeather): void {
  try {
    window.localStorage.setItem(WEATHER_KEY, JSON.stringify(weather));
  } catch {
    // 保存できなくても続ける
  }
}
