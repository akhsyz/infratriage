"use client";

import React, { useMemo } from "react";
import { useApp } from "../lib/store";
import { computeScore, priorityLevel, type ScoreContext } from "../lib/infratriage";
import { vitals } from "../lib/vitals";
import { AlertTriangle, FileText, Layers } from "lucide-react";

interface KpiCardsProps {
  className?: string;
}

export default function KpiCards({ className = "" }: KpiCardsProps) {
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
      className={`grid grid-cols-1 sm:grid-cols-3 xl:flex xl:items-center gap-2 sm:gap-2.5 w-full ${className}`}
    >
      {/* ── Kartu 1: Laporan Masuk ── */}
      <div className="flex items-center gap-2.5 sm:gap-3 rounded-[12px] border border-hero-card-border bg-hero-card-bg px-3 py-2 sm:px-3.5 sm:py-2 backdrop-blur-xs shadow-xs xl:min-w-[150px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-hero-chip-bg text-hero-accent">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <span className="block text-[11px] font-medium text-hero-muted leading-tight">
            Laporan masuk
          </span>
          <span className="text-[20px] sm:text-[22px] font-bold text-hero-text tabular-nums leading-none tracking-tight">
            {totalReports}
          </span>
        </div>
      </div>

      {/* ── Kartu 2: Klaster Aktif ── */}
      <div className="flex items-center gap-2.5 sm:gap-3 rounded-[12px] border border-hero-card-border bg-hero-card-bg px-3 py-2 sm:px-3.5 sm:py-2 backdrop-blur-xs shadow-xs xl:min-w-[150px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-hero-chip-bg text-hero-accent">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <span className="block text-[11px] font-medium text-hero-muted leading-tight">
            Klaster aktif
          </span>
          <span className="text-[20px] sm:text-[22px] font-bold text-hero-text tabular-nums leading-none tracking-tight">
            {totalActiveClusters}
          </span>
        </div>
      </div>

      {/* ── Kartu 3: Prioritas Kritis ── */}
      <div className="flex items-center gap-2.5 sm:gap-3 rounded-[12px] border border-hero-card-border bg-hero-card-bg px-3 py-2 sm:px-3.5 sm:py-2 backdrop-blur-xs shadow-xs xl:min-w-[150px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-kritis-chip-dark text-kritis-on-dark">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <span className="block text-[11px] font-medium text-hero-muted leading-tight">
            Prioritas kritis
          </span>
          <span className="text-[20px] sm:text-[22px] font-bold text-kritis-on-dark tabular-nums leading-none tracking-tight">
            {criticalCount}
          </span>
        </div>
      </div>
    </section>
  );
}
