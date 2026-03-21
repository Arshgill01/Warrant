import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warrant | Auth0 Access Shell",
  description: "Auth0-backed sign-in, Google connection state, and delegated external access setup for Warrant.",
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
