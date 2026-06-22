import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DCOS",
  description: "D.C Operating System - hệ điều hành cá nhân cho người kinh doanh hiện đại",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="font-sans">{children}</body>
    </html>
  );
}
