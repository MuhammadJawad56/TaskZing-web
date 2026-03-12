"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Send,
  Sparkles,
  Menu,
  Search,
  Target,
  MapPin,
  Bookmark,
  ChevronRight,
  Filter,
  X,
  Plus,
  ChevronDown,
  Check,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { Task } from "@/lib/types/task";
import { getOpenJobs, searchJobs, getJobsNearLocation, getJobsByCategory } from "@/lib/api/jobs";
import { useAuth } from "@/lib/api/AuthContext";
import { cn } from "@/lib/utils/cn";
import { categories as appCategories } from "@/lib/mock-data/categories";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Get unique main categories from app data
const mainCategories = ["All", ...Array.from(new Set(appCategories.map(cat => cat.mainCategory)))];

// Get all sub-categories
const allSubCategories = appCategories.map(cat => cat.subCategory).filter(Boolean) as string[];

// Project types
const projectTypes = ["All", "Fixed Price", "Hourly Rate"];

// Poster types
const posterTypes = ["All", "Individual", "Company", "In Store"];

// Day posted options
const dayPostedOptions = ["Any time", "Last 24 hours", "Last 7 days", "Last 30 days"];

// Price ranges
const priceRanges = ["Any", "$0 - $50", "$50 - $100", "$100 - $500", "$500+"];

// Urgency levels
const urgencyLevels = ["Any", "Urgent", "High", "Normal", "Low"];

// Job status
const jobStatuses = ["All", "Open", "In Progress"];

