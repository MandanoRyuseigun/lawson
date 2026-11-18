"use client";

import { useEffect, useState } from "react";
import { formatShortDate, getTargetTuesday } from "@/lib/targetTuesday";

export default function Home() {
  // 日付は端末（スマホ）の時刻で計算する。ビルド時の日付で固定されないよう、表示後に算出する
  const [targetLabel, setTargetLabel] = useState<string | null>(null);

  useEffect(() => {
    setTargetLabel(formatShortDate(getTargetTuesday()));
  }, []);

  return (
    <main style={{ padding: "16px", maxWidth: "480px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem" }}>セール告知メーカー</h1>
      <p>対象: {targetLabel ?? "…"} スタートのセール</p>
      <p style={{ color: "#666" }}>※ 画面はこれから作っていきます。</p>
    </main>
  );
}
