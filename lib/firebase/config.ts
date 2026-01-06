import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCe-ADdiHC9qzx8FjnQ_c45DmQij5sCT7E",
  authDomain: "task-zing-m-v-p-e11l44.firebaseapp.com",
  projectId: "task-zing-m-v-p-e11l44",
  storageBucket: "task-zing-m-v-p-e11l44.firebasestorage.app",
  messagingSenderId: "211438342424",
  appId: "1:211438342424:web:37459eca67a9abbe02ce6d"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

