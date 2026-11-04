import { addReport } from "./cluster";
import type { Category, Cluster, LatLng, Report, RoadClass, Severity, VitalPoint } from "./types";

/** Tampilkan teks ini di UI, proposal, dan video. */
export const SEED_DISCLAIMER =
  "Data simulasi (sintetis) untuk demonstrasi. Bukan data laporan nyata.";

export function createRng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, options: [T, number][]): T {
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of options) {
    r -= w;
    if (r <= 0) return v;
  }
  return options[options.length - 1][0];
}

/** Pusat peta contoh: sekitar Kota Yogyakarta. Ganti sesuai kebutuhan. */
export const DEFAULT_CENTER: LatLng = { lat: -7.7956, lng: 110.3695 };

export interface SeedOptions {
  seed?: number;
  /** jumlah laporan yang dihasilkan (kira-kira) */
  count?: number;
  center?: LatLng;
  /** sebaran dalam derajat dari pusat */
  spread?: number;
  now?: Date;
}

export function generateSeedReports(opts: SeedOptions = {}): Report[] {
  const { seed = 42, count = 150, center = DEFAULT_CENTER, spread = 0.03, now = new Date() } = opts;
  const rng = createRng(seed);
  const reports: Report[] = [];
  let id = 0;

  while (reports.length < count) {
    const lat = center.lat + (rng() * 2 - 1) * spread;
    const lng = center.lng + (rng() * 2 - 1) * spread;
    const category = pick<Category>(rng, [
      ["lubang", 5],
      ["drainase", 2],
      ["lampu_jalan", 2],
      ["trotoar", 1],
    ]);
    const severity = pick<Severity>(rng, [
      [1, 3],
      [2, 4],
      [3, 2],
    ]);
    const roadClass = pick<RoadClass>(rng, [
      ["lokal", 5],
      ["kolektor", 3],
      ["arteri", 2],
    ]);
    const perSite = 1 + Math.floor(rng() * rng() * 12);
    for (let k = 0; k < perSite && reports.length < count; k++) {
      id++;
      const ageMs = rng() * 45 * 86_400_000;
      reports.push({
        id: `seed-${id}`,
        reporterId: `u${Math.floor(rng() * 80)}`,
        // jitter sekitar +/- 8 m
        lat: lat + (rng() * 2 - 1) * 0.00007,
        lng: lng + (rng() * 2 - 1) * 0.00007,
        category,
        severity,
        roadClass,
        createdAt: new Date(now.getTime() - ageMs).toISOString(),
        incident: rng() < 0.05,
      });
    }
  }
  return reports.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/** Fasilitas vital PLACEHOLDER. Untuk demo nyata, ambil dari OpenStreetMap (scripts/fetch-vitals.mjs). */
export function generateSyntheticVitals(opts: SeedOptions = {}): VitalPoint[] {
  const { seed = 42, center = DEFAULT_CENTER, spread = 0.03 } = opts;
  const rng = createRng(seed + 1000);
  const types: VitalPoint["type"][] = ["rumah_sakit", "sekolah", "pasar"];
  const out: VitalPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const type = types[i % 3];
    out.push({
      id: `vital-${i + 1}`,
      name: `Fasilitas contoh ${i + 1} (sintetis)`,
      type,
      lat: center.lat + (rng() * 2 - 1) * spread,
      lng: center.lng + (rng() * 2 - 1) * spread,
    });
  }
  return out;
}

/** Jalankan semua laporan lewat aturan klaster, berurutan menurut waktu. */
export function buildClusters(reports: Report[]): Cluster[] {
  const ordered = [...reports].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  let clusters: Cluster[] = [];
  for (const r of ordered) clusters = addReport(clusters, r).clusters;
  return clusters;
}
