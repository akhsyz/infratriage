import type { Category, RoadClass, Severity, Weights } from "./types";

/**
 * SEMUA ANGKA DI FILE INI ADALAH ASUMSI AWAL, BUKAN STANDAR RESMI.
 * Belum divalidasi dengan dinas/lapangan. Tulis begitu di proposal.
 *
 * Urutan bobot mengikuti pola studi AHP prioritas penanganan jalan di Indonesia
 * (kondisi kerusakan paling tinggi, lalu lalu lintas/fungsi jalan), tetapi angka
 * persisnya hasil penyetelan sendiri. Bobot bisa diubah admin di UI.
 */
export const DEFAULT_WEIGHTS: Weights = {
  bahaya: 0.3,
  kelas: 0.2,
  vital: 0.2,
  kerumunan: 0.2,
  usia: 0.1,
};

/** Skor bahaya dasar per kategori dan tingkat keparahan (0-100). */
export const DAMAGE_BASE: Record<Category, Record<Severity, number>> = {
  lubang: { 1: 45, 2: 70, 3: 90 },
  drainase: { 1: 30, 2: 50, 3: 65 },
  lampu_jalan: { 1: 20, 2: 35, 3: 55 },
  trotoar: { 1: 10, 2: 20, 3: 30 },
};

/** Tambahan skor bahaya bila ada laporan insiden (hasil akhir dibatasi 100). */
export const INCIDENT_PENALTY = 15;

export const ROAD_CLASS_SCORE: Record<RoadClass, number> = {
  arteri: 100,
  kolektor: 70,
  lokal: 40,
};
export const ROAD_CLASS_RANK: Record<RoadClass, number> = {
  lokal: 0,
  kolektor: 1,
  arteri: 2,
};

/** Kedekatan fasilitas vital: <200 m = 100, 200-500 m = 75, >500 m = 30. */
export const VITAL_NEAR_M = 200;
export const VITAL_MID_M = 500;
export const VITAL_NEAR_SCORE = 100;
export const VITAL_MID_SCORE = 75;
export const VITAL_FAR_SCORE = 30;

/** 10 pelapor unik = skor kerumunan penuh. */
export const CROWD_POINTS_PER_REPORTER = 10;
/** Laporan yang belum ditangani 30 hari = skor usia penuh. */
export const AGING_FULL_DAYS = 30;

/** Radius penggabungan klaster per kategori (meter). Diatur per kategori. */
export const CLUSTER_RADIUS_METERS: Record<Category, number> = {
  lubang: 20,
  drainase: 35,
  lampu_jalan: 15,
  trotoar: 25,
};

/** Ambang warna pin, berdasarkan skor yang dibulatkan (sama dengan angka di layar). */
export const PRIORITY_THRESHOLDS = { kritis: 80, tinggi: 50 } as const;

/**
 * Tabel estimasi biaya (Rupiah). ASUMSI ILUSTRASI, bukan standar harga satuan dinas.
 */
export const COST_TABLE: Record<Category, Record<Severity, number>> = {
  lubang: { 1: 3_000_000, 2: 7_500_000, 3: 15_000_000 },
  drainase: { 1: 4_000_000, 2: 9_000_000, 3: 20_000_000 },
  lampu_jalan: { 1: 3_000_000, 2: 4_500_000, 3: 7_000_000 },
  trotoar: { 1: 5_000_000, 2: 12_000_000, 3: 25_000_000 },
};

/** Satuan DP knapsack. Biaya dibulatkan ke atas, anggaran ke bawah (konservatif). */
export const KNAPSACK_COST_UNIT = 100_000;

export const CATEGORY_LABEL: Record<Category, string> = {
  lubang: "Jalan berlubang",
  drainase: "Drainase tersumbat",
  lampu_jalan: "Lampu jalan mati",
  trotoar: "Trotoar rusak",
};
export const SEVERITY_LABEL: Record<Severity, string> = {
  1: "ringan",
  2: "sedang",
  3: "berat",
};

export function estimateCost(category: Category, severity: Severity): number {
  return COST_TABLE[category][severity];
}
