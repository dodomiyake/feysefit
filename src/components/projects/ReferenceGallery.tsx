"use client";

import Image from "next/image";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { MAX_REFERENCE_FILES } from "@/lib/project-outfit-types";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { uploadProjectReferenceImage } from "@/lib/services/storageService";
import { useResolvedStorageUrl } from "@/hooks/useResolvedStorageUrl";
import { useRef, useState } from "react";

interface ReferenceGalleryProps {
  images: string[];
  onRemove: (index: number) => void;
  onAdd: (url: string) => void;
}

function ReferenceThumb({
  src,
  index,
  onRemove,
}: {
  src: string;
  index: number;
  onRemove: () => void;
}) {
  const resolvedSrc = useResolvedStorageUrl(src);
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg">
      {resolvedSrc ? (
        <Image
          src={resolvedSrc}
          alt={`Reference ${index + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, 200px"
          unoptimized
        />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
          aria-label={`Remove reference ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ReferenceGallery({ images, onRemove, onAdd }: ReferenceGalleryProps) {
  const { showToast, authUser } = useApp();
  const useSupabase = isSupabaseEnabled();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const atLimit = images.length >= MAX_REFERENCE_FILES;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (atLimit) {
      showToast(`Maximum ${MAX_REFERENCE_FILES} images`, "error");
      return;
    }

    setUploading(true);
    try {
      let url: string;
      if (useSupabase) {
        if (!authUser?.id) throw new Error("You must be signed in to upload images.");
        url = await uploadProjectReferenceImage(authUser.id, file);
      } else {
        url = URL.createObjectURL(file);
      }
      onAdd(url);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not upload image. Try JPG or PNG under 5MB.",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-primary">Reference Gallery</h3>
        <span className="text-xs font-medium text-ink-muted">
          Max {MAX_REFERENCE_FILES} files · PNG, JPG
        </span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="sr-only"
        onChange={handleFileChange}
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <button
          type="button"
          disabled={atLimit || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#d3c3ba]/50 transition-all hover:border-accent hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-accent" />
          ) : (
            <ImagePlus className="mb-2 h-8 w-8 text-ink-muted/60" strokeWidth={1.5} />
          )}
          <span className="text-xs font-medium text-ink-muted">
            {uploading ? "Uploading..." : "Upload"}
          </span>
        </button>
        {images.map((src, index) => (
          <ReferenceThumb
            key={`${src}-${index}`}
            src={src}
            index={index}
            onRemove={() => onRemove(index)}
          />
        ))}
      </div>
    </section>
  );
}
