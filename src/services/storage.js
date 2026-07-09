import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase.js";

/**
 * Upload gambar laptop ke Firebase Storage dengan fallback ke Base64 jika terjadi error.
 * @param {File} file - File gambar dari input form
 * @returns {Promise<string>} URL download gambar atau string Base64
 */
export async function uploadLaptopImage(file) {
  if (!file) return "";

  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const storageRef = ref(storage, `laptops/${fileName}`);

  try {
    // Upload bytes ke Firebase Storage
    const snapshot = await uploadBytes(storageRef, file);
    // Dapatkan URL publik untuk gambar
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.warn("Storage upload failed or not configured, falling back to Base64 representation:", error);
    // Fallback ke Base64 jika Firebase Storage mengalami kendala izin atau inisialisasi
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.onerror = (err) => {
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  }
}
