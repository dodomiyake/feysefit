"use client";

import { Button } from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { useReauth } from "@/context/ReauthContext";
import { Trash2 } from "lucide-react";

interface SettingsFooterActionsProps {
  onDiscard: () => void;
  onSave: () => void;
  showDeactivateAccount?: boolean;
}

export function SettingsFooterActions({
  onDiscard,
  onSave,
  showDeactivateAccount = true,
}: SettingsFooterActionsProps) {
  const { showToast } = useApp();
  const { ensureReauth } = useReauth();

  const handleDeactivate = async () => {
    const ok = await ensureReauth({ purpose: "delete or deactivate your account" });
    if (!ok) return;
    showToast("Account deactivation coming soon");
  };

  return (
    <div className="col-span-12 mt-4 flex flex-col gap-4 border-t border-[#d3c3ba]/25 pt-6 lg:flex-row lg:items-center lg:justify-between">
      {showDeactivateAccount ? (
        <button
          type="button"
          onClick={() => void handleDeactivate()}
          className="inline-flex items-center gap-2 text-sm font-medium text-red-600 transition-opacity hover:opacity-70"
        >
          <Trash2 className="h-4 w-4" />
          Deactivate Account
        </button>
      ) : (
        <div />
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="secondary" onClick={onDiscard}>
          Discard
        </Button>
        <Button type="button" variant="zinc" onClick={onSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
