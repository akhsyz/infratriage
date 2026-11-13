import { describe, expect, it } from "vitest";
import {
  runCostRobustness,
  initRobustness,
  stepRobustness,
  finalizeRobustness,
  calculateJaccardPct,
  generateRobustnessSummary,
} from "../lib/infratriage/costRobustness";
import { buildClusters, generateSeedReports, generateSyntheticVitals } from "../lib/infratriage/seed";
import { buildBudgetPlan, getBudgetCandidates } from "../lib/infratriage/engine";
import type { Item } from "../lib/infratriage/knapsack";
import type { ScoreContext } from "../lib/infratriage/types";
import { DEFAULT_WEIGHTS } from "../lib/infratriage/config";

describe("costRobustness (lib/infratriage/costRobustness.ts)", () => {
  const baseNow = new Date("2026-11-05T00:00:00.000Z");
  const reports = generateSeedReports({ seed: 42, count: 150, now: baseNow });
  const vitals = generateSyntheticVitals({ seed: 42 });
  const clusters = buildClusters(reports);
  const ctx: ScoreContext = { vitals, weights: DEFAULT_WEIGHTS, now: baseNow };

  const seedCandidates = getBudgetCandidates(clusters, ctx);

  it("deterministik: dua pemanggilan dengan parameter sama menghasilkan keluaran identik persis", () => {
    const res1 = runCostRobustness(seedCandidates, 100_000_000, { seed: 42, trials: 100 });
    const res2 = runCostRobustness(seedCandidates, 100_000_000, { seed: 42, trials: 100 });

    expect(res1).toEqual(res2);
    expect(res1.metrics.avgJaccardPct).toBe(res2.metrics.avgJaccardPct);
    expect(res1.metrics.corePointCount).toBe(res2.metrics.corePointCount);
    expect(res1.summarySentence).toBe(res2.summarySentence);
  });

  it("gangguan nol (rentang 1,0 sampai 1,0) menghasilkan tumpang tindih 100% dan seluruh titik dasar menjadi titik inti", () => {
    const res = runCostRobustness(seedCandidates, 100_000_000, {
      perturbRange: [1.0, 1.0],
      trials: 50,
      seed: 123,
    });

    expect(res.metrics.avgJaccardPct).toBe(100);
    expect(res.metrics.minJaccardPct).toBe(100);
    expect(res.metrics.corePointCount).toBe(res.baseline.selectedIds.length);
    expect(res.metrics.corePointCount).toBe(res.metrics.baselinePointCount);
    expect(res.metrics.avgValueCoveragePct).toBeCloseTo(res.baseline.valueCoveragePct, 5);
    expect(res.metrics.avgCriticalCount).toBe(res.baseline.criticalCount);
    expect(res.summarySentence).toContain("tanpa gangguan biaya (0%)");
    expect(res.summarySentence).toContain("100% titik terpilih tetap sama");
  });

  it("semua metrik berada dalam rentang valid (0–100%)", () => {
    for (const budget of [50_000_000, 100_000_000, 250_000_000]) {
      const res = runCostRobustness(seedCandidates, budget, {
        trials: 50,
        perturbRange: [0.7, 1.3],
        seed: 42,
      });

      expect(res.metrics.avgJaccardPct).toBeGreaterThanOrEqual(0);
      expect(res.metrics.avgJaccardPct).toBeLessThanOrEqual(100);

      expect(res.metrics.minJaccardPct).toBeGreaterThanOrEqual(0);
      expect(res.metrics.minJaccardPct).toBeLessThanOrEqual(100);

      expect(res.metrics.minJaccardPct).toBeLessThanOrEqual(res.metrics.avgJaccardPct);

      expect(res.metrics.avgValueCoveragePct).toBeGreaterThanOrEqual(0);
      expect(res.metrics.avgValueCoveragePct).toBeLessThanOrEqual(100);

      expect(res.baseline.valueCoveragePct).toBeGreaterThanOrEqual(0);
      expect(res.baseline.valueCoveragePct).toBeLessThanOrEqual(100);
    }
  });

  it("titik inti selalu <= jumlah titik dasar", () => {
    for (const budget of [25_000_000, 100_000_000, 250_000_000]) {
      const res = runCostRobustness(seedCandidates, budget, {
        trials: 100,
        perturbRange: [0.7, 1.3],
        seed: 99,
      });

      expect(res.metrics.corePointCount).toBeLessThanOrEqual(res.metrics.baselinePointCount);
      expect(res.metrics.corePointCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("kandidat kosong ditangani dengan aman tanpa crash", () => {
    const res = runCostRobustness([], 100_000_000);

    expect(res.baseline.selectedIds).toHaveLength(0);
    expect(res.metrics.baselinePointCount).toBe(0);
    expect(res.metrics.corePointCount).toBe(0);
    expect(res.metrics.avgJaccardPct).toBe(100);
    expect(res.metrics.minJaccardPct).toBe(100);
    expect(res.summarySentence).toContain("Tidak ada titik rekomendasi pada hasil dasar");
  });

  it("anggaran terlalu kecil (tidak ada titik terpilih) ditangani dengan aman", () => {
    // Anggaran Rp 50.000 (di bawah harga termurah Rp 3.000.000)
    const res = runCostRobustness(seedCandidates, 50_000);

    expect(res.baseline.selectedIds).toHaveLength(0);
    expect(res.metrics.baselinePointCount).toBe(0);
    expect(res.metrics.corePointCount).toBe(0);
    expect(res.metrics.corePointCount).toBeLessThanOrEqual(res.metrics.baselinePointCount);
    expect(res.summarySentence).toContain("Tidak ada titik rekomendasi pada hasil dasar");
  });

  it("eksekusi terpotong (chunking accumulator) menghasilkan output yang persis sama dengan fungsi sinkron", () => {
    const syncRes = runCostRobustness(seedCandidates, 100_000_000, { trials: 100, seed: 42 });

    const acc = initRobustness(seedCandidates, 100_000_000, { trials: 100, seed: 42 });
    while (!stepRobustness(acc, 10)) {
      // lanjut potongan 10
    }
    const chunkRes = finalizeRobustness(acc);

    expect(chunkRes).toEqual(syncRes);
  });

  it("calculateJaccardPct menghitung irisan himpunan dengan benar", () => {
    const a = new Set(["1", "2", "3"]);
    const b = new Set(["2", "3", "4"]);
    // irisan = {2, 3} (2), gabungan = {1, 2, 3, 4} (4) -> 2/4 = 50%
    expect(calculateJaccardPct(a, b)).toBe(50);

    // Identik
    expect(calculateJaccardPct(a, a)).toBe(100);

    // Keduanya kosong
    expect(calculateJaccardPct(new Set(), new Set())).toBe(100);

    // Saling lepas
    expect(calculateJaccardPct(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("generateRobustnessSummary merangkum angka secara dinamis dalam satu kalimat", () => {
    const text = generateRobustnessSummary(100, [0.7, 1.3], 82.4, 15);
    expect(text).toBe("Dari 100 percobaan dengan biaya tiap titik meleset acak ±30%, rata-rata 82% titik terpilih tetap sama.");
  });

  it("n*(W+1) melewati batas memori perencana melempar RangeError sesuai perilaku knapsack", () => {
    // Kandidat sangat banyak dengan budget besar
    const hugeItems: Item[] = Array.from({ length: 100_000 }, (_, i) => ({
      id: `it-${i}`,
      value: 50,
      cost: 1_000_000,
    }));
    // Budget 1 milyar -> W = 10.000. n*(W+1) = 100.000 * 10.001 = 1.000.100.000 > 50.000.000
    expect(() => runCostRobustness(hugeItems, 1_000_000_000)).toThrow(RangeError);
  });

  it("verifikasi data seed pada anggaran 100 jt dan 250 jt", () => {
    // Anggaran 100 Jt
    const res100 = runCostRobustness(seedCandidates, 100_000_000, { trials: 100, seed: 42 });
    expect(res100.baseline.selectedIds).toHaveLength(21);
    expect(res100.baseline.totalCost).toBe(100_000_000);
    expect(res100.metrics.corePointCount).toBe(14);
    expect(Math.round(res100.metrics.avgJaccardPct)).toBe(77);
    expect(res100.summarySentence).toBe(
      "Dari 100 percobaan dengan biaya tiap titik meleset acak ±30%, rata-rata 77% titik terpilih tetap sama."
    );

    // Anggaran 250 Jt
    const res250 = runCostRobustness(seedCandidates, 250_000_000, { trials: 100, seed: 42 });
    expect(res250.baseline.selectedIds).toHaveLength(35);
    expect(res250.baseline.totalCost).toBe(249_000_000);
    expect(res250.metrics.corePointCount).toBe(32);
    expect(Math.round(res250.metrics.avgJaccardPct)).toBe(95);
    expect(res250.summarySentence).toBe(
      "Dari 100 percobaan dengan biaya tiap titik meleset acak ±30%, rata-rata 95% titik terpilih tetap sama."
    );
  });
});
