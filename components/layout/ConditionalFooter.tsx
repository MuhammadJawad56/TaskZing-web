"use client";

import { Footer } from "./Footer";
import { useAuth } from "@/lib/firebase/AuthContext";

export function ConditionalFooter() {
  const { user, loading } = useAuth();
  
  // Hide footer when user is logged in (on dashboard pages)
  if (!loading && user) {
    return null;
  }
  
  return <Footer />;
}

