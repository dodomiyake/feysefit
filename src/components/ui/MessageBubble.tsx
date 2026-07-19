import Image from "next/image";
import { cn } from "@/lib/cn";
import type { Message } from "@/lib/mock-data";

function MessageAvatar({ name, src }: { name: string; src?: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[#d3c3ba]/20 bg-card">
      {src ? (
        <Image src={src} alt={name} fill className="object-cover" sizes="32px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
          {initial}
        </div>
      )}
    </div>
  );
}

export function MessageBubble({
  message,
  senderAvatar,
}: {
  message: Message;
  senderAvatar?: string;
}) {
  const isCustomer = message.sender === "customer";

  return (
    <div
      className={cn(
        "flex max-w-[85%] gap-2",
        isCustomer ? "ml-auto flex-row-reverse" : "flex-row"
      )}
    >
      <MessageAvatar name={message.senderName} src={senderAvatar} />
      <div className={cn("flex min-w-0 flex-col gap-2", isCustomer ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-4 py-3 text-sm leading-relaxed shadow-sm",
            isCustomer
              ? "rounded-t-2xl rounded-bl-2xl bg-highlight/35 text-primary"
              : "rounded-t-2xl rounded-br-2xl border border-[#d3c3ba]/20 bg-surface-container text-primary"
          )}
        >
          {message.text}
        </div>
        <div
          className={cn(
            "flex items-center gap-2",
            isCustomer ? "flex-row-reverse" : "flex-row"
          )}
        >
          <span className="text-[10px] font-medium text-ink-muted">{message.senderName}</span>
          <span className="text-[10px] text-ink-muted/60">{message.timestamp}</span>
        </div>
      </div>
    </div>
  );
}
