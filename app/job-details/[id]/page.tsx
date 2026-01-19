"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Share2, MessageCircle, MapPin, Calendar, Briefcase, ChevronLeft, ChevronRight, X, DollarSign, Clock, User } from "lucide-react";
import { getJobById } from "@/lib/firebase/jobs";
import { getUserById } from "@/lib/firebase/users";
import { Task } from "@/lib/types/task";
import { User as UserType } from "@/lib/types/user";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/firebase/AuthContext";
import { getOrCreateChatRoom } from "@/lib/firebase/messages";

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const jobId = params?.id as string;
  const [job, setJob] = useState<Task | null>(null);
  const [client, setClient] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!jobId) return;

      setLoading(true);
      try {
        const jobData = await getJobById(jobId);
        if (!jobData) {
          router.push("/not-found");
          return;
        }

        setJob(jobData);

        // Fetch client data
        if (jobData.clientId) {
          const clientData = await getUserById(jobData.clientId);
          setClient(clientData);
        }
      } catch (error) {
        console.error("Error fetching job details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [jobId, router]);

  const formatDate = (date: Date | string) => {
    if (!date) return "N/A";
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - d.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 30) return `${diffDays} days ago`;
      if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? "month" : "months"} ago`;
      }
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? "year" : "years"} ago`;
    } catch {
      return "N/A";
    }
  };

  const handleShare = async () => {
    if (!job) return;

    const shareUrl = typeof window !== "undefined" 
      ? `${window.location.origin}/job-details/${jobId}`
      : "";

    if (navigator.share) {
      try {
        await navigator.share({
          title: job.title || "Job Details",
          text: job.description || "",
          url: shareUrl,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  const handleContactClient = async () => {
    if (!currentUser || !client) {
      alert("Please sign in to contact the client.");
      return;
    }

    try {
      const chatRoomId = await getOrCreateChatRoom([currentUser.uid, client.uid], jobId);
      router.push(`/chats/${chatRoomId}`);
    } catch (error) {
      console.error("Error creating chat room:", error);
      alert("Failed to start chat. Please try again.");
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const images = job?.photos || [];
  const fallbackImage = "/images/placeholder_image.png";

  const nextImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  // Auto-slide images if more than 1
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  // Keyboard navigation for image modal
  useEffect(() => {
    if (!isImageModalOpen || images.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsImageModalOpen(false);
      } else if (e.key === "ArrowLeft") {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight") {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImageModalOpen, images.length]);

  const formatPrice = (price?: number, jobType?: string) => {
    if (!price) return "Not specified";
    if (jobType === "hourly") {
      return `$${price}/hr`;
    }
    return `$${price.toFixed(0)}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Job not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const isOwnJob = currentUser && job.clientId === currentUser.uid;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white dark:bg-darkBlue-001">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Job Details</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Share2 className="h-6 w-6 text-gray-900 dark:text-gray-100" />
              </button>
              {images.length > 1 && (
                <div className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                  {currentImageIndex + 1}/{images.length}
                </div>
              )}
            </div>
          </div>

          {/* Image Carousel */}
          {images.length > 0 && (
            <div className="relative mb-6 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              <div className="relative w-full h-[400px] sm:h-[500px] cursor-pointer" onClick={() => setIsImageModalOpen(true)}>
                <img
                  src={images[currentImageIndex] || fallbackImage}
                  alt={job.title || "Job image"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallbackImage;
                  }}
                />
                
                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* Pagination Dots */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(index);
                        }}
                        className={`h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? "bg-white w-8"
                            : "bg-white/50 w-2 hover:bg-white/70"
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Client Profile Section */}
          {client && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {client.postingAs === "company" && client.companyName
                  ? client.companyName
                  : client.postingAs === "instore" && client.storeName
                  ? client.storeName
                  : "Client"}
              </h2>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-red-500 text-white flex items-center justify-center text-xl font-bold overflow-hidden flex-shrink-0">
                  {client.photoUrl ? (
                    <img
                      src={client.photoUrl}
                      alt={client.fullName || client.username || "Client"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(client.fullName || client.username || client.email?.split("@")[0])}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                    {client.fullName || client.username || client.email?.split("@")[0] || "Client"}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {client.postingAs === "company" ? "Company" : 
                     client.postingAs === "instore" ? "In-Store" : 
                     "Client"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Description</h2>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {job.description || "No description provided."}
              </p>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Additional Information</h2>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Created:</span> {formatDate(job.createdAt)}
                </span>
              </div>
              {job.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Location:</span> {job.address}
                  </span>
                </div>
              )}
              {job.price && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Budget:</span> {formatPrice(job.price, job.jobType)}
                  </span>
                </div>
              )}
              {job.jobType === "hourly" && job.estimatedDuration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Estimated Duration:</span> {job.estimatedDuration} hours
                  </span>
                </div>
              )}
              {job.skills && job.skills.length > 0 && (
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Skills:</span> {job.skills.join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            {isOwnJob ? (
              <button
                disabled
                className="w-full bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <MessageCircle className="h-5 w-5" />
                Your Job
              </button>
            ) : (
              <button
                onClick={handleContactClient}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                Contact Client
              </button>
            )}
            <button
              onClick={handleShare}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Share2 className="h-5 w-5" />
              Share Job
            </button>
          </div>

          {/* View Profile Link */}
          {client && (
            <div className="text-center">
              <button
                onClick={() => router.push(`/profile/${isOwnJob ? currentUser?.uid : client.uid}`)}
                className="text-red-500 hover:text-red-600 font-medium transition-colors"
              >
                View Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-10"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>

            <img
              src={images[currentImageIndex] || fallbackImage}
              alt={job.title || "Job image"}
              className="max-w-full max-h-[90vh] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackImage;
              }}
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-10"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? "bg-white w-8"
                          : "bg-white/50 w-2 hover:bg-white/70"
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
