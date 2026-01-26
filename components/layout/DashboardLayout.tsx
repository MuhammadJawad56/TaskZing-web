"use client";

import React, { useState, useEffect } from "react";
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
  Star,
  CreditCard,
  Check,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DashboardHeader } from "./DashboardHeader";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/AuthContext";
import { isProfileComplete } from "@/lib/firebase/users";
import { switchUserRole } from "@/lib/firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/Button";

// Initialize Stripe - same as payment-method page
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_your_publishable_key_here"
);

const SKILLS = [
  "Cleaning", "Plumbing", "Electrical", "Carpentry", "Painting", "Landscaping",
  "Moving", "Delivery", "IT Support", "Web Development", "Graphic Design", "Photography",
  "Tutoring", "Consulting", "Legal Services", "Financial Services", "Others",
];

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1f2937",
      fontFamily: '"Inter", sans-serif',
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444" },
  },
  hidePostalCode: false,
};

// Payment Card Form Component for Mobile
function MobilePaymentCardForm({ onSuccess, onCancel, userEmail, userId }: { onSuccess: () => void; onCancel: () => void; userEmail: string | null; userId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardholderName, setCardholderName] = useState("");

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    if (event.error) {
      setCardError(event.error.message);
    } else {
      setCardError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !userId) return;

    if (!cardholderName.trim()) {
      setCardError("Please enter the cardholder name");
      return;
    }

    setIsProcessing(true);
    setCardError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setCardError("Card Element not found.");
      setIsProcessing(false);
      return;
    }

    try {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: cardholderName.trim(),
          email: userEmail || undefined,
        },
      });

      if (error) {
        setCardError(error.message || "An unknown error occurred.");
        setIsProcessing(false);
        return;
      }

      if (!paymentMethod) {
        setCardError("Failed to create payment method");
        setIsProcessing(false);
        return;
      }

      const paymentMethodData = {
        userId: userId,
        paymentMethodId: paymentMethod.id,
        last4: paymentMethod.card?.last4,
        brand: paymentMethod.card?.brand,
        exp_month: paymentMethod.card?.exp_month,
        exp_year: paymentMethod.card?.exp_year,
        cardholderName: cardholderName.trim(),
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "paymentMethods"), paymentMethodData);
      onSuccess();
    } catch (err: any) {
      setCardError(err.message || "Failed to add payment method.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Add Payment Method</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {cardError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{cardError}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
          <CardElement options={cardElementOptions} onChange={handleCardChange} />
        </div>
      </div>

      <Button type="submit" isLoading={isProcessing} disabled={!stripe || !elements || !cardComplete || isProcessing} className="w-full">
        {isProcessing ? "Adding Card..." : "Add Card"}
      </Button>
    </form>
  );
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Desktop navigation items (provider view) - will be updated with user ID dynamically
const getDesktopNavItems = (userId: string): NavItem[] => [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Explore", href: "/explore", icon: Compass },
  { name: "Showcase", href: "/dashboard/showcase", icon: Briefcase },
  { name: "My Tasks", href: "/dashboard/my-tasks", icon: CheckSquare },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Profile", href: `/profile/${userId}`, icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Chat Zing", href: "/dashboard/chatzing-ai", icon: MessageCircle },
];

// Desktop navigation items (client view) - will be updated with user ID dynamically
const getClientDesktopNavItems = (userId: string): NavItem[] => [
  { name: "Home", href: "/client-home", icon: Home },
  { name: "Explore", href: "/client-explore", icon: Compass },
  { name: "Post a Job", href: "/post-task", icon: PlusCircle },
  { name: "All Jobs", href: "/all-jobs", icon: Briefcase },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Profile", href: `/profile/${userId}`, icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Chat Zing", href: "/dashboard/chatzing-ai", icon: MessageCircle },
];

