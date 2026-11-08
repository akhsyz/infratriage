import { DEFAULT_WEIGHTS, type Weights } from "./infratriage";

export { DEFAULT_WEIGHTS, type Weights };

export const WEIGHT_KEYS: (keyof Weights)[] = [
  "bahaya",
  "kelas",
  "vital",
  "kerumunan",
  "usia",
];

/**
 * Menskalakan 4 bobot lain secara proporsional sehingga jumlah selalu 1.
 * - Nilai dibatasi dalam rentang 0..1
 * - Jika sisa bobot lain semua bernilai nol, bagi rata sisa bobot ke 4 kunci lainnya
 * - Mengembalikan objek Weights baru (pure function, tidak memutasi input)
 */
export function setWeight(
  weights: Weights,
  key: keyof Weights,
  value: number
): Weights {
  const numeric = Number.isFinite(value) ? value : 0;
  const val = Math.max(0, Math.min(1, numeric));

  const otherKeys = WEIGHT_KEYS.filter((k) => k !== key);
  const otherSum = otherKeys.reduce((sum, k) => {
    const w = weights[k];
    return sum + (Number.isFinite(w) && w > 0 ? w : 0);
  }, 0);
  const remaining = 1 - val;

  const next: Weights = { ...weights, [key]: val };

  if (otherSum > 0) {
    for (const k of otherKeys) {
      const w = weights[k];
      const validW = Number.isFinite(w) && w > 0 ? w : 0;
      next[k] = (validW / otherSum) * remaining;
    }
  } else {
    const split = remaining / otherKeys.length;
    for (const k of otherKeys) {
      next[k] = split;
    }
  }

  return next;
}
