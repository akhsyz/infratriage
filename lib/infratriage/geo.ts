import { distance } from "@turf/distance";
import { point } from "@turf/helpers";
import type { LatLng, VitalPoint } from "./types";

export function assertLatLng(p: LatLng): void {
  if (
    !Number.isFinite(p.lat) ||
    !Number.isFinite(p.lng) ||
    Math.abs(p.lat) > 90 ||
    Math.abs(p.lng) > 180
  ) {
    throw new RangeError(`Koordinat tidak valid: ${p.lat}, ${p.lng}`);
  }
}

/** Jarak antar dua titik dalam meter (Turf, formula haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  return (
    distance(point([a.lng, a.lat]), point([b.lng, b.lat]), {
      units: "kilometers",
    }) * 1000
  );
}

/** Titik pusat berupa rata-rata koordinat. Cukup akurat untuk jarak puluhan meter. */
export function centroidOf(points: LatLng[]): LatLng {
  if (points.length === 0) throw new Error("centroidOf: daftar titik kosong");
  let lat = 0;
  let lng = 0;
  for (const p of points) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / points.length, lng: lng / points.length };
}

export function nearestVital(
  p: LatLng,
  vitals: VitalPoint[],
): { vital: VitalPoint; meters: number } | null {
  let best: { vital: VitalPoint; meters: number } | null = null;
  for (const v of vitals) {
    const m = distanceMeters(p, v);
    if (best === null || m < best.meters) best = { vital: v, meters: m };
  }
  return best;
}
