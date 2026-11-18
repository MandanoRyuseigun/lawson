"use client";

import { useState } from "react";
import type { SaleItemFields } from "@/lib/saleItem";

type Props = {
  initial: SaleItemFields;
  submitLabel: string;
  onSubmit: (fields: SaleItemFields) => void;
  onCancel?: () => void;
};

/** 項目の追加・編集フォーム */
export function ItemForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [fields, setFields] = useState<SaleItemFields>(initial);

  const update = (key: keyof SaleItemFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (fields.name.trim() === "") return;
        onSubmit(fields);
      }}
    >
      <label>
        商品名・キャンペーン名（必須）
        <input type="text" value={fields.name} onChange={update("name")} placeholder="例: からあげクン" />
      </label>
      <label>
        価格・割引
        <input type="text" value={fields.price} onChange={update("price")} placeholder="例: 20円引き" />
      </label>
      <label>
        期間
        <input type="text" value={fields.period} onChange={update("period")} placeholder="例: 11/24(火)〜11/30(月)" />
      </label>
      <label>
        補足
        <input type="text" value={fields.note} onChange={update("note")} placeholder="例: なくなり次第終了" />
      </label>
      <div className="btn-row">
        {onCancel && (
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={fields.name.trim() === ""}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
