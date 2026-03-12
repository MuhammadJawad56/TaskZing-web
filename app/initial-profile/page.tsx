"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, X, Plus, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { getUserData, updateUserProfile, type UserData } from "@/lib/api/auth";
import { addStoredPaymentMethod, getStoredPaymentMethods } from "@/lib/api/payments";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Initialize Stripe only if key is available
const getStripePromise = () => {
  if (typeof window === "undefined") return null; // Server-side check
  
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
    setCardError(event.error ? event.error.message : null);
    setCardComplete(event.complete);
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
      setIsProcessing(false);
      return;
    }

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: cardholderName,
          email: user.email || undefined,
        },
      });

      if (error) {
        setCardError(error.message || "An error occurred");
        setIsProcessing(false);
        return;
      }

      if (!paymentMethod) {
        setCardError("Failed to create payment method");
        setIsProcessing(false);
        return;
      }

      const paymentMethodData = {
        id: paymentMethod.id,
        paymentMethodId: paymentMethod.id,
        cardBrand: paymentMethod.card?.brand || "unknown",
        last4: paymentMethod.card?.last4 || "",
        expMonth: paymentMethod.card?.exp_month || 0,
        expYear: paymentMethod.card?.exp_year || 0,
        createdAt: new Date().toISOString(),
        cardholderName,
      };
      addStoredPaymentMethod(user.uid, paymentMethodData);
      onSuccess();
    } catch (err: any) {
      console.error("Error saving payment method:", err);
      setCardError(err.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Payment Card</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cardholder Name
            </label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Card Details
            </label>
            <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              <CardElement options={cardElementOptions} onChange={handleCardChange} />
            </div>
            {cardError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{cardError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || isProcessing || !cardComplete}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : "Add Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InitialProfilePage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(true);

  // Form state
  const [username, setUsername] = useState("");
  const [isUsernameReadOnly, setIsUsernameReadOnly] = useState(false);
  const [signUpAs, setSignUpAs] = useState<"client" | "client+provider">("client");
  const [location, setLocation] = useState("");
  const [aboutYou, setAboutYou] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const MIN_WORDS = 50; // Minimum word count for About You
  const MAX_WORDS = 1500; // Maximum word count for About You

  // Helper function to count words (counts each character including spaces as a word)
  const countWords = React.useCallback((text: string): number => {
    if (!text || typeof text !== 'string') return 0;
    
    // Count every character (including spaces, letters, numbers, punctuation) as a word
    return text.length;
  }, []);

  // Memoize word count to avoid recalculating on every render
  const wordCount = React.useMemo(() => countWords(aboutYou), [aboutYou, countWords]);

  // Check if user signed up with Google/Apple
  useEffect(() => {
    if (user) {
      const isSocialSignIn = Boolean(
        userData?.email &&
          userData.email === user.email &&
          (userData.role === "client" || userData.role === "client+provider")
      );

      if (isSocialSignIn) {
        setIsUsernameReadOnly(true);
        // Set username from displayName or email
        setUsername(user.displayName || user.email?.split("@")[0] || "");
      } else {
        setIsUsernameReadOnly(false);
        // Set username from email if available
        setUsername(user.email?.split("@")[0] || "");
      }

      // Load existing user data
      loadUserData();
      checkPaymentMethods();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const data = await getUserData(user.uid);
      if (data) {
        if ((data as UserData & { username?: string }).username) {
          setUsername((data as UserData & { username?: string }).username || "");
        }
        if (data.location) setLocation(data.location);
        if (data.bio || data.about) setAboutYou(data.bio || data.about || "");
        if (data.skills && Array.isArray(data.skills)) setSkills(data.skills);
        if (data.role === "client+provider" || data.role === "both") {
          setSignUpAs("client+provider");
        }
      }
    } catch (err) {
      console.error("Error loading user data:", err);
    }
  };

  const checkPaymentMethods = async () => {
    if (!user) return;

    try {
      setIsCheckingPayment(true);
      setHasPaymentMethod(getStoredPaymentMethods(user.uid).length > 0);
    } catch (err) {
      console.error("Error checking payment methods:", err);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Use reverse geocoding to get address
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              setLocation(data.results[0].formatted_address);
            } else {
              setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
            }
          } catch (err) {
            setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to get your location. Please enter it manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (!location.trim()) {
      setError("Location is required");
      return;
    }

    if (!aboutYou.trim()) {
      setError("About You is required");
      return;
    }

    const currentWordCount = countWords(aboutYou);
    if (currentWordCount < MIN_WORDS) {
      setError(`About You must have at least ${MIN_WORDS} words. You have ${currentWordCount} ${currentWordCount === 1 ? 'word' : 'words'}.`);
      return;
    }

    if (currentWordCount > MAX_WORDS) {
      setError(`About You must not exceed ${MAX_WORDS} words. You have ${currentWordCount} words.`);
      return;
    }

    // Check payment method requirement for Client + Provider
    if (signUpAs === "client+provider") {
      if (!stripePromise) {
        setError("Stripe is not configured. Please configure payment settings to continue.");
        return;
      }
      if (!hasPaymentMethod) {
        setError("Payment card is required for Client + Provider role");
        return;
      }
    }

    if (!user) {
      setError("Please sign in to continue");
      return;
    }

    setIsLoading(true);

    try {
      const updateData: Partial<UserData> & {
        username: string;
        profileCompleted: boolean;
      } = {
        username: username.trim(),
        location: location.trim(),
        bio: aboutYou.trim(),
        about: aboutYou.trim(),
        skills: skills,
        role: signUpAs === "client+provider" ? "client+provider" : "client",
        // Set currentRole to "provider" for client+provider so they see provider dashboard
        // Set to "client" for client-only so they see client home
        currentRole: signUpAs === "client+provider" ? "provider" : "client",
        profileCompleted: true,
        providerProfileCompleted: signUpAs === "client+provider",
        fullName: user.displayName || username,
      };
      await updateUserProfile(user.uid, updateData);

      // Redirect based on role
      if (signUpAs === "client+provider") {
        // Redirect to provider dashboard for Client + Provider
        router.push("/provider-dashboard");
      } else {
        // Redirect to client home page for Client only
        router.push("/client-home");
      }
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isCheckingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
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
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto w-full">
        <div className="space-y-6">
          {/* Heading */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Hey we are almost done</h1>
            <p className="text-gray-600">Fill up the information below to create your profile</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-gray-900">Username</label>
                {isUsernameReadOnly && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    Read Only
                  </span>
                )}
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => !isUsernameReadOnly && setUsername(e.target.value)}
                placeholder="Username"
                disabled={isUsernameReadOnly}
                required
                className={`
                  w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500
                  ${isUsernameReadOnly 
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300" 
                    : "bg-gray-50 border-red-300 text-gray-900"
                  }
                `}
              />
            </div>

            {/* Sign Up as */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Sign Up as</label>
              <div className="relative">
                <select
                  value={signUpAs}
                  onChange={(e) => setSignUpAs(e.target.value as "client" | "client+provider")}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 appearance-none cursor-pointer"
                >
                  <option value="client">Client</option>
                  <option value="client+provider">Client + Provider</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {signUpAs === "client+provider" && (
                <p className="mt-1 text-xs text-red-600">Will also enable future payments.</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Location</label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Address e.g ABC324 State Canada"
                  required
                  className="w-full px-4 py-3 pr-20 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {location && (
                    <button
                      type="button"
                      onClick={() => setLocation("")}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLocationClick}
                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* About You */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900">About You</label>
                <span className={`text-xs ${
                  wordCount < MIN_WORDS || wordCount > MAX_WORDS 
                    ? 'text-red-600' 
                    : 'text-gray-500'
                }`}>
                  {wordCount}/{MAX_WORDS} words
                  {wordCount < MIN_WORDS && ` (min: ${MIN_WORDS})`}
                </span>
              </div>
              <textarea
                value={aboutYou}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const newWordCount = countWords(newValue);
                  
                  // Allow typing up to max words, but prevent if already at max
                  // Also allow deletion even if over limit
                  if (newWordCount <= MAX_WORDS || newValue.length < aboutYou.length) {
                    setAboutYou(newValue);
                  }
                }}
                placeholder="Tell us about yourself... (Minimum 50 words required)"
                required
                rows={4}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 text-gray-900 resize-none ${
                  wordCount < MIN_WORDS || wordCount > MAX_WORDS
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-red-500'
                }`}
              />
              {wordCount < MIN_WORDS && (
                <p className="mt-1 text-xs text-red-600">
                  Minimum {MIN_WORDS} words required. You have {wordCount} {wordCount === 1 ? 'word' : 'words'}.
                </p>
              )}
              {wordCount > MAX_WORDS && (
                <p className="mt-1 text-xs text-red-600">
                  Maximum {MAX_WORDS} words allowed. You have {wordCount} words.
                </p>
              )}
            </div>

            {/* Your Skills - Only visible for Client + Provider */}
            {signUpAs === "client+provider" && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Your Skills</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Enter a skill (e.g. Developer)"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payment Card Section (for Client + Provider) */}
            {signUpAs === "client+provider" && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Payment Card <span className="text-red-600">*</span>
                </label>
                {hasPaymentMethod ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-700">Payment card added successfully</span>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 mb-3">
                      Payment card is required for Client + Provider role
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(true)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Add Payment Card
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || (signUpAs === "client+provider" && !hasPaymentMethod)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Saving..." : "Complete Profile"}
            </button>
          </form>
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && stripePromise ? (
        <Elements stripe={stripePromise}>
          <PaymentCardForm
            onSuccess={() => {
              setShowPaymentForm(false);
              checkPaymentMethods();
            }}
            onCancel={() => setShowPaymentForm(false)}
          />
        </Elements>
      ) : showPaymentForm && !stripePromise ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration Error</h3>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
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
