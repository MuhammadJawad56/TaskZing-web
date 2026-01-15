"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  PlusCircle,
  Search,
  FileText,
  MessageSquare,
  ShoppingBag,
  Wallet,
  Settings,
  Menu,
  X,
  ChevronLeft,
  Compass,
  Briefcase,
  CheckSquare,
  User,
  MessageCircle,
  Sun,
  Moon,
  ArrowLeftRight,
  Plus,
  Bell,
  Send,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DashboardHeader } from "./DashboardHeader";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/AuthContext";
import { switchUserRole } from "@/lib/firebase/auth";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Desktop navigation items (provider view)
const desktopNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Explore", href: "/explore", icon: Compass },
  { name: "Showcase", href: "/dashboard/showcase", icon: Briefcase },
  { name: "My Tasks", href: "/dashboard/my-tasks", icon: CheckSquare },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Chat Zing", href: "/dashboard/chatzing-ai", icon: MessageCircle },
];

// Desktop navigation items (client view)
const clientDesktopNavItems: NavItem[] = [
  { name: "Home", href: "/client-home", icon: Home },
  { name: "Explore", href: "/client-explore", icon: Compass },
  { name: "Post a Job", href: "/post-task", icon: PlusCircle },
  { name: "All Jobs", href: "/all-jobs", icon: Briefcase },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Profile", href: "/my-profile", icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Chat Zing", href: "/dashboard/chatzing-ai", icon: MessageCircle },
];

