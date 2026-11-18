import { describe, expect, it } from "vitest";
import { formatMonthDay, generateNotice, seasonalClosing } from "./notice";
import type { SaleItem } from "./saleItem";

function item(overrides: Partial<SaleItem>): SaleItem {
  return {
    id: Math.random().toString(36),
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

const options = {
  startDate: "2026-11-17",
  thanks: "からあげクンmilkコラボの拡販",
  closing: "朝晩の冷え込みも激しいので、体調管理に気をつけて頑張っていきましょう！",
};

describe("generateNotice", () => {
  it("普段の告知文と同じ形で作り、その他の項目にも内容に合った絵文字を付ける", () => {
    const text = generateNotice(
      [
        item({ name: "でからあげクン　夢のミックス味", emoji: "🐔", section: "main", newRelease: true }),
        item({ name: "中華まん　特選豚まん（醤油）", emoji: "🥟", section: "main", newRelease: true }),
        item({ name: "超ハッピーすぎ！チャレンジ！", note: "盛り過ぎチャレンジ開催" }),
        item({ name: "年末催事予約受付中" }),
      ],
      options,
    );

    expect(text).toBe(
      [
        "お疲れ様です。",
        "今週もからあげクンmilkコラボの拡販ありがとうございました🙇‍♂️",
        "",
        "11/17からのお知らせです。",
        "🐔でからあげクン　夢のミックス味　新発売",
        "🥟中華まん　特選豚まん（醤油）　新発売",
        "",
        "その他",
        "🎉超ハッピーすぎ！チャレンジ！",
        "→盛り過ぎチャレンジ開催",
        "🎍年末催事予約受付中",
        "",
        "朝晩の冷え込みも激しいので、体調管理に気をつけて頑張っていきましょう！",
      ].join("\n"),
    );
  });

  it("発売日から 2 週目の商品には（2週目）と付け、1 週目の後ろに並べる", () => {
    const text = generateNotice(
      [
        item({ name: "抹茶ショコラあずきまん", emoji: "🥟", section: "main", releaseDate: "2026-11-10" }),
        item({ name: "からあげクン　新味", emoji: "🐔", section: "main", releaseDate: "2026-11-17" }),
        item({ name: "Ｌチキ", emoji: "🍗", section: "main" }),
      ],
      options,
    );
    expect(text).toContain(
      ["🐔からあげクン　新味　新発売", "🥟抹茶ショコラあずきまん　新発売（2週目）", "🍗Ｌチキ"].join("\n"),
    );
  });

  it("新商品の期間（2 週間）を過ぎた商品には新発売を付けない", () => {
    const text = generateNotice(
      [item({ name: "チーズピザまん", section: "main", releaseDate: "2026-11-03", newRelease: true })],
      options,
    );
    expect(text).toContain("チーズピザまん\n");
    expect(text).not.toContain("新発売");
  });

  it("⭐重要の項目は各欄の先頭に置く", () => {
    const text = generateNotice(
      [
        item({ name: "Ｌチキ", section: "main" }),
        item({ name: "からあげクン", section: "main", important: true }),
        item({ name: "お菓子セール" }),
        item({ name: "コーヒーセール", important: true }),
      ],
      options,
    );
    expect(text).toContain("📌からあげクン\n📌Ｌチキ");
    expect(text).toContain("その他\n🉐コーヒーセール\n🉐お菓子セール");
  });

  it("編集で入れた絵文字は、名前から選ぶ絵文字より優先する", () => {
    const text = generateNotice([item({ name: "お菓子セール", emoji: "🍫" })], options);
    expect(text).toContain("🍫お菓子セール");
  });

  it("選ばれていない項目は載せない", () => {
    const text = generateNotice(
      [item({ name: "載せる", section: "main" }), item({ name: "載せない", section: "main", selected: false })],
      options,
    );
    expect(text).toContain("載せる");
    expect(text).not.toContain("載せない");
  });

  it("価格やひとことは名前の後ろに付ける", () => {
    const text = generateNotice([item({ name: "モカブレンド", price: "20円引き", section: "main" })], options);
    expect(text).toContain("モカブレンド　20円引き");
  });

  it("メイン欄が空なら、その他の項目を見出しなしで続ける", () => {
    const text = generateNotice([item({ name: "お菓子セール" })], options);
    expect(text).toContain("11/17からのお知らせです。\n🉐お菓子セール");
    expect(text).not.toContain("その他");
  });

  it("お礼が空でも文が崩れない", () => {
    const text = generateNotice([item({ name: "A" })], { ...options, thanks: "  " });
    expect(text.startsWith("お疲れ様です。\n今週もありがとうございました🙇‍♂️")).toBe(true);
  });

  it("結びが空なら最後の段落を出さない", () => {
    const text = generateNotice([item({ name: "A" })], { ...options, closing: "" });
    expect(text.endsWith("A")).toBe(true);
  });
});

describe("seasonalClosing", () => {
  it("月に合った例文を返す", () => {
    expect(seasonalClosing(11)).toContain("冷え込み");
    expect(seasonalClosing(1)).toContain("寒い日");
    expect(seasonalClosing(4)).toContain("季節の変わり目");
    expect(seasonalClosing(7)).toContain("水分補給");
  });
});

describe("formatMonthDay", () => {
  it("月/日 にする", () => {
    expect(formatMonthDay("2026-11-17")).toBe("11/17");
    expect(formatMonthDay("2026-01-06")).toBe("1/6");
  });
});
