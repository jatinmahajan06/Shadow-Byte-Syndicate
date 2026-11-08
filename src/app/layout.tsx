import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: `${BRAND.name} | Collegiate Cybersecurity Research & Defense`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Official website for Shadow Byte Syndicate. Collegiate cybersecurity club dedicated to ethical hacking, security research, CTF competitions, and system defense.",
  keywords: [
    "cybersecurity",
    "ethical hacking",
    "CTF",
    "Shadow Byte Syndicate",
    "penetration testing",
    "information security",
    "defensive security",
  ],
  authors: [{ name: "Shadow Byte Syndicate" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/assets/brand/icon-192.png",
  },
  openGraph: {
    title: `${BRAND.name} - We Don't Follow The System, We Secure It`,
    description: "Collegiate cybersecurity defense collective, workshops, and CTF competitions.",
    images: [{ url: "/assets/brand/banner.jpeg", width: 1600, height: 639, alt: "Shadow Byte Syndicate" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#050508] text-slate-200 antialiased selection:bg-brand-red selection:text-white">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
