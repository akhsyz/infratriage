import type { Category, Report, RoadClass, Severity } from "./infratriage/types";
import { DEFAULT_CENTER } from "./infratriage/seed";

/**
 * Batas wilayah geospasial demo di sekitar Kota Yogyakarta.
 * Diturunkan dari DEFAULT_CENTER (-7.7956, 110.3695) dan sebaran fasilitas vital.
 */
export const DEMO_BOUNDS = {
  minLat: DEFAULT_CENTER.lat - 0.06, // -7.8556
  maxLat: DEFAULT_CENTER.lat + 0.05, // -7.7456
  minLng: DEFAULT_CENTER.lng - 0.05, // 110.3195
  maxLng: DEFAULT_CENTER.lng + 0.06, // 110.4295
};

export const ALLOWED_CATEGORIES: readonly Category[] = [
  "lubang",
  "drainase",
  "lampu_jalan",
  "trotoar",
];

export const ALLOWED_ROAD_CLASSES: readonly RoadClass[] = [
  "arteri",
  "kolektor",
  "lokal",
];

export const ALLOWED_SEVERITIES: readonly Severity[] = [1, 2, 3];

export const MAX_REPORTS_PER_VISITOR = 100;
export const MAX_BODY_BYTES = 10 * 1024; // 10 KB

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REPORT_ID_REGEX = /^ui-\d+$/;

/**
 * Validasi apakah sebuah string adalah UUID v4 yang sah.
 */
export function isValidUuidV4(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return UUID_V4_REGEX.test(value.trim());
}

export type ValidationResult =
  | { valid: true; data: Report }
  | { valid: false; error: string };

/**
 * Fungsi murni untuk memvalidasi payload masukan pembuatan laporan baru.
 */
export function validateReportInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "Payload harus berupa objek JSON" };
  }

  const raw = input as Record<string, unknown>;

  // 1. Validasi ID laporan (harus pola ui-<angka>)
  if (typeof raw.id !== "string" || !REPORT_ID_REGEX.test(raw.id.trim())) {
    return {
      valid: false,
      error: "ID laporan harus berformat 'ui-<angka>' (misal: ui-1)",
    };
  }
  const id = raw.id.trim();

  // 2. Validasi Kategori
  if (
    typeof raw.category !== "string" ||
    !ALLOWED_CATEGORIES.includes(raw.category as Category)
  ) {
    return {
      valid: false,
      error: `Kategori tidak valid. Harus salah satu dari: ${ALLOWED_CATEGORIES.join(", ")}`,
    };
  }
  const category = raw.category as Category;

  // 3. Validasi Keparahan (1, 2, atau 3)
  const severityNum = Number(raw.severity);
  if (
    !Number.isInteger(severityNum) ||
    !ALLOWED_SEVERITIES.includes(severityNum as Severity)
  ) {
    return {
      valid: false,
      error: "Tingkat keparahan harus berupa bilangan bulat antara 1 hingga 3",
    };
  }
  const severity = severityNum as Severity;

  // 4. Validasi Kelas Jalan
  if (
    typeof raw.roadClass !== "string" ||
    !ALLOWED_ROAD_CLASSES.includes(raw.roadClass as RoadClass)
  ) {
    return {
      valid: false,
      error: `Kelas jalan tidak valid. Harus salah satu dari: ${ALLOWED_ROAD_CLASSES.join(", ")}`,
    };
  }
  const roadClass = raw.roadClass as RoadClass;

  // 5. Validasi hasIncident / incident (harus boolean jika ada)
  const incidentValue = raw.hasIncident ?? raw.incident;
  let incident = false;
  if (incidentValue !== undefined && incidentValue !== null) {
    if (typeof incidentValue !== "boolean") {
      return {
        valid: false,
        error: "Status insiden (hasIncident/incident) harus berupa boolean",
      };
    }
    incident = incidentValue;
  }

  // 6. Validasi reporterId (1 sampai 40 karakter)
  if (typeof raw.reporterId !== "string") {
    return {
      valid: false,
      error: "reporterId harus berupa string",
    };
  }
  const reporterId = raw.reporterId.trim();
  if (reporterId.length < 1 || reporterId.length > 40) {
    return {
      valid: false,
      error: "reporterId harus memiliki panjang antara 1 hingga 40 karakter",
    };
  }

  // 7. Validasi Koordinat Geospasial (lat & lng di dalam kotak wilayah demo)
  if (typeof raw.lat !== "number" || !Number.isFinite(raw.lat)) {
    return { valid: false, error: "Latitude harus berupa angka valid" };
  }
  if (typeof raw.lng !== "number" || !Number.isFinite(raw.lng)) {
    return { valid: false, error: "Longitude harus berupa angka valid" };
  }

  if (raw.lat < DEMO_BOUNDS.minLat || raw.lat > DEMO_BOUNDS.maxLat) {
    return {
      valid: false,
      error: `Latitude di luar batas wilayah demo (${DEMO_BOUNDS.minLat} s.d. ${DEMO_BOUNDS.maxLat})`,
    };
  }
  if (raw.lng < DEMO_BOUNDS.minLng || raw.lng > DEMO_BOUNDS.maxLng) {
    return {
      valid: false,
      error: `Longitude di luar batas wilayah demo (${DEMO_BOUNDS.minLng} s.d. ${DEMO_BOUNDS.maxLng})`,
    };
  }

  // 8. Validasi createdAt (format ISO 8601)
  let createdAt = new Date().toISOString();
  if (raw.createdAt !== undefined && raw.createdAt !== null) {
    if (typeof raw.createdAt !== "string") {
      return { valid: false, error: "createdAt harus berupa string ISO 8601" };
    }
    const parsed = Date.parse(raw.createdAt);
    if (Number.isNaN(parsed)) {
      return { valid: false, error: "createdAt bukan tanggal ISO 8601 yang sah" };
    }
    createdAt = new Date(parsed).toISOString();
  }

  // 9. Validasi Catatan (opsional, maks 500 karakter)
  let note: string | undefined = undefined;
  if (typeof raw.note === "string") {
    const trimmedNote = raw.note.trim();
    if (trimmedNote.length > 500) {
      return { valid: false, error: "Panjang catatan maksimal 500 karakter" };
    }
    if (trimmedNote.length > 0) {
      note = trimmedNote;
    }
  }

  const report: Report = {
    id,
    reporterId,
    category,
    severity,
    roadClass,
    lat: raw.lat,
    lng: raw.lng,
    createdAt,
    incident,
    ...(note ? { note } : {}),
  };

  return { valid: true, data: report };
}

