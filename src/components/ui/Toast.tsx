"use client";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

export function Toast() {
  const { toast, clearToast } = useApp();
  if (!toast) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 lg:bottom-8">
      <div
        className={cn(
          "flex items-center gap-3 rounded-full px-5 py-3 shadow-lg",
          toast.type === "success" ? "bg-primary text-white" : "bg-red-600 text-white"
        )}
      >
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={clearToast} aria-label="Dismiss">
          <X className="h-4 w-4 opacity-70" />
        </button>
      </div>
    </div>
  );
}
