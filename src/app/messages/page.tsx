"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MessagesWorkspace } from "@/components/messages/MessagesWorkspace";

export default function MessagesPage() {
  return (
    <AppShell showMobileTopBar={false}>
      <Suspense
        fallback={
          <div className="flex h-[calc(100dvh-4rem)] items-center justify-center text-sm text-ink-muted">
            Loading messages...
          </div>
        }
      >
        <MessagesWorkspace />
      </Suspense>
    </AppShell>
  );
}
