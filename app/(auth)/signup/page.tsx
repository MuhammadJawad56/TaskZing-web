"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { signUp, signInWithGoogle, signInWithApple, handleAppleRedirect, getUserData } from "@/lib/api/auth";
import { isProfileComplete } from "@/lib/api/users";
import { Eye, EyeOff, CreditCard, X } from "lucide-react";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
// Firebase has been unlinked; remove Firestore usage from signup

// Initialize Stripe lazily
let stripePromise: Promise<any> | null = null;

const getStripePromise = (): Promise<any> | null => {
  if (typeof window === "undefined") return null;
  
  // Return cached promise if already initialized
  if (stripePromise !== null) return stripePromise;
  
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey || stripeKey === "pk_test_your_publishable_key_here" || !stripeKey.startsWith("pk_")) {
    return null;
  }
  
  try {
    stripePromise = loadStripe(stripeKey).catch((error) => {
      console.warn("Stripe.js failed to load. Payment features will be unavailable:", error);
      stripePromise = null; // Reset on error so we can retry
      return null;
    });
    return stripePromise;
  } catch (error) {
    console.warn("Failed to initialize Stripe:", error);
    return null;
  }
};

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1f2937",
      fontFamily: '"Inter", sans-serif',
      "::placeholder": {
        color: "#9ca3af",
      },
    },
    invalid: {
      color: "#ef4444",
    },
  },
  hidePostalCode: false,
};

// Payment Card Form Component
function PaymentCardForm({ 
  onSuccess, 
  onCancel, 
  userId 
}: { 
  onSuccess: () => void; 
  onCancel: () => void;
  userId?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardholderName, setCardholderName] = useState("");

  const handleCardChange = (event: any) => {
    setCardError(event.error ? event.error.message : null);
    setCardComplete(event.complete);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    if (!cardholderName.trim()) {
      setCardError("Please enter the cardholder name");
      return;
    }

    setIsProcessing(true);
    setCardError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    try {
      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: cardholderName,
        },
      });

      if (pmError) {
        setCardError(pmError.message || "An error occurred");
        setIsProcessing(false);
        return;
      }

      if (!paymentMethod) {
        setCardError("Failed to create payment method");
        setIsProcessing(false);
        return;
      }

      // Charge $1.00 for provider verification
      const chargeResponse = await fetch("/api/stripe/charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          amount: 100, // $1.00 in cents
          userId: userId || "temp",
        }),
      });

      const chargeData = await chargeResponse.json();

      if (!chargeResponse.ok || !chargeData.success) {
        setCardError(chargeData.error || "Failed to process payment");
        setIsProcessing(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error processing payment:", err);
      setCardError(err.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Payment Card</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">
            Pay $1.00 and verify your identity to become a Provider.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cardholder Name
            </label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Details
            </label>
            <div className="p-4 border border-gray-300 rounded-lg bg-white">
              <CardElement options={cardElementOptions} onChange={handleCardChange} />
            </div>
            {cardError && (
              <p className="mt-2 text-sm text-red-600">{cardError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || isProcessing || !cardComplete}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Add card
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [signUpAs, setSignUpAs] = useState<"client" | "client+provider">(
    (roleParam === "provider" ? "client+provider" : "client") as "client" | "client+provider"
  );
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [currentStripePromise, setCurrentStripePromise] = useState<Promise<any> | null>(null);

  // Initialize Stripe promise when component mounts
  useEffect(() => {
    const promise = getStripePromise();
    if (promise) {
      setCurrentStripePromise(promise);
    }
  }, []);

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
      if (err instanceof Error) {
        setError(err.message || "An error occurred. Please try again.");
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
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
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
      if (err instanceof Error && err.message.includes("Redirecting")) {
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

    // Check payment method requirement for Client + Provider
    if (signUpAs === "client+provider") {
      if (!currentStripePromise) {
        setError("Payment processing is not available. Please try again later.");
        return;
      }
      if (!hasPaymentMethod) {
        setError("Please add a payment card to continue with Client + Provider registration.");
        return;
      }
    }

    setIsLoading(true);

    try {
      // Sign up with role - use "client+provider" for both roles
      const role = signUpAs === "client+provider" ? "client+provider" : "client";
      await signUp(email, password, fullName, role);
      // Redirect to email confirmation page with email parameter
      router.push(`/email-confirmation?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
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

            {/* Payment Card Section (for Client + Provider) */}
            {signUpAs === "client+provider" && (
              <div>
                {hasPaymentMethod ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-700">Payment card added successfully</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-base font-medium text-gray-900 text-center">
                      Pay $1.00 and verify your identity to become a Provider.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(true)}
                      className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Add card
                    </button>
                    <p className="text-xs text-red-600 text-center">
                      Add a verified card to continue with provider registration.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(true)}
                      className="w-full px-4 py-3 border border-red-600 bg-white text-red-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 hover:bg-red-50"
                    >
                      <CreditCard className="h-4 w-4" />
                      Manage cards
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={isLoading || (signUpAs === "client+provider" && !hasPaymentMethod)}
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

      {/* Payment Form Modal */}
      {showPaymentForm && currentStripePromise ? (
        <Elements stripe={currentStripePromise}>
          <PaymentCardForm
            onSuccess={() => {
              setShowPaymentForm(false);
              setHasPaymentMethod(true);
            }}
            onCancel={() => setShowPaymentForm(false)}
          />
        </Elements>
      ) : showPaymentForm && !currentStripePromise ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Configuration Error</h3>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables.
            </p>
            <button
              onClick={() => setShowPaymentForm(false)}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
