import { KNAPSACK_COST_UNIT, PRIORITY_THRESHOLDS } from "./config";

export interface Item {
  id: string;
  /** skor urgensi 0-100 */
  value: number;
  /** biaya dalam Rupiah, harus > 0 */
  cost: number;
  /** ISO 8601, dipakai strategi FIFO */
  arrivedAt?: string;
}

export interface Selection {
  ids: string[];
  totalCost: number;
  totalValue: number;
}

export type StrategyKey = "dp" | "greedy" | "topscore" | "fifo";

export interface StrategyResult extends Selection {
  key: StrategyKey;
  name: string;
  budgetUsedPct: number;
  /** total skor terpilih / total skor semua kandidat x 100. Indeks, bukan penurunan risiko nyata. */
  valueCoveragePct: number;
  criticalCount: number;
  criticalTotal: number;
}

function validate(items: Item[], budget: number): void {
  if (!Number.isFinite(budget) || budget < 0) throw new RangeError(`Anggaran tidak valid: ${budget}`);
  const seen = new Set<string>();
  for (const it of items) {
    if (!Number.isFinite(it.cost) || it.cost <= 0) throw new RangeError(`Biaya harus > 0 (id ${it.id})`);
    if (!Number.isFinite(it.value) || it.value < 0) throw new RangeError(`Nilai harus >= 0 (id ${it.id})`);
    if (seen.has(it.id)) throw new Error(`Id kandidat duplikat: ${it.id}`);
    seen.add(it.id);
  }
}

function summarize(chosen: Item[]): Selection {
  return {
    ids: chosen.map((i) => i.id),
    totalCost: chosen.reduce((s, i) => s + i.cost, 0),
    totalValue: chosen.reduce((s, i) => s + i.value, 0),
  };
}

/** Ambil berurutan sesuai urutan, lewati yang tidak muat (first-fit). */
function firstFit(ordered: Item[], budget: number): Selection {
  const chosen: Item[] = [];
  let spent = 0;
  for (const it of ordered) {
    if (spent + it.cost <= budget) {
      chosen.push(it);
      spent += it.cost;
    }
  }
  return summarize(chosen);
}

const byId = (a: Item, b: Item) => a.id.localeCompare(b.id);

/** Greedy berdasarkan rasio skor/biaya. Cepat, tetapi tidak selalu optimal. */
export function selectGreedy(items: Item[], budget: number): Selection {
  validate(items, budget);
  const ordered = [...items].sort(
    (a, b) => b.value / b.cost - a.value / a.cost || b.value - a.value || byId(a, b),
  );
  return firstFit(ordered, budget);
}

/** Urutan skor tertinggi dulu, tanpa memperhitungkan biaya. */
export function selectTopScore(items: Item[], budget: number): Selection {
  validate(items, budget);
  const ordered = [...items].sort((a, b) => b.value - a.value || a.cost - b.cost || byId(a, b));
  return firstFit(ordered, budget);
}

/** Baseline "urutan masuk": laporan paling lama didanai dulu. */
export function selectFIFO(items: Item[], budget: number): Selection {
  validate(items, budget);
  const t = (i: Item) => (i.arrivedAt ? Date.parse(i.arrivedAt) : Number.POSITIVE_INFINITY);
  const ordered = [...items].sort((a, b) => t(a) - t(b) || byId(a, b));
  return firstFit(ordered, budget);
}

/**
 * 0/1 knapsack dynamic programming (optimal pada satuan biaya `costUnit`).
 * Biaya dibulatkan KE ATAS dan anggaran KE BAWAH, jadi hasil tidak pernah melebihi anggaran.
 * Nilai diskalakan ke bilangan bulat (x100) agar perbandingan tidak terganggu pembulatan float.
 * Kompleksitas: O(n x W), W = anggaran / costUnit.
 */
export function selectDP(
  items: Item[],
  budget: number,
  costUnit: number = KNAPSACK_COST_UNIT,
): Selection {
  validate(items, budget);
  if (!(costUnit > 0)) throw new RangeError("costUnit harus > 0");

  const sorted = [...items].sort((a, b) => b.value - a.value || a.cost - b.cost || byId(a, b));
  const n = sorted.length;
  const W = Math.floor(budget / costUnit);
  if (n === 0 || W === 0) return { ids: [], totalCost: 0, totalValue: 0 };
  if (n * (W + 1) > 50_000_000) {
    throw new RangeError("Ukuran DP terlalu besar: perbesar costUnit atau kurangi kandidat");
  }

  const w = sorted.map((i) => Math.ceil(i.cost / costUnit));
  const v = sorted.map((i) => Math.round(i.value * 100));
  const dp = new Int32Array(W + 1);
  const keep = new Uint8Array(n * (W + 1));

  for (let i = 0; i < n; i++) {
    for (let c = W; c >= w[i]; c--) {
      const cand = dp[c - w[i]] + v[i];
      if (cand > dp[c]) {
        dp[c] = cand;
        keep[i * (W + 1) + c] = 1;
      }
    }
  }

  const chosen: Item[] = [];
  let c = W;
  for (let i = n - 1; i >= 0; i--) {
    if (keep[i * (W + 1) + c] === 1) {
      chosen.push(sorted[i]);
      c -= w[i];
    }
  }
  chosen.reverse();
  return summarize(chosen);
}

export function compareStrategies(
  items: Item[],
  budget: number,
  opts: { criticalThreshold?: number; costUnit?: number } = {},
): StrategyResult[] {
  const threshold = opts.criticalThreshold ?? PRIORITY_THRESHOLDS.kritis;
  const totalAll = items.reduce((s, i) => s + i.value, 0);
  const criticalIds = new Set(items.filter((i) => Math.round(i.value) >= threshold).map((i) => i.id));

  const wrap = (key: StrategyKey, name: string, sel: Selection): StrategyResult => ({
    ...sel,
    key,
    name,
    budgetUsedPct: budget > 0 ? (sel.totalCost / budget) * 100 : 0,
    valueCoveragePct: totalAll > 0 ? (sel.totalValue / totalAll) * 100 : 0,
    criticalCount: sel.ids.filter((id) => criticalIds.has(id)).length,
    criticalTotal: criticalIds.size,
  });

  return [
    wrap("dp", "Rekomendasi optimal (DP)", selectDP(items, budget, opts.costUnit)),
    wrap("greedy", "Greedy rasio skor/biaya", selectGreedy(items, budget)),
    wrap("topscore", "Skor tertinggi dulu", selectTopScore(items, budget)),
    wrap("fifo", "Urutan masuk (FIFO)", selectFIFO(items, budget)),
  ];
}
