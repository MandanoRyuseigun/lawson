import { decodeEntities } from "./html";
import { seasonalClosing } from "./notice";

/** 気象庁「過去の気象データ検索」の高松（香川県）の日ごとの値のページ */
export function jmaDailyUrl(year: number, month: number): string {
  return `https://www.data.jma.go.jp/stats/etrn/view/daily_s1.php?prec_no=72&block_no=47891&year=${year}&month=${month}&day=&view=`;
}

/** 1 日分の観測値（値がない欄は null） */
export type DailyWeather = {
  /** YYYY-MM-DD */
  date: string;
  /** 降水量の合計（mm） */
  precipitation: number | null;
  /** 気温（℃） */
  meanTemp: number | null;
  maxTemp: number | null;
  minTemp: number | null;
  /** 降雪の合計（cm） */
  snowfall: number | null;
  /** 天気概況（昼 / 夜） */
  summaryDay: string;
  summaryNight: string;
};

/** 「16.6 )」「--」「×」などから数値を取り出す。値がなければ null */
function toNumber(text: string): number | null {
  const m = text.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function cellText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/**
 * 気象庁の日ごとの値のページ（高松）から、観測済みの日の値を取り出す。
 * 列: 日, 気圧(現地/海面), 降水量(合計/最大1時間/最大10分), 気温(平均/最高/最低), 湿度(平均/最小),
 *     風(平均/最大風速/風向/最大瞬間/風向), 日照, 雪(降雪/最深), 天気概況(昼/夜)
 */
export function parseJmaDaily(html: string, year: number, month: number): DailyWeather[] {
  const table = html.match(/<table id='tablefix1'[^>]*>([\s\S]*?)<\/table>/);
  if (!table) return [];
  const days: DailyWeather[] = [];
  for (const [, row] of table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => cellText(m[1]));
    if (cells.length < 21) continue;
    const day = Number(cells[0]);
    const meanTemp = toNumber(cells[6]);
    if (!day || meanTemp === null) continue; // まだ観測していない日
    days.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      precipitation: toNumber(cells[3]),
      meanTemp,
      maxTemp: toNumber(cells[7]),
      minTemp: toNumber(cells[8]),
      snowfall: toNumber(cells[17]),
      summaryDay: cells[19],
      summaryNight: cells[20],
    });
  }
  return days;
}

const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const nums = (values: (number | null)[]) => values.filter((v): v is number => v !== null);

/** 雨の日か（降水量 1mm 以上、または天気概況に「雨」） */
function isRainy(d: DailyWeather): boolean {
  return (d.precipitation ?? 0) >= 1 || `${d.summaryDay}${d.summaryNight}`.includes("雨");
}

function isSnowy(d: DailyWeather): boolean {
  return (d.snowfall ?? 0) > 0 || `${d.summaryDay}${d.summaryNight}`.includes("雪");
}

export type WeatherClosing = {
  text: string;
  /** どの天気から選んだか（画面に表示する） */
  reason: string;
};

/** 直近として見る日数と、比べる前の日数 */
const RECENT_DAYS = 3;
const PREVIOUS_DAYS = 4;

/**
 * ここ数日の実際の天気から、体調を気遣う結びの挨拶を選ぶ。
 * 直近 3 日と、その前の 4 日を比べる。当てはまるものがなければ季節の例文にする。
 */
export function closingFromWeather(days: DailyWeather[], month: number): WeatherClosing {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-RECENT_DAYS);
  const previous = sorted.slice(-(RECENT_DAYS + PREVIOUS_DAYS), -RECENT_DAYS);
  const fallback = { text: seasonalClosing(month), reason: "季節の例文" };
  if (recent.length === 0) return fallback;

  const maxes = nums(recent.map((d) => d.maxTemp));
  const mins = nums(recent.map((d) => d.minTemp));
  const means = nums(recent.map((d) => d.meanTemp));
  const prevMeans = nums(previous.map((d) => d.meanTemp));
  const ranges = recent
    .filter((d) => d.maxTemp !== null && d.minTemp !== null)
    .map((d) => d.maxTemp! - d.minTemp!);
  const rainyDays = recent.filter(isRainy).length;
  const change = means.length > 0 && prevMeans.length > 0 ? average(means) - average(prevMeans) : 0;

  if (recent.some(isSnowy)) {
    return { text: "雪が降るほど冷え込んでいるので、足元と体調に気をつけて頑張っていきましょう！", reason: "雪" };
  }
  if (maxes.length > 0 && Math.max(...maxes) >= 33) {
    return {
      text: "厳しい暑さが続いているので、こまめな水分補給と休憩を忘れずに頑張っていきましょう！",
      reason: "最高気温 33℃以上",
    };
  }
  if (maxes.length > 0 && Math.max(...maxes) >= 30) {
    return { text: "暑い日が続いているので、熱中症に気をつけて頑張っていきましょう！", reason: "最高気温 30℃以上" };
  }
  if (change <= -3) {
    return {
      text: "ここ数日で急に寒くなってきたので、暖かくして体調管理に気をつけて頑張っていきましょう！",
      reason: `前の数日より平均気温が ${Math.abs(change).toFixed(1)}℃ 低い`,
    };
  }
  if (change >= 3) {
    return {
      text: "急に暖かくなってきましたが、気温の変化で体調を崩しやすいので気をつけて頑張っていきましょう！",
      reason: `前の数日より平均気温が ${change.toFixed(1)}℃ 高い`,
    };
  }
  if (mins.length > 0 && Math.min(...mins) <= 3) {
    return {
      text: "朝晩の冷え込みが厳しいので、暖かくして体調管理に気をつけて頑張っていきましょう！",
      reason: "最低気温 3℃以下",
    };
  }
  if (ranges.length > 0 && average(ranges) >= 10) {
    return {
      text: "朝晩と日中の寒暖差が大きいので、体調管理に気をつけて頑張っていきましょう！",
      reason: "寒暖差 10℃以上",
    };
  }
  if (rainyDays >= 2) {
    return {
      text: "雨の日が続いているので、足元に気をつけつつ体調管理もしっかりして頑張っていきましょう！",
      reason: `ここ ${recent.length} 日で雨が ${rainyDays} 日`,
    };
  }
  if (mins.length > 0 && average(mins) <= 10) {
    return {
      text: "朝晩冷え込むようになってきたので、体調管理に気をつけて頑張っていきましょう！",
      reason: "最低気温 10℃以下",
    };
  }
  if (maxes.length > 0 && average(maxes) >= 27) {
    return {
      text: "蒸し暑い日が続いているので、水分補給をしっかりして頑張っていきましょう！",
      reason: "最高気温 27℃以上",
    };
  }
  return fallback;
}

/** 画面に出す、ここ数日の天気のまとめ（例: 「11/15〜11/17　最高 17〜19℃・最低 9〜16℃・雨 2 日」） */
export function summarizeRecentWeather(days: DailyWeather[]): string {
  const recent = [...days].sort((a, b) => a.date.localeCompare(b.date)).slice(-RECENT_DAYS);
  if (recent.length === 0) return "";
  const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
  const range = (values: number[]) => {
    if (values.length === 0) return "-";
    const lo = Math.round(Math.min(...values));
    const hi = Math.round(Math.max(...values));
    return lo === hi ? `${lo}℃` : `${lo}〜${hi}℃`;
  };
  const rainy = recent.filter(isRainy).length;
  return `${md(recent[0].date)}〜${md(recent[recent.length - 1].date)}　最高 ${range(nums(recent.map((d) => d.maxTemp)))}・最低 ${range(nums(recent.map((d) => d.minTemp)))}・雨 ${rainy} 日`;
}
