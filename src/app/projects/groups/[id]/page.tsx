"use client";

import { use, useEffect, useState } from "react";
import { DesignerShell } from "@/components/layout/DesignerShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopBackNav } from "@/components/ui/BackButton";
import { useApp } from "@/context/AppContext";
import {
  GROUP_OUTFIT_STATUS_OPTIONS,
  computeBalanceRemaining,
  formatRecordedBy,
} from "@/lib/local-customer";
import {
  addGroupProjectMember,
  getGroupProjectWithMembers,
  updateGroupProjectMember,
} from "@/lib/services/groupProjectService";
import type { GroupProject, GroupProjectMember } from "@/lib/local-customer";

export default function GroupProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { authUser, studioClients, customers, showToast, refreshAppData } = useApp();
  const designerId = authUser?.designerId ?? "";
  const [group, setGroup] = useState<GroupProject | null>(null);
  const [members, setMembers] = useState<GroupProjectMember[]>([]);
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(Boolean(designerId));
  const [adding, setAdding] = useState(false);
  const requestKey = `${designerId}:${id}`;
  const [activeKey, setActiveKey] = useState(requestKey);

  if (requestKey !== activeKey) {
    setActiveKey(requestKey);
    setGroup(null);
    setMembers([]);
    setLoading(Boolean(designerId));
  }

  if (!designerId && loading) {
    setLoading(false);
  }

  useEffect(() => {
    if (!designerId) return;
    let cancelled = false;
    void getGroupProjectWithMembers(designerId, id)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setGroup(result.group);
          setMembers(result.members);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        showToast(error instanceof Error ? error.message : "Failed to load group", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [designerId, id, showToast]);

  async function handleAddMember(event: React.FormEvent) {
    event.preventDefault();
    if (!designerId || !memberName.trim()) return;
    setAdding(true);
    try {
      const member = await addGroupProjectMember(designerId, id, { memberName });
      setMembers((current) => [member, ...current]);
      setMemberName("");
      await refreshAppData();
      showToast("Member added", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to add member", "error");
    } finally {
      setAdding(false);
    }
  }

  async function updateMember(memberId: string, patch: Partial<GroupProjectMember>) {
    if (!designerId) return;
    try {
      const updated = await updateGroupProjectMember(designerId, memberId, patch);
      setMembers((current) => current.map((item) => (item.id === memberId ? updated : item)));
      showToast("Member updated", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Update failed", "error");
    }
  }

  return (
    <DesignerShell mobileTitle="Group order" showMobileTopBar={false}>
      <TopBar title="Group Order" showBack backHref="/projects/groups" />
      <div className="mx-auto max-w-4xl px-5 pb-12 pt-6 lg:px-16">
        <DesktopBackNav href="/projects/groups" label="Back to group orders" />

        {loading ? (
          <p className="text-primary/60">Loading…</p>
        ) : !group ? (
          <p className="text-primary/60">Group order not found.</p>
        ) : (
          <div className="space-y-8">
            <div>
              <h1 className="font-headline text-2xl font-bold text-primary">{group.title}</h1>
              <p className="mt-1 text-sm text-primary/60">
                {group.eventDate || "Date TBC"} · {members.length} members
              </p>
              {group.notes && <p className="mt-2 text-sm text-primary/70">{group.notes}</p>}
            </div>

            <form onSubmit={handleAddMember} className="flex flex-wrap gap-2">
              <input
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Member name"
                className="min-w-[200px] flex-1 rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
              />
              <button
                type="submit"
                disabled={adding}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Add member
              </button>
            </form>

            <div className="space-y-4">
              {members.map((member) => {
                const balance = computeBalanceRemaining(member.totalPrice, member.depositPaid);
                return (
                  <article
                    key={member.id}
                    className="rounded-xl border border-primary/10 bg-surface-container p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-headline text-lg font-semibold text-primary">
                          {member.memberName}
                        </h2>
                        <p className="mt-1 text-xs text-primary/55">
                          {formatRecordedBy(member.measurementRecordedBy)}
                        </p>
                      </div>
                      <select
                        value={member.outfitStatus}
                        onChange={(e) =>
                          updateMember(member.id, {
                            outfitStatus: e.target.value as GroupProjectMember["outfitStatus"],
                          })
                        }
                        className="rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm text-primary"
                      >
                        {GROUP_OUTFIT_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <label className="block text-sm">
                        <span className="mb-1 block text-primary/60">Total</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={member.totalPrice ?? ""}
                          onBlur={(e) =>
                            updateMember(member.id, {
                              totalPrice: e.target.value
                                ? Number.parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-primary/60">Deposit</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={member.depositPaid ?? ""}
                          onBlur={(e) =>
                            updateMember(member.id, {
                              depositPaid: e.target.value
                                ? Number.parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
                        />
                      </label>
                      <div className="flex items-end text-sm text-primary">
                        Balance: {balance != null ? balance.toFixed(2) : "—"}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {(studioClients.length > 0 || customers.length > 0) && (
              <p className="text-xs text-primary/50">
                Link studio or app clients when adding members — full linking UI can attach
                existing profiles on save.
              </p>
            )}
          </div>
        )}
      </div>
    </DesignerShell>
  );
}
