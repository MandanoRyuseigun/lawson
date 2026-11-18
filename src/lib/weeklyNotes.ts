/** 週（告知の開始日）ごとのメモ */
export type WeeklyNote = {
  /** その週の取り組み（例: 「でからあげクン 夢のMIX味の拡販」）。翌週の告知のお礼に使う */
  initiative?: string;
  /** その週の告知に入れるお礼の内容を手で書き換えた場合の文 */
  thanks?: string;
  /** その週の結びの挨拶を手で書き換えた場合の文（なければ天気から自動で作る） */
  closing?: string;
};

/** キーは告知の開始日（YYYY-MM-DD） */
export type WeeklyNotes = Record<string, WeeklyNote>;

const DAY = 24 * 60 * 60 * 1000;

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** 前の週の取り組みとして使う範囲（日数）。これより古い取り組みは使わない */
const MAX_DAYS_BACK = 14;

/**
 * 開始日 startDate の告知で、お礼に使う「前の週の取り組み」を返す。
 * startDate より前で一番新しい取り組み（14 日以内）を使う。なければ null。
 */
export function previousInitiative(notes: WeeklyNotes, startDate: string): { date: string; text: string } | null {
  const start = toUtc(startDate);
  const candidates = Object.entries(notes)
    .filter(([date, note]) => {
      const days = (start - toUtc(date)) / DAY;
      return days > 0 && days <= MAX_DAYS_BACK && (note.initiative ?? "").trim() !== "";
    })
    .sort(([a], [b]) => b.localeCompare(a));
  if (candidates.length === 0) return null;
  const [date, note] = candidates[0];
  return { date, text: note.initiative!.trim() };
}

/** 開始日 startDate の告知に入れるお礼の内容。手で書き換えた文があればそれ、なければ前の週の取り組み */
export function thanksFor(notes: WeeklyNotes, startDate: string): string {
  const own = notes[startDate]?.thanks;
  if (own !== undefined) return own;
  return previousInitiative(notes, startDate)?.text ?? "";
}

/** 開始日 startDate のメモを書き換えた新しいメモ全体を返す（空になった項目は消す） */
export function updateNote(notes: WeeklyNotes, startDate: string, patch: WeeklyNote): WeeklyNotes {
  const merged: WeeklyNote = { ...notes[startDate], ...patch };
  const cleaned: WeeklyNote = {};
  if (merged.initiative !== undefined && merged.initiative !== "") cleaned.initiative = merged.initiative;
  if (merged.thanks !== undefined) cleaned.thanks = merged.thanks;
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
      if (typeof v.initiative === "string") note.initiative = v.initiative;
      if (typeof v.thanks === "string") note.thanks = v.thanks;
      if (typeof v.closing === "string") note.closing = v.closing;
      if (Object.keys(note).length > 0) result[date] = note;
    }
    return result;
  } catch {
    return {};
  }
}
