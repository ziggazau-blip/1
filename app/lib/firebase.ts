import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDcGyaMzZnb9LuKutrqXn9MxuV86QqWyPE",
  authDomain: "ajp-horas.firebaseapp.com",
  projectId: "ajp-horas",
  storageBucket: "ajp-horas.firebasestorage.app",
  messagingSenderId: "467952586770",
  appId: "1:467952586770:web:7c795a865523351dd408cb",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 🔐 Auth
export const auth = getAuth(app);

// 🗄 Firestore
export const db = getFirestore(app);