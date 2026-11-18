import { describe, expect, it } from "vitest";
import { groupFF, releaseLabel, releaseWeek } from "./newRelease";
import type { SaleItem } from "./saleItem";

function ff(id: string, overrides: Partial<SaleItem> = {}): SaleItem {
  return {
    id: `ff-${id}_1996`,
    name: `商品${id}`,
    price: "",
    period: "",
    note: "",
    source: "web",
    selected: false,
    important: false,
    section: "main",
    category: "fry",
    ...overrides,
  };
}

const start = "2026-11-17";

describe("releaseWeek / releaseLabel", () => {
  it("発売日があれば発売日で週を決める", () => {
    expect(releaseWeek(ff("1", { releaseDate: "2026-11-17" }), start)).toBe(1);
    expect(releaseWeek(ff("1", { releaseDate: "2026-11-10" }), start)).toBe(2);
    expect(releaseWeek(ff("1", { releaseDate: "2026-11-03" }), start)).toBeNull();
  });

  it("発売日が分かる商品は、手動の印より発売日を優先する", () => {
    expect(releaseWeek(ff("1", { releaseDate: "2026-11-03", newRelease: true }), start)).toBeNull();
  });

  it("発売日が分からなければ手動の印で 1 週目とする", () => {
    expect(releaseWeek(ff("1", { newRelease: true }), start)).toBe(1);
    expect(releaseWeek(ff("1"), start)).toBeNull();
  });

  it("2 週目は（2週目）と付ける", () => {
    expect(releaseLabel(1)).toBe("新発売");
    expect(releaseLabel(2)).toBe("新発売（2週目）");
    expect(releaseLabel(null)).toBe("");
  });
});

describe("groupFF", () => {
  const items = [
    ff("1390563"), // 定番
    ff("1534113", { releaseDate: "2026-11-10" }), // 2 週目
    ff("1534413"), // 発売日不明・掲載が新しい
    ff("1533852", { releaseDate: "2026-11-03" }), // 期間切れ → 定番
    ff("1534290", { releaseDate: "2026-11-17" }), // 1 週目
  ];
  const groups = groupFF(items, start);

  it("新商品の週ごとに分ける", () => {
    expect(groups.week1.map((i) => i.id)).toEqual(["ff-1534290_1996"]);
    expect(groups.week2.map((i) => i.id)).toEqual(["ff-1534113_1996"]);
  });

  it("発売日が分からず掲載が一番新しいものは「確認できない新しい掲載」にする", () => {
    expect(groups.unconfirmed.map((i) => i.id)).toEqual(["ff-1534413_1996"]);
  });

  it("期間を過ぎた新商品と古い掲載は定番にし、掲載の新しい順に並べる", () => {
    expect(groups.regular.map((i) => i.id)).toEqual(["ff-1533852_1996", "ff-1390563_1996"]);
  });

  it("発売日が分かる商品が 1 つもなければ、確認できない掲載として扱わない", () => {
    const g = groupFF([ff("1534413"), ff("1390563")], start);
    expect(g.unconfirmed).toEqual([]);
    expect(g.regular).toHaveLength(2);
  });
});
