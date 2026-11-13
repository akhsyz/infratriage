import { describe, expect, it } from "vitest";
import { buildDemoReports, DEMO_ANCHOR_SITE, pickDemoSite } from "../lib/demo";
import { vitals } from "../lib/vitals";
import {
  buildClusters,
  computeScore,
  DEFAULT_WEIGHTS,
  distanceMeters,
  generateSeedReports,
  nearestVital,
  priorityLevel,
  type Report,
  type ScoreContext,
} from "../lib/infratriage";
import { appReducer, createInitialState } from "../lib/reducer";

describe("demo (lib/demo.ts)", () => {
  const baseNow = new Date("2026-11-05T00:00:00.000Z");
  const seedReports = generateSeedReports({ now: baseNow, seed: 42 });
  const seedClusters = buildClusters(seedReports);

  it("pickDemoSite deterministik dan menghasilkan nilai yang sama pada setiap pemanggilan", () => {
    const site1 = pickDemoSite(vitals, seedClusters);
    const site2 = pickDemoSite(vitals, seedClusters);

    expect(site1.vital.id).toBe(site2.vital.id);
    expect(site1.site.lat).toBe(site2.site.lat);
    expect(site1.site.lng).toBe(site2.site.lng);
    expect(site1.distanceToVital).toBe(site2.distanceToVital);
  });

  it("titik demo berjarak 50-80 m dari satu fasilitas vital NYATA (rumah sakit) dan minimal 100 m dari setiap klaster seed", () => {
    const result = pickDemoSite(vitals, seedClusters);

    // Fasilitas vital adalah rumah sakit nyata dari vitals
    expect(result.vital).toBeDefined();
    expect(result.vital.type).toBe("rumah_sakit");

    // Jarak 50-80 m dari fasilitas vital
    const distToVital = distanceMeters(result.site, result.vital);
    expect(distToVital).toBeGreaterThanOrEqual(50);
    expect(distToVital).toBeLessThanOrEqual(80);

    // Jarak minimal 100 m dari semua pusat klaster seed
    for (const sc of seedClusters) {
      const d = distanceMeters(result.site, sc);
      expect(d).toBeGreaterThanOrEqual(100);
    }
  });

  it("DEMO_ANCHOR_SITE adalah titik jangkar tetap di dekat Klinik Adhiwarga PKBI DIY (65 m)", () => {
    expect(DEMO_ANCHOR_SITE.vital.name).toBe("Klinik Adhiwarga PKBI DIY");
    expect(Math.round(DEMO_ANCHOR_SITE.distanceToVital)).toBe(65);

    // Verifikasi bahwa nearestVital ke DEMO_ANCHOR_SITE.site adalah tepat faskes ini
    const nv = nearestVital(DEMO_ANCHOR_SITE.site, vitals);
    expect(nv?.vital.name).toBe("Klinik Adhiwarga PKBI DIY");
    expect(Math.round(nv!.meters)).toBe(65);
  });

  it("skenario demo: 1 laporan = skor 63 (tinggi), naik monoton, 9 pelapor = 79 (tinggi), 10 pelapor = 81 (kritis)", () => {
    const demoSite = DEMO_ANCHOR_SITE;
    const reports = buildDemoReports(10, baseNow, demoSite.site);

    expect(reports.length).toBe(10);
    // Seluruh id dan reporterId unik
    const reportIds = new Set(reports.map((r) => r.id));
    const reporterIds = new Set(reports.map((r) => r.reporterId));
    expect(reportIds.size).toBe(10);
    expect(reporterIds.size).toBe(10);

    const ctx: ScoreContext = {
      vitals,
      weights: DEFAULT_WEIGHTS,
      now: baseNow,
    };

    // Alur ingest bertahap
    const scores: number[] = [];
    const levels: string[] = [];

    for (let i = 0; i < 10; i++) {
      // Seluruh laporan demo menumpuk di klaster yang sama
      const demoReportsSoFar = reports.slice(0, i + 1);
      const demoClusters = buildClusters(demoReportsSoFar);
      expect(demoClusters.length).toBe(1);

      const demoCluster = demoClusters[0];
      expect(demoCluster).toBeDefined();

      const detail = computeScore(demoCluster, ctx);
      const score = Math.round(detail.urgency);
      const level = priorityLevel(detail.urgency);

      scores.push(score);
      levels.push(level);
    }

    // 1 laporan = 63 (tinggi)
    expect(scores[0]).toBe(63);
    expect(levels[0]).toBe("tinggi");

    // 9 pelapor = 79 (tinggi)
    expect(scores[8]).toBe(79);
    expect(levels[8]).toBe("tinggi");

    // 10 pelapor = 81 (kritis)
    expect(scores[9]).toBe(81);
    expect(levels[9]).toBe("kritis");

    // Skor naik monoton (63, 65, 67, 69, 71, 73, 75, 77, 79, 81)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });

  it("alur skenario demo melalui reducer: DEMO_START menaruh 1 laporan (skor 63), DEMO_ADD_REPORTER menambah pelapor tanpa toast hingga 10 (skor 81)", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });

    const initialReportCount = state.reports.length; // 150
    const initialClusterCount = state.clusters.length; // 36

    const demoReports = buildDemoReports(10, baseNow, DEMO_ANCHOR_SITE.site);

    // Langkah 1: Mulai skenario demo dengan laporan pertama
    state = appReducer(state, { type: "INGEST", payload: demoReports[0] });
    const demoClusterId = state.selectedClusterId;
    expect(demoClusterId).toBeDefined();

    // Jalankan DEMO_START
    state = appReducer(state, {
      type: "DEMO_START",
      payload: { targetClusterId: demoClusterId ?? undefined },
    });

    expect(state.demo.active).toBe(true);
    expect(state.demo.step).toBe(1);
    expect(state.weights).toEqual(DEFAULT_WEIGHTS);

    const ctx: ScoreContext = {
      vitals,
      weights: state.weights,
      now: state.now,
    };

    const cluster1 = state.clusters.find((c) => c.id === demoClusterId);
    expect(cluster1).toBeDefined();
    expect(Math.round(computeScore(cluster1!, ctx).urgency)).toBe(63);
    expect(priorityLevel(computeScore(cluster1!, ctx).urgency)).toBe("tinggi");

    // Langkah 2: Tambah pelapor 2 s/d 10 dengan DEMO_ADD_REPORTER
    for (let step = 2; step <= 10; step++) {
      const prevToast = state.toast;
      state = appReducer(state, {
        type: "DEMO_ADD_REPORTER",
        payload: demoReports[step - 1],
      });

      // DEMO_ADD_REPORTER tidak membuat toast baru
      expect(state.toast).toBe(prevToast);
      expect(state.demo.step).toBe(step);
    }

    const cluster10 = state.clusters.find((c) => c.id === demoClusterId);
    expect(cluster10).toBeDefined();
    expect(cluster10?.reports.length).toBe(10);
    expect(Math.round(computeScore(cluster10!, ctx).urgency)).toBe(81);
    expect(priorityLevel(computeScore(cluster10!, ctx).urgency)).toBe("kritis");

    // Faskes terdekat pada klaster demo harus tetap Klinik Adhiwarga PKBI DIY pada jarak 65 m
    const detail = computeScore(cluster10!, ctx);
    expect(detail.nearestVital?.vital.name).toBe("Klinik Adhiwarga PKBI DIY");
    expect(Math.round(detail.nearestVital!.meters)).toBe(65);

    // KPI delta: tepat +10 laporan dan +1 klaster
    expect(state.reports.length).toBe(initialReportCount + 10);
    expect(state.clusters.length).toBe(initialClusterCount + 1);

    // Langkah 3: RESET mengembalikan keadaan dasar persis (150 laporan, 36 klaster, 2 kritis)
    state = appReducer(state, { type: "RESET" });
    expect(state.demo.active).toBe(false);
    expect(state.demo.step).toBe(0);
    expect(state.reports.length).toBe(150);
    expect(state.clusters.length).toBe(36);
    const criticalBaseline = state.clusters.filter(
      (c) => priorityLevel(computeScore(c, ctx).urgency) === "kritis"
    );
    expect(criticalBaseline.length).toBe(2);
    expect(state.clusters.find((c) => c.id === demoClusterId)).toBeUndefined();
  });

  it("idempotensi Mulai dan DEMO_RESET: Mulai diabaikan saat berjalan, dan memulai ulang membersihkan laporan demo lama", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });

    const demoReports = buildDemoReports(10, baseNow, DEMO_ANCHOR_SITE.site);

    // Ingest step 1
    state = appReducer(state, { type: "INGEST", payload: demoReports[0] });
    state = appReducer(state, { type: "DEMO_START" });
    expect(state.demo.step).toBe(1);

    // Tekan Mulai lagi saat berjalan (step 1..9): state demo tidak berubah / idempoten
    const stateBefore = state;
    state = appReducer(state, { type: "DEMO_START" });
    expect(state.demo.step).toBe(1);
    expect(state).toBe(stateBefore);

    // Selesaikan sampai step 10
    for (let step = 2; step <= 10; step++) {
      state = appReducer(state, {
        type: "DEMO_ADD_REPORTER",
        payload: demoReports[step - 1],
      });
    }
    expect(state.demo.step).toBe(10);
    expect(state.reports.length).toBe(160);
    expect(state.clusters.length).toBe(37);

    // Memulai ulang setelah selesai dengan membersihkan laporan demo sebelumnya (DEMO_RESET)
    state = appReducer(state, { type: "DEMO_RESET" });
    expect(state.demo.active).toBe(false);
    expect(state.demo.step).toBe(0);
    expect(state.reports.length).toBe(150);
    expect(state.clusters.length).toBe(36);

    // Mulai skenario baru secara bersih
    state = appReducer(state, { type: "INGEST", payload: demoReports[0] });
    state = appReducer(state, { type: "DEMO_START" });
    expect(state.demo.active).toBe(true);
    expect(state.demo.step).toBe(1);
    expect(state.reports.length).toBe(151);
    expect(state.clusters.length).toBe(37);
  });

  it("skenario demo deterministik bersamaan dengan laporan pengguna dari database (HYDRATE_REPORTS)", () => {
    let state = createInitialState(baseNow);
    state = appReducer(state, { type: "INIT_SEED" });

    // Simulasikan 2 laporan pengguna dari database (total 152 laporan, 38 klaster)
    const userReport1: Report = {
      id: "usr-rep-1",
      reporterId: "user-1",
      category: "trotoar",
      severity: 1,
      roadClass: "lokal",
      lat: -7.795,
      lng: 110.370,
      createdAt: baseNow.toISOString(),
    };
    const userReport2: Report = {
      id: "usr-rep-2",
      reporterId: "user-2",
      category: "lampu_jalan",
      severity: 3,
      roadClass: "kolektor",
      lat: -7.810,
      lng: 110.380,
      createdAt: baseNow.toISOString(),
    };
    state = appReducer(state, {
      type: "HYDRATE_REPORTS",
      payload: { reports: [userReport1, userReport2] },
    });
    expect(state.reports.length).toBe(152);
    expect(state.clusters.length).toBe(38);

    // Jalankan 10 langkah demo
    const demoReports = buildDemoReports(10, baseNow, DEMO_ANCHOR_SITE.site);
    state = appReducer(state, { type: "INGEST", payload: demoReports[0] });
    state = appReducer(state, { type: "DEMO_START" });

    for (let step = 2; step <= 10; step++) {
      state = appReducer(state, {
        type: "DEMO_ADD_REPORTER",
        payload: demoReports[step - 1],
      });
    }

    // Delta tetap tepat +10 laporan dan +1 klaster (162 laporan, 39 klaster)
    expect(state.reports.length).toBe(162);
    expect(state.clusters.length).toBe(39);

    const demoClusters = state.clusters.filter((c) =>
      c.reports.some((r) => r.reporterId.startsWith("demo-"))
    );
    expect(demoClusters.length).toBe(1);
    expect(demoClusters[0].reports.length).toBe(10);

    const ctx: ScoreContext = {
      vitals,
      weights: state.weights,
      now: state.now,
    };
    expect(Math.round(computeScore(demoClusters[0], ctx).urgency)).toBe(81);
    expect(priorityLevel(computeScore(demoClusters[0], ctx).urgency)).toBe("kritis");
  });
});
