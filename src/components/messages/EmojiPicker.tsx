"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export const MESSAGE_EMOJIS = [
  "😀", "😊", "🥰", "😍", "🙏", "👍", "👏", "✨", "🔥", "💯",
  "❤️", "💕", "🎉", "😂", "🤩", "💪", "🙌", "✅", "⭐", "💬",
  "👗", "👠", "👑", "💎", "🧵", "📐", "📏", "🪡", "🧶", "🎀",
  "📸", "📎", "📄", "📝", "💼", "🛍️", "🌟", "💖", "😉", "🥂",
] as const;

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ open, onClose, onSelect, className }: EmojiPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute bottom-full right-0 z-20 mb-2 w-72 rounded-xl border border-[#d3c3ba]/30 bg-background p-3 shadow-lg",
        className
      )}
      role="dialog"
      aria-label="Emoji picker"
    >
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
        Insert emoji
      </p>
      <div className="grid grid-cols-8 gap-1">
        {MESSAGE_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-surface-container"
            aria-label={`Insert ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
