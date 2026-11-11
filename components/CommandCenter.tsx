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
    <div className="min-h-screen md:h-screen w-full overflow-y-auto md:overflow-hidden bg-bg text-ink font-sans flex flex-col">
      {/* ── Kontainer Utama Selebar Layar Rata Tengah (Padding 24px = sm:p-6, max-width 1680px) ── */}
      <div className="flex flex-1 flex-col p-3 sm:p-6 max-w-[1680px] w-full mx-auto gap-3 min-w-0 h-auto md:h-screen md:overflow-hidden">
        {/* ── Blok Header Gelap Menyatu (Baris 1 Brand & Nav + Baris 2 Judul & KPI) ── */}
        <TopNav activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* ── Ruang Kerja: Kartu Peta & Kartu Panel Kanan ── */}
        <main className="flex flex-1 flex-col md:flex-row gap-3 min-h-0 md:overflow-hidden w-full max-w-full">
          {/* Kartu Peta (Memanfaatkan ruang yang bertambah) */}
          <section
            aria-label="Peta Klaster Infrastruktur"
            className="relative flex-1 min-w-0 h-[420px] md:h-full min-h-[420px] rounded-[16px] border border-border bg-surface shadow-card overflow-hidden"
          >
            <MapDashboard />
          </section>

          {/* Kartu Panel Kanan */}
          <aside
            aria-label="Panel Analisis dan Kontrol"
            className="flex w-full md:w-[clamp(400px,28vw,480px)] md:flex-shrink-0 flex-col rounded-[16px] border border-border bg-surface shadow-card overflow-hidden h-[480px] md:h-full z-10"
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

        {/* ── Footer Tipis: Catatan Permanen & Atribusi OSM ── */}
        <footer className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted select-none">
          <p className="truncate">
            Prototipe pendukung keputusan, bukan pengganti kanal laporan resmi. Data simulasi.
          </p>
          <div className="flex items-center gap-3">
            <span>&copy; OpenStreetMap contributors</span>
            <span className="font-mono text-muted/70">v1.0.0</span>
          </div>
        </footer>
      </div>

      {/* ── Toast Mandiri ── */}
      <Toast />
    </div>
  );
}
