"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useApp } from "../lib/store";
import { computeScore, priorityLevel, type ScoreContext } from "../lib/infratriage";
import { vitals } from "../lib/vitals";
import Toast from "./Toast";
import RankingTab from "./panel/RankingTab";
import InspectorTab from "./panel/InspectorTab";
import BudgetTab from "./panel/BudgetTab";
import WeightsTab from "./panel/WeightsTab";
import { AlertTriangle, FileText, Layers } from "lucide-react";

const MapDashboard = dynamic(() => import("./MapDashboard"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-bg border border-border animate-pulse flex items-center justify-center">
      <span className="text-muted text-sm font-medium">
        Memuat modul geospasial...
      </span>
    </div>
  ),
});

type TabKey = "ranking" | "inspector" | "budget" | "weights";

export default function CommandCenter() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>("ranking");

  // KPI Utama (Global)
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
    <div className="flex h-screen w-full flex-col overflow-hidden bg-bg text-ink font-sans">
      {/* ── Header Utama ── */}
      <header className="flex flex-shrink-0 flex-wrap items-center justify-between border-b border-border bg-header-bg px-4 py-2.5 sm:px-6 text-header-ink shadow-sm z-10">
        {/* Identitas Produk */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white font-bold text-sm tracking-tight shadow-sm">
            T
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">
                TEPAT
              </span>
              <span className="rounded-[6px] border border-disclaimer-border bg-disclaimer-bg px-2 py-0.5 text-[11px] font-semibold text-disclaimer-ink">
                Data simulasi
              </span>
            </div>
            <p className="text-[12px] text-header-muted leading-tight font-medium">
              Prioritas perbaikan infrastruktur · Yogyakarta
            </p>
          </div>
        </div>

        {/* 3 KPI Utama */}
        <div className="flex items-center gap-4 sm:gap-6 mt-2 sm:mt-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 border border-white/10">
              <FileText className="h-3.5 w-3.5 text-header-icon" />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-header-muted leading-tight">
                Laporan masuk
              </span>
              <span className="text-sm font-semibold text-white tabular-nums">
                {totalReports}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 border border-white/10">
              <Layers className="h-3.5 w-3.5 text-header-icon" />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-header-muted leading-tight">
                Klaster aktif
              </span>
              <span className="text-sm font-semibold text-white tabular-nums">
                {totalActiveClusters}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 border border-white/10">
              <AlertTriangle className="h-3.5 w-3.5 text-kritis" />
            </div>
            <div>
              <span className="block text-[11px] font-medium text-header-muted leading-tight">
                Prioritas kritis
              </span>
              <span className="text-sm font-semibold text-kritis tabular-nums">
                {criticalCount}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Area Kerja Utama: Peta & Panel Kanan ── */}
      <main className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Area Peta */}
        <section
          aria-label="Peta Klaster Infrastruktur"
          className="relative flex-1 h-[45vh] md:h-full overflow-hidden bg-bg"
        >
          <MapDashboard />
        </section>

        {/* Panel Kanan */}
        <aside
          aria-label="Panel Analisis dan Kontrol"
          className="flex w-full md:w-[440px] lg:w-[480px] flex-col border-t md:border-t-0 md:border-l border-border bg-surface h-[55vh] md:h-full z-10 shadow-sm"
        >
          {/* Segmented Control / Tab Bar */}
          <div className="flex border-b border-border bg-tint p-2 gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("ranking")}
              className={`flex-1 rounded-[8px] py-1.5 text-[12px] font-medium transition-all ${
                activeTab === "ranking"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-ink hover:bg-surface/50"
              }`}
            >
              Peringkat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inspector")}
              className={`flex-1 rounded-[8px] py-1.5 text-[12px] font-medium transition-all ${
                activeTab === "inspector"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-ink hover:bg-surface/50"
              }`}
            >
              Detail
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("budget")}
              className={`flex-1 rounded-[8px] py-1.5 text-[12px] font-medium transition-all ${
                activeTab === "budget"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-ink hover:bg-surface/50"
              }`}
            >
              Anggaran
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("weights")}
              className={`flex-1 rounded-[8px] py-1.5 text-[12px] font-medium transition-all ${
                activeTab === "weights"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-ink hover:bg-surface/50"
              }`}
            >
              Bobot
            </button>
          </div>

          {/* Konten Tab Aktif */}
          <div className="flex-1 overflow-y-auto bg-surface p-4">
            {activeTab === "ranking" && <RankingTab />}
            {activeTab === "inspector" && <InspectorTab />}
            {activeTab === "budget" && <BudgetTab />}
            {activeTab === "weights" && <WeightsTab />}
          </div>
        </aside>
      </main>

      {/* ── Footer Atribusi ── */}
      <footer className="flex flex-shrink-0 items-center justify-between border-t border-border bg-footer-bg px-4 py-2 text-[12px] text-footer-ink">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white"
            >
              OpenStreetMap contributors
            </a>
          </span>
          <span>·</span>
          <span>© CARTO</span>
          <span>·</span>
          <span>Asumsi ilustrasi</span>
        </div>
        <div className="hidden sm:block text-[11px] text-footer-ink/80">
          Prototipe pendukung keputusan, bukan pengganti kanal resmi
        </div>
      </footer>

      {/* ── Toast Mandiri ── */}
      <Toast />
    </div>
  );
}

