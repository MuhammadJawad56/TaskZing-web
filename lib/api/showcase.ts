import { getUserById } from "./users";

export interface ShowcaseItem {
  id?: string;
  userId: string;
  postingAs: "individual" | "company" | "instore";
  companyName?: string;
  storeName?: string;
  title: string;
  skills?: string;
  description: string;
  location: string;
  imageUrls: string[];
  videoUrl?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LOCAL_SHOWCASES_STORAGE_KEY = "taskzing_local_showcases";
const SHOWCASE_BOOKMARKS_STORAGE_KEY = "taskzing_showcase_bookmarks";
const TEST_USER_STORAGE_KEY = "taskzing_test_user";

type StoredShowcaseItem = Omit<ShowcaseItem, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type StoredShowcaseBookmark = {
  bookmarkedBy: string;
  showcaseId: string;
  showcaseUserId: string;
  createdAt: string;
};

const fallbackShowcases: ShowcaseItem[] = [
  {
    id: "seed-showcase-1",
    userId: "user-1",
    postingAs: "individual",
    title: "Responsive Ecommerce Rebuild",
    skills: "React, Next.js, TypeScript",
    description:
      "End-to-end redesign for a local retailer including storefront UX, checkout cleanup, and mobile optimization.",
    location: "New York, NY",
    imageUrls: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop",
    ],
    tags: ["Web Development", "E-commerce", "React"],
    createdAt: new Date("2024-01-20T10:00:00Z"),
    updatedAt: new Date("2024-01-20T10:00:00Z"),
  },
  {
    id: "seed-showcase-2",
    userId: "user-2",
    postingAs: "company",
    companyName: "Studio Jane",
    title: "Brand Identity Pack",
    skills: "Branding, Figma, UI/UX",
    description:
      "Logo system, brand guide, landing page visuals, and social media creative for an early-stage startup.",
    location: "Los Angeles, CA",
    imageUrls: [
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop",
    ],
    tags: ["Graphic Design", "Branding", "Figma"],
    createdAt: new Date("2024-01-19T09:30:00Z"),
    updatedAt: new Date("2024-01-19T09:30:00Z"),
  },
  {
    id: "seed-showcase-3",
    userId: "user-3",
    postingAs: "individual",
    title: "Emergency Plumbing Repairs",
    skills: "Plumbing, Leak Repair, Installations",
    description:
      "Examples of faucet replacement, leak resolution, and full kitchen fixture upgrades completed for residential clients.",
    location: "Chicago, IL",
    imageUrls: [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&auto=format&fit=crop",
    ],
    tags: ["Plumbing", "Repair"],
    createdAt: new Date("2024-01-18T14:00:00Z"),
    updatedAt: new Date("2024-01-18T14:00:00Z"),
  },
  {
    id: "seed-showcase-4",
    userId: "user-4",
    postingAs: "instore",
    storeName: "Sparkle Clean",
    title: "Move-Out Cleaning Results",
    skills: "Deep Cleaning, Office Cleaning",
    description:
      "Before-and-after cleaning work for apartments and office units, focused on detailed finishing and same-day turnaround.",
    location: "Houston, TX",
    imageUrls: [
      "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=1200&auto=format&fit=crop",
    ],
    tags: ["Cleaning", "Home Improvement"],
    createdAt: new Date("2024-01-17T08:15:00Z"),
    updatedAt: new Date("2024-01-17T08:15:00Z"),
  },
  {
    id: "seed-showcase-5",
    userId: "user-6",
    postingAs: "individual",
    title: "Personal Training Programs",
    skills: "Strength Training, Nutrition, Weight Loss",
    description:
      "Client progress snapshots, weekly workout structures, and nutrition coaching plans tailored to long-term goals.",
    location: "Philadelphia, PA",
    imageUrls: [
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&auto=format&fit=crop",
    ],
    tags: ["Fitness", "Lifestyle"],
    createdAt: new Date("2024-01-16T12:45:00Z"),
    updatedAt: new Date("2024-01-16T12:45:00Z"),
  },
];

function normalizeShowcase(item: StoredShowcaseItem | ShowcaseItem): ShowcaseItem {
  return {
    ...item,
    createdAt:
      item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt),
    updatedAt:
      item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt),
  };
}

function serializeShowcase(item: ShowcaseItem): StoredShowcaseItem {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function readLocalShowcases(): ShowcaseItem[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(LOCAL_SHOWCASES_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeShowcase) : [];
  } catch {
    return [];
  }
}

function writeLocalShowcases(showcases: ShowcaseItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    LOCAL_SHOWCASES_STORAGE_KEY,
    JSON.stringify(showcases.map(serializeShowcase))
  );
}

