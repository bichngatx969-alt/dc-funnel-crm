import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "D.C FUNNEL CRM",
  description: "CRM Funnel multi-brand cho agency và local brand Việt Nam",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="font-sans">{children}</body>
    </html>
  );
}
