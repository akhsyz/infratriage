"use client";

import React, { useMemo } from "react";
import { useApp } from "../lib/store";
import { computeScore, priorityLevel, type ScoreContext } from "../lib/infratriage";
import { vitals } from "../lib/vitals";
import { AlertTriangle, FileText, Layers } from "lucide-react";

export default function KpiCards() {
  const { state } = useApp();

  const totalReports = state.reports.length;

  const activeClusters = useMemo(
    () => state.clusters.filter((c) => c.status !== "resolved"),
    [state.clusters]
  );
  const totalActiveClusters = activeClusters.length;

  const criticalCount = useMemo(() => {
    const ctx: ScoreContext = {
      vitals,
      weights: state.weights,
      now: state.now,
    };
    return activeClusters.filter(
      (c) => priorityLevel(computeScore(c, ctx).urgency) === "kritis"
    ).length;
  }, [activeClusters, state.weights, state.now]);

  return (
    <section
      aria-label="Ringkasan Indikator Kinerja Utama"
      className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full"
    >
      {/* ── Kartu 1: Laporan Masuk ── */}
      <div className="flex items-center gap-3 rounded-[12px] sm:rounded-[14px] border border-hero-card-border bg-hero-card-bg px-3.5 py-2.5 backdrop-blur-xs shadow-xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-hero-chip-bg text-hero-accent">
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div>
          <span className="block text-[11px] sm:text-[12px] font-medium text-hero-muted leading-tight">
            Laporan masuk
          </span>
          <span className="text-[24px] sm:text-[26px] font-bold text-hero-text tabular-nums leading-none tracking-tight">
            {totalReports}
          </span>
        </div>
      </div>

      {/* ── Kartu 2: Klaster Aktif ── */}
      <div className="flex items-center gap-3 rounded-[12px] sm:rounded-[14px] border border-hero-card-border bg-hero-card-bg px-3.5 py-2.5 backdrop-blur-xs shadow-xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-hero-chip-bg text-hero-accent">
          <Layers className="h-4.5 w-4.5" />
        </div>
        <div>
          <span className="block text-[11px] sm:text-[12px] font-medium text-hero-muted leading-tight">
            Klaster aktif
          </span>
          <span className="text-[24px] sm:text-[26px] font-bold text-hero-text tabular-nums leading-none tracking-tight">
            {totalActiveClusters}
          </span>
        </div>
      </div>

      {/* ── Kartu 3: Prioritas Kritis ── */}
      <div className="flex items-center gap-3 rounded-[12px] sm:rounded-[14px] border border-hero-card-border bg-hero-card-bg px-3.5 py-2.5 backdrop-blur-xs shadow-xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-kritis-chip-dark text-kritis-on-dark">
          <AlertTriangle className="h-4.5 w-4.5" />
        </div>
        <div>
          <span className="block text-[11px] sm:text-[12px] font-medium text-hero-muted leading-tight">
            Prioritas kritis
          </span>
          <span className="text-[24px] sm:text-[26px] font-bold text-kritis-on-dark tabular-nums leading-none tracking-tight">
            {criticalCount}
          </span>
        </div>
      </div>
    </section>
  );
}
