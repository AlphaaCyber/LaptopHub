import { 
  loginAdmin, 
  logoutAdmin, 
  watchAuthState, 
  getCurrentAdmin 
} from "./services/auth.js";
import { 
  getAllLaptops, 
  createLaptop, 
  updateLaptop, 
  deleteLaptop,
  subscribeToLaptops
} from "./services/db.js";
import { 
  renderLaptopCards, 
  showLoadingSpinner 
} from "./components/user.js";
import { 
  renderAdminTable 
} from "./components/admin.js";
import { 
  formatRupiah 
} from "./utils/helpers.js";

// State Global Aplikasi
let allLaptops = [];
let loggedInUser = null;

// Instance Bootstrap Modal (akan diinisialisasi setelah DOM load)
let detailModalInstance = null;
let laptopFormModalInstance = null;

// Event saat halaman termuat
document.addEventListener("DOMContentLoaded", () => {
  // Inisialisasi Modals Bootstrap
  detailModalInstance = new bootstrap.Modal(document.getElementById("detailModal"));
  laptopFormModalInstance = new bootstrap.Modal(document.getElementById("laptopFormModal"));

  // Inisialisasi Icons Lucide
  if (window.lucide) window.lucide.createIcons();

  // Jalankan pemantauan status Auth Firebase
  watchAuthState((user) => {
    handleAuthStateChange(user);
  });

  // Hubungkan semua Event Listeners
  setupEventListeners();

  // Tarik data awal laptop dari Firestore
  fetchLaptops();
});

/**
 * Mengatur semua Event Listeners untuk interaksi pengguna
 */
