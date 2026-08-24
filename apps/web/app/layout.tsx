import type { Metadata } from "next";
import "./globals.css";
import "./templates/numbered-rail.css";
import "./templates/classic-burgundy.css";
import "./templates/campus-navy.css";
import "./templates/soft-gray.css";
import "./templates/blue-line.css";

export const metadata: Metadata = {
  title: "AI Resume · 本地简历工作台",
  description: "本地优先、结构化编辑、可靠导出的开源简历工作台。",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
