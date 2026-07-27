import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MACT Admin",
  description: "Private admin dashboard for Muslims ACT data",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
