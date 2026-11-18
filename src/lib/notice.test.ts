import { describe, expect, it } from "vitest";
import { generateNotice } from "./notice";
import type { SaleItem } from "./saleItem";

function item(overrides: Partial<SaleItem>): SaleItem {
  return {
    id: "x",
    name: "商品",
    price: "",
    period: "",
    note: "",
    source: "manual",
    selected: true,
    important: false,
    ...overrides,
  };
}

describe("generateNotice", () => {
  it("重要項目を先頭の「特に注目」にまとめる", () => {
    const text = generateNotice(
      [
        item({ id: "1", name: "おにぎり", price: "100円引き" }),
        item({ id: "2", name: "からあげクン", price: "20円引き", important: true }),
      ],
      "11/24(火)",
    );

    expect(text).toBe(
      [
        "🎉【11/24(火)スタート】今週のセール情報です！",
        "",
        "⭐ 特に注目！",
        "・からあげクン　20円引き",
        "",
        "✨ そのほかのセール",
        "・おにぎり　100円引き",
        "",
        "お客様へのお声がけ、よろしくお願いします💪",
        "今週も一緒にがんばりましょう！",
      ].join("\n"),
    );
  });

  it("選択されていない項目は載せない", () => {
    const text = generateNotice(
      [item({ name: "載せる商品" }), item({ name: "載せない商品", selected: false })],
      "11/24(火)",
    );
    expect(text).toContain("載せる商品");
    expect(text).not.toContain("載せない商品");
  });

  it("重要項目がなければ見出しは「セール内容」になる", () => {
    const text = generateNotice([item({ name: "パン" })], "11/24(火)");
    expect(text).toContain("✨ セール内容\n・パン");
    expect(text).not.toContain("特に注目");
  });

  it("期間と補足は入力がある場合だけ載せる", () => {
    const text = generateNotice(
      [item({ name: "コーヒー", period: "11/24(火)〜11/30(月)", note: "なくなり次第終了" })],
      "11/24(火)",
    );
    expect(text).toContain("・コーヒー\n　📅 11/24(火)〜11/30(月)\n　※なくなり次第終了");
  });

  it("何も選ばれていなければその旨を書く", () => {
    const text = generateNotice([item({ selected: false })], "11/24(火)");
    expect(text).toContain("まだ選ばれていません");
  });
});
