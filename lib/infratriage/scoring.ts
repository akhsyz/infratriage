import {
  AGING_FULL_DAYS,
  CATEGORY_LABEL,
  CROWD_POINTS_PER_REPORTER,
  DAMAGE_BASE,
  INCIDENT_PENALTY,
  PRIORITY_THRESHOLDS,
  ROAD_CLASS_RANK,
  ROAD_CLASS_SCORE,
  SEVERITY_LABEL,
  VITAL_FAR_SCORE,
  VITAL_MID_M,
  VITAL_MID_SCORE,
  VITAL_NEAR_M,
  VITAL_NEAR_SCORE,
} from "./config";
import { nearestVital } from "./geo";
import type {
  Category,
  Cluster,
  PriorityLevel,
  RoadClass,
  ScoreContext,
  Severity,
  VitalPoint,
  Weights,
} from "./types";

export const WEIGHT_KEYS = [
  "bahaya",
  "kelas",
  "vital",
  "kerumunan",
  "usia",
] as const satisfies readonly (keyof Weights)[];

export interface ScoreComponents {
  bahaya: number;
  kelas: number;
  vital: number;
  kerumunan: number;
  usia: number;
}

export interface ScoreDetail {
  components: ScoreComponents;
  weights: Weights;
  /** 0-100, belum dibulatkan */
  urgency: number;
  category: Category;
  severity: Severity;
  roadClass: RoadClass;
  hasIncident: boolean;
  nearestVital: { vital: VitalPoint; meters: number } | null;
  uniqueReporters: number;
  ageDays: number;
}

export interface Badge {
  key: keyof Weights;
  /** kontribusi ke skor akhir = bobot x komponen. Jumlah semua badge = urgency. */
  points: number;
  text: string;
}

const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));

function assertNonEmpty(c: Cluster): void {
  if (c.reports.length === 0) throw new Error(`Klaster ${c.id} tidak punya laporan`);
}

export function clusterSeverity(c: Cluster): Severity {
  assertNonEmpty(c);
  return Math.max(...c.reports.map((r) => r.severity)) as Severity;
}

export function clusterRoadClass(c: Cluster): RoadClass {
  assertNonEmpty(c);
  return c.reports.reduce<RoadClass>(
    (best, r) => (ROAD_CLASS_RANK[r.roadClass] > ROAD_CLASS_RANK[best] ? r.roadClass : best),
    c.reports[0].roadClass,
  );
}

export function hasIncident(c: Cluster): boolean {
  return c.reports.some((r) => r.incident === true);
}

export function uniqueReporters(c: Cluster): number {
  return new Set(c.reports.map((r) => r.reporterId)).size;
}

export function firstReportAt(c: Cluster): string {
  assertNonEmpty(c);
  let best = c.reports[0];
  for (const r of c.reports) {
    if (Date.parse(r.createdAt) < Date.parse(best.createdAt)) best = r;
  }
  return best.createdAt;
}

export function ageDays(c: Cluster, now: Date): number {
  const ms = now.getTime() - Date.parse(firstReportAt(c));
  return Math.max(0, ms / 86_400_000);
}

export function vitalScore(meters: number | null): number {
  if (meters === null) return VITAL_FAR_SCORE;
  if (meters < VITAL_NEAR_M) return VITAL_NEAR_SCORE;
  if (meters <= VITAL_MID_M) return VITAL_MID_SCORE;
  return VITAL_FAR_SCORE;
}

export function validateWeights(w: Weights): void {
  let sum = 0;
  for (const k of WEIGHT_KEYS) {
    if (!Number.isFinite(w[k]) || w[k] < 0) {
      throw new RangeError(`Bobot "${k}" tidak valid: ${w[k]}`);
    }
    sum += w[k];
  }
  if (Math.abs(sum - 1) > 1e-6) {
    throw new RangeError(`Jumlah bobot harus 1, sekarang ${sum}`);
  }
}

export function normalizeWeights(w: Weights): Weights {
  const sum = WEIGHT_KEYS.reduce((s, k) => s + Math.max(0, w[k]), 0);
  if (sum <= 0) throw new RangeError("Semua bobot nol");
  const out = { ...w };
  for (const k of WEIGHT_KEYS) out[k] = Math.max(0, w[k]) / sum;
  return out;
}

export function computeScore(c: Cluster, ctx: ScoreContext): ScoreDetail {
  assertNonEmpty(c);
  validateWeights(ctx.weights);

  const severity = clusterSeverity(c);
  const roadClass = clusterRoadClass(c);
  const incident = hasIncident(c);
  const nv = nearestVital(c, ctx.vitals);
  const n = uniqueReporters(c);
  const days = ageDays(c, ctx.now);

  const components: ScoreComponents = {
    bahaya: clamp(DAMAGE_BASE[c.category][severity] + (incident ? INCIDENT_PENALTY : 0)),
    kelas: ROAD_CLASS_SCORE[roadClass],
    vital: vitalScore(nv ? nv.meters : null),
    kerumunan: clamp(n * CROWD_POINTS_PER_REPORTER),
    usia: clamp((days / AGING_FULL_DAYS) * 100),
  };

  const w = ctx.weights;
  const urgency =
    w.bahaya * components.bahaya +
    w.kelas * components.kelas +
    w.vital * components.vital +
    w.kerumunan * components.kerumunan +
    w.usia * components.usia;

  return {
    components,
    weights: w,
    urgency,
    category: c.category,
    severity,
    roadClass,
    hasIncident: incident,
    nearestVital: nv,
    uniqueReporters: n,
    ageDays: days,
  };
}

/** Ambang berdasarkan skor yang dibulatkan, sama dengan angka yang tampil di UI. */
export function priorityLevel(urgency: number): PriorityLevel {
  const r = Math.round(urgency);
  if (r >= PRIORITY_THRESHOLDS.kritis) return "kritis";
  if (r >= PRIORITY_THRESHOLDS.tinggi) return "tinggi";
  return "sedang";
}

/** Lencana penjelasan: setiap poin berasal dari bobot x komponen. */
export function explain(d: ScoreDetail): Badge[] {
  const pts = (k: keyof Weights) => d.weights[k] * d.components[k];
  const vitalText = d.nearestVital
    ? `${Math.round(d.nearestVital.meters)} m dari ${d.nearestVital.vital.name}`
    : "Tidak ada data fasilitas vital terdekat";
  return [
    {
      key: "bahaya",
      points: pts("bahaya"),
      text: `${CATEGORY_LABEL[d.category]} tingkat ${SEVERITY_LABEL[d.severity]}${
        d.hasIncident ? ", ada laporan insiden" : ""
      }`,
    },
    { key: "kelas", points: pts("kelas"), text: `Ruas jalan ${d.roadClass}` },
    { key: "vital", points: pts("vital"), text: vitalText },
    {
      key: "kerumunan",
      points: pts("kerumunan"),
      text: `Divalidasi ${d.uniqueReporters} pelapor unik`,
    },
    {
      key: "usia",
      points: pts("usia"),
      text: `Belum ditangani ${Math.floor(d.ageDays)} hari`,
    },
  ];
}
