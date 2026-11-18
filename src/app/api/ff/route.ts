import { NextResponse } from "next/server";
import { fetchLawsonPage, mapWithLimit } from "@/lib/fetchLawson";
import { FF_CATEGORIES, ffCategoryUrl, parseFFCategory, type FFProduct } from "@/lib/lawsonFF";
import { NEW_INDEX_URL, parseNewIndexRedirect, parseNewListItems, parseNewListNav } from "@/lib/lawsonNew";
import { SITE_ORIGIN } from "@/lib/lawsonSale";

// 「更新」ボタンを押したときだけ取得する。結果はキャッシュしない
export const dynamic = "force-dynamic";

/** 新商品の発売日別ページを読む上限（約 3 週間分は 10 ページ以内に収まる） */
const MAX_NEW_PAGES = 10;

/**
 * 新商品一覧の発売日別ページをすべて読み、商品ごとの発売日を集める。
 * FF のカテゴリページには発売日がないため、ここで確認する。失敗したら null。
 */
async function fetchReleaseDates(): Promise<Record<string, string> | null> {
  try {
    const firstPath = parseNewIndexRedirect(await fetchLawsonPage(NEW_INDEX_URL));
    if (!firstPath) return null;
    const firstHtml = await fetchLawsonPage(`${SITE_ORIGIN}${firstPath}`);
    const otherPaths = parseNewListNav(firstHtml)
      .filter((path) => path !== firstPath)
      .slice(0, MAX_NEW_PAGES - 1);

    const pages = await mapWithLimit(otherPaths, 2, async (path) => {
      try {
        return await fetchLawsonPage(`${SITE_ORIGIN}${path}`);
      } catch {
        return "";
      }
    });
    return Object.assign({}, ...[firstHtml, ...pages].map(parseNewListItems));
  } catch {
    return null;
  }
}

/** FF の各カテゴリページと発売日を取得する。一部が失敗しても、取れた分は返す */
export async function GET() {
  const [results, releaseDates] = await Promise.all([
    mapWithLimit([...FF_CATEGORIES], 2, async (category) => {
      try {
        const products = parseFFCategory(await fetchLawsonPage(ffCategoryUrl(category.key)), category.key);
        return { category, products, ok: products.length > 0 };
      } catch {
        return { category, products: [] as FFProduct[], ok: false };
      }
    }),
    fetchReleaseDates(),
  ]);

  const products: FFProduct[] = results.flatMap((r) =>
    r.products.map((p) => (releaseDates?.[p.id] ? { ...p, releaseDate: releaseDates[p.id] } : p)),
  );
  const failed = results.filter((r) => !r.ok).map((r) => r.category.key);

  if (products.length === 0) {
    return NextResponse.json(
      { error: "公式サイトの FF 情報を取得できませんでした。時間をおいてもう一度お試しください。" },
      { status: 502 },
    );
  }
  return NextResponse.json({ products, failed, releaseDatesUnavailable: releaseDates === null });
}
