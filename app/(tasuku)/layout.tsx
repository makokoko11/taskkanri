import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "../globals.css";

const font = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

export const metadata: Metadata = {
  title: "タスク管理",
  description: "シンプルなタスク管理アプリ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "タスク管理",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    shortcut: "/icon-192x192.png",
  },
  formatDetection: { telephone: false },
};

export default function TasukuRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={font.className}>
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-slate-100 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
