import { stripComments } from "./html";
import { SITE_ORIGIN } from "./lawsonSale";

/** 新商品の入口。最新の発売日のページへ転送される */
export const NEW_INDEX_URL = `${SITE_ORIGIN}/recommend/new/`;

/** 入口ページの転送先（例: "/recommend/new/list/1534243_5162.html"）を取り出す */
export function parseNewIndexRedirect(html: string): string | null {
  const m = html.match(/http-equiv="Refresh"[^>]*URL=([^"'\s>]+)/i);
  return m && /^\/recommend\/new\/list\/[\w-]+\.html$/.test(m[1]) ? m[1] : null;
}

/** 発売日別ページの、ほかの発売日へのリンク（例: "/recommend/new/list/1534244_5162.html"）を取り出す */
export function parseNewListNav(html: string): string[] {
  const nav = stripComments(html).match(/<ul class="contentsNav">([\s\S]*?)<\/ul>/);
  if (!nav) return [];
  return [...new Set([...nav[1].matchAll(/href="(\/recommend\/new\/list\/[\w-]+\.html)"/g)].map((m) => m[1]))];
}

/** 発売日別ページから、商品ごとの発売日（YYYY-MM-DD）を取り出す。キーは詳細ページの番号 */
export function parseNewListItems(html: string): Record<string, string> {
  const source = stripComments(html);
  const result: Record<string, string> = {};
  const pattern =
    /<a href="\/recommend\/original\/detail\/(\d+_\d+)\.html">[\s\S]*?<p class="date">[^<]*<span>\s*(\d{4})\.(\d{1,2})\.(\d{1,2})\s*<\/span>/g;
  for (const [, id, y, m, d] of source.matchAll(pattern)) {
    result[id] ??= `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return result;
}

const DAY = 24 * 60 * 60 * 1000;

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * 告知の開始日から見て、新商品の何週目か。新商品として扱うのは 2 週目まで。
 * - 1 週目: 開始日の前後 6 日以内に発売（前日の月曜発売や、週の途中の発売を含む）
 * - 2 週目: 開始日の 7〜13 日前に発売
 * - それ以外（14 日以上前、または翌週以降の発売）は null
 */
export function newProductWeek(releaseDate: string, startDate: string): 1 | 2 | null {
  const days = Math.round((toUtc(startDate) - toUtc(releaseDate)) / DAY);
  if (days >= -6 && days <= 6) return 1;
  if (days >= 7 && days <= 13) return 2;
  return null;
}
