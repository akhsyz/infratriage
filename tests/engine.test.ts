import { describe, expect, it } from "vitest";
import { buildBudgetPlan, ingestReport, rankClusters } from "../lib/infratriage/engine";
import { rankingStability, spearman } from "../lib/infratriage/sensitivity";
import {
  buildClusters,
  generateSeedReports,
  generateSyntheticVitals,
} from "../lib/infratriage/seed";
import type { Cluster } from "../lib/infratriage/types";
import { ctx, NOW, ORIGIN, report } from "./helpers";

describe("ingestReport: skenario demo", () => {
  it("laporan ke-10 dari pelapor unik menaikkan 63 -> 81 (tinggi -> kritis)", () => {
    let clusters: Cluster[] = [];
    const c = ctx();
    const first = ingestReport(clusters, report({ id: "r1", reporterId: "u1" }), c);
    expect(first.action).toBe("created");
    expect(first.scoreBefore).toBeNull();
    expect(Math.round(first.scoreAfter)).toBe(63);
    clusters = first.clusters;

    for (let i = 2; i <= 9; i++) {
      clusters = ingestReport(clusters, report({ id: `r${i}`, reporterId: `u${i}` }), c).clusters;
    }
    const tenth = ingestReport(clusters, report({ id: "r10", reporterId: "u10" }), c);
    expect(tenth.action).toBe("merged");
    expect(tenth.levelBefore).toBe("tinggi");
    expect(tenth.levelAfter).toBe("kritis");
    expect(Math.round(tenth.scoreAfter)).toBe(81);
  });

  it("kirim ulang laporan yang sama tidak mengubah skor", () => {
    const c = ctx();
    const a = ingestReport([], report({ id: "r1" }), c);
    const b = ingestReport(a.clusters, report({ id: "r1" }), c);
    expect(b.action).toBe("ignored");
    expect(b.scoreAfter).toBeCloseTo(a.scoreAfter, 9);
  });
});

describe("data seed + peringkat", () => {
  const reports = generateSeedReports({ seed: 42, count: 150, now: NOW });
  const vitals = generateSyntheticVitals({ seed: 42 });
  const clusters = buildClusters(reports);
  const c = ctx({ vitals });

  it("deterministik untuk seed yang sama", () => {
    const again = generateSeedReports({ seed: 42, count: 150, now: NOW });
    expect(again).toEqual(reports);
  });

  it("menghasilkan jumlah laporan yang diminta dan klaster lebih sedikit dari laporan", () => {
    expect(reports).toHaveLength(150);
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters.length).toBeLessThan(150);
    expect(clusters.reduce((s, x) => s + x.reports.length, 0)).toBe(150);
  });

  it("rankClusters terurut turun dan mengecualikan resolved", () => {
    const withResolved: Cluster[] = clusters.map((x, i) => (i === 0 ? { ...x, status: "resolved" } : x));
    const ranked = rankClusters(withResolved, c);
    expect(ranked).toHaveLength(clusters.length - 1);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].detail.urgency).toBeGreaterThanOrEqual(ranked[i].detail.urgency);
    }
  });

  it("rencana anggaran: DP tidak lebih buruk dari strategi lain dan tidak melebihi anggaran", () => {
    const plan = buildBudgetPlan(clusters, c, 200_000_000);
    const [dp, ...others] = plan.results;
    expect(dp.totalCost).toBeLessThanOrEqual(200_000_000);
    for (const o of others) expect(dp.totalValue).toBeGreaterThanOrEqual(o.totalValue - 1e-6);
  });

  it("klaster 'scheduled' tidak menjadi kandidat anggaran", () => {
    const sched = clusters.map((x) => ({ ...x, status: "scheduled" as const }));
    expect(buildBudgetPlan(sched, c, 100_000_000).candidates).toBe(0);
  });
});

describe("sensitivitas bobot", () => {
  const clusters = buildClusters(generateSeedReports({ seed: 11, count: 120, now: NOW }));
  const c = ctx({ vitals: generateSyntheticVitals({ seed: 11 }) });

  it("delta = 0 -> peringkat identik", () => {
    const r = rankingStability(clusters, c, { delta: 0, k: 10 });
    expect(r.minTopKOverlap).toBe(1);
    expect(r.avgSpearman).toBeCloseTo(1, 9);
  });

  it("delta 20% menghasilkan 10 skenario dengan metrik di rentang valid", () => {
    const r = rankingStability(clusters, c, { delta: 0.2, k: 10 });
    expect(r.scenarios).toHaveLength(10);
    for (const s of r.scenarios) {
      expect(s.topKOverlap).toBeGreaterThanOrEqual(0);
      expect(s.topKOverlap).toBeLessThanOrEqual(1);
      expect(s.spearman).toBeLessThanOrEqual(1 + 1e-9);
      expect(s.spearman).toBeGreaterThanOrEqual(-1 - 1e-9);
    }
    expect(r.mostSensitive).not.toBeNull();
  });

  it("spearman: urutan sama = 1, terbalik = -1", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 9);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 9);
  });

  it("tanpa klaster aktif tidak error", () => {
    expect(() => rankingStability([], ctx())).not.toThrow();
  });
});

describe("kontrol akal sehat", () => {
  it("titik acuan uji berada di Yogyakarta (sanity check koordinat)", () => {
    expect(ORIGIN.lat).toBeLessThan(0);
  });
});
