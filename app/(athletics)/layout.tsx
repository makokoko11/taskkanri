import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "竹本家 管理アプリ",
  description: "陸上送迎・ピアノ補講管理",
};

export default function AthleticsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
