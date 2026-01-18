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
    
    return {
      id: userDoc.id,
      uid: userDoc.id,
      email: data.email || "",
      username: data.username,
      fullName: fullName,
      photoUrl: data.photoURL || data.photoUrl || data.avatar || data.profileImage,
      phoneNumber: data.phoneNumber || data.phone,
      role: data.role || data.currentRole || "client",
      currentRole: data.currentRole || data.role || "client",
      location: data.location || data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description || data.bio,
      photos: data.photos || [],
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
