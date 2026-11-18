import { decodeEntities, stripComments } from "./html";
import { isAvailableInArea, SITE_ORIGIN } from "./lawsonSale";

/** 公式サイトのトップページ */
export const TOP_URL = `${SITE_ORIGIN}/`;

/** トップページのメインのスライドに載っている告知 1 件 */
export type TopBanner = {
  /** リンク先から作る識別子（同じ告知なら更新しても変わらない） */
  id: string;
  title: string;
  url: string;
};

/**
 * 店頭の告知に関係しないリンク先。会社のニュース・取り組み（/company/）と
 * サービス案内（/service/ 。スポーツくじなど）は除く。
 */
const EXCLUDED_PATHS = [/^\/company\//, /^\/service\//];

/** バナーの説明文から、画面の読み上げ用の言葉（「別ウィンドウで開きます」など）を除く */
function cleanLabel(label: string): string {
  return decodeEntities(label)
    .replace(/[（(](別|新しい)ウィンドウで開きます[）)]/g, "")
    .replace(/[^。！\s]*(サイト|ページ)へ$/, "")
    .replace(/[ \t\r\n]+/g, " ")
    .replace(/。$/, "")
    .trim();
}

/** リンク先の URL から識別子を作る（例: "/lab/campaign/christmas/" → "lab/campaign/christmas"） */
function bannerId(href: string): string {
  return href
    .replace(/^https?:\/\//, "")
    .replace(/[?#].*$/, "")
    .replace(/\/(index\.html)?$/, "")
    .replace(/^\//, "")
    .replace(/[^\w./-]/g, "_");
}

/**
 * トップページのメインのスライドから告知を取り出す（スライドの順＝ローソンが推している順）。
 * 会社のニュース・サービス案内と、お店の地域で実施されない地域限定の告知は除く。
 */
export function parseTopBanners(html: string): TopBanner[] {
  const source = stripComments(html);
  const slider = source.match(/<div class="slick-normal[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
  if (!slider) return [];

  const banners: TopBanner[] = [];
  const seen = new Set<string>();
  for (const [, rawLabel, href] of slider[1].matchAll(/<div data-label="([^"]*)">\s*<a href="([^"]+)"/g)) {
    if (EXCLUDED_PATHS.some((p) => p.test(href))) continue;
    const title = cleanLabel(rawLabel);
    if (!title || !isAvailableInArea(title)) continue;
    const id = bannerId(href);
    if (seen.has(id)) continue;
    seen.add(id);
    banners.push({ id, title, url: href.startsWith("/") ? `${SITE_ORIGIN}${href}` : href });
  }
  return banners;
}
