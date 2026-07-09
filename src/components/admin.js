import { 
  formatRupiah, 
  getBrandBadgeClass 
} from "../utils/helpers.js";

/**
 * Merender tabel laptop di Dashboard Admin
 * @param {Array<Object>} laptops 
 * @param {HTMLElement} container 
 * @param {function} onEditClick 
 * @param {function} onDeleteClick 
 */
export function renderAdminTable(laptops, container, onEditClick, onDeleteClick) {
  if (!container) return;

  if (laptops.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5">
          <i class="text-secondary mb-3" data-lucide="inbox" style="width: 48px; height: 48px; margin: 0 auto; display: block;"></i>
          <h5 class="text-dark fw-bold">Belum Ada Data Laptop</h5>
          <p class="text-muted small">Klik tombol "Tambah Laptop" untuk memasukkan katalog baru ke sistem.</p>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = laptops
    .map((laptop, index) => {
      const defaultImg = "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=200&auto=format&fit=crop";
      const imgSrc = laptop.gambar || defaultImg;
      const brandBadgeClass = getBrandBadgeClass(laptop.brand);

      return `
        <tr>
          <td class="align-middle text-center">${index + 1}</td>
          <td class="align-middle" style="width: 80px;">
            <div class="rounded overflow-hidden bg-light border" style="width: 60px; height: 45px;">
              <img src="${imgSrc}" class="w-100 h-100 object-fit-cover" alt="Thumb" referrerPolicy="no-referrer">
            </div>
          </td>
          <td class="align-middle">
            <span class="fw-bold text-dark d-block text-truncate" style="max-width: 200px;">${laptop.nama}</span>
            <span class="badge ${brandBadgeClass} rounded-pill px-2 py-1 text-uppercase text-xs" style="font-size: 10px;">${laptop.brand}</span>
          </td>
          <td class="align-middle text-capitalize text-muted small">${laptop.kategori || "Katalog"}</td>
          <td class="align-middle">
            <div class="d-flex flex-column gap-1 text-xs" style="font-size: 11px;">
              <span class="badge bg-light text-dark border-0 rounded text-start px-2 py-1"><strong class="text-secondary">CPU:</strong> ${laptop.processor}</span>
              <span class="badge bg-light text-dark border-0 rounded text-start px-2 py-1"><strong class="text-secondary">RAM/ROM:</strong> ${laptop.ram} / ${laptop.storage}</span>
            </div>
          </td>
          <td class="align-middle">
            <div class="small" style="font-size: 12px;">
              <div class="text-primary"><strong class="text-muted">Baru:</strong> ${formatRupiah(laptop.hargaBaru)}</div>
              <div class="text-success"><strong class="text-muted">Bekas:</strong> ${formatRupiah(laptop.hargaBekas)}</div>
            </div>
          </td>
          <td class="align-middle text-center">
            <div class="btn-group btn-group-sm rounded-pill overflow-hidden shadow-sm">
              <button class="btn btn-warning btn-edit text-white" data-id="${laptop.id}" title="Edit Laptop">
                <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
              </button>
              <button class="btn btn-danger btn-delete" data-id="${laptop.id}" title="Hapus Laptop">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  // Tambahkan event handler untuk tombol Edit
  container.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const laptopId = btn.getAttribute("data-id");
      const selected = laptops.find((l) => l.id === laptopId);
      if (selected && onEditClick) {
        onEditClick(selected);
      }
    });
  });

  // Tambahkan event handler untuk tombol Delete
  container.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const laptopId = btn.getAttribute("data-id");
      if (onDeleteClick) {
        onDeleteClick(laptopId);
      }
    });
  });

  if (window.lucide) window.lucide.createIcons();
}
