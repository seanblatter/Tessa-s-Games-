import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yarn Dragon Sort",
  description: "A yarn sorting puzzle game with dragon pressure.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
