"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Search,
  FileText,
  MessageSquare,
  ShoppingBag,
  Wallet,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Post a Task", href: "/dashboard/post-task", icon: PlusCircle },
  { name: "Browse Tasks", href: "/dashboard/browse-tasks", icon: Search },
  { name: "Proposals", href: "/dashboard/proposals", icon: FileText },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
  { name: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-theme-primaryBackground">
      {/* Mobile Header */}
      <div className="lg:hidden bg-theme-primaryBackground border-b border-theme-accent2 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary-500">TaskZing</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-theme-accent2 text-theme-primaryText"
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 bg-darkBlue-013 border-r border-theme-accent2">
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-500 text-white"
                      : "text-theme-secondaryText hover:bg-theme-accent1 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative flex flex-col w-64 bg-darkBlue-013">
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary-500 text-white"
                          : "text-theme-secondaryText hover:bg-theme-accent1 hover:text-white"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

