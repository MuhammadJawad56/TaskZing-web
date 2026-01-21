import { doc, getDoc } from "firebase/firestore";
import { db } from "./config";
import { User } from "@/lib/types/user";

// Get full user data from Firestore
export async function getUserById(uid: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const data = userDoc.data();
    
    // Convert Firestore timestamps to ISO strings
    const createdAt = data.createdAt?.toDate?.()?.toISOString() || 
                     (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString());
    const updatedAt = data.updatedAt?.toDate?.()?.toISOString() || 
                     (typeof data.updatedAt === 'string' ? data.updatedAt : createdAt);
    
    // Get name with multiple fallbacks
    const fullName = data.fullName || 
                     data.displayName || 
                     data.name || 
                     data.username || 
                     data.email?.split("@")[0] || 
                     "User";
    
    // Helper to validate and normalize photo URL
    const normalizePhotoUrl = (url: any): string | null => {
      if (!url) return null;
      const urlStr = typeof url === "string" ? url.trim() : String(url).trim();
      return urlStr.length > 0 ? urlStr : null;
    };
    
    // Get photo URL with multiple fallbacks - check various field names
    const photoUrl = normalizePhotoUrl(
      data.photoURL || 
      data.photoUrl || 
      data.avatar || 
      data.profileImage ||
      data.profilePicture ||
      data.profilePhoto ||
      data.imageUrl ||
      data.image ||
      (Array.isArray(data.photos) && data.photos.length > 0 ? data.photos[0] : null)
    );
    
    // Get photos array, ensuring it's an array of valid URLs
    const photos = Array.isArray(data.photos) 
      ? data.photos.map(normalizePhotoUrl).filter((url): url is string => url !== null)
      : (photoUrl ? [photoUrl] : []);
    
    return {
      id: userDoc.id,
      uid: userDoc.id,
      email: data.email || "",
      username: data.username,
      fullName: fullName,
      photoUrl: photoUrl || undefined,
      phoneNumber: data.phoneNumber || data.phone,
      role: data.role || data.currentRole || "client",
      currentRole: data.currentRole || data.role || "client",
      location: data.location || data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description || data.bio,
      photos: photos,
      isVerified: data.isVerified || false,
      totalRating: data.totalRating || data.rating || 0,
      totalReviews: data.totalReviews || data.reviews || 0,
      rate: data.rate || data.hourlyRate,
      completedAt: data.completedAt || data.completedJobs || 0,
      skills: data.skills || [],
      createdAt,
      updatedAt,
    } as User;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

// Check if user profile is complete
export async function isProfileComplete(uid: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) {
      return false;
    }
    
    const data = userDoc.data();
    // Check if profile is marked as complete
    if (data.profileCompleted === true) {
      return true;
    }
    
    // Check if all required fields are filled
    const hasUsername = data.username && data.username.trim().length > 0;
    const hasLocation = data.location && data.location.trim().length > 0;
    const hasBio = (data.bio || data.about) && (data.bio || data.about).trim().length > 0;
    
    return hasUsername && hasLocation && hasBio;
  } catch (error) {
    console.error("Error checking profile completion:", error);
    return false;
  }
}
