import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MKOPA LOAN - Instant Digital Loans",
  description: "Get instant loans from 5,000 to 500,000 KES. Fast approval, secure processing, and flexible repayment options.",
  keywords: ["MKOPA", "loan", "digital lending", "Kenya", "instant loans", "mobile loans"],
  authors: [{ name: "MKOPA LOAN" }],
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32" },
      { url: "/logo.png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "MKOPA LOAN - Instant Digital Loans",
    description: "Get instant loans from 5,000 to 500,000 KES",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
