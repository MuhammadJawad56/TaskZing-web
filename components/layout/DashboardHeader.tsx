"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Send, Video, Star, Menu, MessageSquare, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/firebase/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { switchUserRole } from "@/lib/firebase/auth";

interface DashboardHeaderProps {
  onMenuToggle?: () => void;
  onQRClick?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onMenuToggle, onQRClick }) => {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [isSwitching, setIsSwitching] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const currentRole = userData?.currentRole || userData?.role || "provider";
  const switchTarget = currentRole === "client" ? "provider" : "client";

  const userName = user?.displayName || userData?.fullName || user?.email?.split("@")[0] || "U";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleSwitchRole = async () => {
    if (!user) {
      alert("Please log in to switch roles.");
      return;
    }
    
    // Show confirmation modal for both client and provider
    setShowSwitchModal(true);
  };

  const performRoleSwitch = async () => {
    if (!user) return;
    
    setShowSwitchModal(false);
    setIsSwitching(true);
    try {
      // Switch the role in Firestore (only updates currentRole)
      await switchUserRole(user.uid, switchTarget);
      
      // Wait a moment for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate based on new role - use window.location for reliable redirect
      if (switchTarget === "client") {
        // Always redirect to client-home when switching to client
        window.location.href = "/client-home";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      console.error("Error switching role:", error);
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

      {/* Switch Role Confirmation Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <ArrowLeftRight className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Switch to {switchTarget === "client" ? "Client" : "Provider"}
              </h2>
            </div>

            {/* Modal Body */}
            <div className="px-6 pb-6">
              {switchTarget === "client" ? (
                <>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    Are you sure you want to switch your role?
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    This will change your role while preserving all your signup data.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    You are about to switch your role from Client to Provider. Your previous provider data will be automatically retrieved, including:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                    <li>Skills and expertise</li>
                    <li>Service description</li>
                    <li>Provider rating and reviews</li>
                    <li>Job completion history</li>
                  </ul>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    Do you want to continue?
                  </p>
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-4 px-6 pb-6 justify-end">
              <button
                onClick={() => setShowSwitchModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={performRoleSwitch}
                disabled={isSwitching}
                className="px-6 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSwitching ? "Switching..." : "Switch Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};


