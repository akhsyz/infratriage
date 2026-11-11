"use client";

import React from "react";
import { ListOrdered, FileText, Calculator, Sliders } from "lucide-react";
import { SEED_DISCLAIMER } from "../lib/infratriage";
import { useLocalModeStatus } from "../lib/persistence";
import KpiCards from "./KpiCards";

export type TabKey = "ranking" | "inspector" | "budget" | "weights";

interface TopNavProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

interface NavItem {
  id: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "ranking", label: "Peringkat", icon: ListOrdered },
  { id: "inspector", label: "Detail", icon: FileText },
  { id: "budget", label: "Anggaran", icon: Calculator },
  { id: "weights", label: "Bobot", icon: Sliders },
];

export default function TopNav({ activeTab, onSelectTab }: TopNavProps) {
  const isLocalMode = useLocalModeStatus();

  return (
    <header className="relative flex flex-col gap-2.5 sm:gap-3 rounded-[16px] border border-hero-border bg-hero-gradient p-3 sm:p-3.5 shadow-card overflow-hidden shrink-0">
      {/* Pola grid tipis CSS murni tanpa gambar eksternal */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hero-grid"
      />

      {/* ── Baris 1: Logo Brand + Subjudul & Navigasi Tab ── */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 border-b border-hero-border/80 pb-2 sm:pb-2.5">
        {/* Kiri: Logo Chip "T" + "TEPAT" + Subjudul */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-hero-brand-chip-bg text-hero-brand-chip-ink font-extrabold text-sm shadow-xs select-none">
            T
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-base font-bold tracking-tight text-hero-text leading-tight select-none">
              TEPAT
            </span>
            <span className="hidden md:inline-block text-[12px] font-medium text-hero-muted truncate select-none">
              Prioritas perbaikan infrastruktur
            </span>
          </div>
        </div>

        {/* Kanan: Navigasi Utama Tab */}
        <nav
          aria-label="Navigasi utama"
          className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full -mx-1 px-1 sm:mx-0 sm:px-0"
        >
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTab(id)}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 min-h-[40px] rounded-t-[8px] text-[13px] transition-colors duration-150 motion-reduce:transition-none cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-hero-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F2A] ${
                  isActive
                    ? "text-hero-text font-bold border-b-2 border-hero-nav-active-line"
                    : "text-hero-nav-inactive hover:text-hero-text hover:bg-white/5 border-b-2 border-transparent font-medium"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive
                      ? "text-hero-accent"
                      : "text-hero-muted group-hover:text-hero-text"
                  }`}
                />
                <span>{label}</span>
              </button>
            );
          })}
          {/* Nomor versi redup di sisi kanan header desktop */}
          <span className="hidden xl:inline-block text-[11px] text-hero-muted/50 font-mono pl-2 select-none">
            v1.0.0
          </span>
        </nav>
      </div>

      {/* ── Baris 2: Judul, Badge, Subjudul & Tiga Kartu KPI Kompak ── */}
      <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5 sm:gap-3">
        {/* Kiri: Judul, Badge Simulasi, Subjudul Yogyakarta */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="text-[18px] sm:text-[20px] font-bold text-hero-text leading-tight tracking-tight">
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
          <p className="text-[12px] font-medium text-hero-muted">
            Kota Yogyakarta
          </p>
        </div>

        {/* Kanan: Tiga Kartu KPI Kompak (Satu baris di >=1280px) */}
        <div className="w-full xl:w-auto shrink-0">
          <KpiCards />
        </div>
      </div>
    </header>
  );
}
