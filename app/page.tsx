"use client";

import dynamic from 'next/dynamic';

// Import Map tanpa SSR
const MapDashboard = dynamic(() => import('../components/MapDashboard'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full rounded-xl bg-slate-900 border border-slate-800 animate-pulse flex items-center justify-center">
      <span className="text-slate-400 font-medium">Memuat Modul Geospasial...</span>
    </div>
  )
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-950 text-white p-6">
      
      {/* Header Dashboard */}
      <div className="w-full max-w-7xl mb-6 flex justify-between items-end">
        <div>
          <span className="px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
            Command Center Online
          </span>
          <h1 className="text-3xl font-bold tracking-tight mt-4 text-slate-100">
            InfraTriage DIY
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Spatial Decision Support System — Prioritisasi Infrastruktur Mikro
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg text-right shadow-lg">
          <span className="block text-xs text-slate-400 uppercase tracking-wider font-semibold">Objek Vital Terindeks</span>
          <span className="text-2xl font-bold text-blue-400 mt-1 block">294 Titik</span>
        </div>
      </div>

      {/* Kontainer Peta */}
      <div className="w-full max-w-7xl">
        <MapDashboard />
      </div>

    </main>
  );
}