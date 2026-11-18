import { describe, expect, it } from "vitest";
import { itemEmoji, keywordEmoji } from "./itemEmoji";

describe("keywordEmoji", () => {
  it("トップページの告知に合った絵文字を選ぶ", () => {
    expect(keywordEmoji("盛りすぎ！チャレンジ。超ハッピーすぎ！チャレンジ。対象商品のお値段そのまま50％増量！")).toBe("🎉");
    expect(keywordEmoji("ローソンのクリスマスケーキ ご予約承り中！")).toBe("🎄");
    expect(keywordEmoji("年末催事予約受付中")).toBe("🎍");
    expect(keywordEmoji("おせち予約受付中")).toBe("🎍");
  });

  it("セールに合った絵文字を選ぶ", () => {
    expect(keywordEmoji("飲料1本もらえるキャンペーン")).toBe("🎁");
    expect(keywordEmoji("お菓子値引券がもらえるキャンペーン")).toBe("🎁");
    expect(keywordEmoji("対象の即席食品を2個同時購入で100円引")).toBe("🉐");
    expect(keywordEmoji("モカブレンド　お買い得セール")).toBe("🉐");
  });

  it("どれにも当たらなければ 📌 にする", () => {
    expect(keywordEmoji("店長からのお知らせ")).toBe("📌");
  });
});

describe("itemEmoji", () => {
  it("編集で入れた絵文字やカテゴリの絵文字を優先する", () => {
    expect(itemEmoji({ name: "からあげクン", emoji: "🐔" })).toBe("🐔");
    expect(itemEmoji({ name: "お菓子セール", emoji: "🍫" })).toBe("🍫");
  });

  it("絵文字がなければ名前から選ぶ", () => {
    expect(itemEmoji({ name: "お菓子セール" })).toBe("🉐");
    expect(itemEmoji({ name: "お菓子セール", emoji: "" })).toBe("🉐");
  });
});
