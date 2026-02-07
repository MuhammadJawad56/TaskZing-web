"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { signUp, signInWithGoogle, signInWithApple, handleAppleRedirect, getUserData } from "@/lib/firebase/auth";
import { isProfileComplete } from "@/lib/firebase/users";
import { FirebaseError } from "firebase/app";
import { Eye, EyeOff } from "lucide-react";
import { useTheme } from "@/lib/contexts/ThemeContext";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const roleParam = searchParams.get("role");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  // Handle Apple redirect result on page load
  useEffect(() => {
    handleAppleRedirect().then(async (result) => {
      if (result) {
        // Check if profile is complete
        const profileComplete = await isProfileComplete(result.user.uid);
        if (!profileComplete) {
          router.push("/initial-profile");
        } else {
          // Get user data to determine role
          const userData = await getUserData(result.user.uid);
          const currentRole = userData?.currentRole || userData?.role || "provider";
          const role = userData?.role || "client";
          
          // Redirect clients to client-home, providers to dashboard
          if (role === "client" && currentRole === "client") {
            router.push("/client-home");
          } else {
            router.push("/dashboard");
          }
        }
      }
    }).catch((err) => {
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err.code));
      }
    });
  }, [router]);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please sign in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/operation-not-allowed":
        return "Email/password accounts are not enabled.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed.";
      case "auth/cancelled-popup-request":
        return "Sign-in was cancelled.";
      case "auth/account-exists-with-different-credential":
        return "An account already exists with this email.";
      case "auth/invalid-credential":
        return "Invalid credentials.";
      default:
        return "An error occurred. Please try again.";
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setIsGoogleLoading(true);

    try {
      const userCredential = await signInWithGoogle();
      
      // Check if profile is complete
      const profileComplete = await isProfileComplete(userCredential.user.uid);
      if (!profileComplete) {
        router.push("/initial-profile");
      } else {
        // Get user data to determine role
        const userData = await getUserData(userCredential.user.uid);
        const currentRole = userData?.currentRole || userData?.role || "provider";
        const role = userData?.role || "client";
        
        // Redirect clients to client-home, providers to dashboard
        if (role === "client" && currentRole === "client") {
          router.push("/client-home");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err.code));
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setError("");
    setIsAppleLoading(true);

    try {
      const userCredential = await signInWithApple();
      
      // Check if profile is complete
      const profileComplete = await isProfileComplete(userCredential.user.uid);
      if (!profileComplete) {
        router.push("/initial-profile");
      } else {
        // Get user data to determine role
        const userData = await getUserData(userCredential.user.uid);
        const currentRole = userData?.currentRole || userData?.role || "provider";
        const role = userData?.role || "client";
        
        // Redirect clients to client-home, providers to dashboard
        if (role === "client" && currentRole === "client") {
          router.push("/client-home");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      console.error("Apple Sign-in Error:", err);
      if (err instanceof FirebaseError) {
        const errorMsg = getErrorMessage(err.code);
        setError(errorMsg);
      } else if (err instanceof Error && err.message.includes('Redirecting')) {
        // This is expected for redirect flow, don't show error
        return;
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password, fullName, (roleParam as "client" | "provider") || "client");
      // Redirect to email confirmation page with email parameter
      router.push(`/email-confirmation?email=${encodeURIComponent(email)}`);
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err.code));
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Logo */}
      <div className="px-6 py-4">
        <Link href="/" className="inline-flex items-center">
          <Image
            src={theme === "dark" ? "/images/logos/Taskzing-Logo-dark-mode_1.png" : "/images/logos/Taskzing-Logo-light-mode_1.png"}
            alt="TaskZing"
            width={140}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-red-600 mb-2">Welcome</h1>
            <p className="text-gray-600 text-base">Sign up free — it only takes a minute</p>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600" role="alert">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing up..." : "Sign Up"}
            </button>

            {/* Terms and Privacy */}
            <p className="text-sm text-gray-600 text-center">
              By signing up you are agreeing to our{" "}
              <Link href="/terms-conditions" className="text-blue-600 underline hover:text-blue-700">
                Terms of Services and Privacy Policy
              </Link>
            </p>

            {/* Sign In Link */}
            <p className="text-sm text-gray-600 text-center">
              Already have an Account?{" "}
              <Link href="/login" className="text-red-600 font-medium hover:text-red-700">
                Sign In
              </Link>
            </p>

            {/* Social Sign Up */}
            <div className="space-y-3 pt-4">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading || isAppleLoading || isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span className="font-medium">Sign Up with Google</span>
              </button>

              <button
                type="button"
                onClick={handleAppleSignUp}
                disabled={isGoogleLoading || isAppleLoading || isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAppleLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                )}
                <span className="font-medium">Sign Up with Apple</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
