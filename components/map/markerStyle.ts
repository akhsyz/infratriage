import { LEVEL_COLOR, CLUSTER_STATUS_STYLE } from "../../lib/theme";
import type { ClusterStatus, PriorityLevel, VitalType } from "../../lib/infratriage/types";
import { VITAL_COLOR, VITAL_SHAPE } from "../../lib/theme";

/**
 * Batas radius marker klaster (dalam pixel):
 * Diameter berkisar antara 12 px (radius 6 px) hingga 40 px (radius 20 px).
 */
export const MIN_MARKER_RADIUS = 6;
export const MAX_MARKER_RADIUS = 20;

/**
 * Menghitung radius marker klaster berdasarkan jumlah pelapor unik.
 * Menskalakan secara halus dari 6 px (1 pelapor) hingga 20 px (pelapor banyak).
 */
export function getMarkerRadius(reportersCount: number): number {
  if (reportersCount <= 1) {
    return MIN_MARKER_RADIUS;
  }
  // Formula penskalaan berbasis logaritmik agar pertumbuhan ukuran wajar
  const scaled = MIN_MARKER_RADIUS + Math.log2(reportersCount) * 4.2;
  const clamped = Math.min(MAX_MARKER_RADIUS, Math.max(MIN_MARKER_RADIUS, scaled));
  return Math.round(clamped);
}

/**
 * Menentukan apakah angka jumlah pelapor perlu ditampilkan di dalam marker.
 * Angka hanya muat pada klaster besar (radius >= 11 px atau diameter >= 22 px).
 */
export function shouldShowReporterCount(radius: number): boolean {
  return radius >= 11;
}

/**
 * Mengambil warna background marker dan warna teks kontrasnya sesuai level prioritas.
 */
export function getMarkerColors(level: PriorityLevel): { marker: string; text: string } {
  const color = LEVEL_COLOR[level];
  if (!color) {
    return LEVEL_COLOR.sedang;
  }
  return color;
}

/**
 * Mengambil gaya visual marker berdasarkan status klaster:
 * - resolved: pudar (opacity 0.4)
 * - scheduled: garis tepi putus-putus (dashed)
 * - pending: normal (solid)
 */
export function getMarkerStatusStyle(status: ClusterStatus): {
  opacity: number;
  fillOpacity: number;
  borderStyle: "solid" | "dashed";
  dashArray?: string;
  isResolved: boolean;
  isScheduled: boolean;
} {
  if (status === "resolved") {
    return {
      opacity: CLUSTER_STATUS_STYLE.resolved.opacity,
      fillOpacity: CLUSTER_STATUS_STYLE.resolved.fillOpacity,
      borderStyle: "solid",
      isResolved: true,
      isScheduled: false,
    };
  }

  if (status === "scheduled") {
    return {
      opacity: 1,
      fillOpacity: 1,
      borderStyle: "dashed",
      dashArray: CLUSTER_STATUS_STYLE.scheduled.dashArray,
      isResolved: false,
      isScheduled: true,
    };
  }

  return {
    opacity: 1,
    fillOpacity: 1,
    borderStyle: "solid",
    isResolved: false,
    isScheduled: false,
  };
}

/**
 * Mengambil bentuk dan warna fasilitas vital untuk penanda layer.
 */
export function getVitalStyle(type: VitalType): {
  color: string;
  shape: "square" | "circle" | "diamond";
} {
  return {
    color: VITAL_COLOR[type] ?? VITAL_COLOR.sekolah,
    shape: VITAL_SHAPE[type] ?? "circle",
  };
}
