import { describe, expect, it } from "vitest";
import {
  computeScore,
  explain,
  normalizeWeights,
  priorityLevel,
  validateWeights,
  vitalScore,
} from "../lib/infratriage/scoring";
import { DEFAULT_WEIGHTS } from "../lib/infratriage/config";
import { cluster, ctx, NOW, offsetNorth, ORIGIN, report } from "./helpers";

const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe("bobot", () => {
  it("bobot default berjumlah 1", () => {
    expect(() => validateWeights(DEFAULT_WEIGHTS)).not.toThrow();
  });
  it("menolak bobot yang tidak berjumlah 1 atau negatif", () => {
    expect(() => validateWeights({ ...DEFAULT_WEIGHTS, bahaya: 0.9 })).toThrow();
    expect(() => validateWeights({ ...DEFAULT_WEIGHTS, bahaya: -0.1, usia: 0.4 })).toThrow();
  });
  it("normalizeWeights menghasilkan jumlah 1", () => {
    const w = normalizeWeights({ bahaya: 3, kelas: 2, vital: 2, kerumunan: 2, usia: 1 });
    expect(() => validateWeights(w)).not.toThrow();
    expect(w.bahaya).toBeCloseTo(0.3, 10);
  });
});

describe("komponen skor", () => {
  it("vitalScore: pita jarak", () => {
    expect(vitalScore(0)).toBe(100);
    expect(vitalScore(199)).toBe(100);
    expect(vitalScore(200)).toBe(75);
    expect(vitalScore(500)).toBe(75);
    expect(vitalScore(501)).toBe(30);
    expect(vitalScore(null)).toBe(30);
  });

  it("usia: 15 hari = 50, 30+ hari dibatasi 100", () => {
    const r15 = cluster([report({ id: "a", createdAt: daysAgo(15) })]);
    const r90 = cluster([report({ id: "b", createdAt: daysAgo(90) })]);
    expect(computeScore(r15, ctx()).components.usia).toBeCloseTo(50, 6);
    expect(computeScore(r90, ctx()).components.usia).toBe(100);
  });

  it("usia memakai laporan PERTAMA di klaster", () => {
    const c = cluster([
      report({ id: "new", createdAt: daysAgo(1) }),
      report({ id: "old", createdAt: daysAgo(30) }),
    ]);
    expect(computeScore(c, ctx()).components.usia).toBe(100);
  });

  it("kerumunan menghitung pelapor UNIK (spam satu akun tidak menambah)", () => {
    const spam = cluster(
      Array.from({ length: 8 }, (_, i) => report({ id: `s${i}`, reporterId: "orang-sama" })),
    );
    expect(computeScore(spam, ctx()).components.kerumunan).toBe(10);
    const ramai = cluster(Array.from({ length: 12 }, (_, i) => report({ id: `r${i}` })));
    expect(computeScore(ramai, ctx()).components.kerumunan).toBe(100);
  });

  it("insiden menambah skor bahaya, dibatasi 100", () => {
    const c = cluster([report({ id: "i", severity: 3, incident: true })]);
    expect(computeScore(c, ctx()).components.bahaya).toBe(100);
    const c2 = cluster([report({ id: "j", severity: 2, incident: true })]);
    expect(computeScore(c2, ctx()).components.bahaya).toBe(85);
  });

  it("kelas jalan klaster = yang tertinggi dari laporannya", () => {
    const c = cluster([
      report({ id: "k1", roadClass: "lokal" }),
      report({ id: "k2", roadClass: "arteri" }),
    ]);
    expect(computeScore(c, ctx()).components.kelas).toBe(100);
  });

  it("tanpa data fasilitas vital -> skor vital 30, tidak error", () => {
    const c = cluster([report({ id: "nv" })]);
    expect(computeScore(c, ctx({ vitals: [] })).components.vital).toBe(30);
  });

  it("jarak vital 300 m -> 75", () => {
    const c = cluster([report({ id: "m", ...offsetNorth(ORIGIN, 300) })]);
    expect(computeScore(c, ctx()).components.vital).toBe(75);
  });
});

describe("skor akhir", () => {
  it("skenario demo: 1 pelapor = 63 (tinggi)", () => {
    const c = cluster([report({ id: "d1", reporterId: "u1" })]);
    const d = computeScore(c, ctx());
    expect(Math.round(d.urgency)).toBe(63);
    expect(priorityLevel(d.urgency)).toBe("tinggi");
  });

  it("skenario demo: 10 pelapor unik = 81 (kritis)", () => {
    const c = cluster(Array.from({ length: 10 }, (_, i) => report({ id: `d${i}`, reporterId: `u${i}` })));
    const d = computeScore(c, ctx());
    expect(Math.round(d.urgency)).toBe(81);
    expect(priorityLevel(d.urgency)).toBe("kritis");
  });

  it("skor selalu di rentang 0-100", () => {
    const worst = cluster(
      Array.from({ length: 30 }, (_, i) =>
        report({ id: `w${i}`, severity: 3, incident: true, createdAt: daysAgo(100) }),
      ),
    );
    const best = cluster([report({ id: "b", category: "trotoar", severity: 1, roadClass: "lokal" })]);
    for (const c of [worst, best]) {
      const u = computeScore(c, ctx({ vitals: [] })).urgency;
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(100);
    }
  });

  it("ambang prioritas memakai angka yang dibulatkan", () => {
    expect(priorityLevel(79.6)).toBe("kritis"); // tampil 80
    expect(priorityLevel(79.4)).toBe("tinggi");
    expect(priorityLevel(49.5)).toBe("tinggi");
    expect(priorityLevel(49.4)).toBe("sedang");
  });

  it("jumlah poin lencana = skor urgensi", () => {
    const c = cluster(
      Array.from({ length: 4 }, (_, i) =>
        report({ id: `e${i}`, severity: 3, createdAt: daysAgo(7 + i) }),
      ),
    );
    const d = computeScore(c, ctx());
    const total = explain(d).reduce((s, b) => s + b.points, 0);
    expect(total).toBeCloseTo(d.urgency, 9);
  });

  it("klaster tanpa laporan melempar error", () => {
    expect(() =>
      computeScore({ id: "x", category: "lubang", status: "pending", lat: 0, lng: 0, reports: [] }, ctx()),
    ).toThrow();
  });
});
