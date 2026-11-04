export type Category = "lubang" | "drainase" | "lampu_jalan" | "trotoar";
/** 1 = ringan, 2 = sedang, 3 = berat */
export type Severity = 1 | 2 | 3;
export type RoadClass = "arteri" | "kolektor" | "lokal";
export type VitalType = "rumah_sakit" | "sekolah" | "pasar";
export type ClusterStatus = "pending" | "scheduled" | "resolved";
export type PriorityLevel = "kritis" | "tinggi" | "sedang";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Report extends LatLng {
  id: string;
  reporterId: string;
  category: Category;
  severity: Severity;
  roadClass: RoadClass;
  /** ISO 8601, contoh "2026-11-10T08:00:00Z" */
  createdAt: string;
  /** true jika pelapor menyebut ada insiden/kecelakaan di titik ini */
  incident?: boolean;
  note?: string;
  photoUrl?: string;
}

/**
 * Satu entitas masalah. Sengaja minimal: severity, kelas jalan, usia, dan insiden
 * diturunkan dari `reports` supaya hanya ada satu sumber kebenaran.
 * lat/lng = titik pusat (rata-rata) seluruh laporan di klaster.
 */
export interface Cluster extends LatLng {
  id: string;
  category: Category;
  status: ClusterStatus;
  reports: Report[];
}

export interface VitalPoint extends LatLng {
  id: string;
  name: string;
  type: VitalType;
}

export interface Weights {
  bahaya: number;
  kelas: number;
  vital: number;
  kerumunan: number;
  usia: number;
}

export interface ScoreContext {
  vitals: VitalPoint[];
  weights: Weights;
  now: Date;
}