function setupEventListeners() {
  // Navigation & Tabs
  document.getElementById("nav-home").addEventListener("click", (e) => {
    e.preventDefault();
    switchView("home");
  });

  document.getElementById("nav-catalog").addEventListener("click", (e) => {
    e.preventDefault();
    switchView("catalog");
  });

  // Logo secret click logic
  let logoClickCount = 0;
  let logoClickTimeout;
  document.getElementById("brand-link").addEventListener("click", (e) => {
    e.preventDefault();
    logoClickCount++;
    if (logoClickCount >= 5) {
      logoClickCount = 0;
      if (loggedInUser) {
        switchView("admin");
      } else {
        switchView("login");
      }
    } else {
      switchView("home");
    }
    clearTimeout(logoClickTimeout);
    logoClickTimeout = setTimeout(() => {
      logoClickCount = 0;
    }, 3000);
  });

  // Footer Quick Navigation Links
  document.getElementById("footer-link-home").addEventListener("click", (e) => {
    e.preventDefault();
    switchView("home");
  });

  document.getElementById("footer-link-catalog").addEventListener("click", (e) => {
    e.preventDefault();
    switchView("catalog");
  });

  document.getElementById("footer-link-admin").addEventListener("click", (e) => {
    e.preventDefault();
    switchView("admin");
  });

  const navAdminLink = document.getElementById("nav-admin-dashboard");
  if (navAdminLink) {
    navAdminLink.addEventListener("click", (e) => {
      e.preventDefault();
      switchView("admin");
    });
  }

  // Auth buttons
  document.getElementById("btn-login-nav").addEventListener("click", () => {
    switchView("login");
  });

  document.getElementById("btn-close-error-alert").addEventListener("click", () => {
    document.getElementById("page-login-error-alert").classList.add("d-none");
  });

  // Shared Admin Logout Handler
  const logoutHandler = async () => {
    try {
      const confirmLogout = await Swal.fire({
        title: "Konfirmasi Logout",
        text: "Apakah Anda yakin ingin keluar dari sesi admin?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ya, Keluar",
        cancelButtonText: "Batal",
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#6c757d",
        customClass: {
          confirmButton: "rounded-pill px-4",
          cancelButton: "rounded-pill px-4"
        }
      });

      if (confirmLogout.isConfirmed) {
        await logoutAdmin();
        Swal.fire({
          title: "Logout Berhasil",
          text: "Anda telah keluar dari mode admin.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      showToast("Error", "Gagal keluar sesi.", "error");
    }
  };

  const btnLogoutNav = document.getElementById("btn-logout-nav");
  if (btnLogoutNav) {
    btnLogoutNav.addEventListener("click", logoutHandler);
  }

  const btnAdminLogout = document.getElementById("btn-admin-logout");
  if (btnAdminLogout) {
    btnAdminLogout.addEventListener("click", logoutHandler);
  }

  // Secret copyright double click trigger
  const copyrightText = document.querySelector("footer #footer-section p, footer p");
  if (copyrightText) {
    copyrightText.style.cursor = "default";
    copyrightText.addEventListener("dblclick", () => {
      if (loggedInUser) {
        switchView("admin");
      } else {
        switchView("login");
      }
    });
  }

  // Admin Sidebar switching
  const menuDashboard = document.getElementById("admin-menu-dashboard");
  const menuInventory = document.getElementById("admin-menu-inventory");
  const viewDashboard = document.getElementById("admin-view-dashboard");
  const viewInventory = document.getElementById("admin-view-inventory");

  if (menuDashboard && menuInventory && viewDashboard && viewInventory) {
    menuDashboard.addEventListener("click", (e) => {
      e.preventDefault();
      menuDashboard.classList.add("active");
      menuInventory.classList.remove("active");
      viewDashboard.classList.remove("d-none");
      viewInventory.classList.add("d-none");
      updateAdminDashboard();
    });

    menuInventory.addEventListener("click", (e) => {
      e.preventDefault();
      menuInventory.classList.add("active");
      menuDashboard.classList.remove("active");
      viewInventory.classList.remove("d-none");
      viewDashboard.classList.add("d-none");
      updateAdminDashboard();
    });
  }

  // Login Form Submission
  document.getElementById("page-login-form").addEventListener("submit", handlePageLoginSubmit);

  // Home Page - Search bar
  const homeSearchInput = document.getElementById("home-search-input");
  const btnHomeSearch = document.getElementById("btn-home-search");

  btnHomeSearch.addEventListener("click", () => {
    const searchVal = homeSearchInput.value.trim();
    document.getElementById("catalog-search-input").value = searchVal;
    switchView("catalog");
  });

  homeSearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const searchVal = homeSearchInput.value.trim();
      document.getElementById("catalog-search-input").value = searchVal;
      switchView("catalog");
    }
  });

  // Catalog Page - Search Bar
  const catalogSearchInput = document.getElementById("catalog-search-input");
  catalogSearchInput.addEventListener("input", () => {
    applyFiltersAndRender();
  });

  // Home Page - Category Cards
  document.querySelectorAll(".category-card").forEach((card) => {
    card.addEventListener("click", () => {
      const category = card.getAttribute("data-category");
      document.getElementById("filter-category").value = category;
      switchView("catalog");
    });
  });

  // Footer - Category Links
  document.querySelectorAll(".footer-category-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const category = link.getAttribute("data-category");
      document.getElementById("filter-category").value = category;
      switchView("catalog");
    });
  });

  // Buttons "Lihat Semua"
  document.querySelectorAll(".btn-view-all-laptops").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("filter-form").reset();
      document.getElementById("catalog-search-input").value = "";
      switchView("catalog");
    });
  });

  // Dropdown / Select Filters (Catalog)
  document.getElementById("filter-brand").addEventListener("change", applyFiltersAndRender);
  document.getElementById("filter-category").addEventListener("change", applyFiltersAndRender);
  document.getElementById("filter-cpu").addEventListener("change", applyFiltersAndRender);
  document.getElementById("filter-ram").addEventListener("change", applyFiltersAndRender);
  document.getElementById("filter-storage").addEventListener("change", applyFiltersAndRender);
  document.getElementById("filter-gpu").addEventListener("change", applyFiltersAndRender);
  document.getElementById("filter-harga-min").addEventListener("input", applyFiltersAndRender);
  document.getElementById("filter-harga-max").addEventListener("input", applyFiltersAndRender);
  document.getElementById("catalog-sort").addEventListener("change", applyFiltersAndRender);

  // Reset Filters Button
  document.getElementById("btn-reset-filters").addEventListener("click", () => {
    document.getElementById("filter-form").reset();
    document.getElementById("catalog-search-input").value = "";
    document.getElementById("home-search-input").value = "";
    applyFiltersAndRender();
    showToast("Filter Direset", "Semua filter telah dikembalikan ke kondisi awal.", "success");
  });

  // Admin CRUD Buttons
  const btnAdminAddLaptop = document.getElementById("btn-admin-add-laptop");
  if (btnAdminAddLaptop) {
    btnAdminAddLaptop.addEventListener("click", () => {
      openLaptopFormModal(null); // Mode: Tambah
    });
  }

  // Admin Table Search
  document.getElementById("admin-table-search").addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allLaptops.filter(laptop => 
      laptop.nama.toLowerCase().includes(keyword) || 
      laptop.brand.toLowerCase().includes(keyword)
    );
    renderAdminTable(filtered, document.getElementById("admin-table-body"), openLaptopFormModal, handleDeleteClick);
  });

  // Laptop Form Submit
  document.getElementById("laptop-form").addEventListener("submit", handleLaptopFormSubmit);

  // Laptop Detail View Action listeners
  const btnBackToCatalog = document.getElementById("btn-back-to-catalog");
  if (btnBackToCatalog) {
    btnBackToCatalog.addEventListener("click", () => {
      switchView("catalog");
    });
  }

  const breadcrumbHome = document.getElementById("breadcrumb-home");
  if (breadcrumbHome) {
    breadcrumbHome.addEventListener("click", (e) => {
      e.preventDefault();
      switchView("home");
    });
  }

  const breadcrumbCatalog = document.getElementById("breadcrumb-catalog");
  if (breadcrumbCatalog) {
    breadcrumbCatalog.addEventListener("click", (e) => {
      e.preventDefault();
      switchView("catalog");
    });
  }

  const btnDetailShare = document.getElementById("btn-detail-share");
  if (btnDetailShare) {
    btnDetailShare.addEventListener("click", () => {
      const laptopNama = document.getElementById("detail-page-nama").textContent;
      const shareUrl = window.location.href;
      
      if (navigator.share) {
        navigator.share({
          title: `Katalog LaptopHub - ${laptopNama}`,
          text: `Cek spesifikasi dan harga detail ${laptopNama} hanya di LaptopHub!`,
          url: shareUrl,
        }).catch(err => console.log("Gagal membagikan link:", err));
      } else {
        // Fallback copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
          Swal.fire({
            title: "Link Berhasil Disalin!",
            text: "Tautan katalog laptop telah disalin ke clipboard Anda.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
            customClass: { popup: "rounded-4" }
          });
        }).catch(() => {
          showToast("Gagal menyalin", "Silakan salin URL dari address bar browser Anda.", "error");
        });
      }
    });
  }
}

