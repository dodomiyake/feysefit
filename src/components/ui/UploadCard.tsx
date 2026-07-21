"use client";

import { useRef } from "react";
import Image from "next/image";
import { Upload, ImageIcon, X } from "lucide-react";
import { useResolvedStorageUrl } from "@/hooks/useResolvedStorageUrl";

interface UploadCardProps {
  label?: string;
  description?: string;
  previewUrls?: string[];
  multiple?: boolean;
  onFilesSelected?: (files: File[]) => void;
  /** When provided, thumbnails show a remove button. */
  onRemoveAt?: (index: number) => void;
  onClick?: () => void;
}

export function UploadCard({
  label = "Upload image",
  description = "Tap to upload or drag and drop",
  previewUrls = [],
  multiple = false,
  onFilesSelected,
  onRemoveAt,
  onClick,
}: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (onClick) {
      onClick();
      return;
    }
    inputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) onFilesSelected?.(files);
        }}
      />
      <button
        type="button"
        onClick={openPicker}
        className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/20 bg-background p-8 transition-colors hover:border-highlight hover:bg-highlight/5"
      >
        <div className="rounded-full bg-card p-4">
          <Upload className="h-6 w-6 text-accent" />
        </div>
        <p className="mt-3 text-sm font-medium text-primary">{label}</p>
        <p className="mt-1 text-xs text-primary/50">{description}</p>
      </button>
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previewUrls.map((url, index) => (
            <UploadPreviewThumb
              key={url}
              url={url}
              onRemove={onRemoveAt ? () => onRemoveAt(index) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UploadPreviewThumb({ url, onRemove }: { url: string; onRemove?: () => void }) {
  const resolvedSrc = useResolvedStorageUrl(url);
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-card">
      {resolvedSrc ? (
        <Image src={resolvedSrc} alt="" fill className="object-cover" unoptimized />
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove image"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow transition-colors hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function MediaGuidePlaceholder() {
  return (
    <div className="rounded-xl bg-card p-6">
      <div className="flex aspect-video items-center justify-center rounded-lg bg-primary/5">
        <div className="text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-primary/30" />
          <p className="mt-2 text-sm font-medium text-primary/60">Measurement video guide</p>
          <p className="mt-1 text-xs text-primary/40">How to measure yourself at home</p>
        </div>
      </div>
    </div>
  );
}
