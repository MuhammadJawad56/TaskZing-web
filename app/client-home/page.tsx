"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Map, Search, Heart, MessageSquare, Sparkles, Bookmark, Grid3x3, X, QrCode, Target } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  getAllShowcases,
  ShowcaseItem,
  bookmarkShowcase,
  unbookmarkShowcase,
  getUserBookmarkedShowcases,
  isShowcaseBookmarked,
} from "@/lib/firebase/showcase";
import { getUserData } from "@/lib/firebase/auth";
import { useAuth } from "@/lib/firebase/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { useTheme } from "@/lib/contexts/ThemeContext";

const fallbackImage = "/images/placeholder_image.png";

// Showcase Tile Component with Auto-sliding
function ShowcaseTile({ item, meta, skills, onSaveToggle, savedShowcaseIds, savingShowcaseId, onNavigate, currentUserId }: {
  item: ShowcaseItem;
  meta?: { name?: string; location?: string };
  skills: string[];
  onSaveToggle: (item: ShowcaseItem) => void;
  savedShowcaseIds: Set<string>;
  savingShowcaseId: string | null;
  onNavigate: (id: string) => void;
  currentUserId?: string;
}) {
  const images = item.imageUrls || [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-slide images if more than 1
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  const imageUrl = images[currentImageIndex] || fallbackImage;

  return (
    <div
      onClick={() => {
        if (item.id) {
          onNavigate(item.id);
        }
      }}
      className="bg-white dark:bg-darkBlue-203 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Image Section */}
      <div className="relative h-40 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
        <img
          src={imageUrl}
          alt={item.title || "Showcase"}
          className="w-full h-full object-cover transition-opacity duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackImage;
          }}
        />
        {/* Pagination Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {images.slice(0, 3).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentImageIndex ? "bg-red-500 w-3" : "bg-white/50 w-1.5"
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
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onSaveToggle(item)}
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
          {currentUserId && item.userId === currentUserId ? (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              <MessageSquare className="h-4 w-4" />
              Your Work
            </button>
          ) : (
            <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
              <MessageSquare className="h-4 w-4" />
              Contact
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientHomePage() {
  const router = useRouter();
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userMeta, setUserMeta] = useState<Record<string, { name?: string; location?: string }>>({});
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [savedShowcaseIds, setSavedShowcaseIds] = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savingShowcaseId, setSavingShowcaseId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [maxDistance] = useState(10); // Default 10km radius
  const [showcaseCoordinates, setShowcaseCoordinates] = useState<Record<string, { lat: number; lng: number }>>({});
  const { user, loading: authLoading, userData } = useAuth();
  const { theme } = useTheme();

  // Generate QR code data with user contact information
  const qrCodeData = user
    ? JSON.stringify({
        name: userData?.fullName || user.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        uid: user.uid,
      })
    : "";

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

  // Hydrate showcase cards with user profile info (name/location) from users collection
  useEffect(() => {
    const loadMeta = async () => {
      const ids = Array.from(new Set(showcases.map((s) => s.userId).filter(Boolean)));
      if (ids.length === 0) return;

      try {
        const entries = await Promise.all(
          ids.map(async (id) => {
            const data = await getUserData(id);
            // Prioritize fullName, if not available extract name from email (part before @)
            let displayName = data?.fullName;
            if (!displayName && data?.email) {
              displayName = data.email.split("@")[0];
            }
            return [
              id,
              {
                name: displayName || "User",
                location: (data as any)?.location || "",
              },
            ] as const;
          })
        );
        setUserMeta((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      } catch (err) {
        console.warn("Failed to load user meta for showcases", err);
      }
    };

    loadMeta();
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

  // Geocode showcase locations when "Near me" is active
  useEffect(() => {
    const geocodeShowcases = async () => {
      if (!nearMeActive || !userLocation) return;

      const showcasesToGeocode = showcases.filter(
        (item) => item.location && !showcaseCoordinates[item.id || ""]
      );

      if (showcasesToGeocode.length === 0) return;

      // Geocode in batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < showcasesToGeocode.length; i += batchSize) {
        const batch = showcasesToGeocode.slice(i, i + batchSize);
        const geocodePromises = batch.map(async (item) => {
          if (!item.id || !item.location) return null;
          // Add delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200 * (i / batchSize)));
          const coords = await geocodeLocation(item.location);
          if (coords) {
            return { id: item.id, coords };
          }
          return null;
        });

        const results = await Promise.all(geocodePromises);
        const newCoords: Record<string, { lat: number; lng: number }> = {};
        results.forEach((result) => {
          if (result) {
            newCoords[result.id] = result.coords;
          }
        });

        if (Object.keys(newCoords).length > 0) {
          setShowcaseCoordinates((prev) => ({ ...prev, ...newCoords }));
        }
      }
    };

    geocodeShowcases();
  }, [nearMeActive, userLocation, showcases, showcaseCoordinates]);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  // Geocode location string to coordinates
  const geocodeLocation = async (location: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
        {
          headers: {
            "User-Agent": "TaskZing/1.0",
          },
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  // Get user's current location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setNearMeActive(true);
        setIsFetchingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Please allow location access to find showcases near you.");
        setIsFetchingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleNearMe = () => {
    if (nearMeActive) {
      // Toggle off
      setNearMeActive(false);
      setUserLocation(null);
    } else {
      // Get location and activate
      getUserLocation();
    }
  };

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

  const filteredShowcases = useMemo(() => {
    let filtered = showcases;

    // Filter by saved if showSavedOnly is true
    if (showSavedOnly) {
      filtered = filtered.filter((item) => item.id && savedShowcaseIds.has(item.id));
    }

    // Filter by distance if "Near me" is active
    if (nearMeActive && userLocation) {
      filtered = filtered.filter((item) => {
        if (!item.id || !item.location) return false;
        const coords = showcaseCoordinates[item.id];
        if (!coords) return false; // Skip if not geocoded yet
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          coords.lat,
          coords.lng
        );
        return distance <= maxDistance;
      });
    }

    // Filter by search query
    const query = search.toLowerCase();
    if (query) {
      filtered = filtered.filter((item) => {
        const haystack = [
          item.title,
          item.description,
          item.location,
          item.companyName,
          item.storeName,
          item.skills,
          item.tags?.join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return filtered;
  }, [showcases, search, showSavedOnly, savedShowcaseIds, nearMeActive, userLocation, showcaseCoordinates, maxDistance]);

  return (
    <DashboardLayout onQRClick={() => setIsQRModalOpen(true)}>
      {/* QR Code Modal */}
      {isQRModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm"
            onClick={() => setIsQRModalOpen(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-darkBlue-003 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-red-700 via-red-800 to-purple-900 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                    <Image
                      src={theme === "dark" ? "/images/logos/Taskzing-Logo-dark-mode_1.png" : "/images/logos/Taskzing-Logo-light-mode_1.png"}
                      alt="TaskZing"
                      width={32}
                      height={32}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h2 className="text-white font-semibold text-lg">Scan for my Contact Information</h2>
                </div>
                <button
                  onClick={() => setIsQRModalOpen(false)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>

              {/* QR Code Display */}
              <div className="p-8 flex flex-col items-center bg-white dark:bg-white">
                <div className="relative bg-white p-4 rounded-lg">
                  {qrCodeData && (
                    <div className="relative w-[280px] h-[280px] mx-auto">
                      <QRCodeSVG
                        value={qrCodeData}
                        size={280}
                        level="H"
                        includeMargin={true}
                        marginSize={2}
                        className="w-full h-full"
                      />
                      {/* TaskZing Logo Overlay - Centered */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-lg border-2 border-gray-100 overflow-hidden p-2">
                          <Image
                            src={theme === "dark" ? "/images/logos/Taskzing-Logo-dark-mode_1.png" : "/images/logos/Taskzing-Logo-light-mode_1.png"}
                            alt="TaskZing"
                            width={64}
                            height={64}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Button */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => {
                    // Share QR code functionality
                    if (navigator.share) {
                      navigator.share({
                        title: "My Contact Information",
                        text: "Scan this QR code to get my contact information",
                      });
                    }
                  }}
                  className="w-full py-4 bg-gradient-to-r from-red-700 via-red-800 to-purple-900 text-white rounded-xl font-semibold hover:from-red-800 hover:via-red-900 hover:to-purple-950 transition-all shadow-lg"
                >
                  Scan/Share QR Code
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8">
        {/* Search Bar - Mobile Layout */}
        <div className="bg-white dark:bg-darkBlue-003 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          {/* Mobile View - Stacked Layout */}
          <div className="lg:hidden space-y-3">
            {/* First Row: Near me, Search, Map */}
          <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNearMe}
                disabled={isFetchingLocation}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  nearMeActive
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-red-500 text-white hover:bg-red-600"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Target className={`h-4 w-4 ${isFetchingLocation ? "animate-spin" : ""}`} />
                {isFetchingLocation ? "Locating..." : "Near me"}
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for services"
                  className="w-full px-4 py-2.5 pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-white"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              <Link
                href="/googlemap"
                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-darkBlue-003 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600"
              >
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">Map</span>
              </Link>
            </div>
            
            {/* Second Row: QR Code, Show Saved - Right aligned */}
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsQRModalOpen(true)}
                className="p-2.5 bg-gray-100 dark:bg-blue-500/20 dark:border-blue-500/30 rounded-xl hover:bg-gray-200 dark:hover:bg-blue-500/30 transition-colors flex items-center justify-center border border-gray-300 dark:border-blue-500/30"
                aria-label="QR Code"
                style={{ borderRadius: '12px' }}
              >
                <QrCode className="h-5 w-5 text-gray-700 dark:text-blue-300" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  showSavedOnly
                    ? "bg-red-500 text-white border-red-600"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <Bookmark className={`h-4 w-4 ${showSavedOnly ? "fill-white" : ""}`} />
                Show Saved
              </button>
            </div>
          </div>

          {/* Desktop View - Original Layout */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={handleNearMe}
              disabled={isFetchingLocation}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                nearMeActive
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-red-500 text-white hover:bg-red-600"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Sparkles className={`h-4 w-4 ${isFetchingLocation ? "animate-spin" : ""}`} />
              {isFetchingLocation ? "Locating..." : "Near me"}
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for services"
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-white"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <Link
              href="/googlemap"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-blue-500/20 dark:border-blue-500/30 text-gray-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-blue-500/30 transition-colors border dark:border-blue-500/30"
            >
              <Map className="h-4 w-4" />
              Map
            </Link>
            <button
              type="button"
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors border ${
                showSavedOnly
                  ? "bg-red-500 text-white border-red-600"
                  : "bg-gray-100 dark:bg-blue-500/20 dark:border-blue-500/30 text-gray-700 dark:text-blue-300 border-gray-300 dark:border-blue-500/30 hover:bg-gray-200 dark:hover:bg-blue-500/30"
              }`}
            >
              <Bookmark className={`h-4 w-4 ${showSavedOnly ? "fill-white" : ""}`} />
              Show Saved
            </button>
            <button
              type="button"
              onClick={() => setIsQRModalOpen(true)}
              className="p-2.5 bg-gray-100 dark:bg-blue-500/20 dark:border-blue-500/30 rounded-xl hover:bg-gray-200 dark:hover:bg-blue-500/30 transition-colors flex items-center justify-center border border-gray-300 dark:border-blue-500/30"
              aria-label="QR Code"
              style={{ borderRadius: '12px' }}
            >
              <QrCode className="h-5 w-5 text-gray-700 dark:text-blue-300" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto space-y-8 px-4 py-4 bg-gray-50 dark:bg-darkBlue-013 min-h-screen">

        {/* Showcase feed */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {loading &&
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="bg-white dark:bg-darkBlue-203 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 h-[320px] animate-pulse" />
            ))}

          {!loading && error && (
            <div className="col-span-full text-center text-red-500 py-8">{error}</div>
          )}

          {!loading && !error && filteredShowcases.length === 0 && (
            <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
              No showcase items found. Try a different search.
            </div>
          )}

          {!loading &&
            !error &&
            filteredShowcases.map((item) => {
              const skills = item.skills
                ? item.skills.split(",").map((s) => s.trim()).filter(Boolean)
                : item.tags || [];
              const meta = item.userId ? userMeta[item.userId] : undefined;

              return (
                <ShowcaseTile
                  key={item.id || item.title}
                  item={item}
                  meta={meta}
                  skills={skills}
                  onSaveToggle={handleSaveToggle}
                  savedShowcaseIds={savedShowcaseIds}
                  savingShowcaseId={savingShowcaseId}
                  onNavigate={(id) => router.push(`/work-details/${id}`)}
                  currentUserId={user?.uid}
                />
              );
            })}
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

