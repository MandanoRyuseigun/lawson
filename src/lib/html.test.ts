import { describe, expect, it } from "vitest";
import { decodeEntities, htmlToText } from "./html";

describe("decodeEntities", () => {
  it("名前付き・数値の文字参照を戻す", () => {
    expect(decodeEntities("シーチキン&reg;&amp;マヨ &#12354;&#x3042;")).toBe("シーチキン®&マヨ ああ");
  });

  it("知らない参照はそのまま残す", () => {
    expect(decodeEntities("&unknown;")).toBe("&unknown;");
  });
});

describe("htmlToText", () => {
  it("タグを除き、<br> と改行を空白 1 つにする", () => {
    expect(htmlToText("<span>●引換券対象商品<br>\n  引換期間</span>")).toBe("●引換券対象商品 引換期間");
  });

  it("全角スペースは残す", () => {
    expect(htmlToText("モカブレンド　お買い得セール")).toBe("モカブレンド　お買い得セール");
  });
});
