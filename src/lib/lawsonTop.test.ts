import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseTopBanners } from "./lawsonTop";

const fixture = readFileSync(join(__dirname, "__fixtures__", "top.html"), "utf-8");

describe("parseTopBanners", () => {
  const banners = parseTopBanners(fixture);

  it("メインのスライドの告知をスライドの順に取り出す", () => {
    expect(banners[0]).toEqual({
      id: "lab/tsuushin/art/1533780_4659.html",
      title: "盛りすぎ！チャレンジ。超ハッピーすぎ！チャレンジ。対象商品のお値段そのまま50％増量！",
      url: "https://www.lawson.co.jp/lab/tsuushin/art/1533780_4659.html",
    });
    expect(banners[1]).toMatchObject({
      id: "lab/campaign/christmas",
      title: "ローソンのクリスマスケーキ ご予約承り中！ 早期予約200円引 ローソンアプリ予約300円引",
    });
  });

  it("会社のニュースやサービス案内（スポーツくじなど）は除く", () => {
    const titles = banners.map((b) => b.title).join("\n");
    expect(titles).not.toContain("トイレ");
    expect(titles).not.toContain("スポーツくじ");
  });

  it("Loppi のグッズ・チケットの告知は店舗の告知ではないので除く", () => {
    expect(banners.map((b) => b.title).join("\n")).not.toContain("Loppi");
  });

  it("ほかの地域限定の告知は除く", () => {
    expect(banners.map((b) => b.title).join("\n")).not.toContain("北海道");
  });

  it("「別ウィンドウで開きます」や「〇〇サイトへ」の言葉を除く", () => {
    expect(banners[2]).toMatchObject({
      title: "Pontaパス会員限定。マチカフェ宇治抹茶ラテ298円が138円",
      url: "https://prcp.pass.auone.jp/pontapass_lawsonweb/index.html?rid=LWLA24100066",
    });
  });

  it("コメント内やスライドの外のバナーは取り込まない", () => {
    expect(banners).toHaveLength(3);
  });

  it("想定と違う HTML なら空にする", () => {
    expect(parseTopBanners("<main></main>")).toEqual([]);
  });
});
