import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD5SkjADPqjkjEsmV_tUAk-KWNRFK59t_s",
  authDomain: "void-paragon-site.firebaseapp.com",
  databaseURL: "https://void-paragon-site-default-rtdb.firebaseio.com",
  projectId: "void-paragon-site",
  storageBucket: "void-paragon-site.firebasestorage.app",
  messagingSenderId: "109588109735",
  appId: "1:109588109735:web:611c31b37a4a1de5113e82"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
