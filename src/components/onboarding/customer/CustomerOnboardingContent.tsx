"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/cn";
import { normalizeInviteCode } from "@/lib/invite-link";
import { completeCustomerOnboarding } from "@/lib/services/customerOnboardingService";
import { resolveLocalInviteDesignerId } from "@/lib/services/inviteService";
import { Gem, KeyRound, Loader2, MapPin, Phone } from "lucide-react";

export type CustomerOnboardingMode = "invite" | "direct";

interface CustomerOnboardingContentProps {
  mode?: CustomerOnboardingMode;
}

export function CustomerOnboardingContent({ mode = "invite" }: CustomerOnboardingContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    setMeasurementUnit,
    measurementUnit,
    showToast,
    linkCustomerToDesigner,
    initDirectCustomer,
    authUser,
    refreshAppData,
  } = useApp();
  const inviteParam = searchParams.get("invite") ?? searchParams.get("code");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(authUser?.name ?? "");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteCode, setInviteCode] = useState(
    inviteParam ? normalizeInviteCode(inviteParam) : ""
  );
  const [styleNotes, setStyleNotes] = useState("");
  const [prevAuthName, setPrevAuthName] = useState(authUser?.name ?? "");
  const inviteKey = inviteParam ?? "";
  const [prevInviteKey, setPrevInviteKey] = useState(inviteKey);

  if ((authUser?.name ?? "") !== prevAuthName) {
    setPrevAuthName(authUser?.name ?? "");
    if (authUser?.name && !name) setName(authUser.name);
  }

  if (inviteKey !== prevInviteKey) {
    setPrevInviteKey(inviteKey);
    if (inviteParam) setInviteCode(normalizeInviteCode(inviteParam));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInvite = inviteCode.trim();
    const trimmedName = name.trim();
    const trimmedLocation = location.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedLocation) {
      showToast("Please enter your name and location.", "error");
      return;
    }

    if (!trimmedPhone) {
      showToast("Please enter your phone number.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      if (authUser?.id && authUser.customerId) {
        const result = await completeCustomerOnboarding({
          userId: authUser.id,
          customerId: authUser.customerId,
          name: trimmedName,
          location: trimmedLocation,
          phone: trimmedPhone,
          styleNotes,
          measurementUnit,
          inviteCode: trimmedInvite || undefined,
          mode,
        });

        setMeasurementUnit(measurementUnit);
        await refreshAppData();

        if (result.linkedToDesigner) {
          showToast("Welcome to FeyseFit! You're linked to your designer.");
          router.push("/dashboard/customer");
          return;
        }

        initDirectCustomer();
        showToast("Welcome to FeyseFit! Browse designers on the marketplace.");
        router.push("/marketplace");
        return;
      }

      if (trimmedInvite) {
        const designerId = resolveLocalInviteDesignerId(trimmedInvite);
        if (!designerId) {
          throw new Error("Invite code not found. Check the code from your designer.");
        }
        linkCustomerToDesigner(designerId, { source: "invite" });
        showToast("Welcome to FeyseFit! You're linked to your designer.");
        router.push("/dashboard/customer");
        return;
      }

      initDirectCustomer();
      showToast("Welcome to FeyseFit! Browse designers on the marketplace.");
      router.push("/marketplace");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save your profile.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background selection:bg-accent/30">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -right-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-highlight/10 blur-[120px]" />
      </div>

      <div className="lg:hidden">
        <TopBar
          title={mode === "direct" ? "Find a Designer" : "Client Setup"}
          showBack
          backHref="/signup?role=customer"
        />
      </div>

      <header className="fixed top-0 left-0 right-0 z-50 hidden border-b border-primary/10 bg-background/80 backdrop-blur-md lg:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-16">
          <BrandLogo className="text-xl font-extrabold tracking-tight" />
          <div className="flex items-center gap-6 text-sm font-medium text-ink-muted">
            <button
              type="button"
              onClick={() => showToast("Help center coming soon")}
              className="transition-colors hover:text-primary"
            >
              Help
            </button>
            <Link href="/login" className="transition-colors hover:text-primary">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="px-5 pb-12 pt-8 lg:px-0 lg:pb-16 lg:pt-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <div className="signup-fade-in mb-8 text-center lg:mb-10">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-primary lg:text-5xl lg:leading-[3.5rem]">
              Welcome to FeyseFit
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-ink-muted lg:text-lg">
              {mode === "direct"
                ? "Set up your profile, then browse the marketplace to find and connect with a designer."
                : "Let's begin your journey toward a perfectly curated wardrobe. Share a few details to help us personalize your experience."}
            </p>
          </div>

          <div className="signup-fade-in w-full rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-8 shadow-warm lg:p-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-sm font-medium text-primary">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g. Chioma Adeyemi"
                    className="signup-field w-full rounded-lg border px-4 text-primary placeholder:text-primary/40 outline-none focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-sm font-medium text-primary">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted/50" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 7700 900123"
                      className="signup-field w-full rounded-lg border py-2.5 pl-10 pr-4 text-primary placeholder:text-primary/40 outline-none focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="location" className="block text-sm font-medium text-primary">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted/50" />
                    <input
                      id="location"
                      name="location"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                      className="signup-field w-full rounded-lg border py-2.5 pl-10 pr-4 text-primary placeholder:text-primary/40 outline-none focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-primary">Preferred Measurement Unit</p>
                <div className="flex gap-6">
                  {(["inches", "cm"] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setMeasurementUnit(unit)}
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-lg border py-4 text-base font-semibold transition-all",
                        measurementUnit === unit
                          ? "border-accent bg-accent/20 text-primary"
                          : "border-[#d3c3ba] bg-background text-primary hover:bg-surface"
                      )}
                    >
                      {unit === "inches" ? "Inches" : "CM"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="invite" className="text-sm font-medium text-primary">
                    Designer Invite Code
                  </label>
                  <span className="text-xs font-semibold text-ink-muted">(Optional)</span>
                </div>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted/50" />
                  <input
                    id="invite"
                    name="invite"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ENTER-CODE-HERE"
                    className="signup-field w-full rounded-lg border py-2.5 pl-10 pr-4 uppercase tracking-widest text-primary placeholder:normal-case placeholder:tracking-normal placeholder:text-primary/40 outline-none focus:outline-none"
                  />
                </div>
                {mode === "invite" && (
                  <p className="text-xs text-ink-muted">
                    Enter a code from your designer to link privately. Leave blank to find a designer on
                    the marketplace instead.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="style" className="block text-sm font-medium text-primary">
                  Style Notes
                </label>
                <textarea
                  id="style"
                  name="style"
                  rows={4}
                  value={styleNotes}
                  onChange={(e) => setStyleNotes(e.target.value)}
                  placeholder="Describe your aesthetic preferences, fit requirements, or sartorial inspirations..."
                  className="w-full resize-none rounded-lg border border-[#d3c3ba] bg-background px-4 py-3 text-sm text-primary placeholder:text-primary/40 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex flex-col items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-full px-12 text-sm shadow-sm md:w-auto"
                  size="lg"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Tailoring your experience...
                    </span>
                  ) : (
                    "Create Professional Profile"
                  )}
                </Button>
                <p className="text-center text-xs text-ink-muted">
                  By continuing, you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-primary">
                    Terms of Service
                  </Link>
                </p>
              </div>
            </form>
          </div>

          <p className="signup-fade-in mt-8 text-center text-sm text-ink-muted">
            {mode === "direct" ? (
              <>
                Have a designer invite code?{" "}
                <Link href="/onboarding/customer" className="font-semibold text-accent hover:underline">
                  Use invited setup
                </Link>
              </>
            ) : (
              <>
                No invite code?{" "}
                <Link
                  href="/onboarding/customer/direct"
                  className="font-semibold text-accent hover:underline"
                >
                  Find a designer on the marketplace
                </Link>
              </>
            )}
          </p>

          <footer className="signup-fade-in mt-10 flex items-center gap-4 opacity-40">
            <div className="h-px w-12 bg-ink-muted" />
            <Gem className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <div className="h-px w-12 bg-ink-muted" />
          </footer>
        </div>
      </main>
    </div>
  );
}
