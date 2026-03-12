import { tasks as mockTasks } from "@/lib/mock-data/tasks";
import { Task } from "@/lib/types/task";

const LOCAL_JOBS_STORAGE_KEY = "taskzing_local_jobs";

function readLocalJobs(): Task[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(LOCAL_JOBS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalJobs(jobs: Task[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_JOBS_STORAGE_KEY, JSON.stringify(jobs));
}

function getAllJobData(): Task[] {
  const localJobs = readLocalJobs();
  return [...localJobs, ...mockTasks];
}

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export async function createJob(
  clientId: string,
  jobData: Partial<Task>
): Promise<Task> {
  const now = new Date().toISOString();
  const newJob: Task = {
    jobId: `local-job-${Date.now()}`,
    jobType: (jobData.jobType || "fixed") as Task["jobType"],
    title: jobData.title || "Untitled Job",
    description: jobData.description || "",
    category: jobData.category || "Other",
    subCategory: jobData.subCategory,
    itemType: jobData.itemType,
    fixedPrice: jobData.fixedPrice,
    estimatedDuration: jobData.estimatedDuration,
    hourlyRate: jobData.hourlyRate,
    timeFlexibility: jobData.timeFlexibility,
    jobStartTime: jobData.jobStartTime,
    jobEndTime: jobData.jobEndTime,
    price: jobData.price || 0,
    lat: jobData.lat || 0,
    lng: jobData.lng || 0,
    address: jobData.address || "",
    additionalLocationNotes: jobData.additionalLocationNotes,
    jobDate: jobData.jobDate,
    storePickup: jobData.storePickup,
    storeName: jobData.storeName,
    pickupAddress: jobData.pickupAddress,
    deliveryAddress: jobData.deliveryAddress,
    completionStatus: jobData.completionStatus || "open",
    proposalAcceptance: jobData.proposalAcceptance || "open",
    clientId,
    contractorId: jobData.contractorId,
    acceptedAt: jobData.acceptedAt,
    completedAt: jobData.completedAt,
    maxHoursAllowed: jobData.maxHoursAllowed,
    urgency: jobData.urgency || "normal",
    isVerified: jobData.isVerified ?? false,
    posterType: jobData.posterType || "individual",
    posterName: jobData.posterName,
    photos: jobData.photos || [],
    attachments: jobData.attachments || [],
    skills: jobData.skills || [],
    tags: jobData.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  const currentJobs = readLocalJobs();
  writeLocalJobs([newJob, ...currentJobs]);
  return newJob;
}

export async function getJobsByClientId(clientId: string): Promise<Task[]> {
  return getAllJobData()
    .filter((job) => job.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getJobsByContractorId(contractorId: string): Promise<Task[]> {
  return getAllJobData()
    .filter((job) => job.contractorId === contractorId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getJobById(jobId: string): Promise<Task | null> {
  return getAllJobData().find((job) => job.jobId === jobId) || null;
}

export async function deleteJob(jobId: string, clientId: string): Promise<void> {
  const currentJobs = readLocalJobs();
  const nextJobs = currentJobs.filter(
    (job) => !(job.jobId === jobId && job.clientId === clientId)
  );
  writeLocalJobs(nextJobs);
}

export async function getOpenJobs(): Promise<Task[]> {
  return getAllJobData().filter((job) => job.completionStatus === "open");
}

export async function searchJobs(query: string): Promise<Task[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return getOpenJobs();

  return (await getOpenJobs()).filter(
    (job) =>
      job.title.toLowerCase().includes(normalizedQuery) ||
      job.description.toLowerCase().includes(normalizedQuery) ||
      job.category.toLowerCase().includes(normalizedQuery) ||
      (job.subCategory || "").toLowerCase().includes(normalizedQuery) ||
      (job.address || "").toLowerCase().includes(normalizedQuery)
  );
}

export async function getJobsByCategory(category: string): Promise<Task[]> {
  return (await getOpenJobs()).filter(
    (job) => job.category === category || job.subCategory === category
  );
}

export async function getJobsNearLocation(
  lat: number,
  lng: number,
  radiusKm = 50
): Promise<Task[]> {
  return (await getOpenJobs()).filter((job) => {
    if (typeof job.lat !== "number" || typeof job.lng !== "number") return false;
    return calculateDistanceKm(lat, lng, job.lat, job.lng) <= radiusKm;
  });
}

export async function getProposalCounts(_jobId: string): Promise<{ total: number; hired: number }> {
  return { total: 0, hired: 0 };
}
