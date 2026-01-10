import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "./config";
import { Task, CompletionStatus } from "@/lib/types/task";

// Get all open jobs/tasks from Firebase
export async function getOpenJobs(): Promise<Task[]> {
  try {
    // Try with orderBy first, fallback to without if index doesn't exist
    let q;
    try {
      q = query(
        collection(db, "jobs"),
        where("completionStatus", "==", "open"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          jobId: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || 
                     (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || 
                     (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
        } as Task;
      });
    } catch (orderByError: any) {
      // If orderBy fails (likely due to missing index), try without it
      if (orderByError.code === 'failed-precondition' || orderByError.message?.includes('index')) {
        console.warn("Firestore index missing, fetching without orderBy:", orderByError);
        q = query(
          collection(db, "jobs"),
          where("completionStatus", "==", "open")
        );
        const querySnapshot = await getDocs(q);
        const jobs = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            jobId: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || 
                       (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || 
                       (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
          } as Task;
        });
        // Sort client-side as fallback
        return jobs.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Descending order
        });
      }
      throw orderByError;
    }
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return [];
  }
}

// Get jobs by category
export async function getJobsByCategory(category: string): Promise<Task[]> {
  try {
    let q;
    try {
      q = query(
        collection(db, "jobs"),
        where("completionStatus", "==", "open"),
        where("category", "==", category),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          jobId: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || 
                     (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || 
                     (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
        } as Task;
      });
    } catch (orderByError: any) {
      // Fallback without orderBy if index doesn't exist
      if (orderByError.code === 'failed-precondition' || orderByError.message?.includes('index')) {
        q = query(
          collection(db, "jobs"),
          where("completionStatus", "==", "open"),
          where("category", "==", category)
        );
        const querySnapshot = await getDocs(q);
        const jobs = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            jobId: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || 
                       (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || 
                       (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
          } as Task;
        });
        return jobs.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
      }
      throw orderByError;
    }
  } catch (error) {
    console.error("Error fetching jobs by category:", error);
    return [];
  }
}

// Search jobs by query
export async function searchJobs(searchQuery: string): Promise<Task[]> {
  try {
    // Get all open jobs first
    const allJobs = await getOpenJobs();
    
    // Client-side filtering for search (Firestore doesn't support full-text search)
    const queryLower = searchQuery.toLowerCase();
    return allJobs.filter(
      (job) =>
        job.title?.toLowerCase().includes(queryLower) ||
        job.description?.toLowerCase().includes(queryLower) ||
        job.address?.toLowerCase().includes(queryLower) ||
        job.category?.toLowerCase().includes(queryLower) ||
        job.skills?.some((skill) => skill.toLowerCase().includes(queryLower))
    );
  } catch (error) {
    console.error("Error searching jobs:", error);
    return [];
  }
}

// Get jobs near a location (by coordinates)
export async function getJobsNearLocation(
  lat: number,
  lng: number,
  radiusKm: number = 10
): Promise<Task[]> {
  try {
    // Get all open jobs first
    const allJobs = await getOpenJobs();

    // Calculate distance and filter
    return allJobs.filter((job) => {
      if (!job.lat || !job.lng) return false;
      const distance = calculateDistance(lat, lng, job.lat, job.lng);
      return distance <= radiusKm;
    });
  } catch (error) {
    console.error("Error fetching jobs near location:", error);
    return [];
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get a single job by ID
export async function getJobById(jobId: string): Promise<Task | null> {
  try {
    const docRef = doc(db, "jobs", jobId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        jobId: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || docSnap.data().createdAt || new Date().toISOString(),
        updatedAt: docSnap.data().updatedAt?.toDate?.()?.toISOString() || docSnap.data().updatedAt || new Date().toISOString(),
      } as Task;
    }
    return null;
  } catch (error) {
    console.error("Error fetching job:", error);
    return null;
  }
}

