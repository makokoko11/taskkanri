import type { Metadata } from "next";
import { BIZ_UDPGothic } from "next/font/google";
import "./globals.css";

const bizUDP = BIZ_UDPGothic({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-biz-udp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "タスク管理",
  description: "地域コミュニティ向けタスク管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${bizUDP.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-stone-50">{children}</body>
    </html>
  );
}
