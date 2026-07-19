"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { DesignerOnboardingEditorial } from "@/components/onboarding/designer/DesignerOnboardingEditorial";
import {
  DESIGNER_ONBOARDING_STEPS,
  DesignerOnboardingSidebar,
} from "@/components/onboarding/designer/DesignerOnboardingSidebar";
import { DesignerOnboardingHeader } from "@/components/onboarding/designer/DesignerOnboardingHeader";
import { IdentityUploadSlot } from "@/components/onboarding/designer/IdentityUploadSlot";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Select } from "@/components/ui/Select";
import { UploadCard } from "@/components/ui/UploadCard";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/cn";
import { isSupabaseEnabled } from "@/lib/config/backend";
import {
  replacePortfolioImages,
  updateDesignerProfile,
} from "@/lib/services/designerService";
import {
  uploadAvatarImage,
  uploadDesignerCoverImage,
  uploadDesignerPortfolioImage,
} from "@/lib/services/storageService";
import {
  ArrowRight,
  ImagePlus,
  Stamp,
  Store,
  Upload,
  UserRound,
} from "lucide-react";

const TOTAL_STEPS = DESIGNER_ONBOARDING_STEPS.length;
const MAX_PORTFOLIO_IMAGES = 6;

const CONTINUE_LABELS = [
  "Continue to Contact",
  "Continue to Portfolio",
  "Continue to Marketplace",
  "Complete Setup",
];

const CATEGORY_OPTIONS = [
  { value: "", label: "Select category" },
  { value: "ready-to-wear", label: "Ready-to-Wear" },
  { value: "haute-couture", label: "Haute Couture" },
  { value: "bridal", label: "Bridal Wear" },
  { value: "aso-ebi", label: "Aso-ebi & Coordination" },
  { value: "menswear", label: "Menswear & Agbada" },
  { value: "kaftans", label: "Kaftans & Traditional" },
  { value: "avant-garde", label: "Avant-Garde" },
  { value: "eco-luxe", label: "Sustainable / Eco-Luxe" },
  { value: "accessories", label: "Accessories & Leather" },
];

type PendingImage = {
  file: File;
  previewUrl: string;
};

function createPendingImage(file: File): PendingImage {
  return { file, previewUrl: URL.createObjectURL(file) };
}

