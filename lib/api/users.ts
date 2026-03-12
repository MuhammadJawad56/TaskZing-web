import {
  getUserData as getApiUserData,
  isProfileComplete as getProfileCompletionState,
  type UserData,
} from "./auth";
import { getUserById as getMockUserById } from "@/lib/mock-data/users";
import type { User } from "@/lib/types/user";

const TEST_USER_STORAGE_KEY = "taskzing_test_user";
const PROFILE_BOOKMARKS_STORAGE_KEY = "taskzing_profile_bookmarks";

type StoredProfileBookmark = {
  bookmarkedBy: string;
  profileUserId: string;
  createdAt: string;
};

function readStoredTestUser(): UserData | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(TEST_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}

function toUser(userData: Partial<UserData> & { id: string; email: string }): User {
  const uid = userData.uid || userData.id;
  const createdAt = userData.createdAt || new Date().toISOString();
  const updatedAt = userData.updatedAt || createdAt;

  return {
    id: userData.id,
    uid,
    email: userData.email,
    username: userData.email?.split("@")[0],
    fullName: userData.fullName || userData.name || userData.email?.split("@")[0] || "User",
    photoUrl: userData.photoUrl || userData.profilePicture,
    role: userData.role === "client+provider" ? "provider" : (userData.role as User["role"]) || "client",
    currentRole:
      userData.currentRole === "both"
        ? "provider"
        : (userData.currentRole as User["currentRole"]) ||
          ((userData.role === "client+provider" ? "provider" : userData.role) as User["currentRole"]) ||
          "client",
    location: userData.location,
    description: userData.bio || userData.about,
    photos: userData.photoUrl || userData.profilePicture ? [userData.photoUrl || userData.profilePicture || ""] : [],
    isVerified: userData.isVerified ?? false,
    totalRating: userData.totalRating ?? 0,
    totalReviews: userData.totalReviews ?? 0,
    skills: userData.skills || [],
    createdAt,
    updatedAt,
  };
}

function readProfileBookmarks(): StoredProfileBookmark[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(PROFILE_BOOKMARKS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeProfileBookmarks(bookmarks: StoredProfileBookmark[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const apiUser = await getApiUserData(userId);
    if (apiUser?.id && apiUser.email) {
      return toUser(apiUser as UserData & { id: string; email: string });
    }
  } catch {
    // Fall through to local/mock data.
  }

  const storedTestUser = readStoredTestUser();
  if (
    storedTestUser &&
    (storedTestUser.id === userId || storedTestUser.uid === userId) &&
    storedTestUser.email
  ) {
    return toUser(storedTestUser as UserData & { id: string; email: string });
  }

  return getMockUserById(userId) || null;
}

export async function isProfileBookmarked(
  bookmarkedBy: string,
  profileUserId: string
): Promise<boolean> {
  return readProfileBookmarks().some(
    (bookmark) =>
      bookmark.bookmarkedBy === bookmarkedBy &&
      bookmark.profileUserId === profileUserId
  );
}

export async function bookmarkProfile(
  bookmarkedBy: string,
  profileUserId: string
): Promise<void> {
  const bookmarks = readProfileBookmarks();
  const exists = bookmarks.some(
    (bookmark) =>
      bookmark.bookmarkedBy === bookmarkedBy &&
      bookmark.profileUserId === profileUserId
  );

  if (exists) return;

  bookmarks.push({
    bookmarkedBy,
    profileUserId,
    createdAt: new Date().toISOString(),
  });
  writeProfileBookmarks(bookmarks);
}

export async function unbookmarkProfile(
  bookmarkedBy: string,
  profileUserId: string
): Promise<void> {
  const nextBookmarks = readProfileBookmarks().filter(
    (bookmark) =>
      !(
        bookmark.bookmarkedBy === bookmarkedBy &&
        bookmark.profileUserId === profileUserId
      )
  );
  writeProfileBookmarks(nextBookmarks);
}

export async function getBookmarkedProfiles(
  bookmarkedBy: string
): Promise<User[]> {
  const bookmarks = readProfileBookmarks()
    .filter((bookmark) => bookmark.bookmarkedBy === bookmarkedBy)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const profiles = await Promise.all(
    bookmarks.map((bookmark) => getUserById(bookmark.profileUserId))
  );

  return profiles.filter((profile): profile is User => profile !== null);
}

export async function isProfileComplete(userId: string): Promise<boolean> {
  return getProfileCompletionState(userId);
}

export async function getUserBookmarkedProfiles(bookmarkedBy: string): Promise<User[]> {
  return getBookmarkedProfiles(bookmarkedBy);
}
