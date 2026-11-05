"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import {
  appReducer,
  initialAppState,
  type AppAction,
  type AppState,
} from "./reducer";
import {
  buildBudgetPlan,
  rankClusters,
  type BudgetPlan,
  type RankedCluster,
  type ScoreContext,
} from "./infratriage";
import { vitals } from "./vitals";

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  // Inisialisasi seed hanya di sisi klien setelah mount untuk menghindari hydration mismatch
  useEffect(() => {
    dispatch({ type: "INIT_SEED" });
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

/**
 * Mengembalikan klaster aktif terurut berdasarkan skor urgensi,
 * disaring menurut filter kategori dan level yang sedang aktif.
 */
export function useRanked(): RankedCluster[] {
  const { state } = useApp();

  return useMemo(() => {
    const ctx: ScoreContext = {
      vitals,
      weights: state.weights,
      now: state.now,
    };
    const ranked = rankClusters(state.clusters, ctx);
    return ranked.filter(
      (item) =>
        state.filters.categories.includes(item.cluster.category) &&
        state.filters.levels.includes(item.level)
    );
  }, [state.clusters, state.weights, state.now, state.filters]);
}

/**
 * Mengembalikan rencana simulasi anggaran (null jika belum dipicu RUN_PLAN).
 * Dihitung ulang otomatis saat clusters, weights, atau budget berubah.
 */
export function useBudgetPlan(): BudgetPlan | null {
  const { state } = useApp();

  return useMemo(() => {
    if (!state.planRequested) return null;
    const ctx: ScoreContext = {
      vitals,
      weights: state.weights,
      now: state.now,
    };
    return buildBudgetPlan(state.clusters, ctx, state.budget);
  }, [
    state.planRequested,
    state.clusters,
    state.weights,
    state.now,
    state.budget,
  ]);
}

/**
 * Mengembalikan array id titik klaster yang terpilih pada strategi anggaran aktif.
 * Mengembalikan array kosong jika rencana anggaran belum diminta.
 */
export function useHighlightIds(): string[] {
  const { state } = useApp();
  const plan = useBudgetPlan();

  return useMemo(() => {
    if (!plan) return [];
    const activeStrategyResult =
      plan.results.find((res) => res.key === state.activeStrategy) ??
      plan.recommended;
    return activeStrategyResult ? activeStrategyResult.ids : [];
  }, [plan, state.activeStrategy]);
}

