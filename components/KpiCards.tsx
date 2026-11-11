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
      className={`grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full lg:w-auto ${className}`}
    >
      {/* ── Chip 1: Laporan Masuk ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 rounded-[8px] sm:rounded-[10px] border border-hero-card-border bg-hero-card-bg px-2 sm:px-2.5 py-1 backdrop-blur-xs shadow-xs h-[36px] sm:h-[38px] shrink-0 justify-center sm:justify-start">
        <div className="flex h-5 w-5 sm:h-5.5 sm:w-5.5 shrink-0 items-center justify-center rounded-[5px] sm:rounded-[6px] bg-hero-chip-bg text-hero-accent">
          <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </div>
        <div className="flex flex-col justify-center leading-none">
          <span className="text-[13px] sm:text-[15px] font-bold text-hero-text tabular-nums leading-none tracking-tight">
            {totalReports}
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium text-hero-muted leading-none mt-0.5 hidden min-[1280px]:inline">
            Laporan masuk
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium text-hero-muted leading-none mt-0.5 inline min-[1280px]:hidden">
            Laporan
          </span>
        </div>
      </div>

      {/* ── Chip 2: Klaster Aktif ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 rounded-[8px] sm:rounded-[10px] border border-hero-card-border bg-hero-card-bg px-2 sm:px-2.5 py-1 backdrop-blur-xs shadow-xs h-[36px] sm:h-[38px] shrink-0 justify-center sm:justify-start">
        <div className="flex h-5 w-5 sm:h-5.5 sm:w-5.5 shrink-0 items-center justify-center rounded-[5px] sm:rounded-[6px] bg-hero-chip-bg text-hero-accent">
          <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </div>
        <div className="flex flex-col justify-center leading-none">
          <span className="text-[13px] sm:text-[15px] font-bold text-hero-text tabular-nums leading-none tracking-tight">
            {totalActiveClusters}
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium text-hero-muted leading-none mt-0.5 hidden min-[1280px]:inline">
            Klaster aktif
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium text-hero-muted leading-none mt-0.5 inline min-[1280px]:hidden">
            Klaster
          </span>
        </div>
      </div>

      {/* ── Chip 3: Prioritas Kritis ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 rounded-[8px] sm:rounded-[10px] border border-hero-card-border bg-hero-card-bg px-2 sm:px-2.5 py-1 backdrop-blur-xs shadow-xs h-[36px] sm:h-[38px] shrink-0 justify-center sm:justify-start">
        <div className="flex h-5 w-5 sm:h-5.5 sm:w-5.5 shrink-0 items-center justify-center rounded-[5px] sm:rounded-[6px] bg-kritis-chip-dark text-kritis-on-dark">
          <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </div>
        <div className="flex flex-col justify-center leading-none">
          <span className="text-[13px] sm:text-[15px] font-bold text-kritis-on-dark tabular-nums leading-none tracking-tight">
            {criticalCount}
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium text-hero-muted leading-none mt-0.5 hidden min-[1280px]:inline">
            Prioritas kritis
          </span>
          <span className="text-[9px] sm:text-[10px] font-medium text-hero-muted leading-none mt-0.5 inline min-[1280px]:hidden">
            Kritis
          </span>
        </div>
      </div>
    </section>
  );
}
