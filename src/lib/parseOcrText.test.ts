import { describe, expect, it } from "vitest";
import { parseOcrText } from "./parseOcrText";

describe("parseOcrText", () => {
  it("名前・価格・期間を取り出す", () => {
    const result = parseOcrText("からあげクン\n20円引き\n11/24(火)〜11/30(月)");
    expect(result).toEqual({
      name: "からあげクン",
      price: "20円引き",
      period: "11/24(火)〜11/30(月)",
      note: "",
    });
  });

  it("全角数字や全角記号もそろえて読む", () => {
    const result = parseOcrText("おにぎり　税込１５０円\n１１／２４（火）～１２／１（月）");
    expect(result.price).toBe("税込150円");
    expect(result.period).toBe("11/24(火)〜12/1(月)");
  });

  it("価格だけの行は名前にしない", () => {
    const result = parseOcrText("100円引き\nプレミアムロールケーキ");
    expect(result.name).toBe("プレミアムロールケーキ");
  });

  it("割引率も価格として扱う", () => {
    expect(parseOcrText("パン 30%OFF").price).toBe("30%OFF");
  });

  it("見つからない欄は空のままにする", () => {
    expect(parseOcrText("新商品のお知らせ")).toEqual({
      name: "新商品のお知らせ",
      price: "",
      period: "",
      note: "",
    });
  });
});
