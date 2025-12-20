import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "TaskZing - Find Skilled Professionals for Your Tasks",
    template: "%s | TaskZing",
  },
  description: "Connect with skilled professionals for all your task needs. Quality service, every time.",
  keywords: ["tasks", "freelance", "services", "professionals", "marketplace"],
  authors: [{ name: "TaskZing" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://taskzing.com",
    siteName: "TaskZing",
    title: "TaskZing - Find Skilled Professionals for Your Tasks",
    description: "Connect with skilled professionals for all your task needs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaskZing - Find Skilled Professionals for Your Tasks",
    description: "Connect with skilled professionals for all your task needs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body className="min-h-screen flex flex-col bg-theme-primaryBackground text-theme-primaryText">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

