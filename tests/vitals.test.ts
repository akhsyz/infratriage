import { describe, expect, it } from "vitest";
import { parseVitals, vitals } from "../lib/vitals";

describe("vitals adapter (lib/vitals.ts)", () => {
  it("semua entri diekspor dengan tipe valid dan koordinat valid", () => {
    expect(Array.isArray(vitals)).toBe(true);
    expect(vitals.length).toBe(294);

    const validTypes = new Set(["rumah_sakit", "sekolah", "pasar"]);

    for (const v of vitals) {
      expect(typeof v.id).toBe("string");
      expect(v.id.length).toBeGreaterThan(0);

      expect(typeof v.name).toBe("string");
      expect(v.name.length).toBeGreaterThan(0);

      expect(validTypes.has(v.type)).toBe(true);

      expect(typeof v.lat).toBe("number");
      expect(Number.isFinite(v.lat)).toBe(true);
      expect(Number.isNaN(v.lat)).toBe(false);
      expect(v.lat).toBeGreaterThanOrEqual(-90);
      expect(v.lat).toBeLessThanOrEqual(90);

      expect(typeof v.lng).toBe("number");
      expect(Number.isFinite(v.lng)).toBe(true);
      expect(Number.isNaN(v.lng)).toBe(false);
      expect(v.lng).toBeGreaterThanOrEqual(-180);
      expect(v.lng).toBeLessThanOrEqual(180);

      // Sanity check wilayah Kota Yogyakarta dan sekitarnya (DIY)
      expect(v.lat).toBeLessThan(0); // Belahan bumi selatan
      expect(v.lng).toBeGreaterThan(100); // Wilayah Indonesia bagian barat
    }
  });

  it("memiliki ketiga kategori vital: rumah_sakit, sekolah, pasar", () => {
    const types = new Set(vitals.map((v) => v.type));
    expect(types.has("rumah_sakit")).toBe(true);
    expect(types.has("sekolah")).toBe(true);
    expect(types.has("pasar")).toBe(true);
  });

  describe("parseVitals helper", () => {
    it("memetakan category hospital -> rumah_sakit, school -> sekolah, marketplace -> pasar", () => {
      const sample = [
        { id: "1", name: "RS Bethesda", category: "hospital", lat: -7.78, lng: 110.37 },
        { id: "2", name: "SMA 1", category: "school", lat: -7.79, lng: 110.36 },
        { id: "3", name: "Pasar Beringharjo", category: "marketplace", lat: -7.8, lng: 110.365 },
      ];
      const parsed = parseVitals(sample);
      expect(parsed).toEqual([
        { id: "1", name: "RS Bethesda", type: "rumah_sakit", lat: -7.78, lng: 110.37 },
        { id: "2", name: "SMA 1", type: "sekolah", lat: -7.79, lng: 110.36 },
        { id: "3", name: "Pasar Beringharjo", type: "pasar", lat: -7.8, lng: 110.365 },
      ]);
    });

    it("membuang entri tanpa lat/lng valid atau kategori tidak dikenal", () => {
      const sample = [
        { id: "1", name: "Valid", category: "school", lat: -7.78, lng: 110.37 },
        { id: "2", name: "No Lat", category: "school", lng: 110.37 },
        { id: "3", name: "NaN Lat", category: "school", lat: NaN, lng: 110.37 },
        { id: "4", name: "Infinite Lng", category: "school", lat: -7.78, lng: Infinity },
        { id: "5", name: "Unknown Category", category: "police_station", lat: -7.78, lng: 110.37 },
        { id: "6", name: "Out of range", category: "school", lat: 95, lng: 110.37 },
      ];
      const parsed = parseVitals(sample);
      expect(parsed.length).toBe(1);
      expect(parsed[0].id).toBe("1");
    });

    it("menangani input bukan array atau array kosong secara aman", () => {
      expect(parseVitals(null)).toEqual([]);
      expect(parseVitals(undefined)).toEqual([]);
      expect(parseVitals("invalid")).toEqual([]);
      expect(parseVitals([])).toEqual([]);
    });
  });
});
