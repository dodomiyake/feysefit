"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BackButton } from "@/components/ui/BackButton";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { normalizeInviteCode } from "@/lib/invite-link";
import { getInviteByCode } from "@/lib/services/inviteService";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { Loader2 } from "lucide-react";

export default function JoinInvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const useSupabase = isSupabaseEnabled();
  const [loading, setLoading] = useState(useSupabase);
  const [inviteName, setInviteName] = useState<string | null>(null);
  const [designerName, setDesignerName] = useState<string | null>(null);
  const [projectType, setProjectType] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [used, setUsed] = useState(false);

  const normalizedCode = normalizeInviteCode(decodeURIComponent(code));

  useEffect(() => {
    if (!useSupabase) {
      setInviteName("Guest");
      setDesignerName("Your designer");
      setProjectType("Bespoke");
      setLoading(false);
      return;
    }

    void getInviteByCode(normalizedCode)
      .then((details) => {
        if (!details) {
          setInvalid(true);
          return;
        }
        if (details.status !== "pending") {
          setUsed(true);
          return;
        }
        setInviteName(details.invite.name);
        setDesignerName(details.designerName);
        setProjectType(details.invite.projectType);
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [normalizedCode, useSupabase]);

  const signupHref = `/signup?role=customer&invite=${encodeURIComponent(normalizedCode)}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <TopBar title="You're Invited" showBack backHref="/" />
      </div>

      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-10 lg:px-16">
        <div className="signup-fade-in w-full max-w-lg space-y-8 text-center">
          <BackButton href="/" label="Back to home" className="mb-2 hidden text-sm lg:inline-flex" />

          <div>
            <BrandLogo className="text-3xl font-extrabold tracking-tight lg:text-4xl" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Private invitation
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying invitation…
            </div>
          ) : invalid ? (
            <div className="space-y-4">
              <h1 className="font-headline text-2xl font-semibold text-primary">Invitation not found</h1>
              <p className="text-sm leading-relaxed text-ink-muted">
                This link may be incorrect, expired, or already used. Ask your designer to send a new
                invitation.
              </p>
              <Link href="/signup" className="inline-block text-sm font-medium text-accent hover:underline">
                Create an account without an invite
              </Link>
            </div>
          ) : used ? (
            <div className="space-y-4">
              <h1 className="font-headline text-2xl font-semibold text-primary">Invitation already used</h1>
              <p className="text-sm leading-relaxed text-ink-muted">
                This invitation has already been accepted. Sign in if you already have an account.
              </p>
              <Button onClick={() => router.push("/login")} className="min-w-[200px]">
                Sign in
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border border-[#d3c3ba]/30 bg-surface-container p-8 shadow-warm">
                <h1 className="font-headline text-2xl font-semibold text-primary lg:text-3xl">
                  You&apos;re invited to FeyseFit
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                  <span className="font-medium text-primary">{designerName}</span> has invited
                  {inviteName ? (
                    <>
                      {" "}
                      <span className="font-medium text-primary">{inviteName}</span>
                    </>
                  ) : null}{" "}
                  to join their atelier on FeyseFit
                  {projectType ? (
                    <>
                      {" "}
                      for a <span className="font-medium text-primary">{projectType}</span> project
                    </>
                  ) : null}
                  .
                </p>
                <p className="mt-3 font-mono text-xs text-primary/60">{normalizedCode}</p>
              </div>

              <Button size="lg" className="h-12 min-w-[240px]" onClick={() => router.push(signupHref)}>
                Accept invitation
              </Button>
              <p className="text-sm text-ink-muted">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-accent hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
