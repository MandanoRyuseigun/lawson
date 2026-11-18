import { describe, expect, it } from "vitest";
import { formatShortDate, getTargetTuesday } from "./targetTuesday";

describe("getTargetTuesday", () => {
  it("水曜日なら翌週の火曜日を返す", () => {
    // 2026/11/18 は水曜日
    const result = getTargetTuesday(new Date(2026, 10, 18, 15, 30));
    expect(result).toEqual(new Date(2026, 10, 24));
  });

  it("火曜日ならその日を返す", () => {
    const result = getTargetTuesday(new Date(2026, 10, 24, 9, 0));
    expect(result).toEqual(new Date(2026, 10, 24));
  });

  it("月曜日なら翌日を返す", () => {
    const result = getTargetTuesday(new Date(2026, 10, 23));
    expect(result).toEqual(new Date(2026, 10, 24));
  });

  it("月をまたいでも正しく計算する", () => {
    // 2026/11/25(水) → 2026/12/1(火)
    const result = getTargetTuesday(new Date(2026, 10, 25));
    expect(result).toEqual(new Date(2026, 11, 1));
  });
});

describe("formatShortDate", () => {
  it("月/日(曜日) の形式で返す", () => {
    expect(formatShortDate(new Date(2026, 10, 24))).toBe("11/24(火)");
  });
});
