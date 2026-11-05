import type {
  Category,
  LatLng,
  Report,
  RoadClass,
  Severity,
} from "../../lib/infratriage/types";

export interface ReportFormData {
  category: Category;
  severity: Severity;
  roadClass: RoadClass;
  incident: boolean;
  reporterId: string;
  note?: string;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  lubang: "Lubang jalan",
  drainase: "Drainase",
  lampu_jalan: "Lampu jalan",
  trotoar: "Trotoar",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  1: "Ringan",
  2: "Sedang",
  3: "Berat",
};

export const ROAD_CLASS_LABEL: Record<RoadClass, string> = {
  arteri: "Jalan arteri",
  kolektor: "Jalan kolektor",
  lokal: "Jalan lokal",
};

/**
 * Menghitung ID laporan baru berawalan "ui-<n>".
 * Mengambil angka tertinggi pada ID yang sudah ada yang berawalan "ui-", lalu +1.
 * Jika belum ada atau setelah RESET, dimulai dari "ui-1".
 */
export function getNextUiReportId(existingReports: { id: string }[]): string {
  let maxId = 0;
  const regex = /^ui-(\d+)$/;

  for (const r of existingReports) {
    const match = r.id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }

  return `ui-${maxId + 1}`;
}

/**
 * Memvalidasi apakah input form laporan lengkap dan valid.
 */
export function isReportFormValid(
  form: Partial<ReportFormData> | null | undefined
): boolean {
  if (!form) return false;
  if (!form.category || !["lubang", "drainase", "lampu_jalan", "trotoar"].includes(form.category)) {
    return false;
  }
  if (!form.severity || ![1, 2, 3].includes(form.severity)) {
    return false;
  }
  if (!form.roadClass || !["arteri", "kolektor", "lokal"].includes(form.roadClass)) {
    return false;
  }
  if (!form.reporterId || form.reporterId.trim() === "") {
    return false;
  }
  return true;
}

/**
 * Membentuk objek Report yang valid untuk di-ingest ke sistem.
 */
export function buildUiReport(
  form: ReportFormData,
  point: LatLng,
  now: Date,
  existingReports: { id: string }[]
): Report {
  const id = getNextUiReportId(existingReports);
  return {
    id,
    reporterId: form.reporterId.trim(),
    category: form.category,
    severity: form.severity,
    roadClass: form.roadClass,
    incident: Boolean(form.incident),
    lat: point.lat,
    lng: point.lng,
    createdAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    ...(form.note?.trim() ? { note: form.note.trim() } : {}),
  };
}
