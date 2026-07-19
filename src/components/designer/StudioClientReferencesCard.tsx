"use client";

import { useRef, useState } from "react";
import { ExternalLink, ImagePlus, Loader2, X } from "lucide-react";
import type { StudioClient } from "@/lib/studio-client";
import { updateStudioClientReferences } from "@/lib/services/studioClientService";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { readReferenceImageFile } from "@/lib/customer-references";
import { MAX_REFERENCE_FILES } from "@/lib/project-outfit-types";
import { resolveReferenceImageUrl, pinterestImageCandidates } from "@/lib/reference-image-url";
import { uploadProjectReferenceImage } from "@/lib/services/storageService";
import { useResolvedStorageUrl } from "@/hooks/useResolvedStorageUrl";
import { isPrivateStorageUrl } from "@/lib/storage/storage-url";
import { Button } from "@/components/ui/Button";

interface StudioClientReferencesCardProps {
  designerId: string;
  client: StudioClient;
  onSaved: (client: StudioClient) => void;
  onError: (message: string) => void;
}

function ReferenceImageThumb({
  url,
  saving,
  onRemove,
}: {
  url: string;
  saving: boolean;
  onRemove: () => void;
}) {
  const resolvedStorage = useResolvedStorageUrl(url);
  const candidates = isPrivateStorageUrl(url)
    ? resolvedStorage
      ? [resolvedStorage]
      : []
    : pinterestImageCandidates(url);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = candidates[candidateIndex];

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-primary/5">
      {failed ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
          <p className="text-xs text-primary/60">Preview unavailable</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            Open link
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : !src ? (
        <div className="flex h-full items-center justify-center text-xs text-primary/40">Loading…</div>
      ) : (
        // Native img avoids Next.js host restrictions and Pinterest hotlink blocks.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-contain"
          referrerPolicy="no-referrer"
          onError={() => {
            if (candidateIndex < candidates.length - 1) {
              setCandidateIndex((index) => index + 1);
              return;
            }
            setFailed(true);
          }}
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={saving}
        className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remove reference"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StudioClientReferencesCard({
  designerId,
  client,
  onSaved,
  onError,
}: StudioClientReferencesCardProps) {
  const { authUser } = useApp();
  const useSupabase = isSupabaseEnabled();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>(client.referenceImages ?? []);
  const [urlDraft, setUrlDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const atLimit = images.length >= MAX_REFERENCE_FILES;

  async function persist(next: string[]) {
    setSaving(true);
    try {
      const updated = await updateStudioClientReferences(designerId, client.id, next);
      onSaved(updated);
      setImages(updated.referenceImages ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save references";
      if (message.includes("reference_images")) {
        onError(
          "Style references need a database update. Run supabase/patch-studio-client-references.sql in the Supabase SQL editor, then try again."
        );
      } else {
        onError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddUrl() {
    if (atLimit) {
      onError(`Maximum ${MAX_REFERENCE_FILES} reference images`);
      return;
    }

    setSaving(true);
    try {
      const url = await resolveReferenceImageUrl(urlDraft);
      setUrlDraft("");
      await persist([...images, url]);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Invalid image URL");
      setSaving(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (atLimit) {
      onError(`Maximum ${MAX_REFERENCE_FILES} reference images`);
      return;
    }

    setSaving(true);
    try {
      let url: string;
      if (useSupabase) {
        if (!authUser?.id) throw new Error("You must be signed in to upload images.");
        url = await uploadProjectReferenceImage(authUser.id, file);
      } else {
        url = await readReferenceImageFile(file);
      }
      await persist([...images, url]);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Could not upload image. Try JPG or PNG under 5MB."
      );
      setSaving(false);
    }
  }

  function handleRemove(index: number) {
    void persist(images.filter((_, i) => i !== index));
  }

  return (
    <section className="rounded-xl border border-primary/10 bg-surface-container p-6">
      <h2 className="font-headline text-lg font-semibold text-primary">Style references</h2>
      <p className="mt-1 text-sm text-primary/60">
        Save inspiration photos for this walk-in client — no app account needed.
      </p>
      <p className="mt-1 text-xs text-primary/50">
        Upload an image, paste a Pinterest pin link, or use a direct image URL · Max{" "}
        {MAX_REFERENCE_FILES} images
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-2"
          disabled={saving || atLimit}
          onClick={() => fileInputRef.current?.click()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Upload
        </Button>
        <input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleAddUrl();
            }
          }}
          placeholder="Pinterest pin link or image URL"
          className="min-w-[200px] flex-1 rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm text-primary"
        />
        <Button
          type="button"
          size="sm"
          className="gap-2"
          disabled={saving || atLimit || !urlDraft.trim()}
          onClick={() => void handleAddUrl()}
        >
          Add link
        </Button>
      </div>

      {images.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((url, index) => (
            <ReferenceImageThumb
              key={`${url}-${index}`}
              url={url}
              saving={saving}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-primary/50">No reference images yet.</p>
      )}
    </section>
  );
}
