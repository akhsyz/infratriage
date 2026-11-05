"use client";

import React from "react";
import { ListOrdered, FileText, Calculator, Sliders } from "lucide-react";
import { SEED_DISCLAIMER } from "../lib/infratriage/seed";
import { MAP_TILE } from "../lib/theme";

export type TabKey = "ranking" | "inspector" | "budget" | "weights";

interface SidebarProps {
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

export default function Sidebar({ activeTab, onSelectTab }: SidebarProps) {
  const hasCarto = MAP_TILE.attribution.includes("CARTO");

  return (
    <>
      {/* ── Sidebar Desktop / Tablet (md ke atas: 72px pada 1024-1439px, 232px pada >=1440px) ── */}
      <aside
        aria-label="Navigasi Samping"
        className="hidden md:flex flex-col justify-between w-[72px] min-[1440px]:w-[232px] h-full border-r border-border bg-surface p-3 transition-all duration-200 flex-shrink-0 z-20 select-none"
      >
        <div className="flex flex-col gap-6">
          {/* Blok Brand */}
          <div className="flex items-center gap-3 px-1 min-[1440px]:px-2 pt-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-white font-bold text-base shadow-xs">
              T
            </div>
            <div className="hidden min-[1440px]:block overflow-hidden">
              <div className="text-base font-bold tracking-tight text-ink leading-tight">
                TEPAT
              </div>
              <p className="text-[11px] text-muted font-medium leading-tight truncate">
                Prioritas perbaikan infrastruktur
              </p>
            </div>
          </div>

          {/* Menu Navigasi 4 Tab */}
          <nav aria-label="Menu Utama" className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectTab(id)}
                  title={label}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex items-center min-[1440px]:justify-start justify-center gap-3 rounded-[10px] px-2.5 min-[1440px]:px-3 py-2.5 text-[13px] transition-all relative cursor-pointer min-h-[44px] ${
                    isActive
                      ? "bg-accent-soft text-accent font-semibold border-l-[3px] border-accent"
                      : "text-ink-2 hover:bg-tint hover:text-ink font-medium border-l-[3px] border-transparent"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive
                        ? "text-accent"
                        : "text-muted group-hover:text-ink"
                    }`}
                  />
                  <span className="hidden min-[1440px]:inline truncate">
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Kartu "Tentang data" di bagian bawah sidebar (hanya di >= 1440px) */}
        <div className="hidden min-[1440px]:flex flex-col gap-2 rounded-[16px] border border-border bg-gradient-to-b from-accent-soft to-accent-soft-2 p-3.5 text-[11px] text-ink-2 shadow-xs">
          {/* Ilustrasi garis sederhana siluet Yogyakarta (Tugu & Kraton) */}
          <svg
            viewBox="0 0 200 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-9 text-accent/40"
            aria-hidden="true"
          >
            <path
              d="M0 46h200 M8 46v-5h12v5 M28 46v-12l10-6 10 6v12 M62 46v-9h16v9 M92 46v-18l3-2 2-15 3-4 3 4 2 15 3 2v18 M122 46v-13l11-7 11 7v13 M160 46v-8h16v8 M184 46v-5h10v5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="font-semibold text-ink text-[12px] flex items-center justify-between">
            <span>Tentang data</span>
            <span className="rounded-[6px] border border-[var(--disclaimer-border)] bg-[var(--disclaimer-bg)]/40 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--disclaimer-ink)]">
              Simulasi
            </span>
          </div>

          <p className="text-muted leading-relaxed">
            {SEED_DISCLAIMER}
          </p>

          <div className="border-t border-accent/15 pt-2 flex flex-col gap-1 text-[10px] text-muted leading-tight">
            <div>· Asumsi ilustratif</div>
            <div>
              · Prototipe pendukung keputusan, bukan pengganti kanal laporan resmi
            </div>
            <div className="pt-0.5">
              · Peta:{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-ink"
              >
                © OpenStreetMap contributors
              </a>
              {hasCarto && <span>, © CARTO</span>}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Navigasi Bawah Mobile (< 768px) ── */}
      <nav
        aria-label="Navigasi Bawah"
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-border bg-surface px-2 py-1 shadow-lg min-h-[56px]"
      >
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 min-h-[44px] transition-colors ${
                isActive ? "text-accent font-semibold" : "text-muted hover:text-ink"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  isActive ? "text-accent" : "text-muted"
                }`}
              />
              <span className="text-[10px] mt-0.5 leading-tight">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
