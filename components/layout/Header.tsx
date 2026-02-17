"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Search, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/firebase/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { t } = useLanguage();

  // Don't show header if user is authenticated (dashboard header will show instead)
  // Also hide on dashboard routes
  if (loading) {
    return null;
  }

  if (user) {
    return null; // Hide header after login
  }

  // Hide header on dashboard routes
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/client-home') || pathname?.startsWith('/provider-dashboard')) {
    return null;
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b border-theme-accent2 dark:border-darkBlue-203 bg-theme-primaryBackground dark:bg-darkBlue-003">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src={theme === "dark" ? "/images/logos/Taskzing-Logo-dark-mode_1.png" : "/images/logos/Taskzing-Logo-light-mode_1.png"}
              alt="TaskZing"
              width={140}
              height={40}
              className="h-10 w-auto"
              priority
              suppressHydrationWarning
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/categories"
              className="text-sm font-medium text-theme-primaryText dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            >
              {t("header.categories")}
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm font-medium text-theme-primaryText dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            >
              {t("header.howItWorks")}
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-theme-primaryText dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            >
              {t("header.pricing")}
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-theme-primaryText dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            >
              {t("header.about")}
            </Link>
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:flex items-center space-x-4 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-theme-accent4 dark:text-gray-400" />
              <input
                type="text"
                placeholder={t("header.searchTasks")}
                className="w-full pl-10 pr-4 py-2 border border-theme-accent2 dark:border-darkBlue-203 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-theme-primaryBackground dark:bg-darkBlue-203 text-theme-primaryText dark:text-white placeholder:text-theme-accent4 dark:placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t("header.logIn")}
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm">
                {t("header.signUp")}
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-theme-accent2 dark:hover:bg-darkBlue-203 text-theme-primaryText dark:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-theme-accent2 dark:border-darkBlue-203">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/categories"
                className="text-sm font-medium text-theme-primaryText dark:text-white hover:text-primary-500 dark:hover:text-primary-400"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.categories")}
              </Link>
              <Link
                href="/how-it-works"
                className="text-sm font-medium text-theme-primaryText dark:text-white hover:text-primary-500 dark:hover:text-primary-400"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.howItWorks")}
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-theme-primaryText dark:text-white hover:text-primary-500 dark:hover:text-primary-400"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.pricing")}
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-theme-primaryText dark:text-white hover:text-primary-500 dark:hover:text-primary-400"
                onClick={() => setIsMenuOpen(false)}
              >
                {t("header.about")}
              </Link>
              <div className="pt-4 border-t border-theme-accent2 dark:border-darkBlue-203 space-y-2">
                <div className="pb-2">
                  <LanguageSwitcher />
                </div>
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    {t("header.logIn")}
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    {t("header.signUp")}
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