/**
 * Berlangganan data laptop secara realtime dari Firestore
 */
function fetchLaptops() {
  const container = document.getElementById("laptop-cards-container");
  if (container) {
    showLoadingSpinner(container);
  }

  // Mulai langganan realtime Firestore
  subscribeToLaptops((laptops) => {
    allLaptops = laptops;
    renderHomeSections();
    applyFiltersAndRender();
    updateAdminDashboard();
  });
}

/**
 * Merender bagian-bagian dinamis di halaman Home (Laptop Terbaru & Laptop Populer)
 */
function renderHomeSections() {
  const latestContainer = document.getElementById("home-latest-container");
  const popularContainer = document.getElementById("home-popular-container");

  if (!latestContainer || !popularContainer || allLaptops.length === 0) return;

  // 1. Laptop Terbaru (Berdasarkan tanggal atau id terbaru)
  const sortedLatest = [...allLaptops].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const latest3 = sortedLatest.slice(0, 3);
  renderLaptopCards(latest3, latestContainer, openDetailModal);

  // 2. Laptop Populer (Diurutkan berdasarkan spesifikasi/harga tertinggi sebagai flagship premium)
  const sortedPopular = [...allLaptops].sort((a, b) => parseInt(b.hargaBaru || 0) - parseInt(a.hargaBaru || 0));
  const popular3 = sortedPopular.slice(0, 3);
  renderLaptopCards(popular3, popularContainer, openDetailModal);
}

/**
 * Memfilter dan mengurutkan laptop berdasarkan kriteria pencarian dan pilihan filter, lalu merender hasilnya
 */
