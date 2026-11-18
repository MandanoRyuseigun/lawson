import { NextResponse, type NextRequest } from "next/server";
import { fetchLawsonPage, mapWithLimit } from "@/lib/fetchLawson";
import { isSaleId, parseSaleDetail, saleDetailUrl } from "@/lib/lawsonSale";

export const dynamic = "force-dynamic";

/** 1 回で取得する詳細ページの上限 */
const MAX_IDS = 30;

/**
 * セール詳細ページから対象商品を取得する。
 * 例: /api/sale-details?ids=1534360_3677,1534358_3677
 * 取得できなかったものは結果に含めない。
 */
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(isSaleId);
  const unique = [...new Set(ids)].slice(0, MAX_IDS);

  if (unique.length === 0) {
    return NextResponse.json({ error: "取得するセールが指定されていません。" }, { status: 400 });
  }

  const results = await mapWithLimit(unique, 3, async (id) => {
    try {
      return [id, parseSaleDetail(await fetchLawsonPage(saleDetailUrl(id)))] as const;
    } catch {
      return [id, null] as const;
    }
  });

  const details: Record<string, string[]> = {};
  for (const [id, targets] of results) {
    if (targets && targets.length > 0) details[id] = targets;
  }
  return NextResponse.json({ details });
}
