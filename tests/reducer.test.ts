import { describe, expect, it } from "vitest";
import {
  appReducer,
  createInitialState,
  type AppState,
} from "../lib/reducer";
import {
  buildBudgetPlan,
  DEFAULT_WEIGHTS,
  type Report,
  type ScoreContext,
} from "../lib/infratriage";
import { vitals } from "../lib/vitals";

describe("appReducer (lib/reducer.ts)", () => {
  const baseNow = new Date("2026-11-05T00:00:00.000Z");

  const sampleReport = (over: Partial<Report> = {}): Report => ({
    id: "r-1",
    reporterId: "u-1",
    category: "lubang",
    severity: 2,
    roadClass: "arteri",
    lat: -7.785,
    lng: 110.36,
    createdAt: baseNow.toISOString(),
    ...over,
  });

  it("INIT_SEED mengisi state.reports dan state.clusters dari data seed", () => {
    const state = createInitialState(baseNow);
    expect(state.reports.length).toBe(0);
    expect(state.clusters.length).toBe(0);

    const seeded = appReducer(state, { type: "INIT_SEED" });
    expect(seeded.reports.length).toBeGreaterThan(0);
    expect(seeded.clusters.length).toBeGreaterThan(0);
  });

  it("INGEST membuat klaster baru jika belum ada klaster di dekatnya", () => {
    const state = createInitialState(baseNow);
    const rep = sampleReport({ id: "rep-alpha", lat: -7.75, lng: 110.35 });

    const next = appReducer(state, { type: "INGEST", payload: rep });
    expect(next.clusters.length).toBe(1);
    expect(next.reports.length).toBe(1);
    expect(next.selectedClusterId).toBe(next.clusters[0].id);

    expect(next.toast).not.toBeNull();
    expect(next.toast?.variant).toBe("success");
    expect(next.toast?.message).toContain("Klaster baru dibuat");
  });

  it("INGEST menggabungkan laporan ke klaster yang berdekatan", () => {
    const state = createInitialState(baseNow);
    // Laporan 1 membuat klaster
    const r1 = sampleReport({ id: "rep-1", reporterId: "user-1", lat: -7.785, lng: 110.36 });
    const s1 = appReducer(state, { type: "INGEST", payload: r1 });

    // Laporan 2 berjarak ~5-10 m (kategori sama: lubang)
    const r2 = sampleReport({
      id: "rep-2",
      reporterId: "user-2",
      lat: -7.78505,
      lng: 110.36005,
    });
    const s2 = appReducer(s1, { type: "INGEST", payload: r2 });

    expect(s2.clusters.length).toBe(1);
    expect(s2.clusters[0].reports.length).toBe(2);
    expect(s2.toast?.variant).toBe("success");
    expect(s2.toast?.message).toContain("Laporan digabung ke klaster");
    expect(s2.toast?.message).toContain("skor");
  });

  it("INGEST dengan ID laporan yang sama diabaikan (variant 'ignored')", () => {
    const state = createInitialState(baseNow);
    const r1 = sampleReport({ id: "rep-dup", reporterId: "u-1" });
    const s1 = appReducer(state, { type: "INGEST", payload: r1 });
    expect(s1.toast?.variant).toBe("success");

    // Kirim ulang id yang sama
    const s2 = appReducer(s1, { type: "INGEST", payload: r1 });
    expect(s2.toast?.variant).toBe("ignored");
    expect(s2.toast?.message).toContain("Laporan ini sudah tercatat, diabaikan");
    // Klaster dan reports tidak bertambah
    expect(s2.clusters.length).toBe(s1.clusters.length);
    expect(s2.reports.length).toBe(s1.reports.length);
  });

  it("SCHEDULE_PLAN mengubah status klaster terpilih menjadi 'scheduled' dan mengeluarkannya dari kandidat", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });

    const ctx: ScoreContext = {
      vitals,
      weights: state.weights,
      now: state.now,
    };

    const initialPlan = buildBudgetPlan(state.clusters, ctx, state.budget);
    const chosenIds = initialPlan.recommended.ids;
    expect(chosenIds.length).toBeGreaterThan(0);

    const initialPendingCount = state.clusters.filter((c) => c.status === "pending").length;

    // Jalankan SCHEDULE_PLAN
    const nextState = appReducer(state, {
      type: "SCHEDULE_PLAN",
      payload: { ids: chosenIds },
    });

    // Periksa status klaster telah berubah ke 'scheduled'
    for (const id of chosenIds) {
      const cl = nextState.clusters.find((c) => c.id === id);
      expect(cl?.status).toBe("scheduled");
    }

    // Periksa kandidat pending berkurang
    const newPendingCount = nextState.clusters.filter((c) => c.status === "pending").length;
    expect(newPendingCount).toBe(initialPendingCount - chosenIds.length);

    // Pada kalkulasi anggaran berikutnya, klaster 'scheduled' tidak lagi masuk kandidat
    const nextPlan = buildBudgetPlan(nextState.clusters, ctx, state.budget);
    for (const id of chosenIds) {
      expect(nextPlan.recommended.ids.includes(id)).toBe(false);
    }

    expect(nextState.toast?.variant).toBe("success");
    expect(nextState.toast?.message).toContain("titik dijadwalkan");
  });

  it("DISMISS_TOAST dengan id lama tidak menghapus toast yang lebih baru", () => {
    const state: AppState = {
      ...createInitialState(baseNow),
      toast: {
        id: 42,
        message: "Pesan terbaru",
        variant: "success",
      },
    };

    // Dispatch id yang tidak cocok (id lama misal 41)
    const afterOldDismiss = appReducer(state, {
      type: "DISMISS_TOAST",
      payload: { id: 41 },
    });
    expect(afterOldDismiss.toast).not.toBeNull();
    expect(afterOldDismiss.toast?.id).toBe(42);

    // Dispatch id yang cocok (42)
    const afterMatchingDismiss = appReducer(state, {
      type: "DISMISS_TOAST",
      payload: 42,
    });
    expect(afterMatchingDismiss.toast).toBeNull();
  });

  it("RESET mengembalikan seed awal dan parameter default", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });

    // Modifikasi state
    state = appReducer(state, { type: "SET_BUDGET", payload: 500_000_000 });
    state = appReducer(state, {
      type: "SET_WEIGHT",
      payload: { key: "bahaya", value: 0.8 },
    });
    state = appReducer(state, { type: "RUN_PLAN" });
    expect(state.budget).toBe(500_000_000);
    expect(state.weights.bahaya).toBe(0.8);
    expect(state.planRequested).toBe(true);

    // Reset
    const resetState = appReducer(state, { type: "RESET" });
    expect(resetState.budget).toBe(100_000_000);
    expect(resetState.weights).toEqual(DEFAULT_WEIGHTS);
    expect(resetState.planRequested).toBe(false);
    expect(resetState.clusters.length).toBeGreaterThan(0);
    expect(resetState.toast).toBeNull();
  });
});

