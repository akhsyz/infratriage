"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApp, useBudgetPlan } from "../../lib/store";
import { formatRupiah, formatRupiahInput, parseRupiah } from "../../lib/format";
import type { StrategyKey, StrategyResult } from "../../lib/infratriage";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Coins,
  FileCheck,
  Info,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const STRATEGY_DESCRIPTIONS: Record<
  StrategyKey,
  { label: string; tag: string; description: string }
> = {
  dp: {
    label: "Dynamic Programming (DP)",
    tag: "Rekomendasi Optimal",
    description:
      "Memaksimalkan total skor urgensi dengan algoritma 0/1 Knapsack matematika presisi.",
  },
  greedy: {
    label: "Greedy Skor per Biaya",
    tag: "Efisiensi Biaya",
    description:
      "Memilih titik dengan rasio urgensi/biaya tertinggi terlebih dahulu hingga anggaran habis.",
  },
  topscore: {
    label: "Skor Tertinggi Dulu",
    tag: "Prioritas Terparah",
    description:
      "Mendahulukan titik dengan skor urgensi mutlak tertinggi tanpa memperhitungkan efisiensi biaya.",
  },
  fifo: {
    label: "Urutan Masuk (FIFO)",
    tag: "Baseline Tradisional",
    description:
      "Mendahulukan laporan yang masuk paling awal sesuai kebiasaan pembagian manual tanpa optimasi.",
  },
};

const PRESET_BUDGETS = [
  { label: "25 Jt", value: 25_000_000 },
  { label: "50 Jt", value: 50_000_000 },
  { label: "100 Jt", value: 100_000_000 },
  { label: "250 Jt", value: 250_000_000 },
];

