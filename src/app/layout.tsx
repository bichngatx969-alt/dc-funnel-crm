import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "D.C Funnel Bot",
  description: "Chatbot Fanpage chuyên phễu bán hàng cho Facebook Ads",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
