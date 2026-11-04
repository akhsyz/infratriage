import type { PriorityLevel, VitalType } from "./infratriage/types";

/**
 * Warna dan teks marker peta per level prioritas.
 * Nilai token mengacu pada docs/DESIGN.md.
 */
export const LEVEL_COLOR: Record<
  PriorityLevel,
  { marker: string; text: string }
> = {
  kritis: {
    marker: "#D92D3A",
    text: "#FFFFFF",
  },
  tinggi: {
    marker: "#F28C28",
    text: "#18191C",
  },
  sedang: {
    marker: "#F4C430",
    text: "#18191C",
  },
} as const;

/**
 * Warna badge (bg dan teks) per level prioritas.
 * Nilai token mengacu pada docs/DESIGN.md.
 */
export const LEVEL_BADGE: Record<
  PriorityLevel,
  { bg: string; text: string; ink: string }
> = {
  kritis: {
    bg: "#FDE8EA",
    text: "#A4121F",
    ink: "#A4121F",
  },
  tinggi: {
    bg: "#FFEFD9",
    text: "#9A4A00",
    ink: "#9A4A00",
  },
  sedang: {
    bg: "#FFF6CC",
    text: "#7A5B00",
    ink: "#7A5B00",
  },
} as const;

/**
 * Warna fasilitas vital untuk layer peta.
 * rumah_sakit (#2563EB - kotak), sekolah (#334155 - lingkaran), pasar (#8B5E34 - belah ketupat).
 */
export const VITAL_COLOR: Record<VitalType, string> = {
  rumah_sakit: "#2563EB",
  sekolah: "#334155",
  pasar: "#8B5E34",
} as const;

/**
 * Simbol/bentuk fasilitas vital di peta sesuai docs/DESIGN.md.
 */
export const VITAL_SHAPE: Record<VitalType, "square" | "circle" | "diamond"> = {
  rumah_sakit: "square",
  sekolah: "circle",
  pasar: "diamond",
} as const;

/**
 * Aksen tunggal aplikasi (Teal Slate).
 */
export const ACCENT = "#0D7377";

/**
 * Aturan tampilan marker berdasarkan status klaster.
 * resolved = pudar (opacity 0.4), scheduled = garis putus-putus.
 */
export const CLUSTER_STATUS_STYLE = {
  resolved: {
    opacity: 0.4,
    fillOpacity: 0.3,
  },
  scheduled: {
    dashArray: "4 2",
    weight: 3,
  },
} as const;

/**
 * Tile peta CartoDB Positron (abu netral, terang) dan atribusi.
 */
export const MAP_TILE = {
  url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
} as const;

