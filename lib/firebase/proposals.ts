import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "./config";
import { Proposal, ProposalWithDetails } from "@/lib/types/proposal";
import { getUserData } from "./auth";
import { getJobById } from "./jobs";

// Get proposals by job ID
export async function getProposalsByJobId(jobId: string): Promise<ProposalWithDetails[]> {
  try {
    // Try different collection names that might be used
    const collectionNames = ["job_applications", "proposals", "applications"];
    
    for (const collectionName of collectionNames) {
      try {
        const q = query(
          collection(db, collectionName),
          where("jobId", "==", jobId),
          orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.docs.length > 0 || collectionName === collectionNames[collectionNames.length - 1]) {
          const proposals = await Promise.all(
            querySnapshot.docs.map(async (doc) => {
              const data = doc.data();
              const proposal: Proposal = {
                applicationId: doc.id,
                jobId: data.jobId || jobId,
                providerId: data.providerId || data.userId || "",
                clientId: data.clientId || "",
                proposalText: data.proposalText || data.message || data.description || "",
                bidAmount: data.bidAmount || data.price || data.amount || 0,
                estimatedDuration: data.estimatedDuration || data.duration,
                status: (data.status || "submitted") as Proposal["status"],
                isMessaged: data.isMessaged || false,
                isHired: data.isHired || false,
                attachments: data.attachments || [],
                links: data.links || [],
                createdAt: data.createdAt?.toDate?.()?.toISOString() || 
                           (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || 
                           (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
              };

              // Fetch provider data
              let provider;
              if (proposal.providerId) {
                try {
                  const providerData = await getUserData(proposal.providerId);
                  if (providerData) {
                    provider = {
                      id: proposal.providerId,
                      fullName: providerData.fullName || providerData.name || "Unknown Provider",
                      photoUrl: providerData.photoUrl || providerData.profilePicture,
                      totalRating: providerData.totalRating || 0,
                      totalReviews: providerData.totalReviews || 0,
                      isVerified: providerData.isVerified || false,
                    };
                  }
                } catch (error) {
                  console.error(`Error fetching provider data for ${proposal.providerId}:`, error);
                }
              }

              return {
                ...proposal,
                provider,
              } as ProposalWithDetails;
            })
          );

          return proposals;
        }
      } catch (error: any) {
        // If orderBy fails, try without it
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          try {
            const q = query(
              collection(db, collectionName),
              where("jobId", "==", jobId)
            );
            
            const querySnapshot = await getDocs(q);
            const proposals = await Promise.all(
              querySnapshot.docs.map(async (doc) => {
                const data = doc.data();
                const proposal: Proposal = {
                  applicationId: doc.id,
                  jobId: data.jobId || jobId,
                  providerId: data.providerId || data.userId || "",
                  clientId: data.clientId || "",
                  proposalText: data.proposalText || data.message || data.description || "",
                  bidAmount: data.bidAmount || data.price || data.amount || 0,
                  estimatedDuration: data.estimatedDuration || data.duration,
                  status: (data.status || "submitted") as Proposal["status"],
                  isMessaged: data.isMessaged || false,
                  isHired: data.isHired || false,
                  attachments: data.attachments || [],
                  links: data.links || [],
                  createdAt: data.createdAt?.toDate?.()?.toISOString() || 
                             (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
                  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || 
                             (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
                };

                // Fetch provider data
                let provider;
                if (proposal.providerId) {
                  try {
                    const providerData = await getUserData(proposal.providerId);
                    if (providerData) {
                      provider = {
                        id: proposal.providerId,
                        fullName: providerData.fullName || providerData.name || "Unknown Provider",
                        photoUrl: providerData.photoUrl || providerData.profilePicture,
                        totalRating: providerData.totalRating || 0,
                        totalReviews: providerData.totalReviews || 0,
                        isVerified: providerData.isVerified || false,
                      };
                    }
                  } catch (error) {
                    console.error(`Error fetching provider data for ${proposal.providerId}:`, error);
                  }
                }

                return {
                  ...proposal,
                  provider,
                } as ProposalWithDetails;
              })
            );

            // Sort client-side
            return proposals.sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA;
            });
          } catch (fallbackError) {
            console.error(`Error fetching proposals from ${collectionName} (fallback):`, fallbackError);
            continue;
          }
        } else {
          console.error(`Error fetching proposals from ${collectionName}:`, error);
          continue;
        }
      }
    }

    // If no proposals found in any collection, return empty array
    return [];
  } catch (error) {
    console.error("Error fetching proposals by job ID:", error);
    return [];
  }
}

// Get proposal counts for a job (total proposals and hired count)
export async function getProposalCounts(jobId: string): Promise<{ total: number; hired: number }> {
  try {
    const proposals = await getProposalsByJobId(jobId);
    const total = proposals.length;
    const hired = proposals.filter(p => p.isHired === true).length;
    return { total, hired };
  } catch (error) {
    console.error("Error getting proposal counts:", error);
    return { total: 0, hired: 0 };
  }
}

// Get proposals by provider ID
export async function getProposalsByProviderId(providerId: string): Promise<ProposalWithDetails[]> {
  try {
    console.log("[getProposalsByProviderId] Fetching proposals for provider:", providerId);
    const collectionNames = ["job_applications", "proposals", "applications"];
    
    for (const collectionName of collectionNames) {
      try {
        // Try querying by providerId first
        let q = query(
          collection(db, collectionName),
          where("providerId", "==", providerId),
          orderBy("createdAt", "desc")
        );
        
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch (error: any) {
          // If orderBy fails, try without it
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            console.log(`[getProposalsByProviderId] Index missing for ${collectionName}, trying without orderBy`);
            q = query(
              collection(db, collectionName),
              where("providerId", "==", providerId)
            );
            querySnapshot = await getDocs(q);
          } else {
            throw error;
          }
        }
        
        // Also try querying by userId if providerId query didn't return results
        let userIdQuerySnapshot;
        if (querySnapshot.docs.length === 0) {
          try {
            const userIdQ = query(
              collection(db, collectionName),
              where("userId", "==", providerId)
            );
            userIdQuerySnapshot = await getDocs(userIdQ);
            console.log(`[getProposalsByProviderId] Found ${userIdQuerySnapshot.docs.length} proposals with userId field`);
          } catch (error) {
            console.log(`[getProposalsByProviderId] Error querying by userId:`, error);
          }
        }
        
        const allDocs = querySnapshot.docs.length > 0 
          ? querySnapshot.docs 
          : (userIdQuerySnapshot?.docs || []);
        
        if (allDocs.length > 0 || collectionName === collectionNames[collectionNames.length - 1]) {
          const proposals = await Promise.all(
            allDocs.map(async (doc) => {
              const data = doc.data();
              const proposal: Proposal = {
                applicationId: doc.id,
                jobId: data.jobId || "",
                providerId: data.providerId || data.userId || providerId,
                clientId: data.clientId || "",
                proposalText: data.proposalText || data.message || data.description || "",
                bidAmount: data.bidAmount || data.price || data.amount || 0,
                estimatedDuration: data.estimatedDuration || data.duration,
                status: (data.status || "submitted") as Proposal["status"],
                isMessaged: data.isMessaged || false,
                isHired: data.isHired || false,
                attachments: data.attachments || [],
                links: data.links || [],
                createdAt: data.createdAt?.toDate?.()?.toISOString() || 
                           (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || 
                           (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
              };

              // Fetch job data
              let task;
              if (proposal.jobId) {
                try {
                  const { getJobById } = await import("./jobs");
                  const jobData = await getJobById(proposal.jobId);
                  if (jobData) {
                    task = {
                      jobId: jobData.jobId,
                      title: jobData.title,
                      price: jobData.price || 0,
                      jobType: jobData.jobType,
                    };
                  }
                } catch (error) {
                  console.error(`Error fetching job data for ${proposal.jobId}:`, error);
                }
              }

              return {
                ...proposal,
                task,
              } as ProposalWithDetails;
            })
          );
          console.log(`[getProposalsByProviderId] Returning ${proposals.length} proposals from ${collectionName}`);
          return proposals;
        }
      } catch (error: any) {
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          // Fallback: fetch all and filter client-side
          try {
            const q = query(collection(db, collectionName));
            const querySnapshot = await getDocs(q);
            const proposals = await Promise.all(
              querySnapshot.docs
                .filter(doc => {
                  const data = doc.data();
                  return (data.providerId === providerId || data.userId === providerId);
                })
                .map(async (doc) => {
                  const data = doc.data();
                  const proposal: Proposal = {
                    applicationId: doc.id,
                    jobId: data.jobId || "",
                    providerId: data.providerId || data.userId || providerId,
                    clientId: data.clientId || "",
                    proposalText: data.proposalText || data.message || data.description || "",
                    bidAmount: data.bidAmount || data.price || data.amount || 0,
                    estimatedDuration: data.estimatedDuration || data.duration,
                    status: (data.status || "submitted") as Proposal["status"],
                    isMessaged: data.isMessaged || false,
                    isHired: data.isHired || false,
                    attachments: data.attachments || [],
                    links: data.links || [],
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || 
                               (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || 
                               (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
                  };

                  // Fetch job data
                  let task;
                  if (proposal.jobId) {
                    try {
                      const { getJobById } = await import("./jobs");
                      const jobData = await getJobById(proposal.jobId);
                      if (jobData) {
                        task = {
                          jobId: jobData.jobId,
                          title: jobData.title,
                          price: jobData.price || 0,
                          jobType: jobData.jobType,
                        };
                      }
                    } catch (error) {
                      console.error(`Error fetching job data for ${proposal.jobId}:`, error);
                    }
                  }

                  return {
                    ...proposal,
                    task,
                  } as ProposalWithDetails;
                })
            );
            return proposals.sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA;
            });
          } catch (fallbackError) {
            console.error(`Error fetching proposals from ${collectionName} (fallback):`, fallbackError);
            continue;
          }
        } else {
          console.error(`[getProposalsByProviderId] Error fetching proposals from ${collectionName}:`, error);
          continue;
        }
      }
    }

    console.log("[getProposalsByProviderId] No proposals found in any collection");
    return [];
  } catch (error) {
    console.error("[getProposalsByProviderId] Error fetching proposals by provider ID:", error);
    return [];
  }
}

// Create a new proposal/application
export async function createProposal(
  providerId: string,
  jobId: string,
  data: {
    proposalText: string;
    bidAmount: number;
    estimatedDuration?: string;
    attachments?: string[];
    links?: string[];
  }
): Promise<string> {
  try {
    // Get job to retrieve clientId
    const job = await getJobById(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    const clientId = job.clientId || "";

    // Try different collection names (mobile app might use different names)
    const collectionNames = ["job_applications", "proposals", "applications"];
    
    for (const collectionName of collectionNames) {
      try {
        const proposalData = {
          jobId,
          providerId,
          clientId,
          proposalText: data.proposalText,
          bidAmount: data.bidAmount,
          estimatedDuration: data.estimatedDuration || "",
          status: "submitted" as Proposal["status"],
          isMessaged: false,
          isHired: false,
          attachments: data.attachments || [],
          links: data.links || [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, collectionName), proposalData);
        console.log(`Proposal created successfully in ${collectionName} with ID: ${docRef.id}`);
        return docRef.id;
      } catch (error: any) {
        // If this collection doesn't work, try the next one
        if (collectionName !== collectionNames[collectionNames.length - 1]) {
          console.warn(`Failed to create proposal in ${collectionName}, trying next collection...`, error);
          continue;
        } else {
          // Last collection, throw the error
          throw error;
        }
      }
    }

    throw new Error("Failed to create proposal in any collection");
  } catch (error) {
    console.error("Error creating proposal:", error);
    throw error;
  }
}
