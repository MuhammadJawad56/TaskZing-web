"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Plus, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/api/AuthContext";
import { getUserById } from "@/lib/api/users";

export default function EditProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    location: "",
    skills: [] as string[],
    skillInput: "",
    bio: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    async function loadUserData() {
      if (user?.uid || userData?.uid) {
        const userId = user?.uid || userData?.uid;
        const userProfile = await getUserById(userId || "");
        if (userProfile) {
          setFormData({
            fullName: userProfile.fullName || "",
            email: userProfile.email || user?.email || "",
            location: userProfile.location || "",
            skills: userProfile.skills || [],
            skillInput: "",
            bio: userProfile.description || "",
          });
          if (userProfile.photoUrl) {
            setPhotoPreview(userProfile.photoUrl);
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

  const addSkill = () => {
    if (formData.skillInput.trim() && !formData.skills.includes(formData.skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, formData.skillInput.trim()],
        skillInput: "",
      });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Update user profile in Firestore
    // For now, simulate API call
    setTimeout(() => {
      const returnTo = searchParams.get("returnTo");
      if (returnTo) {
        router.push(returnTo);
      } else {
      router.push("/my-profile");
      }
    }, 1000);
  };

  if (isLoadingData) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-theme-primaryText">Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const bioLength = formData.bio.length;
  const bioMinLength = 50;
  const bioMaxLength = 1500;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-theme-primaryText mb-8">Edit Your Profile</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Section - Profile Picture */}
            <div className="md:col-span-1">
              <div className="w-full aspect-square max-w-[200px] mx-auto">
                <div className="w-full h-full rounded-lg bg-pink-200 flex items-center justify-center text-white text-6xl font-bold">
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
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-theme-primaryText mb-2">
                    Name
                  </label>
                  <input
                type="text"
                value={formData.fullName}
                    readOnly
                    className="w-full h-10 rounded-lg bg-gray-100 border-0 px-4 text-theme-primaryText cursor-not-allowed"
              />
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-theme-primaryText mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    readOnly
                    className="w-full h-10 rounded-lg bg-gray-100 border-0 px-4 text-theme-primaryText cursor-not-allowed"
              />
                </div>

                {/* Location Field */}
                <div>
                  <label className="block text-sm font-medium text-theme-primaryText mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full h-10 rounded-lg bg-gray-100 border-0 px-4 pr-10 text-theme-primaryText focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Skills Field */}
                <div>
                  <label className="block text-sm font-medium text-theme-primaryText mb-2">
                    Skills
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.skillInput}
                      onChange={(e) => setFormData({ ...formData, skillInput: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      placeholder="Skills"
                      className="w-full h-10 rounded-lg bg-gray-100 border-0 px-4 pr-10 text-theme-primaryText placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {/* Skills Tags */}
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.skills.map((skill, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600 text-white text-sm"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="hover:text-gray-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* About You Field */}
                <div>
                  <label className="block text-sm font-medium text-theme-primaryText mb-2">
                    About You
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={6}
                    maxLength={bioMaxLength}
                    className="w-full rounded-lg bg-gray-100 border-0 px-4 py-3 text-theme-primaryText focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                  />
                  <div className="mt-1 text-sm text-gray-400">
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
                    className="px-6 py-2 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
