import type { Metadata } from "next";
import { Be_Vietnam_Pro, Lora } from "next/font/google";
import "./globals.css";

const bodyFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const serifFont = Lora({
  subsets: ["latin", "vietnamese"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: { template: "%s · Cỏ Ngọt", default: "Cỏ Ngọt" },
  description: "Sổ ca nhỏ của quán cà phê Cỏ Ngọt",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`h-full antialiased ${bodyFont.variable} ${serifFont.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