function applyFiltersAndRender() {
  const searchVal = document.getElementById("catalog-search-input").value.toLowerCase().trim();
  const brandVal = document.getElementById("filter-brand").value;
  const categoryVal = document.getElementById("filter-category").value;
  const cpuVal = document.getElementById("filter-cpu").value;
  const ramVal = document.getElementById("filter-ram").value;
  const storageVal = document.getElementById("filter-storage").value;
  const gpuVal = document.getElementById("filter-gpu").value;
  const hargaMinVal = document.getElementById("filter-harga-min").value;
  const hargaMaxVal = document.getElementById("filter-harga-max").value;
  const sortVal = document.getElementById("catalog-sort").value;

  // 1. Filtering
  let filtered = allLaptops.filter((laptop) => {
    // Search keyword
    const matchSearch = !searchVal || 
      laptop.nama.toLowerCase().includes(searchVal) ||
      laptop.brand.toLowerCase().includes(searchVal) ||
      (laptop.processor && laptop.processor.toLowerCase().includes(searchVal)) ||
      (laptop.gpu && laptop.gpu.toLowerCase().includes(searchVal)) ||
      (laptop.deskripsi && laptop.deskripsi.toLowerCase().includes(searchVal));

    // Brand filter
    const matchBrand = !brandVal || laptop.brand === brandVal;

    // Category filter
    const matchCategory = !categoryVal || laptop.kategori === categoryVal;

    // CPU filter
    const matchCpu = !cpuVal || (laptop.processor && laptop.processor.toLowerCase().includes(cpuVal.toLowerCase()));

    // RAM filter
    const matchRam = !ramVal || laptop.ram === ramVal;

    // Storage filter
    const matchStorage = !storageVal || laptop.storage === storageVal;

    // GPU filter
    const matchGpu = !gpuVal || (laptop.gpu && laptop.gpu.toLowerCase().includes(gpuVal.toLowerCase()));

    // Harga (Rentang Harga Baru) filter
    let matchHarga = true;
    const laptopPrice = typeof laptop.hargaBaru === "string" ? parseInt(laptop.hargaBaru) : (laptop.hargaBaru || 0);
    if (hargaMinVal) {
      const minPrice = parseInt(hargaMinVal);
      if (!isNaN(minPrice) && laptopPrice < minPrice) matchHarga = false;
    }
    if (hargaMaxVal) {
      const maxPrice = parseInt(hargaMaxVal);
      if (!isNaN(maxPrice) && laptopPrice > maxPrice) matchHarga = false;
    }

    return matchSearch && matchBrand && matchCategory && matchCpu && matchRam && matchStorage && matchGpu && matchHarga;
  });

  // 2. Sorting
  if (sortVal === "newest") {
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else if (sortVal === "price-asc") {
    filtered.sort((a, b) => parseInt(a.hargaBaru || 0) - parseInt(b.hargaBaru || 0));
  } else if (sortVal === "price-desc") {
    filtered.sort((a, b) => parseInt(b.hargaBaru || 0) - parseInt(a.hargaBaru || 0));
  } else if (sortVal === "name-asc") {
    filtered.sort((a, b) => a.nama.localeCompare(b.nama));
  }

  // 3. Render ke katalog user
  const cardsContainer = document.getElementById("laptop-cards-container");
  renderLaptopCards(filtered, cardsContainer, openDetailModal);

  // Update total count label
  document.getElementById("catalog-count").textContent = filtered.length;
}

/**
 * Mengubah visual view aktif antara Home, Katalog User, Admin Login, Dashboard Admin, dan Detail Laptop
 * @param {'home'|'catalog'|'login'|'admin'|'detail'} view 
 */
function switchView(view) {
  const homeSection = document.getElementById("home-section");
  const catalogSection = document.getElementById("catalog-section");
  const adminSection = document.getElementById("admin-section");
  const loginSection = document.getElementById("login-section");
  const detailSection = document.getElementById("detail-section");
  const navHome = document.getElementById("nav-home");
  const navCatalog = document.getElementById("nav-catalog");
  const navAdmin = document.getElementById("nav-admin-dashboard");

  const userMainContainer = document.getElementById("user-main-container");
  const navSection = document.getElementById("nav-section");
  const footerSection = document.getElementById("footer-section");

  // Reset active classes di navbar
  if (navHome) {
    navHome.classList.remove("active", "text-primary");
    navHome.classList.add("text-muted");
  }
  if (navCatalog) {
    navCatalog.classList.remove("active", "text-primary");
    navCatalog.classList.add("text-muted");
  }
  if (navAdmin) {
    navAdmin.classList.remove("active");
  }

  if (view === "admin") {
    // Pastikan admin sudah login sebelum beralih
    if (!loggedInUser) {
      showToast("Akses Ditolak", "Silakan login sebagai administrator terlebih dahulu.", "warning");
      switchView("login");
      return;
    }
    // Sembunyikan elemen utama user
    if (navSection) navSection.classList.add("d-none");
    if (userMainContainer) userMainContainer.classList.add("d-none");
    if (footerSection) footerSection.classList.add("d-none");

    // Tampilkan admin section
    if (adminSection) adminSection.classList.remove("d-none");
    
    // Sembunyikan view user batin
    homeSection.classList.add("d-none");
    catalogSection.classList.add("d-none");
    if (loginSection) loginSection.classList.add("d-none");
    if (detailSection) detailSection.classList.add("d-none");
    
    if (navAdmin) navAdmin.classList.add("active");
    
    updateAdminDashboard();
  } else {
    // Tampilkan elemen utama user
    if (navSection) navSection.classList.remove("d-none");
    if (userMainContainer) userMainContainer.classList.remove("d-none");
    if (footerSection) footerSection.classList.remove("d-none");

    // Sembunyikan admin section
    if (adminSection) adminSection.classList.add("d-none");

    if (view === "catalog") {
      homeSection.classList.add("d-none");
      catalogSection.classList.remove("d-none");
      if (loginSection) loginSection.classList.add("d-none");
      if (detailSection) detailSection.classList.add("d-none");
      
      if (navCatalog) {
        navCatalog.classList.add("active", "text-primary");
        navCatalog.classList.remove("text-muted");
      }
      
      applyFiltersAndRender();
    } else if (view === "login") {
      homeSection.classList.add("d-none");
      catalogSection.classList.add("d-none");
      if (detailSection) detailSection.classList.add("d-none");
      if (loginSection) {
        loginSection.classList.remove("d-none");
        // Reset form dan error messages
        const loginForm = document.getElementById("page-login-form");
        if (loginForm) loginForm.reset();
        const errorAlert = document.getElementById("page-login-error-alert");
        if (errorAlert) errorAlert.classList.add("d-none");
      }
    } else if (view === "detail") {
      homeSection.classList.add("d-none");
      catalogSection.classList.add("d-none");
      if (loginSection) loginSection.classList.add("d-none");
      if (detailSection) detailSection.classList.remove("d-none");
    } else {
      // Default: home
      homeSection.classList.remove("d-none");
      catalogSection.classList.add("d-none");
      if (loginSection) loginSection.classList.add("d-none");
      if (detailSection) detailSection.classList.add("d-none");
      
      if (navHome) {
        navHome.classList.add("active", "text-primary");
        navHome.classList.remove("text-muted");
      }
      
      renderHomeSections();
    }
  }

  // Scroll ke atas dengan halus pada setiap perpindahan halaman
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Menghandle pembaruan status ketika auth Firebase berubah
 * @param {import("firebase/auth").User|null} user 
 */
function handleAuthStateChange(user) {
  loggedInUser = user;

  const btnLoginNav = document.getElementById("btn-login-nav");
  const btnLogoutNav = document.getElementById("btn-logout-nav");

  if (user) {
    // Admin login
    if (btnLoginNav) btnLoginNav.classList.add("d-none");
    if (btnLogoutNav) btnLogoutNav.classList.remove("d-none");
  } else {
    // Admin logout
    if (btnLoginNav) btnLoginNav.classList.add("d-none"); // Tetap disembunyikan agar login bersifat rahasia
    if (btnLogoutNav) btnLogoutNav.classList.add("d-none");
    switchView("home");
  }
}

/**
 * Menghandle submit form login admin di halaman login
 */
async function handlePageLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("page-login-email").value.trim();
  const password = document.getElementById("page-login-password").value;
  const errorAlert = document.getElementById("page-login-error-alert");
  const errorText = document.getElementById("page-login-error-text");
  const submitBtn = document.getElementById("btn-page-submit-login");

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> Memverifikasi...`;
  errorAlert.classList.add("d-none");

  try {
    await loginAdmin(email, password);
    
    Swal.fire({
      title: "Login Sukses!",
      text: `Selamat datang kembali, Administrator.`,
      icon: "success",
      timer: 1800,
      showConfirmButton: false,
      customClass: {
        popup: "rounded-4"
      }
    });

    switchView("admin");
  } catch (error) {
    console.error("Login Page Submission Error:", error);
    errorAlert.classList.remove("d-none");
    
    if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
      errorText.innerHTML = `
        <strong>Login Gagal:</strong> Kredensial salah atau akun admin belum terdaftar.<br>
        <div class="mt-2 p-2 bg-white text-danger border border-danger-subtle rounded small">
          <strong>Tip Pengujian:</strong> Pastikan Anda menggunakan akun yang terdaftar di Firebase Console Authentication.
        </div>
      `;
    } else if (error.code === "auth/invalid-email") {
      errorText.innerHTML = `<strong>Format Salah:</strong> Alamat email tidak valid.`;
    } else if (error.code === "auth/too-many-requests") {
      errorText.innerHTML = `<strong>Aktivitas Mencurigakan:</strong> Sesi ditangguhkan karena terlalu banyak kesalahan login. Silakan coba beberapa saat lagi.`;
    } else {
      errorText.innerHTML = `<strong>Gagal:</strong> ${error.message}`;
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Masuk Dashboard";
  }
}

/**
 * Membuka Halaman Detail Laptop dan mengisi datanya
 * @param {Object} laptop 
 */
function openDetailModal(laptop) {
  const defaultImg = "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=600&auto=format&fit=crop";
  const finalImg = laptop.gambar || defaultImg;
  
  // Isi data modal lama (untuk kompatibilitas)
  const detailImg = document.getElementById("detail-img");
  if (detailImg) detailImg.src = finalImg;
  const detailNama = document.getElementById("detail-nama");
  if (detailNama) detailNama.textContent = laptop.nama;
  const detailBrand = document.getElementById("detail-brand");
  if (detailBrand) detailBrand.textContent = laptop.brand;
  const detailKategori = document.getElementById("detail-kategori");
  if (detailKategori) detailKategori.textContent = laptop.kategori || "Katalog";
  const detailHargaBaru = document.getElementById("detail-harga-baru");
  if (detailHargaBaru) detailHargaBaru.textContent = formatRupiah(laptop.hargaBaru);
  const detailHargaBekas = document.getElementById("detail-harga-bekas");
  if (detailHargaBekas) detailHargaBekas.textContent = formatRupiah(laptop.hargaBekas);
  const detailProcessor = document.getElementById("detail-processor");
  if (detailProcessor) detailProcessor.textContent = laptop.processor || "-";
  const detailGpu = document.getElementById("detail-gpu");
  if (detailGpu) detailGpu.textContent = laptop.gpu || "-";
  const detailRam = document.getElementById("detail-ram");
  if (detailRam) detailRam.textContent = laptop.ram || "-";
  const detailStorage = document.getElementById("detail-storage");
  if (detailStorage) detailStorage.textContent = laptop.storage || "-";
  const detailLayar = document.getElementById("detail-layar");
  if (detailLayar) detailLayar.textContent = `${laptop.layar || laptop.ukuranLayar || "14"}"`;
  const detailDeskripsi = document.getElementById("detail-deskripsi");
  if (detailDeskripsi) detailDeskripsi.textContent = laptop.deskripsi || "Tidak ada deskripsi spesifik mengenai laptop ini.";

  // Isi data halaman detail baru (Bootstrap Card modern)
  const dpImg = document.getElementById("detail-page-img");
  if (dpImg) dpImg.src = finalImg;
  const dpNama = document.getElementById("detail-page-nama");
  if (dpNama) dpNama.textContent = laptop.nama;
  const dpBrand = document.getElementById("detail-page-brand");
  if (dpBrand) dpBrand.textContent = laptop.brand;
  const dpKategori = document.getElementById("detail-page-kategori");
  if (dpKategori) dpKategori.textContent = laptop.kategori || "Katalog";
  const dpHargaBaru = document.getElementById("detail-page-harga-baru");
  if (dpHargaBaru) dpHargaBaru.textContent = formatRupiah(laptop.hargaBaru);
  const dpHargaBekas = document.getElementById("detail-page-harga-bekas");
  if (dpHargaBekas) dpHargaBekas.textContent = formatRupiah(laptop.hargaBekas);
  const dpProcessor = document.getElementById("detail-page-processor");
  if (dpProcessor) dpProcessor.textContent = laptop.processor || "-";
  const dpGpu = document.getElementById("detail-page-gpu");
  if (dpGpu) dpGpu.textContent = laptop.gpu || "-";
  const dpRam = document.getElementById("detail-page-ram");
  if (dpRam) dpRam.textContent = laptop.ram || "-";
  const dpStorage = document.getElementById("detail-page-storage");
  if (dpStorage) dpStorage.textContent = laptop.storage || "-";
  const dpLayar = document.getElementById("detail-page-layar");
  if (dpLayar) dpLayar.textContent = `${laptop.layar || laptop.ukuranLayar || "14"}"`;
  const dpDeskripsi = document.getElementById("detail-page-deskripsi");
  if (dpDeskripsi) dpDeskripsi.textContent = laptop.deskripsi || "Tidak ada deskripsi spesifik mengenai laptop ini.";

  // Breadcrumb title update
  const dpBreadcrumbTitle = document.getElementById("detail-breadcrumb-title");
  if (dpBreadcrumbTitle) dpBreadcrumbTitle.textContent = laptop.nama;

  // Hubungi WhatsApp link update
  const btnDetailHubungi = document.getElementById("btn-detail-hubungi");
  if (btnDetailHubungi) {
    const waText = `Halo LaptopHub, saya tertarik dengan laptop *${laptop.nama}* (${laptop.brand}) dengan harga baru sekitar ${formatRupiah(laptop.hargaBaru)}. Apakah unit ini masih tersedia? Terima kasih!`;
    btnDetailHubungi.href = `https://wa.me/6282396854199?text=${encodeURIComponent(waText)}`;
  }

  // Tampilkan view detail
  switchView("detail");
}

/**
 * Membuka Form Tambah/Edit laptop modal
 * @param {Object|null} laptop - Laptop yang akan diedit, atau null untuk laptop baru
 */
function openLaptopFormModal(laptop) {
  const form = document.getElementById("laptop-form");
  form.reset();

  const modalTitle = document.getElementById("laptopFormModalLabel");
  const submitText = document.getElementById("laptop-submit-text");
  const formHeader = document.getElementById("laptop-form-header");
  const formIcon = document.getElementById("laptop-form-icon");

  // Reset string url
  document.getElementById("laptop-image-url").value = "";

  if (laptop) {
    // Mode EDIT
    document.getElementById("laptop-form-id").value = laptop.id;
    document.getElementById("laptop-nama").value = laptop.nama;
    document.getElementById("laptop-brand").value = laptop.brand;
    document.getElementById("laptop-kategori").value = laptop.kategori || "";
    document.getElementById("laptop-harga-baru").value = laptop.hargaBaru;
    document.getElementById("laptop-harga-bekas").value = laptop.hargaBekas;
    document.getElementById("laptop-processor").value = laptop.processor;
    document.getElementById("laptop-gpu").value = laptop.gpu;
    document.getElementById("laptop-ram").value = laptop.ram || "16GB";
    document.getElementById("laptop-storage").value = laptop.storage || "512GB SSD";
    document.getElementById("laptop-layar").value = laptop.layar || laptop.ukuranLayar || "14";
    document.getElementById("laptop-deskripsi").value = laptop.deskripsi || "";
    
    // Masukkan URL gambar lama ke input URL sebagai penanda
    document.getElementById("laptop-image-url").value = laptop.gambar || "";

    modalTitle.textContent = "Edit Data Laptop";
    submitText.textContent = "Perbarui Data";
    formHeader.className = "modal-header border-0 bg-warning text-white p-4";
    formIcon.setAttribute("data-lucide", "pencil-line");
  } else {
    // Mode TAMBAH
    document.getElementById("laptop-form-id").value = "";
    modalTitle.textContent = "Tambah Laptop Baru";
    submitText.textContent = "Simpan Data";
    formHeader.className = "modal-header border-0 bg-success text-white p-4";
    formIcon.setAttribute("data-lucide", "plus-circle");
  }

  if (window.lucide) window.lucide.createIcons();
  laptopFormModalInstance.show();
}

/**
 * Melakukan validasi seluruh input formulir laptop menggunakan JavaScript
 * @returns {boolean} True jika semua input valid, False jika ada yang salah
 */
function validateLaptopForm() {
  let isValid = true;
  const errors = [];

  // Reset kelas is-invalid sebelumnya
  const fields = [
    "laptop-nama", "laptop-brand", "laptop-kategori", 
    "laptop-harga-baru", "laptop-harga-bekas", "laptop-processor", 
    "laptop-gpu", "laptop-ram", "laptop-storage", "laptop-layar", "laptop-deskripsi", "laptop-image-url"
  ];
  
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("is-invalid");
  });

  const nama = document.getElementById("laptop-nama").value.trim();
  const brand = document.getElementById("laptop-brand").value;
  const kategori = document.getElementById("laptop-kategori").value;
  const hargaBaruRaw = document.getElementById("laptop-harga-baru").value;
  const hargaBekasRaw = document.getElementById("laptop-harga-bekas").value;
  const processor = document.getElementById("laptop-processor").value.trim();
  const gpu = document.getElementById("laptop-gpu").value.trim();
  const ram = document.getElementById("laptop-ram").value;
  const storage = document.getElementById("laptop-storage").value;
  const layar = document.getElementById("laptop-layar").value.trim();
  const deskripsi = document.getElementById("laptop-deskripsi").value.trim();

  const urlInput = document.getElementById("laptop-image-url");

  if (nama.length < 3) {
    document.getElementById("laptop-nama").classList.add("is-invalid");
    errors.push("Nama lengkap laptop minimal harus terdiri dari 3 karakter.");
    isValid = false;
  }
  if (!brand) {
    document.getElementById("laptop-brand").classList.add("is-invalid");
    errors.push("Harap pilih brand laptop.");
    isValid = false;
  }
  if (!kategori) {
    document.getElementById("laptop-kategori").classList.add("is-invalid");
    errors.push("Harap pilih kategori klasifikasi laptop.");
    isValid = false;
  }
  
  const hargaBaru = parseInt(hargaBaruRaw);
  if (isNaN(hargaBaru) || hargaBaru <= 0) {
    document.getElementById("laptop-harga-baru").classList.add("is-invalid");
    errors.push("Harga baru harus berupa angka positif yang valid.");
    isValid = false;
  }
  
  const hargaBekas = parseInt(hargaBekasRaw);
  if (isNaN(hargaBekas) || hargaBekas <= 0) {
    document.getElementById("laptop-harga-bekas").classList.add("is-invalid");
    errors.push("Harga bekas harus berupa angka positif yang valid.");
    isValid = false;
  }

  if (!isNaN(hargaBaru) && !isNaN(hargaBekas) && hargaBekas > hargaBaru) {
    document.getElementById("laptop-harga-bekas").classList.add("is-invalid");
    errors.push("Harga bekas tidak logis jika lebih tinggi dari harga laptop baru.");
    isValid = false;
  }

  if (processor.length < 3) {
    document.getElementById("laptop-processor").classList.add("is-invalid");
    errors.push("Spesifikasi Processor minimal harus 3 karakter.");
    isValid = false;
  }

  if (gpu.length < 2) {
    document.getElementById("laptop-gpu").classList.add("is-invalid");
    errors.push("Spesifikasi GPU minimal harus 2 karakter.");
    isValid = false;
  }

  if (!ram) {
    document.getElementById("laptop-ram").classList.add("is-invalid");
    errors.push("Pilih salah satu kapasitas RAM.");
    isValid = false;
  }

  if (!storage) {
    document.getElementById("laptop-storage").classList.add("is-invalid");
    errors.push("Pilih jenis media penyimpanan (Storage).");
    isValid = false;
  }

  if (!layar) {
    document.getElementById("laptop-layar").classList.add("is-invalid");
    errors.push("Spesifikasi panel layar tidak boleh kosong.");
    isValid = false;
  }

  if (deskripsi.length < 10) {
    document.getElementById("laptop-deskripsi").classList.add("is-invalid");
    errors.push("Tulis ulasan deskripsi laptop minimal 10 karakter.");
    isValid = false;
  }

  const urlVal = urlInput.value.trim();
  if (urlVal !== "") {
    try {
      new URL(urlVal);
    } catch (_) {
      urlInput.classList.add("is-invalid");
      errors.push("Format URL gambar langsung tidak valid (harus diawali http:// atau https://).");
      isValid = false;
    }
  }

  if (!isValid) {
    Swal.fire({
      title: "Formulir Tidak Valid",
      html: `
        <div class="text-start alert alert-danger border-0 rounded-3 p-3">
          <p class="fw-bold mb-2">Harap perbaiki beberapa kesalahan berikut:</p>
          <ul class="mb-0 ps-3 small">
            ${errors.map(err => `<li class="mb-1">${err}</li>`).join("")}
          </ul>
        </div>
      `,
      icon: "error",
      confirmButtonColor: "#2563eb",
      confirmButtonText: "Perbaiki Sekarang",
      customClass: {
        popup: "rounded-4"
      }
    });
  }

  return isValid;
}