// Mobile/Tablet navigation items (matching the design)
const mobileNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Explore", href: "/explore", icon: Compass },
  { name: "Showcase Work", href: "/dashboard/showcase", icon: Briefcase },
  { name: "My Tasks", href: "/dashboard/my-tasks", icon: CheckSquare },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export const DashboardLayout: React.FC<{ children: React.ReactNode; onQRClick?: () => void }> = ({
  children,
  onQRClick,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const { user, userData } = useAuth();
  const currentRole = userData?.currentRole || userData?.role || "provider";
  const desktopItems = currentRole === "client" ? clientDesktopNavItems : desktopNavItems;
  
  const userName = user?.displayName || userData?.fullName || user?.email?.split("@")[0] || "U";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleSwitchToClient = async () => {
    if (!user) {
      alert("Please log in to switch roles.");
      return;
    }
    
    setIsSwitching(true);
    try {
      // Switch the role in Firestore (only updates currentRole, keeps role as Provider)
      await switchUserRole(user.uid, "client");
      
      // Wait a moment for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to client home (matches Flutter app behavior)
      router.push("/client-home");
      
      // Force a page reload to refresh auth context and user data
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error: any) {
      console.error("Error switching to client:", error);
      setIsSwitching(false);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to switch role. Please try again.";
      if (error?.code === 'permission-denied') {
        errorMessage = "You don't have permission to update your role. Please contact support.";
      } else if (error?.code === 'unavailable') {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      {/* Dashboard Header */}
      <DashboardHeader onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} onQRClick={onQRClick} />

      <div className="flex bg-[var(--app-bg)]">
        {/* Sidebar - Desktop */}
        <aside className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:pt-16 lg:mt-16 dark:bg-darkBlue-013 bg-white border-r border-theme-accent2 transition-all duration-300",
          isSidebarCollapsed ? "lg:w-20" : "lg:w-64"
        )}>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {desktopItems.map((item) => {
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
                      : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-theme-accent1 hover:text-gray-900 dark:hover:text-white",
                    isSidebarCollapsed && "justify-center"
                  )}
                  title={isSidebarCollapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isSidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
          
          {/* Sidebar Toggle Button */}
          <div className="p-4 border-t border-theme-accent2 dark:border-gray-700">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={cn(
                "flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-theme-accent1",
                isSidebarCollapsed && "justify-center"
              )}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <div className="flex items-center gap-1.5">
                {/* Three horizontal lines (hamburger menu) */}
                <div className="flex flex-col gap-1">
                  <div className="w-4 h-0.5 bg-current"></div>
                  <div className="w-5 h-0.5 bg-current"></div>
                  <div className="w-4 h-0.5 bg-current"></div>
                </div>
                {/* Less-than sign */}
                {!isSidebarCollapsed && (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </div>
            </button>
          </div>
        </aside>

        {/* Mobile/Tablet Sidebar Drawer - Hidden on desktop (lg and above) */}
        <div
          className={cn(
            "lg:hidden fixed inset-0 z-50 transition-opacity duration-300",
            isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          
          {/* Side Drawer */}
          <aside
            className={cn(
              "fixed right-0 top-0 bottom-0 w-64 max-w-[85vw] dark:bg-darkBlue-013 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col",
              isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            {/* Header with Logo and Close button */}
            <div className="flex items-center justify-between p-4 border-b border-theme-accent2 dark:border-gray-700">
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center">
                <Image
                  src="/images/logos/Taskzing-Logo-light-mode_1.png"
                  alt="TaskZing"
                  width={120}
                  height={40}
                  className="h-8 w-auto dark:brightness-0 dark:invert"
                />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBlue-003 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-gray-700 dark:text-white" />
              </button>
            </div>
            
            {/* Navigation Items */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {mobileNavItems.map((item) => {
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
                        : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-theme-accent1 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* ChatZing AI */}
              <Link
                href="/dashboard/chatzing-ai"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  pathname === "/dashboard/chatzing-ai"
                    ? "bg-primary-500 text-white"
                    : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-theme-accent1 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <MessageCircle className="h-5 w-5 flex-shrink-0" />
                <span>ChatZing AI</span>
              </Link>
              
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between px-4 py-3 mt-2">
                <div className="flex items-center space-x-3">
                  {theme === "light" ? (
                    <Sun className="h-5 w-5 text-gray-700 dark:text-white" />
                  ) : (
                    <Moon className="h-5 w-5 text-gray-700 dark:text-white" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-white">Dark Mode</span>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    theme === "dark" ? "bg-primary-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === "dark" ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </nav>
            
            {/* Switch to Client Button */}
            <div className="p-4 border-t border-theme-accent2 dark:border-gray-700">
              <button
                onClick={() => {
                  handleSwitchToClient();
                  setIsMobileMenuOpen(false);
                }}
                disabled={isSwitching}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeftRight className="h-5 w-5" />
                <span>{isSwitching ? "Switching..." : "Switch to Client"}</span>
              </button>
            </div>
          </aside>
        </div>

        {/* Main Content */}
        <main className={cn(
          "flex-1 bg-[var(--app-bg)] transition-all duration-300 pb-20 lg:pb-8",
          isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--app-surface)] border-t border-theme-accent2 dark:border-gray-700 z-40 shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-colors",
              pathname === "/dashboard"
                ? "text-primary-500"
                : "text-gray-600 dark:text-gray-400"
            )}
          >
            <LayoutDashboard className={cn(
              "h-6 w-6",
              pathname === "/dashboard" && "fill-primary-500"
            )} />
          </Link>
          
          {/* Explore */}
          <Link
            href="/explore"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-colors",
              pathname === "/explore"
                ? "text-primary-500"
                : "text-gray-600 dark:text-gray-400"
            )}
          >
            <Compass className="h-6 w-6" />
          </Link>
          
          {/* Add/Create Button - Large Red Circle */}
          <button
            onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-500 text-white shadow-lg -mt-5 transition-transform hover:scale-110 z-50"
          >
            <Plus className="h-6 w-6" strokeWidth={3} />
          </button>
          
          {/* My Tasks */}
          <Link
            href="/dashboard/my-tasks"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-colors",
              pathname === "/dashboard/my-tasks"
                ? "text-primary-500"
                : "text-gray-600 dark:text-gray-400"
            )}
          >
            <CheckSquare className="h-6 w-6" />
          </Link>
          
          {/* Profile */}
          <Link
            href="/dashboard/profile"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
              pathname === "/dashboard/profile"
                ? "text-primary-500"
                : "text-gray-600 dark:text-gray-400"
            )}
          >
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                {userInitial}
              </div>
              {/* Notification Badge */}
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary-500 border-2 border-white dark:border-darkBlue-013"></div>
            </div>
          </Link>
        </div>
      </nav>
      
      {/* Plus Menu Popup - Semi-circular overlay */}
      {isPlusMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              "lg:hidden fixed inset-0 bg-black/30 z-40 transition-opacity duration-300",
              isPlusMenuOpen ? "opacity-100" : "opacity-0"
            )}
            onClick={() => setIsPlusMenuOpen(false)}
          />
          
          {/* Popup Menu - Arc Shape */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* Arc Background */}
            <div className="relative w-full" style={{ height: '240px' }}>
              {/* SVG Arc Background */}
              <svg 
                className="absolute bottom-0 left-0 w-full h-full" 
                viewBox="0 0 400 240" 
                preserveAspectRatio="none"
              >
                <path
                  d="M 0 240 L 0 120 Q 200 0 400 120 L 400 240 Z"
                  fill="#f3f4f6"
                  className="dark:fill-[#1e3a5f]"
                />
              </svg>
              
              {/* Buttons positioned absolutely on the arc */}
              {/* Messages - Left side, lower on the arc */}
              <button
                onClick={() => {
                  router.push("/dashboard/messages");
                  setIsPlusMenuOpen(false);
                }}
                className="absolute flex flex-col items-center"
                style={{ left: '5%', bottom: '68px' }}
              >
                <div className="w-11 h-11 rounded-full bg-primary-500 flex items-center justify-center shadow-lg">
                  <Send className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-white mt-1">Messages</span>
              </button>
              
              {/* Notifications - Center-left, higher on arc */}
              <button
                onClick={() => {
                  setIsPlusMenuOpen(false);
                }}
                className="absolute flex flex-col items-center"
                style={{ left: '25%', bottom: '98px' }}
              >
                <div className="w-11 h-11 rounded-full bg-primary-500 flex items-center justify-center shadow-lg">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-white mt-1">Notifications</span>
              </button>
              
              {/* My Tasks - Center-right, higher on arc */}
              <button
                onClick={() => {
                  router.push("/dashboard/my-tasks");
                  setIsPlusMenuOpen(false);
                }}
                className="absolute flex flex-col items-center"
                style={{ right: '25%', bottom: '98px' }}
              >
                <div className="w-11 h-11 rounded-full bg-primary-500 flex items-center justify-center shadow-lg">
                  <CheckSquare className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-white mt-1">My Tasks</span>
              </button>
              
              {/* Switch Role - Right side, lower on the arc */}
              <button
                onClick={() => {
                  handleSwitchToClient();
                  setIsPlusMenuOpen(false);
                }}
                disabled={isSwitching}
                className="absolute flex flex-col items-center disabled:opacity-50"
                style={{ right: '5%', bottom: '68px' }}
              >
                <div className="w-11 h-11 rounded-full bg-primary-500 flex items-center justify-center shadow-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-white mt-1">
                  {isSwitching ? "Switching..." : "Switch Role"}
                </span>
              </button>
              
              {/* Close Button - Bottom center */}
              <button
                onClick={() => setIsPlusMenuOpen(false)}
                className="absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center shadow-lg"
                style={{ bottom: '30px' }}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


