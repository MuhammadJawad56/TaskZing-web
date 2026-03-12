"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Briefcase, Check, CreditCard, Plus } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { updateUserProfile } from "@/lib/api/auth";
import { addStoredPaymentMethod, getStoredPaymentMethods } from "@/lib/api/payments";
import { Button } from "@/components/ui/Button";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Initialize Stripe only if key is available
const getStripePromise = () => {
  if (typeof window === "undefined") return null;
  
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey || stripeKey === "pk_test_your_publishable_key_here" || !stripeKey.startsWith("pk_")) {
    return null;
  }
  
  try {
    return loadStripe(stripeKey);
  } catch (error) {
    console.error("Failed to load Stripe:", error);
    return null;
  }
};

const stripePromise = getStripePromise();

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
function PaymentCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardholderName, setCardholderName] = useState("");

  const handleCardChange = (event: any) => {
    setCardError(null);
    setCardComplete(event.complete);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user) return;

    if (!cardholderName.trim()) {
      setCardError("Please enter the cardholder name");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setCardError("Card element not found");
      return;
    }

    setIsProcessing(true);
    setCardError(null);

    try {
      const { token, error } = await stripe.createToken(cardElement, {
        name: cardholderName.trim(),
      });

      if (error) {
        setCardError(error.message || "Failed to process card");
        setIsProcessing(false);
        return;
      }

      if (!token) {
        setCardError("Failed to create payment token");
        setIsProcessing(false);
        return;
      }

      const paymentMethodData = {
        id: token.id,
        tokenId: token.id,
        cardBrand: token.card?.brand || "unknown",
        last4: token.card?.last4 || "0000",
        expMonth: token.card?.exp_month || 0,
        expYear: token.card?.exp_year || 0,
        cardholderName: cardholderName.trim(),
        createdAt: new Date().toISOString(),
        isDefault: true,
      };
      addStoredPaymentMethod(user.uid, paymentMethodData);

      onSuccess();
    } catch (err: any) {
      console.error("Error saving payment method:", err);
      setCardError(err.message || "Failed to save payment method");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Payment Details</h3>
      
      {cardError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {cardError}
        </div>
      )}

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
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div className="p-4 border border-gray-300 rounded-lg bg-white">
            <CardElement
              options={cardElementOptions}
              onChange={handleCardChange}
            />
          </div>
        </div>

        <p className="text-xs text-red-600">
          Add a payment method to verify your identity. It will also enable future payments.
        </p>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!cardComplete || isProcessing}
            isLoading={isProcessing}
            className="flex-1"
          >
            Add Card
          </Button>
        </div>
      </form>
    </div>
  );
}

interface BecomeProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const SKILLS = [
  "Cleaning",
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "Landscaping",
  "Moving",
  "Delivery",
  "IT Support",
  "Web Development",
  "Graphic Design",
  "Photography",
  "Tutoring",
  "Consulting",
  "Legal Services",
  "Financial Services",
  "Others",
];

export const BecomeProviderModal: React.FC<BecomeProviderModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { user, userData } = useAuth();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [serviceDescription, setServiceDescription] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Check if user has payment methods
  useEffect(() => {
    const checkPaymentMethods = async () => {
      if (!user) return;

      try {
        setHasPaymentMethod(getStoredPaymentMethods(user.uid).length > 0);
      } catch (error) {
        console.error("Error checking payment methods:", error);
      }
    };

    if (isOpen && user) {
      checkPaymentMethods();
    }
  }, [isOpen, user]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("Please sign in to continue");
      return;
    }

    if (selectedSkills.length === 0) {
      setError("Please select at least one skill");
      return;
    }

    if (!serviceDescription.trim()) {
      setError("Please provide a service description");
      return;
    }

    if (!hasPaymentMethod) {
      setError("Please add a payment method to continue");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await updateUserProfile(user.uid, {
        role: "client+provider",
        currentRole: "provider",
        skills: selectedSkills,
        bio: serviceDescription.trim(),
        about: serviceDescription.trim(),
        providerProfileCompleted: true,
      });

      onComplete();
    } catch (err: any) {
      console.error("Error updating provider profile:", err);
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Become a Provider</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Role Confirmation */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">You are becoming a:</p>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-red-600" />
              <span className="text-red-600 font-medium">Provider</span>
              <div className="ml-auto w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Select Your Skills */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Your Skills</h3>
            <div className="grid grid-cols-3 gap-2">
              {SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Service Description</h3>
            <textarea
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Describe your services and expertise..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 resize-none"
            />
          </div>

          {/* Payment Details */}
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
                Add a payment method to verify your identity. It will also enable future payments.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">Payment method added</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !hasPaymentMethod}
            isLoading={isSubmitting}
            className="flex-1"
          >
            Done
          </Button>
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && stripePromise ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <Elements stripe={stripePromise}>
              <PaymentCardForm
                onSuccess={() => {
                  setShowPaymentForm(false);
                  setHasPaymentMethod(true);
                }}
                onCancel={() => setShowPaymentForm(false)}
              />
            </Elements>
          </div>
        </div>
      ) : showPaymentForm && !stripePromise ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
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
            <Button
              onClick={() => setShowPaymentForm(false)}
              variant="primary"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(modalContent, document.body);
};