/**
 * Menghandle pengiriman data form laptop (Tambah / Edit)
 */
async function handleLaptopFormSubmit(e) {
  e.preventDefault();

  // Validasi input form menggunakan JavaScript terlebih dahulu
  if (!validateLaptopForm()) {
    return;
  }

  const id = document.getElementById("laptop-form-id").value;
  const nama = document.getElementById("laptop-nama").value.trim();
  const brand = document.getElementById("laptop-brand").value;
  const kategori = document.getElementById("laptop-kategori").value;
  const hargaBaru = parseInt(document.getElementById("laptop-harga-baru").value);
  const hargaBekas = parseInt(document.getElementById("laptop-harga-bekas").value);
  const processor = document.getElementById("laptop-processor").value.trim();
  const gpu = document.getElementById("laptop-gpu").value.trim();
  const ram = document.getElementById("laptop-ram").value;
  const storage = document.getElementById("laptop-storage").value;
  const layar = document.getElementById("laptop-layar").value.trim();
  const deskripsi = document.getElementById("laptop-deskripsi").value.trim();
  
  const urlInput = document.getElementById("laptop-image-url");

  const submitBtn = document.getElementById("btn-submit-laptop");
  const spinner = document.getElementById("laptop-submit-spinner");
  const submitText = document.getElementById("laptop-submit-text");

  // Tampilkan loading di tombol
  submitBtn.disabled = true;
  spinner.classList.remove("d-none");
  submitText.textContent = id ? "Memperbarui..." : "Menyimpan...";

  try {
    let finalImageUrl = urlInput.value.trim();

    // Jika tidak ada gambar sama sekali, gunakan gambar bawaan unsplash
    if (!finalImageUrl) {
      finalImageUrl = "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=600&auto=format&fit=crop";
    }

    const laptopPayload = {
      nama,
      brand,
      kategori,
      hargaBaru,
      hargaBekas,
      processor,
      gpu,
      ram,
      storage,
      layar,
      deskripsi,
      gambar: finalImageUrl
    };

    if (id) {
      // Edit mode
      await updateLaptop(id, laptopPayload);
      showToast("Berhasil Diperbarui", `Data laptop ${nama} sukses disimpan!`, "success");
    } else {
      // Create mode
      await createLaptop(laptopPayload);
      showToast("Berhasil Ditambahkan", `Laptop ${nama} sukses dimasukkan ke katalog!`, "success");
    }

    // Tutup modal form
    laptopFormModalInstance.hide();
    
    // Refresh list laptop dari database
    fetchLaptops();
  } catch (error) {
    console.error("Gagal memproses pengiriman data laptop:", error);
    showToast("Gagal Menyimpan", "Terjadi kegagalan komunikasi database. Silakan coba kembali.", "error");
  } finally {
    submitBtn.disabled = false;
    spinner.classList.add("d-none");
    submitText.textContent = id ? "Perbarui Data" : "Simpan Data";
  }
}

