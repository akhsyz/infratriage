"use client";

import React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-4 font-sans text-[#0F172A]">
        <div className="w-full max-w-md rounded-[14px] border border-[#E2E8F0] bg-white p-6 text-center shadow-md flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EF4444]/10 text-[#DC2626]">
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
            <h1 className="text-base font-bold text-[#0F172A]">Terjadi kesalahan</h1>
            <p className="text-sm text-[#64748B]">
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
            style={{ backgroundColor: "#0F766E", color: "#FFFFFF" }}
            className="rounded-[12px] px-4 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[40px] flex items-center justify-center"
          >
            Muat ulang halaman
          </button>
        </div>
      </body>
    </html>
  );
}
