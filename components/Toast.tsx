"use client";

import React, { useEffect } from "react";
import { useApp } from "../lib/store";
import { CheckCircle2, Info, X } from "lucide-react";

export default function Toast() {
  const { state, dispatch } = useApp();
  const toast = state.toast;

  useEffect(() => {
    if (!toast) return;
    const toastId = toast.id;
    const timer = setTimeout(() => {
      dispatch({ type: "DISMISS_TOAST", payload: toastId });
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast?.id, dispatch]);

  if (!toast) return null;

  const isSuccess = toast.variant === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-[10px] bg-header-bg text-header-ink border border-white/10 shadow-2xl max-w-sm sm:max-w-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
    >
      {isSuccess ? (
        <CheckCircle2
          className="w-5 h-5 text-header-icon shrink-0"
          aria-hidden="true"
        />
      ) : (
        <Info
          className="w-5 h-5 text-muted shrink-0"
          aria-hidden="true"
        />
      )}

      <p className="text-sm font-medium leading-snug pr-2">
        {toast.message}
      </p>

      <button
        type="button"
        onClick={() => dispatch({ type: "DISMISS_TOAST", payload: toast.id })}
        className="ml-auto text-header-muted hover:text-white transition-colors p-1 -mr-1"
        aria-label="Tutup notifikasi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

