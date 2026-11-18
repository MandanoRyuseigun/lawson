import { NextResponse } from "next/server";
import { fetchLawsonPage, mapWithLimit } from "@/lib/fetchLawson";
import { FF_CATEGORIES, ffCategoryUrl, parseFFCategory, type FFProduct } from "@/lib/lawsonFF";

// 「更新」ボタンを押したときだけ取得する。結果はキャッシュしない
export const dynamic = "force-dynamic";

/** FF の各カテゴリページを取得する。一部のカテゴリが失敗しても、取れた分は返す */
export async function GET() {
  const results = await mapWithLimit([...FF_CATEGORIES], 2, async (category) => {
    try {
      const products = parseFFCategory(await fetchLawsonPage(ffCategoryUrl(category.key)), category.key);
      return { category, products, ok: products.length > 0 };
    } catch {
      return { category, products: [] as FFProduct[], ok: false };
    }
  });

  const products = results.flatMap((r) => r.products);
  const failed = results.filter((r) => !r.ok).map((r) => r.category.key);

  if (products.length === 0) {
    return NextResponse.json(
      { error: "公式サイトの FF 情報を取得できませんでした。時間をおいてもう一度お試しください。" },
      { status: 502 },
    );
  }
  return NextResponse.json({ products, failed });
}
