import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SimpleForms",
  description:
    "A calm, minimal forms tool. One question at a time. The kind of thing you'd screenshot.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    // suppressHydrationWarning: the public fill page sets data-theme on <html>
    // via an inline script before hydration (to avoid a dark-embed white flash),
    // which would otherwise trip React's attribute-mismatch warning.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inter from Google Fonts, kept simple — no build-time font pipeline. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
