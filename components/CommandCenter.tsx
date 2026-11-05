"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { SEED_DISCLAIMER } from "../lib/infratriage";
import Toast from "./Toast";
import Sidebar, { type TabKey } from "./Sidebar";
import KpiCards from "./KpiCards";
import RankingTab from "./panel/RankingTab";
import InspectorTab from "./panel/InspectorTab";
import BudgetTab from "./panel/BudgetTab";
import WeightsTab from "./panel/WeightsTab";

const MapDashboard = dynamic(() => import("./MapDashboard"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-surface border border-border animate-pulse flex items-center justify-center rounded-[16px]">
      <span className="text-muted text-sm font-medium">
        Memuat modul geospasial...
      </span>
    </div>
  ),
});

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState<TabKey>("ranking");

  return (
    <div className="flex h-auto min-h-screen md:h-screen w-full overflow-y-auto md:overflow-hidden bg-bg text-ink font-sans pb-16 md:pb-0">
      {/* ── Sidebar Kiri (Desktop / Tablet & Navigasi Bawah Mobile) ── */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* ── Area Konten Utama ── */}
      <div className="flex flex-1 flex-col p-3 sm:p-4 gap-3 min-w-0 h-auto md:h-screen md:overflow-hidden">
        {/* ── Bilah Atas (Top Bar) ── */}
        <header className="flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[20px] sm:text-[22px] font-bold text-ink leading-tight tracking-tight">
                Prioritas perbaikan infrastruktur
              </h1>
              <span
                title={SEED_DISCLAIMER}
                className="cursor-help rounded-[8px] border border-[var(--disclaimer-border)] bg-[var(--disclaimer-bg)]/40 px-2 py-0.5 text-[11px] font-semibold text-[var(--disclaimer-ink)] whitespace-nowrap"
              >
                Data simulasi
              </span>
            </div>
            <p className="text-[12px] font-medium text-muted mt-0.5">
              Kota Yogyakarta
            </p>
          </div>
        </header>

        {/* ── Baris 3 Kartu KPI ── */}
        <KpiCards />

        {/* ── Ruang Kerja: Kartu Peta & Kartu Panel Kanan ── */}
        <main className="flex flex-1 flex-col md:flex-row gap-3 min-h-0 md:overflow-hidden w-full max-w-full">
          {/* Kartu Peta */}
          <section
            aria-label="Peta Klaster Infrastruktur"
            className="relative flex-1 min-w-0 h-[420px] md:h-full min-h-[420px] rounded-[16px] border border-border bg-surface shadow-card overflow-hidden"
          >
            <MapDashboard />
          </section>

          {/* Kartu Panel Kanan */}
          <aside
            aria-label="Panel Analisis dan Kontrol"
            className="flex w-full md:w-[clamp(380px,26vw,460px)] md:flex-shrink-0 flex-col rounded-[16px] border border-border bg-surface shadow-card overflow-hidden h-[480px] md:h-full z-10"
          >
            {/* Konten Tab Aktif (Internal Scroll) */}
            <div className="flex-1 overflow-y-auto bg-surface p-4">
              {activeTab === "ranking" && <RankingTab />}
              {activeTab === "inspector" && <InspectorTab />}
              {activeTab === "budget" && <BudgetTab />}
              {activeTab === "weights" && <WeightsTab />}
            </div>
          </aside>
        </main>
      </div>

      {/* ── Toast Mandiri ── */}
      <Toast />
    </div>
  );
}
