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
