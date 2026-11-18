import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatPeriod, isAvailableInArea, parseSaleList } from "./lawsonSale";

const fixture = readFileSync(join(__dirname, "__fixtures__", "saleList.html"), "utf-8");

describe("parseSaleList", () => {
  const sales = parseSaleList(fixture);

  it("セール名・開催期間・詳細 URL を取り出す", () => {
    expect(sales[1]).toEqual({
      id: "1534360_3677",
      title: "モカブレンド　お買い得セール",
      startDate: "2026-11-17",
      endDate: "2026-11-23",
      url: "https://www.lawson.co.jp/recommend/sale/detail/1534360_3677.html",
    });
  });

  it("コメントアウトされたお詫び欄のひな形は取り込まない", () => {
    expect(sales.map((s) => s.title)).not.toContain("dummy");
    expect(sales).toHaveLength(4);
  });

  it("HTML の文字参照を元に戻す", () => {
    expect(sales[3].title).toBe("ソフトドリンク&お茶 お買い得セール");
  });

  it("想定と違う HTML なら空の一覧を返す", () => {
    expect(parseSaleList("<html><body>メンテナンス中</body></html>")).toEqual([]);
  });
});

describe("isAvailableInArea", () => {
  it("地域の指定がなければ対象", () => {
    expect(isAvailableInArea("モカブレンド お買い得セール")).toBe(true);
  });

  it("ほかの地域限定は対象外", () => {
    expect(isAvailableInArea("【北海道エリア】飲料1本もらえるキャンペーン")).toBe(false);
    expect(isAvailableInArea("【九州エリア】お菓子セール")).toBe(false);
  });

  it("中国・四国を含む地域限定は対象", () => {
    expect(isAvailableInArea("【中国・四国エリア】飲料1本もらえるキャンペーン")).toBe(true);
    expect(isAvailableInArea("【四国エリア】お菓子セール")).toBe(true);
    expect(isAvailableInArea("【中四国エリア限定】お菓子セール")).toBe(true);
  });
});

describe("formatPeriod", () => {
  it("曜日付きの期間にする", () => {
    expect(formatPeriod("2026-11-17", "2026-11-23")).toBe("11/17(火)〜11/23(月)");
  });
});
