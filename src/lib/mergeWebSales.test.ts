import { describe, expect, it } from "vitest";
import type { WebSale } from "./lawsonSale";
import { mergeWebSales } from "./mergeWebSales";
import type { SaleItem } from "./saleItem";

const sale = (id: string, title: string, start = "2026-11-24", end = "2026-11-30"): WebSale => ({
  id,
  title,
  startDate: start,
  endDate: end,
  url: `https://www.lawson.co.jp/recommend/sale/detail/${id}.html`,
});

const manual: SaleItem = {
  id: "m1",
  name: "店舗独自の値引き",
  price: "",
  period: "",
  note: "",
  source: "manual",
  selected: true,
  important: false,
};

describe("mergeWebSales", () => {
  it("初めての取り込みでは「新着」の印を付けず、未選択で追加する", () => {
    const result = mergeWebSales([manual], [sale("1", "お菓子セール")]);
    const web = result.items.find((i) => i.source === "web")!;
    expect(web).toMatchObject({
      id: "web-1",
      name: "お菓子セール",
      period: "11/24(火)〜11/30(月)",
      startDate: "2026-11-24",
      selected: false,
      important: false,
    });
    expect(web.webStatus).toBeUndefined();
    expect(result.added).toBe(1);
  });

  it("手入力や写真の項目はそのまま残す", () => {
    const result = mergeWebSales([manual], [sale("1", "お菓子セール")]);
    expect(result.items).toContainEqual(manual);
  });

  it("2 回目以降は増えた項目に「新着」を付ける", () => {
    const first = mergeWebSales([], [sale("1", "お菓子セール")]).items;
    const result = mergeWebSales(first, [sale("1", "お菓子セール"), sale("2", "カップ麺セール")]);
    expect(result.items.find((i) => i.id === "web-2")?.webStatus).toBe("new");
    expect(result.items.find((i) => i.id === "web-1")?.webStatus).toBeUndefined();
    expect(result.added).toBe(1);
  });

  it("内容が変わった項目は「変更」を付け、選択状態は保つ", () => {
    const first = mergeWebSales([], [sale("1", "お菓子セール")]).items.map((i) => ({
      ...i,
      selected: true,
      important: true,
    }));
    const result = mergeWebSales(first, [sale("1", "お菓子セール", "2026-11-24", "2026-12-07")]);
    expect(result.items[0]).toMatchObject({
      period: "11/24(火)〜12/7(月)",
      webStatus: "changed",
      selected: true,
      important: true,
    });
    expect(result.changed).toBe(1);
  });

  it("前回の印は次の更新で消える", () => {
    const first = mergeWebSales([], [sale("1", "A")]).items;
    const second = mergeWebSales(first, [sale("1", "A"), sale("2", "B")]).items;
    const third = mergeWebSales(second, [sale("1", "A"), sale("2", "B")]).items;
    expect(third.every((i) => i.webStatus === undefined)).toBe(true);
  });

  it("サイトから消えた項目（終了したセール）は外す", () => {
    const first = mergeWebSales([], [sale("1", "A"), sale("2", "B")]).items;
    const result = mergeWebSales(first, [sale("2", "B")]);
    expect(result.items.map((i) => i.id)).toEqual(["web-2"]);
    expect(result.removed).toBe(1);
  });

  it("ほかの地域限定のセールは取り込まない", () => {
    const result = mergeWebSales([], [sale("1", "【北海道エリア】飲料1本もらえるキャンペーン")]);
    expect(result.items).toEqual([]);
  });
});
