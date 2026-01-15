import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
  collectionGroup,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./config";

// Helper function to safely convert Firestore Timestamp or other date formats to Date
function toDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

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

// Upload image to Firebase Storage
export async function uploadShowcaseImage(
  file: File,
  userId: string
): Promise<string> {
  const storageRef = ref(storage, `showcases/${userId}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

// Upload multiple images to Firebase Storage
export async function uploadShowcaseImages(
  files: File[],
  userId: string
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadShowcaseImage(file, userId));
  return Promise.all(uploadPromises);
}

// Upload video to Firebase Storage
export async function uploadShowcaseVideo(
  file: File,
  userId: string
): Promise<string> {
  const storageRef = ref(storage, `showcases/${userId}/videos/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

// Delete image from Firebase Storage
export async function deleteShowcaseImage(imageUrl: string): Promise<void> {
  try {
    // Extract the path from the full URL
    // Firebase Storage URLs are like: https://firebasestorage.googleapis.com/v0/b/.../o/showcases%2F...?alt=media
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    if (pathMatch) {
      const decodedPath = decodeURIComponent(pathMatch[1]);
      const imageRef = ref(storage, decodedPath);
      await deleteObject(imageRef);
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    // Continue even if image deletion fails
  }
}

// Delete video from Firebase Storage
export async function deleteShowcaseVideo(videoUrl: string): Promise<void> {
  try {
    // Extract the path from the full URL
    const url = new URL(videoUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    if (pathMatch) {
      const decodedPath = decodeURIComponent(pathMatch[1]);
      const videoRef = ref(storage, decodedPath);
      await deleteObject(videoRef);
    }
  } catch (error) {
    console.error("Error deleting video:", error);
    // Continue even if video deletion fails
  }
}

// Create a new showcase item
export async function createShowcaseItem(
  userId: string,
  data: Omit<ShowcaseItem, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const showcaseData = {
    userId,
    postingAs: data.postingAs,
    companyName: data.companyName || null,
    storeName: data.storeName || null,
    title: data.title,
    skills: data.skills || null,
    description: data.description,
    location: data.location,
    imageUrls: data.imageUrls || [],
    videoUrl: data.videoUrl || null,
    tags: data.tags || [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, "showcase_work", userId, "submissions"), showcaseData);
  return docRef.id;
}

// Get all showcase items for a user
export async function getUserShowcases(userId: string): Promise<ShowcaseItem[]> {
  const q = query(
    collection(db, "showcase_work", userId, "submissions"),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as ShowcaseItem;
  });
}

// Get all showcase items (for public view)
export async function getAllShowcases(): Promise<ShowcaseItem[]> {
  // Avoid collectionGroup orderBy to prevent index requirement; sort locally instead.
  const q = query(collectionGroup(db, "submissions"));
  const querySnapshot = await getDocs(q);
  const items = querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as ShowcaseItem;
  });
  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Get a single showcase item by ID
export async function getShowcaseItem(id: string, userId?: string): Promise<ShowcaseItem | null> {
  const docRef = userId
    ? doc(db, "showcase_work", userId, "submissions", id)
    : doc(db, "showcase_work", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as ShowcaseItem;
  }
  return null;
}

// Update a showcase item
export async function updateShowcaseItem(
  id: string,
  data: Partial<Omit<ShowcaseItem, "id" | "userId" | "createdAt">>,
  userId?: string
): Promise<void> {
  const docRef = userId
    ? doc(db, "showcase_work", userId, "submissions", id)
    : doc(db, "showcase_work", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// Delete a showcase item
export async function deleteShowcaseItem(
  id: string,
  imageUrls?: string[],
  videoUrl?: string,
  userId?: string
): Promise<void> {
  // Delete images from storage if provided
  if (imageUrls && imageUrls.length > 0) {
    await Promise.all(imageUrls.map((url) => deleteShowcaseImage(url)));
  }

  // Delete video from storage if provided
  if (videoUrl) {
    await deleteShowcaseVideo(videoUrl);
  }

  // Delete document from Firestore
  const docRef = userId
    ? doc(db, "showcase_work", userId, "submissions", id)
    : doc(db, "showcase_work", id);
  await deleteDoc(docRef);
}

// Bookmark/Unbookmark showcase functions
export async function bookmarkShowcase(
  userId: string,
  showcaseId: string,
  showcaseUserId: string
): Promise<void> {
  const bookmarkData = {
    bookmarkedBy: userId,
    showcaseId: showcaseId,
    showcaseUserId: showcaseUserId,
    createdAt: Timestamp.now(),
  };

  // Check if already bookmarked
  const q = query(
    collection(db, "showcaseWorkBookmarks"),
    where("bookmarkedBy", "==", userId),
    where("showcaseId", "==", showcaseId)
  );
  const existing = await getDocs(q);
  
  if (existing.empty) {
    await addDoc(collection(db, "showcaseWorkBookmarks"), bookmarkData);
  }
}

export async function unbookmarkShowcase(
  userId: string,
  showcaseId: string
): Promise<void> {
  const q = query(
    collection(db, "showcaseWorkBookmarks"),
    where("bookmarkedBy", "==", userId),
    where("showcaseId", "==", showcaseId)
  );
  const snapshot = await getDocs(q);
  
  const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

export async function getUserBookmarkedShowcases(userId: string): Promise<string[]> {
  const q = query(
    collection(db, "showcaseWorkBookmarks"),
    where("bookmarkedBy", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data().showcaseId);
}

export async function isShowcaseBookmarked(
  userId: string,
  showcaseId: string
): Promise<boolean> {
  const q = query(
    collection(db, "showcaseWorkBookmarks"),
    where("bookmarkedBy", "==", userId),
    where("showcaseId", "==", showcaseId)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

