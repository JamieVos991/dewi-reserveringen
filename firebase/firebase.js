import { initializeApp } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.2.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhE4fixjgNtBGCyr_Lz7M5HPQ4YfQeaDQ",
  authDomain: "strakplan-e0953.firebaseapp.com",
  projectId: "strakplan-e0953",
  storageBucket: "strakplan-e0953.firebasestorage.app",
  messagingSenderId: "1033656552155",
  appId: "1:1033656552155:web:74106be10a92249f6d1afe",
  measurementId: "G-EBEC1QRRYW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