function specialtyLabel(value: string) {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export default function DesignerOnboardingPage() {
  const router = useRouter();
  const {
    authUser,
    showToast,
    refreshAppData,
    setDesignerMarketplaceVisibility,
    isDesignerMarketplaceLive,
  } = useApp();
  const useSupabase = isSupabaseEnabled();
  const designerId = authUser?.designerId;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [marketplaceVisible, setMarketplaceVisible] = useState(true);

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [tagline, setTagline] = useState("");
  const [designerName, setDesignerName] = useState(authUser?.name ?? "");
  if (authUser?.name && !designerName) {
    setDesignerName(authUser.name);
  }
  const [location, setLocation] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [bio, setBio] = useState("");

  const [coverImage, setCoverImage] = useState<PendingImage | null>(null);
  const [avatarImage, setAvatarImage] = useState<PendingImage | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<PendingImage[]>([]);

  const setCoverImageSafe = (file: File) => {
    setCoverImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return createPendingImage(file);
    });
  };

  const setAvatarImageSafe = (file: File) => {
    setAvatarImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return createPendingImage(file);
    });
  };

  const finishSetup = async () => {
    if (useSupabase && !designerId) {
      showToast("Designer profile not found. Please sign in again.", "error");
      return;
    }
    setSaving(true);
    try {
      if (useSupabase && authUser?.id && designerId) {
        let coverUrl: string | undefined;
        let profileUrl: string | undefined;

        if (coverImage) {
          coverUrl = await uploadDesignerCoverImage(authUser.id, coverImage.file);
        }
        if (avatarImage) {
          profileUrl = await uploadAvatarImage(authUser.id, avatarImage.file);
        }

        const bioParts = [tagline.trim(), bio.trim()].filter(Boolean);
        const parsedYears = yearsExperience.trim()
          ? Number.parseInt(yearsExperience, 10)
          : null;
        await updateDesignerProfile(designerId, {
          businessName: businessName.trim() || undefined,
          designerName: designerName.trim() || authUser.name,
          location: location.trim(),
          specialty: category ? specialtyLabel(category) : undefined,
          bio: bioParts.length ? bioParts.join("\n\n") : undefined,
          coverImage: coverUrl,
          profileImage: profileUrl,
          yearsExperience: Number.isFinite(parsedYears) ? parsedYears : null,
        });

        if (portfolioImages.length) {
          const portfolioUrls = await Promise.all(
            portfolioImages.map((image) =>
              uploadDesignerPortfolioImage(authUser.id, image.file)
            )
          );
          await replacePortfolioImages(designerId, portfolioUrls);
        }

        await refreshAppData();
      }

      if (designerId && marketplaceVisible && !isDesignerMarketplaceLive(designerId)) {
        setDesignerMarketplaceVisibility(designerId, true);
      }

      showToast("Profile setup complete!");
      router.push("/dashboard/designer");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }
    void finishSetup();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const addPortfolioFiles = (files: File[]) => {
    const remaining = MAX_PORTFOLIO_IMAGES - portfolioImages.length;
    if (remaining <= 0) {
      showToast(`Maximum ${MAX_PORTFOLIO_IMAGES} portfolio images`, "error");
      return;
    }
    setPortfolioImages((current) => [
      ...current,
      ...files.slice(0, remaining).map(createPendingImage),
    ]);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <TopBar title="Designer Setup" showBack backHref="/signup/designer" />
      </div>

      <DesignerOnboardingSidebar step={step} onStepSelect={setStep} />

      <div className="lg:ml-64">
        <DesignerOnboardingHeader
          step={step}
          totalSteps={TOTAL_STEPS}
          onSaveDraft={() => showToast("Draft saved")}
        />

        <main className="min-h-screen xl:pr-[30%]">
          <div className="mx-auto max-w-[800px] px-5 pb-12 pt-6 lg:px-16 lg:pb-16 lg:pt-28">
            <div className="mb-8 flex gap-2 lg:hidden">
              {DESIGNER_ONBOARDING_STEPS.map((s, i) => (
                <div key={s.label} className="flex-1">
                  <div
                    className={cn(
                      "h-1 rounded-full transition-colors",
                      i <= step ? "bg-accent" : "bg-primary/10"
                    )}
                  />
                  <p
                    className={cn(
                      "mt-2 text-[10px] font-medium leading-tight",
                      i <= step ? "text-accent" : "text-primary/40"
                    )}
                  >
                    {s.label.split(" ")[0]}
                  </p>
                </div>
              ))}
            </div>

            {step === 0 && (
              <section className="space-y-8">
                <div className="space-y-2">
                  <h1 className="font-headline text-[2rem] font-semibold leading-10 text-primary">
                    Establish Your Atelier Identity
                  </h1>
                  <p className="max-w-2xl text-base text-ink-muted">
                    Define the foundation of your digital presence. This information will help us
                    curate the right collaborations and marketplace placement for your brand.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <Input
                    label="Brand / Studio Name"
                    id="brand"
                    placeholder="e.g. Maison de Elara"
                    required
                    className="signup-field"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                  <Select
                    label="Primary Design Category"
                    id="category"
                    options={CATEGORY_OPTIONS}
                    className="signup-field"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>

                <Input
                  label="Professional Ethos (Tagline)"
                  id="tagline"
                  placeholder="A short, evocative sentence describing your aesthetic"
                  className="signup-field"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />

                <div className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-lg font-semibold text-primary">Identity Imagery</h2>
                    <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                      High Resolution Required
                    </span>
                  </div>
                  <div className="grid h-auto grid-cols-1 gap-4 sm:h-[320px] sm:grid-cols-3">
                    <IdentityUploadSlot
                      icon={ImagePlus}
                      label="Brand Hero Image"
                      hint="Landscape, min 2000px wide. Used for your marketplace banner."
                      className="sm:col-span-2 sm:min-h-[320px]"
                      previewUrl={coverImage?.previewUrl}
                      onFileSelected={setCoverImageSafe}
                    />
                    <div className="grid gap-4 sm:grid-rows-2">
                      <IdentityUploadSlot
                        icon={Upload}
                        label="Avatar"
                        className="min-h-[152px]"
                        previewUrl={avatarImage?.previewUrl}
                        onFileSelected={setAvatarImageSafe}
                      />
                      <IdentityUploadSlot
                        icon={Stamp}
                        label="Logo Mark"
                        className="min-h-[152px]"
                        onClick={() => showToast("Logo mark saved with your brand profile")}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-[#d3c3ba]/30 bg-surface p-6 transition-shadow hover:shadow-md">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/30 text-accent">
                      <Store className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-primary">Enable Marketplace Visibility</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        Allow curated buyers and partners to discover your atelier profile immediately
                        after approval.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={marketplaceVisible}
                    onClick={() => setMarketplaceVisible((v) => !v)}
                    className={cn(
                      "relative h-7 w-14 shrink-0 rounded-full transition-colors",
                      marketplaceVisible ? "bg-accent" : "bg-[#e9e1dd]"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                        marketplaceVisible && "translate-x-7"
                      )}
                    />
                  </button>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="space-y-8">
                <div className="space-y-2">
                  <h1 className="font-headline text-[2rem] font-semibold leading-10 text-primary">
                    Contact &amp; Story
                  </h1>
                  <p className="text-base text-ink-muted">
                    Share how clients can reach you and the story behind your craft.
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Input
                    label="Designer Name"
                    id="designer"
                    placeholder="Your full name"
                    required
                    className="signup-field"
                    value={designerName}
                    onChange={(e) => setDesignerName(e.target.value)}
                  />
                  <Input
                    label="Location"
                    id="location"
                    placeholder="City, Country"
                    required
                    className="signup-field"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                  <Input
                    label="Years of experience"
                    id="yearsExperience"
                    type="number"
                    min="0"
                    max="80"
                    placeholder="e.g. 12"
                    className="signup-field"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                  />
                </div>
                <Input
                  label="Phone / Contact"
                  id="phone"
                  type="tel"
                  placeholder="+234 xxx xxx xxxx"
                  className="signup-field"
                />
                <TextArea
                  label="Bio"
                  id="bio"
                  placeholder="Tell clients about your craft, experience, and style..."
                  rows={5}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </section>
            )}

            {step === 2 && (
              <section className="space-y-8">
                <div className="space-y-2">
                  <h1 className="font-headline text-[2rem] font-semibold leading-10 text-primary">
                    Portfolio Showcase
                  </h1>
                  <p className="text-base text-ink-muted">
                    Upload your finest work—aso-ebi, bridal gowns, agbada, kaftans, and bespoke
                    pieces.
                  </p>
                </div>
                <UploadCard
                  label="Portfolio images"
                  description={`Upload your best work (up to ${MAX_PORTFOLIO_IMAGES} images)`}
                  multiple
                  previewUrls={portfolioImages.map((image) => image.previewUrl)}
                  onFilesSelected={addPortfolioFiles}
                />
                <p className="text-xs text-ink-muted">
                  High-quality imagery helps clients understand your aesthetic before they reach
                  out.
                </p>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-8">
                <div className="space-y-2">
                  <h1 className="font-headline text-[2rem] font-semibold leading-10 text-primary">
                    Marketplace Profile
                  </h1>
                  <p className="text-base text-ink-muted">
                    Review how your profile will appear to clients on the marketplace.
                  </p>
                </div>
                <div className="rounded-xl border border-[#d3c3ba]/30 bg-card p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-surface-container">
                      {avatarImage?.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarImage.previewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound className="h-7 w-7 text-ink-muted" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-primary">
                        {businessName.trim() || "Your atelier profile"}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {marketplaceVisible
                          ? "Visible on marketplace after admin approval"
                          : "Private — invite-only clients"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-background/60 px-4 py-3">
                    <span className="text-sm text-ink-muted">Marketplace visibility</span>
                    <span className="text-sm font-semibold text-primary">
                      {marketplaceVisible ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    You can change visibility anytime from Settings after setup.
                  </p>
                </div>
              </section>
            )}

            <div className="mt-10 flex flex-col-reverse justify-end gap-3 sm:flex-row sm:gap-6">
              {step > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={back}
                  className="rounded-full border-primary px-8"
                  disabled={saving}
                >
                  Back
                </Button>
              )}
              <Button
                type="button"
                variant="zinc"
                onClick={next}
                disabled={saving}
                className="gap-2 rounded-full px-10 shadow-lg shadow-primary/10 sm:ml-auto"
              >
                {saving ? "Saving..." : CONTINUE_LABELS[step]}
                {step < TOTAL_STEPS - 1 && !saving && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </main>

        <DesignerOnboardingEditorial step={step} totalSteps={TOTAL_STEPS} />
      </div>
    </div>
  );
}