// Mobile/Tablet navigation items (provider view) - will be updated with user ID dynamically
const getMobileNavItems = (userId: string): NavItem[] => [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Explore", href: "/explore", icon: Compass },
  { name: "Showcase Work", href: "/dashboard/showcase", icon: Briefcase },
  { name: "My Tasks", href: "/dashboard/my-tasks", icon: CheckSquare },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Profile", href: `/profile/${userId}`, icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

// Mobile/Tablet navigation items (client view) - will be updated with user ID dynamically
const getClientMobileNavItems = (userId: string): NavItem[] => [
  { name: "Home", href: "/client-home", icon: Home },
  { name: "Explore", href: "/client-explore", icon: Compass },
  { name: "Post a Job", href: "/post-task", icon: PlusCircle },
  { name: "All Jobs", href: "/all-jobs", icon: Briefcase },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Profile", href: `/profile/${userId}`, icon: User },
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
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchModalTarget, setSwitchModalTarget] = useState<"client" | "provider">("client");
  const [hasProviderProfile, setHasProviderProfile] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const currentRole = userData?.currentRole || userData?.role || "provider";
  const userId = user?.uid || userData?.uid || "";
  const isClientOnly = userData?.role === "client" && currentRole === "client";

  // Become a Provider modal state
  const [showBecomeProviderModal, setShowBecomeProviderModal] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [serviceDescription, setServiceDescription] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providerError, setProviderError] = useState("");

  // Check if user has provider profile
  useEffect(() => {
    if (userData) {
      const hasProvider = 
        userData.role === "client+provider" || 
        userData.providerProfileCompleted === true ||
        (userData.skills && userData.skills.length > 0);
      setHasProviderProfile(hasProvider);
    }
  }, [userData]);

  // Check if user has payment methods
  useEffect(() => {
    const checkPaymentMethods = async () => {
      if (!user) return;
      try {
        const paymentMethodsQuery = query(
          collection(db, "paymentMethods"),
          where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(paymentMethodsQuery);
        setHasPaymentMethod(!snapshot.empty);
      } catch (error) {
        console.error("Error checking payment methods:", error);
      }
    };
    if (user) checkPaymentMethods();
  }, [user]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleBecomeProviderSubmit = async () => {
    if (!user) {
      setProviderError("Please sign in to continue");
      return;
    }

    if (selectedSkills.length === 0) {
      setProviderError("Please select at least one skill");
      return;
    }

    if (!serviceDescription.trim()) {
      setProviderError("Please provide a service description");
      return;
    }

    if (!hasPaymentMethod) {
      setProviderError("Please add a payment method to continue");
      return;
    }

    setIsSubmitting(true);
    setProviderError("");

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        role: "client+provider",
        currentRole: "provider",
        skills: selectedSkills,
        bio: serviceDescription.trim(),
        about: serviceDescription.trim(),
        providerProfileCompleted: true,
        updatedAt: new Date(),
      });

      setShowBecomeProviderModal(false);
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Error updating provider profile:", err);
      setProviderError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeBecomeProviderModal = () => {
    setShowBecomeProviderModal(false);
    setSelectedSkills([]);
    setServiceDescription("");
    setProviderError("");
    setShowPaymentForm(false);
  };


  // Check profile completion and redirect if needed
  useEffect(() => {
    if (authLoading || !user || pathname === "/initial-profile") return;
    
    const checkProfile = async () => {
      try {
        const profileComplete = await isProfileComplete(user.uid);
        if (!profileComplete) {
          router.push("/initial-profile");
        }
      } catch (error) {
        console.error("Error checking profile completion:", error);
      }
    };
    
    checkProfile();
  }, [user, authLoading, pathname, router]);
  
  // Create translated navigation items
  const getTranslatedDesktopItems = () => {
    const items = currentRole === "client" ? getClientDesktopNavItems(userId) : getDesktopNavItems(userId);
    return items.map(item => ({
      ...item,
      name: t(`nav.${item.name.toLowerCase().replace(/\s+/g, '')}`) || item.name
    }));
  };
  
  const getTranslatedMobileItems = () => {
    const items = currentRole === "client" ? getClientMobileNavItems(userId) : getMobileNavItems(userId);
    return items.map(item => ({
      ...item,
      name: t(`nav.${item.name.toLowerCase().replace(/\s+/g, '')}`) || item.name
    }));
  };
  
  const desktopItems = getTranslatedDesktopItems();
  const mobileItems = getTranslatedMobileItems();
  
  const userName = user?.displayName || userData?.fullName || user?.email?.split("@")[0] || "U";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleSwitchToClient = async () => {
    if (!user) {
      alert("Please log in to switch roles.");
      return;
    }
    
    // Show confirmation modal first
    setSwitchModalTarget("client");
    setShowSwitchModal(true);
  };

  const handleSwitchToProvider = async () => {
    if (!user) {
      alert("Please log in to switch roles.");
      return;
    }
    
    // If client-only and doesn't have provider profile, show Become a Provider modal
    if (isClientOnly && !hasProviderProfile) {
      setShowBecomeProviderModal(true);
      return;
    }
    
    // Show confirmation modal first
    setSwitchModalTarget("provider");
    setShowSwitchModal(true);
  };

  const performRoleSwitch = async () => {
    if (!user) return;
    
    const targetRole = switchModalTarget;
    setShowSwitchModal(false);
    setIsSwitching(true);
    try {
      // Switch the role in Firestore
      await switchUserRole(user.uid, targetRole);
      
      // Wait a moment for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate based on target role - use window.location for reliable redirect
      if (targetRole === "client") {
        // Always redirect to client-home when switching to client
        window.location.href = "/client-home";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      console.error(`Error switching to ${targetRole}:`, error);
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
              const isActive = item.href.startsWith("/profile/") 
                ? pathname?.startsWith("/profile/")
                : pathname === item.href;
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
              {mobileItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href.startsWith("/profile/") 
                  ? pathname?.startsWith("/profile/")
                  : pathname === item.href;
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
              
              {/* Chat Zing */}
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
                <div className="w-5 h-5 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="aiGradientSidebar" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="25%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="75%" stopColor="#d946ef" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="url(#aiGradientSidebar)" strokeWidth="14" />
                  </svg>
                </div>
                <span>Chat Zing</span>
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
            
            {/* Switch Role Button */}
            <div className="p-4 border-t border-theme-accent2 dark:border-gray-700">
              {currentRole === "client" ? (
                <button
                  onClick={() => {
                    handleSwitchToProvider();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isSwitching}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeftRight className="h-5 w-5" />
                  <span>
                    {isSwitching 
                      ? "Switching..." 
                      : isClientOnly && !hasProviderProfile
                        ? "Become a Provider"
                        : "Switch to Provider"
                    }
                  </span>
                </button>
              ) : (
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
              )}
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
          {currentRole === "client" ? (
            <>
              {/* Home */}
              <Link
                href="/client-home"
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  pathname === "/client-home"
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                <Home className={cn(
                  "h-6 w-6",
                  pathname === "/client-home" && "fill-red-500"
                )} />
                <span className="text-xs mt-0.5">Home</span>
              </Link>
              
              {/* Explore */}
              <Link
                href="/client-explore"
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  pathname === "/client-explore"
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                <Compass className="h-6 w-6" />
                <span className="text-xs mt-0.5">Explore</span>
              </Link>
              
              {/* Add/Create Button - Large Red Circle */}
              <button
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500 text-white shadow-lg -mt-5 transition-transform hover:scale-110 z-50"
              >
                {isPlusMenuOpen ? (
                  <X className="h-6 w-6" strokeWidth={3} />
                ) : (
                  <Plus className="h-6 w-6" strokeWidth={3} />
                )}
              </button>
              
              {/* Jobs */}
              <Link
                href="/all-jobs"
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  pathname === "/all-jobs"
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                <Briefcase className="h-6 w-6" />
                <span className="text-xs mt-0.5">Jobs</span>
              </Link>
              
              {/* Profile */}
              <Link
                href={userId ? `/profile/${userId}` : "/my-profile"}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
                  pathname?.startsWith("/profile/")
                    ? "text-red-500"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                    {userInitial}
                  </div>
                  {/* Notification Badge */}
                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-gray-400 border-2 border-white dark:border-darkBlue-013"></div>
                </div>
                <span className="text-xs mt-0.5">Profile</span>
              </Link>
            </>
          ) : (
            <>
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
                {isPlusMenuOpen ? (
                  <X className="h-6 w-6" strokeWidth={3} />
                ) : (
                  <Plus className="h-6 w-6" strokeWidth={3} />
                )}
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
                href={userId ? `/profile/${userId}` : "/dashboard/profile"}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
                  pathname?.startsWith("/profile/")
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
            </>
          )}
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
              {currentRole === "client" ? (
                <>
                  {/* Messages - Left side, lower on the arc */}
                  <button
                    onClick={() => {
                      router.push("/messages");
                      setIsPlusMenuOpen(false);
                    }}
                    className="absolute flex flex-col items-center"
                    style={{ left: '5%', bottom: '68px' }}
                  >
                    <div className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
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
                    <div className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-white mt-1">Notifications</span>
                  </button>
                  
                  {/* Post a Job - Center-right, higher on arc */}
                  <button
                    onClick={() => {
                      router.push("/post-task");
                      setIsPlusMenuOpen(false);
                    }}
                    className="absolute flex flex-col items-center"
                    style={{ right: '25%', bottom: '98px' }}
                  >
                    <div className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                      <PlusCircle className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-white mt-1">Post a Job</span>
                  </button>
                  
                  {/* Switch to Provider - Right side, lower on the arc */}
                  <button
                    onClick={() => {
                      handleSwitchToProvider();
                      setIsPlusMenuOpen(false);
                    }}
                    disabled={isSwitching}
                    className="absolute flex flex-col items-center disabled:opacity-50"
                    style={{ right: '5%', bottom: '68px' }}
                  >
                    <div className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                      <ArrowLeftRight className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-white mt-1">
                      {isSwitching 
                        ? "Switching..." 
                        : isClientOnly && !hasProviderProfile
                          ? "Become a Provider"
                          : "Switch to Provider"
                      }
                    </span>
                  </button>
                </>
              ) : (
                <>
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
                  
                  {/* Videos - Center-left, higher on arc */}
                  <button
                    onClick={() => {
                      router.push("/dashboard/videos");
                      setIsPlusMenuOpen(false);
                    }}
                    className="absolute flex flex-col items-center"
                    style={{ left: '25%', bottom: '98px' }}
                  >
                    <div className="w-11 h-11 rounded-full bg-primary-500 flex items-center justify-center shadow-lg">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-white mt-1">Videos</span>
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
                </>
              )}
              
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

      {/* Switch Role Confirmation Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <ArrowLeftRight className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Switch to {switchModalTarget === "client" ? "Client" : "Provider"}
              </h2>
            </div>

            {/* Modal Body */}
            <div className="px-6 pb-6">
              {switchModalTarget === "client" ? (
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

      {/* Become a Provider Modal */}
      {showBecomeProviderModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeBecomeProviderModal();
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Become a Provider</h1>
                    <p className="text-sm text-gray-500">Complete your provider profile to start earning</p>
                  </div>
                </div>
                <button
                  onClick={closeBecomeProviderModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="p-6 space-y-6">
              {/* Error Message */}
              {providerError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {providerError}
                </div>
              )}

              {/* Role Confirmation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">You are becoming a:</p>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-red-600" />
                  <span className="text-red-600 font-semibold">Provider</span>
                  <div className="ml-auto w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Select Your Skills */}
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Select Your Skills</h2>
                <div className="grid grid-cols-3 gap-2">
                  {SKILLS.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        selectedSkills.includes(skill)
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Description */}
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-2">Service Description</h2>
                <textarea
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Describe your services and expertise..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 resize-none text-sm"
                />
              </div>

              {/* Payment Details */}
              <div>
                {!hasPaymentMethod ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(true)}
                      className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <CreditCard className="h-5 w-5" />
                      <span>Add Payment Details</span>
                    </button>
                    <p className="mt-2 text-xs text-red-600">
                      Add a payment method to verify your identity and enable payments.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-700">Payment method added successfully</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
              <Button variant="secondary" onClick={closeBecomeProviderModal} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBecomeProviderSubmit}
                disabled={isSubmitting || !hasPaymentMethod}
                isLoading={isSubmitting}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal (nested inside Become a Provider) */}
      {showPaymentForm && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPaymentForm(false);
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <Elements stripe={stripePromise}>
              <MobilePaymentCardForm
                onSuccess={() => {
                  setShowPaymentForm(false);
                  setHasPaymentMethod(true);
                }}
                onCancel={() => setShowPaymentForm(false)}
                userEmail={user?.email || null}
                userId={user?.uid || ""}
              />
            </Elements>
          </div>
        </div>
      )}
    </div>
  );
};


