import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCYpUbO2ZddAbUi6yIqx8VLowxWqztBloM",
  authDomain: "sd-project-52e86.firebaseapp.com",
  projectId: "sd-project-52e86",
  storageBucket: "sd-project-52e86.appspot.com",
  messagingSenderId: "914648001812",
  appId: "1:914648001812:web:7749edcb7466c45bc06601",
  measurementId: "G-PD93511WLK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db };