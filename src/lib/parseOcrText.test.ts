import { describe, expect, it } from "vitest";
import { parseOcrText, splitOcrLines, stripCategoryLabel } from "./parseOcrText";

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

describe("splitOcrLines", () => {
  it("実際の OCR の出力を、補正した行の一覧にする", () => {
    // 実際に Tesseract.js が出力した文字列
    expect(splitOcrLines("か ら あ げ ク ン\n20 円 引き\n11724( 火 )ー11730( 月 )\n")).toEqual([
      "からあげクン",
      "20円引き",
      "11/24(火)〜11/30(月)",
    ]);
  });

  it("空の行や、罫線・汚れの誤読のような行は除く", () => {
    expect(splitOcrLines("超ハッピーすぎ！チャレンジ\n\n| ー_\n・\nあ\n盛りすぎチャレンジ開催")).toEqual([
      "超ハッピーすぎ！チャレンジ",
      "盛りすぎチャレンジ開催",
    ]);
  });

  it("同じ内容の行は 1 つにする", () => {
    expect(splitOcrLines("おせち予約受付中\nおせち予約受付中")).toEqual(["おせち予約受付中"]);
  });

  it("英数字の行の空白は 1 つにそろえて残す", () => {
    expect(splitOcrLines("Ponta  ポイント  2倍\nL  チキ")).toEqual(["Pontaポイント2倍", "Lチキ"]);
  });
});

describe("splitOcrLines（店舗資料の写真）", () => {
  // いただいた店舗資料の写真の《次週》の部分を、実際に Tesseract.js で読み取った結果
  const raw = [
    "を 次 週 ゃ",
    "",
    "ロ HOTFF : 黄金 チキ ン 骨 つき / レ ッ ド 骨 つ き 新 発売 |",
    "・11724-11730 チキ ン 購 入 で 黄金 チキ ン 100 円 引 レ シー ト",
    "",
    "ロロ 中 華 ま ん : 焼豚 玉子 まん 新 発 売",
    "",
    "口中 華 ま ん :・ 八 ム チー ズ マ ヨ ! ーー 科",
  ].join("\n");
  const lines = splitOcrLines(raw);

  it("行頭のチェック欄（□ が ロ・ロロ・口 に化けたもの）・「HOTFF:」などの見出し・行末の「|」を除く", () => {
    expect(lines).toContain("黄金チキン骨つき/レッド骨つき新発売");
    expect(lines).toContain("焼豚玉子まん新発売");
  });

  it("期間の「/」が「7」に化けたものを直す（11724-11730 → 11/24-11/30）", () => {
    expect(lines).toContain("11/24-11/30チキン購入で黄金チキン100円引レシート");
  });

  it("「口」が次の文字にくっついていても除く", () => {
    expect(lines.some((l) => l.startsWith("八ムチーズマヨ"))).toBe(true);
  });

  it("「ロ」で始まる商品名（ロールケーキなど）は削らない", () => {
    expect(splitOcrLines("ロ ー ル ケ ー キ 新 発 売")).toEqual(["ロールケーキ新発売"]);
  });

  it("日付として成り立たない数字は直さない", () => {
    expect(splitOcrLines("品番 98765-43210")).toEqual(["品番98765-43210"]);
  });
});

describe("stripCategoryLabel", () => {
  it("頭の「HOTFF:」「常温FF:」「中華まん:」のような見出しを除く", () => {
    expect(stripCategoryLabel("HOTFF:黄金チキン骨つき/レッド骨つき新発売")).toBe("黄金チキン骨つき/レッド骨つき新発売");
    expect(stripCategoryLabel("常温FF：紅しょうが唐揚げ串新発売")).toBe("紅しょうが唐揚げ串新発売");
    expect(stripCategoryLabel("中華まん : ・ハムチーズマヨ")).toBe("ハムチーズマヨ");
  });

  it("見出しのない名前や、時刻のような数字のコロンはそのまま", () => {
    expect(stripCategoryLabel("中華まん　特選豚まん（醤油）")).toBe("中華まん　特選豚まん（醤油）");
    expect(stripCategoryLabel("10:00から販売開始")).toBe("10:00から販売開始");
    expect(stripCategoryLabel("HOTFF:")).toBe("HOTFF:");
  });
});
