"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DesignerShell } from "@/components/layout/DesignerShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopBackNav } from "@/components/ui/BackButton";
import { useApp } from "@/context/AppContext";
import { GROUP_EVENT_TYPE_OPTIONS, type GroupEventType } from "@/lib/local-customer";
import { createGroupProject } from "@/lib/services/groupProjectService";

export default function NewGroupProjectPage() {
  const router = useRouter();
  const { authUser, refreshAppData, showToast } = useApp();
  const designerId = authUser?.designerId ?? "";
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<GroupEventType>("aso-ebi");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!designerId) return;
    setSaving(true);
    try {
      const group = await createGroupProject(designerId, { title, eventType, eventDate, notes });
      await refreshAppData();
      showToast("Group order created", "success");
      router.push(`/projects/groups/${encodeURIComponent(group.id)}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create group", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DesignerShell mobileTitle="New group" showMobileTopBar={false}>
      <TopBar title="New Group Order" showBack backHref="/projects/groups" />
      <div className="mx-auto max-w-2xl px-5 pb-12 pt-6 lg:px-16">
        <DesktopBackNav href="/projects/groups" label="Back to group orders" />
        <h1 className="font-headline text-2xl font-bold text-primary">Create group order</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-primary/60">Title *</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ade & Tunde Wedding Aso-Ebi"
              className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-primary/60">Event type</span>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as GroupEventType)}
              className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
            >
              {GROUP_EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-primary/60">Event date</span>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-primary/60">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create group"}
          </button>
        </form>
      </div>
    </DesignerShell>
  );
}
