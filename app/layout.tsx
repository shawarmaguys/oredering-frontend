import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shawarma Guys Ordering",
  description: "Internal ordering and stock management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      style={{ height: '100dvh', overflow: 'hidden' }}
    >
      <body style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
