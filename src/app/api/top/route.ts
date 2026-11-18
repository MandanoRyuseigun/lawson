import { NextResponse } from "next/server";
import { fetchLawsonPage } from "@/lib/fetchLawson";
import { parseTopBanners, TOP_URL } from "@/lib/lawsonTop";

// 「更新」ボタンを押したときだけ取得する。結果はキャッシュしない
export const dynamic = "force-dynamic";

/** トップページのメインのスライドの告知を取得する */
export async function GET() {
  let html: string;
  try {
    html = await fetchLawsonPage(TOP_URL);
  } catch {
    return NextResponse.json(
      { error: "公式サイトのトップページを取得できませんでした。時間をおいてもう一度お試しください。" },
      { status: 502 },
    );
  }

  const banners = parseTopBanners(html);
  if (banners.length === 0) {
    return NextResponse.json(
      { error: "トップページの告知を読み取れませんでした。ページの作りが変わった可能性があります。" },
      { status: 502 },
    );
  }
  return NextResponse.json({ banners });
}
