/** 週（告知の開始日）ごとのメモ */
export type WeeklyNote = {
  /** お礼する先週の取り組み（例: 「からあげクンmilkコラボの拡販」）。「今週も〇〇ありがとうございました」の〇〇 */
  thanks?: string;
  /** その週の結びの挨拶を手で書き換えた場合の文（なければ天気から自動で作る） */
  closing?: string;
};

/** キーは告知の開始日（YYYY-MM-DD） */
export type WeeklyNotes = Record<string, WeeklyNote>;

/** 開始日 startDate の告知に入れるお礼の内容（未入力なら空文字） */
export function thanksFor(notes: WeeklyNotes, startDate: string): string {
  return notes[startDate]?.thanks ?? "";
}

/** 開始日 startDate のメモを書き換えた新しいメモ全体を返す（空になった項目は消す） */
export function updateNote(notes: WeeklyNotes, startDate: string, patch: WeeklyNote): WeeklyNotes {
  const merged: WeeklyNote = { ...notes[startDate], ...patch };
  const cleaned: WeeklyNote = {};
  if (merged.thanks !== undefined && merged.thanks !== "") cleaned.thanks = merged.thanks;
  if (merged.closing !== undefined) cleaned.closing = merged.closing;
  const next = { ...notes };
  if (Object.keys(cleaned).length === 0) delete next[startDate];
  else next[startDate] = cleaned;
  return next;
}

/** 保存された文字列からメモを復元する。形の合わないものは読み飛ばす */
export function parseWeeklyNotes(raw: string | null): WeeklyNotes {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data)) return {};
    const result: WeeklyNotes = {};
    for (const [date, value] of Object.entries(data as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof value !== "object" || value === null) continue;
      const v = value as Record<string, unknown>;
      const note: WeeklyNote = {};
      if (typeof v.thanks === "string" && v.thanks !== "") note.thanks = v.thanks;
      if (typeof v.closing === "string") note.closing = v.closing;
      if (Object.keys(note).length > 0) result[date] = note;
    }
    return result;
  } catch {
    return {};
  }
}
