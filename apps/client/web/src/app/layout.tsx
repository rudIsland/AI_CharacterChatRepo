import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import "./globals.css";

const manropeFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI Character Chat",
  description: "Simple character chat client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={manropeFont.className}>{children}</body>
    </html>
  );
}
