import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newProductWeek, parseNewIndexRedirect, parseNewListItems, parseNewListNav } from "./lawsonNew";

const fixture = readFileSync(join(__dirname, "__fixtures__", "newList.html"), "utf-8");

describe("parseNewIndexRedirect", () => {
  it("転送先のページを取り出す", () => {
    const html = '<meta http-equiv="Refresh" content="0; URL=/recommend/new/list/1534243_5162.html" />';
    expect(parseNewIndexRedirect(html)).toBe("/recommend/new/list/1534243_5162.html");
  });

  it("新商品のページ以外への転送は受け付けない", () => {
    expect(parseNewIndexRedirect('<meta http-equiv="Refresh" content="0; URL=https://example.com/" />')).toBeNull();
    expect(parseNewIndexRedirect("<html></html>")).toBeNull();
  });
});

describe("parseNewListNav", () => {
  it("ほかの発売日のページへのリンクを取り出す（表示中のページは含まない）", () => {
    expect(parseNewListNav(fixture)).toEqual([
      "/recommend/new/list/1534243_5162.html",
      "/recommend/new/list/1534244_5162.html",
      "/recommend/new/list/1533836_5162.html",
    ]);
  });
});

describe("parseNewListItems", () => {
  it("商品ごとの発売日を取り出す", () => {
    expect(parseNewListItems(fixture)).toEqual({
      "1534113_1996": "2026-11-10",
      "1534080_1996": "2026-11-09",
    });
  });
});

describe("newProductWeek", () => {
  const start = "2026-11-17"; // 火曜日

  it("開始日の当日・前日・週の途中の発売は 1 週目", () => {
    expect(newProductWeek("2026-11-17", start)).toBe(1);
    expect(newProductWeek("2026-11-16", start)).toBe(1);
    expect(newProductWeek("2026-11-20", start)).toBe(1);
  });

  it("前の週の発売は 2 週目", () => {
    expect(newProductWeek("2026-11-10", start)).toBe(2);
    expect(newProductWeek("2026-11-09", start)).toBe(2);
    // 11/4(水) は 11/10 開始の告知では 1 週目、11/17 開始では 2 週目
    expect(newProductWeek("2026-11-04", "2026-11-10")).toBe(1);
    expect(newProductWeek("2026-11-04", start)).toBe(2);
  });

  it("2 週間より前の発売は新商品として扱わない", () => {
    expect(newProductWeek("2026-11-03", start)).toBeNull();
    expect(newProductWeek("2026-10-27", start)).toBeNull();
  });

  it("翌週以降の発売はまだ扱わない", () => {
    expect(newProductWeek("2026-11-24", start)).toBeNull();
  });

  it("月をまたいでも数える", () => {
    expect(newProductWeek("2026-11-24", "2026-12-01")).toBe(2);
  });
});
