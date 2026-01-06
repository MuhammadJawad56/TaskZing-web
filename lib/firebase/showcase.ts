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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./config";

export interface ShowcaseItem {
  id?: string;
  userId: string;
  postingAs: "individual" | "company";
  companyName?: string;
  title: string;
  skills?: string;
  description: string;
  location: string;
  imageUrls: string[];
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

// Create a new showcase item
export async function createShowcaseItem(
  userId: string,
  data: Omit<ShowcaseItem, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const showcaseData = {
    userId,
    postingAs: data.postingAs,
    companyName: data.companyName || null,
    title: data.title,
    skills: data.skills || null,
    description: data.description,
    location: data.location,
    imageUrls: data.imageUrls || [],
    tags: data.tags || [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, "showcases"), showcaseData);
  return docRef.id;
}

// Get all showcase items for a user
export async function getUserShowcases(userId: string): Promise<ShowcaseItem[]> {
  const q = query(
    collection(db, "showcases"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as ShowcaseItem[];
}

// Get all showcase items (for public view)
export async function getAllShowcases(): Promise<ShowcaseItem[]> {
  const q = query(collection(db, "showcases"), orderBy("createdAt", "desc"));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as ShowcaseItem[];
}

// Get a single showcase item by ID
export async function getShowcaseItem(id: string): Promise<ShowcaseItem | null> {
  const docRef = doc(db, "showcases", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
    } as ShowcaseItem;
  }
  return null;
}

// Update a showcase item
export async function updateShowcaseItem(
  id: string,
  data: Partial<Omit<ShowcaseItem, "id" | "userId" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, "showcases", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// Delete a showcase item
export async function deleteShowcaseItem(id: string, imageUrls?: string[]): Promise<void> {
  // Delete images from storage if provided
  if (imageUrls && imageUrls.length > 0) {
    await Promise.all(imageUrls.map((url) => deleteShowcaseImage(url)));
  }

  // Delete document from Firestore
  const docRef = doc(db, "showcases", id);
  await deleteDoc(docRef);
}