// Job Card Component with Auto-sliding
function JobCard({ job, onApply, getCategoryColor, formatPrice }: {
  job: Task;
  onApply: (job: Task) => void;
  getCategoryColor: (category: string) => string;
  formatPrice: (job: Task) => string;
}) {
  const router = useRouter();
  const images = job.photos || [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Reset image index when job changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [job.jobId]);

  // Auto-slide images if more than 1
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length, job.jobId]);

  const imageUrl = images[currentImageIndex] || null;

  return (
    <div
      onClick={() => router.push(`/job-details/${job.jobId}`)}
      className="bg-white dark:bg-darkBlue-203 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Image Section */}
      <div className="relative h-40 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={job.title}
            className="w-full h-full object-cover transition-opacity duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-red-500 text-2xl font-bold">Task</span>
          </div>
        )}
        {/* Pagination Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {images.slice(0, 3).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === currentImageIndex ? "bg-red-500 w-3" : "bg-white/50 w-1.5"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3" onClick={(e) => e.stopPropagation()}>
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-2">
          {job.category && (
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium",
                getCategoryColor(job.category)
              )}
            >
              {job.category.length > 15
                ? `${job.category.substring(0, 15)}...`
                : job.category}
            </span>
          )}
          {job.urgency === "urgent" && (
            <span className="px-2.5 py-1 bg-red-500 text-white rounded-full text-xs font-medium">
              Urgent
            </span>
          )}
          {job.jobType === "fixed" && job.estimatedDuration && (
            <span className="px-2.5 py-1 bg-red-500 text-white rounded-full text-xs font-medium">
              {job.estimatedDuration} Fixed hours
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
          {job.title}
        </h3>

        {/* Location */}
        <div className="flex items-start gap-1.5 mb-2">
          <MapPin className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {job.address}
          </p>
        </div>

        {/* Rate */}
        <p className="text-red-500 font-semibold text-sm mb-3">
          {formatPrice(job)}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle save bookmark
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-darkBlue-003 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Bookmark className="h-4 w-4" />
            Save
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply(job);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Task[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Filter sidebar state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterLocation, setFilterLocation] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterProjectType, setFilterProjectType] = useState("All");
  const [filterPosterType, setFilterPosterType] = useState("All");
  const [filterDayPosted, setFilterDayPosted] = useState("Any time");
  const [filterPriceRange, setFilterPriceRange] = useState("Any");
  const [filterUrgency, setFilterUrgency] = useState("Any");
  const [filterSubCategory, setFilterSubCategory] = useState("All");
  const [filterJobStatus, setFilterJobStatus] = useState("All");

  // Expanded filter sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Proposal modal state
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedJobForProposal, setSelectedJobForProposal] = useState<Task | null>(null);
  const [proposalText, setProposalText] = useState("");
  const [proposalBid, setProposalBid] = useState("");
  const [proposalPhotos, setProposalPhotos] = useState<File[]>([]);
  const [proposalPhotosPreviews, setProposalPhotosPreviews] = useState<string[]>([]);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const proposalPhotoInputRef = useRef<HTMLInputElement>(null);

  // Active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filterLocation) count++;
    if (filterArea) count++;
    if (filterProjectType !== "All") count++;
    if (filterPosterType !== "All") count++;
    if (filterDayPosted !== "Any time") count++;
    if (filterPriceRange !== "Any") count++;
    if (filterUrgency !== "Any") count++;
    if (filterSubCategory !== "All") count++;
    if (filterJobStatus !== "All") count++;
    return count;
  };

  // Load jobs from Firebase
  useEffect(() => {
    loadJobs();
  }, []);

  // Filter jobs when category changes
  useEffect(() => {
    if (selectedCategory === "All") {
      setFilteredJobs(jobs);
    } else {
      const filtered = jobs.filter(job => 
        job.category === selectedCategory || 
        job.subCategory === selectedCategory
      );
      setFilteredJobs(filtered);
    }
  }, [selectedCategory, jobs]);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      console.log("[ExplorePage] loadJobs: Starting to fetch jobs...");
      const openJobs = await getOpenJobs();
      console.log("[ExplorePage] loadJobs: Received jobs from getOpenJobs:", openJobs.length);
      console.log("[ExplorePage] loadJobs: Full jobs array:", openJobs);
      
      // Debug: Log each job's completionStatus and key fields
      if (openJobs.length > 0) {
        console.log("[ExplorePage] loadJobs: Job details breakdown:");
        openJobs.forEach((job, index) => {
          console.log(`[ExplorePage] Job ${index + 1}/${openJobs.length}:`, {
            jobId: job.jobId,
            title: job.title,
            completionStatus: (job as any).completionStatus,
            createdAt: job.createdAt,
            category: job.category,
            clientId: job.clientId,
            hasPhotos: Array.isArray(job.photos) && job.photos.length > 0
          });
        });
      } else {
        console.warn("[ExplorePage] loadJobs: No jobs returned from getOpenJobs!");
      }
      
      setJobs(openJobs);
      setFilteredJobs(openJobs);
      console.log("[ExplorePage] loadJobs: Jobs state updated, filteredJobs set to", openJobs.length, "jobs");
    } catch (error) {
      console.error("[ExplorePage] loadJobs: Error loading jobs:", error);
      console.error("[ExplorePage] loadJobs: Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      alert("Failed to load jobs. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
      console.log("[ExplorePage] loadJobs: Loading complete");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setFilteredJobs(jobs);
      return;
    }
    setIsSearching(true);
    const results = await searchJobs(searchQuery);
    setFilteredJobs(results);
    setIsSearching(false);
  };

  const handleNearMe = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const nearbyJobs = await getJobsNearLocation(latitude, longitude, 10);
          setFilteredJobs(nearbyJobs);
          setIsFetchingLocation(false);
        } catch (error) {
          console.error("Error getting nearby jobs:", error);
          alert("Failed to get nearby jobs. Please try again.");
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Please allow location access to find jobs near you.");
        setIsFetchingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    // Filter by main category
    if (selectedCategory !== "All") {
      filtered = filtered.filter((job) =>
        job.category === selectedCategory || job.subCategory === selectedCategory
      );
    }

    // Filter by sub-category
    if (filterSubCategory !== "All") {
      filtered = filtered.filter((job) => job.subCategory === filterSubCategory);
    }

    // Filter by project type
    if (filterProjectType !== "All") {
      filtered = filtered.filter((job) => {
        if (filterProjectType === "Fixed Price") return job.jobType === "fixed";
        if (filterProjectType === "Hourly Rate") return job.jobType === "hourly";
        return true;
      });
    }

    // Filter by poster type
    if (filterPosterType !== "All") {
      filtered = filtered.filter((job) => {
        const posterMap: Record<string, string> = {
          "Individual": "individual",
          "Company": "company",
          "In Store": "instore",
        };
        return job.posterType === posterMap[filterPosterType];
      });
    }

    // Filter by day posted
    if (filterDayPosted !== "Any time") {
      const now = new Date();
      filtered = filtered.filter((job) => {
        const jobDate = new Date(job.createdAt);
        const diffHours = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60);
        if (filterDayPosted === "Last 24 hours") return diffHours <= 24;
        if (filterDayPosted === "Last 7 days") return diffHours <= 168;
        if (filterDayPosted === "Last 30 days") return diffHours <= 720;
        return true;
      });
    }

    // Filter by price range
    if (filterPriceRange !== "Any") {
      filtered = filtered.filter((job) => {
        const price = job.fixedPrice || job.hourlyRate || job.price || 0;
        if (filterPriceRange === "$0 - $50") return price >= 0 && price <= 50;
        if (filterPriceRange === "$50 - $100") return price > 50 && price <= 100;
        if (filterPriceRange === "$100 - $500") return price > 100 && price <= 500;
        if (filterPriceRange === "$500+") return price > 500;
        return true;
      });
    }

    // Filter by urgency
    if (filterUrgency !== "Any") {
      filtered = filtered.filter((job) => {
        const urgencyMap: Record<string, string> = {
          "Urgent": "urgent",
          "High": "high",
          "Normal": "normal",
          "Low": "low",
        };
        return job.urgency === urgencyMap[filterUrgency];
      });
    }

    // Filter by job status
    if (filterJobStatus !== "All") {
      filtered = filtered.filter((job) => {
        if (filterJobStatus === "Open") return job.completionStatus === "open";
        if (filterJobStatus === "In Progress") return job.completionStatus === "in_progress";
        return true;
      });
    }

    // Filter by location (if entered)
    if (filterLocation.trim()) {
      const locationLower = filterLocation.toLowerCase();
      filtered = filtered.filter((job) =>
        job.address?.toLowerCase().includes(locationLower)
      );
    }

    // Filter by area (if entered)
    if (filterArea.trim()) {
      const areaLower = filterArea.toLowerCase();
      filtered = filtered.filter((job) =>
        job.address?.toLowerCase().includes(areaLower)
      );
    }

    setFilteredJobs(filtered);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setFilterLocation("");
    setFilterArea("");
    setFilterProjectType("All");
    setFilterPosterType("All");
    setFilterDayPosted("Any time");
    setFilterPriceRange("Any");
    setFilterUrgency("Any");
    setFilterSubCategory("All");
    setFilterJobStatus("All");
    setSelectedCategory("All");
    setFilteredJobs(jobs);
  };

  // Proposal modal functions
  const openProposalModal = (job: Task) => {
    setSelectedJobForProposal(job);
    setProposalText("");
    setProposalBid("");
    setProposalPhotos([]);
    setProposalPhotosPreviews([]);
    setIsProposalModalOpen(true);
  };

  const closeProposalModal = () => {
    setIsProposalModalOpen(false);
    setSelectedJobForProposal(null);
    setProposalText("");
    setProposalBid("");
    setProposalPhotos([]);
    setProposalPhotosPreviews([]);
  };

  const handleProposalPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const newPreviews: string[] = [];

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === newFiles.length) {
          setProposalPhotosPreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setProposalPhotos((prev) => [...prev, ...newFiles]);
  };

  const removeProposalPhoto = (index: number) => {
    setProposalPhotos((prev) => prev.filter((_, i) => i !== index));
    setProposalPhotosPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitProposal = async () => {
    if (!proposalText.trim()) {
      alert("Please write your proposal");
      return;
    }
    if (!proposalBid.trim()) {
      alert("Please enter your bid amount");
      return;
    }
    if (!user) {
      alert("Please login to submit a proposal");
      router.push("/login");
      return;
    }

    setIsSubmittingProposal(true);
    
    try {
      // TODO: Implement proposal submission to Firebase
      // For now, just show success message
      console.log("Submitting proposal:", {
        jobId: selectedJobForProposal?.jobId,
        proposal: proposalText,
        bid: proposalBid,
        photos: proposalPhotos.length,
      });
      
      alert("Proposal submitted successfully!");
      closeProposalModal();
    } catch (error) {
      console.error("Error submitting proposal:", error);
      alert("Failed to submit proposal. Please try again.");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const formatPrice = (task: Task) => {
    if (task.jobType === "fixed") {
      return `$${task.fixedPrice || task.price} FIXED Rate`;
    }
    return `$${task.hourlyRate || task.price}/hr`;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Home Services": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      "Delivery": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      "Tech Services": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      "Personal Care": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
      "Education": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
      "Cleaning": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
      "Plumbing": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      "Electrical": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    };
    return colors[category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  // Filter option component
  const FilterOption = ({
    label,
    isExpanded,
    onToggle,
    children,
  }: {
    label: string;
    isExpanded: boolean;
    onToggle: () => void;
    children?: React.ReactNode;
  }) => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-darkBlue-003 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <Plus className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-darkBlue-013 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );

  // Radio option component
  const RadioOption = ({
    label,
    selected,
    onSelect,
  }: {
    label: string;
    selected: boolean;
    onSelect: () => void;
  }) => (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
        selected
          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
      )}
    >
      <div
        className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
          selected ? "border-red-500 bg-red-500" : "border-gray-300 dark:border-gray-600"
        )}
      >
        {selected && <Check className="h-2.5 w-2.5 text-white" />}
      </div>
      {label}
    </button>
  );

  return (
    <DashboardLayout>
      {/* Filter Sidebar Overlay */}
      {isFilterOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[100]"
          onClick={() => setIsFilterOpen(false)}
        />
      )}

      {/* Proposal Modal */}
      {isProposalModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[200]"
            onClick={closeProposalModal}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-darkBlue-003 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-end p-4">
                <button
                  onClick={closeProposalModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-6 pb-6 space-y-5">
                {/* Write a Proposal */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Write a Proposal <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={proposalText}
                    onChange={(e) => setProposalText(e.target.value)}
                    placeholder="Write your proposal here..."
                    rows={6}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white text-sm resize-none"
                  />
                </div>

                {/* Upload your work */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Upload your work
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {/* Photo Previews */}
                    {proposalPhotosPreviews.map((preview, index) => (
                      <div key={index} className="relative w-16 h-16">
                        <img
                          src={preview}
                          alt={`Work ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeProposalPhoto(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Add Photo Button */}
                    <button
                      onClick={() => proposalPhotoInputRef.current?.click()}
                      className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center hover:border-red-500 transition-colors"
                    >
                      <Camera className="h-5 w-5 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-400">Add Photo</span>
                    </button>
                    <input
                      ref={proposalPhotoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleProposalPhotoSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Bid */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Bid <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={proposalBid}
                    onChange={(e) => setProposalBid(e.target.value)}
                    placeholder="e.g. $ 150"
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white text-sm"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleSubmitProposal}
                    disabled={isSubmittingProposal}
                    className="px-8 py-2.5 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingProposal ? "Submitting..." : "Apply"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Filter Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-darkBlue-003 z-[101] transform transition-transform duration-300 ease-in-out flex flex-col",
          isFilterOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Filter Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filter your Choice</h2>
          <button
            onClick={() => setIsFilterOpen(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Location */}
          <FilterOption
            label="Location"
            isExpanded={expandedSections.location}
            onToggle={() => toggleSection("location")}
          >
            <input
              type="text"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              placeholder="Enter city or address"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-white text-sm"
            />
          </FilterOption>

          {/* Area */}
          <FilterOption
            label="Area"
            isExpanded={expandedSections.area}
            onToggle={() => toggleSection("area")}
          >
            <input
              type="text"
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              placeholder="Enter area or neighborhood"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-white text-sm"
            />
          </FilterOption>

          {/* Project Type */}
          <FilterOption
            label="Project Type"
            isExpanded={expandedSections.projectType}
            onToggle={() => toggleSection("projectType")}
          >
            <div className="space-y-1">
              {projectTypes.map((type) => (
                <RadioOption
                  key={type}
                  label={type}
                  selected={filterProjectType === type}
                  onSelect={() => setFilterProjectType(type)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Poster Type */}
          <FilterOption
            label="Poster Type"
            isExpanded={expandedSections.posterType}
            onToggle={() => toggleSection("posterType")}
          >
            <div className="space-y-1">
              {posterTypes.map((type) => (
                <RadioOption
                  key={type}
                  label={type}
                  selected={filterPosterType === type}
                  onSelect={() => setFilterPosterType(type)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Sub-Category */}
          <FilterOption
            label="Sub-Category"
            isExpanded={expandedSections.subCategory}
            onToggle={() => toggleSection("subCategory")}
          >
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <RadioOption
                label="All"
                selected={filterSubCategory === "All"}
                onSelect={() => setFilterSubCategory("All")}
              />
              {allSubCategories.map((subCat) => (
                <RadioOption
                  key={subCat}
                  label={subCat}
                  selected={filterSubCategory === subCat}
                  onSelect={() => setFilterSubCategory(subCat)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Day Posted */}
          <FilterOption
            label="Day Posted"
            isExpanded={expandedSections.dayPosted}
            onToggle={() => toggleSection("dayPosted")}
          >
            <div className="space-y-1">
              {dayPostedOptions.map((option) => (
                <RadioOption
                  key={option}
                  label={option}
                  selected={filterDayPosted === option}
                  onSelect={() => setFilterDayPosted(option)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Price Range */}
          <FilterOption
            label="Price Range"
            isExpanded={expandedSections.priceRange}
            onToggle={() => toggleSection("priceRange")}
          >
            <div className="space-y-1">
              {priceRanges.map((range) => (
                <RadioOption
                  key={range}
                  label={range}
                  selected={filterPriceRange === range}
                  onSelect={() => setFilterPriceRange(range)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Urgency */}
          <FilterOption
            label="Urgency"
            isExpanded={expandedSections.urgency}
            onToggle={() => toggleSection("urgency")}
          >
            <div className="space-y-1">
              {urgencyLevels.map((level) => (
                <RadioOption
                  key={level}
                  label={level}
                  selected={filterUrgency === level}
                  onSelect={() => setFilterUrgency(level)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Job Status */}
          <FilterOption
            label="Job Status"
            isExpanded={expandedSections.jobStatus}
            onToggle={() => toggleSection("jobStatus")}
          >
            <div className="space-y-1">
              {jobStatuses.map((status) => (
                <RadioOption
                  key={status}
                  label={status}
                  selected={filterJobStatus === status}
                  onSelect={() => setFilterJobStatus(status)}
                />
              ))}
            </div>
          </FilterOption>
        </div>

        {/* Filter Actions */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <button
            onClick={clearFilters}
            className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={applyFilters}
            className="w-full py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8">
        {/* Search Bar */}
        <div className="bg-white dark:bg-darkBlue-003 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNearMe}
              disabled={isFetchingLocation}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-full text-sm font-medium whitespace-nowrap",
                "hover:bg-red-600 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Target className="h-4 w-4" />
              Near me
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Explore Here"
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="p-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/googlemap"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Map
            </Link>
          </form>
        </div>

        {/* Category Filters */}
        <div className="bg-white dark:bg-darkBlue-003 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            >
              <Filter className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              {getActiveFiltersCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
            {mainCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors",
                  selectedCategory === category
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs Grid */}
        <main className="px-4 py-4 bg-gray-50 dark:bg-darkBlue-013 min-h-screen">
          {/* Results Count */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} found
              {selectedCategory !== "All" && ` in ${selectedCategory}`}
            </p>
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No jobs found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Try adjusting your search or filters
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.jobId}
                  job={job}
                  onApply={openProposalModal}
                  getCategoryColor={getCategoryColor}
                  formatPrice={formatPrice}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </DashboardLayout>
  );
}
