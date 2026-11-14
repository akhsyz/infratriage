import { destination } from "@turf/destination";
import { point } from "@turf/helpers";
import type { Cluster, LatLng, Report, VitalPoint } from "./infratriage";
import {
  buildClusters,
  distanceMeters,
  generateSeedReports,
} from "./infratriage";
import { vitals } from "./vitals";

export interface DemoSiteResult {
  vital: VitalPoint;
  site: LatLng;
  distanceToVital: number;
}

// Data klaster seed dasar untuk kalkulasi titik demo deterministik
const BASELINE_SEED_REPORTS = generateSeedReports({ seed: 42 });
const BASELINE_SEED_CLUSTERS = buildClusters(BASELINE_SEED_REPORTS);

/**
 * Memilih satu fasilitas vital NYATA dari lib/vitals.ts (diutamakan rumah sakit)
 * secara deterministik dan menghitung titik demo sekitar 50-80 meter darinya
 * yang JUGA berjarak minimal 100 meter dari pusat setiap klaster seed.
 * Tanpa Math.random, deterministik pada setiap pemanggilan.
 */
export function pickDemoSite(
  vitalsList: VitalPoint[] = vitals,
  seedClusters: Cluster[] = BASELINE_SEED_CLUSTERS
): DemoSiteResult {
  // 1. Prioritaskan rumah sakit terlebih dahulu
  const priorityVitals = [
    ...vitalsList.filter((v) => v.type === "rumah_sakit"),
    ...vitalsList.filter((v) => v.type === "sekolah"),
    ...vitalsList.filter((v) => v.type === "pasar"),
  ];

  // Pastikan klaster demo diabaikan agar tidak mendiskualifikasi titik jangkar demo itu sendiri
  const nonDemoClusters = seedClusters.filter(
    (c) =>
      !c.reports.some(
        (r) => r.reporterId?.startsWith("demo-") || r.id?.startsWith("demo-")
      )
  );

  // Jarak target 65 m (berada di rentang 50-80 m)
  const targetDistanceKm = 0.065;
  // Sudut bantalan (derajat) untuk dicoba secara berurutan
  const bearings = [0, 45, 90, 135, 180, 225, 270, 315];

  for (const vital of priorityVitals) {
    for (const bearing of bearings) {
      const dest = destination(
        point([vital.lng, vital.lat]),
        targetDistanceKm,
        bearing,
        { units: "kilometers" }
      );
      const [lng, lat] = dest.geometry.coordinates;
      const candidatePoint: LatLng = { lat, lng };

      // Jarak akurat ke fasilitas vital
      const distToVital = distanceMeters(candidatePoint, vital);
      if (distToVital < 50 || distToVital > 80) continue;

      // Pastikan minimal 100 m dari pusat klaster non-demo
      const tooCloseToSeed = nonDemoClusters.some(
        (c) => distanceMeters(candidatePoint, c) < 100
      );
      if (tooCloseToSeed) continue;

      return {
        vital,
        site: candidatePoint,
        distanceToVital: distToVital,
      };
    }
  }

  throw new Error("Tidak menemukan titik demo yang memenuhi kriteria jarak.");
}

/**
 * Titik jangkar fasilitas vital dan lokasi demo deterministik tetap.
 * Berdasarkan seed baseline (seed: 42) dan fasilitas vital nyata Yogya:
 * Menghasilkan titik di dekat Klinik Adhiwarga PKBI DIY (jarak 65 m).
 */
export const DEMO_ANCHOR_SITE: DemoSiteResult = pickDemoSite(
  vitals,
  BASELINE_SEED_CLUSTERS
);

/**
 * Menghasilkan n laporan demo:
 * - kategori: lubang
 * - keparahan: 2
 * - kelas jalan: arteri
 * - tanpa insiden
 * - createdAt: now
 * - reporterId unik ("demo-1" s/d "demo-n")
 * - id unik ("demo-rep-1" s/d "demo-rep-n")
 * - koordinat di sekitar titik demo (deterministik, selisih ~1-2 meter)
 */
export function buildDemoReports(
  n: number,
  now: Date,
  site: LatLng = DEMO_ANCHOR_SITE.site
): Report[] {
  const reports: Report[] = [];
  const createdAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();

  for (let i = 1; i <= n; i++) {
    // Offset deterministik sangat kecil (~1.5 meter dari titik pusat)
    const angle = (i * 36) * (Math.PI / 180);
    const radiusMeters = 1.5;
    const latOffset = (Math.cos(angle) * radiusMeters) / 111320;
    const lngOffset = (Math.sin(angle) * radiusMeters) / 110290;

    reports.push({
      id: `demo-rep-${i}`,
      reporterId: `demo-${i}`,
      category: "lubang",
      severity: 2,
      roadClass: "arteri",
      incident: false,
      createdAt,
      lat: site.lat + latOffset,
      lng: site.lng + lngOffset,
    });
  }

  return reports;
}
