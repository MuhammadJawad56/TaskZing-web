"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, X, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  createShowcaseItem,
  uploadShowcaseImages,
  getUserShowcases,
  deleteShowcaseItem,
  ShowcaseItem,
} from "@/lib/firebase/showcase";
import { cn } from "@/lib/utils/cn";

export default function ShowcasePage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [postingAs, setPostingAs] = useState<"individual" | "company">("individual");
  const [formData, setFormData] = useState({
    companyName: "",
    title: "",
    skills: "",
    description: "",
    location: "",
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<{
    companyName?: string;
    title?: string;
    description?: string;
    location?: string;
    images?: string;
  }>({});

  const userName = user?.displayName || userData?.fullName || user?.email?.split("@")[0] || "U";
  const userInitial = userName.charAt(0).toUpperCase();

  // Load user's showcases
  useEffect(() => {
    if (user?.uid) {
      loadShowcases();
    }
  }, [user]);

  const loadShowcases = async () => {
    if (!user?.uid) return;
    try {
      setIsLoading(true);
      const userShowcases = await getUserShowcases(user.uid);
      setShowcases(userShowcases);
    } catch (error) {
      console.error("Error loading showcases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (selectedImages.length + files.length > 5) {
      setErrors({ ...errors, images: "Maximum 5 photos allowed" });
      return;
    }

    const newImages = [...selectedImages, ...files.slice(0, 5 - selectedImages.length)];
    setSelectedImages(newImages);
    setErrors({ ...errors, images: undefined });

    // Create previews
    const newPreviews = newImages.map((file) => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Revoke object URLs
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
    setErrors({ ...errors, images: undefined });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: typeof errors = {};
    if (postingAs === "company" && !formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.trim().length < 50) {
      newErrors.description = "Description must be at least 50 characters";
    }
    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }
    if (selectedImages.length < 3) {
      newErrors.images = "At least 3 photos are required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!user?.uid) {
      alert("Please log in to create a showcase");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Upload images to Firebase Storage
      const imageUrls = await uploadShowcaseImages(selectedImages, user.uid);

      // Parse skills
      const skills = formData.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);

      // Create showcase item in Firestore
      await createShowcaseItem(user.uid, {
        postingAs,
        companyName: postingAs === "company" ? formData.companyName.trim() : undefined,
        title: formData.title.trim(),
        skills: formData.skills.trim() || undefined,
        description: formData.description.trim(),
        location: formData.location.trim(),
        imageUrls,
        tags: skills,
      });

      // Reset form
      setFormData({ companyName: "", title: "", skills: "", description: "", location: "" });
      setSelectedImages([]);
      setImagePreviews([]);
      setPostingAs("individual");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Reload showcases
      await loadShowcases();

      alert("Showcase item added successfully!");
    } catch (error: any) {
      console.error("Error creating showcase:", error);
      alert(error.message || "Failed to create showcase item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, imageUrls: string[]) => {
    if (!confirm("Are you sure you want to delete this showcase item?")) {
      return;
    }

    try {
      await deleteShowcaseItem(id, imageUrls);
      await loadShowcases();
      alert("Showcase item deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting showcase:", error);
      alert(error.message || "Failed to delete showcase item. Please try again.");
    }
  };

  const descriptionLength = formData.description.length;
  const minChars = 50;
  const maxChars = 1500;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue-013">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Showcase Work
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Showcase your work and skills to potential clients
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="rounded-full">
                Drafts
              </Button>
              <Button variant="outline" size="sm" className="rounded-full">
                In Store
              </Button>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold">
              {userInitial}
            </div>
            <span className="text-gray-900 dark:text-white font-medium">{userName}</span>
          </div>
        </div>

        {/* Form */}
        <Card className="dark:bg-darkBlue-203 dark:border-gray-700">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Posting As */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Posting As
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPostingAs("individual");
                      setFormData({ ...formData, companyName: "" });
                      setErrors({ ...errors, companyName: undefined });
                    }}
                    className={cn(
                      "flex-1 px-6 py-3 rounded-full font-medium transition-colors",
                      postingAs === "individual"
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                        : "bg-transparent text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPostingAs("company");
                      setErrors({ ...errors, companyName: undefined });
                    }}
                    className={cn(
                      "flex-1 px-6 py-3 rounded-full font-medium transition-colors",
                      postingAs === "company"
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                        : "bg-red-500 text-white hover:bg-red-600"
                    )}
                  >
                    Company
                  </button>
                </div>
              </div>

              {/* Company Name (only when Company is selected) */}
              {postingAs === "company" && (
                <div>
                  <Input
                    label="Company Name"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => {
                      setFormData({ ...formData, companyName: e.target.value });
                      setErrors({ ...errors, companyName: undefined });
                    }}
                    placeholder="Enter company name"
                    required
                    error={errors.companyName}
                    className="dark:bg-darkBlue-003 dark:border-gray-600 dark:text-white"
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <Input
                  label="Title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    setErrors({ ...errors, title: undefined });
                  }}
                  placeholder="Enter your work title"
                  required
                  error={errors.title}
                  className="dark:bg-darkBlue-003 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Skills */}
              <div>
                <Input
                  label="Skills"
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="Enter your skills (e.g., Web Development, Graphic Design)"
                  className="dark:bg-darkBlue-003 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <Textarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= maxChars) {
                      setFormData({ ...formData, description: value });
                      setErrors({ ...errors, description: undefined });
                    }
                  }}
                  placeholder="Describe your work and experience in detail"
                  rows={6}
                  required
                  error={errors.description}
                  className="dark:bg-darkBlue-003 dark:border-gray-600 dark:text-white"
                />
                <p className={cn(
                  "mt-1 text-xs",
                  descriptionLength < minChars
                    ? "text-red-500"
                    : "text-gray-500 dark:text-gray-400"
                )}>
                  {descriptionLength}/{maxChars} characters (min {minChars})
                </p>
              </div>

              {/* Location */}
              <div>
                <div className="relative">
                  <Input
                    label="Location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => {
                      setFormData({ ...formData, location: e.target.value });
                      setErrors({ ...errors, location: undefined });
                    }}
                    placeholder="Address e.g ABC324 State Canada"
                    required
                    error={errors.location}
                    className="dark:bg-darkBlue-003 dark:border-gray-600 dark:text-white pr-10"
                  />
                  <Target className="absolute right-3 top-9 h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>

              {/* Photos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    Photos (at least 3) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {imagePreviews.length}/5 Photos
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Add photos to help Clients better understand your skills
                </p>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Area */}
                {imagePreviews.length < 5 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-full aspect-square max-w-[200px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors",
                      "border-gray-300 dark:border-gray-600",
                      "hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-darkBlue-002",
                      errors.images && "border-red-500"
                    )}
                  >
                    <Camera className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                      Add Photo
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {errors.images && (
                  <p className="mt-1 text-sm text-red-500">{errors.images}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Submit Showcase
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* My Showcases */}
        {showcases.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              My Showcases
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {showcases.map((showcase) => (
                <Card
                  key={showcase.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow dark:bg-darkBlue-203 dark:border-gray-700"
                >
                  {showcase.imageUrls && showcase.imageUrls.length > 0 && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={showcase.imageUrls[0]}
                        alt={showcase.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleDelete(showcase.id!, showcase.imageUrls)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {showcase.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
                      {showcase.description}
                    </p>
                    {showcase.location && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        📍 {showcase.location}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
