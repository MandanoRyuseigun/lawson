"use client";

import { useEffect, useRef, useState } from "react";
import { rectFromPoints, toImageRect, type Point, type Rect } from "@/lib/cropRect";

type Props = {
  /** 読み取った文字（そのままの文字起こし）を受け取る */
  onResult: (rawText: string) => void;
};

/** 読み取りに渡す画像の長い辺の上限（大きすぎるとスマホで時間がかかるため） */
const MAX_SIDE = 3000;

/**
 * 写真から文字を読み取る。写真の上を指でなぞって範囲を囲むと、その部分だけを読み取る。
 * OCR はスマホのブラウザ内で行い、画像はサーバーに送らない。
 */
export function PhotoImport({ onResult }: Props) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<Point | null>(null);

  // 写真を閉じたら、ブラウザ内に作った一時的な URL を片付ける
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  function pointFrom(e: React.PointerEvent): Point {
    const box = imgRef.current!.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  }

  function displaySize() {
    const img = imgRef.current!;
    return { width: img.clientWidth, height: img.clientHeight };
  }

  /** 囲んだ範囲（なければ写真全体）を切り出して読み取る */
  async function recognize(area: Rect | null) {
    const img = imgRef.current;
    if (!img) return;
    setBusy(true);
    setStatus("読み取りの準備中…（初回は少し時間がかかります）");
    try {
      const natural = { width: img.naturalWidth, height: img.naturalHeight };
      const src = area ? toImageRect(area, displaySize(), natural) : { left: 0, top: 0, ...natural };
      const scale = Math.min(1, MAX_SIDE / Math.max(src.width, src.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(src.width * scale);
      canvas.height = Math.round(src.height * scale);
      canvas.getContext("2d")!.drawImage(img, src.left, src.top, src.width, src.height, 0, 0, canvas.width, canvas.height);

      // 重いので、使うときにだけ読み込む
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("jpn", undefined, {
        logger: (m) => {
          if (m.status === "recognizing text") setStatus(`読み取り中… ${Math.round(m.progress * 100)}%`);
        },
      });
      const { data } = await worker.recognize(canvas);
      await worker.terminate();

      setImageUrl(null);
      setRect(null);
      setStatus("");
      onResult(data.text);
    } catch {
      setStatus("読み取りに失敗しました。範囲を変えるか、手入力で追加してください。");
    } finally {
      setBusy(false);
    }
  }

  const fileInput = (label: string, className: string) => (
    <label className={className} aria-disabled={busy}>
      {label}
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setImageUrl(URL.createObjectURL(file));
          setRect(null);
          setStatus("");
        }}
      />
    </label>
  );

  if (!imageUrl) {
    return (
      <div>
        {fileInput("📷 写真から読み取る", "file-button")}
        {status && <p className="muted">{status}</p>}
      </div>
    );
  }

  return (
    <div>
      <p className="muted">
        読み取りたい部分を、写真の上で指でなぞって囲んでください（例: 資料の《次週》の部分）。囲むと、その部分だけを読み取るので精度が上がります。
      </p>
      <div
        className="crop-area"
        onPointerDown={(e) => {
          if (busy) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          dragStart.current = pointFrom(e);
        }}
        onPointerMove={(e) => {
          if (!dragStart.current) return;
          setRect(rectFromPoints(dragStart.current, pointFrom(e), displaySize()));
        }}
        onPointerUp={() => {
          dragStart.current = null;
        }}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 端末内の写真（blob URL）をそのまま表示する */}
        <img ref={imgRef} src={imageUrl} alt="読み取る写真" draggable={false} />
        {rect && (
          <div
            className="crop-rect"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          />
        )}
      </div>

      <div className="btn-row" style={{ flexDirection: "column", marginTop: 12 }}>
        <button type="button" className="btn-primary" disabled={busy || !rect} onClick={() => recognize(rect)}>
          {rect ? "✂️ 囲んだ範囲を読み取る" : "✂️ 範囲を囲んでください"}
        </button>
        <button type="button" disabled={busy} onClick={() => recognize(null)}>
          写真全体を読み取る
        </button>
        {rect && (
          <button type="button" disabled={busy} onClick={() => setRect(null)}>
            囲みをやり直す
          </button>
        )}
        {fileInput("別の写真にする", "file-button")}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setImageUrl(null);
            setRect(null);
            setStatus("");
          }}
        >
          やめる
        </button>
      </div>
      {status && <p className="muted">{status}</p>}
    </div>
  );
}
