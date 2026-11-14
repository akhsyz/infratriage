"use client";

import React, { useEffect } from "react";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Tangani pencatatan jika diperlukan tanpa membocorkan ke UI
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg p-4 font-sans text-ink">
      <div className="w-full max-w-md rounded-[14px] border border-border bg-surface p-6 text-center shadow-card flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-bold text-ink">Terjadi kesalahan</h1>
          <p className="text-sm text-muted">
            Terjadi kesalahan. Muat ulang halaman.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (typeof reset === "function") {
              reset();
            } else if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
          className="rounded-[12px] bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-accent/90 transition-colors cursor-pointer min-h-[40px] flex items-center justify-center"
        >
          Muat ulang halaman
        </button>
      </div>
    </div>
  );
}
