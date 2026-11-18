import { describe, expect, it } from "vitest";
import { rectFromPoints, toImageRect } from "./cropRect";

const display = { width: 300, height: 533 };

describe("rectFromPoints", () => {
  it("なぞった向きに関係なく四角を作る", () => {
    expect(rectFromPoints({ x: 250, y: 300 }, { x: 10, y: 180 }, display)).toEqual({
      left: 10,
      top: 180,
      width: 240,
      height: 120,
    });
  });

  it("写真の外にはみ出した分は切り詰める", () => {
    expect(rectFromPoints({ x: -30, y: 500 }, { x: 400, y: 600 }, display)).toEqual({
      left: 0,
      top: 500,
      width: 300,
      height: 33,
    });
  });

  it("小さすぎる囲み（タップしただけ）は無視する", () => {
    expect(rectFromPoints({ x: 100, y: 100 }, { x: 105, y: 160 }, display)).toBeNull();
  });
});

describe("toImageRect", () => {
  it("画面上の四角を元の写真の大きさに直す", () => {
    // いただいた写真（2268×4032）を幅 300px で表示した場合
    expect(
      toImageRect({ left: 10, top: 180, width: 240, height: 60 }, display, { width: 2268, height: 4032 }),
    ).toEqual({ left: 76, top: 1362, width: 1814, height: 454 });
  });
});
