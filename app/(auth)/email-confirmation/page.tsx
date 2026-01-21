"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { resendEmailVerification, getCurrentUser } from "@/lib/firebase/auth";
import { useTheme } from "@/lib/contexts/ThemeContext";

export default function EmailConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const email = searchParams.get("email");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState("");

  // Check email verification status periodically
  useEffect(() => {
    const checkVerification = async () => {
      const user = getCurrentUser();
      if (user && user.emailVerified) {
        // Check if profile is complete
        const profileComplete = await isProfileComplete(user.uid);
        if (!profileComplete) {
          router.push("/initial-profile");
        } else {
          router.push("/dashboard");
        }
      }
    };

    // Check immediately
    checkVerification();

    // Check every 2 seconds
    const interval = setInterval(checkVerification, 2000);

    return () => clearInterval(interval);
  }, [router]);

  const handleResend = async () => {
    setIsResending(true);
    setError("");
    setResendSuccess(false);

    try {
      const user = getCurrentUser();
      if (!user) {
        setError("Please sign up first to receive a verification email.");
        return;
      }
      await resendEmailVerification();
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to resend verification email. Please try again.");
    } finally {
      setIsResending(false);
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
        <div className="max-w-md w-full space-y-6 text-center">
          {/* Email Icon */}
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <Mail className="h-10 w-10 text-red-600" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Check your email</h1>
            <p className="text-gray-600">
              We've sent a confirmation link to {email ? <span className="font-semibold">{email}</span> : "your email address"}
            </p>
          </div>

          {/* Instructions */}
          <p className="text-sm text-gray-600">
            Please check your inbox and click the confirmation link to verify your email address. 
            You'll be able to sign in after verification.
          </p>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          {/* Success Message */}
          {resendSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600" role="alert">
              Verification email sent! Please check your inbox.
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? "Sending..." : "Resend Verification Email"}
            </button>

            <Link href="/login">
              <button className="w-full border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                Back to Sign In
              </button>
            </Link>
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 pt-4">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
}

