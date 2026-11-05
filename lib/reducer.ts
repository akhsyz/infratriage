import {
  DEFAULT_WEIGHTS,
  buildBudgetPlan,
  buildClusters,
  generateSeedReports,
  ingestReport,
  type Category,
  type Cluster,
  type ClusterStatus,
  type PriorityLevel,
  type Report,
  type ScoreContext,
  type StrategyKey,
  type Weights,
} from "./infratriage";
import { vitals } from "./vitals";

export interface AppToast {
  id: number;
  message: string;
  variant: "success" | "info" | "ignored";
}

export interface AppFilters {
  categories: Category[];
  levels: PriorityLevel[];
}

export interface DemoState {
  active: boolean;
  step: number;
  targetClusterId: string | null;
}

export interface AppState {
  reports: Report[];
  clusters: Cluster[];
  weights: Weights;
  now: Date;
  selectedClusterId: string | null;
  filters: AppFilters;
  showVitals: boolean;
  budget: number;
  activeStrategy: StrategyKey;
  planRequested: boolean;
  addMode: boolean;
  toast: AppToast | null;
  demo: DemoState;
}

export type AppAction =
  | {
      type: "INIT_SEED";
      payload?: { now?: Date; reports?: Report[]; clusters?: Cluster[] };
    }
  | { type: "INGEST"; payload: Report }
  | { type: "SET_STATUS"; payload: { clusterId: string; status: ClusterStatus } }
  | { type: "SET_WEIGHT"; payload: { key: keyof Weights; value: number } }
  | { type: "RESET_WEIGHTS" }
  | { type: "SELECT"; payload: string | null }
  | { type: "SET_FILTERS"; payload: Partial<AppFilters> }
  | { type: "TOGGLE_VITALS"; payload?: boolean }
  | { type: "SET_BUDGET"; payload: number }
  | { type: "SET_STRATEGY"; payload: StrategyKey }
  | { type: "RUN_PLAN" }
  | { type: "SCHEDULE_PLAN"; payload?: { ids?: string[] } }
  | { type: "SET_ADD_MODE"; payload: boolean }
  | { type: "DEMO_START"; payload?: { targetClusterId?: string } }
  | { type: "DEMO_ADD_REPORTER"; payload: Report }
  | { type: "DISMISS_TOAST"; payload: { id: number } }
  | { type: "RESET" };

export const ALL_CATEGORIES: Category[] = [
  "lubang",
  "drainase",
  "lampu_jalan",
  "trotoar",
];

export const ALL_LEVELS: PriorityLevel[] = ["kritis", "tinggi", "sedang"];

/**
 * TODO: Ganti dengan setWeight(state.weights, key, value) dari lib/weights.ts
 * saat Orang B telah menyelesaikan task T1b.
 */
function tempSetWeight(
  weights: Weights,
  key: keyof Weights,
  rawValue: number
): Weights {
  const val = Math.max(0, Math.min(1, rawValue));
  const otherKeys = (Object.keys(weights) as (keyof Weights)[]).filter(
    (k) => k !== key
  );
  const otherSum = otherKeys.reduce((sum, k) => sum + weights[k], 0);
  const remaining = 1 - val;

  const next = { ...weights, [key]: val };

  if (otherSum > 0) {
    for (const k of otherKeys) {
      next[k] = (weights[k] / otherSum) * remaining;
    }
  } else {
    const split = remaining / otherKeys.length;
    for (const k of otherKeys) {
      next[k] = split;
    }
  }

  return next;
}

export function createInitialState(customNow?: Date): AppState {
  const now = customNow ?? new Date("2026-11-05T00:00:00.000Z");
  return {
    reports: [],
    clusters: [],
    weights: { ...DEFAULT_WEIGHTS },
    now,
    selectedClusterId: null,
    filters: {
      categories: [...ALL_CATEGORIES],
      levels: [...ALL_LEVELS],
    },
    showVitals: false,
    budget: 100_000_000,
    activeStrategy: "dp",
    planRequested: false,
    addMode: false,
    toast: null,
    demo: {
      active: false,
      step: 0,
      targetClusterId: null,
    },
  };
}

export const initialAppState: AppState = createInitialState();

