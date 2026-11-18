import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "セール告知メーカー",
  description: "ローソンの火曜スタートのセール情報から、従業員向けの LINE 告知文を作るツール",
};

// スマホでの表示に合わせる
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