function readShowcaseBookmarks(): StoredShowcaseBookmark[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(SHOWCASE_BOOKMARKS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeShowcaseBookmarks(bookmarks: StoredShowcaseBookmark[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    SHOWCASE_BOOKMARKS_STORAGE_KEY,
    JSON.stringify(bookmarks)
  );
}

function getStoredTestUserId(): string | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(TEST_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { id?: string; uid?: string };
    return parsed.uid || parsed.id || null;
  } catch {
    return null;
  }
}

async function getTestUserShowcase(): Promise<ShowcaseItem[]> {
  const testUserId = getStoredTestUserId();
  if (!testUserId) return [];

  const provider = await getUserById(testUserId);
  if (!provider) return [];

  return [
    {
      id: `seed-showcase-${testUserId}`,
      userId: testUserId,
      postingAs: "individual",
      title: `${provider.fullName || "Test User"} Portfolio`,
      skills: (provider.skills || ["General Services", "Task Support"]).join(", "),
      description:
        "Temporary local showcase item for the current test account while backend showcase storage is being migrated.",
      location: provider.location || "Remote / Unspecified",
      imageUrls: ["/images/placeholder_image.png"],
      tags: provider.skills?.slice(0, 3) || ["General Services"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

async function getCombinedShowcases(): Promise<ShowcaseItem[]> {
  const localShowcases = readLocalShowcases();
  const testUserShowcases = await getTestUserShowcase();
  const all = [...localShowcases, ...testUserShowcases, ...fallbackShowcases];
  const seen = new Set<string>();

  return all
    .filter((item) => {
      if (!item.id) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function uploadShowcaseImage(file: File): Promise<string> {
  return fileToDataUrl(file);
}

export async function uploadShowcaseImages(
  files: File[],
  _userId: string
): Promise<string[]> {
  return Promise.all(files.map((file) => uploadShowcaseImage(file)));
}

export async function uploadShowcaseVideo(
  file: File,
  _userId: string
): Promise<string> {
  return fileToDataUrl(file);
}

export async function deleteShowcaseImage(_imageUrl: string): Promise<void> {
  return;
}

export async function deleteShowcaseVideo(_videoUrl: string): Promise<void> {
  return;
}

export async function createShowcaseItem(
  userId: string,
  data: Omit<ShowcaseItem, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date();
  const showcase: ShowcaseItem = {
    id: `local-showcase-${Date.now()}`,
    userId,
    postingAs: data.postingAs,
    companyName: data.companyName,
    storeName: data.storeName,
    title: data.title,
    skills: data.skills,
    description: data.description,
    location: data.location,
    imageUrls: data.imageUrls || [],
    videoUrl: data.videoUrl,
    tags: data.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  const current = readLocalShowcases();
  writeLocalShowcases([showcase, ...current]);
  return showcase.id!;
}

export async function getUserShowcases(userId: string): Promise<ShowcaseItem[]> {
  const allShowcases = await getCombinedShowcases();
  return allShowcases.filter((item) => item.userId === userId);
}

export async function getAllShowcases(): Promise<ShowcaseItem[]> {
  return getCombinedShowcases();
}

export async function getShowcaseItem(
  id: string,
  userId?: string
): Promise<ShowcaseItem | null> {
  const allShowcases = await getCombinedShowcases();
  return (
    allShowcases.find(
      (item) => item.id === id && (!userId || item.userId === userId)
    ) || null
  );
}

export async function updateShowcaseItem(
  id: string,
  data: Partial<Omit<ShowcaseItem, "id" | "userId" | "createdAt">>,
  userId?: string
): Promise<void> {
  const current = readLocalShowcases();
  const next = current.map((item) => {
    if (item.id !== id) return item;
    if (userId && item.userId !== userId) return item;

    return {
      ...item,
      ...data,
      updatedAt: new Date(),
    };
  });
  writeLocalShowcases(next);
}

export async function deleteShowcaseItem(
  id: string,
  _imageUrls?: string[],
  _videoUrl?: string,
  userId?: string
): Promise<void> {
  const current = readLocalShowcases();
  const next = current.filter(
    (item) => !(item.id === id && (!userId || item.userId === userId))
  );
  writeLocalShowcases(next);
}

export async function bookmarkShowcase(
  userId: string,
  showcaseId: string,
  showcaseUserId: string
): Promise<void> {
  const bookmarks = readShowcaseBookmarks();
  const exists = bookmarks.some(
    (bookmark) =>
      bookmark.bookmarkedBy === userId && bookmark.showcaseId === showcaseId
  );
  if (exists) return;

  bookmarks.push({
    bookmarkedBy: userId,
    showcaseId,
    showcaseUserId,
    createdAt: new Date().toISOString(),
  });
  writeShowcaseBookmarks(bookmarks);
}

export async function unbookmarkShowcase(
  userId: string,
  showcaseId: string
): Promise<void> {
  const next = readShowcaseBookmarks().filter(
    (bookmark) =>
      !(bookmark.bookmarkedBy === userId && bookmark.showcaseId === showcaseId)
  );
  writeShowcaseBookmarks(next);
}

export async function getUserBookmarkedShowcases(
  userId: string
): Promise<string[]> {
  return readShowcaseBookmarks()
    .filter((bookmark) => bookmark.bookmarkedBy === userId)
    .map((bookmark) => bookmark.showcaseId);
}

export async function isShowcaseBookmarked(
  userId: string,
  showcaseId: string
): Promise<boolean> {
  return readShowcaseBookmarks().some(
    (bookmark) =>
      bookmark.bookmarkedBy === userId && bookmark.showcaseId === showcaseId
  );
}
