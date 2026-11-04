import { computeScore, normalizeWeights, WEIGHT_KEYS } from "./scoring";
import type { Cluster, ScoreContext, Weights } from "./types";

export interface Scenario {
  label: string;
  weights: Weights;
  /** korelasi peringkat dengan baseline, -1..1 */
  spearman: number;
  /** irisan top-k dengan baseline, 0..1 */
  topKOverlap: number;
}

export interface SensitivityResult {
  k: number;
  delta: number;
  baselineTop: string[];
  scenarios: Scenario[];
  minTopKOverlap: number;
  avgTopKOverlap: number;
  avgSpearman: number;
  /** bobot yang paling mengubah top-k bila digeser */
  mostSensitive: keyof Weights | null;
}

function ranks(values: number[]): number[] {
  const idx = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(values.length).fill(0);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

export function spearman(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Panjang vektor berbeda");
  if (a.length < 2) return 1;
  const ra = ranks(a);
  const rb = ranks(b);
  const n = a.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n;
  const mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  if (da === 0 || db === 0) return 1;
  return num / Math.sqrt(da * db);
}

/**
 * Seberapa stabil peringkat bila setiap bobot digeser +/- delta (relatif), lalu dinormalkan.
 * Jawaban untuk pertanyaan juri: "bagaimana kalau bobotnya berubah?"
 */
export function rankingStability(
  clusters: Cluster[],
  ctx: ScoreContext,
  opts: { delta?: number; k?: number } = {},
): SensitivityResult {
  const delta = opts.delta ?? 0.2;
  const active = clusters.filter((c) => c.status !== "resolved");
  const k = Math.min(opts.k ?? 10, active.length);

  const scoresFor = (weights: Weights) =>
    active.map((c) => computeScore(c, { ...ctx, weights }).urgency);
  const topIds = (scores: number[]) =>
    active
      .map((c, i) => ({ id: c.id, s: scores[i] }))
      .sort((a, b) => b.s - a.s || a.id.localeCompare(b.id))
      .slice(0, k)
      .map((x) => x.id);

  const baseScores = scoresFor(ctx.weights);
  const baselineTop = topIds(baseScores);

  const scenarios: Scenario[] = [];
  for (const key of WEIGHT_KEYS) {
    for (const sign of [-1, 1] as const) {
      const shifted: Weights = {
        ...ctx.weights,
        [key]: Math.max(0, ctx.weights[key] * (1 + sign * delta)),
      };
      const weights = normalizeWeights(shifted);
      const sc = scoresFor(weights);
      const top = new Set(topIds(sc));
      const overlap = k === 0 ? 1 : baselineTop.filter((id) => top.has(id)).length / k;
      scenarios.push({
        label: `${key} ${sign > 0 ? "+" : "-"}${Math.round(delta * 100)}%`,
        weights,
        spearman: spearman(baseScores, sc),
        topKOverlap: overlap,
      });
    }
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 1);
  let mostSensitive: keyof Weights | null = null;
  let lowest = Number.POSITIVE_INFINITY;
  for (const key of WEIGHT_KEYS) {
    const mine = scenarios.filter((s) => s.label.startsWith(`${key} `));
    const a = avg(mine.map((s) => s.topKOverlap));
    if (a < lowest) {
      lowest = a;
      mostSensitive = key;
    }
  }

  return {
    k,
    delta,
    baselineTop,
    scenarios,
    minTopKOverlap: Math.min(...scenarios.map((s) => s.topKOverlap)),
    avgTopKOverlap: avg(scenarios.map((s) => s.topKOverlap)),
    avgSpearman: avg(scenarios.map((s) => s.spearman)),
    mostSensitive,
  };
}
