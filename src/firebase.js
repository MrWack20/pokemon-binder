// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB1pIZNaOZl9pbNR_0_PD8w1M1wQR4gjtg",
  authDomain: "pokemon-binder-6d743.firebaseapp.com",
  projectId: "pokemon-binder-6d743",
  storageBucket: "pokemon-binder-6d743.firebasestorage.app",
  messagingSenderId: "454895078486",
  appId: "1:454895078486:web:49f18e31b6753c204cbff7",
  measurementId: "G-5ZH7PEFPJL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth (for future user authentication)
export const auth = getAuth(app);