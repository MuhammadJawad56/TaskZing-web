"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/api/AuthContext";
import { getUserById, updateUser } from "@/lib/api/users";
import { updateUserProfile } from "@/lib/api/auth";

export default function EditProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    location: "",
    bio: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [lastUsernameChangeDate, setLastUsernameChangeDate] = useState<Date | null>(null);
  const [canChangeUsername, setCanChangeUsername] = useState(true);

  // Get user initials
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 1);
  };

  useEffect(() => {
    async function loadUserData() {
      if (user?.uid || userData?.uid) {
        const userId = user?.uid || userData?.uid;
        const userProfile = await getUserById(userId || "");
        if (userProfile) {
          setFormData({
            fullName: userProfile.fullName || userData?.fullName || "",
            username: (userProfile as any).username || user?.email?.split("@")[0] || "",
            email: userProfile.email || user?.email || "",
            location: userProfile.location || "",
            bio: userProfile.description || userProfile.bio || "",
          });
          if (userProfile.photoUrl) {
            setPhotoPreview(userProfile.photoUrl);
          }
          
          // Check username change restriction (6 months)
          const lastChange = (userProfile as any).lastUsernameChangeDate;
          if (lastChange) {
            const changeDate = new Date(lastChange);
            setLastUsernameChangeDate(changeDate);
            const sixMonthsLater = new Date(changeDate);
            sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
            setCanChangeUsername(new Date() >= sixMonthsLater);
          } else {
            setCanChangeUsername(true);
          }
        }
      }
      setIsLoadingData(false);
    }
    loadUserData();
  }, [user, userData]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setPhotoPreview(preview);
    }
  };

  const getNextChangeDate = () => {
    if (!lastUsernameChangeDate) return null;
    const nextDate = new Date(lastUsernameChangeDate);
    nextDate.setMonth(nextDate.getMonth() + 6);
    return nextDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (!user?.uid) {
        alert("Please sign in to update your profile");
        return;
      }

      // Update user profile
      const updateData: any = {
        fullName: formData.fullName.trim(),
        location: formData.location.trim(),
        description: formData.bio.trim(),
        bio: formData.bio.trim(),
      };

      // Only update username if it changed and user can change it
      if (formData.username !== ((userData as any)?.username || user?.email?.split("@")[0])) {
        if (!canChangeUsername) {
          alert("You can only change your username once every 6 months.");
          setIsLoading(false);
          return;
        }
        updateData.username = formData.username.trim();
        updateData.lastUsernameChangeDate = new Date().toISOString();
      }

      await updateUserProfile(user.uid, updateData);
      
      const returnTo = searchParams.get("returnTo");
      if (returnTo) {
        router.push(returnTo);
      } else {
        router.push("/my-profile");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert(error.message || "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  const bioLength = formData.bio.length;
  const bioMinLength = 50;
  const bioMaxLength = 1500;
  const nextChangeDate = getNextChangeDate();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Your Profile</h1>
          
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Section - Profile Picture */}
              <div className="md:col-span-1">
                <div className="w-full aspect-square max-w-[200px] mx-auto">
                  <div className="w-full h-full rounded-lg bg-teal-500 flex items-center justify-center text-white text-6xl font-bold">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span>
                        {getInitials(formData.fullName || user?.email?.split("@")[0] || "U")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-red-500 underline text-sm hover:text-red-600"
                  >
                    Upload Photo here
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Right Section - Form Fields */}
              <div className="md:col-span-2">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Full Name (Legal Name)
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full h-10 rounded-lg border border-gray-300 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Username Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={!canChangeUsername}
                      className={`w-full h-10 rounded-lg border border-gray-300 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                        !canChangeUsername ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Username is unique and public. Not used for payments or legal verification. You can change it again after 6 months.
                    </p>
                    {!canChangeUsername && nextChangeDate && (
                      <p className="text-sm text-red-600 mt-1">
                        You can change your username once every 6 months. Next change available on {nextChangeDate}.
                      </p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      readOnly
                      className="w-full h-10 rounded-lg bg-gray-100 border-0 px-4 text-gray-900 cursor-not-allowed"
                    />
                  </div>

                  {/* Location Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full h-10 rounded-lg border border-gray-300 px-4 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* About You Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      About You
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={6}
                      maxLength={bioMaxLength}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    />
                    <div className="mt-1 text-sm text-gray-500">
                      {bioLength} / {bioMaxLength} characters (min: {bioMinLength})
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || bioLength < bioMinLength}
                      className="px-6 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
