"use client";

import { useEffect, useMemo, useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { ItemForm } from "@/components/ItemForm";
import { NoticeEditor } from "@/components/NoticeEditor";
import { PhotoImport } from "@/components/PhotoImport";
import { FF_CATEGORIES, type FFProduct } from "@/lib/lawsonFF";
import { formatIsoDate, type WebSale } from "@/lib/lawsonSale";
import { FF_PREFIX, ffEntries, mergeWebEntries, SALE_PREFIX, saleEntries, type MergeResult } from "@/lib/mergeWebEntries";
import { formatMonthDay, generateNotice, seasonalClosing } from "@/lib/notice";
import {
  applyFields,
  createSaleItem,
  emptyFields,
  sectionOf,
  type SaleItem,
  type SaleItemFields,
} from "@/lib/saleItem";
import {
  loadFetchedAt,
  loadItems,
  loadNoticeSettings,
  saveFetchedAt,
  saveItems,
  saveNoticeSettings,
} from "@/lib/storage";
import { getTargetTuesday, toIsoDate } from "@/lib/targetTuesday";

type Draft = { fields: SaleItemFields; source: "photo" | "manual"; key: number };
type SalesResponse = { sales?: WebSale[]; error?: string };
type FFResponse = { products?: FFProduct[]; failed?: string[]; error?: string };

/** API から JSON を受け取る。通信に失敗したら error だけを持つ結果にする */
async function getJson<T extends { error?: string }>(url: string): Promise<T> {
  try {
    return (await (await fetch(url, { cache: "no-store" })).json()) as T;
  } catch {
    return { error: "公式サイトに接続できませんでした。" } as T;
  }
}
type Status = { kind: "idle" | "loading" | "done" | "error"; message: string };

/** FF の各カテゴリで、最初に表示する件数（掲載の新しい順） */
const FF_PREVIEW = 5;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function summarize(label: string, r: MergeResult): string {
  if (r.isFirstFetch) return `${label} ${r.added} 件`;
  const parts = [];
  if (r.added > 0) parts.push(`新着 ${r.added}`);
  if (r.changed > 0) parts.push(`変更 ${r.changed}`);
  if (r.removed > 0) parts.push(`終了 ${r.removed}`);
  return `${label}${parts.length > 0 ? `（${parts.join("・")}）` : "（変更なし）"}`;
}

/** 開始日 date のセールのうち、対象商品をまだ取得していないものの番号 */
function missingDetailIds(items: SaleItem[], date: string): string[] {
  return items
    .filter((i) => i.source === "web" && i.id.startsWith(SALE_PREFIX) && i.startDate === date && !i.targets)
    .map((i) => i.id.slice(SALE_PREFIX.length));
}

export default function Home() {
  // 日付は端末（スマホ）の時刻で計算する。ビルド時の日付で固定されないよう、表示後に算出する
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [detailStatus, setDetailStatus] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [thanks, setThanks] = useState("");
  const [closing, setClosing] = useState("");
  const [closingMonth, setClosingMonth] = useState(0);
  const [noticeText, setNoticeText] = useState("");

  useEffect(() => {
    const target = getTargetTuesday();
    const month = target.getMonth() + 1;
    const settings = loadNoticeSettings();
    setTargetDate(toIsoDate(target));
    setSelectedDate(toIsoDate(target));
    setItems(loadItems());
    setFetchedAt(loadFetchedAt());
    setThanks(settings?.thanks ?? "");
    // 結びは月が変わったら季節の例文に戻す
    setClosing(settings && settings.closingMonth === month ? settings.closing : seasonalClosing(month));
    setClosingMonth(month);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveItems(items);
  }, [items, loaded]);

  useEffect(() => {
    if (loaded) saveNoticeSettings({ thanks, closing, closingMonth });
  }, [thanks, closing, closingMonth, loaded]);

  // 開始日の切り替え候補: 次の火曜日 ＋ 取り込んだセールの開始日（新しい順）
  const dateOptions = useMemo(() => {
    const dates = new Set<string>();
    if (targetDate) dates.add(targetDate);
    items.forEach((i) => i.startDate && dates.add(i.startDate));
    return [...dates].sort().reverse();
  }, [items, targetDate]);

  // 選んだ開始日の項目（FF など開始日のない項目は常に表示）
  const visibleItems = items.filter((i) => !i.startDate || i.startDate === selectedDate);
  const mainItems = visibleItems.filter((i) => sectionOf(i) === "main");
  const otherItems = visibleItems.filter((i) => sectionOf(i) === "other");
  const visibleSaleCount = otherItems.filter((i) => i.source === "web").length;
  const selectedMain = mainItems.filter((i) => i.selected).length;
  const selectedOther = otherItems.filter((i) => i.selected).length;
  const selectedLabel = selectedDate ? formatIsoDate(selectedDate) : "…";
  const busy = status.kind === "loading";

  const updateItem = (id: string, patch: Partial<SaleItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  /** 開始日 date のセールの対象商品を、まだ取得していない分だけ取得する */
  async function fetchDetails(date: string, current: SaleItem[]) {
    const ids = missingDetailIds(current, date);
    if (ids.length === 0) return;
    setDetailStatus(`対象商品を取得中…（${ids.length} 件）`);
    const details: Record<string, string[]> = {};
    try {
      for (let i = 0; i < ids.length; i += 30) {
        const res = await fetch(`/api/sale-details?ids=${ids.slice(i, i + 30).join(",")}`, { cache: "no-store" });
        const data = (await res.json()) as { details?: Record<string, string[]> };
        Object.assign(details, data.details ?? {});
      }
    } catch {
      // 取れた分だけ反映する
    }
    setItems((prev) =>
      prev.map((item) => {
        const targets = details[item.id.slice(SALE_PREFIX.length)];
        return item.id.startsWith(SALE_PREFIX) && targets ? { ...item, targets } : item;
      }),
    );
    const got = Object.keys(details).length;
    setDetailStatus(got === ids.length ? "" : `対象商品を取得できなかったセールが ${ids.length - got} 件あります。`);
  }

  async function refreshFromSite() {
    setStatus({ kind: "loading", message: "公式サイトから取得中…" });
    setDetailStatus("");

    const [salesRes, ffRes] = await Promise.all([
      getJson<SalesResponse>("/api/sales"),
      getJson<FFResponse>("/api/ff"),
    ]);

    let next = items;
    const messages: string[] = [];
    const errors: string[] = [];

    if (ffRes.products) {
      const r = mergeWebEntries(next, ffEntries(ffRes.products), FF_PREFIX);
      next = r.items;
      messages.push(summarize("FF", r));
      if (ffRes.failed && ffRes.failed.length > 0) errors.push("FF の一部のカテゴリを取得できませんでした。");
    } else {
      errors.push(`FF: ${ffRes.error ?? "取得に失敗しました。"}`);
    }

    if (salesRes.sales) {
      const r = mergeWebEntries(next, saleEntries(salesRes.sales), SALE_PREFIX);
      next = r.items;
      messages.push(summarize("セール", r));
    } else {
      errors.push(`セール: ${salesRes.error ?? "取得に失敗しました。"}`);
    }

    setItems(next);
    if (ffRes.products || salesRes.sales) {
      const now = new Date().toISOString();
      setFetchedAt(now);
      saveFetchedAt(now);
    }
    setStatus(
      errors.length > 0
        ? { kind: "error", message: [...messages, ...errors, "写真や手入力で追加することもできます。"].join(" ") }
        : { kind: "done", message: `更新しました：${messages.join("、")}` },
    );

    if (salesRes.sales && selectedDate) await fetchDetails(selectedDate, next);
  }

  function renderCards(list: SaleItem[]) {
    return (
      <ul className="item-list">
        {list.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            editing={editingId === item.id}
            onToggleSelected={() => updateItem(item.id, { selected: !item.selected })}
            onToggleImportant={() =>
              // 重要にしたら告知にも載せる
              updateItem(item.id, item.important ? { important: false } : { important: true, selected: true })
            }
            onToggleNewRelease={() =>
              updateItem(item.id, item.newRelease ? { newRelease: false } : { newRelease: true, selected: true })
            }
            onStartEdit={() => setEditingId(item.id)}
            onSave={(fields) => {
              setItems((prev) => prev.map((i) => (i.id === item.id ? applyFields(i, fields) : i)));
              setEditingId(null);
            }}
            onCancelEdit={() => setEditingId(null)}
            onDelete={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
          />
        ))}
      </ul>
    );
  }

  /** FF をカテゴリごとに表示する。新着・選択中のものは折りたたんでいても表示する */
  function renderFFGroups() {
    const groups = [
      ...FF_CATEGORIES.map((c) => ({
        key: c.key,
        label: `${c.emoji} ${c.label}`,
        list: mainItems.filter((i) => i.category === c.key),
      })),
      { key: "others", label: "✏️ 手入力・写真など", list: mainItems.filter((i) => !i.category) },
    ].filter((g) => g.list.length > 0);

    if (groups.length === 0) {
      return <p className="muted">まだ FF の情報がありません。「更新」を押すと公式サイトから取り込みます。</p>;
    }

    return groups.map((group) => {
      const expanded = expandedGroups[group.key] ?? false;
      const shown = expanded
        ? group.list
        : group.list.filter((item, index) => index < FF_PREVIEW || item.selected || item.webStatus === "new");
      const hidden = group.list.length - shown.length;
      return (
        <div key={group.key}>
          <h3 className="group-title">
            <span>{group.label}</span>
            <span className="muted">{group.list.filter((i) => i.selected).length} 件選択</span>
          </h3>
          {renderCards(shown)}
          {(hidden > 0 || expanded) && (
            <button
              type="button"
              className="link-button"
              onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.key]: !expanded }))}
            >
              {expanded ? "新しい順の上位だけ表示" : `ほか ${hidden} 件を表示`}
            </button>
          )}
        </div>
      );
    });
  }

  return (
    <main>
      <h1>セール告知メーカー</h1>
      <p className="subtitle">香川（中国・四国）のお店向け</p>

      <section className="section">
        <button type="button" className="btn-primary btn-block" onClick={refreshFromSite} disabled={busy || !loaded}>
          {busy ? "取得中…" : "🔄 公式サイトから最新情報に更新"}
        </button>
        <p className={status.kind === "error" ? "status-error" : "muted"}>
          {status.message || (fetchedAt ? `最終更新: ${formatDateTime(fetchedAt)}` : "まだ取得していません")}
        </p>

        <div className="date-tabs" role="group" aria-label="開始日">
          {dateOptions.map((date) => (
            <button
              key={date}
              type="button"
              aria-pressed={date === selectedDate}
              disabled={busy}
              onClick={() => {
                setSelectedDate(date);
                setEditingId(null);
                if (fetchedAt) void fetchDetails(date, items);
              }}
            >
              {formatIsoDate(date)}開始{date === targetDate ? "（次回）" : ""}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>① FF（メイン欄）</h2>
        <p className="muted">
          {selectedMain} 件を載せます。新発売のものは「🆕 新発売」を押してください（公式サイトに発売日がないため自動では付きません）。
        </p>
        {selectedMain > 0 && (
          <button
            type="button"
            className="link-button"
            onClick={() =>
              setItems((prev) =>
                prev.map((i) => (sectionOf(i) === "main" ? { ...i, selected: false, newRelease: false } : i)),
              )
            }
          >
            FF の選択と新発売の印をすべて外す
          </button>
        )}
        {renderFFGroups()}
      </section>

      <section className="section">
        <h2>② セールなど（その他欄）</h2>
        {visibleSaleCount === 0 && (
          <p className="notice-box">
            {selectedLabel}開始のセールは、公式サイトにまだ載っていません。社内資料の写真や手入力で追加してください。
          </p>
        )}
        {detailStatus && <p className="muted">{detailStatus}</p>}
        {otherItems.length > 0 && (
          <>
            <p className="muted">
              {otherItems.length} 件中 {selectedOther} 件を載せます
            </p>
            {renderCards(otherItems)}
          </>
        )}
      </section>

      <section className="section">
        <h2>③ 足りない情報を追加</h2>
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
        <h2>④ 告知文を作る</h2>
        <label>
          先週のメインの取り組み（お礼の一文に入ります）
          <input
            type="text"
            value={thanks}
            onChange={(e) => setThanks(e.target.value)}
            placeholder="例: からあげクンmilkコラボの拡販"
          />
        </label>
        <p className="muted">→「今週も{thanks.trim() || "〇〇"}ありがとうございました🙇‍♂️」</p>
        <label>
          結びの挨拶
          <input type="text" value={closing} onChange={(e) => setClosing(e.target.value)} />
        </label>
        <NoticeEditor
          text={noticeText}
          onChange={setNoticeText}
          onGenerate={() =>
            setNoticeText(
              generateNotice(visibleItems, {
                dateLabel: selectedDate ? formatMonthDay(selectedDate) : "",
                thanks,
                closing,
              }),
            )
          }
          canGenerate={selectedMain + selectedOther > 0 && selectedDate !== null}
        />
      </section>
    </main>
  );
}
