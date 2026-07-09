/**
 * Format angka menjadi format mata uang Rupiah
 * @param {number|string} number 
 * @returns {string}
 */
export function formatRupiah(number) {
  if (number === undefined || number === null || number === "") return "Tidak tersedia";
  const parsed = typeof number === "string" ? parseInt(number.replace(/[^0-9]/g, "")) : number;
  if (isNaN(parsed)) return "Tidak tersedia";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(parsed);
}

/**
 * Mendapatkan class warna badge sesuai dengan brand laptop
 * @param {string} brand 
 * @returns {string}
 */
export function getBrandBadgeClass(brand) {
  if (!brand) return "bg-secondary text-white";
  const b = brand.toLowerCase();
  if (b.includes("asus") || b.includes("rog")) return "bg-dark text-white";
  if (b.includes("lenovo") || b.includes("thinkpad")) return "bg-primary text-white";
  if (b.includes("apple") || b.includes("mac")) return "bg-secondary text-white";
  if (b.includes("hp")) return "bg-info text-dark";
  if (b.includes("acer") || b.includes("predator")) return "bg-success text-white";
  if (b.includes("msi")) return "bg-danger text-white";
  if (b.includes("dell")) return "bg-warning text-dark";
  return "bg-secondary text-white";
}

/**
 * Mendapatkan class warna badge sesuai dengan kategori laptop
 * @param {string} category 
 * @returns {string}
 */
export function getCategoryBadgeClass(category) {
  if (!category) return "bg-secondary-subtle text-secondary";
  const c = category.toLowerCase();
  if (c.includes("gaming")) return "bg-danger-subtle text-danger";
  if (c.includes("productivity") || c.includes("kerja")) return "bg-success-subtle text-success";
  if (c.includes("creator") || c.includes("desain")) return "bg-purple-subtle text-purple";
  if (c.includes("business") || c.includes("bisnis")) return "bg-primary-subtle text-primary";
  if (c.includes("student") || c.includes("sekolah")) return "bg-warning-subtle text-warning";
  return "bg-secondary-subtle text-secondary";
}
