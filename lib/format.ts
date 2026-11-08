/**
 * Helper pemformatan mata uang Rupiah dan jarak geospasial
 * untuk UI TEPAT.
 */

/**
 * Format angka ke representasi Rupiah (contoh: "Rp 100.000.000" atau "Rp 0").
 * Nilai dibulatkan ke bilangan bulat terdekat.
 */
export function formatRupiah(
  n: number,
  options?: { prefix?: boolean }
): string {
  if (!Number.isFinite(n)) {
    return options?.prefix === false ? "0" : "Rp 0";
  }

  const prefix = options?.prefix !== false;
  const rounded = Math.round(n);
  const isNegative = rounded < 0;
  const absStr = Math.abs(rounded).toString();
  const formatted = absStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (!prefix) {
    return isNegative ? `-${formatted}` : formatted;
  }

  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

/**
 * Format teks input anggaran menjadi format ribuan dengan titik (contoh: "100.000.000").
 * Aman untuk event handler onChange input teks:
 * - Menghapus semua karakter non-digit kecuali tanda minus di awal
 * - Menghapus leading zero berlebih ("05000" -> "5.000", tetapi "0" tetap "0")
 * - Mengembalikan string kosong bila input kosong atau tidak mengandung digit
 */
export function formatRupiahInput(value: string | number): string {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const str =
    typeof value === "number" ? Math.round(value).toString() : String(value);

  const trimmed = str.trim();
  const isNegative = /^\s*-\s*Rp|^\s*Rp\s*-|^\s*-/.test(trimmed);
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  // Hilangkan leading zeros kecuali jika hanya ada angka 0 tunggal
  const cleaned = digits.replace(/^0+(?=\d)/, "");
  const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return isNegative && cleaned !== "0" ? `-${formatted}` : formatted;
}

/**
 * Mengubah string Rupiah atau angka terformat menjadi nilai number bulat (integer).
 * Contoh: "Rp 100.000.000" -> 100000000, "50.000" -> 50000.
 * Mengembalikan 0 bila input kosong atau tidak valid.
 */
export function parseRupiah(value: string | number): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : 0;
  }

  if (!value || typeof value !== "string") {
    return 0;
  }

  const trimmed = value.trim();
  const isNegative = /^\s*-\s*Rp|^\s*Rp\s*-|^\s*-/.test(trimmed);
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return 0;
  }

  const num = parseInt(digits, 10);
  if (!Number.isFinite(num)) {
    return 0;
  }

  return isNegative ? -num : num;
}

/**
 * Format jarak dalam meter (m) atau kilometer (km).
 * - Jarak < 1000 meter ditampilkan dalam "m" bulat (contoh: "150 m", "0 m").
 * - Jarak >= 1000 meter ditampilkan dalam "km" dengan presisi 1 desimal (contoh: "1.5 km", "2 km").
 * - Nilai negatif atau non-finite diformat sebagai "0 m".
 */
export function formatDistance(m: number): string {
  if (!Number.isFinite(m) || m <= 0) {
    return "0 m";
  }

  const roundedM = Math.round(m);
  if (roundedM < 1000) {
    return `${roundedM} m`;
  }

  const km = m / 1000;
  // 1 desimal jika bukan bilangan bulat
  const kmFixed = (Math.round(km * 10) / 10).toFixed(1).replace(/\.0$/, "");
  return `${kmFixed} km`;
}

