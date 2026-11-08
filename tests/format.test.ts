import { describe, expect, it } from "vitest";
import {
  formatDistance,
  formatRupiah,
  formatRupiahInput,
  parseRupiah,
} from "../lib/format";

describe("format helpers (lib/format.ts)", () => {
  describe("formatRupiah", () => {
    it("memformat angka standar menjadi format Rupiah dengan pemisah ribuan titik", () => {
      expect(formatRupiah(100_000_000)).toBe("Rp 100.000.000");
      expect(formatRupiah(7_500_000)).toBe("Rp 7.500.000");
      expect(formatRupiah(3_000_000)).toBe("Rp 3.000.000");
      expect(formatRupiah(50_000)).toBe("Rp 50.000");
      expect(formatRupiah(500)).toBe("Rp 500");
      expect(formatRupiah(0)).toBe("Rp 0");
    });

    it("membulatkan nilai pecahan ke bilangan bulat terdekat", () => {
      expect(formatRupiah(10_000.4)).toBe("Rp 10.000");
      expect(formatRupiah(10_000.6)).toBe("Rp 10.001");
    });

    it("memformat angka negatif", () => {
      expect(formatRupiah(-50_000)).toBe("-Rp 50.000");
    });

    it("menangani nilai non-finite (NaN, Infinity) secara aman", () => {
      expect(formatRupiah(NaN)).toBe("Rp 0");
      expect(formatRupiah(Infinity)).toBe("Rp 0");
      expect(formatRupiah(-Infinity)).toBe("Rp 0");
    });

    it("mendukung opsi prefix: false untuk menghasilkan format angka murni", () => {
      expect(formatRupiah(100_000_000, { prefix: false })).toBe("100.000.000");
      expect(formatRupiah(0, { prefix: false })).toBe("0");
      expect(formatRupiah(-50_000, { prefix: false })).toBe("-50.000");
      expect(formatRupiah(NaN, { prefix: false })).toBe("0");
    });
  });

  describe("formatRupiahInput", () => {
    it("memformat string angka mentah menjadi berpemisah ribuan titik", () => {
      expect(formatRupiahInput("100000000")).toBe("100.000.000");
      expect(formatRupiahInput("1000")).toBe("1.000");
      expect(formatRupiahInput("500")).toBe("500");
    });

    it("tetap mempertahankan format bila string sudah berisi titik atau format Rupiah", () => {
      expect(formatRupiahInput("100.000.000")).toBe("100.000.000");
      expect(formatRupiahInput("Rp 100.000.000")).toBe("100.000.000");
      expect(formatRupiahInput("Rp. 50.000")).toBe("50.000");
    });

    it("menghapus leading zero berlebih namun mempertahankan angka nol tunggal", () => {
      expect(formatRupiahInput("05000")).toBe("5.000");
      expect(formatRupiahInput("00123456")).toBe("123.456");
      expect(formatRupiahInput("0")).toBe("0");
      expect(formatRupiahInput("000")).toBe("0");
    });

    it("menerima input number secara langsung", () => {
      expect(formatRupiahInput(100_000_000)).toBe("100.000.000");
      expect(formatRupiahInput(0)).toBe("0");
    });

    it("mengembalikan string kosong untuk input kosong atau non-digit", () => {
      expect(formatRupiahInput("")).toBe("");
      expect(formatRupiahInput("   ")).toBe("");
      expect(formatRupiahInput("abc")).toBe("");
      expect(formatRupiahInput(null as unknown as string)).toBe("");
      expect(formatRupiahInput(undefined as unknown as string)).toBe("");
    });

    it("menangani nilai negatif pada input", () => {
      expect(formatRupiahInput("-100000")).toBe("-100.000");
      expect(formatRupiahInput("-Rp 100.000")).toBe("-100.000");
    });
  });

  describe("parseRupiah", () => {
    it("mengurai string terformat Rupiah menjadi integer murni", () => {
      expect(parseRupiah("100.000.000")).toBe(100_000_000);
      expect(parseRupiah("Rp 100.000.000")).toBe(100_000_000);
      expect(parseRupiah("Rp100.000.000")).toBe(100_000_000);
      expect(parseRupiah("7.500.000")).toBe(7_500_000);
      expect(parseRupiah("50.000")).toBe(50_000);
      expect(parseRupiah("0")).toBe(0);
      expect(parseRupiah("Rp 0")).toBe(0);
    });

    it("mengembalikan 0 untuk input kosong, null, undefined, atau tidak valid", () => {
      expect(parseRupiah("")).toBe(0);
      expect(parseRupiah("   ")).toBe(0);
      expect(parseRupiah("bukan_angka")).toBe(0);
      expect(parseRupiah(null as unknown as string)).toBe(0);
      expect(parseRupiah(undefined as unknown as string)).toBe(0);
    });

    it("menerima tipe number secara langsung dan membulatkannya", () => {
      expect(parseRupiah(100_000_000)).toBe(100_000_000);
      expect(parseRupiah(5000.75)).toBe(5001);
      expect(parseRupiah(NaN)).toBe(0);
    });

    it("mengurai angka negatif dengan benar", () => {
      expect(parseRupiah("-50.000")).toBe(-50_000);
      expect(parseRupiah("-Rp 50.000")).toBe(-50_000);
      expect(parseRupiah("Rp -50.000")).toBe(-50_000);
    });

    it("konsisten bolak-balik (roundtrip) dengan formatRupiah dan formatRupiahInput", () => {
      const nominal = 100_000_000;
      const formatted = formatRupiah(nominal);
      expect(parseRupiah(formatted)).toBe(nominal);

      const inputStr = formatRupiahInput(nominal);
      expect(parseRupiah(inputStr)).toBe(nominal);
      expect(formatRupiahInput(parseRupiah(inputStr))).toBe(inputStr);
    });
  });

  describe("formatDistance", () => {
    it("memformat jarak < 1000 meter ke dalam satuan meter (m)", () => {
      expect(formatDistance(0)).toBe("0 m");
      expect(formatDistance(45)).toBe("45 m");
      expect(formatDistance(199)).toBe("199 m");
      expect(formatDistance(500)).toBe("500 m");
      expect(formatDistance(999)).toBe("999 m");
    });

    it("membulatkan pecahan meter ke integer terdekat untuk jarak < 1000 meter", () => {
      expect(formatDistance(50.4)).toBe("50 m");
      expect(formatDistance(50.6)).toBe("51 m");
    });

    it("memformat jarak >= 1000 meter ke satuan kilometer (km)", () => {
      expect(formatDistance(1000)).toBe("1 km");
      expect(formatDistance(1500)).toBe("1.5 km");
      expect(formatDistance(2340)).toBe("2.3 km");
      expect(formatDistance(10000)).toBe("10 km");
    });

    it("menangani nilai negatif dan non-finite secara aman", () => {
      expect(formatDistance(-15)).toBe("0 m");
      expect(formatDistance(NaN)).toBe("0 m");
      expect(formatDistance(Infinity)).toBe("0 m");
    });
  });
});

