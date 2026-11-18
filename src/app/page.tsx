"use client";

import { useEffect, useMemo, useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { ItemForm } from "@/components/ItemForm";
import { NoticeEditor } from "@/components/NoticeEditor";
import { OcrPicker } from "@/components/OcrPicker";
import { PhotoImport } from "@/components/PhotoImport";
import { parseOcrText, splitOcrLines } from "@/lib/parseOcrText";
import type { FFProduct } from "@/lib/lawsonFF";
import { formatIsoDate, type WebSale } from "@/lib/lawsonSale";
import {
  FF_PREFIX,
  ffEntries,
  mergeWebEntries,
  SALE_PREFIX,
  saleEntries,
  TOP_PREFIX,
  topEntries,
  type MergeResult,
} from "@/lib/mergeWebEntries";
import type { TopBanner } from "@/lib/lawsonTop";
import { findDuplicates } from "@/lib/duplicates";
import { generateNotice } from "@/lib/notice";
import { groupFF } from "@/lib/newRelease";
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
  loadWeather,
  loadWeeklyNotes,
  saveFetchedAt,
  saveItems,
  saveWeather,
  type StoredWeather,
  saveWeeklyNotes,
} from "@/lib/storage";
import {
  thanksFor,
  updateNote,
  type WeeklyNote,
  type WeeklyNotes,
} from "@/lib/weeklyNotes";
import { getTargetTuesday, toIsoDate } from "@/lib/targetTuesday";
import { closingFromWeather, summarizeRecentWeather, type DailyWeather } from "@/lib/weather";

type Draft = { fields: SaleItemFields; source: "photo" | "manual"; key: number };
type SalesResponse = { sales?: WebSale[]; error?: string };
type TopResponse = { banners?: TopBanner[]; error?: string };
type WeatherResponse = { days?: DailyWeather[]; error?: string };
type FFResponse = { products?: FFProduct[]; failed?: string[]; releaseDatesUnavailable?: boolean; error?: string };

