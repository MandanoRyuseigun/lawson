import { describe, expect, it } from "vitest";
import { parseWeeklyNotes, previousInitiative, thanksFor, updateNote, type WeeklyNotes } from "./weeklyNotes";

describe("previousInitiative / thanksFor", () => {
  const notes: WeeklyNotes = {
    "2026-11-10": { initiative: "からあげクンmilkコラボの拡販" },
    "2026-11-17": { initiative: "でからあげクン 夢のMIX味の拡販" },
  };

  it("前の週に入れた取り組みを、翌週のお礼に使う", () => {
    expect(thanksFor(notes, "2026-11-17")).toBe("からあげクンmilkコラボの拡販");
    expect(thanksFor(notes, "2026-11-24")).toBe("でからあげクン 夢のMIX味の拡販");
  });

  it("その週に入れた取り組みは、その週のお礼には使わない", () => {
    expect(thanksFor({ "2026-11-24": { initiative: "おでんの拡販" } }, "2026-11-24")).toBe("");
  });

  it("前の週を飛ばしていても、2 週間以内なら一番新しい取り組みを使う", () => {
    expect(previousInitiative(notes, "2026-12-01")).toEqual({
      date: "2026-11-17",
      text: "でからあげクン 夢のMIX味の拡販",
    });
  });

  it("2 週間より前の取り組みは使わない", () => {
    expect(thanksFor(notes, "2026-12-08")).toBe("");
  });

  it("お礼の文を手で書き換えていれば、そちらを使う（空にした場合も空のまま）", () => {
    const edited = updateNote(notes, "2026-11-24", { thanks: "年末催事の予約獲得" });
    expect(thanksFor(edited, "2026-11-24")).toBe("年末催事の予約獲得");
    expect(thanksFor(updateNote(notes, "2026-11-24", { thanks: "" }), "2026-11-24")).toBe("");
  });
});

describe("updateNote", () => {
  it("ほかの欄を残したまま書き換える", () => {
    const notes = updateNote({ "2026-11-24": { initiative: "A" } }, "2026-11-24", { thanks: "B" });
    expect(notes).toEqual({ "2026-11-24": { initiative: "A", thanks: "B" } });
  });

  it("結びの挨拶の書き換えを保存し、undefined で消す", () => {
    const notes = updateNote({}, "2026-11-24", { closing: "寒いので気をつけて！" });
    expect(notes).toEqual({ "2026-11-24": { closing: "寒いので気をつけて！" } });
    expect(updateNote(notes, "2026-11-24", { closing: undefined })).toEqual({});
  });

  it("取り組みを空にしたら消し、何も残らなければその週ごと消す", () => {
    expect(updateNote({ "2026-11-24": { initiative: "A" } }, "2026-11-24", { initiative: "" })).toEqual({});
  });
});

describe("parseWeeklyNotes", () => {
  it("正しいデータを復元し、形の合わないものは読み飛ばす", () => {
    const raw = JSON.stringify({
      "2026-11-17": { initiative: "A", thanks: "B", closing: "C" },
      "bad-date": { initiative: "C" },
      "2026-11-24": { initiative: 1 },
    });
    expect(parseWeeklyNotes(raw)).toEqual({ "2026-11-17": { initiative: "A", thanks: "B", closing: "C" } });
  });

  it("空や壊れたデータは空にする", () => {
    expect(parseWeeklyNotes(null)).toEqual({});
    expect(parseWeeklyNotes("{壊れた")).toEqual({});
    expect(parseWeeklyNotes("[]")).toEqual({});
  });
});
