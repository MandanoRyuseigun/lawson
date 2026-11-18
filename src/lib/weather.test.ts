import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { closingFromWeather, parseJmaDaily, summarizeRecentWeather, type DailyWeather } from "./weather";

const fixture = readFileSync(join(__dirname, "__fixtures__", "jmaDaily.html"), "utf-8");

describe("parseJmaDaily", () => {
  const days = parseJmaDaily(fixture, 2026, 11);

  it("観測済みの日だけを取り出す（まだの日は含めない）", () => {
    expect(days.map((d) => d.date)).toEqual([
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
    ]);
  });

  it("気温・降水量・天気概況を取り出す", () => {
    expect(days[6]).toEqual({
      date: "2026-11-17",
      precipitation: 7.5,
      meanTemp: 13.2,
      maxTemp: 17.4,
      minTemp: 9.3,
      snowfall: null,
      summaryDay: "曇時々晴後雨",
      summaryNight: "曇時々雨",
    });
  });

  it("「--」は値なし、品質の印「)」は除いて数値にする", () => {
    expect(days[0].precipitation).toBeNull();
    expect(days[3].maxTemp).toBe(20.4);
  });

  it("想定と違うページなら空にする", () => {
    expect(parseJmaDaily("<html>メンテナンス中</html>", 2026, 11)).toEqual([]);
  });
});

function day(date: string, o: Partial<DailyWeather>): DailyWeather {
  return {
    date,
    precipitation: null,
    meanTemp: 15,
    maxTemp: 19,
    minTemp: 12,
    snowfall: null,
    summaryDay: "晴",
    summaryNight: "晴",
    ...o,
  };
}

/** 前の 4 日と直近 3 日 */
function week(prev: Partial<DailyWeather>, recent: Partial<DailyWeather>[]): DailyWeather[] {
  return [
    ...[11, 12, 13, 14].map((d) => day(`2026-11-${d}`, prev)),
    ...recent.map((o, i) => day(`2026-11-${15 + i}`, o)),
  ];
}

describe("closingFromWeather", () => {
  it("実際の 11/11〜11/17 の高松（雨 2 日）なら雨の文にする", () => {
    const result = closingFromWeather(parseJmaDaily(fixture, 2026, 11), 11);
    expect(result.text).toContain("雨の日が続いている");
    expect(result.reason).toBe("ここ 3 日で雨が 2 日");
  });

  it("前の数日より平均気温が 3℃以上下がったら、急に寒くなった文にする", () => {
    const result = closingFromWeather(week({ meanTemp: 17 }, [{ meanTemp: 13 }, { meanTemp: 12 }, { meanTemp: 13 }]), 11);
    expect(result.text).toContain("急に寒くなってきた");
  });

  it("急に暖かくなったら、気温の変化を気遣う文にする", () => {
    const result = closingFromWeather(week({ meanTemp: 10 }, [{ meanTemp: 14 }, { meanTemp: 15 }, { meanTemp: 14 }]), 3);
    expect(result.text).toContain("急に暖かくなってきました");
  });

  it("雪が降ったら雪の文を一番に選ぶ", () => {
    const result = closingFromWeather(week({}, [{}, { summaryDay: "雪時々曇", meanTemp: 2 }, {}]), 1);
    expect(result.text).toContain("雪");
  });

  it("最高気温 30℃以上なら熱中症の文、33℃以上なら厳しい暑さの文にする", () => {
    expect(closingFromWeather(week({ meanTemp: 27 }, [{ maxTemp: 31, meanTemp: 27 }]), 7).text).toContain("熱中症");
    expect(closingFromWeather(week({ meanTemp: 28 }, [{ maxTemp: 34, meanTemp: 28 }]), 8).text).toContain("厳しい暑さ");
  });

  it("最低気温 3℃以下なら冷え込みが厳しい文にする", () => {
    const result = closingFromWeather(week({ meanTemp: 7 }, [{ meanTemp: 7, minTemp: 2, maxTemp: 11 }]), 12);
    expect(result.text).toContain("冷え込みが厳しい");
  });

  it("寒暖差が 10℃以上なら寒暖差の文にする", () => {
    const result = closingFromWeather(week({}, [{ maxTemp: 22, minTemp: 10 }, { maxTemp: 23, minTemp: 11 }]), 10);
    expect(result.text).toContain("寒暖差");
  });

  it("当てはまるものがなければ季節の例文にする", () => {
    const result = closingFromWeather(week({}, [{}, {}, {}]), 11);
    expect(result).toEqual({
      text: "朝晩の冷え込みも激しいので、体調管理に気をつけて頑張っていきましょう！",
      reason: "季節の例文",
    });
  });

  it("天気がなければ季節の例文にする", () => {
    expect(closingFromWeather([], 7).text).toContain("水分補給");
  });
});

describe("summarizeRecentWeather", () => {
  it("直近 3 日の最高・最低気温の幅と雨の日数をまとめる", () => {
    expect(summarizeRecentWeather(parseJmaDaily(fixture, 2026, 11))).toBe(
      "11/15〜11/17　最高 17〜19℃・最低 9〜16℃・雨 2 日",
    );
  });
});
