"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Brush, Download, FileText } from "lucide-react";
import type { MessageAttachment } from "@/lib/conversations";
import { resolveStorageAccessUrl } from "@/lib/services/storageService";
import { isPrivateStorageUrl } from "@/lib/storage/storage-url";

function AttachmentLink({
  file,
  children,
}: {
  file: MessageAttachment;
  children: React.ReactNode;
}) {
  const publicHref = file.url && !isPrivateStorageUrl(file.url) ? file.url : null;
  const [resolvedHref, setResolvedHref] = useState<string | null>(null);
  const [resolvedFor, setResolvedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!file.url || !isPrivateStorageUrl(file.url)) return;
    let cancelled = false;
    void resolveStorageAccessUrl(file.url).then((value) => {
      if (cancelled) return;
      setResolvedHref(value);
      setResolvedFor(file.url ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [file.url]);

  if (!file.url) {
    return (
      <div className="group w-64 rounded-xl border border-[#d3c3ba]/30 bg-surface p-3 text-left">
        {children}
      </div>
    );
  }

  const href =
    publicHref ?? (resolvedFor === file.url && resolvedHref ? resolvedHref : "#");

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-64 rounded-xl border border-[#d3c3ba]/30 bg-surface p-3 text-left transition-all hover:shadow-md"
    >
      {children}
    </Link>
  );
}

function AttachmentImage({ url, alt }: { url: string; alt: string }) {
  const needsResolve = isPrivateStorageUrl(url);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [resolvedFor, setResolvedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!needsResolve) return;
    let cancelled = false;
    void resolveStorageAccessUrl(url).then((value) => {
      if (cancelled) return;
      setResolvedSrc(value);
      setResolvedFor(url);
    });
    return () => {
      cancelled = true;
    };
  }, [url, needsResolve]);

  const src = needsResolve ? (resolvedFor === url && resolvedSrc ? resolvedSrc : url) : url;

  return (
    <div className="relative h-full w-full">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="256px"
      />
    </div>
  );
}

export function MessageAttachments({ attachments }: { attachments: MessageAttachment[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {attachments.map((file) => (
        <AttachmentLink key={file.id} file={file}>
          <div className="mb-3 h-32 overflow-hidden rounded-lg bg-surface-container">
            {file.type === "image" && file.url ? (
              <AttachmentImage url={file.url} alt={file.name} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-highlight/10">
                <FileText className="h-10 w-10 text-accent/40" />
                <span className="mt-2 text-[10px] font-bold uppercase text-primary/70">
                  {file.name.replace(/\.[^.]+$/, "")}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {file.type === "image" ? (
                <Brush className="h-4 w-4 shrink-0 text-accent" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-accent" />
              )}
              <span className="truncate text-xs font-medium text-primary">{file.name}</span>
            </div>
            <Download className="h-4 w-4 shrink-0 text-ink-muted/40 transition-opacity group-hover:text-ink-muted" />
          </div>
        </AttachmentLink>
      ))}
    </div>
  );
}
