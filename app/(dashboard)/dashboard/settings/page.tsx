"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Moon, 
  Sun, 
  CreditCard, 
  Bell, 
  MessageSquare, 
  FileText, 
  Globe, 
  UserX, 
  LogOut 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { useAuth } from "@/lib/firebase/AuthContext";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    setIsLoggingOut(true);
    
    try {
      // Call Firebase logout (this will clear auth state and cookies)
      await logout();
      
      // Clear all cookies explicitly
      if (typeof document !== "undefined") {
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "auth-token=; path=/; domain=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      
      // Force redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, try to redirect
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };



  const settingsItems = [
    {
      icon: theme === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />,
      title: t("settings.darkLightMode"),
      description: theme === "light" ? t("settings.currentlyLight") : t("settings.currentlyDark"),
      action: (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {theme === "light" ? t("settings.light") : t("settings.dark")}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleTheme();
            }}
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
      ),
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      title: t("settings.paymentMethod"),
      description: t("settings.addAccountDetails"),
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/payment-method")}
        >
          {t("settings.addPayment")}
        </Button>
      ),
    },
    {
      icon: <Bell className="h-5 w-5" />,
      title: t("settings.notifications"),
      description: t("settings.toggleNotifications"),
      action: (
        <Toggle
          checked={notifications}
          onChange={setNotifications}
        />
      ),
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: t("settings.suggestions"),
      description: t("settings.suggestionsDesc"),
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/suggestions-complaints")}
        >
          {t("settings.submitFeedback")}
        </Button>
      ),
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: t("settings.terms"),
      description: t("settings.termsDesc"),
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/terms-conditions")}
        >
          {t("settings.viewTerms")}
        </Button>
      ),
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: t("settings.language"),
      description: t("settings.chooseLanguage"),
      action: (
        <div className="flex gap-2">
          <Button
            variant={language === "english" ? "primary" : "outline"}
            size="sm"
            onClick={() => setLanguage("english")}
          >
            {t("settings.english")}
          </Button>
          <Button
            variant={language === "french" ? "primary" : "outline"}
            size="sm"
            onClick={() => setLanguage("french")}
          >
            {t("settings.french")}
          </Button>
        </div>
      ),
    },
    {
      icon: <UserX className="h-5 w-5" />,
      title: t("settings.accountDeactivation"),
      description: t("settings.deactivateAccount"),
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/account-deactivation")}
        >
          {t("settings.deactivate")}
        </Button>
      ),
    },
    {
      icon: <LogOut className="h-5 w-5" />,
      title: t("settings.logOut"),
      description: t("settings.signOut"),
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          isLoading={isLoggingOut}
        >
          {isLoggingOut ? t("settings.loggingOut") : t("settings.logOut")}
        </Button>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-primaryText dark:text-white">{t("settings.title")}</h1>
        <p className="text-theme-accent4 dark:text-gray-300 mt-2">{t("settings.description")}</p>
      </div>

      <div className="space-y-4">
        {settingsItems.map((item, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow dark:bg-darkBlue-203 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-primary-500 flex-shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-theme-primaryText dark:text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-theme-accent4 dark:text-gray-300">{item.description}</p>
                  </div>
                </div>
                <div className="ml-4">{item.action}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}

