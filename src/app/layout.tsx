import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warrant",
  description: "OAuth was designed for apps. AI agents need warrants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
