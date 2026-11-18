import { stripCategoryLabel } from "./parseOcrText";
import type { SaleItem } from "./saleItem";

/**
 * 比べるために名前をそろえる。
 * 全角・半角をそろえ、資料の頭書き（「中華まん:」「HOTFF:」など）・「新発売」・期間・絵文字・記号・空白を除く。
 */
export function normalizeForMatch(name: string): string {
  return stripCategoryLabel(name.normalize("NFKC")) // 「中華まん:」「常温FF:」のような頭書き
    .replace(/新発売(\(2週目\))?|新商品|発売/g, "")
    .replace(/\d{1,2}\/\d{1,2}(\([日月火水木金土]\))?\s*[-〜~ー]\s*(\d{1,2}\/)?\d{1,2}(\([日月火水木金土]\))?/g, "")
    .replace(/[^\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ーA-Za-z0-9]/gu, "")
    .toLowerCase();
}

/** a を b にするのに必要な、文字の追加・削除・置き換えの回数（編集距離） */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * 2 つの名前がどれだけ似ているか（0〜1）。
 * 片方がもう片方を含んでいれば 1。それ以外は編集距離から求める
 * （「特選／特撰」のような 1 文字の読み間違いは高く、「レッド／レギュラー」のような味違いは低く出る）。
 */
export function nameSimilarity(a: string, b: string): number {
  const x = normalizeForMatch(a);
  const y = normalizeForMatch(b);
  if (x.length < 2 || y.length < 2) return 0;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length >= 4 && long.includes(short)) return 1;
  return 1 - editDistance(x, y) / long.length;
}

/** これ以上似ていれば重複とみなす */
export const DUPLICATE_THRESHOLD = 0.75;

export type Duplicate = {
  /** 写真・手入力の項目 */
  itemId: string;
  /** 重複している公式サイトの項目 */
  webItemId: string;
  webItemName: string;
};

/**
 * 写真・手入力で追加した項目のうち、公式サイトから取り込んだ項目と重複していそうなものを探す。
 * 告知文で実際に重なるもの（両方とも「載せる」）だけを対象にし、一番似ている公式サイトの項目を返す。
 */
export function findDuplicates(items: SaleItem[]): Duplicate[] {
  const selected = items.filter((i) => i.selected);
  const web = selected.filter((i) => i.source === "web");
  const result: Duplicate[] = [];
  for (const item of selected.filter((i) => i.source !== "web")) {
    let best: { item: SaleItem; score: number } | null = null;
    for (const candidate of web) {
      const score = nameSimilarity(item.name, candidate.name);
      if (score >= DUPLICATE_THRESHOLD && (!best || score > best.score)) best = { item: candidate, score };
    }
    if (best) result.push({ itemId: item.id, webItemId: best.item.id, webItemName: best.item.name });
  }
  return result;
}