/**
 * Menghandle klik hapus laptop dari baris tabel admin
 */
async function handleDeleteClick(laptopId) {
  const laptop = allLaptops.find(l => l.id === laptopId);
  if (!laptop) return;

  try {
    const confirmation = await Swal.fire({
      title: "Hapus Laptop?",
      text: `Apakah Anda benar-benar yakin ingin menghapus "${laptop.nama}" secara permanen dari katalog?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus Permanen",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      customClass: {
        popup: "rounded-4",
        confirmButton: "rounded-pill px-4",
        cancelButton: "rounded-pill px-4"
      }
    });

    if (confirmation.isConfirmed) {
      // Tunjukkan loading toast
      Swal.fire({
        title: "Menghapus...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await deleteLaptop(laptopId);
      
      Swal.fire({
        title: "Terhapus",
        text: `Data laptop "${laptop.nama}" berhasil dihapus dari sistem.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });

      // Refresh data
      fetchLaptops();
    }
  } catch (error) {
    console.error("Gagal menghapus laptop:", error);
    showToast("Hapus Gagal", "Terjadi kesalahan saat menghapus data. Silakan hubungi admin sistem.", "error");
  }
}

/**
 * Memperbarui visual Dashboard Admin (Tabel Laptop, dan Statistik cepat)
 */
