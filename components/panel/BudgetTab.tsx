"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp, useBudgetPlan } from "../../lib/store";
import { formatRupiah, formatRupiahInput, parseRupiah } from "../../lib/format";
import {
  isCostTableModified,
  validateCostValue,
  initRobustness,
  stepRobustness,
  finalizeRobustness,
  getBudgetCandidates,
  type Category,
  type Severity,
  type StrategyKey,
  type StrategyResult,
  type CostRobustnessResult,
  type ScoreContext,
} from "../../lib/infratriage";
import { vitals } from "../../lib/vitals";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  FileCheck,
  Info,
  Layers,
  Play,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
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

const COST_CATEGORIES: { key: Category; label: string }[] = [
  { key: "lubang", label: "Jalan berlubang" },
  { key: "drainase", label: "Drainase tersumbat" },
  { key: "lampu_jalan", label: "Lampu jalan mati" },
  { key: "trotoar", label: "Trotoar rusak" },
];

const SEVERITY_LEVELS: { severity: Severity; label: string }[] = [
  { severity: 1, label: "Ringan" },
  { severity: 2, label: "Sedang" },
  { severity: 3, label: "Berat" },
];

function CostInputCell({
  category,
  severity,
  categoryLabel,
  severityLabel,
  currentValue,
  onCostChange,
}: {
  category: Category;
  severity: Severity;
  categoryLabel: string;
  severityLabel: string;
  currentValue: number;
  onCostChange: (category: Category, severity: Severity, cost: number) => void;
}) {
  const [localText, setLocalText] = useState(() => formatRupiahInput(currentValue));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalText(formatRupiahInput(currentValue));
    setError(null);
  }, [currentValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatRupiahInput(raw);
    setLocalText(formatted);

    const parsed = parseRupiah(formatted);
    const val = validateCostValue(parsed);
    if (!val.valid) {
      setError(val.error ?? "Nilai tidak valid");
    } else {
      setError(null);
      onCostChange(category, severity, parsed);
    }
  };

  return (
    <div className="flex flex-col gap-0.5 min-w-0 w-full">
      <input
        type="text"
        inputMode="numeric"
        aria-label={`${categoryLabel}, ${severityLabel}`}
        value={localText}
        onChange={handleChange}
        className={`w-full min-w-0 rounded-[6px] border py-1.5 px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold tabular-nums bg-bg text-ink focus:bg-surface focus:outline-hidden transition-all ${
          error
            ? "border-kritis focus:border-kritis focus:ring-1 focus:ring-kritis/20"
            : "border-border-input focus:border-accent focus:ring-1 focus:ring-accent/20"
        }`}
      />
      {error && (
        <span className="text-[10px] text-kritis leading-tight break-words">
          {error}
        </span>
      )}
    </div>
  );
}

