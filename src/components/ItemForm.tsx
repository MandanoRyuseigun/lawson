"use client";

import { useState } from "react";
import type { NoticeSection, SaleItemFields } from "@/lib/saleItem";

type Props = {
  initial: SaleItemFields;
  submitLabel: string;
  onSubmit: (fields: SaleItemFields) => void;
  onCancel?: () => void;
};

const SECTION_OPTIONS: { value: NoticeSection; label: string }[] = [
  { value: "main", label: "メイン（FF など）" },
  { value: "other", label: "その他" },
];

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
        <input type="text" value={fields.name} onChange={update("name")} placeholder="例: でからあげクン　夢のMIX味" />
      </label>

      <div className="field-group" role="group" aria-label="載せる欄">
        <span className="field-label">告知文で載せる欄</span>
        <div className="btn-row">
          {SECTION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="toggle"
              aria-pressed={fields.section === option.value}
              onClick={() => setFields((prev) => ({ ...prev, section: option.value }))}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label>
        頭に付ける絵文字
        <input type="text" value={fields.emoji} onChange={update("emoji")} placeholder="例: 🐔" />
      </label>
      <label>
        価格・ひとこと（名前の後ろに付きます）
        <input type="text" value={fields.price} onChange={update("price")} placeholder="例: 20円引き" />
      </label>
      <label>
        補足（「→」を付けて次の行に載ります）
        <input type="text" value={fields.note} onChange={update("note")} placeholder="例: 盛り過ぎチャレンジ開催" />
      </label>
      <label>
        期間（確認用・告知文には載りません）
        <input type="text" value={fields.period} onChange={update("period")} placeholder="例: 11/24(火)〜11/30(月)" />
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
