"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Toast from "./Toast";
import TopNav, { type TabKey } from "./TopNav";
import RankingTab from "./panel/RankingTab";
import InspectorTab from "./panel/InspectorTab";
import BudgetTab from "./panel/BudgetTab";
import WeightsTab from "./panel/WeightsTab";

const MapDashboard = dynamic(() => import("./MapDashboard"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-surface border border-border animate-pulse flex items-center justify-center rounded-[14px]">
      <span className="text-muted text-sm font-medium">
        Memuat modul geospasial...
      </span>
    </div>
  ),
});

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState<TabKey>("ranking");

  return (
    <div className="min-h-screen md:h-screen w-full overflow-y-auto md:overflow-hidden bg-bg text-ink font-sans flex flex-col">
      {/* ── Header Full-Bleed (Membentang penuh dari tepi ke tepi viewport) ── */}
      <TopNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* ── Area Konten di Bawah Header: Gutter 16px (px-4), Jarak dari Header 12px (pt-3 pb-2.5) ── */}
      <div className="flex flex-1 flex-col px-4 pt-3 pb-2.5 gap-3 w-full min-w-0 h-auto md:flex-1 md:overflow-hidden">
        {/* ── Ruang Kerja: Kartu Peta & Kartu Panel Kanan (Melebar sampai tepi padding) ── */}
        <main className="flex flex-1 flex-col md:flex-row gap-3 min-h-0 md:overflow-hidden w-full max-w-full">
          {/* Kartu Peta (Memanfaatkan ruang maksimal layar) */}
          <section
            aria-label="Peta Klaster Infrastruktur"
            className="relative flex-1 min-w-0 h-[420px] md:h-full min-h-[420px] rounded-[14px] border border-border bg-surface shadow-card overflow-hidden"
          >
            <MapDashboard />
          </section>

          {/* Kartu Panel Kanan */}
          <aside
            aria-label="Panel Analisis dan Kontrol"
            className="flex w-full md:w-[clamp(380px,26vw,460px)] md:flex-shrink-0 flex-col rounded-[14px] border border-border bg-surface shadow-card overflow-hidden h-[480px] md:h-full z-10"
          >
            {/* Konten Tab Aktif (Internal Scroll) */}
            <div className="flex-1 overflow-y-auto bg-surface p-3 sm:p-4">
              {activeTab === "ranking" && <RankingTab />}
              {activeTab === "inspector" && <InspectorTab />}
              {activeTab === "budget" && <BudgetTab />}
              {activeTab === "weights" && <WeightsTab />}
            </div>
          </aside>
        </main>

        {/* ── Footer Tipis: Tinggi <= 28px, Satu Baris ── */}
        <footer className="shrink-0 flex items-center justify-between gap-2 px-1 text-[11px] text-muted select-none h-6 sm:h-7 leading-none">
          <p className="truncate text-muted">
            Prototipe pendukung keputusan, bukan pengganti kanal laporan resmi. Data simulasi.
          </p>
          <div className="flex items-center gap-2.5 shrink-0 text-muted">
            <span className="hidden sm:inline">&copy; OpenStreetMap contributors</span>
            <span className="inline sm:hidden">&copy; OSM</span>
            <span className="font-mono text-muted/70">v1.0.0</span>
          </div>
        </footer>
      </div>

      {/* ── Toast Mandiri ── */}
      <Toast />
    </div>
  );
}
