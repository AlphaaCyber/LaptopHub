import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth } from "../config/firebase.js";

/**
 * Melakukan login admin menggunakan email dan password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export async function loginAdmin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
}

/**
 * Melakukan logout admin
 * @returns {Promise<void>}
 */
export async function logoutAdmin() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
    throw error;
  }
}

/**
 * Memantau status autentikasi admin
 * @param {function} callback 
 */
export function watchAuthState(callback) {
  onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

/**
 * Mendapatkan admin yang sedang login saat ini
 * @returns {import("firebase/auth").User|null}
 */
export function getCurrentAdmin() {
  return auth.currentUser;
}
