import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ffEmoji, parseFFCategory } from "./lawsonFF";

const fixture = readFileSync(join(__dirname, "__fixtures__", "ffCategory.html"), "utf-8");

describe("parseFFCategory", () => {
  const products = parseFFCategory(fixture, "fry");

  it("商品名・価格・詳細 URL を取り出す", () => {
    expect(products[0]).toEqual({
      id: "1534413_1996",
      name: "でからあげクン　夢のMIX味",
      price: "288円(税込)",
      category: "fry",
      url: "https://www.lawson.co.jp/recommend/original/detail/1534413_1996.html",
    });
  });

  it("掲載の新しい順（番号の大きい順）に並べる", () => {
    expect(products.map((p) => p.id)).toEqual(["1534413_1996", "1390578_1996", "1390563_1996"]);
  });

  it("コメントアウトされた商品は取り込まない", () => {
    expect(products.map((p) => p.name)).not.toContain("コメント内の商品");
  });

  it("想定と違う HTML なら空にする", () => {
    expect(parseFFCategory("<main></main>", "fry")).toEqual([]);
  });
});

describe("ffEmoji", () => {
  it("からあげクンは 🐔、それ以外はカテゴリの絵文字", () => {
    expect(ffEmoji("でからあげクン　夢のMIX味", "fry")).toBe("🐔");
    expect(ffEmoji("Ｌチキ　レギュラー", "fry")).toBe("🍗");
    expect(ffEmoji("特撰　豚まん(醤油)", "chukaman")).toBe("🥟");
  });
});
