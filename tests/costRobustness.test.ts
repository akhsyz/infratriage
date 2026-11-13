import { describe, expect, it } from "vitest";
import {
  runCostRobustness,
  initRobustness,
  stepRobustness,
  finalizeRobustness,
  calculateJaccardPct,
  calculatePercentile,
  generateRobustnessSummary,
} from "../lib/infratriage/costRobustness";
import { buildClusters, generateSeedReports, generateSyntheticVitals } from "../lib/infratriage/seed";
import { getBudgetCandidates } from "../lib/infratriage/engine";
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
    expect(res1.metrics.avgCostOverrunPct).toBe(res2.metrics.avgCostOverrunPct);
    expect(res1.metrics.p90CostOverrunPct).toBe(res2.metrics.p90CostOverrunPct);
    expect(res1.metrics.maxCostOverrunPct).toBe(res2.metrics.maxCostOverrunPct);
    expect(res1.metrics.overBudgetPct).toBe(res2.metrics.overBudgetPct);
    expect(res1.summarySentence).toBe(res2.summarySentence);
  });

  it("gangguan nol (rentang 1,0 sampai 1,0) menghasilkan kelebihan biaya <= 0 pada semua percobaan dan persentase melebihi pagu = 0", () => {
    const res = runCostRobustness(seedCandidates, 100_000_000, {
      perturbRange: [1.0, 1.0],
      trials: 50,
      seed: 123,
    });

    expect(res.metrics.avgJaccardPct).toBe(100);
    expect(res.metrics.minJaccardPct).toBe(100);
    expect(res.metrics.corePointCount).toBe(res.baseline.selectedIds.length);
    expect(res.metrics.corePointCount).toBe(res.metrics.baselinePointCount);
    expect(res.metrics.avgCostOverrunPct).toBeLessThanOrEqual(0);
    expect(res.metrics.p90CostOverrunPct).toBeLessThanOrEqual(0);
    expect(res.metrics.maxCostOverrunPct).toBeLessThanOrEqual(0);
    expect(res.metrics.overBudgetPct).toBe(0);
    expect(res.summarySentence).toContain("tanpa gangguan biaya (0%)");
    expect(res.summarySentence).toContain("100% titik terpilih tetap sama");
    expect(res.summarySentence).toContain("Total biaya rencana dasar tetap berada dalam pagu");
  });

  it("metrik kelebihan biaya dan persentase berada dalam rentang valid", () => {
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

      expect(res.metrics.overBudgetPct).toBeGreaterThanOrEqual(0);
      expect(res.metrics.overBudgetPct).toBeLessThanOrEqual(100);

      // max >= p90 >= avg
      expect(res.metrics.maxCostOverrunPct).toBeGreaterThanOrEqual(res.metrics.p90CostOverrunPct);
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
    expect(res.metrics.avgCostOverrunPct).toBe(0);
    expect(res.metrics.p90CostOverrunPct).toBe(0);
    expect(res.metrics.maxCostOverrunPct).toBe(0);
    expect(res.metrics.overBudgetPct).toBe(0);
    expect(res.summarySentence).toContain("Tidak ada titik rekomendasi pada hasil dasar");
  });

  it("anggaran terlalu kecil (tidak ada titik terpilih pada hasil dasar) ditangani dengan aman", () => {
    // Anggaran Rp 50.000 (di bawah harga termurah Rp 3.000.000)
    const res = runCostRobustness(seedCandidates, 50_000);

    expect(res.baseline.selectedIds).toHaveLength(0);
    expect(res.metrics.baselinePointCount).toBe(0);
    expect(res.metrics.corePointCount).toBe(0);
    expect(res.metrics.avgCostOverrunPct).toBe(0);
    expect(res.metrics.p90CostOverrunPct).toBe(0);
    expect(res.metrics.maxCostOverrunPct).toBe(0);
    expect(res.metrics.overBudgetPct).toBe(0);
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
    expect(calculateJaccardPct(a, b)).toBe(50);
    expect(calculateJaccardPct(a, a)).toBe(100);
    expect(calculateJaccardPct(new Set(), new Set())).toBe(100);
    expect(calculateJaccardPct(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("calculatePercentile menghitung persentil linier dengan benar", () => {
    expect(calculatePercentile([], 90)).toBe(0);
    expect(calculatePercentile([10], 90)).toBe(10);

    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // p90 dari 1-10: index = 0.9 * 9 = 8.1 -> vals[8] + 0.1*(vals[9]-vals[8]) = 9 + 0.1*1 = 9.1
    expect(calculatePercentile(vals, 90)).toBeCloseTo(9.1, 5);
  });

  it("generateRobustnessSummary merangkum dua kalimat otomatis secara dinamis", () => {
    const text = generateRobustnessSummary(100, [0.7, 1.3], 77.0, 21, 8.4);
    expect(text).toBe(
      "Dari 100 percobaan dengan biaya tiap titik meleset acak ±30%, rata-rata 77% titik terpilih tetap sama. " +
      "Bila biaya aktual tiap titik meleset acak ±30%, total biaya rencana dasar dapat melampaui pagu hingga 8% (persentil 90); cadangan sekitar 8% dari pagu mengurangi risiko itu."
    );
  });

  it("n*(W+1) melewati batas memori perencana melempar RangeError sesuai perilaku knapsack", () => {
    const hugeItems: Item[] = Array.from({ length: 100_000 }, (_, i) => ({
      id: `it-${i}`,
      value: 50,
      cost: 1_000_000,
    }));
    expect(() => runCostRobustness(hugeItems, 1_000_000_000)).toThrow(RangeError);
  });

  it("verifikasi data seed pada anggaran 100 jt dan 250 jt", () => {
    const res100 = runCostRobustness(seedCandidates, 100_000_000, { trials: 100, seed: 42 });
    expect(res100.baseline.selectedIds).toHaveLength(21);
    expect(res100.baseline.totalCost).toBe(100_000_000);
    expect(res100.metrics.corePointCount).toBe(14);
    expect(Math.round(res100.metrics.avgJaccardPct)).toBe(77);
    expect(res100.metrics.p90CostOverrunPct).toBeCloseTo(5.423, 2);
    expect(res100.metrics.overBudgetPct).toBe(44);
    expect(res100.summarySentence).toBe(
      "Dari 100 percobaan dengan biaya tiap titik meleset acak ±30%, rata-rata 77% titik terpilih tetap sama. " +
      "Bila biaya aktual tiap titik meleset acak ±30%, total biaya rencana dasar dapat melampaui pagu hingga 5% (persentil 90); cadangan sekitar 5% dari pagu mengurangi risiko itu."
    );

    const res250 = runCostRobustness(seedCandidates, 250_000_000, { trials: 100, seed: 42 });
    expect(res250.baseline.selectedIds).toHaveLength(35);
    expect(res250.baseline.totalCost).toBe(249_000_000);
    expect(res250.metrics.corePointCount).toBe(32);
    expect(Math.round(res250.metrics.avgJaccardPct)).toBe(95);
    expect(res250.metrics.p90CostOverrunPct).toBeCloseTo(3.95, 2);
    expect(res250.metrics.overBudgetPct).toBe(48);
    expect(res250.summarySentence).toBe(
      "Dari 100 percobaan dengan biaya tiap titik meleset acak ±30%, rata-rata 95% titik terpilih tetap sama. " +
      "Bila biaya aktual tiap titik meleset acak ±30%, total biaya rencana dasar dapat melampaui pagu hingga 4% (persentil 90); cadangan sekitar 4% dari pagu mengurangi risiko itu."
    );
  });
});
