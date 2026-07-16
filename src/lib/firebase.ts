import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCFwxBgzmmJHGzdSHAv0MBfKVBNHe9K4Bo",
  authDomain: "caveman-d35a5.firebaseapp.com",
  projectId: "caveman-d35a5",
  storageBucket: "caveman-d35a5.firebasestorage.app",
  messagingSenderId: "932409750435",
  appId: "1:932409750435:web:de8012ec644b21559aa016",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { app };
