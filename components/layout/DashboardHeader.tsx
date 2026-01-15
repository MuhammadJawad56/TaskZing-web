"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Send, Video, Star, Menu, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/firebase/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { switchUserRole } from "@/lib/firebase/auth";

interface DashboardHeaderProps {
  onMenuToggle?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onMenuToggle }) => {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [isSwitching, setIsSwitching] = useState(false);
  const currentRole = userData?.currentRole || userData?.role || "provider";
  const switchTarget = currentRole === "client" ? "provider" : "client";

  const userName = user?.displayName || userData?.fullName || user?.email?.split("@")[0] || "U";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleSwitchRole = async () => {
    if (!user) {
      alert("Please log in to switch roles.");
      return;
    }
    
    setIsSwitching(true);
    try {
      // Switch the role in Firestore (only updates currentRole)
      await switchUserRole(user.uid, switchTarget);
      
      // Wait a moment for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate based on new role (matches Flutter app behavior)
      router.push(switchTarget === "client" ? "/client-home" : "/dashboard");
      
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
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-theme-accent2 bg-[var(--app-surface)] dark:border-gray-700 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center">
            <Image
              src={theme === "dark" ? "/images/logos/Taskzing-Logo-dark-mode_1.png" : "/images/logos/Taskzing-Logo-light-mode_1.png"}
              alt="TaskZing"
              width={140}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            {/* Switch to Client Button - Hidden on mobile/tablet */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSwitchRole}
              disabled={isSwitching}
              isLoading={isSwitching}
              className="hidden lg:flex rounded-lg"
            >
              {isSwitching ? "Switching..." : `Switch to ${switchTarget === "client" ? "Client" : "Provider"}`}
            </Button>

            {/* Icons - Always visible */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBlue-003 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-gray-700 dark:text-white" />
            </button>

            <Link
              href="/dashboard/messages"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBlue-003 transition-colors"
              aria-label="Messages"
            >
              <MessageSquare className="h-5 w-5 text-gray-700 dark:text-white" />
            </Link>

            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBlue-003 transition-colors"
              aria-label="Video"
            >
              <Video className="h-5 w-5 text-gray-700 dark:text-white" />
            </button>

            {/* Sparkle Button - Red pill with stars */}
            <button
              className="p-1.5 rounded-full bg-primary-500 hover:bg-primary-600 transition-colors"
              aria-label="Sparkle"
            >
              <div className="flex items-center justify-center gap-0.5">
                <Star className="h-3 w-3 text-white" fill="white" />
                <Star className="h-2.5 w-2.5 text-white" fill="white" />
              </div>
            </button>

            {/* Hamburger Menu - Visible on mobile/tablet, hidden on desktop */}
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBlue-003 transition-colors"
              aria-label="Menu"
            >
              <div className="flex flex-col gap-1">
                <div className="w-4 h-0.5 bg-gray-700 dark:bg-white"></div>
                <div className="w-5 h-0.5 bg-gray-700 dark:bg-white"></div>
                <div className="w-4 h-0.5 bg-gray-700 dark:bg-white"></div>
              </div>
            </button>

            {/* User Avatar - Hidden on mobile/tablet, visible on desktop */}
            <button
              className="hidden lg:flex relative"
              onClick={() => router.push("/dashboard/settings")}
              aria-label="User menu"
            >
              <div className="h-10 w-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold">
                {userInitial}
              </div>
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-gray-400 border-2 border-white dark:border-darkBlue-013"></div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};


