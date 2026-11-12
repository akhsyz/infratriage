import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPhotoStoragePath,
  calculateTargetDimensions,
  clearPhotoStore,
  CLIENT_MAX_PHOTO_BYTES,
  detectPhotoMimeTypeFromBytes,
  fetchPhotoSignedUrl,
  getPhotoStatus,
  hasReachedPhotoLimit,
  isWithinPhotoSizeLimit,
  mapRowToPersistedReport,
  SERVER_MAX_PHOTO_BYTES,
  setPhotoStatus,
  uploadReportPhoto,
  type DatabaseReportRowWithPhoto,
} from "../lib/photos";

describe("lib/photos - Fungsi Murni Foto Bukti", () => {
  describe("1. Deteksi tipe dari magic bytes (detectPhotoMimeTypeFromBytes)", () => {
    it("mendeteksi file JPEG secara valid (FF D8 FF)", () => {
      // Minimal 12 bytes dengan header JPEG
      const jpegBytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const result = detectPhotoMimeTypeFromBytes(jpegBytes);
      expect(result).toEqual({ mime: "image/jpeg", ext: "jpg" });
    });

    it("mendeteksi file WebP secara valid (RIFF....WEBP)", () => {
      // 0..3: RIFF, 4..7: file size, 8..11: WEBP
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // size dummy
        0x57, 0x45, 0x42, 0x50, // WEBP
        0x56, 0x50, 0x38, 0x20,
      ]);
      const result = detectPhotoMimeTypeFromBytes(webpBytes);
      expect(result).toEqual({ mime: "image/webp", ext: "webp" });
    });

    it("menolak format PNG (89 50 4E 47)", () => {
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const result = detectPhotoMimeTypeFromBytes(pngBytes);
      expect(result).toBeNull();
    });

    it("menolak teks polos atau byte acak", () => {
      const textBytes = new TextEncoder().encode("ini bukan gambar valid!");
      expect(detectPhotoMimeTypeFromBytes(textBytes)).toBeNull();
    });

    it("menolak array byte yang terlalu pendek (< 12 byte)", () => {
      const shortBytes = new Uint8Array([0xff, 0xd8, 0xff]);
      expect(detectPhotoMimeTypeFromBytes(shortBytes)).toBeNull();
    });
  });

  describe("2. Batas ukuran foto (isWithinPhotoSizeLimit)", () => {
    it("menerima ukuran valid di bawah batas server (<= 2 MB)", () => {
      expect(isWithinPhotoSizeLimit(1024, SERVER_MAX_PHOTO_BYTES)).toBe(true);
      expect(isWithinPhotoSizeLimit(SERVER_MAX_PHOTO_BYTES, SERVER_MAX_PHOTO_BYTES)).toBe(true);
    });

    it("menolak ukuran melebihi batas server (> 2 MB)", () => {
      expect(isWithinPhotoSizeLimit(SERVER_MAX_PHOTO_BYTES + 1, SERVER_MAX_PHOTO_BYTES)).toBe(false);
      expect(isWithinPhotoSizeLimit(5 * 1024 * 1024, SERVER_MAX_PHOTO_BYTES)).toBe(false);
    });

    it("memvalidasi batas kompresi klien (<= 1,5 MB)", () => {
      expect(isWithinPhotoSizeLimit(CLIENT_MAX_PHOTO_BYTES, CLIENT_MAX_PHOTO_BYTES)).toBe(true);
      expect(isWithinPhotoSizeLimit(CLIENT_MAX_PHOTO_BYTES + 1, CLIENT_MAX_PHOTO_BYTES)).toBe(false);
    });

    it("menolak ukuran nol atau negatif", () => {
      expect(isWithinPhotoSizeLimit(0)).toBe(false);
      expect(isWithinPhotoSizeLimit(-50)).toBe(false);
    });
  });

  describe("3. Pembentukan path storage (buildPhotoStoragePath)", () => {
    it("membentuk path `${visitorId}/${reportId}.${ext}` dengan benar", () => {
      const pathJpg = buildPhotoStoragePath("user-uuid-1", "ui-1", "jpg");
      expect(pathJpg).toBe("user-uuid-1/ui-1.jpg");

      const pathWebp = buildPhotoStoragePath("user-uuid-2", "ui-5", "webp");
      expect(pathWebp).toBe("user-uuid-2/ui-5.webp");
    });

    it("melakukan normalisasi spasi dan huruf kecil pada ekstensi", () => {
      const path = buildPhotoStoragePath("  user-uuid-3  ", "  ui-10  ", "JPG" as "jpg");
      expect(path).toBe("user-uuid-3/ui-10.jpg");
    });
  });

  describe("4. Perhitungan dimensi kompres (calculateTargetDimensions)", () => {
    it("mempertahankan ukuran asli bila sisi terpanjang <= 1280 px", () => {
      const dims = calculateTargetDimensions(800, 600, 1280);
      expect(dims).toEqual({ width: 800, height: 600 });
    });

    it("mengecilkan gambar lanskap > 1280 px dengan rasio aspek tetap", () => {
      // 2560 x 1440 (16:9) -> lebar 1280, tinggi 720
      const dims = calculateTargetDimensions(2560, 1440, 1280);
      expect(dims).toEqual({ width: 1280, height: 720 });
    });

    it("mengecilkan gambar potret > 1280 px dengan rasio aspek tetap", () => {
      // 1080 x 1920 -> tinggi 1280, lebar 720
      const dims = calculateTargetDimensions(1080, 1920, 1280);
      expect(dims).toEqual({ width: 720, height: 1280 });
    });

    it("menangani gambar bujur sangkar > 1280 px", () => {
      const dims = calculateTargetDimensions(2000, 2000, 1280);
      expect(dims).toEqual({ width: 1280, height: 1280 });
    });

    it("menangani input dimensi ekstrem / nol dengan aman", () => {
      expect(calculateTargetDimensions(0, 0, 1280)).toEqual({ width: 1, height: 1 });
      expect(calculateTargetDimensions(-10, 100, 1280)).toEqual({ width: 1, height: 1 });
    });
  });

  describe("5. Batas kuota 10 foto (hasReachedPhotoLimit)", () => {
    it("mengembalikan false saat jumlah foto < 10", () => {
      expect(hasReachedPhotoLimit(0, 10)).toBe(false);
      expect(hasReachedPhotoLimit(5, 10)).toBe(false);
      expect(hasReachedPhotoLimit(9, 10)).toBe(false);
    });

    it("mengembalikan true saat jumlah foto >= 10", () => {
      expect(hasReachedPhotoLimit(10, 10)).toBe(true);
      expect(hasReachedPhotoLimit(11, 10)).toBe(true);
    });
  });

  describe("6. Pemetaan hasPhoto pada hasil GET (mapRowToPersistedReport)", () => {
    it("memberikan hasPhoto: true jika photo_path terisi", () => {
      const row: DatabaseReportRowWithPhoto = {
        id: "db-uuid-1",
        visitor_id: "visitor-1",
        report_id: "ui-1",
        category: "lubang",
        severity: 3,
        road_class: "arteri",
        has_incident: true,
        reporter_id: "pelapor-1",
        lat: -7.795,
        lng: 110.369,
        created_at: "2026-11-13T00:00:00.000Z",
        note: "Ada lubang menganga",
        photo_path: "visitor-1/ui-1.webp",
      };

      const mapped = mapRowToPersistedReport(row);
      expect(mapped.hasPhoto).toBe(true);
      expect(mapped.id).toBe("ui-1");
      expect(mapped.category).toBe("lubang");
      expect(mapped.severity).toBe(3);
      expect(mapped.roadClass).toBe("arteri");
      expect(mapped.incident).toBe(true);
      expect(mapped.note).toBe("Ada lubang menganga");
    });

    it("memberikan hasPhoto: false jika photo_path null, kosong, atau undefined", () => {
      const rowNoPhoto: DatabaseReportRowWithPhoto = {
        report_id: "ui-2",
        category: "trotoar",
        severity: 1,
        road_class: "lokal",
        has_incident: false,
        reporter_id: "pelapor-2",
        lat: -7.796,
        lng: 110.37,
        created_at: "2026-11-13T00:00:00.000Z",
        photo_path: null,
      };

      const mapped = mapRowToPersistedReport(rowNoPhoto);
      expect(mapped.hasPhoto).toBe(false);
      expect(mapped.id).toBe("ui-2");
    });
  });

  describe("7. Status store per reportId (setPhotoStatus, getPhotoStatus, clearPhotoStore)", () => {
    it("dapat menyimpan dan mengambil status per reportId", () => {
      clearPhotoStore();
      expect(getPhotoStatus("ui-1")).toBeUndefined();

      setPhotoStatus("ui-1", "uploading");
      expect(getPhotoStatus("ui-1")).toBe("uploading");

      setPhotoStatus("ui-1", "done");
      expect(getPhotoStatus("ui-1")).toBe("done");

      setPhotoStatus("ui-2", "failed");
      expect(getPhotoStatus("ui-2")).toBe("failed");
      expect(getPhotoStatus("ui-1")).toBe("done");

      clearPhotoStore();
      expect(getPhotoStatus("ui-1")).toBeUndefined();
      expect(getPhotoStatus("ui-2")).toBeUndefined();
    });
  });

  describe("8. Jaringan klien (uploadReportPhoto & fetchPhotoSignedUrl)", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("uploadReportPhoto mengembalikan true saat server mengembalikan 200 OK", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response);

      const dummyBlob = new Blob(["dummy photo content"], { type: "image/webp" });
      const result = await uploadReportPhoto("ui-1", dummyBlob, "webp");
      expect(result).toBe(true);
    });

    it("uploadReportPhoto aman gagal saat server mengembalikan error atau jaringan putus", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      } as Response);

      const dummyBlob = new Blob(["dummy photo content"], { type: "image/webp" });
      const result503 = await uploadReportPhoto("ui-1", dummyBlob, "webp");
      expect(result503).toBe(false);

      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network failed"));
      const resultNet = await uploadReportPhoto("ui-1", dummyBlob, "webp");
      expect(resultNet).toBe(false);
    });

    it("fetchPhotoSignedUrl mengembalikan URL saat berhasil", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: "https://supabase.co/storage/v1/object/sign/photo.webp?token=xyz" }),
      } as Response);

      const url = await fetchPhotoSignedUrl("ui-1");
      expect(url).toBe("https://supabase.co/storage/v1/object/sign/photo.webp?token=xyz");
    });

    it("fetchPhotoSignedUrl aman mengembalikan null saat foto tidak ditemukan atau error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const url404 = await fetchPhotoSignedUrl("ui-999");
      expect(url404).toBeNull();

      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Fetch failed"));
      const urlErr = await fetchPhotoSignedUrl("ui-999");
      expect(urlErr).toBeNull();
    });
  });
});
