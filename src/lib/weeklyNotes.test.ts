import { describe, expect, it } from "vitest";
import { parseWeeklyNotes, thanksFor, updateNote } from "./weeklyNotes";

describe("thanksFor", () => {
  it("その週に入れたお礼の内容を返す（ほかの週には持ち越さない）", () => {
    const notes = { "2026-11-17": { thanks: "からあげクンmilkコラボの拡販" } };
    expect(thanksFor(notes, "2026-11-17")).toBe("からあげクンmilkコラボの拡販");
    expect(thanksFor(notes, "2026-11-24")).toBe("");
  });
});

describe("updateNote", () => {
  it("ほかの欄を残したまま書き換える", () => {
    const notes = updateNote({ "2026-11-24": { thanks: "A" } }, "2026-11-24", { closing: "B" });
    expect(notes).toEqual({ "2026-11-24": { thanks: "A", closing: "B" } });
  });

  it("結びの挨拶の書き換えを保存し、undefined で消す", () => {
    const notes = updateNote({}, "2026-11-24", { closing: "寒いので気をつけて！" });
    expect(notes).toEqual({ "2026-11-24": { closing: "寒いので気をつけて！" } });
    expect(updateNote(notes, "2026-11-24", { closing: undefined })).toEqual({});
  });

  it("お礼を空にしたら消し、何も残らなければその週ごと消す", () => {
    expect(updateNote({ "2026-11-24": { thanks: "A" } }, "2026-11-24", { thanks: "" })).toEqual({});
  });
});

describe("parseWeeklyNotes", () => {
  it("正しいデータを復元し、形の合わないものや以前の「今週の取り組み」は読み飛ばす", () => {
    const raw = JSON.stringify({
      "2026-11-17": { thanks: "A", closing: "C", initiative: "古い欄" },
      "2026-11-10": { initiative: "古い欄だけ" },
      "bad-date": { thanks: "C" },
      "2026-11-24": { thanks: 1 },
    });
    expect(parseWeeklyNotes(raw)).toEqual({ "2026-11-17": { thanks: "A", closing: "C" } });
  });

  it("空や壊れたデータは空にする", () => {
    expect(parseWeeklyNotes(null)).toEqual({});
    expect(parseWeeklyNotes("{壊れた")).toEqual({});
    expect(parseWeeklyNotes("[]")).toEqual({});
  });
});
