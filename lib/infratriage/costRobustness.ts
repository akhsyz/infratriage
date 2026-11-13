import { KNAPSACK_COST_UNIT, PRIORITY_THRESHOLDS } from "./config";
import { selectDP, type Item } from "./knapsack";

/**
 * PRNG berbenih mulberry32 32-bit deterministik.
 * Menghasilkan bilangan float dalam rentang [0, 1) tanpa Math.random.
 */
export function createMulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CostRobustnessOptions {
  /** Jumlah percobaan simulasi (bawaan: 100) */
  trials?: number;
  /** Rentang faktor gangguan biaya acak [min, max] (bawaan: [0.7, 1.3]) */
  perturbRange?: [number, number];
  /** Benih PRNG tetap untuk reproduktibilitas penuh (bawaan: 42) */
  seed?: number;
  /** Satuan biaya DP knapsack (bawaan: KNAPSACK_COST_UNIT = 100.000) */
  costUnit?: number;
  /** Ambang batas skor titik kritis (bawaan: PRIORITY_THRESHOLDS.kritis = 80) */
  criticalThreshold?: number;
}

export interface CostRobustnessResult {
  trials: number;
  perturbRange: [number, number];
  seed: number;
  baseline: {
    selectedIds: string[];
    totalCost: number;
    totalValue: number;
  };
  metrics: {
    /** (a) Tumpang tindih rata-rata dengan hasil dasar (Jaccard, dalam %) */
    avgJaccardPct: number;
    /** (a) Tumpang tindih terendah dengan hasil dasar (Jaccard, dalam %) */
    minJaccardPct: number;
    /** Jumlah titik inti yang terpilih di >= 90% percobaan */
    corePointCount: number;
    /** Total titik terpilih pada hasil dasar */
    baselinePointCount: number;
    /** (b) Rata-rata kelebihan biaya rencana dasar terhadap pagu (%) */
    avgCostOverrunPct: number;
    /** (b) Persentil 90 kelebihan biaya rencana dasar terhadap pagu (%) */
    p90CostOverrunPct: number;
    /** (b) Maksimum kelebihan biaya rencana dasar terhadap pagu (%) */
    maxCostOverrunPct: number;
    /** (b) Persentase percobaan di mana total biaya rencana dasar melebihi pagu (%) */
    overBudgetPct: number;
  };
  /** Dua kalimat otomatis penjelas hasil */
  summarySentence: string;
}

/**
 * Menghitung persentil dengan interpolasi linier standar.
 */
export function calculatePercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Menghitung indeks Jaccard antara himpunan A dan B: |A ∩ B| / |A ∪ B| (dalam %).
 * Jika kedua himpunan kosong, kesesuaian dianggap 100%.
 */
export function calculateJaccardPct(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 100;
  let intersectionSize = 0;
  for (const id of a) {
    if (b.has(id)) intersectionSize++;
  }
  const unionSize = a.size + b.size - intersectionSize;
  if (unionSize === 0) return 100;
  return (intersectionSize / unionSize) * 100;
}

/**
 * Menghasilkan DUA kalimat penjelas otomatis yang dihitung langsung dari angka.
 */
export function generateRobustnessSummary(
  trials: number,
  perturbRange: [number, number],
  avgJaccardPct: number,
  baselineCount: number,
  p90CostOverrunPct: number,
): string {
  if (baselineCount === 0) {
    return "Tidak ada titik rekomendasi pada hasil dasar untuk diuji.";
  }
  const delta = Math.abs(perturbRange[1] - 1);
  const perturbPct = Math.round(delta * 100);
  const roundedJaccard = Math.round(avgJaccardPct);

  // Kalimat 1: stabilitas pilihan
  const sentence1 =
    perturbPct === 0
      ? `Dari ${trials} percobaan tanpa gangguan biaya (0%), rata-rata ${roundedJaccard}% titik terpilih tetap sama.`
      : `Dari ${trials} percobaan dengan biaya tiap titik meleset acak ±${perturbPct}%, rata-rata ${roundedJaccard}% titik terpilih tetap sama.`;

  // Kalimat 2: risiko pembengkakan biaya rencana dasar
  let sentence2: string;
  if (p90CostOverrunPct > 0) {
    const xPct = Math.round(p90CostOverrunPct);
    sentence2 = `Bila biaya aktual tiap titik meleset acak ±${perturbPct}%, total biaya rencana dasar dapat melampaui pagu hingga ${xPct}% (persentil 90); cadangan sekitar ${xPct}% dari pagu mengurangi risiko itu.`;
  } else {
    sentence2 = "Total biaya rencana dasar tetap berada dalam pagu anggaran pada persentil 90 percobaan.";
  }

  return `${sentence1} ${sentence2}`;
}