export default function BudgetTab() {
  const { state, dispatch } = useApp();
  const plan = useBudgetPlan();

  // Local state untuk teks input anggaran
  const [inputValue, setInputValue] = useState<string>(() =>
    formatRupiahInput(state.budget)
  );

  // Sinkronkan input lokal bila state.budget berubah dari luar
  useEffect(() => {
    setInputValue(formatRupiahInput(state.budget));
  }, [state.budget]);

  // Handler perubahan teks input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatRupiahInput(raw);
    setInputValue(formatted);
    const parsed = parseRupiah(formatted);
    dispatch({ type: "SET_BUDGET", payload: parsed });
  };

  // Pilih preset
  const handleSelectPreset = (value: number) => {
    dispatch({ type: "SET_BUDGET", payload: value });
    dispatch({ type: "RUN_PLAN" });
  };

  // Jalankan simulasi
  const handleRunPlan = () => {
    const parsed = parseRupiah(inputValue);
    dispatch({ type: "SET_BUDGET", payload: parsed });
    dispatch({ type: "RUN_PLAN" });
  };

  // Hasil strategi aktif
  const activeResult: StrategyResult | null = useMemo(() => {
    if (!plan) return null;
    return (
      plan.results.find((r) => r.key === state.activeStrategy) ??
      plan.recommended
    );
  }, [plan, state.activeStrategy]);

  // Sisa anggaran strategi aktif
  const remainingBudget = useMemo(() => {
    if (!activeResult) return state.budget;
    return Math.max(0, state.budget - activeResult.totalCost);
  }, [state.budget, activeResult]);

  // Handler jadwalkan semua rekomendasi
  const handleScheduleAll = () => {
    if (!activeResult || activeResult.ids.length === 0) return;
    dispatch({
      type: "SCHEDULE_PLAN",
      payload: { ids: activeResult.ids },
    });
  };

  const isTooSmall = plan && plan.results.every((r) => r.ids.length === 0);

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. Input Anggaran & Kontrol Simulasi ── */}
      <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
            <Coins className="h-4 w-4 text-accent" />
            <span>Alokasi Anggaran Perbaikan</span>
          </div>
          <span className="text-[11px] font-medium text-muted">Mata Uang IDR</span>
        </div>

        {/* Input Rupiah */}
        <div className="flex flex-col gap-1.5">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-sm font-bold text-muted pointer-events-none">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRunPlan();
              }}
              placeholder="100.000.000"
              className="w-full rounded-[10px] border border-border-input bg-bg py-2.5 pl-10 pr-3 text-base font-bold text-ink tabular-nums placeholder:text-muted/60 focus:border-accent focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>

          {/* Tombol Preset Cepat */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted mr-1">Preset:</span>
            {PRESET_BUDGETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handleSelectPreset(p.value)}
                className={`rounded-[8px] px-2 py-0.5 text-[11px] font-semibold transition-all ${
                  state.budget === p.value
                    ? "bg-accent text-white shadow-2xs"
                    : "bg-bg text-muted border border-border hover:text-ink hover:bg-tint"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tombol Rekomendasikan */}
        <button
          type="button"
          onClick={handleRunPlan}
          className="flex items-center justify-center gap-2 rounded-[10px] bg-accent py-2.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          <span>Simulasikan 4 Strategi Rekomendasi</span>
        </button>
      </div>

      {/* ── 2. Hasil Simulasi 4 Strategi ── */}
      {!state.planRequested ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-tint/40 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border text-accent mb-2 shadow-xs">
            <Coins className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-ink">
            Simulator Alokasi Anggaran Belum Dijalankan
          </p>
          <p className="mt-1 text-[11px] text-muted max-w-xs leading-relaxed">
            Tentukan nominal anggaran di atas lalu klik tombol &ldquo;Simulasikan
            4 Strategi Rekomendasi&rdquo; untuk membandingkan optimasi DP,
            Greedy, Skor Tertinggi, dan FIFO.
          </p>
        </div>
      ) : plan?.candidates === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-border bg-tint/60 p-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-accent mb-2" />
          <p className="text-xs font-semibold text-ink">
            Tidak Ada Klaster Pending
          </p>
          <p className="mt-1 text-[11px] text-muted max-w-xs">
            Seluruh titik kerusakan telah berstatus terjadwal atau selesai.
          </p>
        </div>
      ) : isTooSmall ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border border-tinggi/30 bg-tinggi-tint/40 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-tinggi mb-2" />
          <p className="text-xs font-bold text-tinggi-ink">
            Anggaran Terlalu Kecil
          </p>
          <p className="mt-1 text-[11px] text-muted max-w-xs">
            Nominal {formatRupiah(state.budget)} belum mencukupi untuk mendanai
            satu pun titik perbaikan mikro. Silakan naikkan nominal anggaran.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Ringkasan Kandidat & Pemilih Strategi */}
          <div className="flex items-center justify-between px-1 text-xs text-muted">
            <span>
              Kandidat:{" "}
              <strong className="text-ink font-semibold">
                {plan?.candidates} titik pending
              </strong>
            </span>
            <span>Pilih kartu untuk menyorot di peta</span>
          </div>

          {/* Kartu 4 Strategi */}
          <div className="flex flex-col gap-2.5">
            {plan?.results.map((res) => {
              const isSelected = state.activeStrategy === res.key;
              const meta = STRATEGY_DESCRIPTIONS[res.key];
              const isDp = res.key === "dp";

              return (
                <div
                  key={res.key}
                  onClick={() =>
                    dispatch({ type: "SET_STRATEGY", payload: res.key })
                  }
                  className={`flex flex-col gap-2.5 rounded-[12px] p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-2 border-accent bg-accent-soft/30 shadow-xs ring-2 ring-accent/20"
                      : "border border-border bg-surface hover:border-border-input hover:bg-tint/70"
                  }`}
                >
                  {/* Baris Judul & Badge Tag */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">
                        {meta.label}
                      </span>
                      {isDp && (
                        <span className="rounded-[6px] bg-accent text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                          {meta.tag}
                        </span>
                      )}
                      {!isDp && (
                        <span className="rounded-[6px] bg-bg border border-border text-muted px-1.5 py-0.5 text-[10px] font-medium">
                          {meta.tag}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-accent">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Aktif di Peta</span>
                      </span>
                    )}
                  </div>

                  {/* Keterangan Singkat Cara Kerja */}
                  <p className="text-[11px] text-muted leading-tight">
                    {meta.description}
                  </p>

                  {/* Grid 4 Metrik Indikator */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/60 text-center">
                    {/* 1. Titik */}
                    <div className="flex flex-col rounded-[8px] bg-bg/80 border border-border/40 p-1.5">
                      <span className="text-[10px] font-medium text-muted">
                        Titik
                      </span>
                      <span className="text-xs font-bold text-ink tabular-nums mt-0.5">
                        {res.ids.length}
                      </span>
                    </div>

                    {/* 2. Biaya Terpakai */}
                    <div className="flex flex-col rounded-[8px] bg-bg/80 border border-border/40 p-1.5">
                      <span className="text-[10px] font-medium text-muted">
                        Biaya ({res.budgetUsedPct.toFixed(0)}%)
                      </span>
                      <span className="text-xs font-bold text-ink tabular-nums mt-0.5">
                        {formatRupiah(res.totalCost)}
                      </span>
                    </div>

                    {/* 3. Cakupan Skor */}
                    <div className="flex flex-col rounded-[8px] bg-bg/80 border border-border/40 p-1.5">
                      <span className="text-[10px] font-medium text-muted">
                        Cakupan Skor
                      </span>
                      <span className="text-xs font-bold text-accent tabular-nums mt-0.5">
                        {res.valueCoveragePct.toFixed(1)}%
                      </span>
                    </div>

                    {/* 4. Klaster Kritis */}
                    <div className="flex flex-col rounded-[8px] bg-bg/80 border border-border/40 p-1.5">
                      <span className="text-[10px] font-medium text-muted">
                        Kritis
                      </span>
                      <span className="text-xs font-bold text-kritis tabular-nums mt-0.5">
                        {res.criticalCount}/{res.criticalTotal}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 3. Aksi Eksekusi: Jadwalkan Semua Rekomendasi ── */}
          {activeResult && activeResult.ids.length > 0 && (
            <div className="flex flex-col gap-2.5 rounded-[12px] border border-border bg-surface p-4 shadow-xs mt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted">
                  Sisa Anggaran Tersedia:
                </span>
                <span className="font-bold text-ink tabular-nums text-sm">
                  {formatRupiah(remainingBudget)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleScheduleAll}
                className="flex items-center justify-center gap-2 rounded-[10px] bg-accent py-2.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <span>
                  Jadwalkan Semua Rekomendasi ({activeResult.ids.length} Titik)
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Catatan Permanen Asumsi & Kejujuran (Wajib Tampil) ── */}
      <div className="flex items-start gap-2 rounded-[10px] border border-border/80 bg-tint/60 p-3 text-[11px] text-muted leading-relaxed">
        <Info className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-ink font-semibold">Catatan asumsi:</strong>{" "}
          Biaya adalah estimasi ilustrasi; cakupan skor merupakan indeks
          optimasi matematis internal, bukan penurunan risiko nyata di lapangan.
        </p>
      </div>

      {/* Catatan integritas kanal resmi */}
      <p className="text-[12px] text-muted text-center">
        Prototipe pendukung keputusan, bukan pengganti kanal laporan resmi.
      </p>
    </div>
  );
}