function updateAdminDashboard() {
  const tableBody = document.getElementById("admin-table-body");
  if (!tableBody) return;

  // 1. Render data ke tabel admin
  renderAdminTable(allLaptops, tableBody, openLaptopFormModal, handleDeleteClick);

  // 2. Render 3 laptop terbaru di dashboard
  renderAdminLatestLaptops();

  // 3. Hitung statistik
  const total = allLaptops.length;
  document.getElementById("stat-total").textContent = total;

  if (total > 0) {
    // Rata-rata harga baru
    const sumPrice = allLaptops.reduce((acc, curr) => acc + (parseInt(curr.hargaBaru) || 0), 0);
    const avgPrice = Math.round(sumPrice / total);
    document.getElementById("stat-avg-price").textContent = formatRupiah(avgPrice);

    // Kategori gaming
    const gamingCount = allLaptops.filter(l => l.kategori && l.kategori.toLowerCase() === "gaming").length;
    document.getElementById("stat-gaming").textContent = gamingCount;

    // Brand terpopuler / terbanyak
    const brandCounts = {};
    allLaptops.forEach((l) => {
      brandCounts[l.brand] = (brandCounts[l.brand] || 0) + 1;
    });
    let topBrand = "-";
    let maxCount = 0;
    for (const [brand, count] of Object.entries(brandCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topBrand = brand;
      }
    }
    document.getElementById("stat-top-brand").textContent = topBrand;
  } else {
    document.getElementById("stat-avg-price").textContent = "Rp 0";
    document.getElementById("stat-gaming").textContent = "0";
    document.getElementById("stat-top-brand").textContent = "-";
  }
}

