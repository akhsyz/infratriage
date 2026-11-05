import rawVitals from "../data/fasilitas-vital-yogya.json";
import type { VitalPoint, VitalType } from "./infratriage";

const CATEGORY_MAP: Record<string, VitalType> = {
  hospital: "rumah_sakit",
  school: "sekolah",
  marketplace: "pasar",
};

interface RawVital {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
}

/**
 * Memetakan data mentah fasilitas vital:
 * hospital -> rumah_sakit
 * school -> sekolah
 * marketplace -> pasar
 * Memvalidasi dan membuang entri tanpa lat/lng valid.
 */
export function parseVitals(rawList: unknown): VitalPoint[] {
  if (!Array.isArray(rawList)) return [];
  const results: VitalPoint[] = [];

  for (const item of rawList) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as RawVital).id === "string" &&
      (item as RawVital).id.trim() !== "" &&
      typeof (item as RawVital).name === "string" &&
      (item as RawVital).name.trim() !== "" &&
      typeof (item as RawVital).category === "string" &&
      typeof (item as RawVital).lat === "number" &&
      typeof (item as RawVital).lng === "number" &&
      !Number.isNaN((item as RawVital).lat) &&
      !Number.isNaN((item as RawVital).lng) &&
      Number.isFinite((item as RawVital).lat) &&
      Number.isFinite((item as RawVital).lng) &&
      (item as RawVital).lat >= -90 &&
      (item as RawVital).lat <= 90 &&
      (item as RawVital).lng >= -180 &&
      (item as RawVital).lng <= 180
    ) {
      const mappedType = CATEGORY_MAP[(item as RawVital).category];
      if (mappedType) {
        results.push({
          id: (item as RawVital).id,
          name: (item as RawVital).name,
          type: mappedType,
          lat: (item as RawVital).lat,
          lng: (item as RawVital).lng,
        });
      }
    }
  }

  return results;
}

export const vitals: VitalPoint[] = parseVitals(rawVitals);

export default vitals;
