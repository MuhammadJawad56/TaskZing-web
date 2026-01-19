"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Edit, Star, Calendar, MapPin, QrCode, X, MessageSquare, Bookmark } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getUserById } from "@/lib/firebase/users";
import { getJobsByClientId } from "@/lib/firebase/jobs";
import { useAuth } from "@/lib/firebase/AuthContext";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { getOrCreateChatRoom } from "@/lib/firebase/messages";
import { collection, query, where, getDocs, addDoc, deleteDoc, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Task } from "@/lib/types/task";
import { User } from "@/lib/types/user";

type TabType = "all" | "active" | "complete" | "reviews" | "saved";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, userData } = useAuth();
  const { theme } = useTheme();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showQRModal, setShowQRModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [bookmarkedProfiles, setBookmarkedProfiles] = useState<User[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const userId = params?.id as string;
  const isOwnProfile = currentUser?.uid === userId || userData?.uid === userId;

  // Helper to get photo URL with fallbacks
  const getPhotoUrl = (user: User | null): string | null => {
    if (!user) return null;
    const url = user.photoUrl || user.photos?.[0] || null;
    // Ensure it's a valid non-empty string
    return (url && typeof url === "string" && url.trim().length > 0) ? url : null;
  };

  // Handle image load errors
  const handleImageError = (userId: string) => {
    setImageErrors((prev) => new Set(prev).add(userId));
  };

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      
      setLoading(true);
      try {
        // Fetch user data
        const user = await getUserById(userId);
        if (!user) {
          router.push("/not-found");
          return;
        }
        setProfileUser(user);

        // Fetch jobs posted by this user
        const userJobs = await getJobsByClientId(userId);
        setJobs(userJobs);

        // Check if profile is bookmarked
        if (!isOwnProfile && currentUser) {
          checkBookmarkStatus();
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId, router, isOwnProfile, currentUser]);

  // Reset to "all" tab if viewing someone else's profile and saved tab is active
  useEffect(() => {
    if (!isOwnProfile && activeTab === "saved") {
      setActiveTab("all");
    }
  }, [isOwnProfile, activeTab]);

  // Load bookmarked profiles when viewing own profile and saved tab is active
  useEffect(() => {
    if (isOwnProfile && activeTab === "saved" && currentUser) {
      loadBookmarkedProfiles();
    }
  }, [isOwnProfile, activeTab, currentUser]);

  const checkBookmarkStatus = async () => {
    if (!currentUser || !userId) return;

    try {
      const q = query(
        collection(db, "profileBookmarks"),
        where("bookmarkedBy", "==", currentUser.uid),
        where("profileUserId", "==", userId)
      );
      const snapshot = await getDocs(q);
      setIsBookmarked(!snapshot.empty);
    } catch (error) {
      console.error("Error checking bookmark status:", error);
    }
  };

  const handleChat = async () => {
    if (!currentUser || !profileUser) {
      alert("Please sign in to send a message.");
      return;
    }

    try {
      const chatRoomId = await getOrCreateChatRoom([currentUser.uid, profileUser.uid]);
      router.push(`/chats/${chatRoomId}`);
    } catch (error) {
      console.error("Error creating chat room:", error);
      alert("Failed to start chat. Please try again.");
    }
  };

  const handleBookmark = async () => {
    if (!currentUser || !userId) {
      alert("Please sign in to bookmark profiles.");
      return;
    }

    setIsBookmarking(true);
    try {
      if (isBookmarked) {
        // Remove bookmark
        const q = query(
          collection(db, "profileBookmarks"),
          where("bookmarkedBy", "==", currentUser.uid),
          where("profileUserId", "==", userId)
        );
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        setIsBookmarked(false);
        // Reload bookmarked profiles if viewing own profile and saved tab is active
        if (isOwnProfile && activeTab === "saved") {
          loadBookmarkedProfiles();
        }
      } else {
        // Add bookmark
        await addDoc(collection(db, "profileBookmarks"), {
          bookmarkedBy: currentUser.uid,
          profileUserId: userId,
          createdAt: Timestamp.now(),
        });
        setIsBookmarked(true);
        // Reload bookmarked profiles if viewing own profile and saved tab is active
        if (isOwnProfile && activeTab === "saved") {
          loadBookmarkedProfiles();
        }
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      alert("Failed to bookmark profile. Please try again.");
    } finally {
      setIsBookmarking(false);
}
  };

  const loadBookmarkedProfiles = async () => {
    if (!currentUser) return;

    setLoadingBookmarks(true);
    try {
      // First, get all bookmarks without ordering to avoid index issues
      const q = query(
        collection(db, "profileBookmarks"),
        where("bookmarkedBy", "==", currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const bookmarks = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          profileUserId: data.profileUserId as string,
          createdAt: data.createdAt as Timestamp | undefined,
        };
      });
      
      // Sort by createdAt if available, otherwise by document ID
      bookmarks.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
        return b.id.localeCompare(a.id);
      });
      
      const profileIds = bookmarks.map((bookmark) => bookmark.profileUserId).filter(Boolean);

      // Fetch user data for each bookmarked profile
      const profilePromises = profileIds.map((id) => getUserById(id));
      const profiles = await Promise.all(profilePromises);
      setBookmarkedProfiles(profiles.filter((p) => p !== null) as User[]);
    } catch (error) {
      console.error("Error loading bookmarked profiles:", error);
      setBookmarkedProfiles([]);
    } finally {
      setLoadingBookmarks(false);
    }
  };

  // Filter jobs based on active tab
  const filteredJobs = React.useMemo(() => {
    switch (activeTab) {
      case "active":
        return jobs.filter(
          (job) =>
            job.completionStatus === "open" ||
            job.completionStatus === "in_progress"
        );
      case "complete":
        return jobs.filter((job) => job.completionStatus === "completed");
      case "all":
      default:
        return jobs;
    }
  }, [jobs, activeTab]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return dateString;
    }
  };

  // Format member since date
  const formatMemberSince = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const month = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      return `Member since ${month} ${year}`;
    } catch {
      return "N/A";
    }
  };

  // Get user initials for avatar
  const getInitials = (name?: string) => {
    if (!name || name === "User") {
      // Try to get initials from profileUser data
      const displayName = profileUser?.fullName || profileUser?.username || profileUser?.email?.split("@")[0];
      if (displayName && displayName !== "User") {
        return displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
      }
      return "U";
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Show content even while loading, with empty states
  if (!profileUser && !loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-theme-primaryText">User not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { id: "all" as TabType, label: "All Jobs", count: jobs.length },
    {
      id: "active" as TabType,
      label: "Active Jobs",
      count: jobs.filter(
        (j) => j.completionStatus === "open" || j.completionStatus === "in_progress"
      ).length,
    },
    {
      id: "complete" as TabType,
      label: "Complete Jobs",
      count: jobs.filter((j) => j.completionStatus === "completed").length,
    },
    { id: "reviews" as TabType, label: "Reviews", count: 0 },
    ...(isOwnProfile ? [{ id: "saved" as TabType, label: "Saved", count: bookmarkedProfiles.length }] : []),
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        {profileUser && (
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-full bg-pink-200 text-pink-700 flex items-center justify-center text-2xl font-medium overflow-hidden">
              {getPhotoUrl(profileUser) && !imageErrors.has(userId) ? (
                <img
                  src={getPhotoUrl(profileUser)!}
                  alt={profileUser?.fullName || profileUser?.username || profileUser?.email?.split("@")[0] || "User"}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(userId)}
                  loading="lazy"
                />
              ) : (
                <span>{getInitials(profileUser?.fullName || profileUser?.username || profileUser?.email?.split("@")[0] || "User")}</span>
              )}
            </div>

            {/* User Info */}
              <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-theme-primaryText">
                  {profileUser?.fullName || profileUser?.username || profileUser?.email?.split("@")[0] || "User"}
                </h1>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Show QR Code"
                >
                  <QrCode className="h-5 w-5 text-theme-accent4" />
                </button>
                {isOwnProfile ? (
                  <Link href={`/edit-profile?returnTo=/profile/${userId}`} className="-ml-1">
                    <button className="px-4 py-2 rounded-full bg-gray-100 text-blue-600 font-semibold hover:bg-gray-200 transition-colors shadow-sm">
                      Edit Profile
                    </button>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleChat}
                      className="w-12 h-12 rounded-2xl bg-red-500 hover:bg-red-600 border-2 border-red-600 flex items-center justify-center transition-colors shadow-sm"
                      aria-label="Send Message"
                    >
                      <MessageSquare className="h-5 w-5 text-white" />
                    </button>
                    <button
                      onClick={handleBookmark}
                      disabled={isBookmarking}
                      className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-colors shadow-sm ${
                        isBookmarked
                          ? "bg-red-500 border-red-600 hover:bg-red-600"
                          : "bg-gray-100 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      aria-label={isBookmarked ? "Remove Bookmark" : "Bookmark Profile"}
                    >
                      <Bookmark
                        className={`h-5 w-5 ${
                          isBookmarked
                            ? "text-white fill-white"
                            : "text-gray-600 dark:text-gray-300"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Location */}
              {profileUser?.location && (
                <div className="flex items-center gap-2 text-theme-accent4 mb-2">
                  <MapPin className="h-4 w-4" />
                  <span>{profileUser.location}</span>
                </div>
              )}

              {/* Rating */}
              <div className="flex items-center gap-2 text-theme-accent4 mb-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>
                  {profileUser?.totalRating?.toFixed(1) || "0.0"} (
                  {profileUser?.totalReviews || 0} Reviews)
                </span>
            </div>

              {/* Member Since */}
              <div className="flex items-center gap-2 text-theme-accent4 mb-2">
                <Calendar className="h-4 w-4" />
                <span>{formatMemberSince(profileUser?.createdAt)}</span>
              </div>

              {/* Bio */}
              {profileUser?.description && (
                <p className="text-theme-accent4 mb-3">
                  {profileUser.description}
                </p>
              )}

              {/* Skills */}
              {profileUser?.skills && profileUser.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profileUser.skills.slice(0, 5).map((skill, i) => (
                    <Badge key={i} variant="default" className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
                </div>
              </div>
            )}

        {/* Navigation Tabs */}
        <div className="border-b border-theme-accent2 mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      isActive
                        ? "border-red-500 text-theme-primaryText"
                        : "border-transparent text-theme-accent4 hover:text-theme-primaryText hover:border-theme-accent2"
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Jobs Table */}
        {activeTab !== "reviews" && activeTab !== "saved" && (
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-theme-accent2">
                <thead className="bg-gray-800 dark:bg-gray-700 rounded-t-lg">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 dark:text-gray-300 uppercase tracking-wider rounded-tl-lg">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 dark:text-gray-300 uppercase tracking-wider">
                      Job Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 dark:text-gray-300 uppercase tracking-wider">
                      Delivery Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 dark:text-gray-300 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 dark:text-gray-300 uppercase tracking-wider rounded-tr-lg">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-theme-accent2">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-theme-accent4"
                      >
                        No jobs found
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr 
                        key={job.jobId} 
                        onClick={() => router.push(`/all-jobs/${job.jobId}`)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-8 w-8 rounded-full bg-pink-200 text-pink-700 flex items-center justify-center text-xs font-medium overflow-hidden">
              {getPhotoUrl(profileUser) && !imageErrors.has(userId) ? (
                <img
                  src={getPhotoUrl(profileUser)!}
                  alt={profileUser?.fullName || profileUser?.username || profileUser?.email?.split("@")[0] || "User"}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(userId)}
                  loading="lazy"
                />
              ) : (
                <span>{getInitials(profileUser?.fullName || profileUser?.username || profileUser?.email?.split("@")[0] || "User")}</span>
              )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
              <div>
                            <div className="font-medium text-theme-primaryText">
                              {job.title}
                            </div>
                            <p className="text-sm text-theme-accent4 truncate max-w-md">
                              {job.description || job.address}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-theme-accent4">
                          {formatDate(job.jobDate || job.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-theme-primaryText font-medium">
                          ${job.price || job.fixedPrice || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-theme-primaryText dark:text-gray-300">
                            {job.completionStatus || "open"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <div className="bg-white rounded-lg p-6">
            <p className="text-theme-accent4 text-center py-8">
              No reviews yet
            </p>
          </div>
        )}

        {/* Saved Tab */}
        {activeTab === "saved" && (
          <div className="bg-white dark:bg-darkBlue-003 rounded-lg p-6">
            {loadingBookmarks ? (
              <div className="text-center py-8 text-theme-accent4">Loading saved profiles...</div>
            ) : bookmarkedProfiles.length === 0 ? (
              <p className="text-theme-accent4 text-center py-8">
                No saved profiles yet. Bookmark profiles to see them here.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookmarkedProfiles.map((profile) => (
                  <div
                    key={profile.uid}
                    onClick={() => router.push(`/profile/${profile.uid}`)}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <div className="h-12 w-12 rounded-full bg-red-200 text-red-700 flex items-center justify-center text-lg font-medium overflow-hidden flex-shrink-0">
                      {getPhotoUrl(profile) && !imageErrors.has(profile.uid) ? (
                        <img
                          src={getPhotoUrl(profile)!}
                          alt={profile.fullName || profile.username || "User"}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(profile.uid)}
                          loading="lazy"
                        />
                      ) : (
                        <span>{getInitials(profile.fullName || profile.username || profile.email?.split("@")[0])}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base line-clamp-1">
                        {profile.fullName || profile.username || profile.email?.split("@")[0] || "User"}
                      </h3>
                      {profile.location && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                          {profile.location}
                        </p>
                      )}
                      {profile.totalRating !== undefined && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{profile.totalRating.toFixed(1)} ({profile.totalReviews || 0})</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && profileUser && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm"
              onClick={() => setShowQRModal(false)}
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
                    onClick={() => setShowQRModal(false)}
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>

                {/* QR Code Display */}
                <div className="p-8 flex flex-col items-center bg-white dark:bg-white">
                  <div className="relative bg-white p-4 rounded-lg">
                    <div className="relative w-[280px] h-[280px] mx-auto">
                      <QRCodeSVG
                        value={JSON.stringify({
                          type: "profile",
                          name: profileUser?.fullName || profileUser?.username || profileUser?.email?.split("@")[0] || "User",
                          email: profileUser?.email,
                          phone: profileUser?.phoneNumber,
                          location: profileUser?.location,
                          profileUrl: typeof window !== "undefined" ? `${window.location.origin}/profile/${userId}` : "",
                        })}
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
                  </div>
                </div>

                {/* Footer Button */}
                <div className="px-6 pb-6">
                  <button
                    onClick={() => {
                      // Share QR code functionality
                      const profileUrl = typeof window !== "undefined" ? `${window.location.origin}/profile/${userId}` : "";
                      if (navigator.share) {
                        navigator.share({
                          title: `${profileUser?.fullName || "User"}'s Profile`,
                          text: `Check out ${profileUser?.fullName || "User"}'s profile on TaskZing`,
                          url: profileUrl,
                        });
                      } else {
                        // Fallback: Copy to clipboard
                        navigator.clipboard.writeText(profileUrl);
                        alert("Profile link copied to clipboard!");
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

      </div>
    </DashboardLayout>
  );
}
