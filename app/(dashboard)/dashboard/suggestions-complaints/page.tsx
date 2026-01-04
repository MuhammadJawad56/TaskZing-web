"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Camera, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/lib/firebase/AuthContext";

export default function SuggestionsComplaintsPage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedbackType, setFeedbackType] = useState<"suggestion" | "complaint">("suggestion");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = user?.email || userData?.email || "";
  const userName = user?.displayName || userData?.fullName || (userEmail ? userEmail.split("@")[0] : "User");

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-theme-accent4">Loading...</div>
        </div>
      </div>
    );
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 3) {
      alert("You can only upload up to 3 images");
      return;
    }

    const newImages = [...images, ...files.slice(0, 3 - images.length)];
    setImages(newImages);

    // Create previews
    const newPreviews = newImages.map((file) => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Revoke object URLs to free memory
    URL.revokeObjectURL(imagePreviews[index]);
    
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement feedback submission to Firestore or API
      // Upload images to Firebase Storage if needed
      // For now, we'll just show a success message
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      
      alert("Thank you for your feedback! We'll review it and get back to you soon.");
      
      // Reset form
      setSubject("");
      setMessage("");
      setFeedbackType("suggestion");
      setImages([]);
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImagePreviews([]);
      
      // Optionally redirect back to settings
      // router.push("/dashboard/settings");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard/settings")}
          className="mb-4 flex items-center text-theme-primaryText hover:text-primary-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold text-theme-primaryText">Suggestions & Complaints</h1>
        <p className="text-theme-accent4 mt-2">Share your feedback or report issues to help us improve</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* User Information */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-theme-accent2">
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold text-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-theme-primaryText">{userName}</h3>
              <p className="text-sm text-theme-accent4">{userEmail}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-theme-primaryText mb-2">
                Your Email
              </label>
              <Input
                type="email"
                value={userEmail}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Feedback Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-theme-primaryText mb-3">
                Feedback Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFeedbackType("suggestion")}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    feedbackType === "suggestion"
                      ? "bg-gray-200 text-blue-900"
                      : "bg-primary-500 text-white hover:bg-primary-600"
                  }`}
                >
                  Suggestion
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType("complaint")}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    feedbackType === "complaint"
                      ? "bg-gray-200 text-blue-900"
                      : "bg-primary-500 text-white hover:bg-primary-600"
                  }`}
                >
                  Complaint
                </button>
              </div>
            </div>

            {/* Subject Field */}
            <div>
              <label className="block text-sm font-medium text-theme-primaryText mb-2">
                Subject <span className="text-accent-error">*</span>
              </label>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What is your feedback about?"
                required
              />
            </div>

            {/* Message Field */}
            <div>
              <label className="block text-sm font-medium text-theme-primaryText mb-2">
                Message <span className="text-accent-error">*</span>
              </label>
              <div className="relative">
                <div className="absolute top-3 right-3 text-xs text-theme-accent4 z-10">
                  {message.length}/1500
                </div>
                <Textarea
                  value={message}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 1500) {
                      setMessage(value);
                    }
                  }}
                  placeholder="Please provide detailed feedback..."
                  rows={8}
                  required
                  className="pr-16"
                />
              </div>
            </div>

            {/* Evidence Images */}
            <div>
              <label className="block text-sm font-medium text-theme-primaryText mb-2">
                Evidence Images (upto three Images allowed)
              </label>
              <div className="grid grid-cols-3 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square border-2 border-gray-300 rounded-lg overflow-hidden group">
                    <img
                      src={preview}
                      alt={`Evidence ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {images.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-primary-500 hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Add Photo</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Feedback
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

