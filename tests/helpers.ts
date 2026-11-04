import { DEFAULT_WEIGHTS } from "../lib/infratriage/config";
import type {
  Category,
  Cluster,
  Report,
  RoadClass,
  ScoreContext,
  Severity,
  VitalPoint,
} from "../lib/infratriage/types";

export const NOW = new Date("2026-11-20T00:00:00Z");

/** Titik acuan uji. Hanya angka uji, BUKAN lokasi nyata apa pun. */
export const ORIGIN = { lat: -7.8, lng: 110.37 };

/** 1 derajat lintang ~ 111.19 km, jadi 1 m ~ 0.000008993 derajat. */
export const METER_LAT = 1 / 111_195;

export function offsetNorth(base: { lat: number; lng: number }, meters: number) {
  return { lat: base.lat + meters * METER_LAT, lng: base.lng };
}

export function report(p: Partial<Report> & { id: string }): Report {
  return {
    reporterId: p.id,
    lat: ORIGIN.lat,
    lng: ORIGIN.lng,
    category: "lubang" as Category,
    severity: 2 as Severity,
    roadClass: "arteri" as RoadClass,
    createdAt: NOW.toISOString(),
    ...p,
  };
}

export function cluster(reports: Report[], over: Partial<Cluster> = {}): Cluster {
  return {
    id: `c-${reports[0].id}`,
    category: reports[0].category,
    status: "pending",
    lat: reports[0].lat,
    lng: reports[0].lng,
    reports,
    ...over,
  };
}

/** Fasilitas vital PLACEHOLDER tepat di ORIGIN (jarak 0 m) untuk uji. */
export const VITAL_AT_ORIGIN: VitalPoint = {
  id: "v-test",
  name: "Fasilitas uji",
  type: "rumah_sakit",
  lat: ORIGIN.lat,
  lng: ORIGIN.lng,
};

export function ctx(over: Partial<ScoreContext> = {}): ScoreContext {
  return { vitals: [VITAL_AT_ORIGIN], weights: DEFAULT_WEIGHTS, now: NOW, ...over };
}
