"use client";

import { useState } from "react";
import { formatIsoDate } from "@/lib/lawsonSale";
import { releaseWeek } from "@/lib/newRelease";
import { fieldsOf, sectionOf, type SaleItem, type SaleItemFields } from "@/lib/saleItem";
import { ItemForm } from "./ItemForm";

const SOURCE_LABEL: Record<SaleItem["source"], string> = {
  web: "公式サイト",
  photo: "写真",
  manual: "手入力",
};

/** 対象商品を最初に表示する行数 */
const TARGETS_PREVIEW = 3;

type Props = {
  item: SaleItem;
  /** 表示中の告知の開始日。新商品の何週目かの表示に使う */
  startDate: string | null;
  editing: boolean;
  onToggleSelected: () => void;
  onToggleImportant: () => void;
  onToggleNewRelease: () => void;
  onStartEdit: () => void;
  onSave: (fields: SaleItemFields) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
};

export function ItemCard(props: Props) {
  const { item, editing } = props;
  const [showAllTargets, setShowAllTargets] = useState(false);

  if (editing) {
    return (
      <li className="item">
        <ItemForm initial={fieldsOf(item)} submitLabel="保存" onSubmit={props.onSave} onCancel={props.onCancelEdit} />
      </li>
    );
  }

  const isMain = sectionOf(item) === "main";
  const week = props.startDate ? releaseWeek(item, props.startDate) : null;
  const classes = ["item", !item.selected && "is-off", item.selected && item.important && "is-important"]
    .filter(Boolean)
    .join(" ");
  const targets = item.targets ?? [];
  const visibleTargets = showAllTargets ? targets : targets.slice(0, TARGETS_PREVIEW);
  const extra = [
    item.price,
    item.note && `→${item.note}`,
    item.period,
    item.releaseDate && `発売日 ${formatIsoDate(item.releaseDate)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <li className={classes}>
      <p className="item-name">
        {item.webStatus === "new" && <span className="badge badge-new">新着</span>}
        {item.webStatus === "changed" && <span className="badge badge-changed">変更</span>}
        {week === 1 && <span className="badge badge-release">新発売</span>}
        {week === 2 && <span className="badge badge-release">新発売 2週目</span>}
        {item.emoji}
        {item.name}
        <span className="item-source">{SOURCE_LABEL[item.source]}</span>
      </p>
      {extra && <p className="item-meta">{extra}</p>}

      {targets.length > 0 && (
        <div className="targets">
          <ul>
            {visibleTargets.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          {targets.length > TARGETS_PREVIEW && (
            <button type="button" className="link-button" onClick={() => setShowAllTargets((v) => !v)}>
              {showAllTargets ? "閉じる" : `ほか ${targets.length - TARGETS_PREVIEW} 件を表示`}
            </button>
          )}
        </div>
      )}

      {item.url && (
        <a className="item-link" href={item.url} target="_blank" rel="noopener noreferrer">
          公式サイトで見る ↗
        </a>
      )}

      <div className="btn-row">
        <button type="button" className="toggle" aria-pressed={item.selected} onClick={props.onToggleSelected}>
          {item.selected ? "✓ 載せる" : "載せない"}
        </button>
        {/* 発売日が分かる商品は自動で判定するので、手動の印は発売日が分からない商品だけ */}
        {isMain && !item.releaseDate && (
          <button
            type="button"
            className="toggle toggle-release"
            aria-pressed={item.newRelease ?? false}
            onClick={props.onToggleNewRelease}
          >
            🆕 新発売
          </button>
        )}
        <button
          type="button"
          className="toggle toggle-important"
          aria-pressed={item.important}
          onClick={props.onToggleImportant}
        >
          ⭐ 重要
        </button>
      </div>
      <div className="btn-row btn-row-sub">
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
