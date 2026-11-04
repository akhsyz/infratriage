import { describe, expect, it } from "vitest";
import { addReport } from "../lib/infratriage/cluster";
import { distanceMeters } from "../lib/infratriage/geo";
import type { Cluster } from "../lib/infratriage/types";
import { offsetNorth, ORIGIN, report } from "./helpers";

describe("geo", () => {
  it("jarak 100 m ke utara ~ 100 m", () => {
    const d = distanceMeters(ORIGIN, offsetNorth(ORIGIN, 100));
    expect(d).toBeGreaterThan(99);
    expect(d).toBeLessThan(101);
  });
  it("koordinat tidak valid ditolak", () => {
    expect(() => addReport([], report({ id: "bad", lat: 123, lng: 0 }))).toThrow();
    expect(() => addReport([], report({ id: "nan", lat: NaN, lng: 0 }))).toThrow();
  });
});

describe("klaster", () => {
  it("laporan pertama membuat klaster baru", () => {
    const r = addReport([], report({ id: "r1" }));
    expect(r.action).toBe("created");
    expect(r.clusters).toHaveLength(1);
  });

  it("jarak ~10 m, kategori sama -> digabung", () => {
    const a = addReport([], report({ id: "r1" }));
    const b = addReport(a.clusters, report({ id: "r2", ...offsetNorth(ORIGIN, 10) }));
    expect(b.action).toBe("merged");
    expect(b.clusters).toHaveLength(1);
    expect(b.clusters[0].reports).toHaveLength(2);
  });

  it("jarak ~55 m -> klaster baru", () => {
    const a = addReport([], report({ id: "r1" }));
    const b = addReport(a.clusters, report({ id: "r2", ...offsetNorth(ORIGIN, 55) }));
    expect(b.action).toBe("created");
    expect(b.clusters).toHaveLength(2);
  });

  it("kategori berbeda tidak digabung meski berhimpit", () => {
    const a = addReport([], report({ id: "r1", category: "lubang" }));
    const b = addReport(a.clusters, report({ id: "r2", category: "drainase" }));
    expect(b.action).toBe("created");
    expect(b.clusters).toHaveLength(2);
  });

  it("klaster resolved tidak menyerap laporan baru", () => {
    const a = addReport([], report({ id: "r1" }));
    const resolved: Cluster[] = a.clusters.map((c) => ({ ...c, status: "resolved" }));
    const b = addReport(resolved, report({ id: "r2" }));
    expect(b.action).toBe("created");
    expect(b.clusters).toHaveLength(2);
  });

  it("radius per kategori: 30 m digabung untuk drainase (35), tidak untuk lubang (20)", () => {
    const at30 = offsetNorth(ORIGIN, 30);
    const d1 = addReport([], report({ id: "d1", category: "drainase" }));
    expect(addReport(d1.clusters, report({ id: "d2", category: "drainase", ...at30 })).action).toBe("merged");
    const l1 = addReport([], report({ id: "l1", category: "lubang" }));
    expect(addReport(l1.clusters, report({ id: "l2", category: "lubang", ...at30 })).action).toBe("created");
  });

  it("idempoten: id laporan yang sama tidak dihitung dua kali", () => {
    const a = addReport([], report({ id: "r1" }));
    const b = addReport(a.clusters, report({ id: "r1" }));
    expect(b.action).toBe("ignored");
    expect(b.clusters[0].reports).toHaveLength(1);
  });

  it("menggabung ke klaster TERDEKAT bila ada beberapa kandidat", () => {
    let cs: Cluster[] = [];
    cs = addReport(cs, report({ id: "far", ...offsetNorth(ORIGIN, -18) })).clusters;
    cs = addReport(cs, report({ id: "near", ...offsetNorth(ORIGIN, 18) })).clusters;
    // dua klaster berjarak 36 m (> 20 m) sehingga terpisah
    expect(cs).toHaveLength(2);
    const r = addReport(cs, report({ id: "new", ...offsetNorth(ORIGIN, 12) }));
    expect(r.clusterId).toBe("c-near");
  });

  it("titik pusat bergeser menjadi rata-rata koordinat", () => {
    const a = addReport([], report({ id: "r1" }));
    const p2 = offsetNorth(ORIGIN, 10);
    const b = addReport(a.clusters, report({ id: "r2", ...p2 }));
    expect(b.clusters[0].lat).toBeCloseTo((ORIGIN.lat + p2.lat) / 2, 10);
  });

  it("tidak memutasi array masukan", () => {
    const a = addReport([], report({ id: "r1" }));
    const snapshot = JSON.stringify(a.clusters);
    addReport(a.clusters, report({ id: "r2", ...offsetNorth(ORIGIN, 5) }));
    expect(JSON.stringify(a.clusters)).toBe(snapshot);
  });
});
