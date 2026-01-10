"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, X, Target, Video, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  createShowcaseItem,
  uploadShowcaseImages,
  uploadShowcaseVideo,
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
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [postingAs, setPostingAs] = useState<"individual" | "company" | "instore">("instore");
  const [formData, setFormData] = useState({
    companyName: "",
    storeName: "",
    title: "",
    skills: "",
    description: "",
    location: "",
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{
    companyName?: string;
    storeName?: string;
    title?: string;
    description?: string;
    location?: string;
    images?: string;
    video?: string;
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

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrors({ ...errors, video: "Video size must be less than 5MB" });
      return;
    }

    // Check if it's a video file
    if (!file.type.startsWith("video/")) {
      setErrors({ ...errors, video: "Please select a valid video file" });
      return;
    }

    setSelectedVideo(file);
    setErrors({ ...errors, video: undefined });

    // Create preview
    const preview = URL.createObjectURL(file);
    setVideoPreview(preview);
  };

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedVideo(null);
    setVideoPreview(null);
    setErrors({ ...errors, video: undefined });
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  // Reverse geocoding function to convert coordinates to address
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      // Using Nominatim (OpenStreetMap) for reverse geocoding - free and no API key required
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Taskzing-Website/1.0' // Required by Nominatim
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }

      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        // Build a readable address string
        const addressParts = [];
        
        if (address.house_number && address.road) {
          addressParts.push(`${address.house_number} ${address.road}`);
        } else if (address.road) {
          addressParts.push(address.road);
        }
        
        if (address.suburb || address.neighbourhood) {
          addressParts.push(address.suburb || address.neighbourhood);
        }
        
        if (address.city || address.town || address.village) {
          addressParts.push(address.city || address.town || address.village);
        }
        
        if (address.state || address.region) {
          addressParts.push(address.state || address.region);
        }
        
        if (address.country) {
          addressParts.push(address.country);
        }
        
        if (address.postcode) {
          addressParts.push(address.postcode);
        }

        return addressParts.length > 0 ? addressParts.join(', ') : data.display_name || 'Location found';
      }
      
      return data.display_name || 'Location found';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback: return coordinates if geocoding fails
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsFetchingLocation(true);
    setErrors({ ...errors, location: undefined });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const address = await reverseGeocode(latitude, longitude);
          setFormData({ ...formData, location: address });
          setIsFetchingLocation(false);
        } catch (error: any) {
          console.error('Error getting location:', error);
          setErrors({ ...errors, location: 'Failed to get location. Please enter manually.' });
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Failed to get your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'Please enter your location manually.';
            break;
        }
        
        setErrors({ ...errors, location: errorMessage });
        setIsFetchingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: typeof errors = {};
    if (postingAs === "company" && !formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }
    if (postingAs === "instore" && !formData.storeName.trim()) {
      newErrors.storeName = "Store name is required";
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

      // Upload video to Firebase Storage if selected
      let videoUrl: string | undefined = undefined;
      if (selectedVideo) {
        videoUrl = await uploadShowcaseVideo(selectedVideo, user.uid);
      }

      // Parse skills
      const skills = formData.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);

      // Create showcase item in Firestore
      await createShowcaseItem(user.uid, {
        postingAs,
        companyName: postingAs === "company" ? formData.companyName.trim() : undefined,
        storeName: postingAs === "instore" ? formData.storeName.trim() : undefined,
        title: formData.title.trim(),
        skills: formData.skills.trim() || undefined,
        description: formData.description.trim(),
        location: formData.location.trim(),
        imageUrls,
        videoUrl,
        tags: skills,
      });

      // Reset form
      setFormData({ companyName: "", storeName: "", title: "", skills: "", description: "", location: "" });
      setSelectedImages([]);
      setImagePreviews([]);
      setSelectedVideo(null);
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
      setVideoPreview(null);
      setPostingAs("instore");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
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

  const handleDelete = async (id: string, imageUrls: string[], videoUrl?: string) => {
    if (!confirm("Are you sure you want to delete this showcase item?")) {
      return;
    }

    try {
      await deleteShowcaseItem(id, imageUrls, videoUrl);
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
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            {/* User Info - Top Left */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                {userInitial}
              </div>
              <span className="text-gray-900 dark:text-white font-medium text-sm sm:text-base">{userName}</span>
            </div>
            
            {/* Drafts Button - Top Right */}
            <Button variant="outline" size="sm" className="rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 w-full sm:w-auto">
              Drafts
            </Button>
          </div>
        </div>

        {/* Form */}
        <Card className="dark:bg-darkBlue-203 dark:border-gray-700">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
              {/* Posting As */}
              <div>
                <label className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">
                  Posting As
                </label>
                <div className="flex gap-1.5 sm:gap-2 md:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPostingAs("individual");
                      setFormData({ ...formData, companyName: "", storeName: "" });
                      setErrors({ ...errors, companyName: undefined, storeName: undefined });
                    }}
                    className={cn(
                      "flex-1 px-2.5 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm md:text-base",
                      postingAs === "individual"
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                    )}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPostingAs("company");
                      setFormData({ ...formData, storeName: "" });
                      setErrors({ ...errors, companyName: undefined, storeName: undefined });
                    }}
                    className={cn(
                      "flex-1 px-2.5 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm md:text-base",
                      postingAs === "company"
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                    )}
                  >
                    Company
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPostingAs("instore");
                      setFormData({ ...formData, companyName: "" });
                      setErrors({ ...errors, companyName: undefined, storeName: undefined });
                    }}
                    className={cn(
                      "flex-1 px-2.5 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm md:text-base",
                      postingAs === "instore"
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                    )}
                  >
                    In Store
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

              {/* Store Name (only when In Store is selected) */}
              {postingAs === "instore" && (
                <div>
                  <Input
                    label="Store Name"
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => {
                      setFormData({ ...formData, storeName: e.target.value });
                      setErrors({ ...errors, storeName: undefined });
                    }}
                    placeholder="Enter store name"
                    required
                    error={errors.storeName}
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
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isFetchingLocation}
                    className={cn(
                      "absolute right-3 top-8 sm:top-9 p-1.5 rounded-full transition-colors",
                      "hover:bg-gray-100 dark:hover:bg-gray-700",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isFetchingLocation && "animate-pulse"
                    )}
                    title="Get current location"
                  >
                    {isFetchingLocation ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary-500 animate-spin" />
                    ) : (
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>

              {/* Photos */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-2">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4">
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
                      "w-full aspect-square max-w-[100px] sm:max-w-[200px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors p-2 sm:p-3 md:p-4",
                      "border-red-500 dark:border-red-500",
                      "hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/10",
                      errors.images && "border-red-600"
                    )}
                  >
                    <Camera className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8 text-gray-400 dark:text-gray-500 mb-1 sm:mb-2" />
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium text-center">
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

              {/* Video Upload Section */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    Video (Optional)
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Max 5MB
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Add a video to showcase your work (optional)
                </p>

                {/* Video Preview */}
                {videoPreview && (
                  <div className="relative mb-4 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full max-h-64 object-contain bg-black"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Upload Area */}
                {!videoPreview && (
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className={cn(
                      "w-full aspect-video max-w-[100px] sm:max-w-[200px] md:max-w-[300px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors p-2 sm:p-3 md:p-4",
                      "border-red-500 dark:border-red-500",
                      "hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/10",
                      errors.video && "border-red-600"
                    )}
                  >
                    <Video className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8 text-gray-400 dark:text-gray-500 mb-1 sm:mb-2" />
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium text-center">
                      Add Video
                    </p>
                  </div>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
                {errors.video && (
                  <p className="mt-1 text-sm text-red-500">{errors.video}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full sm:flex-1"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full sm:flex-1"
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
          <div className="mt-6 sm:mt-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              My Showcases
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
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
                        onClick={() => handleDelete(showcase.id!, showcase.imageUrls, showcase.videoUrl)}
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
