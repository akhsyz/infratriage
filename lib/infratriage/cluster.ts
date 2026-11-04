import { CLUSTER_RADIUS_METERS } from "./config";
import { assertLatLng, centroidOf, distanceMeters } from "./geo";
import type { Category, Cluster, Report } from "./types";

export type IngestAction = "created" | "merged" | "ignored";

export interface AddResult {
  clusters: Cluster[];
  clusterId: string;
  action: IngestAction;
}

/**
 * Cari klaster aktif yang akan menyerap laporan.
 * Aturan: kategori sama, status bukan "resolved", jarak ke titik PUSAT klaster
 * <= radius kategori. Bila ada beberapa, ambil yang terdekat.
 */
export function findHostCluster(
  clusters: Cluster[],
  report: Report,
  radii: Record<Category, number> = CLUSTER_RADIUS_METERS,
): { cluster: Cluster; meters: number } | null {
  let best: { cluster: Cluster; meters: number } | null = null;
  for (const c of clusters) {
    if (c.status === "resolved" || c.category !== report.category) continue;
    const m = distanceMeters(c, report);
    if (m <= radii[report.category] && (best === null || m < best.meters)) {
      best = { cluster: c, meters: m };
    }
  }
  return best;
}

/** Murni dan immutable: mengembalikan array klaster baru. */
export function addReport(
  clusters: Cluster[],
  report: Report,
  radii: Record<Category, number> = CLUSTER_RADIUS_METERS,
): AddResult {
  assertLatLng(report);

  // Idempoten: laporan dengan id yang sama tidak dihitung dua kali (double submit).
  const existing = clusters.find((c) => c.reports.some((r) => r.id === report.id));
  if (existing) return { clusters, clusterId: existing.id, action: "ignored" };

  const host = findHostCluster(clusters, report, radii);
  if (host) {
    const reports = [...host.cluster.reports, report];
    const center = centroidOf(reports);
    const updated: Cluster = { ...host.cluster, ...center, reports };
    return {
      clusters: clusters.map((c) => (c.id === updated.id ? updated : c)),
      clusterId: updated.id,
      action: "merged",
    };
  }

  const created: Cluster = {
    id: `c-${report.id}`,
    category: report.category,
    status: "pending",
    lat: report.lat,
    lng: report.lng,
    reports: [report],
  };
  return { clusters: [...clusters, created], clusterId: created.id, action: "created" };
}
