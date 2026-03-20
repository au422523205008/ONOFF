// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBG4LNL3oN2Qk2iJkidE_MiIBLW2QrDFK4",
  authDomain: "onoff-dance-studio.firebaseapp.com",
  projectId: "onoff-dance-studio",
  storageBucket: "onoff-dance-studio.firebasestorage.app",
  messagingSenderId: "79123857330",
  appId: "1:79123857330:web:c4f8ed3dd9a408e2312eab",
  measurementId: "G-YJYZZXHZYG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
};