import { NextResponse } from "next/server";
import { parseSaleList, SALE_LIST_URL } from "@/lib/lawsonSale";

// 「更新」ボタンを押したときだけ取得する。結果はキャッシュしない
export const dynamic = "force-dynamic";

export async function GET() {
  let html: string;
  try {
    const res = await fetch(SALE_LIST_URL, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; sale-notice-tool/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `公式サイトから取得できませんでした（応答コード ${res.status}）。` },
        { status: 502 },
      );
    }
    html = await res.text();
  } catch {
    return NextResponse.json(
      { error: "公式サイトに接続できませんでした。時間をおいてもう一度お試しください。" },
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
