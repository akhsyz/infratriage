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
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full flex-shrink-0"
    >
      {/* ── Kartu 1: Laporan Masuk ── */}
      <div className="flex items-center gap-3.5 rounded-[16px] border border-border bg-surface p-3.5 shadow-card">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-accent">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <span className="block text-[12px] font-medium text-muted leading-tight">
            Laporan masuk
          </span>
          <span className="text-[28px] font-bold text-ink tabular-nums leading-none tracking-tight">
            {totalReports}
          </span>
        </div>
      </div>

      {/* ── Kartu 2: Klaster Aktif ── */}
      <div className="flex items-center gap-3.5 rounded-[16px] border border-border bg-surface p-3.5 shadow-card">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-accent">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <span className="block text-[12px] font-medium text-muted leading-tight">
            Klaster aktif
          </span>
          <span className="text-[28px] font-bold text-ink tabular-nums leading-none tracking-tight">
            {totalActiveClusters}
          </span>
        </div>
      </div>

      {/* ── Kartu 3: Prioritas Kritis ── */}
      <div className="flex items-center gap-3.5 rounded-[16px] border border-border bg-surface p-3.5 shadow-card">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-kritis-tint text-kritis">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <span className="block text-[12px] font-medium text-muted leading-tight">
            Prioritas kritis
          </span>
          <span className="text-[28px] font-bold text-kritis tabular-nums leading-none tracking-tight">
            {criticalCount}
          </span>
        </div>
      </div>
    </section>
  );
}
