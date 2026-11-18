import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatPeriod, isAvailableInArea, isSaleId, parseSaleDetail, parseSaleList } from "./lawsonSale";

const fixture = readFileSync(join(__dirname, "__fixtures__", "saleList.html"), "utf-8");
const detailFixture = readFileSync(join(__dirname, "__fixtures__", "saleDetail.html"), "utf-8");

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

describe("parseSaleDetail", () => {
  const lines = parseSaleDetail(detailFixture);

  it("対象商品を価格付きで取り出す", () => {
    expect(lines).toContain("エースコック　タテロング　飲み干す一杯　ごま贅沢担担麺 332円");
    expect(lines).toContain("モカブレンド(S) 180円→160円");
  });

  it("価格のない説明行も順番どおりに残す", () => {
    expect(lines[0]).toBe(
      "●下記対象商品を購入すると、無料クーポンがレシートについてきます。 レシート無料券　発券期間　11/17(火)〜11/23(月)",
    );
    expect(lines).toHaveLength(4);
  });

  it("対象商品の表がなければ空にする", () => {
    expect(parseSaleDetail("<main>ページが見つかりません</main>")).toEqual([]);
  });
});

describe("isSaleId", () => {
  it("詳細ページの番号の形だけを受け付ける", () => {
    expect(isSaleId("1534360_3677")).toBe(true);
    expect(isSaleId("../index")).toBe(false);
    expect(isSaleId("1534360")).toBe(false);
  });
});
