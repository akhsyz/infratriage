import L from "leaflet";
import {
  getMarkerColors,
  getMarkerRadius,
  getMarkerStatusStyle,
  getVitalStyle,
  shouldShowReporterCount,
} from "./markerStyle";
import type { ClusterStatus, PriorityLevel, VitalType } from "../../lib/infratriage/types";
import { ACCENT } from "../../lib/theme";

/**
 * Membuat Leaflet DivIcon untuk marker klaster dengan gaya sesuai level,
 * status (pending/scheduled/resolved), jumlah pelapor, dan sorotan terpilih/anggaran.
 */
export function createClusterIcon({
  level,
  status,
  uniqueReporters,
  isSelected,
  isHighlighted,
}: {
  level: PriorityLevel;
  status: ClusterStatus;
  uniqueReporters: number;
  isSelected: boolean;
  isHighlighted: boolean;
}): L.DivIcon {
  const radius = getMarkerRadius(uniqueReporters);
  const diameter = radius * 2;
  const colors = getMarkerColors(level);
  const statusStyle = getMarkerStatusStyle(status);
  const showCount = shouldShowReporterCount(radius);

  const styles: string[] = [
    `width: ${diameter}px`,
    `height: ${diameter}px`,
    `background-color: ${colors.marker}`,
    `color: ${colors.text}`,
    `border: 2.5px ${statusStyle.borderStyle} #FFFFFF`,
    `border-radius: 50%`,
    `display: flex`,
    `align-items: center`,
    `justify-content: center`,
    `font-family: var(--font-jakarta), system-ui, sans-serif`,
    `font-weight: 700`,
    `font-size: ${diameter >= 30 ? "13px" : "11px"}`,
    `font-variant-numeric: tabular-nums`,
    `box-sizing: border-box`,
    `cursor: pointer`,
    `user-select: none`,
    `line-height: 1`,
  ];

  if (statusStyle.isResolved) {
    styles.push(`opacity: ${statusStyle.opacity}`);
  }

  // Ring sorotan dan outline seleksi
  const rings: string[] = [];
  if (isSelected && isHighlighted) {
    rings.push(`0 0 0 2px #FFFFFF, 0 0 0 6px ${ACCENT}`);
  } else if (isSelected) {
    rings.push(`0 0 0 2px #FFFFFF, 0 0 0 5px ${ACCENT}`);
  } else if (isHighlighted) {
    rings.push(`0 0 0 4px ${ACCENT}`);
  } else {
    rings.push(`0 1px 4px rgba(0, 0, 0, 0.25)`);
  }
  styles.push(`box-shadow: ${rings.join(", ")}`);

  const html = `<div style="${styles.join("; ")}">${showCount ? uniqueReporters : ""}</div>`;

  return L.divIcon({
    html,
    className: "!bg-transparent !border-none outline-none",
    iconSize: [diameter, diameter],
    iconAnchor: [radius, radius],
  });
}

/**
 * Cache DivIcon untuk fasilitas vital agar tidak dibuat ulang berkali-kali.
 */
const vitalIconCache = new Map<VitalType, L.DivIcon>();

/**
 * Membuat Leaflet DivIcon untuk penanda fasilitas vital (11-12 px, tanpa pin default).
 */
export function getVitalDivIcon(type: VitalType): L.DivIcon {
  const cached = vitalIconCache.get(type);
  if (cached) return cached;

  const { color, shape } = getVitalStyle(type);
  const size = 12;

  let shapeCss = "border-radius: 2px;";
  if (shape === "circle") {
    shapeCss = "border-radius: 50%;";
  } else if (shape === "diamond") {
    shapeCss = "transform: rotate(45deg); border-radius: 2px; width: 11px; height: 11px;";
  }

  const html = `<div style="width: ${size}px; height: ${size}px; background-color: ${color}; border: 1.5px solid #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.3); ${shapeCss}"></div>`;

  const icon = L.divIcon({
    html,
    className: "!bg-transparent !border-none outline-none",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  vitalIconCache.set(type, icon);
  return icon;
}

/**
 * Leaflet DivIcon untuk titik laporan sementara yang sedang ditaruh pengguna.
 * Bergaya jelas berbeda dari klaster (warna ACCENT, target circle dengan center dot).
 */
export function getTempReportDivIcon(): L.DivIcon {
  const size = 32;
  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      border: 2.5px dashed ${ACCENT};
      background-color: rgba(15, 118, 110, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.35);
      cursor: crosshair;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background-color: ${ACCENT};
        border: 2px solid #FFFFFF;
        border-radius: 50%;
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "!bg-transparent !border-none outline-none",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
