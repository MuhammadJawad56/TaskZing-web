import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User,
  UserCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./config";

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Apple Auth Provider
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export interface UserData {
  uid: string;
  email: string | null;
  fullName: string | null;
  role: "client" | "provider" | "both";
  currentRole?: "client" | "provider" | "both";
  providerProfileCompleted?: boolean;
  location?: string;
  totalRating?: number;
  totalReviews?: number;
  skills?: string[];
  photoUrl?: string;
  profilePicture?: string;
  isVerified?: boolean;
  createdAt: Date;
  updatedAt?: Date;
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

  // Send email verification
  await sendEmailVerification(userCredential.user);

  // Store additional user data in Firestore
  await setDoc(doc(db, "users", userCredential.user.uid), {
    uid: userCredential.user.uid,
    email: email,
    fullName: fullName,
    role: role,
    currentRole: role,
    emailVerified: false,
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
      currentRole: "client",
      createdAt: new Date(),
      photoURL: userCredential.user.photoURL,
    });
  }
  
  return userCredential;
}

// Sign in with Apple
export async function signInWithApple(): Promise<UserCredential> {
  // Apple sign-in uses redirect flow on web
  // For better UX, we'll use popup if available, otherwise redirect
  let userCredential: UserCredential;
  
  try {
    // Try popup first (works on Safari and some browsers)
    userCredential = await signInWithPopup(auth, appleProvider);
  } catch (error: any) {
    // If popup fails (e.g., blocked or not supported), use redirect
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/operation-not-allowed') {
      // Use redirect flow
      await signInWithRedirect(auth, appleProvider);
      // This will redirect the page, so we won't reach here
      throw new Error('Redirecting to Apple sign-in...');
    }
    throw error;
  }
  
  // Check if user already exists in Firestore
  const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
  
  // Extract name from Apple credential if available
  let fullName = userCredential.user.displayName;
  if (!fullName && (userCredential as any).additionalUserInfo?.profile) {
    const profile = (userCredential as any).additionalUserInfo.profile;
    if (profile.name) {
      fullName = `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim();
    }
  }
  
  // If user doesn't exist, create their profile
  if (!userDoc.exists()) {
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      fullName: fullName || userCredential.user.email?.split('@')[0] || 'Apple User',
      role: "client", // Default role for Apple sign-in users
      currentRole: "client",
      createdAt: new Date(),
      photoURL: userCredential.user.photoURL,
    });
    
    // Update display name if we have it
    if (fullName) {
      await updateProfile(userCredential.user, {
        displayName: fullName,
      });
    }
  }
  
  return userCredential;
}

// Handle Apple redirect result (call this on page load after redirect)
export async function handleAppleRedirect(): Promise<UserCredential | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      
      // Extract name from Apple credential if available
      let fullName = result.user.displayName;
      if (!fullName && (result as any).additionalUserInfo?.profile) {
        const profile = (result as any).additionalUserInfo.profile;
        if (profile.name) {
          fullName = `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim();
        }
      }
      
      // If user doesn't exist, create their profile
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          fullName: fullName || result.user.email?.split('@')[0] || 'Apple User',
          role: "client",
          currentRole: "client",
          createdAt: new Date(),
          photoURL: result.user.photoURL,
        });
        
        // Update display name if we have it
        if (fullName) {
          await updateProfile(result.user, {
            displayName: fullName,
          });
        }
      }
      
      return result;
    }
    return null;
  } catch (error) {
    console.error('Error handling Apple redirect:', error);
    return null;
  }
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

// Resend email verification
export async function resendEmailVerification(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is currently signed in");
  }
  if (user.emailVerified) {
    throw new Error("Email is already verified");
  }
  return sendEmailVerification(user);
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

// Switch user role (client/provider)
export async function switchUserRole(
  userId: string,
  newRole: "client" | "provider"
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }
    
    const currentData = userDoc.data();
    const currentRole = currentData.role;
    
    // Update role and currentRole
    await updateDoc(userRef, {
      role: currentRole === "both" ? "both" : newRole, // Keep "both" if already set, otherwise set to new role
      currentRole: newRole,
      updatedAt: new Date(),
    });
    
    console.log(`User role switched to: ${newRole}`);
  } catch (error) {
    console.error("Error switching user role:", error);
    throw error;
  }
}