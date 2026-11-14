import { describe, expect, it } from "vitest";
import {
  buildUiReport,
  getNextUiReporterId,
  getNextUiReportId,
  isReportFormValid,
  mapRoadTypeToClass,
  type ReportFormData,
} from "../components/map/reportDraft";
import { appReducer, createInitialState } from "../lib/reducer";
import { computeScore, uniqueReporters, type ScoreContext, type Severity } from "../lib/infratriage";
import { vitals } from "../lib/vitals";

describe("reportDraft (components/map/reportDraft.ts)", () => {
  const baseNow = new Date("2026-11-05T08:00:00.000Z");

  const sampleFormData: ReportFormData = {
    category: "lubang",
    severity: 2,
    roadClass: "arteri",
    incident: true,
    reporterId: "pelapor-warga-1",
    note: "Dekat pertigaan jalan",
  };

  describe("getNextUiReportId", () => {
    it("menghasilkan 'ui-1' jika belum ada laporan berawalan 'ui-'", () => {
      expect(getNextUiReportId([])).toBe("ui-1");
      expect(
        getNextUiReportId([
          { id: "seed-report-1" },
          { id: "seed-report-2" },
          { id: "demo-1" },
        ])
      ).toBe("ui-1");
    });

    it("menghasilkan id berurutan dan mengambil angka tertinggi (mis. ui-1 dan ui-3 -> ui-4)", () => {
      const reports = [
        { id: "seed-1" },
        { id: "ui-1" },
        { id: "ui-3" },
        { id: "seed-2" },
      ];
      expect(getNextUiReportId(reports)).toBe("ui-4");
    });

    it("menghasilkan id berurutan normal jika terurut (ui-1, ui-2 -> ui-3)", () => {
      const reports = [{ id: "ui-1" }, { id: "ui-2" }];
      expect(getNextUiReportId(reports)).toBe("ui-3");
    });
  });

  describe("isReportFormValid", () => {
    it("memvalidasi data form yang lengkap", () => {
      expect(isReportFormValid(sampleFormData)).toBe(true);
    });

    it("menolak form jika ID pelapor kosong", () => {
      expect(isReportFormValid({ ...sampleFormData, reporterId: "   " })).toBe(false);
    });

    it("menolak form jika severity tidak valid", () => {
      expect(isReportFormValid({ ...sampleFormData, severity: 4 as unknown as Severity })).toBe(false);
    });
  });

  describe("buildUiReport", () => {
    it("memetakan seluruh field form secara benar ke Report dengan ID unik dan createdAt = now", () => {
      const point = { lat: -7.785, lng: 110.365 };
      const existingReports = [{ id: "ui-1" }, { id: "ui-2" }];

      const report = buildUiReport(sampleFormData, point, baseNow, existingReports);

      expect(report.id).toBe("ui-3");
      expect(report.reporterId).toBe("pelapor-warga-1");
      expect(report.category).toBe("lubang");
      expect(report.severity).toBe(2);
      expect(report.roadClass).toBe("arteri");
      expect(report.incident).toBe(true);
      expect(report.lat).toBe(-7.785);
      expect(report.lng).toBe(110.365);
      expect(report.createdAt).toBe(baseNow.toISOString());
      expect(report.note).toBe("Dekat pertigaan jalan");
    });
  });

  describe("Alur ingest lewat reducer", () => {
    it("laporan lubang ±10 m dari klaster lubang yang ada menggabung dan skor naik", () => {
      let state = createInitialState(baseNow);
      state = appReducer(state, { type: "INIT_SEED" });

      const ctx: ScoreContext = {
        vitals,
        weights: state.weights,
        now: state.now,
      };

      // Cari klaster lubang yang ada di seed data
      const targetCluster = state.clusters.find((c) => c.category === "lubang");
      expect(targetCluster).toBeDefined();
      if (!targetCluster) return;

      const beforeScore = Math.round(computeScore(targetCluster, ctx).urgency);
      const initialClusterCount = state.clusters.length;
      const initialReportCount = state.reports.length;

      // Buat laporan ±10 m dari titik klaster (~0.00008 derajat lat/lng)
      const nearbyPoint = {
        lat: targetCluster.lat + 0.00008,
        lng: targetCluster.lng + 0.00008,
      };

      const newReport = buildUiReport(
        {
          category: "lubang",
          severity: 3, // keparahan berat akan menaikkan skor urgensi
          roadClass: "arteri",
          incident: true,
          reporterId: "pelapor-unik-baru-999",
        },
        nearbyPoint,
        baseNow,
        state.reports
      );

      const nextState = appReducer(state, { type: "INGEST", payload: newReport });

      // Klaster tidak bertambah baru (karena digabung)
      expect(nextState.clusters.length).toBe(initialClusterCount);
      // Total laporan bertambah 1
      expect(nextState.reports.length).toBe(initialReportCount + 1);

      // Klaster yang digabungkan memiliki 1 laporan ekstra
      const updatedCluster = nextState.clusters.find((c) => c.id === targetCluster.id);
      expect(updatedCluster).toBeDefined();
      expect(updatedCluster?.reports.length).toBe(targetCluster.reports.length + 1);

      // Skor naik
      const afterScore = Math.round(computeScore(updatedCluster!, ctx).urgency);
      expect(afterScore).toBeGreaterThanOrEqual(beforeScore);

      // Toast sukses mencatat penggabungan
      expect(nextState.toast?.variant).toBe("success");
      expect(nextState.toast?.message).toContain("Laporan digabung ke klaster lubang");
    });

    it("laporan ±100 m atau lebih dari semua klaster membuat klaster baru", () => {
      let state = createInitialState(baseNow);
      state = appReducer(state, { type: "INIT_SEED" });

      const initialClusterCount = state.clusters.length;

      // Titik jauh dari klaster seed Yogyakarta kota
      const isolatedPoint = { lat: -7.72, lng: 110.31 };

      const newReport = buildUiReport(
        {
          category: "trotoar",
          severity: 2,
          roadClass: "lokal",
          incident: false,
          reporterId: "pelapor-jauh-1",
        },
        isolatedPoint,
        baseNow,
        state.reports
      );

      const nextState = appReducer(state, { type: "INGEST", payload: newReport });

      // Klaster baru tercipta
      expect(nextState.clusters.length).toBe(initialClusterCount + 1);
      expect(nextState.selectedClusterId).toBeDefined();

      // Toast sukses mencatat klaster baru
      expect(nextState.toast?.variant).toBe("success");
      expect(nextState.toast?.message).toContain("Klaster baru dibuat");
    });

    it("laporan dengan id yang sama dikirim dua kali tidak mengubah apapun (variant 'ignored')", () => {
      let state = createInitialState(baseNow);
      state = appReducer(state, { type: "INIT_SEED" });

      const report = buildUiReport(
        sampleFormData,
        { lat: -7.75, lng: 110.35 },
        baseNow,
        state.reports
      );

      // Ingest pertama -> sukses
      const state1 = appReducer(state, { type: "INGEST", payload: report });
      expect(state1.toast?.variant).toBe("success");
      const clustersLen = state1.clusters.length;
      const reportsLen = state1.reports.length;

      // Ingest kedua dengan laporan yang sama persis
      const state2 = appReducer(state1, { type: "INGEST", payload: report });
      expect(state2.toast?.variant).toBe("ignored");
      expect(state2.toast?.message).toContain("Laporan ini sudah tercatat, diabaikan");
      expect(state2.clusters.length).toBe(clustersLen);
      expect(state2.reports.length).toBe(reportsLen);
    });

    it("pelapor yang sama tidak menambah jumlah pelapor unik klaster", () => {
      let state = createInitialState(baseNow);
      state = appReducer(state, { type: "INIT_SEED" });

      const point = { lat: -7.785, lng: 110.365 };

      // Laporan 1 oleh pelapor-ui-1
      const rep1 = buildUiReport(
        {
          category: "lubang",
          severity: 2,
          roadClass: "lokal",
          incident: false,
          reporterId: "pelapor-ui-1",
        },
        point,
        baseNow,
        state.reports
      );
      state = appReducer(state, { type: "INGEST", payload: rep1 });
      const cluster1 = state.clusters.find((c) =>
        c.reports.some((r) => r.id === rep1.id)
      )!;
      expect(uniqueReporters(cluster1)).toBe(1);

      // Laporan 2 di titik berdekatan (~5m) oleh pelapor yang SAMA (pelapor-ui-1)
      const rep2 = buildUiReport(
        {
          category: "lubang",
          severity: 2,
          roadClass: "lokal",
          incident: false,
          reporterId: "pelapor-ui-1",
        },
        { lat: point.lat + 0.00004, lng: point.lng + 0.00004 },
        baseNow,
        state.reports
      );
      state = appReducer(state, { type: "INGEST", payload: rep2 });
      const cluster2 = state.clusters.find((c) =>
        c.reports.some((r) => r.id === rep2.id)
      )!;
      expect(cluster2.id).toBe(cluster1.id);
      expect(cluster2.reports.length).toBe(2);
      // Jumlah pelapor unik TIDAK bertambah (tetap 1)
      expect(uniqueReporters(cluster2)).toBe(1);

      // Laporan 3 di titik berdekatan oleh pelapor BARU (pelapor-ui-2)
      const rep3 = buildUiReport(
        {
          category: "lubang",
          severity: 2,
          roadClass: "lokal",
          incident: false,
          reporterId: "pelapor-ui-2",
        },
        { lat: point.lat + 0.00005, lng: point.lng + 0.00005 },
        baseNow,
        state.reports
      );
      state = appReducer(state, { type: "INGEST", payload: rep3 });
      const cluster3 = state.clusters.find((c) =>
        c.reports.some((r) => r.id === rep3.id)
      )!;
      expect(cluster3.id).toBe(cluster1.id);
      expect(cluster3.reports.length).toBe(3);
      // Jumlah pelapor unik kini bertambah menjadi 2
      expect(uniqueReporters(cluster3)).toBe(2);
    });

    it("tiga kiriman berturut-turut dari formulir menaikkan jumlah pelapor unik klaster 1, 2, 3", () => {
      let state = createInitialState(baseNow);
      state = appReducer(state, { type: "INIT_SEED" });

      const point = { lat: -7.785, lng: 110.365 };

      // Kiriman 1: pelapor pertama
      const rep1 = buildUiReport(
        {
          category: "lubang",
          severity: 2,
          roadClass: mapRoadTypeToClass("arteri"),
          incident: false,
          reporterId: getNextUiReporterId(state.reports),
        },
        point,
        baseNow,
        state.reports
      );
      expect(rep1.reporterId).toBe("pelapor-ui-1");
      state = appReducer(state, { type: "INGEST", payload: rep1 });
      const c1 = state.clusters.find((c) => c.reports.some((r) => r.id === rep1.id))!;
      expect(uniqueReporters(c1)).toBe(1);

      // Kiriman 2: pelapor kedua (otomatis pelapor-ui-2)
      const rep2 = buildUiReport(
        {
          category: "lubang",
          severity: 2,
          roadClass: mapRoadTypeToClass("arteri"),
          incident: false,
          reporterId: getNextUiReporterId(state.reports),
        },
        { lat: point.lat + 0.00004, lng: point.lng + 0.00004 },
        baseNow,
        state.reports
      );
      expect(rep2.reporterId).toBe("pelapor-ui-2");
      state = appReducer(state, { type: "INGEST", payload: rep2 });
      const c2 = state.clusters.find((c) => c.reports.some((r) => r.id === rep2.id))!;
      expect(c2.id).toBe(c1.id);
      expect(uniqueReporters(c2)).toBe(2);

      // Kiriman 3: pelapor ketiga (otomatis pelapor-ui-3)
      const rep3 = buildUiReport(
        {
          category: "lubang",
          severity: 2,
          roadClass: mapRoadTypeToClass("arteri"),
          incident: false,
          reporterId: getNextUiReporterId(state.reports),
        },
        { lat: point.lat + 0.00005, lng: point.lng + 0.00005 },
        baseNow,
        state.reports
      );
      expect(rep3.reporterId).toBe("pelapor-ui-3");
      state = appReducer(state, { type: "INGEST", payload: rep3 });
      const c3 = state.clusters.find((c) => c.reports.some((r) => r.id === rep3.id))!;
      expect(c3.id).toBe(c1.id);
      expect(uniqueReporters(c3)).toBe(3);
    });
  });

  describe("getNextUiReporterId", () => {
    it("menghasilkan 'pelapor-ui-1' jika belum ada laporan berawalan 'pelapor-ui-'", () => {
      expect(getNextUiReporterId([])).toBe("pelapor-ui-1");
      expect(
        getNextUiReporterId([
          { reporterId: "user-1" },
          { reporterId: "warga-jogja" },
          { reporterId: "demo-1" },
        ])
      ).toBe("pelapor-ui-1");
    });

    it("menghasilkan id pelapor otomatis unik dan berurutan (mis. pelapor-ui-1 dan pelapor-ui-3 -> pelapor-ui-4)", () => {
      const reports = [
        { reporterId: "user-seed-1" },
        { reporterId: "pelapor-ui-1" },
        { reporterId: "pelapor-ui-3" },
      ];
      expect(getNextUiReporterId(reports)).toBe("pelapor-ui-4");
    });

    it("tetap benar dan kembali ke 'pelapor-ui-1' setelah aksi RESET di reducer", () => {
      let state = createInitialState(baseNow);
      state = appReducer(state, { type: "INIT_SEED" });

      // Tambah laporan dengan reporter pelapor-ui-1 dan pelapor-ui-2
      const repA = buildUiReport(
        sampleFormData,
        { lat: -7.78, lng: 110.36 },
        baseNow,
        state.reports
      );
      repA.reporterId = "pelapor-ui-1";
      state = appReducer(state, { type: "INGEST", payload: repA });

      const repB = buildUiReport(
        sampleFormData,
        { lat: -7.78, lng: 110.36 },
        baseNow,
        state.reports
      );
      repB.reporterId = "pelapor-ui-2";
      state = appReducer(state, { type: "INGEST", payload: repB });

      expect(getNextUiReporterId(state.reports)).toBe("pelapor-ui-3");

      // Jalankan aksi RESET
      const resetState = appReducer(state, { type: "RESET" });
      expect(getNextUiReporterId(resetState.reports)).toBe("pelapor-ui-1");
    });
  });

  describe("mapRoadTypeToClass", () => {
    it("memetakan empat pilihan jenis jalan UI ke tiga nilai RoadClass yang sah", () => {
      expect(mapRoadTypeToClass("arteri")).toBe("arteri");
      expect(mapRoadTypeToClass("kolektor")).toBe("kolektor");
      expect(mapRoadTypeToClass("lokal")).toBe("lokal");
      expect(mapRoadTypeToClass("tidak_yakin")).toBe("lokal");
    });
  });
});
