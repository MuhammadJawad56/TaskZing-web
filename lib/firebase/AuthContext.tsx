"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { User } from "firebase/auth";
import { onAuthChange, getUserData, UserData, signOut } from "./auth";

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = onAuthChange(async (firebaseUser) => {
        if (!isMounted) return;
        
        try {
          setUser(firebaseUser);
          
          if (firebaseUser) {
            // Fetch additional user data from Firestore
            try {
              const data = await getUserData(firebaseUser.uid);
              if (isMounted) {
                setUserData(data);
              }
            } catch (error) {
              console.error("Error fetching user data:", error);
              if (isMounted) {
                setUserData(null);
              }
            }
          } else {
            if (isMounted) {
              setUserData(null);
            }
          }
        } catch (error) {
          console.error("Auth state change error:", error);
        } finally {
          if (isMounted) {
            setLoading(false);
            initializedRef.current = true;
          }
        }
      });
    } catch (error) {
      console.error("Error setting up auth listener:", error);
      if (isMounted) {
        setLoading(false);
        initializedRef.current = true;
      }
    }

    // Set a timeout to ensure loading doesn't get stuck
    const timeout = setTimeout(() => {
      if (isMounted && !initializedRef.current) {
        console.warn("Auth initialization timeout - setting loading to false");
        setLoading(false);
        initializedRef.current = true;
      }
    }, 2000); // 2 second timeout

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      clearTimeout(timeout);
    };
  }, []);

  const logout = async () => {
    try {
      // Clear Firebase auth state
      await signOut();
      
      // Clear local state
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Logout error in AuthContext:", error);
      // Still clear local state even if Firebase signOut fails
      setUser(null);
      setUserData(null);
      throw error; // Re-throw to let the caller handle it
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

