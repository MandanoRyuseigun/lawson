import { htmlToText, stripComments } from "./html";

export const SITE_ORIGIN = "https://www.lawson.co.jp";
/** 公式サイトのセール一覧ページ */
export const SALE_LIST_URL = `${SITE_ORIGIN}/recommend/sale/index.html`;

/** 公式サイトから取り込んだセール 1 件 */
export type WebSale = {
  /** 詳細ページの番号（例: "1534360_3677"）。項目の識別に使う */
  id: string;
  title: string;
  /** 開始日（YYYY-MM-DD） */
  startDate: string;
  /** 終了日（YYYY-MM-DD） */
  endDate: string;
  /** 詳細ページの URL */
  url: string;
};

const ITEM_PATTERN =
  /<a href="\/recommend\/sale\/detail\/([\w-]+)\.html">[\s\S]*?<p class="ttl">([\s\S]*?)<\/p>[\s\S]*?<span>\s*(\d{4})\.(\d{1,2})\.(\d{1,2})\s*-\s*(\d{4})\.(\d{1,2})\.(\d{1,2})\s*<\/span>/g;

const pad = (n: string) => n.padStart(2, "0");

/** セール一覧ページの HTML から、セール名と開催期間を取り出す */
export function parseSaleList(html: string): WebSale[] {
  // コメントアウトされた部分（お詫び欄のひな形など）は対象外
  const source = stripComments(html);
  const sales: WebSale[] = [];
  const seen = new Set<string>();

  for (const m of source.matchAll(ITEM_PATTERN)) {
    const [, id, rawTitle, sy, sm, sd, ey, em, ed] = m;
    if (seen.has(id)) continue;
    seen.add(id);
    const title = htmlToText(rawTitle);
    if (!title) continue;
    sales.push({
      id,
      title,
      startDate: `${sy}-${pad(sm)}-${pad(sd)}`,
      endDate: `${ey}-${pad(em)}-${pad(ed)}`,
      url: saleDetailUrl(id),
    });
  }
  return sales;
}

/** セール詳細ページの番号として正しい形か（例: "1534360_3677"） */
export function isSaleId(id: string): boolean {
  return /^\d{1,10}_\d{1,10}$/.test(id);
}

export function saleDetailUrl(id: string): string {
  return `${SITE_ORIGIN}/recommend/sale/detail/${id}.html`;
}

/**
 * セール詳細ページから対象商品を取り出す。
 * 1 行を「商品名 通常価格→セール価格」の形の文字列にする（価格がない行は名前だけ）。
 */
export function parseSaleDetail(html: string): string[] {
  const source = stripComments(html);
  const info = source.match(/<div class="saleInfo">([\s\S]*?)<\/table>/);
  if (!info) return [];

  const lines: string[] = [];
  for (const row of info[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cell = (cls: string) => {
      const m = row[1].match(new RegExp(`<td class="${cls}"[^>]*>([\\s\\S]*?)<\\/td>`));
      return m ? htmlToText(m[1]) : "";
    };
    const name = cell("name");
    if (!name) continue;
    const price = cell("price");
    const salePrice = cell("salePrice");
    let line = name;
    if (price && salePrice) line += ` ${price}→${salePrice}`;
    else if (price || salePrice) line += ` ${price || salePrice}`;
    lines.push(line);
  }
  return lines;
}

/** お店の地域。「【北海道エリア】」のような地域限定セールの振り分けに使う */
export const STORE_AREA_KEYWORDS = ["中国", "四国", "中四国", "香川"];

/**
 * お店の地域で実施されるセールか。
 * セール名に「【○○エリア】」があり、○○ がお店の地域に当たらなければ対象外とする。
 */
export function isAvailableInArea(title: string, areaKeywords: string[] = STORE_AREA_KEYWORDS): boolean {
  const match = title.match(/【([^】]*?)エリア[^】]*】/);
  if (!match) return true;
  return areaKeywords.some((keyword) => match[1].includes(keyword));
}

/** "2026-11-17" を「11/17(火)」の形にする */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const date = new Date(y, m - 1, d);
  return `${m}/${d}(${weekdays[date.getDay()]})`;
}

/** 開催期間を「11/17(火)〜11/23(月)」の形にする */
export function formatPeriod(startDate: string, endDate: string): string {
  return `${formatIsoDate(startDate)}〜${formatIsoDate(endDate)}`;
}
