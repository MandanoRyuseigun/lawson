"use client";

import type { SaleItem, SaleItemFields } from "@/lib/saleItem";
import { ItemForm } from "./ItemForm";

const SOURCE_LABEL: Record<SaleItem["source"], string> = {
  web: "公式サイト",
  photo: "写真",
  manual: "手入力",
};

type Props = {
  item: SaleItem;
  editing: boolean;
  onToggleSelected: () => void;
  onToggleImportant: () => void;
  onStartEdit: () => void;
  onSave: (fields: SaleItemFields) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
};

export function ItemCard(props: Props) {
  const { item, editing } = props;

  if (editing) {
    return (
      <li className="item">
        <ItemForm initial={item} submitLabel="保存" onSubmit={props.onSave} onCancel={props.onCancelEdit} />
      </li>
    );
  }

  const classes = ["item", !item.selected && "is-off", item.selected && item.important && "is-important"]
    .filter(Boolean)
    .join(" ");
  const meta = [item.price, item.period, item.note && `※${item.note}`].filter(Boolean).join("\n");

  return (
    <li className={classes}>
      <p className="item-name">
        {item.name}
        <span className="item-source">{SOURCE_LABEL[item.source]}</span>
      </p>
      {meta && <p className="item-meta">{meta}</p>}
      <div className="btn-row">
        <button type="button" className="toggle" aria-pressed={item.selected} onClick={props.onToggleSelected}>
          {item.selected ? "✓ 載せる" : "載せない"}
        </button>
        <button
          type="button"
          className="toggle toggle-important"
          aria-pressed={item.important}
          onClick={props.onToggleImportant}
        >
          ⭐ 重要
        </button>
      </div>
      <div className="btn-row">
        <button type="button" onClick={props.onStartEdit}>
          編集
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => {
            if (window.confirm(`「${item.name}」を削除しますか？`)) props.onDelete();
          }}
        >
          削除
        </button>
      </div>
    </li>
  );
}
