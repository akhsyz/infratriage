import { estimateCost } from "./config";
import { addReport, type IngestAction } from "./cluster";
import { compareStrategies, type Item, type StrategyResult } from "./knapsack";
import {
  computeScore,
  firstReportAt,
  clusterSeverity,
  priorityLevel,
  type ScoreDetail,
} from "./scoring";
import type { Cluster, PriorityLevel, Report, ScoreContext } from "./types";

export interface IngestResult {
  clusters: Cluster[];
  clusterId: string;
  action: IngestAction;
  /** null bila klaster baru dibuat */
  scoreBefore: number | null;
  scoreAfter: number;
  levelBefore: PriorityLevel | null;
  levelAfter: PriorityLevel;
}

/**
 * Alur demo di depan juri: laporan baru masuk -> klaster tergabung atau dibuat ->
 * skor dihitung ulang. scoreBefore/After dipakai untuk animasi pin oranye -> merah.
 */
export function ingestReport(
  clusters: Cluster[],
  report: Report,
  ctx: ScoreContext,
): IngestResult {
  const result = addReport(clusters, report);
  const before = clusters.find((c) => c.id === result.clusterId);
  const after = result.clusters.find((c) => c.id === result.clusterId)!;

  const scoreBefore = before ? computeScore(before, ctx).urgency : null;
  const scoreAfter = computeScore(after, ctx).urgency;
  return {
    clusters: result.clusters,
    clusterId: result.clusterId,
    action: result.action,
    scoreBefore,
    scoreAfter,
    levelBefore: scoreBefore === null ? null : priorityLevel(scoreBefore),
    levelAfter: priorityLevel(scoreAfter),
  };
}

export interface RankedCluster {
  cluster: Cluster;
  detail: ScoreDetail;
  level: PriorityLevel;
}

/** Klaster aktif (bukan resolved) diurutkan dari skor tertinggi. */
export function rankClusters(clusters: Cluster[], ctx: ScoreContext): RankedCluster[] {
  return clusters
    .filter((c) => c.status !== "resolved")
    .map((cluster) => {
      const detail = computeScore(cluster, ctx);
      return { cluster, detail, level: priorityLevel(detail.urgency) };
    })
    .sort((a, b) => b.detail.urgency - a.detail.urgency || a.cluster.id.localeCompare(b.cluster.id));
}

export interface BudgetPlan {
  budget: number;
  candidates: number;
  results: StrategyResult[];
  /** hasil DP, dipakai untuk menyorot pin di peta */
  recommended: StrategyResult;
}

/** Kandidat = klaster berstatus "pending". "scheduled" dianggap sudah didanai. */
export function buildBudgetPlan(
  clusters: Cluster[],
  ctx: ScoreContext,
  budget: number,
  opts: { costUnit?: number } = {},
): BudgetPlan {
  const items: Item[] = clusters
    .filter((c) => c.status === "pending")
    .map((c) => ({
      id: c.id,
      value: computeScore(c, ctx).urgency,
      cost: estimateCost(c.category, clusterSeverity(c)),
      arrivedAt: firstReportAt(c),
    }));
  const results = compareStrategies(items, budget, { costUnit: opts.costUnit });
  return { budget, candidates: items.length, results, recommended: results[0] };
}
