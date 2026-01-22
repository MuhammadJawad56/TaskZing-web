"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Send, Video, Menu, MessageSquare, ArrowLeftRight, Briefcase, Check, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/firebase/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { switchUserRole } from "@/lib/firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

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

// Payment Card Form Component
function PaymentCardForm({ onSuccess, onCancel, userEmail }: { onSuccess: () => void; onCancel: () => void; userEmail: string | null }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
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
    if (!stripe || !elements || !user) return;

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

      // Save payment method to Firestore
      const paymentMethodData = {
        userId: user.uid,
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
      console.error("Error creating payment method:", err);
      setCardError(err.message || "Failed to add payment method. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Add Payment Method</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {cardError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{cardError}</div>
      )}

      <div>
        <label htmlFor="cardholder-name" className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
        <input
          id="cardholder-name"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-red-500">
          <CardElement options={cardElementOptions} onChange={handleCardChange} />
        </div>
      </div>

      <Button type="submit" isLoading={isProcessing} disabled={!stripe || !elements || !cardComplete || isProcessing} className="w-full">
        {isProcessing ? "Adding Card..." : "Add Card"}
      </Button>
    </form>
  );
}

interface DashboardHeaderProps {
  onMenuToggle?: () => void;
  onQRClick?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onMenuToggle, onQRClick }) => {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [isSwitching, setIsSwitching] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [hasProviderProfile, setHasProviderProfile] = useState(false);
  const currentRole = userData?.currentRole || userData?.role || "provider";
  const switchTarget = currentRole === "client" ? "provider" : "client";
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
    } else {
      setHasProviderProfile(false);
    }
  }, [userData, isClientOnly]);

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

  const userName = user?.displayName || userData?.fullName || user?.email?.split("@")[0] || "U";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleSwitchRole = () => {
    if (!user) {
      alert("Please log in to switch roles.");
      return;
    }
    
    // If client-only and doesn't have provider profile, show Become a Provider modal
    if (isClientOnly && !hasProviderProfile) {
      setShowBecomeProviderModal(true);
      return;
    }
    
    // Show confirmation modal for both client and provider
    setShowSwitchModal(true);
  };


  const performRoleSwitch = async () => {
    if (!user) return;
    
    setShowSwitchModal(false);
    setIsSwitching(true);
    try {
      // Switch the role in Firestore (only updates currentRole)
      await switchUserRole(user.uid, switchTarget);
      
      // Wait a moment for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate based on new role - use window.location for reliable redirect
      if (switchTarget === "client") {
        // Always redirect to client-home when switching to client
        window.location.href = "/client-home";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      console.error("Error switching role:", error);
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
    <header className="sticky top-0 z-50 w-full border-b border-theme-accent2 bg-[var(--app-surface)] dark:border-gray-700 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
<Link href="/dashboard" className="flex items-center lg:-ml-[10%]">
              <Image
                src={theme === "dark" ? "/images/logos/Taskzing-Logo-dark-mode_1.png" : "/images/logos/Taskzing-Logo-light-mode_1.png"}
              alt="TaskZing"
              width={140}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 lg:-mr-[10%]">
            {/* Switch to Client/Provider Button - Hidden on mobile/tablet */}
            <button
              type="button"
              onClick={handleSwitchRole}
              disabled={isSwitching}
              className="hidden lg:flex items-center justify-center h-9 px-3 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSwitching 
                ? "Switching..." 
                : isClientOnly && !hasProviderProfile
                  ? "Become a Provider"
                  : `Switch to ${switchTarget === "client" ? "Client" : "Provider"}`
              }
            </button>

            {/* Icons - Always visible */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBlue-003 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-gray-700 dark:text-white" />
            </button>

            <Link
              href="/dashboard/messages"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBlue-003 transition-colors"
              aria-label="Messages"
            >
              <MessageSquare className="h-5 w-5 text-gray-700 dark:text-white" />
            </Link>

            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBlue-003 transition-colors"
              aria-label="Video"
            >
              <Video className="h-5 w-5 text-gray-700 dark:text-white" />
            </button>

            {/* AI Button - Gradient Ring Icon */}
            <Link
              href="/dashboard/chatzing-ai"
              className="flex items-center justify-center hover:scale-110 transition-transform"
              aria-label="ChatZing AI"
            >
              <div className="relative w-8 h-8">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <linearGradient id="aiGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="25%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="75%" stopColor="#d946ef" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#aiGradient)"
                    strokeWidth="12"
                  />
                </svg>
              </div>
            </Link>

            {/* Hamburger Menu - Visible on mobile/tablet, hidden on desktop */}
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkBlue-003 transition-colors"
              aria-label="Menu"
            >
              <div className="flex flex-col gap-1">
                <div className="w-4 h-0.5 bg-gray-700 dark:bg-white"></div>
                <div className="w-5 h-0.5 bg-gray-700 dark:bg-white"></div>
                <div className="w-4 h-0.5 bg-gray-700 dark:bg-white"></div>
              </div>
            </button>

            {/* User Avatar - Hidden on mobile/tablet, visible on desktop */}
            <button
              className="hidden lg:flex relative"
              onClick={() => router.push("/dashboard/settings")}
              aria-label="User menu"
            >
              <div className="h-10 w-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold">
                {userInitial}
              </div>
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-gray-400 border-2 border-white dark:border-darkBlue-013"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Switch Role Confirmation Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <ArrowLeftRight className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Switch to {switchTarget === "client" ? "Client" : "Provider"}
              </h2>
            </div>

            {/* Modal Body */}
            <div className="px-6 pb-6">
              {switchTarget === "client" ? (
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
              <PaymentCardForm
                onSuccess={() => {
                  setShowPaymentForm(false);
                  setHasPaymentMethod(true);
                }}
                onCancel={() => setShowPaymentForm(false)}
                userEmail={user?.email || null}
              />
            </Elements>
          </div>
        </div>
      )}

    </header>
  );
};


