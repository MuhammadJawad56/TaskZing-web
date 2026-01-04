"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ArrowLeft, CreditCard, Check, Shield, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/firebase/AuthContext";

// Initialize Stripe - Replace with your publishable key
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_your_publishable_key_here"
);

// Card Element styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1f2937",
      fontFamily: '"Inter", sans-serif',
      "::placeholder": {
        color: "#9ca3af",
      },
      iconColor: "#6b7280",
    },
    invalid: {
      color: "#ef4444",
      iconColor: "#ef4444",
    },
  },
  hidePostalCode: false,
};

// Payment Form Component
function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { user, userData } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardholderName, setCardholderName] = useState("");

  const handleCardChange = (event: any) => {
    setCardError(event.error ? event.error.message : null);
    setCardComplete(event.complete);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

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
      // Create a payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: cardholderName,
          email: user?.email || undefined,
        },
      });

      if (error) {
        setCardError(error.message || "An error occurred");
        setIsProcessing(false);
        return;
      }

      // Here you would typically send the paymentMethod.id to your backend
      // to attach it to the customer in Stripe
      console.log("Payment Method created:", paymentMethod);

      // For demo purposes, we'll simulate a successful save
      // In production, you would:
      // 1. Send paymentMethod.id to your backend API
      // 2. Your backend attaches it to the Stripe customer
      // 3. Save reference in Firestore

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setPaymentSuccess(true);

      // Redirect after success
      setTimeout(() => {
        router.push("/dashboard/settings");
      }, 2000);
    } catch (err: any) {
      setCardError(err.message || "An unexpected error occurred");
      setIsProcessing(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Method Added!
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Your card has been saved successfully. Redirecting...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cardholder Name */}
      <div>
        <label
          htmlFor="cardholderName"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Cardholder Name
        </label>
        <input
          type="text"
          id="cardholderName"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-darkBlue-003 dark:text-white transition-all"
          required
        />
      </div>

      {/* Card Details */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Card Details
        </label>
        <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-darkBlue-003 transition-all focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
          <CardElement options={cardElementOptions} onChange={handleCardChange} />
        </div>
        {cardError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{cardError}</p>
        )}
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-darkBlue-003 rounded-lg">
        <Shield className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p className="font-medium text-gray-900 dark:text-white">Secure Payment</p>
          <p>
            Your payment information is encrypted and securely processed by Stripe.
            We never store your full card details.
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        className="w-full py-3"
        disabled={!stripe || isProcessing || !cardComplete}
        isLoading={isProcessing}
      >
        {isProcessing ? "Saving..." : "Save Payment Method"}
      </Button>

      {/* Test Card Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
          🧪 Test Mode - Use these test card numbers:
        </p>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Success: 4242 4242 4242 4242</li>
          <li>• Decline: 4000 0000 0000 0002</li>
          <li>• Use any future date, any 3-digit CVC, any ZIP</li>
        </ul>
      </div>
    </form>
  );
}

// Main Page Component
export default function PaymentMethodPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push("/dashboard/settings")}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Settings</span>
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-primary-500" />
          Add Payment Method
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Add a credit or debit card to make payments on TaskZing
        </p>
      </div>

      {/* Payment Card */}
      <Card className="dark:bg-darkBlue-203 dark:border-gray-700">
        <CardContent className="p-6 md:p-8">
          {/* Accepted Cards */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">Accepted:</span>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs font-bold text-blue-700 dark:text-blue-300">
                VISA
              </div>
              <div className="px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded text-xs font-bold text-red-600 dark:text-red-300">
                MasterCard
              </div>
              <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs font-bold text-blue-600 dark:text-blue-300">
                AMEX
              </div>
              <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded text-xs font-bold text-orange-600 dark:text-orange-300">
                Discover
              </div>
            </div>
          </div>

          {/* Stripe Elements Form */}
          <Elements stripe={stripePromise}>
            <PaymentForm />
          </Elements>
        </CardContent>
      </Card>

      {/* Security Badges */}
      <div className="mt-6 flex items-center justify-center gap-6 text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          <span className="text-xs">SSL Encrypted</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="text-xs">PCI Compliant</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Powered by</span>
          <span className="text-xs font-bold text-[#635bff]">Stripe</span>
        </div>
      </div>
    </div>
  );
}

