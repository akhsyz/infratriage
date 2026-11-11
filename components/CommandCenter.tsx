"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { SEED_DISCLAIMER } from "../lib/infratriage";
import { useLocalModeStatus } from "../lib/persistence";
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
  const isLocalMode = useLocalModeStatus();

  return (
    <div className="flex h-auto min-h-screen md:h-screen w-full overflow-y-auto md:overflow-hidden bg-bg text-ink font-sans pb-16 md:pb-0">
      {/* ── Sidebar Kiri (Desktop / Tablet & Navigasi Bawah Mobile) ── */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* ── Area Konten Utama ── */}
      <div className="flex flex-1 flex-col p-3 sm:p-4 gap-3 min-w-0 h-auto md:h-screen md:overflow-hidden">
        {/* ── Pita Atas Hero Gelap (Judul + Subjudul + Badge + Baris KPI) ── */}
        <header className="relative flex flex-col gap-2.5 sm:gap-3 rounded-[16px] border border-hero-border bg-hero-gradient p-3 sm:p-3.5 shadow-card overflow-hidden flex-shrink-0">
          {/* Pola grid tipis CSS tanpa gambar eksternal */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hero-grid"
          />

          {/* Baris Judul, Badge, dan Subjudul */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <h1 className="text-[19px] sm:text-[21px] font-bold text-hero-text leading-tight tracking-tight">
                  Prioritas perbaikan{" "}
                  <span className="text-hero-accent">infrastruktur</span>
                </h1>
                <span
                  title={SEED_DISCLAIMER}
                  className="cursor-help rounded-full border border-hero-badge-border bg-hero-badge-bg px-2.5 py-0.5 text-[11px] font-semibold text-hero-badge-text whitespace-nowrap shadow-xs"
                >
                  Data simulasi
                </span>
                {isLocalMode && (
                  <span className="text-[11px] font-medium text-hero-muted whitespace-nowrap">
                    Mode lokal: laporan tidak tersimpan
                  </span>
                )}
              </div>
              <p className="text-[12px] font-medium text-hero-muted mt-0.5">
                Kota Yogyakarta
              </p>
            </div>
          </div>

          {/* Baris 3 Kartu KPI di dalam Pita Atas */}
          <div className="relative z-10 w-full">
            <KpiCards />
          </div>
        </header>

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
