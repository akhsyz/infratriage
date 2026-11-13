import { describe, expect, it } from "vitest";
import {
  COST_TABLE,
  cloneCostTable,
  isCostTableModified,
  validateCostValue,
  estimateCost,
  MIN_COST,
  MAX_COST,
  type CostTable,
  DEFAULT_WEIGHTS,
} from "../lib/infratriage/config";
import { buildBudgetPlan, getBudgetCandidates } from "../lib/infratriage/engine";
import { buildClusters, generateSeedReports, generateSyntheticVitals } from "../lib/infratriage/seed";
import { appReducer, createInitialState } from "../lib/reducer";
import { buildDemoReports, DEMO_ANCHOR_SITE } from "../lib/demo";
import type { ScoreContext } from "../lib/infratriage/types";

describe("Tabel biaya yang dapat diedit (lib/infratriage/config.ts & reducer)", () => {
  const baseNow = new Date("2026-11-05T00:00:00.000Z");
  const reports = generateSeedReports({ seed: 42, count: 150, now: baseNow });
  const vitals = generateSyntheticVitals({ seed: 42 });
  const clusters = buildClusters(reports);
  const ctx: ScoreContext = { vitals, weights: DEFAULT_WEIGHTS, now: baseNow };

  it("dengan tabel bawaan, kandidat anggaran IDENTIK dengan perilaku sebelum perubahan", () => {
    // Rencana dengan default tanpa argumen opts.costTable
    const defaultPlan = buildBudgetPlan(clusters, ctx, 100_000_000);
    // Rencana dengan passing opts.costTable = cloneCostTable(COST_TABLE)
    const explicitPlan = buildBudgetPlan(clusters, ctx, 100_000_000, {
      costTable: cloneCostTable(COST_TABLE),
    });

    expect(defaultPlan.results).toEqual(explicitPlan.results);
    expect(defaultPlan.recommended.ids).toEqual(explicitPlan.recommended.ids);
    expect(defaultPlan.recommended.totalCost).toBe(explicitPlan.recommended.totalCost);
    expect(defaultPlan.recommended.totalValue).toBe(explicitPlan.recommended.totalValue);

    // Bandingkan biaya kandidat langsung
    const defaultCandidates = getBudgetCandidates(clusters, ctx);
    const explicitCandidates = getBudgetCandidates(clusters, ctx, {
      costTable: COST_TABLE,
    });
    expect(defaultCandidates).toEqual(explicitCandidates);
  });

  it("tabel khusus mengubah biaya kandidat sesuai nilai yang diatur", () => {
    const customTable = cloneCostTable(COST_TABLE);
    // Ubah biaya lubang ringan dari 3 jt menjadi 1 jt
    customTable.lubang[1] = 1_000_000;
    // Ubah biaya trotoar berat dari 25 jt menjadi 50 jt
    customTable.trotoar[3] = 50_000_000;

    expect(estimateCost("lubang", 1, customTable)).toBe(1_000_000);
    expect(estimateCost("trotoar", 3, customTable)).toBe(50_000_000);

    const candidates = getBudgetCandidates(clusters, ctx, { costTable: customTable });
    const lubangRingan = clusters.filter(
      (c) => c.status === "pending" && c.category === "lubang" && c.reports.every((r) => r.severity === 1)
    );

    if (lubangRingan.length > 0) {
      const match = candidates.find((it) => it.id === lubangRingan[0].id);
      expect(match?.cost).toBe(1_000_000);
    }
  });

  it("COST_TABLE tidak pernah termutasi setelah operasi modifikasi atau penyalinan", () => {
    const originalLubang1 = COST_TABLE.lubang[1];
    const originalDrainase3 = COST_TABLE.drainase[3];

    const copy = cloneCostTable(COST_TABLE);
    copy.lubang[1] = 999_999_999;
    copy.drainase[3] = 888_888_888;

    expect(COST_TABLE.lubang[1]).toBe(originalLubang1);
    expect(COST_TABLE.drainase[3]).toBe(originalDrainase3);
    expect(isCostTableModified(copy)).toBe(true);
    expect(isCostTableModified(COST_TABLE)).toBe(false);
  });

  it("validasi menolak nilai di bawah minimum (100 rb) dan di atas maksimum (1 M), serta non-integer", () => {
    // Valid
    expect(validateCostValue(MIN_COST).valid).toBe(true);
    expect(validateCostValue(MAX_COST).valid).toBe(true);
    expect(validateCostValue(5_000_000).valid).toBe(true);

    // Di bawah minimum
    const below = validateCostValue(99_999);
    expect(below.valid).toBe(false);
    expect(below.error).toContain("Minimum Rp 100.000");

    const zero = validateCostValue(0);
    expect(zero.valid).toBe(false);

    const negative = validateCostValue(-1_000_000);
    expect(negative.valid).toBe(false);

    // Di atas maksimum
    const above = validateCostValue(1_000_000_001);
    expect(above.valid).toBe(false);
    expect(above.error).toContain("Maksimum Rp 1.000.000.000");

    // Bukan bilangan bulat
    const floatVal = validateCostValue(1_500_000.5);
    expect(floatVal.valid).toBe(false);
    expect(floatVal.error).toContain("Harus berupa bilangan bulat");

    const nanVal = validateCostValue(NaN);
    expect(nanVal.valid).toBe(false);
  });

  describe("Reducer cost actions (SET_COST, RESET_COSTS, RESET, aksi demo)", () => {
    it("SET_COST yang valid memperbarui costTable di state", () => {
      let state = createInitialState(baseNow);
      expect(state.costTable.lubang[2]).toBe(COST_TABLE.lubang[2]);

      state = appReducer(state, {
        type: "SET_COST",
        payload: { category: "lubang", severity: 2, cost: 10_000_000 },
      });

      expect(state.costTable.lubang[2]).toBe(10_000_000);
      expect(isCostTableModified(state.costTable)).toBe(true);
    });

    it("SET_COST yang tidak valid (< MIN_COST, > MAX_COST, atau non-integer) ditolak tanpa mengubah state", () => {
      let state = createInitialState(baseNow);
      const originalCost = state.costTable.lubang[1];

      // Kurang dari MIN_COST
      const s1 = appReducer(state, {
        type: "SET_COST",
        payload: { category: "lubang", severity: 1, cost: 50_000 },
      });
      expect(s1.costTable.lubang[1]).toBe(originalCost);

      // Lebih dari MAX_COST
      const s2 = appReducer(state, {
        type: "SET_COST",
        payload: { category: "lubang", severity: 1, cost: 2_000_000_000 },
      });
      expect(s2.costTable.lubang[1]).toBe(originalCost);

      // Non-integer
      const s3 = appReducer(state, {
        type: "SET_COST",
        payload: { category: "lubang", severity: 1, cost: 5_000_000.75 },
      });
      expect(s3.costTable.lubang[1]).toBe(originalCost);
    });

    it("RESET_COSTS mengembalikan seluruh nilai biaya ke COST_TABLE bawaan", () => {
      let state = createInitialState(baseNow);
      state = appReducer(state, {
        type: "SET_COST",
        payload: { category: "trotoar", severity: 3, cost: 80_000_000 },
      });
      expect(state.costTable.trotoar[3]).toBe(80_000_000);
      expect(isCostTableModified(state.costTable)).toBe(true);

      state = appReducer(state, { type: "RESET_COSTS" });
      expect(state.costTable.trotoar[3]).toBe(COST_TABLE.trotoar[3]);
      expect(isCostTableModified(state.costTable)).toBe(false);
    });

    it("RESET mengembalikan costTable ke bawaan", () => {
      let state = createInitialState(baseNow);
      state = appReducer(state, {
        type: "SET_COST",
        payload: { category: "lampu_jalan", severity: 1, cost: 5_000_000 },
      });
      expect(state.costTable.lampu_jalan[1]).toBe(5_000_000);

      state = appReducer(state, { type: "RESET" });
      expect(state.costTable.lampu_jalan[1]).toBe(COST_TABLE.lampu_jalan[1]);
      expect(isCostTableModified(state.costTable)).toBe(false);
    });

    it("aksi demo tidak terpengaruh oleh keberadaan costTable", () => {
      let state = createInitialState(baseNow);
      state = appReducer(state, { type: "INIT_SEED" });

      const demoReports = buildDemoReports(10, baseNow, DEMO_ANCHOR_SITE.site);
      state = appReducer(state, { type: "INGEST", payload: demoReports[0] });
      state = appReducer(state, { type: "DEMO_START" });
      expect(state.demo.step).toBe(1);

      for (let i = 2; i <= 5; i++) {
        state = appReducer(state, {
          type: "DEMO_ADD_REPORTER",
          payload: demoReports[i - 1],
        });
      }
      expect(state.demo.step).toBe(5);

      // Ubah biaya saat demo berjalan
      state = appReducer(state, {
        type: "SET_COST",
        payload: { category: "lubang", severity: 2, cost: 12_000_000 },
      });
      expect(state.costTable.lubang[2]).toBe(12_000_000);
      expect(state.demo.step).toBe(5);

      // Reset demo
      state = appReducer(state, { type: "DEMO_RESET" });
      expect(state.demo.active).toBe(false);
      expect(state.demo.step).toBe(0);
    });
  });
});
