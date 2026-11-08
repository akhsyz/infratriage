import { describe, expect, it } from "vitest";
import {
  DEMO_BOUNDS,
  isValidUuidV4,
  validateReportInput,
} from "../lib/reportValidation";

describe("lib/reportValidation", () => {
  const validPayload = {
    id: "ui-1",
    category: "lubang",
    severity: 2,
    roadClass: "arteri",
    hasIncident: false,
    reporterId: "pelapor-ui-1",
    lat: -7.7956,
    lng: 110.3695,
    createdAt: "2026-11-08T12:00:00.000Z",
  };

  it("menerima payload yang valid dan mengembalikan data Report yang sesuai", () => {
    const res = validateReportInput(validPayload);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.data.id).toBe("ui-1");
      expect(res.data.category).toBe("lubang");
      expect(res.data.severity).toBe(2);
      expect(res.data.roadClass).toBe("arteri");
      expect(res.data.incident).toBe(false);
      expect(res.data.reporterId).toBe("pelapor-ui-1");
      expect(res.data.lat).toBe(-7.7956);
      expect(res.data.lng).toBe(110.3695);
    }
  });

  it("menolak kategori yang salah / tidak terdaftar", () => {
    const res = validateReportInput({
      ...validPayload,
      category: "jembatan_rusak",
    });
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain("Kategori tidak valid");
    }
  });

  it("menolak keparahan di luar rentang 1-3", () => {
    const res0 = validateReportInput({ ...validPayload, severity: 0 });
    expect(res0.valid).toBe(false);
    if (!res0.valid) {
      expect(res0.error).toContain("Tingkat keparahan");
    }

    const res4 = validateReportInput({ ...validPayload, severity: 4 });
    expect(res4.valid).toBe(false);
    if (!res4.valid) {
      expect(res4.error).toContain("Tingkat keparahan");
    }

    const resFraction = validateReportInput({ ...validPayload, severity: 2.5 });
    expect(resFraction.valid).toBe(false);
  });

  it("menolak koordinat di luar kotak batas wilayah demo", () => {
    // Latitude terlalu utara
    const resNorth = validateReportInput({
      ...validPayload,
      lat: DEMO_BOUNDS.maxLat + 0.1,
    });
    expect(resNorth.valid).toBe(false);
    if (!resNorth.valid) {
      expect(resNorth.error).toContain("Latitude di luar batas");
    }

    // Latitude terlalu selatan
    const resSouth = validateReportInput({
      ...validPayload,
      lat: DEMO_BOUNDS.minLat - 0.1,
    });
    expect(resSouth.valid).toBe(false);

    // Longitude terlalu barat
    const resWest = validateReportInput({
      ...validPayload,
      lng: DEMO_BOUNDS.minLng - 0.1,
    });
    expect(resWest.valid).toBe(false);
    if (!resWest.valid) {
      expect(resWest.error).toContain("Longitude di luar batas");
    }

    // Longitude terlalu timur
    const resEast = validateReportInput({
      ...validPayload,
      lng: DEMO_BOUNDS.maxLng + 0.1,
    });
    expect(resEast.valid).toBe(false);
  });

  it("menolak id yang salah pola (bukan ui-<angka>)", () => {
    const res1 = validateReportInput({ ...validPayload, id: "report-123" });
    expect(res1.valid).toBe(false);
    if (!res1.valid) {
      expect(res1.error).toContain("ui-<angka>");
    }

    const res2 = validateReportInput({ ...validPayload, id: "ui-abc" });
    expect(res2.valid).toBe(false);

    const res3 = validateReportInput({ ...validPayload, id: "123" });
    expect(res3.valid).toBe(false);
  });

  it("menolak reporterId yang kosong atau terlalu panjang (>40 karakter)", () => {
    // Kosong / whitespace
    const resEmpty = validateReportInput({ ...validPayload, reporterId: "   " });
    expect(resEmpty.valid).toBe(false);
    if (!resEmpty.valid) {
      expect(resEmpty.error).toContain("reporterId");
    }

    // Terlalu panjang (>40 karakter)
    const longId = "a".repeat(41);
    const resLong = validateReportInput({
      ...validPayload,
      reporterId: longId,
    });
    expect(resLong.valid).toBe(false);
    if (!resLong.valid) {
      expect(resLong.error).toContain("antara 1 hingga 40 karakter");
    }
  });

  it("memvalidasi UUID v4 dengan tepat", () => {
    expect(isValidUuidV4("c658d550-98b7-4a15-b7b8-dc58a361bcfa")).toBe(true);
    expect(isValidUuidV4("C658D550-98B7-4A15-B7B8-DC58A361BCFA")).toBe(true);
    expect(isValidUuidV4("not-a-uuid")).toBe(false);
    expect(isValidUuidV4("c658d550-98b7-1a15-b7b8-dc58a361bcfa")).toBe(false); // v1, bukan v4
    expect(isValidUuidV4("")).toBe(false);
    expect(isValidUuidV4(null)).toBe(false);
  });
});

