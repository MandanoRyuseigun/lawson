"use client";

import { useEffect, useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { ItemForm } from "@/components/ItemForm";
import { NoticeEditor } from "@/components/NoticeEditor";
import { PhotoImport } from "@/components/PhotoImport";
import { generateNotice } from "@/lib/notice";
import { createSaleItem, emptyFields, type SaleItem, type SaleItemFields } from "@/lib/saleItem";
import { loadItems, saveItems } from "@/lib/storage";
import { formatShortDate, getTargetTuesday } from "@/lib/targetTuesday";

type Draft = { fields: SaleItemFields; source: "photo" | "manual"; key: number };

export default function Home() {
  // 日付は端末（スマホ）の時刻で計算する。ビルド時の日付で固定されないよう、表示後に算出する
  const [targetLabel, setTargetLabel] = useState<string | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [noticeText, setNoticeText] = useState("");

  useEffect(() => {
    setTargetLabel(formatShortDate(getTargetTuesday()));
    setItems(loadItems());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveItems(items);
  }, [items, loaded]);

  const updateItem = (id: string, patch: Partial<SaleItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const selectedCount = items.filter((item) => item.selected).length;

  return (
    <main>
      <h1>セール告知メーカー</h1>
      <p className="subtitle">対象: {targetLabel ?? "…"} スタートのセール</p>

      <section className="section">
        <h2>① セール項目を選ぶ</h2>
        <p className="muted">公式サイトからの自動取得は準備中です。今は写真か手入力で追加してください。</p>
        {items.length === 0 ? (
          <p className="muted">まだ項目がありません。</p>
        ) : (
          <>
            <p className="muted">
              {items.length} 件中 {selectedCount} 件を告知に載せます
            </p>
            <ul className="item-list">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  editing={editingId === item.id}
                  onToggleSelected={() => updateItem(item.id, { selected: !item.selected })}
                  onToggleImportant={() =>
                    // 重要にしたら告知にも載せる
                    updateItem(item.id, item.important ? { important: false } : { important: true, selected: true })
                  }
                  onStartEdit={() => setEditingId(item.id)}
                  onSave={(fields) => {
                    updateItem(item.id, {
                      name: fields.name.trim(),
                      price: fields.price.trim(),
                      period: fields.period.trim(),
                      note: fields.note.trim(),
                    });
                    setEditingId(null);
                  }}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                />
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="section">
        <h2>② 足りない情報を追加</h2>
        {draft ? (
          <>
            {draft.source === "photo" && <p className="muted">読み取り結果です。間違いがないか確認してください。</p>}
            <ItemForm
              key={draft.key}
              initial={draft.fields}
              submitLabel="追加する"
              onSubmit={(fields) => {
                setItems((prev) => [...prev, createSaleItem(fields, draft.source)]);
                setDraft(null);
              }}
              onCancel={() => setDraft(null)}
            />
          </>
        ) : (
          <div className="btn-row" style={{ flexDirection: "column" }}>
            <PhotoImport onResult={(fields) => setDraft({ fields, source: "photo", key: Date.now() })} />
            <button type="button" onClick={() => setDraft({ fields: emptyFields, source: "manual", key: Date.now() })}>
              ✏️ 手入力で追加
            </button>
          </div>
        )}
      </section>

      <section className="section">
        <h2>③ 告知文を作る</h2>
        <NoticeEditor
          text={noticeText}
          onChange={setNoticeText}
          onGenerate={() => setNoticeText(generateNotice(items, targetLabel ?? ""))}
          canGenerate={selectedCount > 0 && targetLabel !== null}
        />
      </section>
    </main>
  );
}