/**
 * Utilitas untuk memunculkan Toast Alert SweetAlert2
 * @param {string} title 
 * @param {string} text 
 * @param {'success'|'error'|'warning'|'info'|'question'} icon 
 */
function showToast(title, text, icon = "info") {
  Swal.fire({
    title: title,
    text: text,
    icon: icon,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: "rounded-4 shadow"
    },
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  });
}

/**
 * Merender 3 laptop terbaru di Dashboard Admin
 */
function renderAdminLatestLaptops() {
  const container = document.getElementById("admin-latest-laptops-container");
  if (!container) return;

  if (allLaptops.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-4 text-muted">
        <i data-lucide="inbox" class="mb-2" style="width: 32px; height: 32px; display: block; margin: 0 auto;"></i>
        <span class="small">Belum ada data laptop yang diinput.</span>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Urutkan berdasarkan createdAt desc
  const sorted = [...allLaptops].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const latest3 = sorted.slice(0, 3);

  container.innerHTML = latest3.map(laptop => {
    const defaultImg = "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=200&auto=format&fit=crop";
    const imgSrc = laptop.gambar || defaultImg;
    const dateStr = laptop.createdAt ? new Date(laptop.createdAt).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }) : "-";

    return `
      <div class="col-12 col-md-4">
        <div class="card border border-light-subtle rounded-4 shadow-sm h-100 bg-white overflow-hidden transition-all hover-translate-y">
          <div class="position-relative" style="height: 140px;">
            <img src="${imgSrc}" class="w-100 h-100 object-fit-cover" alt="${laptop.nama}" referrerPolicy="no-referrer">
            <span class="position-absolute top-0 start-0 m-2 badge bg-primary text-uppercase text-xs rounded-pill">${laptop.brand}</span>
          </div>
          <div class="card-body p-3 d-flex flex-column justify-content-between">
            <div>
              <h6 class="fw-bold text-dark mb-1 text-truncate" title="${laptop.nama}">${laptop.nama}</h6>
              <p class="text-muted small mb-2 text-truncate-2" style="font-size: 11px; line-height: 1.4; height: 32px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${laptop.deskripsi || "Tidak ada deskripsi spesifik."}
              </p>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-2 border-top pt-2">
              <span class="text-primary fw-bold small">${formatRupiah(laptop.hargaBaru)}</span>
              <span class="text-secondary small" style="font-size: 10px;"><i data-lucide="calendar" class="align-middle me-1" style="width: 10px; height: 10px;"></i>${dateStr}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) window.lucide.createIcons();
}
