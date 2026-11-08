import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearReports,
  getVisitorId,
  loadReports,
  saveReport,
} from "../lib/persistence";
import { isValidUuidV4 } from "../lib/reportValidation";
import type { Report } from "../lib/infratriage/types";

describe("lib/persistence", () => {
  const originalFetch = globalThis.fetch;

  const sampleReport: Report = {
    id: "ui-1",
    reporterId: "pelapor-ui-1",
    category: "lubang",
    severity: 2,
    roadClass: "arteri",
    lat: -7.7956,
    lng: 110.3695,
    createdAt: "2026-11-08T12:00:00.000Z",
    incident: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getVisitorId menghasilkan UUID v4 yang sah", () => {
    const id = getVisitorId();
    expect(isValidUuidV4(id)).toBe(true);
    // Konsisten pada pemanggilan berikutnya
    expect(getVisitorId()).toBe(id);
  });

  it("loadReports mengembalikan array laporan saat fetch berhasil", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reports: [sampleReport] }),
    } as Response);

    const reports = await loadReports();
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe("ui-1");
  });

  it("loadReports aman gagal saat server tidak terjangkau (mengembalikan array kosong tanpa throw)", async () => {
    // Simulasi respons 503
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "Database unavailable" }),
    } as Response);

    const reports503 = await loadReports();
    expect(reports503).toEqual([]);

    // Simulasi network error / reject
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network connection failed"));
    const reportsError = await loadReports();
    expect(reportsError).toEqual([]);
  });

  it("saveReport melewatkan laporan skenario demo tanpa memanggil fetch", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const demoReport: Report = {
      ...sampleReport,
      id: "demo-1",
      reporterId: "demo-1",
    };

    const res = await saveReport(demoReport);
    expect(res.ok).toBe(true);
    expect(res.skipped).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("saveReport mengembalikan { ok: true } saat server berhasil menyimpan", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, report: sampleReport }),
    } as Response);

    const res = await saveReport(sampleReport);
    expect(res.ok).toBe(true);
  });

  it("saveReport aman gagal saat server error / tidak terjangkau (mengembalikan { ok: false } tanpa throw)", async () => {
    // Respons 503
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "Service unavailable" }),
    } as Response);

    const res503 = await saveReport(sampleReport);
    expect(res503.ok).toBe(false);

    // Network timeout / throw
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Timeout"));
    const resTimeout = await saveReport(sampleReport);
    expect(resTimeout.ok).toBe(false);
  });

  it("clearReports aman gagal saat server error (mengembalikan { ok: false } tanpa throw)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Server down"));
    const res = await clearReports();
    expect(res.ok).toBe(false);
  });
});

