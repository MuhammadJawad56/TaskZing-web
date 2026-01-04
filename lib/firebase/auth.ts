import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User,
  UserCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./config";

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export interface UserData {
  uid: string;
  email: string | null;
  fullName: string | null;
  role: "client" | "provider";
  createdAt: Date;
}

// Sign up with email and password
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: "client" | "provider"
): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update the user's display name
  await updateProfile(userCredential.user, {
    displayName: fullName,
  });

  // Store additional user data in Firestore
  await setDoc(doc(db, "users", userCredential.user.uid), {
    uid: userCredential.user.uid,
    email: email,
    fullName: fullName,
    role: role,
    createdAt: new Date(),
  });

  return userCredential;
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

// Sign in with Google
export async function signInWithGoogle(): Promise<UserCredential> {
  const userCredential = await signInWithPopup(auth, googleProvider);
  
  // Check if user already exists in Firestore
  const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
  
  // If user doesn't exist, create their profile
  if (!userDoc.exists()) {
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      fullName: userCredential.user.displayName,
      role: "client", // Default role for Google sign-in users
      createdAt: new Date(),
      photoURL: userCredential.user.photoURL,
    });
  }
  
  return userCredential;
}

// Sign out
export async function signOut(): Promise<void> {
  // Clear auth cookie
  document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  return firebaseSignOut(auth);
}

// Reset password
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

// Get user data from Firestore
export async function getUserData(uid: string): Promise<UserData | null> {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data() as UserData;
  }
  return null;
}

// Subscribe to auth state changes
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Get current user
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// Set auth cookie for middleware
export function setAuthCookie(user: User) {
  user.getIdToken().then((token) => {
    document.cookie = `auth-token=${token}; path=/; max-age=86400`;
  });
}

