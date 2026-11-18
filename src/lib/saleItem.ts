/** 情報の出どころ */
export type SaleItemSource = "web" | "photo" | "manual";

/** セール項目 1 件 */
export type SaleItem = {
  id: string;
  /** 商品名・キャンペーン名 */
  name: string;
  /** 価格や割引内容（例: 「100円引き」「税込198円」） */
  price: string;
  /** 期間（例: 「11/24(火)〜11/30(月)」） */
  period: string;
  /** 補足（例: 「なくなり次第終了」） */
  note: string;
  source: SaleItemSource;
  /** 告知に載せるか */
  selected: boolean;
  /** 重要項目として先頭に載せるか */
  important: boolean;
};

/** 入力欄で扱う項目の中身 */
export type SaleItemFields = Pick<SaleItem, "name" | "price" | "period" | "note">;

export const emptyFields: SaleItemFields = { name: "", price: "", period: "", note: "" };

export function createSaleItem(fields: SaleItemFields, source: SaleItemSource): SaleItem {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: fields.name.trim(),
    price: fields.price.trim(),
    period: fields.period.trim(),
    note: fields.note.trim(),
    source,
    selected: true,
    important: false,
  };
}
