"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { signIn, signInWithGoogle, signInWithApple, handleAppleRedirect, setAuthCookie } from "@/lib/firebase/auth";
import { FirebaseError } from "firebase/app";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  // Handle Apple redirect result on page load
  useEffect(() => {
    handleAppleRedirect().then((result) => {
      if (result) {
        setAuthCookie(result.user);
        router.push(redirect);
      }
    }).catch((err) => {
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err.code));
      }
    });
  }, [router, redirect]);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password.";
      case "auth/invalid-credential":
        return "Invalid email or password.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed. Please try again.";
      case "auth/cancelled-popup-request":
        return "Sign-in was cancelled. Please try again.";
      case "auth/popup-blocked":
        return "Popup was blocked by browser. Please allow popups and try again.";
      case "auth/unauthorized-domain":
        return "This domain is not authorized. Please contact support.";
      case "auth/operation-not-allowed":
        return "Google sign-in is not enabled. Please contact support.";
      case "auth/account-exists-with-different-credential":
        return "An account already exists with a different sign-in method.";
      case "auth/invalid-credential":
        return "Invalid credential. Please try again.";
      default:
        return "An error occurred. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const userCredential = await signIn(email, password);
      // Set cookie for middleware
      setAuthCookie(userCredential.user);
      router.push(redirect);
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

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);

    try {
      const userCredential = await signInWithGoogle();
      // Set cookie for middleware
      setAuthCookie(userCredential.user);
      router.push(redirect);
    } catch (err) {
      console.error("Google Sign-in Error:", err);
      if (err instanceof FirebaseError) {
        // Show more detailed error for debugging
        const errorMsg = getErrorMessage(err.code);
        setError(`${errorMsg} (Code: ${err.code})`);
      } else {
        setError(`An error occurred: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError("");
    setIsAppleLoading(true);

    try {
      const userCredential = await signInWithApple();
      // Set cookie for middleware
      setAuthCookie(userCredential.user);
      router.push(redirect);
    } catch (err) {
      console.error("Apple Sign-in Error:", err);
      if (err instanceof FirebaseError) {
        const errorMsg = getErrorMessage(err.code);
        setError(errorMsg);
      } else if (err instanceof Error && err.message.includes('Redirecting')) {
        // This is expected for redirect flow, don't show error
        return;
      } else {
        setError(`An error occurred: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-primaryBackground dark:bg-darkBlue-003 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-theme-primaryText dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-theme-accent4 dark:text-gray-300">
            Or{" "}
            <Link href="/signup" className="font-medium text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300">
              create a new account
            </Link>
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-darkBlue-203 border border-accent-error dark:border-red-500 rounded-lg text-sm text-accent-error dark:text-red-300" role="alert">
                  {error}
                </div>
              )}
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-label="Email address"
              />
              <div>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  aria-label="Password"
                />
                <div className="mt-2 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary-500 hover:text-primary-600"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
                Sign in
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-darkBlue-203"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-darkBlue-203 text-gray-500 dark:text-gray-300">Or continue with</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isAppleLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-darkBlue-203 rounded-lg shadow-sm bg-white dark:bg-darkBlue-203 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-darkBlue-343 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-darkBlue-003 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGoogleLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin"></div>
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
                  <span className="font-medium">
                    {isGoogleLoading ? "Signing in..." : "Continue with Google"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleAppleSignIn}
                  disabled={isGoogleLoading || isAppleLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-darkBlue-203 rounded-lg shadow-sm bg-white dark:bg-darkBlue-203 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-darkBlue-343 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-darkBlue-003 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAppleLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  )}
                  <span className="font-medium">
                    {isAppleLoading ? "Signing in..." : "Continue with Apple"}
                  </span>
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

