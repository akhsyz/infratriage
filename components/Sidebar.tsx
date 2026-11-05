"use client";

import React from "react";
import { ListOrdered, FileText, Calculator, Sliders } from "lucide-react";

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

        {/* Nomor versi kecil di bagian bawah sidebar */}
        <div className="px-2 py-1 text-[11px] text-muted font-medium select-none text-center min-[1440px]:text-left">
          v1.0.0
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
