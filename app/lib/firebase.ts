import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDcGyaMzZnb9LuKutrqXn9MxuV86QqWyPE",
  authDomain: "ajp-horas.firebaseapp.com",
  projectId: "ajp-horas",
  storageBucket: "ajp-horas.firebasestorage.app",
  messagingSenderId: "467952586770",
  appId: "1:467952586770:web:7c795a865523351dd408cb",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);