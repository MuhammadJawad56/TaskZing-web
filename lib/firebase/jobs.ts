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
  addDoc,
} from "firebase/firestore";
import { db } from "./config";
import { Task, CompletionStatus } from "@/lib/types/task";

// Get all open jobs/tasks from Firebase
export async function getOpenJobs(): Promise<Task[]> {
  try {
    console.log("[getOpenJobs] Starting job fetch...");
    // Get all jobs and filter client-side for backward compatibility
    // This ensures jobs from mobile app (without completionStatus) are also included
    let q;
    try {
      // First try to get jobs with completionStatus == "open" and orderBy
      q = query(
        collection(db, "jobs"),
        where("completionStatus", "==", "open"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const jobsWithStatus = querySnapshot.docs.map((doc) => {
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
      console.log(`[getOpenJobs] Jobs with completionStatus="open": ${jobsWithStatus.length}`);

      // Also get all jobs without completionStatus filter (for backward compatibility with mobile app)
      const allJobsQuery = query(collection(db, "jobs"));
      const allJobsSnapshot = await getDocs(allJobsQuery);
      const allJobs = allJobsSnapshot.docs.map((doc) => {
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
      console.log(`[getOpenJobs] Total jobs in database: ${allJobs.length}`);

      // Debug: Analyze completionStatus distribution
      const statusBreakdown: Record<string, number> = {};
      allJobs.forEach((job) => {
        const status = (job as any).completionStatus;
        const statusKey = status === undefined ? "undefined" : status === null ? "null" : String(status);
        statusBreakdown[statusKey] = (statusBreakdown[statusKey] || 0) + 1;
      });
      console.log("[getOpenJobs] CompletionStatus breakdown:", statusBreakdown);

      // Debug: Show sample jobs without status
      const sampleJobsWithoutStatus = allJobs.filter(job => {
        const status = (job as any).completionStatus;
        return status === undefined || status === null;
      }).slice(0, 3);
      if (sampleJobsWithoutStatus.length > 0) {
        console.log("[getOpenJobs] Sample jobs without completionStatus:", 
          sampleJobsWithoutStatus.map(j => ({
            jobId: j.jobId,
            title: j.title,
            createdAt: j.createdAt,
            hasCompletionStatus: (j as any).completionStatus !== undefined
          }))
        );
      }

      // Combine and filter: include jobs with completionStatus == "open" OR jobs without completionStatus field
      const jobIdsWithStatus = new Set(jobsWithStatus.map(j => j.jobId));
      const jobsWithoutStatus = allJobs.filter(job => {
        const status = (job as any).completionStatus;
        const hasNoStatus = status === undefined || status === null;
        return hasNoStatus && !jobIdsWithStatus.has(job.jobId);
      });
      console.log(`[getOpenJobs] Jobs without completionStatus (to include): ${jobsWithoutStatus.length}`);

      // Combine both sets
      const allOpenJobs = [...jobsWithStatus, ...jobsWithoutStatus];
      console.log(`[getOpenJobs] Total open jobs (combined): ${allOpenJobs.length}`);

      // Sort by createdAt descending
      const sortedJobs = allOpenJobs.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      console.log(`[getOpenJobs] Returning ${sortedJobs.length} jobs`);
      if (sortedJobs.length > 0) {
        console.log("[getOpenJobs] Sample returned jobs:", 
          sortedJobs.slice(0, 3).map(j => ({
            jobId: j.jobId,
            title: j.title,
            completionStatus: (j as any).completionStatus,
            createdAt: j.createdAt
          }))
        );
      }
      
      return sortedJobs;
    } catch (orderByError: any) {
      // If orderBy fails, get all jobs and filter client-side
      if (orderByError.code === 'failed-precondition' || orderByError.message?.includes('index')) {
        console.warn("[getOpenJobs] Firestore index missing, fetching all jobs and filtering client-side:", orderByError);
        q = query(collection(db, "jobs"));
        const querySnapshot = await getDocs(q);
        const allJobs = querySnapshot.docs.map((doc) => {
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
        console.log(`[getOpenJobs] Fallback: Total jobs fetched: ${allJobs.length}`);
        
        // Filter client-side: include jobs with completionStatus == "open" OR jobs without completionStatus
        const openJobs = allJobs.filter((job) => {
          const status = (job as any).completionStatus;
          const isOpen = status === "open" || status === undefined || status === null;
          return isOpen;
        });
        console.log(`[getOpenJobs] Fallback: Filtered open jobs: ${openJobs.length}`);
        
        // Debug: Show what was filtered out
        const filteredOut = allJobs.filter((job) => {
          const status = (job as any).completionStatus;
          return status !== "open" && status !== undefined && status !== null;
        });
        if (filteredOut.length > 0) {
          console.log(`[getOpenJobs] Fallback: Filtered out ${filteredOut.length} jobs with status:`, 
            filteredOut.map(j => ({
              jobId: j.jobId,
              title: j.title,
              completionStatus: (j as any).completionStatus
            }))
          );
        }
        
        // Sort client-side
        const sortedJobs = openJobs.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        console.log(`[getOpenJobs] Fallback: Returning ${sortedJobs.length} jobs`);
        return sortedJobs;
      }
      console.error("[getOpenJobs] OrderBy error (not index related):", orderByError);
      throw orderByError;
    }
  } catch (error) {
    console.error("[getOpenJobs] Error fetching jobs:", error);
    console.error("[getOpenJobs] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
}

// Get jobs by category
export async function getJobsByCategory(category: string): Promise<Task[]> {
  try {
    // Get all open jobs first (which handles backward compatibility)
    const allOpenJobs = await getOpenJobs();
    
    // Filter by category client-side
    return allOpenJobs.filter(job => 
      job.category === category || 
      job.subCategory === category
    );
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

// Create a new job
export async function createJob(
  clientId: string,
  data: Omit<Task, "jobId" | "clientId" | "createdAt" | "updatedAt" | "completionStatus" | "proposalAcceptance" | "isVerified">
): Promise<string> {
  try {
    const jobData = {
      ...data,
      clientId,
      completionStatus: "open" as CompletionStatus,
      proposalAcceptance: "open" as const,
      isVerified: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "jobs"), jobData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
}

