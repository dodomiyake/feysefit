"use client";

import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative w-full max-w-md rounded-t-2xl bg-background p-6 shadow-xl sm:rounded-2xl",
          "animate-in slide-in-from-bottom duration-200"
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-lg font-semibold text-primary">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-primary/5">
            <X className="h-5 w-5 text-primary" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
