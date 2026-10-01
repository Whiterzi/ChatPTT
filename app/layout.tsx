import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
 title: "ChatPTT · 用對話逛 PTT",
 description: "在熟悉的聊天介面中，閱讀 PTT 真實看板、文章與推文。",
 icons: {icon:"/favicon.svg",shortcut:"/favicon.svg"},
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-Hant"><body>{children}</body></html>;}
