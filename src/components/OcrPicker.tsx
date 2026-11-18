"use client";

import { useState } from "react";
import type { NoticeSection } from "@/lib/saleItem";

type Props = {
  /** 読み取った行（補正済み） */
  lines: string[];
  /** 選んだ行を 1 行ずつ項目として追加する */
  onAddEach: (lines: string[], section: NoticeSection) => void;
  /** 選んだ行を 1 つの項目にまとめる（入力欄で確認してから追加） */
  onCombine: (lines: string[], section: NoticeSection) => void;
  onCancel: () => void;
};

const SECTION_OPTIONS: { value: NoticeSection; label: string }[] = [
  { value: "main", label: "メイン（FF など）" },
  { value: "other", label: "その他" },
];

/** 写真から読み取った文字を行ごとに表示し、必要な行を選んで直してから追加する */
export function OcrPicker({ lines, onAddEach, onCombine, onCancel }: Props) {
  const [texts, setTexts] = useState(lines);
  const [selected, setSelected] = useState<boolean[]>(() => lines.map(() => false));
  const [section, setSection] = useState<NoticeSection>("other");

  const picked = texts.filter((text, i) => selected[i] && text.trim() !== "").map((t) => t.trim());
  const allSelected = selected.length > 0 && selected.every(Boolean);

  if (lines.length === 0) {
    return (
      <div>
        <p className="status-error">文字を読み取れませんでした。明るい場所で、文字が大きく写るように撮り直してください。</p>
        <button type="button" className="btn-block" onClick={onCancel}>
          閉じる
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="muted">
        読み取った文字です（{lines.length} 行）。必要な行をタップして選び、間違いはその場で直してください。
      </p>
      <button type="button" className="link-button" onClick={() => setSelected(lines.map(() => !allSelected))}>
        {allSelected ? "すべて外す" : "すべて選ぶ"}
      </button>

      <ul className="ocr-lines">
        {texts.map((text, i) => (
          <li key={i} className={selected[i] ? "is-picked" : undefined}>
            <button
              type="button"
              className="ocr-check"
              aria-pressed={selected[i]}
              aria-label={`${i + 1} 行目を${selected[i] ? "外す" : "選ぶ"}`}
              onClick={() => setSelected((prev) => prev.map((v, j) => (j === i ? !v : v)))}
            >
              {selected[i] ? "✓" : ""}
            </button>
            <input
              type="text"
              value={text}
              aria-label={`${i + 1} 行目の文字`}
              onChange={(e) => {
                const value = e.target.value;
                setTexts((prev) => prev.map((t, j) => (j === i ? value : t)));
                // 直した行は使うはずなので選んでおく
                setSelected((prev) => prev.map((v, j) => (j === i ? true : v)));
              }}
            />
          </li>
        ))}
      </ul>

      <div className="field-group" role="group" aria-label="追加する欄">
        <span className="field-label">追加する欄</span>
        <div className="btn-row">
          {SECTION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="toggle"
              aria-pressed={section === option.value}
              onClick={() => setSection(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="btn-row" style={{ flexDirection: "column" }}>
        <button
          type="button"
          className="btn-primary"
          disabled={picked.length === 0}
          onClick={() => onAddEach(picked, section)}
        >
          選んだ {picked.length} 行を 1 行ずつ追加
        </button>
        <button type="button" disabled={picked.length === 0} onClick={() => onCombine(picked, section)}>
          選んだ行を 1 つの項目にまとめる
        </button>
        <button type="button" onClick={onCancel}>
          やめる
        </button>
      </div>
    </div>
  );
}
