"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApp } from "@/context/AppContext";
import { useReauth } from "@/context/ReauthContext";
import {
  grantAdminAccess,
  listAdminTeamMembers,
  revokeAdminAccess,
  type AdminTeamMember,
} from "@/lib/services/adminService";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { ShieldCheck, UserMinus, UserPlus } from "lucide-react";

export function AdminTeamAccess() {
  const { authUser, showToast } = useApp();
  const { ensureReauth } = useReauth();
  const useSupabase = isSupabaseEnabled();
  const [members, setMembers] = useState<AdminTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!useSupabase) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setMembers(await listAdminTeamMembers());
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not load admin team", "error");
    } finally {
      setLoading(false);
    }
  }, [useSupabase, showToast]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await ensureReauth({ purpose: "change team-member permissions" });
    if (!ok) return;
    setSubmitting(true);
    try {
      const member = await grantAdminAccess(email);
      setMembers((current) =>
        current.some((m) => m.id === member.id) ? current : [...current, member]
      );
      setEmail("");
      showToast(`${member.name || member.email} now has admin portal access`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not grant access", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (member: AdminTeamMember) => {
    if (!authUser?.id) return;
    if (!window.confirm(`Revoke admin access for ${member.name || member.email}?`)) return;

    const ok = await ensureReauth({ purpose: "change team-member permissions" });
    if (!ok) return;

    setSubmitting(true);
    try {
      await revokeAdminAccess(member.id, authUser.id);
      setMembers((current) => current.filter((m) => m.id !== member.id));
      showToast("Admin access revoked");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not revoke access", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card padding="md" className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-accent/15 p-2 text-accent">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-headline text-lg font-semibold text-primary">Grant portal access</h2>
            <p className="mt-1 text-sm text-primary/60">
              Give an existing FeyseFit account admin access. They can then sign in at{" "}
              <span className="font-medium text-primary">/login/admin</span>.
            </p>
          </div>
        </div>

        <form onSubmit={handleGrant} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="employee@yourcompany.com"
            className="h-11 flex-1 rounded-lg border border-primary/15 bg-background px-4 text-sm text-primary placeholder:text-primary/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <Button type="submit" disabled={submitting || !useSupabase} className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Grant access
          </Button>
        </form>

        <p className="text-xs leading-relaxed text-primary/50">
          New employee? Create their user in Supabase → Authentication → Add user (auto-confirm on),
          or let them sign up as designer/customer first, then enter their email here.
        </p>
      </Card>

      <section>
        <h2 className="font-headline text-lg font-semibold text-primary">Admin team</h2>
        <p className="mt-1 text-sm text-primary/60">
          People who can manage the FeyseFit admin portal.
        </p>

        <div className="mt-4 space-y-3">
          {loading ? (
            <Card padding="md">
              <p className="text-sm text-primary/60">Loading team…</p>
            </Card>
          ) : members.length === 0 ? (
            <Card padding="md">
              <p className="text-sm text-primary/60">No admin users found yet.</p>
            </Card>
          ) : (
            members.map((member) => {
              const isSelf = member.id === authUser?.id;
              return (
                <Card key={member.id} padding="md" className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-primary">
                      {member.name || "Unnamed admin"}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-accent">
                          You
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-primary/60">{member.email}</p>
                  </div>
                  {!isSelf && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      disabled={submitting}
                      onClick={() => void handleRevoke(member)}
                    >
                      <UserMinus className="h-4 w-4" />
                      Revoke access
                    </Button>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
