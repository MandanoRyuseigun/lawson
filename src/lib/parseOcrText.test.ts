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
      emoji: "",
      section: "other",
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

  it("名前と価格が同じ行にあれば、名前から価格を除く", () => {
    const result = parseOcrText("おにぎり　税込１５０円");
    expect(result.name).toBe("おにぎり");
    expect(result.price).toBe("税込150円");
  });

  it("割引率も価格として扱う", () => {
    expect(parseOcrText("パン 30%OFF").price).toBe("30%OFF");
  });

  it("OCR の誤読（/ を 7、〜 を ー）や空白を補正して期間を読む", () => {
    // 実際に Tesseract.js が出力した文字列
    const result = parseOcrText("か ら あ げ ク ン\n20 円 引き\n11724( 火 )ー11730( 月 )\n");
    expect(result.period).toBe("11/24(火)〜11/30(月)");
    expect(result.price).toBe("20円引き");
  });

  it("1 月の日付の誤読も補正する", () => {
    expect(parseOcrText("1727(火)ー1/31(土)").period).toBe("1/27(火)〜1/31(土)");
  });

  it("見つからない欄は空のままにする", () => {
    expect(parseOcrText("新商品のお知らせ")).toEqual({
      name: "新商品のお知らせ",
      price: "",
      period: "",
      note: "",
      emoji: "",
      section: "other",
    });
  });
});
