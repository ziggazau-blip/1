import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AJP Horas",
  description: "Gestão de horas e equipas",
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}