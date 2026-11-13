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
    valueCoveragePct: number;
    criticalCount: number;
  };
  metrics: {
    /** (a) Tumpang tindih rata-rata dengan hasil dasar (Jaccard, dalam %) */
    avgJaccardPct: number;
    /** (a) Tumpang tindih terendah dengan hasil dasar (Jaccard, dalam %) */
    minJaccardPct: number;
    /** (b) Rata-rata cakupan skor seluruh percobaan (%) */
    avgValueCoveragePct: number;
    /** (b) Cakupan skor pada hasil dasar (%) */
    baselineValueCoveragePct: number;
    /** (c) Jumlah titik inti yang terpilih di >= 90% percobaan */
    corePointCount: number;
    /** (c) Total titik terpilih pada hasil dasar */
    baselinePointCount: number;
    /** (d) Jumlah titik kritis terpilih rata-rata */
    avgCriticalCount: number;
    /** (d) Jumlah titik kritis terpilih pada hasil dasar */
    baselineCriticalCount: number;
  };
  /** Satu kalimat otomatis penjelas hasil */
  summarySentence: string;
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
 * Menghasilkan SATU kalimat penjelas otomatis yang dihitung langsung dari angka.
 */
export function generateRobustnessSummary(
  trials: number,
  perturbRange: [number, number],
  avgJaccardPct: number,
  baselineCount: number,
): string {
  if (baselineCount === 0) {
    return "Tidak ada titik rekomendasi pada hasil dasar untuk diuji.";
  }
  const delta = Math.abs(perturbRange[1] - 1);
  const perturbPct = Math.round(delta * 100);
  const roundedJaccard = Math.round(avgJaccardPct);

  if (perturbPct === 0) {
    return `Dari ${trials} percobaan tanpa gangguan biaya (0%), rata-rata ${roundedJaccard}% titik terpilih tetap sama.`;
  }
  return `Dari ${trials} percobaan dengan biaya tiap titik meleset acak ±${perturbPct}%, rata-rata ${roundedJaccard}% titik terpilih tetap sama.`;
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
    valueCoveragePct: number;
    criticalCount: number;
  };
  totalCandidatesValue: number;
  candidateMap: Map<string, Item>;
  jaccardList: number[];
  valueCoverageList: number[];
  criticalCountList: number[];
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
  let baselineCriticalCount = 0;
  for (const id of baselineSel.ids) {
    const it = candidateMap.get(id);
    if (it && Math.round(it.value) >= criticalThreshold) {
      baselineCriticalCount++;
    }
  }

  const baselineValueCoveragePct =
    totalCandidatesValue > 0 ? (baselineSel.totalValue / totalCandidatesValue) * 100 : 0;

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
      valueCoveragePct: baselineValueCoveragePct,
      criticalCount: baselineCriticalCount,
    },
    totalCandidatesValue,
    candidateMap,
    jaccardList: [],
    valueCoverageList: [],
    criticalCountList: [],
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

  while (acc.completedTrials < target) {
    // Siapkan kandidat dengan biaya terganggu untuk percobaan ini
    const perturbedItems: Item[] = new Array(acc.candidates.length);
    for (let i = 0; i < acc.candidates.length; i++) {
      const orig = acc.candidates[i];
      const factor = factorSpan === 0 ? minFactor : minFactor + acc.rng() * factorSpan;
      const perturbedCost = Math.max(1, Math.round(orig.cost * factor));
      perturbedItems[i] = {
        ...orig,
        cost: perturbedCost,
      };
    }

    // Jalankan perencana DP yang sama
    const trialSel = selectDP(perturbedItems, acc.budget, acc.costUnit);
    const trialSet = new Set(trialSel.ids);

    // Hitung Jaccard terhadap baseline
    const jaccard = calculateJaccardPct(acc.baseline.selectedSet, trialSet);
    acc.jaccardList.push(jaccard);

    // Hitung cakupan skor
    const coverage =
      acc.totalCandidatesValue > 0
        ? (trialSel.totalValue / acc.totalCandidatesValue) * 100
        : 0;
    acc.valueCoverageList.push(coverage);

    // Hitung titik kritis terpilih
    let trialCritical = 0;
    for (const id of trialSel.ids) {
      const it = acc.candidateMap.get(id);
      if (it && Math.round(it.value) >= acc.criticalThreshold) {
        trialCritical++;
      }
    }
    acc.criticalCountList.push(trialCritical);

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
  const avgValueCoveragePct =
    n > 0 ? acc.valueCoverageList.reduce((s, x) => s + x, 0) / n : acc.baseline.valueCoveragePct;
  const avgCriticalCount =
    n > 0 ? acc.criticalCountList.reduce((s, x) => s + x, 0) / n : acc.baseline.criticalCount;

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
  );

  return {
    trials: acc.trials,
    perturbRange: acc.perturbRange,
    seed: acc.seed,
    baseline: {
      selectedIds: acc.baseline.selectedIds,
      totalCost: acc.baseline.totalCost,
      totalValue: acc.baseline.totalValue,
      valueCoveragePct: acc.baseline.valueCoveragePct,
      criticalCount: acc.baseline.criticalCount,
    },
    metrics: {
      avgJaccardPct,
      minJaccardPct,
      avgValueCoveragePct,
      baselineValueCoveragePct: acc.baseline.valueCoveragePct,
      corePointCount,
      baselinePointCount,
      avgCriticalCount,
      baselineCriticalCount: acc.baseline.criticalCount,
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
