import { describe, expect, it } from "vitest";
import {
  compareStrategies,
  selectDP,
  selectFIFO,
  selectGreedy,
  selectTopScore,
  type Item,
} from "../lib/infratriage/knapsack";
import { createRng } from "../lib/infratriage/seed";

const M = 1_000_000;

/** Brute force 2^n sebagai pembanding kebenaran DP. */
function bruteForce(items: Item[], budget: number, unit = 100_000): number {
  const n = items.length;
  const W = Math.floor(budget / unit);
  let best = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    let w = 0;
    let v = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        w += Math.ceil(items[i].cost / unit);
        v += Math.round(items[i].value * 100);
      }
    }
    if (w <= W && v > best) best = v;
  }
  return best;
}

const scaled = (s: { ids: string[] }, items: Item[]) =>
  s.ids.reduce((sum, id) => sum + Math.round(items.find((i) => i.id === id)!.value * 100), 0);

describe("knapsack DP", () => {
  it("sama dengan brute force pada 200 kasus acak (n <= 10)", () => {
    const rng = createRng(7);
    for (let t = 0; t < 200; t++) {
      const n = 1 + Math.floor(rng() * 10);
      const items: Item[] = Array.from({ length: n }, (_, i) => ({
        id: `i${i}`,
        value: Math.round(rng() * 1000) / 10,
        cost: (1 + Math.floor(rng() * 25)) * 1_000_000 - Math.floor(rng() * 5) * 100_000,
      }));
      const budget = Math.floor(rng() * 60) * 1_000_000 + Math.floor(rng() * 10) * 100_000;
      const dp = selectDP(items, budget);
      expect(scaled(dp, items)).toBe(bruteForce(items, budget));
      expect(dp.totalCost).toBeLessThanOrEqual(budget);
    }
  });

  it("kasus klasik greedy gagal: DP menang", () => {
    const items: Item[] = [
      { id: "A", value: 60, cost: 6 * M },
      { id: "B", value: 50, cost: 5 * M },
      { id: "C", value: 50, cost: 5 * M },
    ];
    // rasio A = 10/M > B = C = 10/M? A=10, B=10, C=10 -> ubah agar A menang rasio
    items[0].value = 66; // rasio 11
    const g = selectGreedy(items, 10 * M);
    const dp = selectDP(items, 10 * M);
    expect(g.ids).toEqual(["A"]);
    expect(dp.ids.sort()).toEqual(["B", "C"]);
    expect(dp.totalValue).toBeGreaterThan(g.totalValue);
  });

  it("DP >= greedy, top-score, FIFO pada kasus acak", () => {
    const rng = createRng(99);
    for (let t = 0; t < 100; t++) {
      const items: Item[] = Array.from({ length: 15 }, (_, i) => ({
        id: `i${i}`,
        value: Math.round(rng() * 1000) / 10,
        cost: (1 + Math.floor(rng() * 25)) * 1_000_000,
        arrivedAt: new Date(2026, 0, 1 + Math.floor(rng() * 100)).toISOString(),
      }));
      const budget = 40 * M;
      const dp = scaled(selectDP(items, budget), items);
      expect(dp).toBeGreaterThanOrEqual(scaled(selectGreedy(items, budget), items));
      expect(dp).toBeGreaterThanOrEqual(scaled(selectTopScore(items, budget), items));
      expect(dp).toBeGreaterThanOrEqual(scaled(selectFIFO(items, budget), items));
    }
  });

  it("tepi: tanpa kandidat, anggaran nol, anggaran kurang dari satuan", () => {
    expect(selectDP([], 10 * M).ids).toEqual([]);
    expect(selectDP([{ id: "a", value: 50, cost: M }], 0).ids).toEqual([]);
    expect(selectDP([{ id: "a", value: 50, cost: M }], 50_000).ids).toEqual([]);
  });

  it("biaya dibulatkan ke atas: tidak pernah melebihi anggaran", () => {
    const items: Item[] = [{ id: "a", value: 50, cost: 1_050_000 }];
    expect(selectDP(items, 1_000_000).ids).toEqual([]);
    expect(selectDP(items, 1_100_000).ids).toEqual(["a"]);
  });

  it("kandidat tunggal yang pas dengan anggaran terpilih", () => {
    expect(selectDP([{ id: "a", value: 50, cost: 3 * M }], 3 * M).ids).toEqual(["a"]);
  });

  it("input tidak valid ditolak", () => {
    expect(() => selectDP([{ id: "a", value: 1, cost: 0 }], M)).toThrow();
    expect(() => selectDP([{ id: "a", value: -1, cost: M }], M)).toThrow();
    expect(() => selectDP([{ id: "a", value: 1, cost: M }, { id: "a", value: 2, cost: M }], M)).toThrow();
    expect(() => selectGreedy([], -1)).toThrow();
  });

  it("skala demo (200 kandidat, Rp 500 juta) selesai < 1 detik", () => {
    const rng = createRng(5);
    const items: Item[] = Array.from({ length: 200 }, (_, i) => ({
      id: `i${i}`,
      value: rng() * 100,
      cost: (3 + Math.floor(rng() * 22)) * M,
    }));
    const t0 = performance.now();
    selectDP(items, 500 * M);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});

describe("strategi lain", () => {
  const items: Item[] = [
    { id: "old-low", value: 20, cost: 4 * M, arrivedAt: "2026-01-01T00:00:00Z" },
    { id: "new-high", value: 95, cost: 4 * M, arrivedAt: "2026-06-01T00:00:00Z" },
  ];
  it("FIFO mendanai yang paling lama dulu", () => {
    expect(selectFIFO(items, 4 * M).ids).toEqual(["old-low"]);
  });
  it("top-score mendanai skor tertinggi dulu", () => {
    expect(selectTopScore(items, 4 * M).ids).toEqual(["new-high"]);
  });
});

describe("compareStrategies", () => {
  it("metrik konsisten", () => {
    const items: Item[] = [
      { id: "a", value: 90, cost: 5 * M, arrivedAt: "2026-01-01T00:00:00Z" },
      { id: "b", value: 85, cost: 5 * M, arrivedAt: "2026-01-02T00:00:00Z" },
      { id: "c", value: 30, cost: 1 * M, arrivedAt: "2026-01-03T00:00:00Z" },
    ];
    const res = compareStrategies(items, 10 * M);
    expect(res).toHaveLength(4);
    const dp = res[0];
    expect(dp.key).toBe("dp");
    expect(dp.criticalTotal).toBe(2);
    expect(dp.criticalCount).toBe(2);
    expect(dp.budgetUsedPct).toBeCloseTo(100, 6);
    expect(dp.valueCoveragePct).toBeCloseTo((175 / 205) * 100, 6);
    for (const r of res) {
      expect(r.budgetUsedPct).toBeLessThanOrEqual(100 + 1e-9);
      expect(r.valueCoveragePct).toBeLessThanOrEqual(100 + 1e-9);
    }
  });
  it("tanpa kandidat tidak menghasilkan NaN", () => {
    for (const r of compareStrategies([], 10 * M)) {
      expect(r.valueCoveragePct).toBe(0);
      expect(r.budgetUsedPct).toBe(0);
    }
  });
});
