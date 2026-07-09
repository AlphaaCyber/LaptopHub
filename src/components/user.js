import { 
  formatRupiah, 
  getBrandBadgeClass, 
  getCategoryBadgeClass 
} from "../utils/helpers.js";

/**
 * Merender daftar kartu laptop di Katalog User
 * @param {Array<Object>} laptops 
 * @param {HTMLElement} container 
 * @param {function} onDetailClick 
 */
export function renderLaptopCards(laptops, container, onDetailClick) {
  if (!container) return;

  if (laptops.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="card border-0 bg-light p-5 shadow-sm rounded-4">
          <i class="text-secondary mb-3" data-lucide="package-search" style="width: 48px; height: 48px; margin: 0 auto;"></i>
          <h5 class="text-dark fw-bold">Laptop Tidak Ditemukan</h5>
          <p class="text-muted small">Coba ubah kata kunci pencarian atau sesuaikan kombinasi filter spesifikasi Anda.</p>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = laptops
    .map((laptop) => {
      const defaultImg = "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=600&auto=format&fit=crop";
      const imgSrc = laptop.gambar || defaultImg;
      const brandBadgeClass = getBrandBadgeClass(laptop.brand);
      const categoryBadgeClass = getCategoryBadgeClass(laptop.kategori);

      return `
        <div class="col-12 col-md-6 col-lg-4 mb-4">
          <div class="card h-100 border-0 shadow-sm hover-card rounded-4 overflow-hidden d-flex flex-column" id="card-${laptop.id}">
            <!-- Badge Brand & Kategori -->
            <div class="position-absolute top-0 start-0 m-3 d-flex flex-column gap-1" style="z-index: 2;">
              <span class="badge ${brandBadgeClass} rounded-pill px-3 py-2 text-uppercase shadow-sm fw-bold">${laptop.brand}</span>
              <span class="badge ${categoryBadgeClass} rounded-pill px-3 py-1 text-uppercase shadow-sm fw-semibold">${laptop.kategori || 'Katalog'}</span>
            </div>
            
            <!-- Gambar Laptop -->
            <div class="card-img-wrapper position-relative bg-light overflow-hidden" style="height: 200px;">
              <img src="${imgSrc}" class="card-img-top w-100 h-100 object-fit-cover" alt="${laptop.nama}" referrerPolicy="no-referrer">
            </div>

            <!-- Detail Isi Kartu -->
            <div class="card-body p-4 d-flex flex-column flex-grow-1">
              <h5 class="card-title fw-bold text-dark text-truncate mb-2" title="${laptop.nama}">${laptop.nama}</h5>
              
              <!-- Tag Spesifikasi Utama -->
              <div class="d-flex flex-wrap gap-1 mb-3">
                <span class="badge bg-light text-dark border rounded-pill px-2 py-1 small fw-medium"><i class="align-middle me-1" data-lucide="cpu" style="width:12px;height:12px;"></i>${laptop.processor}</span>
                <span class="badge bg-light text-dark border rounded-pill px-2 py-1 small fw-medium"><i class="align-middle me-1" data-lucide="cpu" style="width:12px;height:12px;"></i>${laptop.gpu}</span>
                <span class="badge bg-light text-dark border rounded-pill px-2 py-1 small fw-medium"><i class="align-middle me-1" data-lucide="hard-drive" style="width:12px;height:12px;"></i>RAM ${laptop.ram}</span>
                <span class="badge bg-light text-dark border rounded-pill px-2 py-1 small fw-medium"><i class="align-middle me-1" data-lucide="hard-drive" style="width:12px;height:12px;"></i>${laptop.storage}</span>
                <span class="badge bg-light text-dark border rounded-pill px-2 py-1 small fw-medium"><i class="align-middle me-1" data-lucide="monitor" style="width:12px;height:12px;"></i>Layar ${laptop.layar || laptop.ukuranLayar || "14"}"</span>
              </div>

              <!-- Deskripsi Singkat -->
              <p class="card-text text-muted small text-line-clamp-2 flex-grow-1 mb-3">
                ${laptop.deskripsi || 'Tidak ada deskripsi spesifik.'}
              </p>

              <hr class="text-muted opacity-25 my-3">

              <!-- Info Harga -->
              <div class="row align-items-center mb-3">
                <div class="col-6 border-end border-light-subtle">
                  <span class="text-muted d-block small" style="font-size: 11px;">Harga Baru:</span>
                  <span class="text-primary fw-bold fs-6">${formatRupiah(laptop.hargaBaru)}</span>
                </div>
                <div class="col-6 ps-3">
                  <span class="text-muted d-block small" style="font-size: 11px;">Harga Bekas:</span>
                  <span class="text-success fw-bold fs-6">${formatRupiah(laptop.hargaBekas)}</span>
                </div>
              </div>

              <!-- Tombol Detail -->
              <button class="btn btn-outline-primary w-full rounded-pill py-2 btn-detail shadow-sm mt-auto" data-id="${laptop.id}">
                <i class="align-middle me-1" data-lucide="eye" style="width:16px;height:16px;"></i> Detail Spesifikasi
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // Tambahkan event listener untuk detail buttons
  container.querySelectorAll(".btn-detail").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const laptopId = btn.getAttribute("data-id");
      const selectedLaptop = laptops.find((l) => l.id === laptopId);
      if (selectedLaptop && onDetailClick) {
        onDetailClick(selectedLaptop);
      }
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Menampilkan loading spinner
 * @param {HTMLElement} container 
 */
export function showLoadingSpinner(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Memuat...</span>
      </div>
      <p class="text-muted mt-3 small">Menghubungkan ke server database...</p>
    </div>
  `;
}
