import type { FFCategoryKey } from "./lawsonFF";

/** 情報の出どころ */
export type SaleItemSource = "web" | "photo" | "manual";

/** 告知文のどの欄に載せるか。main = 「〇〇からのお知らせです。」直下（FF）、other = 「その他」 */
export type NoticeSection = "main" | "other";

/** セール・商品 1 件 */
export type SaleItem = {
  id: string;
  /** 商品名・キャンペーン名 */
  name: string;
  /** 価格や割引内容、ひとこと（例: 「100円引き」） */
  price: string;
  /** 期間（例: 「11/24(火)〜11/30(月)」）。告知文には載せず、確認用に表示する */
  period: string;
  /** 補足。告知文では「→」を付けて次の行に載せる */
  note: string;
  source: SaleItemSource;
  /** 告知に載せるか */
  selected: boolean;
  /** 重要項目として欄の先頭に載せるか */
  important: boolean;
  /** 載せる欄（未設定は「その他」） */
  section?: NoticeSection;
  /** 告知文で頭に付ける絵文字 */
  emoji?: string;
  /** 「新発売」を付けるか（発売日が分からない項目で手動で付ける） */
  newRelease?: boolean;
  /** 発売日（YYYY-MM-DD）。公式サイトの新商品一覧で確認できた FF のみ */
  releaseDate?: string;
  /** FF のカテゴリ。公式サイトから取り込んだ FF のみ */
  category?: FFCategoryKey;
  /** 対象商品や標準価格など、確認用の情報（告知文には載せない） */
  targets?: string[];
  /** 開始日（YYYY-MM-DD）。この日の分として表示する。FF は未設定（週をまたいで表示） */
  startDate?: string;
  /** 公式サイトの詳細ページ */
  url?: string;
  /** 公式サイトでの名前。画面で名前を編集しても、更新時の変更の判定に使う */
  siteName?: string;
  /** 直近の「更新」で増えた・変わった項目の印 */
  webStatus?: "new" | "changed";
};

/** 入力欄で扱う項目の中身 */
export type SaleItemFields = {
  name: string;
  price: string;
  period: string;
  note: string;
  emoji: string;
  section: NoticeSection;
};

export const emptyFields: SaleItemFields = {
  name: "",
  price: "",
  period: "",
  note: "",
  emoji: "",
  section: "other",
};

export function fieldsOf(item: SaleItem): SaleItemFields {
  return {
    name: item.name,
    price: item.price,
    period: item.period,
    note: item.note,
    emoji: item.emoji ?? "",
    section: sectionOf(item),
  };
}

/** 入力欄の内容を項目に反映する（前後の空白は除く） */
export function applyFields(item: SaleItem, fields: SaleItemFields): SaleItem {
  return {
    ...item,
    name: fields.name.trim(),
    price: fields.price.trim(),
    period: fields.period.trim(),
    note: fields.note.trim(),
    emoji: fields.emoji.trim() || undefined,
    section: fields.section,
  };
}

export function sectionOf(item: SaleItem): NoticeSection {
  return item.section ?? "other";
}

export function createSaleItem(fields: SaleItemFields, source: SaleItemSource): SaleItem {
  const base: SaleItem = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    price: "",
    period: "",
    note: "",
    source,
    selected: true,
    important: false,
  };
  return applyFields(base, fields);
}
