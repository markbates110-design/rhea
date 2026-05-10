import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Lora } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Daily Anchor",
  description: "Your one most important intention for today.",
};

export const viewport: Viewport = {
  themeColor: "#fdf8f0", // warm amber — matches empty state initial color
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${lora.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
