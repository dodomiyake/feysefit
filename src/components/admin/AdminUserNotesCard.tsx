"use client";

import { useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextArea } from "@/components/ui/TextArea";

interface AdminUserNotesCardProps {
  notes: string;
  onSave: (notes: string) => Promise<void>;
  readOnly?: boolean;
}

export function AdminUserNotesCard({ notes, onSave, readOnly }: AdminUserNotesCardProps) {
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(notes);
  }, [notes]);

  const dirty = draft.trim() !== notes.trim();

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save notes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="md">
      <div className="mb-4 flex items-center gap-2">
        <StickyNote className="h-5 w-5 text-accent" />
        <h3 className="font-headline text-lg font-semibold text-primary">Admin notes</h3>
      </div>
      <p className="mb-4 text-sm text-primary/55">
        Internal notes for the admin team. Not visible to the user.
      </p>
      <TextArea
        id="admin-user-notes"
        placeholder="Add context for moderation, support follow-ups, or account history…"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={readOnly || saving}
        rows={5}
      />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {!readOnly && (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!dirty || saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save notes"}
          </Button>
        </div>
      )}
    </Card>
  );
}
