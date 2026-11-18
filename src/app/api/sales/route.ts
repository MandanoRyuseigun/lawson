import { NextResponse } from "next/server";
import { fetchLawsonPage } from "@/lib/fetchLawson";
import { parseSaleList, SALE_LIST_URL } from "@/lib/lawsonSale";

// 「更新」ボタンを押したときだけ取得する。結果はキャッシュしない
export const dynamic = "force-dynamic";

export async function GET() {
  let html: string;
  try {
    html = await fetchLawsonPage(SALE_LIST_URL);
  } catch {
    return NextResponse.json(
      { error: "公式サイトのセール情報を取得できませんでした。時間をおいてもう一度お試しください。" },
      { status: 502 },
    );
  }

  const sales = parseSaleList(html);
  if (sales.length === 0) {
    return NextResponse.json(
      { error: "セール情報を読み取れませんでした。公式サイトのページの作りが変わった可能性があります。" },
      { status: 502 },
    );
  }

  return NextResponse.json({ sales, fetchedAt: new Date().toISOString() });
}
