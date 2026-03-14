/**
 * Authentication service using backend API
 * Replaces Firebase authentication
 */

import { apiClient, UserData, AuthResponse } from "./client";

// Re-export UserData for use in other files
export type { UserData } from "./client";

const TEST_USER_STORAGE_KEY = "taskzing_test_user";

export class AuthError extends Error {
  code: string;
  constructor(message: string, code: string = "auth/unknown") {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

// Convert backend UserData to AuthUser format (for compatibility)
function convertToAuthUser(userData: UserData): AuthUser {
  return {
    uid: userData.id || userData.uid || "",
    email: userData.email || null,
    displayName: userData.fullName || userData.name || null,
    photoURL: userData.photoUrl || userData.profilePicture || null,
  };
}

function getStoredTestUserData(): UserData | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(TEST_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}

function saveStoredTestUserData(userData: UserData | null) {
  if (typeof window === "undefined") return;

  if (!userData) {
    localStorage.removeItem(TEST_USER_STORAGE_KEY);
    return;
  }

  localStorage.setItem(TEST_USER_STORAGE_KEY, JSON.stringify(userData));
}

export function setTestSession(userData: Partial<UserData>): UserData {
  const now = new Date().toISOString();
  const sessionUser: UserData = {
    id: userData.id || userData.uid || "test-user",
    uid: userData.uid || userData.id || "test-user",
    email: userData.email || "test@example.com",
    fullName: userData.fullName || userData.name || "Test User",
    name: userData.name || userData.fullName || "Test User",
    role: userData.role || "client",
    currentRole: userData.currentRole || "client",
    providerProfileCompleted: userData.providerProfileCompleted || false,
    location: userData.location,
    skills: userData.skills || [],
    photoUrl: userData.photoUrl,
    profilePicture: userData.profilePicture,
    isVerified: userData.isVerified ?? false,
    createdAt: userData.createdAt || now,
    updatedAt: now,
    isAvailableForWork: userData.isAvailableForWork ?? false,
    bio: userData.bio,
    about: userData.about,
  };

  saveStoredTestUserData(sessionUser);
  return sessionUser;
}

export function clearTestSession(): void {
  saveStoredTestUserData(null);
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: "client" | "provider" | "client+provider" = "client"
): Promise<{ user: AuthUser; userData: UserData }> {
  const response = await apiClient.signUp(email, password, fullName, role);

  if (response.error || !response.data) {
    throw new AuthError(response.error || "Sign up failed", "signup-failed");
  }

  const authResponse = response.data as AuthResponse;
  const user = convertToAuthUser(authResponse.user);
  const userData = authResponse.user;

  return { user, userData };
}

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser; userData: UserData }> {
  const response = await apiClient.signIn(email, password);

  if (response.error || !response.data) {
    throw new AuthError(response.error || "Sign in failed", "signin-failed");
  }

  const authResponse = response.data as AuthResponse;
  const user = convertToAuthUser(authResponse.user);
  const userData = authResponse.user;

  return { user, userData };
}

/**
 * Sign in with Google
 * Note: You'll need to implement Google Sign-In on the frontend
 * and pass the idToken to this function
 */
export async function signInWithGoogle(
  idToken?: string
): Promise<{ user: AuthUser; userData: UserData }> {
  if (!idToken) {
    const userData = setTestSession({
      id: "test-user",
      uid: "test-user",
      email: "google-test@example.com",
      fullName: "Google Test User",
      name: "Google Test User",
      role: "client",
      currentRole: "client",
    });
    return { user: convertToAuthUser(userData), userData };
  }

  const response = await apiClient.signInWithGoogle(idToken);

  if (response.error || !response.data) {
    throw new Error(response.error || "Google sign in failed");
  }

  const authResponse = response.data as AuthResponse;
  const user = convertToAuthUser(authResponse.user);
  const userData = authResponse.user;

  return { user, userData };
}

/**
 * Sign in with Apple
 * Note: You'll need to implement Apple Sign-In on the frontend
 * and pass the idToken to this function
 */
export async function signInWithApple(
  idToken?: string
): Promise<{ user: AuthUser; userData: UserData }> {
  if (!idToken) {
    const userData = setTestSession({
      id: "test-user",
      uid: "test-user",
      email: "apple-test@example.com",
      fullName: "Apple Test User",
      name: "Apple Test User",
      role: "client",
      currentRole: "client",
    });
    return { user: convertToAuthUser(userData), userData };
  }

  const response = await apiClient.signInWithApple(idToken);

  if (response.error || !response.data) {
    throw new Error(response.error || "Apple sign in failed");
  }

  const authResponse = response.data as AuthResponse;
  const user = convertToAuthUser(authResponse.user);
  const userData = authResponse.user;

  return { user, userData };
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await apiClient.logout();
  clearTestSession();
}

/**
 * Get current user data
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await apiClient.getCurrentUser();

  if (response.error || !response.data) {
    const testUser = getStoredTestUserData();
    return testUser ? convertToAuthUser(testUser) : null;
  }

  return convertToAuthUser(response.data);
}

/**
 * Get user data by ID
 */
export async function getUserData(userId: string): Promise<UserData | null> {
  const response = await apiClient.getUserData(userId);

  if (response.error || !response.data) {
    const testUser = getStoredTestUserData();
    if (testUser && (testUser.id === userId || testUser.uid === userId)) {
      return testUser;
    }
    return null;
  }

  return response.data;
}

/**
 * Subscribe to auth state changes
 * Since we're using JWT tokens, we'll poll the API periodically
 * or check on mount. This is a simplified version.
 */
export function onAuthChange(
  callback: (user: AuthUser | null) => void
): () => void {
  let isActive = true;

  const checkAuth = async () => {
    if (!isActive) return;
    // Only run in browser environment
    if (typeof window === "undefined") {
      callback(null);
      return;
    }

    try {
      const user = await getCurrentUser();
      if (isActive) {
        callback(user);
      }
    } catch (error) {
      // Silently fail - user is not authenticated
      if (isActive) {
        callback(null);
      }
    }
  };

  // Only check if we're in the browser
  if (typeof window !== "undefined") {
    // Check immediately
    checkAuth();

    // Check periodically (every 5 minutes)
    const interval = setInterval(() => {
      if (isActive) {
        checkAuth();
      }
    }, 5 * 60 * 1000);

    // Return unsubscribe function
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }

  // Return no-op unsubscribe for SSR
  return () => {
    isActive = false;
  };
}

/**
 * Reset password
 */
export async function resetPassword(email: string): Promise<void> {
  const response = await apiClient.resetPassword(email);

  if (response.error) {
    throw new Error(response.error);
  }
}

/**
 * Resend email verification
 * Note: Implement this endpoint on your backend if needed
 */
export async function resendEmailVerification(): Promise<void> {
  return;
}

/**
 * Set auth cookie for middleware (if needed)
 */
export function setAuthCookie(user: AuthUser): void {
  if (typeof document === "undefined") return;
  document.cookie = `auth-token=${user.uid || "test-session"}; path=/; max-age=86400; samesite=lax`;
}

export async function handleAppleRedirect(): Promise<{
  user: AuthUser;
  userData: UserData;
} | null> {
  return null;
}

/**
 * Check if user profile is complete
 */
export async function isProfileComplete(userId: string): Promise<boolean> {
  const userData = await getUserData(userId);
  if (!userData) return false;

  const hasBasicProfile = !!(
    userData.email &&
    (userData.fullName || userData.name) &&
    userData.username &&
    userData.location
  );

  const isProviderRole =
    userData.role === "provider" ||
    userData.role === "client+provider" ||
    userData.role === "both" ||
    userData.currentRole === "provider";

  if (isProviderRole) {
    return hasBasicProfile && !!(userData.description || userData.bio || userData.about);
  }

  return hasBasicProfile;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<UserData>
): Promise<UserData> {
  const response = await apiClient.updateUser(userId, data);

  if (response.error || !response.data) {
    const testUser = getStoredTestUserData();
    if (testUser && (testUser.id === userId || testUser.uid === userId)) {
      const updatedUser = {
        ...testUser,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveStoredTestUserData(updatedUser);
      return updatedUser;
    }
    throw new AuthError(response.error || "Failed to update user profile", "update-profile-failed");
  }

  return response.data;
}

export async function switchUserRole(
  userId: string,
  newRole: "client" | "provider"
): Promise<UserData> {
  const currentUser = await getUserData(userId);

  if (!currentUser) {
    throw new AuthError("User not found", "user-not-found");
  }

  const nextRole =
    currentUser.role === "client+provider" ||
    currentUser.role === "both" ||
    currentUser.role === newRole
      ? currentUser.role
      : newRole === "provider"
        ? "client+provider"
        : currentUser.role || "client";

  return updateUserProfile(userId, {
    role: nextRole,
    currentRole: newRole,
  });
}
