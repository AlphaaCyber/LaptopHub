import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { db } from "../config/firebase.js";

const COLLECTION_NAME = "laptops";

// Data laptop demo default (dikosongkan karena sudah terintegrasi ke Firebase)
const DEMO_LAPTOPS = [];

// Helper untuk menginisialisasi localStorage jika belum ada data
function getLocalLaptops() {
  const data = localStorage.getItem("local_laptops");
  if (!data) {
    localStorage.setItem("local_laptops", JSON.stringify(DEMO_LAPTOPS));
    return DEMO_LAPTOPS;
  }
  try {
    const list = JSON.parse(data);
    return Array.isArray(list) ? list.filter(item => !item.id?.startsWith("demo-")) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalLaptops(laptops) {
  localStorage.setItem("local_laptops", JSON.stringify(laptops));
}

// Menandakan apakah kita beralih ke local fallback akibat Firestore offline / permission error
if (typeof window !== "undefined") {
  window.isUsingLocalFallback = false;
}

/**
 * Mendapatkan semua data laptop dari Firestore diurutkan berdasarkan tanggal dibuat terbaru
 * @returns {Promise<Array<Object>>} Daftar laptop
 */
export async function getAllLaptops() {
  try {
    const laptopsCol = collection(db, COLLECTION_NAME);
    const q = query(laptopsCol, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const laptopsList = [];
    querySnapshot.forEach((docSnap) => {
      laptopsList.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    
    if (laptopsList.length > 0) {
      if (typeof window !== "undefined") window.isUsingLocalFallback = false;
      return laptopsList;
    }
    
    // Jika data kosong, panggil fallback getLocalLaptops agar user langsung dapat data awal
    if (typeof window !== "undefined") window.isUsingLocalFallback = true;
    return getLocalLaptops();
  } catch (error) {
    console.warn("Error getting laptops dari Firestore, menggunakan fallback Local Storage:", error);
    if (typeof window !== "undefined") window.isUsingLocalFallback = true;
    return getLocalLaptops();
  }
}

/**
 * Menyimpan laptop baru ke Firestore
 * @param {Object} laptopData 
 * @returns {Promise<string>} ID Dokumen yang dibuat
 */
export async function createLaptop(laptopData) {
  const isFallback = typeof window !== "undefined" && window.isUsingLocalFallback;
  
  if (isFallback) {
    const localList = getLocalLaptops();
    const newLaptop = {
      id: "local-" + Date.now(),
      ...laptopData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localList.unshift(newLaptop);
    saveLocalLaptops(localList);
    return newLaptop.id;
  }

  try {
    const laptopsCol = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(laptopsCol, {
      ...laptopData,
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.warn("Gagal membuat laptop di Firestore, menyimpan ke Local Storage:", error);
    if (typeof window !== "undefined") window.isUsingLocalFallback = true;
    
    const localList = getLocalLaptops();
    const newLaptop = {
      id: "local-" + Date.now(),
      ...laptopData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localList.unshift(newLaptop);
    saveLocalLaptops(localList);
    return newLaptop.id;
  }
}

/**
 * Memperbarui data laptop di Firestore
 * @param {string} id 
 * @param {Object} laptopData 
 * @returns {Promise<void>}
 */
export async function updateLaptop(id, laptopData) {
  const isFallback = typeof window !== "undefined" && (window.isUsingLocalFallback || id.startsWith("local-") || id.startsWith("demo-"));
  
  if (isFallback) {
    if (typeof window !== "undefined") window.isUsingLocalFallback = true;
    const localList = getLocalLaptops();
    const idx = localList.findIndex(l => l.id === id);
    if (idx !== -1) {
      localList[idx] = {
        ...localList[idx],
        ...laptopData,
        updatedAt: new Date().toISOString()
      };
      saveLocalLaptops(localList);
    }
    return;
  }

  try {
    const laptopDocRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(laptopDocRef, {
      ...laptopData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn(`Gagal memperbarui laptop dengan ID ${id} di Firestore, menyimpan lokal:`, error);
    if (typeof window !== "undefined") window.isUsingLocalFallback = true;
    
    const localList = getLocalLaptops();
    const idx = localList.findIndex(l => l.id === id);
    if (idx !== -1) {
      localList[idx] = {
        ...localList[idx],
        ...laptopData,
        updatedAt: new Date().toISOString()
      };
      saveLocalLaptops(localList);
    }
  }
}

/**
 * Menghapus laptop dari Firestore
 * @param {string} id 
 * @returns {Promise<void>}
 */
export async function deleteLaptop(id) {
  const isFallback = typeof window !== "undefined" && (window.isUsingLocalFallback || id.startsWith("local-") || id.startsWith("demo-"));
  
  if (isFallback) {
    if (typeof window !== "undefined") window.isUsingLocalFallback = true;
    const localList = getLocalLaptops();
    const filtered = localList.filter(l => l.id !== id);
    saveLocalLaptops(filtered);
    return;
  }

  try {
    const laptopDocRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(laptopDocRef);
  } catch (error) {
    console.warn(`Gagal menghapus laptop dengan ID ${id} di Firestore, menghapus lokal:`, error);
    if (typeof window !== "undefined") window.isUsingLocalFallback = true;
    
    const localList = getLocalLaptops();
    const filtered = localList.filter(l => l.id !== id);
    saveLocalLaptops(filtered);
  }
}

/**
 * Berlangganan (subscribe) ke seluruh data laptop di Firestore secara realtime
 * @param {function(Array<Object>)} callback - Fungsi yang dipanggil saat ada perubahan data
 * @returns {function} Fungsi unsubscribe untuk membatalkan listener
 */
export function subscribeToLaptops(callback) {
  try {
    const laptopsCol = collection(db, COLLECTION_NAME);
    const q = query(laptopsCol, orderBy("createdAt", "desc"));
    
    return onSnapshot(q, (querySnapshot) => {
      const laptopsList = [];
      querySnapshot.forEach((docSnap) => {
        laptopsList.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      
      if (laptopsList.length > 0) {
        if (typeof window !== "undefined") window.isUsingLocalFallback = false;
        callback(laptopsList);
      } else {
        if (typeof window !== "undefined") window.isUsingLocalFallback = true;
        callback(getLocalLaptops());
      }
    }, (error) => {
      console.warn("Realtime listener error, menggunakan fallback Local Storage:", error);
      if (typeof window !== "undefined") window.isUsingLocalFallback = true;
      callback(getLocalLaptops());
    });
  } catch (error) {
    console.warn("Gagal membuat realtime listener, menggunakan fallback Local Storage:", error);
    if (typeof window !== "undefined") window.isUsingLocalFallback = true;
    callback(getLocalLaptops());
    return () => {};
  }
}

