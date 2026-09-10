import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Miko — Discord Ticket Bot",
  description: "Premium ticket bot for your Discord server. Simple, fast, configurable.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}