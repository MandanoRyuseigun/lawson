"use client";

import { useState } from "react";

type Props = {
  text: string;
  onChange: (text: string) => void;
  onGenerate: () => void;
  canGenerate: boolean;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 古いブラウザ向けの予備手段
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/** 告知文の生成・編集・コピー */
export function NoticeEditor({ text, onChange, onGenerate, canGenerate }: Props) {
  const [copyStatus, setCopyStatus] = useState<"" | "ok" | "error">("");

  return (
    <div>
      <button
        type="button"
        className="btn-primary btn-block"
        disabled={!canGenerate}
        onClick={() => {
          if (text && !window.confirm("今の文章を作り直しますか？（編集した内容は消えます）")) return;
          onGenerate();
          setCopyStatus("");
        }}
      >
        ✍️ 告知文を生成
      </button>

      {text && (
        <>
          <label style={{ marginTop: 12 }}>
            文章を確認・修正できます
            <textarea
              className="notice"
              value={text}
              onChange={(e) => {
                onChange(e.target.value);
                setCopyStatus("");
              }}
            />
          </label>
          <button
            type="button"
            className="btn-primary btn-block"
            onClick={async () => setCopyStatus((await copyText(text)) ? "ok" : "error")}
          >
            📋 コピーする
          </button>
          {copyStatus === "ok" && <p className="status-ok">コピーしました！LINE に貼り付けてください。</p>}
          {copyStatus === "error" && (
            <p className="status-error">コピーできませんでした。文章を長押しして選択・コピーしてください。</p>
          )}
        </>
      )}
    </div>
  );
}
