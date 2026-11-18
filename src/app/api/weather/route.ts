import { NextResponse } from "next/server";
import { fetchLawsonPage } from "@/lib/fetchLawson";
import { jmaDailyUrl, parseJmaDaily, type DailyWeather } from "@/lib/weather";

// 「更新」ボタンを押したときだけ取得する。結果はキャッシュしない
export const dynamic = "force-dynamic";

/** 返す日数（直近 3 日とその前の 4 日） */
const DAYS = 7;

/** 日本時間の今日の年・月 */
function todayInJapan(): { year: number; month: number } {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return { year: jst.getUTCFullYear(), month: jst.getUTCMonth() + 1 };
}

/**
 * 気象庁の「過去の気象データ」から、高松のここ数日（観測済みの日）の天気を取得する。
 * 月初めで日数が足りなければ前の月のページも読む。
 */
export async function GET() {
  const { year, month } = todayInJapan();
  try {
    let days: DailyWeather[] = parseJmaDaily(await fetchLawsonPage(jmaDailyUrl(year, month)), year, month);
    if (days.length < DAYS) {
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;
      const previous = parseJmaDaily(await fetchLawsonPage(jmaDailyUrl(prevYear, prevMonth)), prevYear, prevMonth);
      days = [...previous, ...days];
    }
    if (days.length === 0) throw new Error("no data");
    return NextResponse.json({ days: days.slice(-DAYS) });
  } catch {
    return NextResponse.json(
      { error: "気象庁の天気データを取得できませんでした。結びの挨拶は季節の例文を使います。" },
      { status: 502 },
    );
  }
}
