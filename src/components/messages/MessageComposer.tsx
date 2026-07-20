"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Paperclip, Send, Smile, X, Loader2, FileText } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { uploadMessageAttachment } from "@/lib/services/storageService";
import type { MessageAttachment } from "@/lib/conversations";
import {
  getAttachmentType,
  MAX_MESSAGE_ATTACHMENTS,
  MESSAGE_FILE_ACCEPT,
} from "@/lib/messages/attachment-utils";
import { EmojiPicker } from "@/components/messages/EmojiPicker";
import { useResolvedStorageUrl } from "@/hooks/useResolvedStorageUrl";
import { cn } from "@/lib/cn";

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  pendingAttachments: MessageAttachment[];
  onAttachmentsChange: (attachments: MessageAttachment[]) => void;
  /** Supabase projects.id or legacy project id for project-scoped attachment paths */
  projectId?: string | null;
  readOnly?: boolean;
  readOnlyMessage?: string;
}

function PendingImageThumb({ url, name }: { url: string; name: string }) {
  const resolvedSrc = useResolvedStorageUrl(url);
  if (!resolvedSrc) {
    return <div className="h-full w-full bg-primary/5" aria-hidden />;
  }
  return (
    <Image src={resolvedSrc} alt={name} fill className="object-cover" sizes="64px" unoptimized />
  );
}

export function MessageComposer({
  value,
  onChange,
  onSend,
  pendingAttachments,
  onAttachmentsChange,
  projectId,
  readOnly = false,
  readOnlyMessage = "This conversation is archived and read-only.",
}: MessageComposerProps) {
  const { showToast, authUser } = useApp();
  const useSupabase = isSupabaseEnabled();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value + emoji);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const position = start + emoji.length;
      el.setSelectionRange(position, position);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (pendingAttachments.length >= MAX_MESSAGE_ATTACHMENTS) {
      showToast(`Maximum ${MAX_MESSAGE_ATTACHMENTS} attachments per message`, "error");
      return;
    }

    setUploading(true);
    try {
      let url: string;
      if (useSupabase) {
        if (!authUser?.id) throw new Error("You must be signed in to attach files.");
        url = await uploadMessageAttachment(authUser.id, file, projectId);
      } else {
        url = URL.createObjectURL(file);
      }

      onAttachmentsChange([
        ...pendingAttachments,
        {
          id: `att-${Date.now()}`,
          type: getAttachmentType(file),
          name: file.name,
          url,
        },
      ]);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Could not attach file. Try an image, PDF, or document under 10MB.",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(pendingAttachments.filter((attachment) => attachment.id !== id));
  };

  if (readOnly) {
    return (
      <div className="border-t border-[#d3c3ba]/20 bg-surface/80 p-4 text-center lg:p-6">
        <p className="text-sm text-primary/70">{readOnlyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border-t border-[#d3c3ba]/20 bg-background p-4 lg:p-6">
      {pendingAttachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {pendingAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className={cn(
                "relative overflow-hidden rounded-lg border border-[#d3c3ba]/30 bg-surface",
                attachment.type === "image" ? "h-16 w-16" : "flex h-16 min-w-[8rem] max-w-[10rem] items-center gap-2 px-2"
              )}
            >
              {attachment.type === "image" && attachment.url ? (
                <PendingImageThumb url={attachment.url} name={attachment.name} />
              ) : (
                <>
                  <FileText className="h-5 w-5 shrink-0 text-accent" />
                  <span className="line-clamp-2 text-[10px] font-medium text-primary">
                    {attachment.name}
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                aria-label={`Remove ${attachment.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3 rounded-2xl border border-[#d3c3ba]/30 bg-surface p-4 shadow-sm transition-all focus-within:ring-1 focus-within:ring-accent">
        <input
          ref={fileInputRef}
          type="file"
          accept={MESSAGE_FILE_ACCEPT}
          className="sr-only"
          onChange={handleFileChange}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full p-2 text-ink-muted transition-colors hover:text-primary disabled:opacity-50"
          aria-label="Attach file"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Write your message..."
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm text-primary placeholder:text-ink-muted/50 focus:outline-none"
        />
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEmojiOpen((open) => !open)}
            className={cn(
              "rounded-full p-2 transition-colors",
              emojiOpen ? "bg-accent/15 text-accent" : "text-ink-muted hover:text-primary"
            )}
            aria-label="Add emoji"
            aria-expanded={emojiOpen}
          >
            <Smile className="h-5 w-5" />
          </button>
          <EmojiPicker
            open={emojiOpen}
            onClose={() => setEmojiOpen(false)}
            onSelect={insertEmoji}
          />
          <button
            type="button"
            onClick={onSend}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-dark text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
