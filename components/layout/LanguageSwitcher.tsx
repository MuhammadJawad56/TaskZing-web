"use client";

import React, { useState, useEffect } from "react";
import { Languages } from "lucide-react";

export const LanguageSwitcher: React.FC = () => {
  const [language, setLanguage] = useState<"en" | "fr">("en");

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = localStorage.getItem("taskzing_language") as "en" | "fr" | null;
    if (savedLanguage === "en" || savedLanguage === "fr") {
      setLanguage(savedLanguage);
    }
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === "en" ? "fr" : "en";
    setLanguage(newLanguage);
    localStorage.setItem("taskzing_language", newLanguage);
    
    // You can add more logic here to actually change the page language
    // For now, this just toggles the display
    // In a full implementation, you'd use next-intl or similar i18n library
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-theme-accent2 transition-colors text-theme-primaryText"
      aria-label={`Switch language to ${language === "en" ? "French" : "English"}`}
    >
      <Languages className="h-4 w-4" />
      <span className="text-sm font-semibold">
        {language === "en" ? "ENG" : "FR"}
      </span>
    </button>
  );
};

