"use client";

import React, { useMemo } from "react";
import { useApp } from "../../lib/store";
import {
  computeScore,
  explain,
  priorityLevel,
  estimateCost,
  CATEGORY_LABEL,
  SEVERITY_LABEL,
  type ClusterStatus,
  type PriorityLevel,
  type ScoreContext,
  type Weights,
} from "../../lib/infratriage";
import { vitals } from "../../lib/vitals";
import { formatDistance, formatRupiah } from "../../lib/format";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Hospital,
  Info,
  MapPin,
  School,
  ShoppingBag,
  Tag,
  Users,
} from "lucide-react";

const VITAL_TYPE_LABEL: Record<string, string> = {
  rumah_sakit: "Rumah Sakit",
  sekolah: "Sekolah",
  pasar: "Pasar",
};

const CRITERIA_LABEL: Record<keyof Weights, string> = {
  bahaya: "Tingkat Kerusakan",
  kelas: "Klasifikasi Jalan",
  vital: "Fasilitas Vital",
  kerumunan: "Dukungan Kerumunan",
  usia: "Usia Laporan",
};

const STATUS_OPTIONS: {
  status: ClusterStatus;
  label: string;
  activeClass: string;
}[] = [
  {
    status: "pending",
    label: "Menunggu",
    activeClass: "bg-ink text-white shadow-xs font-semibold",
  },
  {
    status: "scheduled",
    label: "Terjadwal",
    activeClass: "bg-accent text-white shadow-xs font-semibold",
  },
  {
    status: "resolved",
    label: "Selesai",
    activeClass: "bg-tinggi-ink text-white shadow-xs font-semibold",
  },
];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function InspectorTab() {
  const { state, dispatch } = useApp();

  // Cari klaster terpilih dari ID state
  const cluster = useMemo(() => {
    if (!state.selectedClusterId) return null;
    return state.clusters.find((c) => c.id === state.selectedClusterId) ?? null;
  }, [state.clusters, state.selectedClusterId]);

  // Context perhitungan skor
  const ctx = useMemo<ScoreContext>(
    () => ({
      vitals,
      weights: state.weights,
      now: state.now,
    }),
    [state.weights, state.now]
  );

  // Detail skor klaster terpilih
  const scoreDetail = useMemo(() => {
    if (!cluster) return null;
    return computeScore(cluster, ctx);
  }, [cluster, ctx]);

  // 5 Lencana explain()
  const badges = useMemo(() => {
    if (!scoreDetail) return [];
    return explain(scoreDetail);
  }, [scoreDetail]);

  // Pastikan jumlah poin lencana sama persis dengan skor bulat yang ditampilkan (FR-2.2 & TASKS.md)
  const integerBadges = useMemo(() => {
    if (!scoreDetail || badges.length === 0) return [];
    const roundedUrgency = Math.round(scoreDetail.urgency);

    // Hitung pembulatan terdistribusi (Largest Remainder Method)
    const floored = badges.map((b) => Math.floor(b.points));
    const remainders = badges.map((b, idx) => ({
      idx,
      rem: b.points - floored[idx],
    }));

    let shortfall = roundedUrgency - floored.reduce((a, b) => a + b, 0);
    remainders.sort((a, b) => b.rem - a.rem);

    const points = [...floored];
    for (let i = 0; i < remainderCount(shortfall, badges.length); i++) {
      points[remainders[i].idx] += 1;
    }

    return badges.map((b, i) => ({
      ...b,
      displayPoints: points[i],
      maxPoints: Math.round(state.weights[b.key] * 100),
      percentage: Math.min(
        100,
        Math.max(
          0,
          state.weights[b.key] > 0
            ? Math.round((b.points / (state.weights[b.key] * 100)) * 100)
            : 0
        )
      ),
    }));
  }, [scoreDetail, badges, state.weights]);

  // Bila belum ada klaster yang dipilih
  if (!cluster || !scoreDetail) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-tint/40 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface border border-border text-muted shadow-xs mb-3">
          <MapPin className="h-6 w-6 text-accent" />
        </div>
        <h3 className="text-sm font-semibold text-ink">
          Pilih titik di peta atau daftar
        </h3>
        <p className="mt-1 text-xs text-muted max-w-xs leading-relaxed">
          Klik salah satu klaster di peta atau kartu di tab Peringkat untuk
          melihat detail evaluasi urgensi dan kalkulasi skor.
        </p>
      </div>
    );
  }

  const roundedScore = Math.round(scoreDetail.urgency);
  const level = priorityLevel(roundedScore);
  const cost = estimateCost(cluster.category, scoreDetail.severity);

  // SVG circular gauge properties
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (roundedScore / 100) * circumference;

  const levelColorClass =
    level === "kritis"
      ? "text-kritis"
      : level === "tinggi"
      ? "text-tinggi"
      : "text-sedang";

  const levelBadgeClass =
    level === "kritis"
      ? "bg-kritis-tint text-kritis-ink border border-kritis/40"
      : level === "tinggi"
      ? "bg-tinggi-tint text-tinggi-ink border border-tinggi/40"
      : "bg-sedang-tint text-sedang-ink border border-sedang/40";

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. Kartu Skor Besar & Informasi Identitas ── */}
      <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center gap-4">
          {/* Cincin SVG Skor */}
          <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center">
            <svg className="h-20 w-20 -rotate-90 transform" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="currentColor"
                strokeWidth="6"
                className="text-track fill-transparent"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`${levelColorClass} fill-transparent transition-all duration-700`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-2xl font-extrabold tabular-nums leading-none ${levelColorClass}`}
              >
                {roundedScore}
              </span>
              <span className="text-[9px] font-medium text-muted uppercase mt-0.5">
                Urgensi
              </span>
            </div>
          </div>

          {/* Metadata Judul & Level */}
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-[6px] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${levelBadgeClass}`}
              >
                {level}
              </span>
              <span className="text-[11px] font-medium text-muted">
                Klaster #{cluster.id}
              </span>
            </div>
            <h2 className="text-base font-bold text-ink leading-tight">
              {CATEGORY_LABEL[cluster.category]}
            </h2>
            <p className="text-xs text-muted capitalize">
              Ruas {scoreDetail.roadClass} · Tingkat{" "}
              {SEVERITY_LABEL[scoreDetail.severity]}
            </p>
          </div>
        </div>

        {/* Kontrol Ubah Status Klaster */}
        <div className="pt-2 border-t border-border/60">
          <label className="block text-[11px] font-medium text-muted mb-1.5">
            Status Penanganan Klaster
          </label>
          <div className="grid grid-cols-3 gap-1.5 rounded-[10px] bg-bg p-1 border border-border">
            {STATUS_OPTIONS.map((opt) => {
              const isCurrent = cluster.status === opt.status;
              return (
                <button
                  key={opt.status}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "SET_STATUS",
                      payload: { clusterId: cluster.id, status: opt.status },
                    })
                  }
                  className={`rounded-[8px] py-1.5 text-xs transition-all ${
                    isCurrent
                      ? opt.activeClass
                      : "text-muted hover:text-ink hover:bg-surface/50 font-medium"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 2. Rincian Kontribusi Skor (5 Lencana explain) ── */}
      <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
            Rincian Kontribusi Skor (0–100)
          </h3>
          <span className="text-[11px] font-semibold text-accent tabular-nums">
            Total {roundedScore} pt
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {integerBadges.map((badge) => (
            <div key={badge.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">
                  {CRITERIA_LABEL[badge.key]}
                </span>
                <span className="font-medium text-ink-2 tabular-nums">
                  <strong className="text-accent">
                    +{badge.displayPoints}
                  </strong>{" "}
                  / {badge.maxPoints} pt
                </span>
              </div>

              {/* Progress bar tipis 8px */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-track">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${badge.percentage}%` }}
                />
              </div>

              {/* Teks Penjelasan dari explain() */}
              <p className="text-[11px] text-muted leading-tight">
                {badge.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Fasilitas Vital Terdekat ── */}
      <div className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
          <Building2 className="h-4 w-4 text-accent" />
          <span>Fasilitas Vital Terdekat</span>
        </div>

        {scoreDetail.nearestVital ? (
          <div className="flex items-center justify-between rounded-[10px] bg-bg border border-border p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border text-accent">
                {scoreDetail.nearestVital.vital.type === "rumah_sakit" && (
                  <Hospital className="h-4 w-4 text-vital-hospital" />
                )}
                {scoreDetail.nearestVital.vital.type === "sekolah" && (
                  <School className="h-4 w-4 text-vital-school" />
                )}
                {scoreDetail.nearestVital.vital.type === "pasar" && (
                  <ShoppingBag className="h-4 w-4 text-vital-market" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-ink">
                  {scoreDetail.nearestVital.vital.name}
                </p>
                <p className="text-[11px] text-muted capitalize">
                  {VITAL_TYPE_LABEL[scoreDetail.nearestVital.vital.type]}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block rounded-[6px] bg-surface border border-border px-2 py-0.5 text-xs font-bold text-accent tabular-nums">
                {formatDistance(scoreDetail.nearestVital.meters)}
              </span>
              <p className="text-[10px] text-muted mt-0.5">Jarak garis lurus</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted">
            Tidak ada fasilitas vital terdata di sekitar titik ini.
          </p>
        )}
      </div>

      {/* ── 4. Ringkasan Info Klaster & Estimasi Biaya ── */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Estimasi Biaya */}
        <div className="flex flex-col gap-1 rounded-[12px] border border-border bg-surface p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-muted text-[11px]">
            <Coins className="h-3.5 w-3.5 text-accent" />
            <span>Estimasi Biaya</span>
          </div>
          <span className="text-sm font-bold text-ink tabular-nums mt-0.5">
            {formatRupiah(cost)}
          </span>
          <span className="text-[10px] text-muted">Asumsi ilustrasi</span>
        </div>

        {/* Usia Laporan */}
        <div className="flex flex-col gap-1 rounded-[12px] border border-border bg-surface p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-muted text-[11px]">
            <Clock className="h-3.5 w-3.5 text-accent" />
            <span>Usia Belum Tertangani</span>
          </div>
          <span className="text-sm font-bold text-ink tabular-nums mt-0.5">
            {Math.floor(scoreDetail.ageDays)} hari
          </span>
          <span className="text-[10px] text-muted">
            {cluster.reports.length} laporan masuk
          </span>
        </div>
      </div>

      {/* ── 5. Daftar Laporan yang Tergabung ── */}
      <div className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
            <FileText className="h-4 w-4 text-accent" />
            <span>Daftar Laporan Tergabung</span>
          </div>
          <span className="text-[11px] font-semibold text-muted tabular-nums">
            {scoreDetail.uniqueReporters} pelapor unik
          </span>
        </div>

        <div className="flex flex-col gap-2 mt-1 max-h-56 overflow-y-auto pr-1">
          {cluster.reports.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-1 rounded-[10px] bg-bg border border-border p-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink font-mono text-[11px]">
                  #{r.id}
                </span>
                <span className="text-[11px] text-muted">
                  {formatDate(r.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted pt-0.5">
                <span>Pelapor: {r.reporterId}</span>
                {r.incident && (
                  <span className="flex items-center gap-1 font-semibold text-kritis">
                    <AlertTriangle className="h-3 w-3" />
                    Insiden dilaporkan
                  </span>
                )}
              </div>
              {r.note && (
                <p className="text-[11px] text-ink-2 italic bg-surface/70 rounded-[6px] p-1.5 border border-border/50 mt-0.5">
                  &ldquo;{r.note}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function remainderCount(shortfall: number, maxCount: number): number {
  if (shortfall <= 0) return 0;
  return Math.min(shortfall, maxCount);
}
