"use client";

import React from "react";
import { ListOrdered, FileText, Calculator, Sliders } from "lucide-react";
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

const APP_FULL_NAME = "Triase Evaluasi Perbaikan dan Anggaran Terukur";

export default function TopNav({ activeTab, onSelectTab }: TopNavProps) {
  const isLocalMode = useLocalModeStatus();

  return (
    <header className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1.5 sm:gap-2 lg:gap-3 rounded-[12px] sm:rounded-[14px] border border-hero-border bg-hero-gradient px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-card overflow-hidden shrink-0">
      {/* Pola grid tipis CSS murni tanpa gambar eksternal */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hero-grid"
      />

      {/* ── Baris 1: Brand & Navigasi (pada >= 1024px: Brand saja di kiri) ── */}
      <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-3 w-full lg:w-auto min-w-0">
        {/* Kiri: Merek TEPAT & Nama Panjang Akronim */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
          <span
            title={APP_FULL_NAME}
            className="text-[15px] sm:text-base font-bold tracking-tight text-hero-text leading-tight select-none cursor-help"
          >
            TEPAT
          </span>
          {/* Tampil penuh hanya pada >= 1440px; pada < 1440px tersedia via sr-only dan tooltip title */}
          <span className="sr-only min-[1440px]:not-sr-only min-[1440px]:inline-block text-[11.5px] font-medium text-hero-muted truncate select-none border-l border-hero-border/80 pl-2.5">
            {APP_FULL_NAME}
          </span>
          {isLocalMode && (
            <span className="text-[10px] font-medium text-hero-muted/80 whitespace-nowrap hidden 2xl:inline">
              (Lokal)
            </span>
          )}
        </div>

        {/* Menu Navigasi di layar < 1024px (strip horizontal di kanan Baris 1) */}
        <nav
          aria-label="Navigasi utama"
          className="flex lg:hidden items-center gap-1 overflow-x-auto scrollbar-none py-0.5 shrink min-w-0"
        >
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTab(id)}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 min-h-[38px] rounded-t-[6px] text-[12px] transition-colors duration-150 motion-reduce:transition-none cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-hero-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F2A] ${
                  isActive
                    ? "text-hero-text font-bold border-b-2 border-hero-nav-active-line"
                    : "text-hero-nav-inactive hover:text-hero-text hover:bg-white/5 border-b-2 border-transparent font-medium"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                    isActive
                      ? "text-hero-accent"
                      : "text-hero-muted group-hover:text-hero-text"
                  }`}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Menu Navigasi di layar >= 1024px (berada di tengah) ── */}
      <nav
        aria-label="Navigasi utama"
        className="relative z-10 hidden lg:flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 shrink-0"
      >
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-t-[6px] text-[12.5px] sm:text-[13px] transition-colors duration-150 motion-reduce:transition-none cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-hero-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F2A] ${
                isActive
                  ? "text-hero-text font-bold border-b-2 border-hero-nav-active-line"
                  : "text-hero-nav-inactive hover:text-hero-text hover:bg-white/5 border-b-2 border-transparent font-medium"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 transition-colors ${
                  isActive
                    ? "text-hero-accent"
                    : "text-hero-muted group-hover:text-hero-text"
                }`}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Kanan: Tiga Chip KPI (sebaris di >=1024px, baris kedua di <1024px) ── */}
      <div className="relative z-10 flex items-center w-full lg:w-auto shrink-0 pt-1 lg:pt-0 border-t border-hero-border/60 lg:border-t-0">
        <KpiCards />
      </div>
    </header>
  );
}
