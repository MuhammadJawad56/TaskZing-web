"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Bookmark, Filter, ChevronDown, MapPin, MessageSquare, X, Plus, Check } from "lucide-react";
import {
  getAllShowcases,
  ShowcaseItem,
  bookmarkShowcase,
  unbookmarkShowcase,
  getUserBookmarkedShowcases,
} from "@/lib/firebase/showcase";
import { getUserData } from "@/lib/firebase/auth";
import { useAuth } from "@/lib/firebase/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils/cn";

const categories = [
  "Construction & Repair",
  "Home Improvement",
  "Lifestyle",
  "Professional",
  "Property Maintenance",
  "Specialty",
];

const ratingOptions = ["All", "5 Stars", "4+ Stars", "3+ Stars", "2+ Stars"];
const sortOptions = ["Newest", "Oldest", "Rating: High to Low", "Rating: Low to High"];
const postingTypeOptions = ["All", "Individual", "Company", "In Store"];

// Day posted options
const dayPostedOptions = ["Any time", "Last 24 hours", "Last 7 days", "Last 30 days"];

const fallbackImage = "/images/placeholder_image.png";

export default function ClientExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedRating, setSelectedRating] = useState("All");
  const [selectedSort, setSelectedSort] = useState("Newest");
  const [selectedPostingType, setSelectedPostingType] = useState("All");
  const [userMeta, setUserMeta] = useState<Record<string, { name?: string; location?: string; rating?: number }>>({});
  const [savedShowcaseIds, setSavedShowcaseIds] = useState<Set<string>>(new Set());
  const [savingShowcaseId, setSavingShowcaseId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  // Filter sidebar state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterLocation, setFilterLocation] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterPostingType, setFilterPostingType] = useState("All");
  const [filterDayPosted, setFilterDayPosted] = useState("Any time");
  const [filterRating, setFilterRating] = useState("All");
  const [filterSubCategory, setFilterSubCategory] = useState("All");

  // Expanded filter sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Load showcases
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        setError("Please sign in to view showcase work.");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getAllShowcases();
        if (isMounted) setShowcases(data);
      } catch (err: any) {
        console.error("Failed to load showcase items", err);
        if (isMounted) {
          const message =
            err?.code === "permission-denied"
              ? "Showcase permission denied. Update Firestore rules to allow read access."
              : err?.message || "Failed to load showcase items.";
          setError(message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  // Load user metadata for showcases
  useEffect(() => {
    const loadMeta = async () => {
      const ids = Array.from(new Set(showcases.map((s) => s.userId).filter(Boolean)));
      if (ids.length === 0) return;

      try {
        const entries = await Promise.all(
          ids.map(async (id) => {
            try {
              const data = await getUserData(id);
              let displayName = data?.fullName;
              if (!displayName && data?.email) {
                displayName = data.email.split("@")[0];
              }
              return [
                id,
                {
                  name: displayName || "User",
                  location: data?.location || "",
                  rating: data?.totalRating || 0,
                },
              ] as const;
            } catch (error) {
              console.warn(`Failed to load user data for ${id}:`, error);
              return [
                id,
                {
                  name: "User",
                  location: "",
                },
              ] as const;
            }
          })
        );
        setUserMeta(Object.fromEntries(entries));
      } catch (error) {
        console.error("Error loading user metadata:", error);
      }
    };

    if (showcases.length > 0) {
      loadMeta();
    }
  }, [showcases]);

  // Load saved showcase IDs
  useEffect(() => {
    const loadSaved = async () => {
      if (!user) return;
      try {
        const savedIds = await getUserBookmarkedShowcases(user.uid);
        setSavedShowcaseIds(new Set(savedIds));
      } catch (err) {
        console.warn("Failed to load saved showcases", err);
      }
    };
    loadSaved();
  }, [user]);

  // Active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filterLocation) count++;
    if (filterArea) count++;
    if (filterPostingType !== "All") count++;
    if (filterDayPosted !== "Any time") count++;
    if (filterRating !== "All") count++;
    if (filterSubCategory !== "All") count++;
    return count;
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const applyFilters = () => {
    // Apply sidebar filters to the main filter states
    setSelectedPostingType(filterPostingType);
    setSelectedRating(filterRating);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setFilterLocation("");
    setFilterArea("");
    setFilterPostingType("All");
    setFilterDayPosted("Any time");
    setFilterRating("All");
    setFilterSubCategory("All");
    setSelectedPostingType("All");
    setSelectedRating("All");
    setSelectedCategory(null);
  };

  // Filter and sort showcases
  const filteredAndSortedShowcases = useMemo(() => {
    let filtered = [...showcases];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query) ||
          item.skills?.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Category filter (using tags or skills)
    if (selectedCategory) {
      filtered = filtered.filter(
        (item) =>
          item.tags?.some((tag) => tag.toLowerCase().includes(selectedCategory.toLowerCase())) ||
          item.skills?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Rating filter
    if (selectedRating !== "All") {
      const minRating = selectedRating === "5 Stars" ? 5 : 
                       selectedRating === "4+ Stars" ? 4 :
                       selectedRating === "3+ Stars" ? 3 : 2;
      filtered = filtered.filter((item) => {
        const userRating = userMeta[item.userId]?.rating || 0;
        return userRating >= minRating;
      });
    }

    // Posting Type filter
    if (selectedPostingType !== "All") {
      const postingTypeMap: Record<string, "individual" | "company" | "instore"> = {
        "Individual": "individual",
        "Company": "company",
        "In Store": "instore",
      };
      const targetType = postingTypeMap[selectedPostingType];
      if (targetType) {
        filtered = filtered.filter((item) => item.postingAs === targetType);
      }
    }

    // Filter by location (from sidebar)
    if (filterLocation.trim()) {
      const locationLower = filterLocation.toLowerCase();
      filtered = filtered.filter((item) =>
        item.location?.toLowerCase().includes(locationLower) ||
        userMeta[item.userId]?.location?.toLowerCase().includes(locationLower)
      );
    }

    // Filter by area (from sidebar)
    if (filterArea.trim()) {
      const areaLower = filterArea.toLowerCase();
      filtered = filtered.filter((item) =>
        item.location?.toLowerCase().includes(areaLower) ||
        userMeta[item.userId]?.location?.toLowerCase().includes(areaLower)
      );
    }

    // Filter by day posted (from sidebar)
    if (filterDayPosted !== "Any time") {
      const now = new Date();
      filtered = filtered.filter((item) => {
        const itemDate = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
        const diffHours = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
        if (filterDayPosted === "Last 24 hours") return diffHours <= 24;
        if (filterDayPosted === "Last 7 days") return diffHours <= 168;
        if (filterDayPosted === "Last 30 days") return diffHours <= 720;
        return true;
      });
    }

    // Saved filter
    if (showSaved) {
      filtered = filtered.filter((item) => item.id && savedShowcaseIds.has(item.id));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (selectedSort) {
        case "Oldest":
          return a.createdAt.getTime() - b.createdAt.getTime();
        case "Rating: High to Low":
          const ratingA = userMeta[a.userId]?.rating || 0;
          const ratingB = userMeta[b.userId]?.rating || 0;
          return ratingB - ratingA;
        case "Rating: Low to High":
          const ratingA2 = userMeta[a.userId]?.rating || 0;
          const ratingB2 = userMeta[b.userId]?.rating || 0;
          return ratingA2 - ratingB2;
        case "Newest":
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return filtered;
  }, [showcases, searchQuery, selectedCategory, selectedRating, selectedPostingType, showSaved, selectedSort, savedShowcaseIds, userMeta, filterLocation, filterArea, filterDayPosted]);

  const handleSaveToggle = async (showcase: ShowcaseItem) => {
    if (!user) {
      alert("Please sign in to save showcases.");
      return;
    }

    if (!showcase.id) return;

    const isSaved = savedShowcaseIds.has(showcase.id);
    setSavingShowcaseId(showcase.id);

    try {
      if (isSaved) {
        await unbookmarkShowcase(user.uid, showcase.id);
        setSavedShowcaseIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(showcase.id!);
          return newSet;
        });
      } else {
        await bookmarkShowcase(user.uid, showcase.id, showcase.userId);
        setSavedShowcaseIds((prev) => new Set(prev).add(showcase.id!));
      }
    } catch (error: any) {
      console.error("Error toggling bookmark:", error);
      alert("Failed to save showcase. Please try again.");
    } finally {
      setSavingShowcaseId(null);
    }
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
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-darkBlue-003 hover:bg-gray-50 dark:hover:bg-blue-500/10 transition-colors"
      >
        <span className="font-medium text-gray-700 dark:text-blue-300">{label}</span>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-500 dark:text-blue-300" />
        ) : (
          <Plus className="h-5 w-5 text-gray-500 dark:text-blue-300" />
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
            ? "bg-red-100 dark:bg-blue-500/30 text-red-600 dark:text-blue-200"
            : "hover:bg-gray-100 dark:hover:bg-blue-500/10 text-gray-700 dark:text-blue-300"
        )}
    >
      <div
        className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
          selected ? "border-red-500 bg-red-500 dark:border-blue-400 dark:bg-blue-400" : "border-gray-300 dark:border-blue-500/30"
        )}
      >
        {selected && <Check className="h-2.5 w-2.5 text-white" />}
      </div>
      {label}
    </button>
  );

  return (
    <DashboardLayout>
      <style dangerouslySetInnerHTML={{__html: `
        .category-scroll::-webkit-scrollbar {
          display: none;
        }
        .category-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
      
      {/* Filter Sidebar Overlay */}
      {isFilterOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[100]"
          onClick={() => setIsFilterOpen(false)}
        />
      )}

      {/* Filter Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-full sm:w-96 bg-white dark:bg-darkBlue-003 z-[101] transform transition-transform duration-300 ease-in-out flex flex-col",
          isFilterOpen ? "translate-x-0" : "-translate-x-full"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-blue-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-blue-200 text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-blue-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-blue-200 text-sm"
            />
          </FilterOption>

          {/* Poster Type */}
          <FilterOption
            label="Poster Type"
            isExpanded={expandedSections.posterType}
            onToggle={() => toggleSection("posterType")}
          >
            <div className="space-y-1">
              {postingTypeOptions.map((type) => (
                <RadioOption
                  key={type}
                  label={type}
                  selected={filterPostingType === type}
                  onSelect={() => setFilterPostingType(type)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Rating */}
          <FilterOption
            label="Rating"
            isExpanded={expandedSections.rating}
            onToggle={() => toggleSection("rating")}
          >
            <div className="space-y-1">
              {ratingOptions.map((option) => (
                <RadioOption
                  key={option}
                  label={option}
                  selected={filterRating === option}
                  onSelect={() => setFilterRating(option)}
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
        </div>

        {/* Filter Actions */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <button
            onClick={clearFilters}
            className="w-full py-3 border border-gray-300 dark:border-blue-500/30 text-gray-700 dark:text-blue-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-blue-500/10 transition-colors"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Explore Here"
              className="w-full px-6 py-4 pl-12 pr-4 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-darkBlue-003 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-red-500" />
          </div>
        </div>

        {/* Category Navigation */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 overflow-x-auto pb-2 flex-1 category-scroll">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                className={`whitespace-nowrap text-sm font-medium transition-colors pb-1 ${
                  selectedCategory === category
                    ? "text-red-500 border-b-2 border-red-500"
                    : "text-gray-600 dark:text-blue-300 hover:text-gray-900 dark:hover:text-blue-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSaved(!showSaved)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              showSaved
                ? "bg-red-500 text-white"
                : "bg-gray-100 dark:bg-blue-500/20 dark:border-blue-500/30 text-gray-700 dark:text-blue-300 hover:bg-gray-200 dark:hover:bg-blue-500/30 border dark:border-blue-500/30"
            }`}
          >
            <Bookmark className={`h-4 w-4 ${showSaved ? "fill-white" : ""}`} />
            Show Saved
          </button>
        </div>

        {/* Filter Section */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="relative p-2 hover:bg-gray-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors flex-shrink-0"
          >
            <Filter className="h-5 w-5 text-gray-700 dark:text-blue-300" />
            {getActiveFiltersCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {getActiveFiltersCount()}
              </span>
            )}
          </button>

          {/* Rating Dropdown */}
          <div className="relative">
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="appearance-none px-4 py-2 pr-8 rounded-lg bg-gray-100 dark:bg-blue-500/20 dark:border-blue-500/30 text-gray-700 dark:text-blue-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer border dark:border-blue-500/30"
            >
              {ratingOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-blue-300 pointer-events-none" />
          </div>

          {/* Sort By Dropdown */}
          <div className="relative">
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="appearance-none px-4 py-2 pr-8 rounded-lg bg-gray-100 dark:bg-blue-500/20 dark:border-blue-500/30 text-gray-700 dark:text-blue-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer border dark:border-blue-500/30"
            >
              {sortOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-blue-300 pointer-events-none" />
          </div>

          {/* Posting Type Dropdown */}
          <div className="relative">
            <select
              value={selectedPostingType}
              onChange={(e) => setSelectedPostingType(e.target.value)}
              className="appearance-none px-4 py-2 pr-8 rounded-lg bg-gray-100 dark:bg-blue-500/20 dark:border-blue-500/30 text-gray-700 dark:text-blue-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer border dark:border-blue-500/30"
            >
              {postingTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-blue-300 pointer-events-none" />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-center py-12 text-red-500 dark:text-red-400">
            <p className="text-lg">{error}</p>
          </div>
        )}

        {/* Showcases Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-darkBlue-203 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 h-[320px] animate-pulse"
              />
            ))}
          </div>
        ) : filteredAndSortedShowcases.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg">No showcase items found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredAndSortedShowcases.map((item) => {
              const imageUrl = item.imageUrls?.[0] || fallbackImage;
              const skills = item.skills
                ? item.skills.split(",").map((s) => s.trim()).filter(Boolean)
                : item.tags || [];
              const meta = item.userId ? userMeta[item.userId] : undefined;

              return (
                <div
                  key={item.id || item.title}
                  className="bg-white dark:bg-darkBlue-203 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                >
                  {/* Image Section */}
                  <div className="relative h-40 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                    <img
                      src={imageUrl}
                      alt={item.title || "Showcase"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackImage;
                      }}
                    />
                    {/* Pagination Dots */}
                    {item.imageUrls && item.imageUrls.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                        {item.imageUrls.slice(0, 3).map((_, index) => (
                          <div
                            key={index}
                            className={`w-1.5 h-1.5 rounded-full ${
                              index === 0 ? "bg-red-500 w-3" : "bg-white/50"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {skills.slice(0, 2).map((skill, idx) => (
                        <span
                          key={`${skill}-${idx}`}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {skill.length > 15 ? `${skill.substring(0, 15)}...` : skill}
                        </span>
                      ))}
                      {item.postingAs === "company" && item.companyName && (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">
                          Company
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                      {item.title || "Untitled"}
                    </h3>

                    {/* Location */}
                    <div className="flex items-start gap-1.5 mb-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {item.location || meta?.location || "Remote / Unspecified"}
                      </p>
                    </div>

                    {/* Provider Name */}
                    {meta?.name && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-1">
                        by {meta.name}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveToggle(item)}
                        disabled={savingShowcaseId === item.id}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          item.id && savedShowcaseIds.has(item.id)
                            ? "bg-primary-500 dark:bg-primary-600 text-white border border-primary-600 dark:border-primary-700 hover:bg-primary-600 dark:hover:bg-primary-700"
                            : "bg-white dark:bg-darkBlue-003 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Bookmark
                          className={`h-4 w-4 ${
                            item.id && savedShowcaseIds.has(item.id) ? "fill-white" : ""
                          }`}
                        />
                        {savingShowcaseId === item.id
                          ? "Saving..."
                          : item.id && savedShowcaseIds.has(item.id)
                          ? "Saved"
                          : "Save"}
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                        <MessageSquare className="h-4 w-4" />
                        Contact
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