/**
 * Struktur akumulator untuk eksekusi terpotong (chunking) tanpa membekukan UI.
 */
export interface RobustnessAccumulator {
  trials: number;
  completedTrials: number;
  perturbRange: [number, number];
  seed: number;
  costUnit: number;
  criticalThreshold: number;
  candidates: Item[];
  budget: number;
  rng: () => number;
  baseline: {
    selectedIds: string[];
    selectedSet: Set<string>;
    totalCost: number;
    totalValue: number;
  };
  totalCandidatesValue: number;
  candidateMap: Map<string, Item>;
  jaccardList: number[];
  costOverrunList: number[];
  overBudgetCount: number;
  baselineItemFreq: Map<string, number>;
}

/**
 * Inisialisasi simulasi ketahanan biaya dan hitung hasil dasar.
 */
export function initRobustness(
  candidates: Item[],
  budget: number,
  options: CostRobustnessOptions = {},
): RobustnessAccumulator {
  const trials = options.trials ?? 100;
  const perturbRange = options.perturbRange ?? [0.7, 1.3];
  const seed = options.seed ?? 42;
  const costUnit = options.costUnit ?? KNAPSACK_COST_UNIT;
  const criticalThreshold = options.criticalThreshold ?? PRIORITY_THRESHOLDS.kritis;

  const rng = createMulberry32(seed);

  const candidateMap = new Map<string, Item>();
  let totalCandidatesValue = 0;
  for (const it of candidates) {
    candidateMap.set(it.id, it);
    totalCandidatesValue += it.value;
  }

  // Hitung hasil dasar (baseline) dengan biaya asli
  const baselineSel = selectDP(candidates, budget, costUnit);
  const baselineSet = new Set(baselineSel.ids);

  const baselineItemFreq = new Map<string, number>();
  for (const id of baselineSel.ids) {
    baselineItemFreq.set(id, 0);
  }

  return {
    trials,
    completedTrials: 0,
    perturbRange,
    seed,
    costUnit,
    criticalThreshold,
    candidates,
    budget,
    rng,
    baseline: {
      selectedIds: baselineSel.ids,
      selectedSet: baselineSet,
      totalCost: baselineSel.totalCost,
      totalValue: baselineSel.totalValue,
    },
    totalCandidatesValue,
    candidateMap,
    jaccardList: [],
    costOverrunList: [],
    overBudgetCount: 0,
    baselineItemFreq,
  };
}

/**
 * Menjalankan sejumlah percobaan (chunkSize) ke dalam akumulator.
 * Mengembalikan true bila seluruh percobaan telah selesai.
 */
