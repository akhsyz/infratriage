import type { Report } from "./infratriage/types";

/**
 * Batas ukuran foto bukti.
 * Klien mengompresi hingga <= 1,5 MB sebelum dikirim.
 * Server menetapkan batas keras <= 2 MB.
 */
export const CLIENT_MAX_PHOTO_BYTES = 1.5 * 1024 * 1024; // 1,5 MB
export const SERVER_MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_PHOTO_SIDE_PX = 1280;
export const MAX_PHOTOS_PER_VISITOR = 10;

export type SupportedPhotoExt = "jpg" | "webp";
export type SupportedPhotoMime = "image/jpeg" | "image/webp";

export type PhotoUploadStatus = "uploading" | "done" | "failed";

/**
 * Laporan yang memiliki flag hasPhoto untuk antarmuka pengguna tanpa mengubah Report inti.
 */
export interface PersistedReport extends Report {
  hasPhoto?: boolean;
}

/**
 * Tipe data laporan dari database yang memuat penanda photo_path.
 */
export interface DatabaseReportRowWithPhoto {
  id?: string;
  visitor_id?: string;
  report_id: string;
  category: string;
  severity: number;
  road_class: string;
  has_incident: boolean;
  reporter_id: string;
  lat: number;
  lng: number;
  created_at: string;
  inserted_at?: string;
  note?: string | null;
  photo_path?: string | null;
}

// ────────────────────────────────────────────────────────────
// Fungsi-fungsi Murni (Pure Functions)
// ────────────────────────────────────────────────────────────

/**
 * Menghitung dimensi baru gambar agar sisi terpanjang tidak melebihi maxSide (1280 px)
 * dengan tetap mempertahankan rasio aspek asli.
 */
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxSide: number = MAX_PHOTO_SIDE_PX
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: 1, height: 1 };
  }

  const longestSide = Math.max(width, height);
  if (longestSide <= maxSide) {
    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    };
  }

  const ratio = maxSide / longestSide;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * Memeriksa apakah ukuran byte berada dalam batas maksimum.
 */
export function isWithinPhotoSizeLimit(
  bytes: number,
  maxBytes: number = SERVER_MAX_PHOTO_BYTES
): boolean {
  return bytes > 0 && bytes <= maxBytes;
}

/**
 * Mendeteksi tipe MIME dan ekstensi file dari magic bytes (byte signature).
 * Hanya mendukung JPEG (FF D8 FF) dan WebP (RIFF....WEBP).
 * Tidak bergantung pada header Content-Type kiriman klien.
 */
export function detectPhotoMimeTypeFromBytes(
  bytes: Uint8Array | ArrayBuffer | number[]
): { mime: SupportedPhotoMime; ext: SupportedPhotoExt } | null {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.length < 12) {
    return null;
  }

  // 1. JPEG: Dimulai dengan 0xFF, 0xD8, 0xFF
  if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // 2. WebP: 'RIFF' pada byte 0..3 dan 'WEBP' pada byte 8..11
  const isRiff =
    u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46;
  const isWebp =
    u8[8] === 0x57 && u8[9] === 0x45 && u8[10] === 0x42 && u8[11] === 0x50;

  if (isRiff && isWebp) {
    return { mime: "image/webp", ext: "webp" };
  }

  return null;
}

/**
 * Membangun path penyimpanan objek di bucket Supabase Storage:
 * `${visitorId}/${reportId}.${ext}`
 */
export function buildPhotoStoragePath(
  visitorId: string,
  reportId: string,
  ext: SupportedPhotoExt
): string {
  const cleanVisitor = visitorId.trim();
  const cleanReport = reportId.trim();
  const cleanExt = ext.trim().toLowerCase();
  return `${cleanVisitor}/${cleanReport}.${cleanExt}`;
}

/**
 * Memeriksa apakah jumlah foto yang dimiliki visitor sudah mencapai batas kuota (10 foto).
 */
export function hasReachedPhotoLimit(
  currentPhotoCount: number,
  limit: number = MAX_PHOTOS_PER_VISITOR
): boolean {
  return currentPhotoCount >= limit;
}

/**
 * Memetakan baris database menjadi Report dengan atribut hasPhoto.
 */
export function mapRowToPersistedReport(
  row: DatabaseReportRowWithPhoto
): PersistedReport {
  return {
    id: row.report_id,
    reporterId: row.reporter_id,
    category: row.category as Report["category"],
    severity: row.severity as Report["severity"],
    roadClass: row.road_class as Report["roadClass"],
    incident: Boolean(row.has_incident),
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
    hasPhoto: Boolean(row.photo_path && row.photo_path.trim().length > 0),
    ...(row.note ? { note: row.note } : {}),
  };
}
