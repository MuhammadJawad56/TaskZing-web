"use client";

import React from "react";
import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLanguage = language === "english" ? "french" : "english";
    setLanguage(newLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-theme-accent2 dark:hover:bg-darkBlue-203 transition-colors text-theme-primaryText dark:text-white"
      aria-label={`Switch language to ${language === "english" ? "French" : "English"}`}
    >
      <Languages className="h-4 w-4" />
      <span className="text-sm font-semibold">
        {language === "english" ? "ENG" : "FR"}
      </span>
    </button>
  );
};