/** API から JSON を受け取る。通信に失敗したら error だけを持つ結果にする */
async function getJson<T extends { error?: string }>(url: string): Promise<T> {
  try {
    return (await (await fetch(url, { cache: "no-store" })).json()) as T;
  } catch {
    return { error: "公式サイトに接続できませんでした。" } as T;
  }
}
type Status = { kind: "idle" | "loading" | "done" | "error"; message: string };

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
  // 写真から読み取った行（ピックアップ中）と、追加したときのお知らせ
  const [ocrLines, setOcrLines] = useState<string[] | null>(null);
  const [addedMessage, setAddedMessage] = useState("");
  const [weeklyNotes, setWeeklyNotes] = useState<WeeklyNotes>({});
  const [weather, setWeather] = useState<StoredWeather | null>(null);
  const [noticeText, setNoticeText] = useState("");

  useEffect(() => {
    const target = getTargetTuesday();
    setTargetDate(toIsoDate(target));
    setSelectedDate(toIsoDate(target));
    setItems(loadItems());
    setFetchedAt(loadFetchedAt());
    setWeeklyNotes(loadWeeklyNotes());
    setWeather(loadWeather());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveItems(items);
  }, [items, loaded]);

  useEffect(() => {
    if (loaded) saveWeeklyNotes(weeklyNotes);
  }, [weeklyNotes, loaded]);

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
  const topItems = otherItems.filter((i) => i.id.startsWith(TOP_PREFIX));
  const restItems = otherItems.filter((i) => !i.id.startsWith(TOP_PREFIX));
  const visibleSaleCount = otherItems.filter((i) => i.id.startsWith(SALE_PREFIX)).length;
  const selectedMain = mainItems.filter((i) => i.selected).length;
  const selectedOther = otherItems.filter((i) => i.selected).length;
  const selectedLabel = selectedDate ? formatIsoDate(selectedDate) : "…";
  // 写真・手入力の項目と公式サイトの項目の重複（両方とも「載せる」のもの）
  const duplicates = findDuplicates(visibleItems);
  const duplicateByItem = new Map(duplicates.map((d) => [d.itemId, d]));
  const busy = status.kind === "loading";

  // 週ごとのメモ（お礼する取り組み・結びの挨拶の書き換え）
  const weekNote = selectedDate ? weeklyNotes[selectedDate] : undefined;
  const thanks = selectedDate ? thanksFor(weeklyNotes, selectedDate) : "";
  // 結びの挨拶: ここ数日の天気（なければ季節の例文）から自動で作り、その週だけ書き換えられる
  const closingMonth = selectedDate ? Number(selectedDate.slice(5, 7)) : new Date().getMonth() + 1;
  const autoClosing = closingFromWeather(weather?.days ?? [], closingMonth);
  const closingEdited = weekNote?.closing !== undefined;
  const closing = weekNote?.closing ?? autoClosing.text;
  const weatherSummary = summarizeRecentWeather(weather?.days ?? []);
  const updateWeekNote = (patch: WeeklyNote) => {
    if (selectedDate) setWeeklyNotes((prev) => updateNote(prev, selectedDate, patch));
  };

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

    const [salesRes, ffRes, topRes, weatherRes] = await Promise.all([
      getJson<SalesResponse>("/api/sales"),
      getJson<FFResponse>("/api/ff"),
      getJson<TopResponse>("/api/top"),
      getJson<WeatherResponse>("/api/weather"),
    ]);

    let next = items;
    const messages: string[] = [];
    const errors: string[] = [];

    if (ffRes.products) {
      const r = mergeWebEntries(next, ffEntries(ffRes.products), FF_PREFIX);
      next = r.items;
      messages.push(summarize("FF", r));
      if (ffRes.failed && ffRes.failed.length > 0) errors.push("FF の一部のカテゴリを取得できませんでした。");
      if (ffRes.releaseDatesUnavailable) errors.push("新商品の発売日を確認できませんでした。");
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

    // トップページの告知は最後に反映し、その他欄の先頭に並べる
    if (topRes.banners) {
      const r = mergeWebEntries(next, topEntries(topRes.banners), TOP_PREFIX);
      next = r.items;
      messages.push(summarize("トップページ", r));
    } else {
      errors.push(`トップページ: ${topRes.error ?? "取得に失敗しました。"}`);
    }

    // 天気は結びの挨拶に使うだけなので、取れなくても季節の例文で続ける
    if (weatherRes.days && weatherRes.days.length > 0) {
      const stored = { fetchedAt: new Date().toISOString(), days: weatherRes.days };
      setWeather(stored);
      saveWeather(stored);
    } else {
      errors.push(weatherRes.error ?? "天気を取得できませんでした（結びは季節の例文を使います）。");
    }

    setItems(next);
    if (ffRes.products || salesRes.sales || topRes.banners) {
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
            startDate={selectedDate}
            duplicate={(() => {
              const d = duplicateByItem.get(item.id);
              if (!d) return undefined;
              return {
                webItemName: d.webItemName,
                onDropThis: () => updateItem(item.id, { selected: false }),
                onDropOther: () => updateItem(d.webItemId, { selected: false }),
              };
            })()}
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

  /** FF を新商品の週ごとに表示する。定番は選択中・新着のものだけ表示し、残りは折りたたむ */
  function renderFFGroups() {
    const startDate = selectedDate ?? "";
    const webFF = mainItems.filter((i) => i.category);
    const { week1, week2, unconfirmed, regular } = groupFF(webFF, startDate);
    const manual = mainItems.filter((i) => !i.category);
    const regularExpanded = expandedGroups.regular ?? false;
    const regularShown = regularExpanded ? regular : regular.filter((i) => i.selected || i.webStatus === "new");

    const groups = [
      { key: "week1", label: "🆕 新商品（1週目）", list: week1, hint: "" },
      { key: "week2", label: "🆕 新商品（2週目）", list: week2, hint: "告知文では「新発売（2週目）」と載ります。" },
      {
        key: "unconfirmed",
        label: "❓ 発売日を確認できない新しい掲載",
        list: unconfirmed,
        hint: "公式サイトの新商品一覧に載っていない商品です（これから発売の可能性があります）。新発売なら「🆕 新発売」を押してください。",
      },
      { key: "manual", label: "✏️ 手入力・写真など", list: manual, hint: "" },
    ].filter((g) => g.list.length > 0);

    if (webFF.length === 0 && manual.length === 0) {
      return <p className="muted">まだ FF の情報がありません。「更新」を押すと公式サイトから取り込みます。</p>;
    }

    return (
      <>
        {groups.map((group) => (
          <div key={group.key}>
            <h3 className="group-title">
              <span>{group.label}</span>
              <span className="muted">{group.list.filter((i) => i.selected).length} 件選択</span>
            </h3>
            {group.hint && <p className="muted">{group.hint}</p>}
            {renderCards(group.list)}
          </div>
        ))}
        {webFF.length > 0 && week1.length + week2.length === 0 && (
          <p className="notice-box">{selectedLabel}開始の週に当たる FF の新商品は、公式サイトの新商品一覧にありません。</p>
        )}
        {regular.length > 0 && (
          <div>
            <h3 className="group-title">
              <span>📦 定番 FF</span>
              <span className="muted">{regular.filter((i) => i.selected).length} 件選択</span>
            </h3>
            {regularShown.length > 0 && renderCards(regularShown)}
            <button
              type="button"
              className="link-button"
              onClick={() => setExpandedGroups((prev) => ({ ...prev, regular: !regularExpanded }))}
            >
              {regularExpanded ? "選択中のものだけ表示" : `定番 FF を表示（${regular.length} 件）`}
            </button>
          </div>
        )}
      </>
    );
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
          {selectedMain} 件を載せます。新商品は公式サイトの新商品一覧の発売日で判定し、2 週目まで「新発売」と載せます。
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
        <h2>② トップページ・セールなど（その他欄）</h2>
        <p className="muted">
          {otherItems.length} 件中 {selectedOther} 件を載せます
        </p>

        {topItems.length > 0 && (
          <div>
            <h3 className="group-title">
              <span>🏠 トップページの告知</span>
              <span className="muted">{topItems.filter((i) => i.selected).length} 件選択</span>
            </h3>
            <p className="muted">
              ローソンが今いちばん推している情報です。最初から「載せる」にしています。名前が長いときは「編集」で短くしてください（更新しても編集した名前のまま残ります）。
            </p>
            {renderCards(topItems)}
          </div>
        )}

        <h3 className="group-title">
          <span>🏷️ セール・その他</span>
          <span className="muted">{restItems.filter((i) => i.selected).length} 件選択</span>
        </h3>
        {visibleSaleCount === 0 && (
          <p className="notice-box">
            {selectedLabel}開始のセールは、公式サイトにまだ載っていません。社内資料の写真や手入力で追加してください。
          </p>
        )}
        {detailStatus && <p className="muted">{detailStatus}</p>}
        {restItems.length > 0 && renderCards(restItems)}
      </section>

      <section className="section">
        <h2>③ 足りない情報を追加</h2>
        <p className="muted">{selectedLabel}開始の項目として追加します。</p>
        {addedMessage && <p className="status-ok">{addedMessage}</p>}
        {ocrLines ? (
          <OcrPicker
            key={ocrLines.join("\n")}
            lines={ocrLines}
            onAddEach={(lines, section) => {
              const added = lines.map((name) => ({
                ...createSaleItem({ ...emptyFields, name, section }, "photo"),
                startDate: selectedDate ?? undefined,
              }));
              setItems((prev) => [...prev, ...added]);
              setOcrLines(null);
              setAddedMessage(
                `${added.length} 件を追加しました（${section === "main" ? "①" : "②"}の欄にあります。必要なら「編集」で直してください）。`,
              );
            }}
            onCombine={(lines, section) => {
              // 選んだ行から商品名・価格・期間を振り分けて、入力欄で確認してから追加する
              setDraft({ fields: { ...parseOcrText(lines.join("\n")), section }, source: "photo", key: Date.now() });
              setOcrLines(null);
            }}
            onCancel={() => setOcrLines(null)}
          />
        ) : draft ? (
          <>
            {draft.source === "photo" && <p className="muted">選んだ行から入力欄に振り分けました。間違いがないか確認してください。</p>}
            <ItemForm
              key={draft.key}
              initial={draft.fields}
              submitLabel="追加する"
              onSubmit={(fields) => {
                const item = createSaleItem(fields, draft.source);
                setItems((prev) => [...prev, { ...item, startDate: selectedDate ?? undefined }]);
                setDraft(null);
                setAddedMessage(`「${item.name}」を追加しました。`);
              }}
              onCancel={() => setDraft(null)}
            />
          </>
        ) : (
          <div className="btn-row" style={{ flexDirection: "column" }}>
            <PhotoImport
              onResult={(rawText) => {
                setAddedMessage("");
                setOcrLines(splitOcrLines(rawText));
              }}
            />
            <button
              type="button"
              onClick={() => {
                setAddedMessage("");
                setDraft({ fields: emptyFields, source: "manual", key: Date.now() });
              }}
            >
              ✏️ 手入力で追加
            </button>
          </div>
        )}
      </section>

      <section className="section">
        <h2>④ 告知文を作る</h2>
        <label>
          🙇 先週の取り組みへのお礼
          <input
            type="text"
            value={thanks}
            onChange={(e) => updateWeekNote({ thanks: e.target.value })}
            placeholder="例: からあげクンの拡販"
          />
        </label>
        <p className="muted">→「今週も{thanks.trim() || "〇〇"}ありがとうございました🙇‍♂️」</p>
        <label>
          🌤️ 結びの挨拶
          <textarea rows={3} value={closing} onChange={(e) => updateWeekNote({ closing: e.target.value })} />
        </label>
        <p className="muted">
          {closingEdited
            ? "この週の分を書き換えています。"
            : weatherSummary
              ? `高松のここ数日（${weatherSummary}）から自動で選んでいます（${autoClosing.reason}）。`
              : "天気をまだ取得していないので、季節の例文を入れています。「更新」を押すと、ここ数日の天気から選び直します。"}
          {weatherSummary && (
            <>
              <br />
              出典：気象庁ホームページ（高松の観測データ）
            </>
          )}
        </p>
        {closingEdited && (
          <button type="button" className="link-button" onClick={() => updateWeekNote({ closing: undefined })}>
            天気から自動で作った文に戻す
          </button>
        )}
        {duplicates.length > 0 && (
          <p className="notice-box">
            ⚠️ 写真・手入力の項目のうち {duplicates.length} 件が、公式サイトの項目と重複しているかもしれません。①②の「⚠️」の付いた項目で、どちらか一方を外してください。
          </p>
        )}
        <NoticeEditor
          text={noticeText}
          onChange={setNoticeText}
          onGenerate={() =>
            setNoticeText(
              generateNotice(visibleItems, {
                startDate: selectedDate ?? "",
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
