import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, setWeight, WEIGHT_KEYS, type Weights } from "../lib/weights";
import { validateWeights } from "../lib/infratriage/scoring";

describe("weights helper (lib/weights.ts)", () => {
  it("mengekspor DEFAULT_WEIGHTS yang sama dengan definisi mesin", () => {
    expect(DEFAULT_WEIGHTS).toEqual({
      bahaya: 0.3,
      kelas: 0.2,
      vital: 0.2,
      kerumunan: 0.2,
      usia: 0.1,
    });
    expect(() => validateWeights(DEFAULT_WEIGHTS)).not.toThrow();
  });

  it("tidak memutasi objek bobot asli (pure function)", () => {
    const original: Weights = { ...DEFAULT_WEIGHTS };
    const frozen = Object.freeze({ ...DEFAULT_WEIGHTS });
    const result = setWeight(frozen, "bahaya", 0.5);

    expect(result).not.toBe(frozen);
    expect(frozen).toEqual(original);
  });

  it("menskalakan 4 bobot lain secara proporsional saat satu bobot diubah", () => {
    const next = setWeight(DEFAULT_WEIGHTS, "bahaya", 0.5);

    expect(next.bahaya).toBe(0.5);

    // Sisa 0.5 dibagi proporsional ke 4 kunci lain yang total bobot awalnya 0.7
    // kelas: 0.2 -> (0.2 / 0.7) * 0.5 = 1/7
    // vital: 0.2 -> (0.2 / 0.7) * 0.5 = 1/7
    // kerumunan: 0.2 -> (0.2 / 0.7) * 0.5 = 1/7
    // usia: 0.1 -> (0.1 / 0.7) * 0.5 = 0.5/7
    expect(next.kelas).toBeCloseTo(1 / 7, 6);
    expect(next.vital).toBeCloseTo(1 / 7, 6);
    expect(next.kerumunan).toBeCloseTo(1 / 7, 6);
    expect(next.usia).toBeCloseTo(0.5 / 7, 6);

    const sum = Object.values(next).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(() => validateWeights(next)).not.toThrow();
  });

  it("ketika bobot disetel ke 1, bobot lainnya menjadi 0", () => {
    const next = setWeight(DEFAULT_WEIGHTS, "vital", 1);

    expect(next.vital).toBe(1);
    expect(next.bahaya).toBe(0);
    expect(next.kelas).toBe(0);
    expect(next.kerumunan).toBe(0);
    expect(next.usia).toBe(0);

    const sum = Object.values(next).reduce((a, b) => a + b, 0);
    expect(sum).toBe(1);
    expect(() => validateWeights(next)).not.toThrow();
  });

  it("ketika bobot disetel ke 0, 4 bobot lainnya diskalakan sehingga total tetap 1", () => {
    const next = setWeight(DEFAULT_WEIGHTS, "bahaya", 0);

    expect(next.bahaya).toBe(0);
    // Bobot lain yang tersisa (total 0.7) diskalakan menjadi 1.0 (dikali 1 / 0.7)
    expect(next.kelas).toBeCloseTo(0.2 / 0.7, 6);
    expect(next.vital).toBeCloseTo(0.2 / 0.7, 6);
    expect(next.kerumunan).toBeCloseTo(0.2 / 0.7, 6);
    expect(next.usia).toBeCloseTo(0.1 / 0.7, 6);

    const sum = Object.values(next).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(() => validateWeights(next)).not.toThrow();
  });

  it("membatasi nilai input ke rentang 0..1 (clamping)", () => {
    // Nilai > 1 dibatasi ke 1
    const over = setWeight(DEFAULT_WEIGHTS, "kelas", 1.8);
    expect(over.kelas).toBe(1);
    expect(over.bahaya).toBe(0);
    expect(() => validateWeights(over)).not.toThrow();

    // Nilai < 0 dibatasi ke 0
    const under = setWeight(DEFAULT_WEIGHTS, "kelas", -0.5);
    expect(under.kelas).toBe(0);
    expect(() => validateWeights(under)).not.toThrow();

    // Nilai non-finite (NaN, Infinity) dibatasi ke 0
    const nanVal = setWeight(DEFAULT_WEIGHTS, "usia", NaN);
    expect(nanVal.usia).toBe(0);
    expect(() => validateWeights(nanVal)).not.toThrow();
  });

  it("membagi rata ke 4 kunci lain jika semua sisa bobot lain bernilai nol", () => {
    // Keadaan awal di mana satu bobot bernilai 1 dan yang lain 0
    const allZeroOthers: Weights = {
      bahaya: 1,
      kelas: 0,
      vital: 0,
      kerumunan: 0,
      usia: 0,
    };

    // Ubah bobot 'bahaya' dari 1 menjadi 0.6
    // Sisa 0.4 harus dibagi rata ke 4 kunci lainnya (0.1 masing-masing)
    const next = setWeight(allZeroOthers, "bahaya", 0.6);

    expect(next.bahaya).toBe(0.6);
    expect(next.kelas).toBeCloseTo(0.1, 6);
    expect(next.vital).toBeCloseTo(0.1, 6);
    expect(next.kerumunan).toBeCloseTo(0.1, 6);
    expect(next.usia).toBeCloseTo(0.1, 6);

    const sum = Object.values(next).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(() => validateWeights(next)).not.toThrow();
  });

  it("menangani 100 kasus pengubahan acak berurutan dengan jumlah selalu 1", () => {
    // Simulasi pengguna menggeser slider secara acak berturut-turut sebanyak 100 kali
    let current = { ...DEFAULT_WEIGHTS };

    // Gunakan LCG sederhana (pseudo-random deterministik) agar tes selalu reproducible
    let seed = 12345;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < 100; i++) {
      const keyIndex = Math.floor(lcg() * WEIGHT_KEYS.length);
      const key = WEIGHT_KEYS[keyIndex];
      // Random value antara -0.2 sampai 1.2 (menguji clamping dan skala)
      const rawValue = lcg() * 1.4 - 0.2;

      current = setWeight(current, key, rawValue);

      // Verifikasi setiap langkah:
      // 1. Setiap nilai dalam 0..1
      for (const k of WEIGHT_KEYS) {
        expect(current[k]).toBeGreaterThanOrEqual(0);
        expect(current[k]).toBeLessThanOrEqual(1);
      }

      // 2. Jumlah selalu 1
      const sum = Object.values(current).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 7);

      // 3. Memenuhi validasi validator resmi mesin
      expect(() => validateWeights(current)).not.toThrow();
    }
  });

  it("menangani 100 kasus acak independen dari bobot acak awal", () => {
    let seed = 98765;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < 100; i++) {
      // Buat initial weights yang valid
      const raw = WEIGHT_KEYS.map(() => lcg());
      const rawSum = raw.reduce((a, b) => a + b, 0);
      const initial: Weights = {
        bahaya: raw[0] / rawSum,
        kelas: raw[1] / rawSum,
        vital: raw[2] / rawSum,
        kerumunan: raw[3] / rawSum,
        usia: raw[4] / rawSum,
      };

      const keyIndex = Math.floor(lcg() * WEIGHT_KEYS.length);
      const key = WEIGHT_KEYS[keyIndex];
      const targetVal = lcg();

      const result = setWeight(initial, key, targetVal);

      const sum = Object.values(result).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 7);
      expect(() => validateWeights(result)).not.toThrow();
    }
  });
});

