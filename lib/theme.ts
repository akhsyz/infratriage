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
    text: "#1F2933",
  },
  sedang: {
    marker: "#F4C430",
    text: "#1F2933",
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
 * Aksen tunggal aplikasi (Teal DESIGN.md v3).
 */
export const ACCENT = "#0B7A6D";

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
 * Tile peta dan atribusi.
 * Bila process.env.NEXT_PUBLIC_CARTO_KEY disetel, gunakan CartoDB Positron berotentikasi.
 * Jika tidak ada key, secara otomatis jatuh ke OpenStreetMap (OSM) standar agar aplikasi
 * tetap berfungsi tanpa key.
 */
const cartoKey =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CARTO_KEY
    ? process.env.NEXT_PUBLIC_CARTO_KEY
    : "";

export const MAP_TILE = cartoKey
  ? {
      url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`,
      attribution: "&copy; OpenStreetMap contributors, &copy; CARTO",
    }
  : {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
    };

/**
 * Token warna Hero Gelap (Pita Atas Dashboard) sesuai docs/DESIGN.md v3.1.
 */
export const HERO_THEME = {
  bg: "#0B2231",
  accent: "#2DD4BF",
  text: "#FFFFFF",
  muted: "#CBD5E1",
  border: "rgba(255, 255, 255, 0.12)",
  cardBg: "rgba(255, 255, 255, 0.08)",
  cardBorder: "rgba(255, 255, 255, 0.14)",
  chipBg: "rgba(45, 212, 191, 0.14)",
  badgeBg: "rgba(251, 191, 36, 0.12)",
  badgeBorder: "rgba(251, 191, 36, 0.40)",
  badgeText: "#FBBF24",
  kritisOnDark: "#FF7875",
  kritisChipDark: "rgba(255, 120, 117, 0.16)",
  navActive: "#FFFFFF",
  navInactive: "#CBD5E1",
  navActiveLine: "#2DD4BF",
  navHoverBg: "rgba(255, 255, 255, 0.08)",
} as const;

export const KRITIS_ON_DARK = HERO_THEME.kritisOnDark;

