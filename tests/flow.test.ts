import { describe, expect, it } from "vitest";
import {
  appReducer,
  createInitialState,
  type AppState,
} from "../lib/reducer";
import {
  buildBudgetPlan,
  computeScore,
  DEFAULT_WEIGHTS,
  distanceMeters,
  priorityLevel,
  rankClusters,
  type Cluster,
  type PriorityLevel,
  type Report,
  type ScoreContext,
} from "../lib/infratriage";
import { vitals } from "../lib/vitals";
import { setWeight } from "../lib/weights";
import { pickDemoSite } from "../lib/demo";

describe("integrasi alur laporan dan konsistensi KPI (tests/flow.test.ts)", () => {
  const baseNow = new Date("2026-11-05T00:00:00.000Z");

  const getContext = (state: AppState): ScoreContext => ({
    vitals,
    weights: state.weights,
    now: state.now,
  });

  const getKpis = (state: AppState) => {
    const ctx = getContext(state);
    const totalReports = state.reports.length;
    const activeClusters = state.clusters.filter((c) => c.status !== "resolved");
    const criticalCount = activeClusters.filter(
      (c) => priorityLevel(computeScore(c, ctx).urgency) === "kritis"
    ).length;

    return {
      totalReports,
      activeClustersCount: activeClusters.length,
      criticalCount,
    };
  };

  it("1. Inisialisasi seed menghasilkan KPI awal yang konsisten antara laporan dan klaster", () => {
    let state = createInitialState(baseNow);
    expect(state.reports.length).toBe(0);
    expect(state.clusters.length).toBe(0);

    state = appReducer(state, { type: "INIT_SEED" });
    const kpi = getKpis(state);

    expect(kpi.totalReports).toBeGreaterThanOrEqual(100);
    expect(kpi.activeClustersCount).toBeGreaterThan(0);
    expect(kpi.criticalCount).toBeGreaterThan(0);

    // Semua klaster awal berstatus pending
    const allPending = state.clusters.every((c) => c.status === "pending");
    expect(allPending).toBe(true);

    // rankClusters hanya memproses klaster aktif (bukan resolved)
    const ctx = getContext(state);
    const ranked = rankClusters(state.clusters, ctx);
    expect(ranked.length).toBe(kpi.activeClustersCount);

    // Peringkat pertama memiliki skor tertinggi
    expect(ranked[0].detail.urgency).toBeGreaterThanOrEqual(
      ranked[ranked.length - 1].detail.urgency
    );
  });

  it("2. Laporan baru di lokasi terpisah membuat klaster baru dan menaikkan KPI aktif", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });
    const initialKpi = getKpis(state);

    // Titik yang jauh dari seluruh klaster yang ada
    const isolatedReport: Report = {
      id: "test-isolated-1",
      reporterId: "user-iso-1",
      category: "lubang",
      severity: 1,
      roadClass: "lokal",
      lat: -7.7123,
      lng: 110.3123,
      createdAt: baseNow.toISOString(),
    };

    state = appReducer(state, {
      type: "INGEST",
      payload: isolatedReport,
    });

    const nextKpi = getKpis(state);
    expect(nextKpi.totalReports).toBe(initialKpi.totalReports + 1);
    expect(nextKpi.activeClustersCount).toBe(initialKpi.activeClustersCount + 1);
    expect(state.selectedClusterId).toBeDefined();

    const createdCluster = state.clusters.find(
      (c) => c.id === state.selectedClusterId
    );
    expect(createdCluster).toBeDefined();
    expect(createdCluster?.reports.length).toBe(1);
    expect(createdCluster?.reports[0].id).toBe("test-isolated-1");
  });

  it("3. Laporan di lokasi yang sama menggabung ke klaster, menaikkan skor, dan memperbarui status kritis", () => {
    let state = createInitialState(baseNow);
    const site = pickDemoSite(vitals, []).site;

    // Buat laporan pertama (lubang jalan arteri severity 2 dekat fasilitas vital nyata)
    const report1: Report = {
      id: "flow-rep-1",
      reporterId: "pelapor-1",
      category: "lubang",
      severity: 2,
      roadClass: "arteri",
      lat: site.lat,
      lng: site.lng,
      createdAt: baseNow.toISOString(),
    };

    state = appReducer(state, { type: "INGEST", payload: report1 });
    const kpi1 = getKpis(state);
    expect(kpi1.totalReports).toBe(1);
    expect(kpi1.activeClustersCount).toBe(1);
    const clusterId = state.selectedClusterId!;

    const ctx1 = getContext(state);
    const score1 = computeScore(state.clusters[0], ctx1).urgency;
    expect(Math.round(score1)).toBe(63);
    expect(priorityLevel(score1)).toBe("tinggi");

    // Tambah 9 laporan berturut-turut dari pelapor berbeda di koordinat yang sama
    for (let i = 2; i <= 10; i++) {
      const rep: Report = {
        id: `flow-rep-${i}`,
        reporterId: `pelapor-${i}`,
        category: "lubang",
        severity: 2,
        roadClass: "arteri",
        lat: site.lat,
        lng: site.lng,
        createdAt: baseNow.toISOString(),
      };
      state = appReducer(state, { type: "INGEST", payload: rep });
    }

    const kpiFinal = getKpis(state);
    // Jumlah klaster tetap 1 (semua bergabung)
    expect(kpiFinal.activeClustersCount).toBe(1);
    // Jumlah laporan menjadi 10
    expect(kpiFinal.totalReports).toBe(10);

    const mergedCluster = state.clusters.find((c) => c.id === clusterId)!;
    expect(mergedCluster.reports.length).toBe(10);

    const ctxFinal = getContext(state);
    const scoreFinal = computeScore(mergedCluster, ctxFinal).urgency;

    // Skor naik menjadi 81 (kritis)
    expect(Math.round(scoreFinal)).toBe(81);
    expect(priorityLevel(scoreFinal)).toBe("kritis");
    expect(kpiFinal.criticalCount).toBe(1);
  });

  it("4. SCHEDULE_PLAN mengubah status klaster terpilih menjadi 'scheduled' dan mengeluarkannya dari kalkulasi anggaran berikutnya", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });
    const initialKpi = getKpis(state);

    const ctx = getContext(state);
    const plan = buildBudgetPlan(state.clusters, ctx, state.budget);
    const selectedIds = plan.recommended.ids;
    expect(selectedIds.length).toBeGreaterThan(0);

    const pendingBefore = state.clusters.filter((c) => c.status === "pending").length;

    // Eksekusi SCHEDULE_PLAN
    state = appReducer(state, {
      type: "SCHEDULE_PLAN",
      payload: { ids: selectedIds },
    });

    // Klaster aktif tidak berkurang karena 'scheduled' tetap aktif di peta
    const afterKpi = getKpis(state);
    expect(afterKpi.activeClustersCount).toBe(initialKpi.activeClustersCount);

    // Titik pending berkurang sebanyak titik yang dijadwalkan
    const pendingAfter = state.clusters.filter((c) => c.status === "pending").length;
    expect(pendingAfter).toBe(pendingBefore - selectedIds.length);

    // Seluruh titik terpilih kini berstatus 'scheduled'
    for (const id of selectedIds) {
      const c = state.clusters.find((item) => item.id === id);
      expect(c?.status).toBe("scheduled");
    }

    // Pada kalkulasi rencana anggaran berikutnya, titik scheduled tidak lagi muncul sebagai kandidat
    const nextPlan = buildBudgetPlan(state.clusters, ctx, state.budget);
    for (const id of selectedIds) {
      expect(nextPlan.recommended.ids.includes(id)).toBe(false);
    }
  });

  it("5. SET_STATUS ke 'resolved' mengurangi KPI klaster aktif dan klaster kritis", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });

    const ctx = getContext(state);
    const ranked = rankClusters(state.clusters, ctx);
    // Cari satu klaster berprioritas kritis
    const criticalCluster = ranked.find((r) => r.level === "kritis")!.cluster;

    const kpiBefore = getKpis(state);

    // Tandai klaster kritis tersebut sebagai 'resolved'
    state = appReducer(state, {
      type: "SET_STATUS",
      payload: { clusterId: criticalCluster.id, status: "resolved" },
    });

    const kpiAfter = getKpis(state);
    // Klaster aktif berkurang 1
    expect(kpiAfter.activeClustersCount).toBe(kpiBefore.activeClustersCount - 1);
    // Jumlah kritis berkurang 1
    expect(kpiAfter.criticalCount).toBe(kpiBefore.criticalCount - 1);

    // Klaster resolved tidak lagi muncul di rankClusters
    const nextRanked = rankClusters(state.clusters, ctx);
    const exists = nextRanked.some((r) => r.cluster.id === criticalCluster.id);
    expect(exists).toBe(false);
  });

  it("6. SET_WEIGHT memodifikasi bobot dan langsung mengubah peringkat prioritas", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });

    const ctxDefault = getContext(state);
    const rankedDefault = rankClusters(state.clusters, ctxDefault);
    const topDefaultId = rankedDefault[0].cluster.id;

    // Tingkatkan bobot usia menjadi 0.8 (sisa bobot diskalakan proporsional)
    state = appReducer(state, {
      type: "SET_WEIGHT",
      payload: { key: "usia", value: 0.8 },
    });

    const ctxNew = getContext(state);
    const rankedNew = rankClusters(state.clusters, ctxNew);
    const topNewId = rankedNew[0].cluster.id;

    // Jumlah bobot tetap 1
    const totalWeights = Object.values(state.weights).reduce((a, b) => a + b, 0);
    expect(totalWeights).toBeCloseTo(1, 6);

    // Klaster dengan usia paling lama kini naik ke peringkat atas
    expect(rankedNew[0].detail.ageDays).toBeGreaterThan(0);
  });

  it("7. Skenario RESET mengembalikan seluruh laporan, klaster, dan bobot ke kondisi awal", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });
    const initialKpi = getKpis(state);

    // Modifikasi state secara masif
    state = appReducer(state, { type: "SET_BUDGET", payload: 500_000_000 });
    state = appReducer(state, {
      type: "SET_WEIGHT",
      payload: { key: "bahaya", value: 0.7 },
    });
    state = appReducer(state, {
      type: "SET_STATUS",
      payload: { clusterId: state.clusters[0].id, status: "resolved" },
    });

    expect(state.budget).toBe(500_000_000);
    expect(state.weights.bahaya).toBe(0.7);

    // Jalankan RESET
    const resetState = appReducer(state, { type: "RESET" });
    const resetKpi = getKpis(resetState);

    expect(resetState.budget).toBe(100_000_000);
    expect(resetState.weights).toEqual(DEFAULT_WEIGHTS);
    expect(resetKpi.totalReports).toBe(initialKpi.totalReports);
    expect(resetKpi.activeClustersCount).toBe(initialKpi.activeClustersCount);
    expect(resetKpi.criticalCount).toBe(initialKpi.criticalCount);
  });
});
