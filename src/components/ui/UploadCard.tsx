"use client";

import { useRef } from "react";
import Image from "next/image";
import { Upload, ImageIcon } from "lucide-react";
import { useResolvedStorageUrl } from "@/hooks/useResolvedStorageUrl";

interface UploadCardProps {
  label?: string;
  description?: string;
  previewUrls?: string[];
  multiple?: boolean;
  onFilesSelected?: (files: File[]) => void;
  onClick?: () => void;
}

export function UploadCard({
  label = "Upload image",
  description = "Tap to upload or drag and drop",
  previewUrls = [],
  multiple = false,
  onFilesSelected,
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
        accept="image/jpeg,image/png,image/webp"
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
          {previewUrls.map((url) => (
            <UploadPreviewThumb key={url} url={url} />
          ))}
        </div>
      )}
    </div>
  );
}

function UploadPreviewThumb({ url }: { url: string }) {
  const resolvedSrc = useResolvedStorageUrl(url);
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-card">
      {resolvedSrc ? (
        <Image src={resolvedSrc} alt="" fill className="object-cover" unoptimized />
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
