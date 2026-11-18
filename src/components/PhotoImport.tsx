"use client";

import { useState } from "react";
import { parseOcrText } from "@/lib/parseOcrText";
import type { SaleItemFields } from "@/lib/saleItem";

type Props = {
  /** 読み取り結果（下書き）を受け取る */
  onResult: (fields: SaleItemFields, rawText: string) => void;
};

/**
 * 写真から文字を読み取る。
 * OCR はスマホのブラウザ内で行い、画像はサーバーに送らない。
 */
export function PhotoImport({ onResult }: Props) {
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setStatus("読み取りの準備中…（初回は少し時間がかかります）");
    try {
      // 重いので、使うときにだけ読み込む
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("jpn", undefined, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setStatus(`読み取り中… ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();

      onResult(parseOcrText(data.text), data.text);
      setStatus("読み取りました。内容を確認して直してください。");
    } catch {
      setStatus("読み取りに失敗しました。手入力で追加してください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="file-button" aria-disabled={busy}>
        📷 写真から読み取る
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </label>
      {status && <p className="muted">{status}</p>}
    </div>
  );
}