export function stepRobustness(
  acc: RobustnessAccumulator,
  chunkSize: number,
): boolean {
  const target = Math.min(acc.trials, acc.completedTrials + chunkSize);
  const [minFactor, maxFactor] = acc.perturbRange;
  const factorSpan = maxFactor - minFactor;
  const hasBaselineItems = acc.baseline.selectedIds.length > 0;

  while (acc.completedTrials < target) {
    // Siapkan kandidat dengan biaya terganggu untuk percobaan ini
    const perturbedItems: Item[] = new Array(acc.candidates.length);
    const perturbedCostMap = new Map<string, number>();

    for (let i = 0; i < acc.candidates.length; i++) {
      const orig = acc.candidates[i];
      const factor = factorSpan === 0 ? minFactor : minFactor + acc.rng() * factorSpan;
      const perturbedCost = Math.max(1, Math.round(orig.cost * factor));
      perturbedItems[i] = {
        ...orig,
        cost: perturbedCost,
      };
      perturbedCostMap.set(orig.id, perturbedCost);
    }

    // 1. Hitung total biaya HIMPUNAN DASAR dengan biaya terganggu percobaan ini
    if (hasBaselineItems && acc.budget > 0) {
      let baselinePerturbedTotal = 0;
      for (const id of acc.baseline.selectedIds) {
        baselinePerturbedTotal += perturbedCostMap.get(id) ?? 0;
      }
      const overrunPct = ((baselinePerturbedTotal / acc.budget) - 1) * 100;
      acc.costOverrunList.push(overrunPct);
      if (baselinePerturbedTotal > acc.budget) {
        acc.overBudgetCount++;
      }
    } else {
      acc.costOverrunList.push(0);
    }

    // 2. Jalankan perencana DP untuk menguji stabilitas pemilihan (Jaccard & titik inti)
    const trialSel = selectDP(perturbedItems, acc.budget, acc.costUnit);
    const trialSet = new Set(trialSel.ids);

    // Hitung Jaccard terhadap baseline
    const jaccard = calculateJaccardPct(acc.baseline.selectedSet, trialSet);
    acc.jaccardList.push(jaccard);

    // Catat frekuensi titik baseline yang terpilih
    for (const id of acc.baseline.selectedIds) {
      if (trialSet.has(id)) {
        acc.baselineItemFreq.set(id, (acc.baselineItemFreq.get(id) ?? 0) + 1);
      }
    }

    acc.completedTrials++;
  }

  return acc.completedTrials >= acc.trials;
}

/**
 * Merangkum hasil simulasi dari akumulator menjadi CostRobustnessResult.
 */
export function finalizeRobustness(acc: RobustnessAccumulator): CostRobustnessResult {
  const n = acc.jaccardList.length;

  const avgJaccardPct = n > 0 ? acc.jaccardList.reduce((s, x) => s + x, 0) / n : 100;
  const minJaccardPct = n > 0 ? Math.min(...acc.jaccardList) : 100;

  // Statistik kelebihan biaya rencana dasar
  const avgCostOverrunPct =
    n > 0 ? acc.costOverrunList.reduce((s, x) => s + x, 0) / n : 0;
  const maxCostOverrunPct = n > 0 ? Math.max(...acc.costOverrunList) : 0;
  const p90CostOverrunPct = n > 0 ? calculatePercentile(acc.costOverrunList, 90) : 0;
  const overBudgetPct = n > 0 ? (acc.overBudgetCount / n) * 100 : 0;

  // Titik inti: titik dasar yang terpilih di >= 90% percobaan
  let corePointCount = 0;
  const minRequired = n * 0.9;
  for (const count of acc.baselineItemFreq.values()) {
    if (count >= minRequired) {
      corePointCount++;
    }
  }

  const baselinePointCount = acc.baseline.selectedIds.length;
  const summarySentence = generateRobustnessSummary(
    acc.trials,
    acc.perturbRange,
    avgJaccardPct,
    baselinePointCount,
    p90CostOverrunPct,
  );

  return {
    trials: acc.trials,
    perturbRange: acc.perturbRange,
    seed: acc.seed,
    baseline: {
      selectedIds: acc.baseline.selectedIds,
      totalCost: acc.baseline.totalCost,
      totalValue: acc.baseline.totalValue,
    },
    metrics: {
      avgJaccardPct,
      minJaccardPct,
      corePointCount,
      baselinePointCount,
      avgCostOverrunPct,
      p90CostOverrunPct,
      maxCostOverrunPct,
      overBudgetPct,
    },
    summarySentence,
  };
}

/**
 * Fungsi murni utama: menjalankan uji ketahanan biaya secara deterministik.
 * Masukan: kandidat, anggaran, dan opsi (trials, perturbRange, seed, costUnit).
 */
export function runCostRobustness(
  candidates: Item[],
  budget: number,
  options: CostRobustnessOptions = {},
): CostRobustnessResult {
  const acc = initRobustness(candidates, budget, options);
  stepRobustness(acc, acc.trials);
  return finalizeRobustness(acc);
}
