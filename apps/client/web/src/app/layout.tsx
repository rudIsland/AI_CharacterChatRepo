import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import "./globals.css";

const manropeFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI 캐릭터 채팅",
  description: "캐릭터와 대화하는 채팅 클라이언트",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={manropeFont.className}>{children}</body>
    </html>
  );
}
