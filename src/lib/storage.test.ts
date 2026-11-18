import { describe, expect, it } from "vitest";
import { parseStoredItems } from "./storage";

const valid = {
  id: "1",
  name: "おにぎり",
  price: "100円引き",
  period: "",
  note: "",
  source: "manual",
  selected: true,
  important: false,
};

describe("parseStoredItems", () => {
  it("正しいデータを復元する", () => {
    expect(parseStoredItems(JSON.stringify([valid]))).toEqual([valid]);
  });

  it("空や壊れた JSON は空の一覧にする", () => {
    expect(parseStoredItems(null)).toEqual([]);
    expect(parseStoredItems("{壊れた")).toEqual([]);
    expect(parseStoredItems('{"a":1}')).toEqual([]);
  });

  it("形の合わない項目は読み飛ばす", () => {
    const raw = JSON.stringify([valid, { id: "2", name: 123 }]);
    expect(parseStoredItems(raw)).toEqual([valid]);
  });
});

describe("parseStoredItems（追加の項目）", () => {
  it("FF の項目（欄・絵文字・カテゴリ・対象商品）を復元する", () => {
    const ff = {
      ...valid,
      id: "ff-1",
      source: "web",
      section: "main",
      emoji: "🐔",
      newRelease: true,
      category: "fry",
      targets: ["標準価格 288円(税込)"],
    };
    expect(parseStoredItems(JSON.stringify([ff]))).toEqual([ff]);
  });

  it("知らないカテゴリや形の違う対象商品は読み飛ばす", () => {
    const raw = JSON.stringify([
      { ...valid, id: "a", category: "unknown" },
      { ...valid, id: "b", targets: [1, 2] },
      { ...valid, id: "c", section: "top" },
    ]);
    expect(parseStoredItems(raw)).toEqual([]);
  });
});
