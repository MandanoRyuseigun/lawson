"use client";

import { useEffect, useMemo, useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { ItemForm } from "@/components/ItemForm";
import { NoticeEditor } from "@/components/NoticeEditor";
import { PhotoImport } from "@/components/PhotoImport";
import { formatIsoDate, type WebSale } from "@/lib/lawsonSale";
import { mergeWebSales } from "@/lib/mergeWebSales";
import { generateNotice } from "@/lib/notice";
import { createSaleItem, emptyFields, type SaleItem, type SaleItemFields } from "@/lib/saleItem";
import { loadFetchedAt, loadItems, saveFetchedAt, saveItems } from "@/lib/storage";
import { getTargetTuesday, toIsoDate } from "@/lib/targetTuesday";

type Draft = { fields: SaleItemFields; source: "photo" | "manual"; key: number };
type FetchState = { status: "idle" | "loading" | "done" | "error"; message: string };

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

export default function Home() {
  // 日付は端末（スマホ）の時刻で計算する。ビルド時の日付で固定されないよう、表示後に算出する
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle", message: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [noticeText, setNoticeText] = useState("");

  useEffect(() => {
    const target = toIsoDate(getTargetTuesday());
    setTargetDate(target);
    setSelectedDate(target);
    setItems(loadItems());
    setFetchedAt(loadFetchedAt());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveItems(items);
  }, [items, loaded]);

  // 開始日の切り替え候補: 次の火曜日 ＋ 取り込んだセールの開始日（新しい順）
  const dateOptions = useMemo(() => {
    const dates = new Set<string>();
    if (targetDate) dates.add(targetDate);
    items.forEach((i) => i.startDate && dates.add(i.startDate));
    return [...dates].sort().reverse();
  }, [items, targetDate]);

  // 選んだ開始日の項目だけを表示・告知の対象にする
  const visibleItems = items.filter((i) => !i.startDate || i.startDate === selectedDate);
  const visibleWebCount = visibleItems.filter((i) => i.source === "web").length;
  const selectedCount = visibleItems.filter((i) => i.selected).length;
  const selectedLabel = selectedDate ? formatIsoDate(selectedDate) : "…";

  const updateItem = (id: string, patch: Partial<SaleItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  async function refreshFromSite() {
    setFetchState({ status: "loading", message: "公式サイトから取得中…" });
    try {
      const res = await fetch("/api/sales", { cache: "no-store" });
      const data = (await res.json()) as { sales?: WebSale[]; fetchedAt?: string; error?: string };
      if (!res.ok || !data.sales || !data.fetchedAt) {
        throw new Error(data.error ?? "取得に失敗しました。");
      }
      const result = mergeWebSales(items, data.sales);
      setItems(result.items);
      setFetchedAt(data.fetchedAt);
      saveFetchedAt(data.fetchedAt);

      const parts = [];
      if (result.isFirstFetch) parts.push(`${result.added} 件を取り込みました`);
      else if (result.added > 0) parts.push(`新着 ${result.added} 件`);
      if (result.changed > 0) parts.push(`変更 ${result.changed} 件`);
      if (result.removed > 0) parts.push(`終了 ${result.removed} 件`);
      setFetchState({
        status: "done",
        message: parts.length > 0 ? `更新しました（${parts.join("、")}）` : "更新しました（変更はありません）",
      });
    } catch (e) {
      setFetchState({
        status: "error",
        message: `${e instanceof Error ? e.message : "取得に失敗しました。"} 写真や手入力で追加することもできます。`,
      });
    }
  }

  return (
    <main>
      <h1>セール告知メーカー</h1>
      <p className="subtitle">香川（中国・四国）のお店向け</p>

      <section className="section">
        <h2>① セール項目を選ぶ</h2>

        <button
          type="button"
          className="btn-primary btn-block"
          onClick={refreshFromSite}
          disabled={fetchState.status === "loading" || !loaded}
        >
          {fetchState.status === "loading" ? "取得中…" : "🔄 公式サイトから最新情報に更新"}
        </button>
        <p className={fetchState.status === "error" ? "status-error" : "muted"}>
          {fetchState.message || (fetchedAt ? `最終更新: ${formatDateTime(fetchedAt)}` : "まだ取得していません")}
        </p>

        <div className="date-tabs" role="group" aria-label="開始日">
          {dateOptions.map((date) => (
            <button
              key={date}
              type="button"
              aria-pressed={date === selectedDate}
              onClick={() => {
                setSelectedDate(date);
                setEditingId(null);
              }}
            >
              {formatIsoDate(date)}開始{date === targetDate ? "（次回）" : ""}
            </button>
          ))}
        </div>

        {visibleWebCount === 0 && (
          <p className="notice-box">
            {selectedLabel}開始のセールは、公式サイトにまだ載っていません。社内資料の写真や手入力で追加してください。
          </p>
        )}

        {visibleItems.length > 0 && (
          <>
            <p className="muted">
              {visibleItems.length} 件中 {selectedCount} 件を告知に載せます
            </p>
            <ul className="item-list">
              {visibleItems.map((item) => (
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
        <p className="muted">{selectedLabel}開始の項目として追加します。</p>
        {draft ? (
          <>
            {draft.source === "photo" && <p className="muted">読み取り結果です。間違いがないか確認してください。</p>}
            <ItemForm
              key={draft.key}
              initial={draft.fields}
              submitLabel="追加する"
              onSubmit={(fields) => {
                const item = createSaleItem(fields, draft.source);
                setItems((prev) => [...prev, { ...item, startDate: selectedDate ?? undefined }]);
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
          onGenerate={() => setNoticeText(generateNotice(visibleItems, selectedLabel))}
          canGenerate={selectedCount > 0 && selectedDate !== null}
        />
      </section>
    </main>
  );
}
