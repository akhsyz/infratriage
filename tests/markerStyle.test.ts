import { describe, expect, it } from "vitest";
import {
  getMarkerColors,
  getMarkerRadius,
  getMarkerStatusStyle,
  getVitalStyle,
  MAX_MARKER_RADIUS,
  MIN_MARKER_RADIUS,
  shouldShowReporterCount,
} from "../components/map/markerStyle";

describe("markerStyle (components/map/markerStyle.ts)", () => {
  describe("getMarkerRadius", () => {
    it("mengembalikan MIN_MARKER_RADIUS (6 px) untuk 0 atau 1 pelapor", () => {
      expect(getMarkerRadius(0)).toBe(MIN_MARKER_RADIUS);
      expect(getMarkerRadius(1)).toBe(MIN_MARKER_RADIUS);
    });

    it("mengembalikan MAX_MARKER_RADIUS (20 px) untuk jumlah pelapor yang sangat besar", () => {
      expect(getMarkerRadius(15)).toBe(MAX_MARKER_RADIUS);
      expect(getMarkerRadius(50)).toBe(MAX_MARKER_RADIUS);
      expect(getMarkerRadius(100)).toBe(MAX_MARKER_RADIUS);
    });

    it("menskalakan radius secara bertahap di antara batas min dan maks", () => {
      const r2 = getMarkerRadius(2);
      const r5 = getMarkerRadius(5);
      const r10 = getMarkerRadius(10);

      expect(r2).toBeGreaterThanOrEqual(MIN_MARKER_RADIUS);
      expect(r5).toBeGreaterThan(r2);
      expect(r10).toBeGreaterThan(r5);
      expect(r10).toBeLessThanOrEqual(MAX_MARKER_RADIUS);
    });
  });

  describe("shouldShowReporterCount", () => {
    it("mengembalikan false untuk radius kecil (< 11 px)", () => {
      expect(shouldShowReporterCount(6)).toBe(false);
      expect(shouldShowReporterCount(10)).toBe(false);
    });

    it("mengembalikan true untuk radius besar (>= 11 px)", () => {
      expect(shouldShowReporterCount(11)).toBe(true);
      expect(shouldShowReporterCount(18)).toBe(true);
      expect(shouldShowReporterCount(20)).toBe(true);
    });
  });

  describe("getMarkerColors", () => {
    it("mengembalikan warna level kritis (merah) dengan teks putih", () => {
      const colors = getMarkerColors("kritis");
      expect(colors.marker).toBe("#D92D3A");
      expect(colors.text).toBe("#FFFFFF");
    });

    it("mengembalikan warna level tinggi (oranye) dengan teks arang", () => {
      const colors = getMarkerColors("tinggi");
      expect(colors.marker).toBe("#F28C28");
      expect(colors.text).toBe("#1F2933");
    });

    it("mengembalikan warna level sedang (kuning) dengan teks arang", () => {
      const colors = getMarkerColors("sedang");
      expect(colors.marker).toBe("#F4C430");
      expect(colors.text).toBe("#1F2933");
    });
  });

  describe("getMarkerStatusStyle", () => {
    it("mengembalikan opacity 0.4 untuk status resolved", () => {
      const style = getMarkerStatusStyle("resolved");
      expect(style.opacity).toBe(0.4);
      expect(style.fillOpacity).toBe(0.3);
      expect(style.isResolved).toBe(true);
      expect(style.isScheduled).toBe(false);
    });

    it("mengembalikan border putus-putus (dashed) untuk status scheduled", () => {
      const style = getMarkerStatusStyle("scheduled");
      expect(style.opacity).toBe(1);
      expect(style.borderStyle).toBe("dashed");
      expect(style.isScheduled).toBe(true);
      expect(style.isResolved).toBe(false);
    });

    it("mengembalikan border solid dan opacity 1 untuk status pending", () => {
      const style = getMarkerStatusStyle("pending");
      expect(style.opacity).toBe(1);
      expect(style.borderStyle).toBe("solid");
      expect(style.isResolved).toBe(false);
      expect(style.isScheduled).toBe(false);
    });
  });

  describe("getVitalStyle", () => {
    it("mengembalikan bentuk kotak dan warna biru untuk rumah sakit", () => {
      const style = getVitalStyle("rumah_sakit");
      expect(style.shape).toBe("square");
      expect(style.color).toBe("#2563EB");
    });

    it("mengembalikan bentuk lingkaran dan warna slate untuk sekolah", () => {
      const style = getVitalStyle("sekolah");
      expect(style.shape).toBe("circle");
      expect(style.color).toBe("#334155");
    });

    it("mengembalikan bentuk belah ketupat dan warna cokelat untuk pasar", () => {
      const style = getVitalStyle("pasar");
      expect(style.shape).toBe("diamond");
      expect(style.color).toBe("#8B5E34");
    });
  });
});
