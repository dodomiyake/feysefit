"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DesignerShell } from "@/components/layout/DesignerShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopBackNav } from "@/components/ui/BackButton";
import { useApp } from "@/context/AppContext";
import { createStudioClient } from "@/lib/services/studioClientService";

export default function NewStudioClientPage() {
  const router = useRouter();
  const { authUser, refreshAppData, showToast } = useApp();
  const designerId = authUser?.designerId ?? "";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!designerId) return;
    setSaving(true);
    try {
      const client = await createStudioClient(designerId, { name, phone, email, location, notes });
      await refreshAppData();
      showToast(`${client.name} added as studio client`, "success");
      router.push(`/clients/studio/${encodeURIComponent(client.id)}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to add client", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DesignerShell mobileTitle="Add client" showMobileTopBar={false}>
      <TopBar title="Add Studio Client" showBack backHref="/clients" />
      <div className="mx-auto max-w-2xl px-5 pb-10 pt-6 lg:px-16">
        <DesktopBackNav href="/clients" label="Back to clients" />
        <h1 className="font-headline text-2xl font-bold text-primary">Add walk-in client</h1>
        <p className="mt-2 text-sm text-primary/60">
          Private to your studio — other designers cannot see or contact this client.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-primary/60">Full name *</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-primary/60">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-primary/60">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-primary/60">Location</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
            {saving ? "Saving…" : "Add client"}
          </button>
        </form>
      </div>
    </DesignerShell>
  );
}
