/** 公式サイトのセール一覧ページ */
export const SALE_LIST_URL = "https://www.lawson.co.jp/recommend/sale/index.html";
const SITE_ORIGIN = "https://www.lawson.co.jp";

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

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

const ITEM_PATTERN =
  /<a href="\/recommend\/sale\/detail\/([\w-]+)\.html">[\s\S]*?<p class="ttl">([\s\S]*?)<\/p>[\s\S]*?<span>\s*(\d{4})\.(\d{1,2})\.(\d{1,2})\s*-\s*(\d{4})\.(\d{1,2})\.(\d{1,2})\s*<\/span>/g;

const pad = (n: string) => n.padStart(2, "0");

/** セール一覧ページの HTML から、セール名と開催期間を取り出す */
export function parseSaleList(html: string): WebSale[] {
  // コメントアウトされた部分（お詫び欄のひな形など）は対象外
  const source = html.replace(/<!--[\s\S]*?-->/g, "");
  const sales: WebSale[] = [];
  const seen = new Set<string>();

  for (const m of source.matchAll(ITEM_PATTERN)) {
    const [, id, rawTitle, sy, sm, sd, ey, em, ed] = m;
    if (seen.has(id)) continue;
    seen.add(id);
    // 改行などの半角の空白だけ詰める（全角スペースはサイトの表記どおり残す）
    const title = decodeEntities(rawTitle.replace(/<[^>]+>/g, ""))
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
    if (!title) continue;
    sales.push({
      id,
      title,
      startDate: `${sy}-${pad(sm)}-${pad(sd)}`,
      endDate: `${ey}-${pad(em)}-${pad(ed)}`,
      url: `${SITE_ORIGIN}/recommend/sale/detail/${id}.html`,
    });
  }
  return sales;
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
