import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCcg6hUS7MJgoKUY2FoVix2LowEvzzxF5w",
  authDomain: "grocery-store-1b260.firebaseapp.com",
  projectId: "grocery-store-1b260",
  storageBucket: "grocery-store-1b260.firebasestorage.app",
  messagingSenderId: "369824153409",
  appId: "1:369824153409:web:a0f4c7ac7a611cf72aebc0",
  measurementId: "G-35XF317V8M"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});
export const auth = getAuth(app);