export function appReducer(state: AppState, action: AppAction): AppState {
  const ctx: ScoreContext = {
    vitals,
    weights: state.weights,
    now: state.now,
  };

  switch (action.type) {
    case "INIT_SEED": {
      const now = action.payload?.now ?? state.now;
      let reports = action.payload?.reports;
      let clusters = action.payload?.clusters;

      if (!reports) {
        reports = generateSeedReports({ now, seed: 42 });
      }
      if (!clusters) {
        clusters = buildClusters(reports);
      }

      return {
        ...state,
        now,
        reports,
        clusters,
      };
    }

    case "INGEST": {
      const report = action.payload;
      const res = ingestReport(state.clusters, report, ctx);
      const nextToastId = (state.toast?.id ?? 0) + 1;

      if (res.action === "ignored") {
        return {
          ...state,
          toast: {
            id: nextToastId,
            message: "Laporan ini sudah tercatat, diabaikan",
            variant: "ignored",
          },
        };
      }

      const cluster = res.clusters.find((c) => c.id === res.clusterId);
      const cat = cluster?.category ?? "masalah";

      let message: string;
      if (res.action === "merged") {
        const beforeScore = Math.round(res.scoreBefore ?? 0);
        const afterScore = Math.round(res.scoreAfter);
        message = `Laporan digabung ke klaster ${cat} · skor ${beforeScore} → ${afterScore}`;
      } else {
        message = `Klaster baru dibuat · skor ${Math.round(res.scoreAfter)}`;
      }

      const alreadyHasReport = state.reports.some((r) => r.id === report.id);
      const nextReports = alreadyHasReport
        ? state.reports
        : [...state.reports, report];

      return {
        ...state,
        clusters: res.clusters,
        reports: nextReports,
        selectedClusterId: res.clusterId,
        toast: {
          id: nextToastId,
          message,
          variant: "success",
        },
      };
    }

    case "SET_STATUS": {
      const { clusterId, status } = action.payload;
      return {
        ...state,
        clusters: state.clusters.map((c) =>
          c.id === clusterId ? { ...c, status } : c
        ),
      };
    }

    case "SET_WEIGHT": {
      const nextWeights = tempSetWeight(
        state.weights,
        action.payload.key,
        action.payload.value
      );
      return {
        ...state,
        weights: nextWeights,
      };
    }

    case "RESET_WEIGHTS": {
      return {
        ...state,
        weights: { ...DEFAULT_WEIGHTS },
      };
    }

    case "SELECT": {
      return {
        ...state,
        selectedClusterId: action.payload,
      };
    }

    case "SET_FILTERS": {
      return {
        ...state,
        filters: {
          categories: action.payload.categories ?? state.filters.categories,
          levels: action.payload.levels ?? state.filters.levels,
        },
      };
    }

    case "TOGGLE_VITALS": {
      return {
        ...state,
        showVitals:
          typeof action.payload === "boolean"
            ? action.payload
            : !state.showVitals,
      };
    }

    case "SET_BUDGET": {
      return {
        ...state,
        budget: Math.max(0, action.payload),
      };
    }

    case "SET_STRATEGY": {
      return {
        ...state,
        activeStrategy: action.payload,
      };
    }

    case "RUN_PLAN": {
      return {
        ...state,
        planRequested: true,
      };
    }

    case "SCHEDULE_PLAN": {
      let targetIds: string[] = [];

      if (action.payload?.ids && action.payload.ids.length > 0) {
        targetIds = action.payload.ids;
      } else {
        const plan = buildBudgetPlan(state.clusters, ctx, state.budget);
        const strategy =
          plan.results.find((r) => r.key === state.activeStrategy) ??
          plan.recommended;
        targetIds = strategy ? strategy.ids : [];
      }

      if (targetIds.length === 0) {
        return state;
      }

      const scheduledSet = new Set(targetIds);
      const nextClusters = state.clusters.map((c) =>
        scheduledSet.has(c.id) ? { ...c, status: "scheduled" as ClusterStatus } : c
      );

      const nextToastId = (state.toast?.id ?? 0) + 1;
      return {
        ...state,
        clusters: nextClusters,
        toast: {
          id: nextToastId,
          message: `${targetIds.length} titik dijadwalkan`,
          variant: "success",
        },
      };
    }

    case "SET_ADD_MODE": {
      return {
        ...state,
        addMode: action.payload,
      };
    }

    case "DEMO_START": {
      return {
        ...state,
        weights: { ...DEFAULT_WEIGHTS },
        selectedClusterId:
          action.payload?.targetClusterId ?? state.selectedClusterId,
        demo: {
          active: true,
          step: 1,
          targetClusterId:
            action.payload?.targetClusterId ?? state.selectedClusterId,
        },
      };
    }

    case "DEMO_ADD_REPORTER": {
      const res = ingestReport(state.clusters, action.payload, ctx);
      const alreadyHas = state.reports.some((r) => r.id === action.payload.id);
      const nextReports = alreadyHas
        ? state.reports
        : [...state.reports, action.payload];

      // DEMO_ADD_REPORTER TIDAK membuat toast pada tiap langkah
      return {
        ...state,
        clusters: res.clusters,
        reports: nextReports,
        selectedClusterId: res.clusterId,
        demo: {
          ...state.demo,
          step: state.demo.step + 1,
          targetClusterId: res.clusterId,
        },
      };
    }

    case "DISMISS_TOAST": {
      // Hanya kosongkan bila id cocok
      if (state.toast?.id === action.payload.id) {
        return {
          ...state,
          toast: null,
        };
      }
      return state;
    }

    case "RESET": {
      const freshReports = generateSeedReports({ now: state.now, seed: 42 });
      const freshClusters = buildClusters(freshReports);

      return {
        ...createInitialState(state.now),
        reports: freshReports,
        clusters: freshClusters,
      };
    }

    default:
      return state;
  }
}

