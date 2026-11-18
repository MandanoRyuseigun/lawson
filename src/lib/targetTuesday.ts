/**
 * 告知の対象となる火曜日（セール開始日）を返す。
 * 当日が火曜日ならその日、それ以外は次に来る火曜日を返す。
 * 時刻は切り捨て、ローカル時刻の 0:00 にそろえる。
 */
export function getTargetTuesday(today: Date = new Date()): Date {
  const TUESDAY = 2;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysUntil = (TUESDAY - base.getDay() + 7) % 7;
  base.setDate(base.getDate() + daysUntil);
  return base;
}

/** 日付を「2026-11-24」の形式にする（ローカル時刻） */
export function toIsoDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** 日付を「11/24(火)」の形式で表示用に整える。 */
export function formatShortDate(date: Date): string {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}/${date.getDate()}(${weekdays[date.getDay()]})`;
}

/** "2026-11-24" の n 日後を同じ形で返す */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toIsoDate(new Date(y, m - 1, d + days));
}
