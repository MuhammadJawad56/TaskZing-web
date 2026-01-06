"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Search, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/firebase/AuthContext";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTheme } from "@/lib/contexts/ThemeContext";

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();

  // Don't show header if user is authenticated (dashboard header will show instead)
  if (loading) {
    return null; // Or a loading state
  }

  if (user) {
    return null; // Hide header after login
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b border-theme-accent2 bg-theme-primaryBackground">
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
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/categories"
              className="text-sm font-medium text-theme-primaryText hover:text-primary-500 transition-colors"
            >
              Categories
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm font-medium text-theme-primaryText hover:text-primary-500 transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-theme-primaryText hover:text-primary-500 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-theme-primaryText hover:text-primary-500 transition-colors"
            >
              About
            </Link>
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:flex items-center space-x-4 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-theme-accent4" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2 border border-theme-accent2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-theme-primaryBackground text-theme-primaryText"
              />
            </div>
          </div>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm">
                Sign Up
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-theme-accent2 text-theme-primaryText"
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
          <div className="md:hidden py-4 border-t border-theme-accent2">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/categories"
                className="text-sm font-medium text-theme-primaryText hover:text-primary-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Categories
              </Link>
              <Link
                href="/how-it-works"
                className="text-sm font-medium text-theme-primaryText hover:text-primary-500"
                onClick={() => setIsMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-theme-primaryText hover:text-primary-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-theme-primaryText hover:text-primary-500"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <div className="pt-4 border-t border-theme-accent2 space-y-2">
                <div className="pb-2">
                  <LanguageSwitcher />
                </div>
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    Log In
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Sign Up
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

