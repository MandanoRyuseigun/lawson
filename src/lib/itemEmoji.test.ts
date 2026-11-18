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

  it("写真から読み取ったメイン欄（FF）の項目には、商品に合った絵文字を付ける", () => {
    // いただいた画面の、写真から追加した項目
    const main = (name: string) => itemEmoji({ name, section: "main" });
    expect(main("HOTFF:黄金チキン骨つき/レッド骨つき新発売")).toBe("🍗");
    expect(main("中華まん:焼豚玉子まん新発売")).toBe("🥟");
    expect(main("常温FF:和紅しょうが唐揚げ串新発売")).toBe("🍗");
    expect(main("11/24-11/30チキン購入で黄金チキン100円引レシート")).toBe("🍗");
    expect(main("からあげクン1個増量")).toBe("🐔");
    expect(main("ホットカフェラテ")).toBe("☕");
    expect(main("おでん全品70円引")).toBe("🍢");
  });

  it("その他欄はキャンペーンの絵文字を先に選び、当たらなければ商品の絵文字にする", () => {
    const other = (name: string) => itemEmoji({ name, section: "other" });
    expect(other("11/24-11/30チキン購入で黄金チキン100円引レシート")).toBe("🎟️");
    expect(other("からあげクン1個増量")).toBe("🎉");
    expect(other("焼豚玉子まん")).toBe("🥟");
    expect(other("店長からのお知らせ")).toBe("📌");
  });

  it("絵文字がなければ名前から選ぶ", () => {
    expect(itemEmoji({ name: "お菓子セール" })).toBe("🉐");
    expect(itemEmoji({ name: "お菓子セール", emoji: "" })).toBe("🉐");
  });
});
