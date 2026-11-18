import { describe, expect, it } from "vitest";
import { DUPLICATE_THRESHOLD, findDuplicates, nameSimilarity, normalizeForMatch } from "./duplicates";
import type { SaleItem } from "./saleItem";

function item(id: string, name: string, source: SaleItem["source"], selected = true): SaleItem {
  return { id, name, price: "", period: "", note: "", source, selected, important: false };
}

describe("normalizeForMatch", () => {
  it("資料の頭書き・新発売・記号・空白を除き、全角半角をそろえる", () => {
    expect(normalizeForMatch("中華まん:焼豚玉子まん新発売")).toBe("焼豚玉子まん");
    expect(normalizeForMatch("HOTFF:黄金チキン骨つき/レッド骨つき新発売")).toBe("黄金チキン骨つきレッド骨つき");
    expect(normalizeForMatch("特撰　豚まん(醤油)")).toBe("特撰豚まん醤油");
    expect(normalizeForMatch("Ｌチキ　レギュラー")).toBe("lチキレギュラー");
  });

  it("期間を除く", () => {
    expect(normalizeForMatch("11/24-11/30チキン購入で黄金チキン100円引レシート")).toBe(
      "チキン購入で黄金チキン100円引レシート",
    );
  });
});

describe("nameSimilarity", () => {
  it("片方がもう片方を含んでいれば重複とみなす", () => {
    expect(nameSimilarity("中華まん:焼豚玉子まん新発売", "焼豚玉子まん")).toBe(1);
    expect(nameSimilarity("HOTFF:黄金チキン骨つき/レッド骨つき新発売", "黄金チキン　骨つき")).toBe(1);
  });

  it("読み間違いが 1 文字あっても、似ていれば重複とみなす", () => {
    expect(nameSimilarity("特選豚まん(醤油)新発売", "特撰　豚まん(醤油)")).toBeGreaterThanOrEqual(DUPLICATE_THRESHOLD);
  });

  it("違う商品は重複とみなさない", () => {
    expect(nameSimilarity("焼豚玉子まん", "特撰　豚まん(醤油)")).toBeLessThan(DUPLICATE_THRESHOLD);
    expect(nameSimilarity("からあげクン　レッド", "からあげクン　レギュラー")).toBeLessThan(DUPLICATE_THRESHOLD);
    expect(nameSimilarity("おせち予約受付中", "クリスマスケーキ予約受付中")).toBeLessThan(DUPLICATE_THRESHOLD);
  });

  it("短すぎる名前は比べない", () => {
    expect(nameSimilarity("A", "A")).toBe(0);
  });
});

describe("findDuplicates", () => {
  it("写真の項目と重複している公式サイトの項目を、一番似ているもので返す", () => {
    const items = [
      item("web-1", "特撰　豚まん(塩)", "web"),
      item("web-2", "特撰　豚まん(醤油)", "web"),
      item("p1", "中華まん:特選豚まん(醤油)新発売", "photo"),
    ];
    expect(findDuplicates(items)).toEqual([{ itemId: "p1", webItemId: "web-2", webItemName: "特撰　豚まん(醤油)" }]);
  });

  it("どちらかが「載せない」なら告知文で重ならないので対象外", () => {
    expect(findDuplicates([item("web-1", "焼豚玉子まん", "web", false), item("p1", "焼豚玉子まん新発売", "photo")])).toEqual([]);
    expect(findDuplicates([item("web-1", "焼豚玉子まん", "web"), item("p1", "焼豚玉子まん新発売", "photo", false)])).toEqual([]);
  });

  it("手入力の項目も調べ、公式サイト同士・写真同士は比べない", () => {
    const items = [
      item("web-1", "焼豚玉子まん", "web"),
      item("web-2", "焼豚玉子まん", "web"),
      item("m1", "焼豚玉子まん", "manual"),
      item("p1", "おせち予約受付中", "photo"),
      item("p2", "おせち予約受付中", "photo"),
    ];
    expect(findDuplicates(items).map((d) => d.itemId)).toEqual(["m1"]);
  });
});