export default function BudgetTab() {
  const { state, dispatch } = useApp();
  const plan = useBudgetPlan();

  // Local state untuk teks input anggaran
  const [inputValue, setInputValue] = useState<string>(() =>
    formatRupiahInput(state.budget)
  );

  // State untuk collapsible "Atur asumsi biaya" (tertutup secara bawaan)
  const [isCostEditorOpen, setIsCostEditorOpen] = useState<boolean>(false);

  // State untuk Uji Ketahanan Biaya
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [robustnessResult, setRobustnessResult] = useState<CostRobustnessResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Bersihkan timer saat unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Kosongkan hasil uji ketahanan jika anggaran atau asumsi biaya berubah
  useEffect(() => {
    setRobustnessResult(null);
    setProgress(0);
    setIsTesting(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [state.budget, state.costTable]);

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
  const isModifiedCost = isCostTableModified(state.costTable);

  // Kandidat aktif untuk uji ketahanan
  const candidates = useMemo(() => {
    if (!state.clusters) return [];
    const ctx: ScoreContext = { vitals, weights: state.weights, now: state.now };
    return getBudgetCandidates(state.clusters, ctx, { costTable: state.costTable });
  }, [state.clusters, state.weights, state.now, state.costTable]);

  // Uji ketahanan dinonaktifkan bila belum ada simulasi atau hasil dasar kosong
  const isRobustnessDisabled = !plan || plan.recommended.ids.length === 0 || isTesting;

  // Handler menjalankan uji ketahanan dalam potongan (chunks)
  const handleRunRobustness = () => {
    if (!plan || plan.recommended.ids.length === 0) return;

    setIsTesting(true);
    setProgress(0);
    setTestError(null);
    setRobustnessResult(null);

    try {
      const itemsToTest = plan.items ?? candidates;
      const acc = initRobustness(itemsToTest, state.budget, { trials: 100 });

      const step = () => {
        try {
          const isDone = stepRobustness(acc, 10);
          const currentPct = Math.round((acc.completedTrials / acc.trials) * 100);
          setProgress(currentPct);

          if (!isDone) {
            timerRef.current = setTimeout(step, 16);
          } else {
            const finalResult = finalizeRobustness(acc);
            setRobustnessResult(finalResult);
            setIsTesting(false);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat uji ketahanan.";
          setTestError(msg);
          setIsTesting(false);
        }
      };

      timerRef.current = setTimeout(step, 16);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memulai uji ketahanan.";
      setTestError(msg);
      setIsTesting(false);
    }
  };

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
          className="flex items-center justify-center gap-2 rounded-[10px] bg-accent py-2.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover transition-colors cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          <span>Simulasikan 4 Strategi Rekomendasi</span>
        </button>
      </div>

      {/* ── FITUR A: Bagian Ringkas "Atur Asumsi Biaya" (Collapsible) ── */}
      <div className="flex flex-col rounded-[12px] border border-border bg-surface shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setIsCostEditorOpen((prev) => !prev)}
          className="flex items-center justify-between p-3.5 hover:bg-tint transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <SlidersHorizontal className="h-4 w-4 text-accent shrink-0" />
            <span className="text-xs font-bold text-ink">Atur asumsi biaya</span>
            <span className="text-[11px] font-medium text-muted">
              (Rupiah per klaster)
            </span>
            {isModifiedCost && (
              <span className="rounded-[6px] bg-tinggi-tint border border-tinggi/40 px-2 py-0.5 text-[10px] font-bold text-tinggi-ink shrink-0">
                Asumsi biaya diubah
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted shrink-0 ml-2">
            <span className="text-[11px] font-medium">
              {isCostEditorOpen ? "Tutup" : "Buka"}
            </span>
            {isCostEditorOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>

        {isCostEditorOpen && (
          <div className="border-t border-border p-3 sm:p-3.5 flex flex-col gap-3 bg-tint/30">
            <div className="flex items-center justify-between text-[11px] flex-wrap gap-1.5">
              <span className="text-muted">Perubahan berlaku selama sesi ini.</span>
              <button
                type="button"
                onClick={() => dispatch({ type: "RESET_COSTS" })}
                disabled={!isModifiedCost}
                className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                  isModifiedCost
                    ? "text-accent hover:text-accent-hover cursor-pointer"
                    : "text-muted/50 cursor-not-allowed"
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                <span>Kembalikan ke bawaan</span>
              </button>
            </div>

            {/* Blok per kategori: baris atas nama kategori, baris bawah 3 kolom */}
            <div className="flex flex-col gap-2.5">
              {COST_CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className="flex flex-col gap-1.5 rounded-[8px] bg-surface border border-border/80 p-2.5"
                >
                  <span className="text-xs font-bold text-ink text-left">
                    {cat.label}
                  </span>
                  <div className="grid grid-cols-3 gap-2 min-w-0">
                    {SEVERITY_LEVELS.map((sev) => (
                      <div key={sev.severity} className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10.5px] font-medium text-muted">
                          {sev.label}
                        </span>
                        <CostInputCell
                          category={cat.key}
                          severity={sev.severity}
                          categoryLabel={cat.label}
                          severityLabel={sev.label}
                          currentValue={state.costTable[cat.key][sev.severity]}
                          onCostChange={(c, s, v) =>
                            dispatch({
                              type: "SET_COST",
                              payload: { category: c, severity: s, cost: v },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-2 border-t border-border/60 text-center min-w-0">
                    {/* 1. Titik */}
                    <div className="flex flex-col rounded-[8px] bg-bg/80 border border-border/40 p-1.5 min-w-0">
                      <span className="text-[10px] font-medium text-muted truncate">
                        Titik
                      </span>
                      <span className="text-xs font-bold text-ink tabular-nums mt-0.5 truncate">
                        {res.ids.length}
                      </span>
                    </div>

                    {/* 2. Biaya Terpakai */}
                    <div className="flex flex-col rounded-[8px] bg-bg/80 border border-border/40 p-1.5 min-w-0">
                      <span className="text-[10px] font-medium text-muted truncate" title={`Biaya (${res.budgetUsedPct.toFixed(0)}%)`}>
                        Biaya ({res.budgetUsedPct.toFixed(0)}%)
                      </span>
                      <span className="text-[10.5px] sm:text-xs font-bold text-ink tabular-nums mt-0.5 truncate" title={formatRupiah(res.totalCost)}>
                        {formatRupiah(res.totalCost)}
                      </span>
                    </div>

                    {/* 3. Cakupan Skor */}
                    <div className="flex flex-col rounded-[8px] bg-bg/80 border border-border/40 p-1.5 min-w-0">
                      <span className="text-[10px] font-medium text-muted truncate">
                        Cakupan Skor
                      </span>
                      <span className="text-xs font-bold text-accent tabular-nums mt-0.5 truncate">
                        {res.valueCoveragePct.toFixed(1)}%
                      </span>
                    </div>

                    {/* 4. Klaster Kritis */}
                    <div className="flex flex-col rounded-[8px] bg-bg/80 border border-border/40 p-1.5 min-w-0">
                      <span className="text-[10px] font-medium text-muted truncate">
                        Kritis
                      </span>
                      <span className="text-xs font-bold text-kritis tabular-nums mt-0.5 truncate">
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
                className="flex items-center justify-center gap-2 rounded-[10px] bg-accent py-2.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover transition-colors cursor-pointer"
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

      {/* ── FITUR B: Kartu Uji Ketahanan Biaya ── */}
      <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span>Uji Ketahanan Biaya</span>
          </div>
          <span className="text-[11px] font-medium text-muted">100 Percobaan (±30%)</span>
        </div>

        <p className="text-[11px] text-muted leading-relaxed">
          Menguji stabilitas rekomendasi DP terhadap fluktuasi biaya tiap titik secara acak independen (rentang 0,7–1,3).
        </p>

        {/* Notifikasi bila kartu dinonaktifkan */}
        {isRobustnessDisabled && !isTesting && (
          <div className="rounded-[8px] bg-tint/60 border border-border/80 p-2.5 text-[11px] text-muted">
            Jalankan simulasi 4 strategi di atas terlebih dahulu untuk mengaktifkan uji ketahanan biaya.
          </div>
        )}

        {/* Tombol Jalankan Uji */}
        {!robustnessResult && !isTesting && (
          <button
            type="button"
            onClick={handleRunRobustness}
            disabled={isRobustnessDisabled}
            className={`flex items-center justify-center gap-2 rounded-[10px] py-2.5 text-xs font-bold transition-colors ${
              isRobustnessDisabled
                ? "bg-track text-muted cursor-not-allowed border border-border"
                : "bg-surface border-2 border-accent text-accent hover:bg-accent-soft shadow-2xs cursor-pointer"
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            <span>Jalankan Uji Ketahanan Biaya</span>
          </button>
        )}

        {/* Indikator Kemajuan Uji */}
        {isTesting && (
          <div className="flex flex-col gap-1.5 py-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Menjalankan simulasi ketahanan...</span>
              <span className="font-bold text-accent tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-track">
              <div
                className="h-full rounded-full bg-accent transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10.5px] text-muted">
              Memproses variasi biaya per titik tanpa membekukan layar...
            </span>
          </div>
        )}

        {testError && (
          <div className="rounded-[8px] bg-kritis-tint border border-kritis/40 p-2.5 text-xs text-kritis-ink">
            {testError}
          </div>
        )}

        {/* Hasil Uji Ketahanan */}
        {robustnessResult && !isTesting && (
          <div className="flex flex-col gap-3">
            {/* 1. Satu Kalimat Otomatis Penjelas Hasil */}
            <div className="rounded-[10px] bg-accent-soft/40 border border-accent/30 p-3 text-xs font-semibold text-ink leading-relaxed">
              {robustnessResult.summarySentence}
            </div>

            {/* 2. Grid 4 Metrik Indikator */}
            <div className="grid grid-cols-2 gap-2 text-center">
              {/* (a) Tumpang Tindih Jaccard */}
              <div className="flex flex-col rounded-[8px] bg-bg border border-border/60 p-2">
                <span className="text-[10px] font-medium text-muted">
                  Tumpang Tindih Titik (Jaccard)
                </span>
                <span className="text-sm font-bold text-ink tabular-nums mt-0.5">
                  {robustnessResult.metrics.avgJaccardPct.toFixed(1)}%
                </span>
                <span className="text-[10px] text-muted">
                  Terendah: {robustnessResult.metrics.minJaccardPct.toFixed(1)}%
                </span>
              </div>

              {/* (b) Titik Inti */}
              <div className="flex flex-col rounded-[8px] bg-bg border border-border/60 p-2">
                <span className="text-[10px] font-medium text-muted">
                  Titik Inti (≥90% Terpilih)
                </span>
                <span className="text-sm font-bold text-ink tabular-nums mt-0.5">
                  {robustnessResult.metrics.corePointCount} / {robustnessResult.metrics.baselinePointCount}
                </span>
                <span className="text-[10px] text-muted">
                  dari titik hasil dasar
                </span>
              </div>

              {/* (c) Kelebihan Biaya Rencana Dasar */}
              <div className="flex flex-col rounded-[8px] bg-bg border border-border/60 p-2">
                <span className="text-[10px] font-medium text-muted">
                  Kelebihan Biaya Rencana Dasar
                </span>
                <span className={`text-sm font-bold tabular-nums mt-0.5 ${
                  robustnessResult.metrics.p90CostOverrunPct > 0 ? "text-tinggi-ink" : "text-ink"
                }`}>
                  {robustnessResult.metrics.p90CostOverrunPct > 0 ? "+" : ""}
                  {robustnessResult.metrics.p90CostOverrunPct.toFixed(1)}%
                  <span className="text-[10px] font-normal text-muted ml-1">(P90)</span>
                </span>
                <span className="text-[10px] text-muted">
                  Rata-rata: {robustnessResult.metrics.avgCostOverrunPct > 0 ? "+" : ""}{robustnessResult.metrics.avgCostOverrunPct.toFixed(1)}% · Maks: {robustnessResult.metrics.maxCostOverrunPct > 0 ? "+" : ""}{robustnessResult.metrics.maxCostOverrunPct.toFixed(1)}%
                </span>
              </div>

              {/* (d) Percobaan Melebihi Pagu */}
              <div className="flex flex-col rounded-[8px] bg-bg border border-border/60 p-2">
                <span className="text-[10px] font-medium text-muted">
                  Percobaan Melebihi Pagu
                </span>
                <span className={`text-sm font-bold tabular-nums mt-0.5 ${
                  robustnessResult.metrics.overBudgetPct > 0 ? "text-kritis" : "text-ink"
                }`}>
                  {robustnessResult.metrics.overBudgetPct.toFixed(0)}%
                </span>
                <span className="text-[10px] text-muted">
                  dari {robustnessResult.trials} percobaan
                </span>
              </div>
            </div>

            {/* Tombol Uji Ulang */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleRunRobustness}
                className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Uji Ulang Ketahanan</span>
              </button>
            </div>
          </div>
        )}

        {/* Catatan Wajib Uji Ketahanan */}
        <p className="text-[10.5px] text-muted italic">
          Simulasi gangguan biaya acak independen per titik, benih tetap. Bukan prediksi biaya nyata.
        </p>
      </div>

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
