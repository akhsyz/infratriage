import { describe, expect, it } from "vitest";
import { appReducer, createInitialState } from "../lib/reducer";
import { computeScore, type Report, type ScoreContext } from "../lib/infratriage";
import { vitals } from "../lib/vitals";

describe("HYDRATE_REPORTS action in reducer", () => {
  const baseNow = new Date("2026-11-05T00:00:00.000Z");

  const rep1: Report = {
    id: "ui-1",
    reporterId: "pelapor-ui-1",
    category: "lubang",
    severity: 2,
    roadClass: "arteri",
    lat: -7.7956,
    lng: 110.3695,
    createdAt: "2026-11-05T01:00:00.000Z",
    incident: false,
  };

  const rep2: Report = {
    id: "ui-2",
    reporterId: "pelapor-ui-2",
    category: "drainase",
    severity: 3,
    roadClass: "kolektor",
    lat: -7.7800,
    lng: 110.3800,
    createdAt: "2026-11-05T02:00:00.000Z",
    incident: true,
  };

  it("memasukkan laporan ke state TANPA membuat toast", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });
    expect(state.toast).toBeNull();

    const nextState = appReducer(state, {
      type: "HYDRATE_REPORTS",
      payload: { reports: [rep1, rep2] },
    });

    expect(nextState.toast).toBeNull();
    expect(nextState.reports.some((r) => r.id === "ui-1")).toBe(true);
    expect(nextState.reports.some((r) => r.id === "ui-2")).toBe(true);
  });

  it("bersifat idempoten (id laporan yang sudah ada diabaikan)", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });

    // Hidrasi pertama
    const s1 = appReducer(state, {
      type: "HYDRATE_REPORTS",
      payload: { reports: [rep1] },
    });
    const countAfterFirst = s1.reports.length;
    const clusterCountAfterFirst = s1.clusters.length;

    // Hidrasi kedua dengan laporan yang sama persis
    const s2 = appReducer(s1, {
      type: "HYDRATE_REPORTS",
      payload: { reports: [rep1] },
    });

    expect(s2.reports.length).toBe(countAfterFirst);
    expect(s2.clusters.length).toBe(clusterCountAfterFirst);
  });

  it("menghasilkan struktur klaster dan skor identik dengan aksi INGEST", () => {
    // Alur A: menggunakan INGEST satu per satu
    let stateIngest = createInitialState(baseNow);
    stateIngest = appReducer(stateIngest, { type: "INIT_SEED" });
    stateIngest = appReducer(stateIngest, { type: "INGEST", payload: rep1 });
    stateIngest = appReducer(stateIngest, { type: "INGEST", payload: rep2 });

    // Alur B: menggunakan HYDRATE_REPORTS sekaligus
    let stateHydrate = createInitialState(baseNow);
    stateHydrate = appReducer(stateHydrate, { type: "INIT_SEED" });
    stateHydrate = appReducer(stateHydrate, {
      type: "HYDRATE_REPORTS",
      payload: { reports: [rep1, rep2] },
    });

    // Jumlah laporan dan klaster harus persis sama
    expect(stateHydrate.reports.length).toBe(stateIngest.reports.length);
    expect(stateHydrate.clusters.length).toBe(stateIngest.clusters.length);

    const ctx: ScoreContext = {
      vitals,
      weights: stateIngest.weights,
      now: stateIngest.now,
    };

    // Bandingkan klaster yang memuat rep1
    const clusterIngest1 = stateIngest.clusters.find((c) =>
      c.reports.some((r) => r.id === rep1.id)
    );
    const clusterHydrate1 = stateHydrate.clusters.find((c) =>
      c.reports.some((r) => r.id === rep1.id)
    );

    expect(clusterIngest1).toBeDefined();
    expect(clusterHydrate1).toBeDefined();
    expect(clusterHydrate1?.id).toBe(clusterIngest1?.id);
    expect(clusterHydrate1?.lat).toBeCloseTo(clusterIngest1!.lat, 6);
    expect(clusterHydrate1?.lng).toBeCloseTo(clusterIngest1!.lng, 6);

    const scoreIngest1 = computeScore(clusterIngest1!, ctx).urgency;
    const scoreHydrate1 = computeScore(clusterHydrate1!, ctx).urgency;
    expect(scoreHydrate1).toBe(scoreIngest1);

    // Bandingkan klaster yang memuat rep2
    const clusterIngest2 = stateIngest.clusters.find((c) =>
      c.reports.some((r) => r.id === rep2.id)
    );
    const clusterHydrate2 = stateHydrate.clusters.find((c) =>
      c.reports.some((r) => r.id === rep2.id)
    );

    expect(clusterIngest2).toBeDefined();
    expect(clusterHydrate2).toBeDefined();
    expect(clusterHydrate2?.id).toBe(clusterIngest2?.id);
    expect(clusterHydrate2?.lat).toBeCloseTo(clusterIngest2!.lat, 6);
    expect(clusterHydrate2?.lng).toBeCloseTo(clusterIngest2!.lng, 6);

    const scoreIngest2 = computeScore(clusterIngest2!, ctx).urgency;
    const scoreHydrate2 = computeScore(clusterHydrate2!, ctx).urgency;
    expect(scoreHydrate2).toBe(scoreIngest2);
  });
});

