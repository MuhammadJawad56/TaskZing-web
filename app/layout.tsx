import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { AuthProvider } from "@/lib/api/AuthContext";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";

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
    <html lang="en" className={`${inter.variable} ${interTight.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[var(--app-bg)] text-[var(--app-text)]">
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {\n                const theme = localStorage.getItem('theme') || 'light';\n                document.documentElement.dataset.theme = theme;\n                if (theme === 'dark') {\n                  document.documentElement.classList.add('dark');\n                } else {\n                  document.documentElement.classList.remove('dark');\n                }\n              })();
            `,
          }}
        />
        <ThemeProvider>
          <LanguageProvider>
          <AuthProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <ConditionalFooter />
          </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}





