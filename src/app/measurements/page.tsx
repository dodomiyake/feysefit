"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { MeasurementGuideSidebar } from "@/components/measurements/MeasurementGuideSidebar";
import { MeasurementSectionCard } from "@/components/measurements/MeasurementSectionCard";
import { MeasurementSubmittedState } from "@/components/measurements/MeasurementSubmittedState";
import { MeasurementUnitToggle } from "@/components/measurements/MeasurementUnitToggle";
import { measurementSections, type PreferredFit } from "@/lib/measurement-sections";
import type { MeasurementProfileStatus } from "@/lib/customer-measurements";
import { isApiEnabled, isSupabaseEnabled } from "@/lib/config/backend";
import { saveMeasurementProfile, getMeasurementProfile } from "@/lib/services/measurementService";
import { useApp } from "@/context/AppContext";
import { useDashboardHref } from "@/lib/use-dashboard-href";

export default function MeasurementsPage() {
  const { measurementUnit, setMeasurementUnit, showToast, authUser, syncProjects, role, hydrated } = useApp();
  const router = useRouter();
  const useSupabase = isSupabaseEnabled();
  const useRemote = useSupabase || isApiEnabled();
  const customerId = authUser?.customerId ?? "1";
  const [preferredFit, setPreferredFit] = useState<PreferredFit>("regular");
  const [values, setValues] = useState<Record<string, string>>({});
  const [profileStatus, setProfileStatus] = useState<MeasurementProfileStatus>("draft");
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<string | undefined>();
  const [isEditing, setIsEditing] = useState(true);
  const [ready, setReady] = useState(!useRemote);
  const dashboardHref = useDashboardHref();
  const unitLabel = measurementUnit === "inches" ? "in" : "cm";

  useEffect(() => {
    if (hydrated && role === "designer") {
      router.replace("/clients/measurements");
    }
  }, [hydrated, role, router]);

  useEffect(() => {
    if (!useRemote) return;
    void (useSupabase ? getMeasurementProfile(customerId) : import("@/lib/api/client").then((m) => m.api.measurements.get(customerId)))
      .then((profile) => {
        setPreferredFit(profile.preferredFit);
        setValues(profile.values);
        setMeasurementUnit(profile.unit);
        setProfileStatus(profile.status);
        setProfileUpdatedAt(profile.updatedAt);
        setIsEditing(profile.status !== "submitted");
        setReady(true);
      })
      .catch(() => {
        setReady(true);
      });
  }, [useRemote, useSupabase, customerId, setMeasurementUnit]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const persistProfile = useCallback(
    async (status: "draft" | "submitted") => {
      if (!useRemote) {
        showToast(
          status === "submitted" ? "Measurements submitted successfully!" : "Draft saved"
        );
        if (status === "submitted") {
          setProfileStatus("submitted");
          setIsEditing(false);
        }
        return;
      }

      try {
        if (useSupabase) {
          const saved = await saveMeasurementProfile(
            customerId,
            {
              unit: measurementUnit,
              preferredFit,
              status,
              values,
            },
            authUser?.name
          );
          if (status === "submitted") {
            await syncProjects();
            setProfileStatus("submitted");
            setProfileUpdatedAt(saved.updatedAt);
            setIsEditing(false);
          } else {
            setProfileStatus(saved.status);
            setProfileUpdatedAt(saved.updatedAt);
          }
        } else {
          const { api } = await import("@/lib/api/client");
          await api.measurements.save(customerId, {
            unit: measurementUnit,
            preferredFit,
            status,
            values,
          });
          if (status === "submitted") {
            setProfileStatus("submitted");
            setIsEditing(false);
          }
        }
        showToast(
          status === "submitted" ? "Measurements submitted successfully!" : "Draft saved"
        );
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Could not save measurements",
          "error"
        );
      }
    },
    [useRemote, useSupabase, customerId, measurementUnit, preferredFit, values, showToast, authUser, syncProjects]
  );

  const profileReady = ready || !useRemote;
  const showSubmittedView = profileStatus === "submitted" && !isEditing;

  return (
    <AppShell
      mobileTitle="Measurements"
      showMobileTopBar
      mobileBackHref={dashboardHref}
    >
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 lg:px-16 lg:pb-12 lg:pt-8">
        <div className="mb-8 flex flex-col gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Profile & Fit
            </p>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-primary lg:text-5xl lg:leading-tight">
              {showSubmittedView ? "Measurement Profile" : "Precision Measurement Form"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted lg:text-base">
              {showSubmittedView
                ? "Your bespoke measurements are on file with your designer."
                : "Define your silhouette for a flawless bespoke experience. Our artisans use these precise dimensions to ensure your garments fit perfectly from the first fitting."}
            </p>
          </div>
          {!showSubmittedView && <MeasurementUnitToggle className="self-start lg:self-auto" />}
        </div>

        {!profileReady ? (
          <div className="py-16 text-center text-sm text-ink-muted">Loading measurements...</div>
        ) : showSubmittedView ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-8">
              <MeasurementSubmittedState
                profile={{
                  unit: measurementUnit,
                  preferredFit,
                  values,
                  updatedAt: profileUpdatedAt,
                }}
                dashboardHref={dashboardHref}
                onEdit={() => setIsEditing(true)}
              />
            </div>
            <div className="lg:col-span-4">
              <MeasurementGuideSidebar />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
            <div className="space-y-6 lg:col-span-8">
              {profileStatus === "submitted" && (
                <p className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-primary/75">
                  You&apos;re updating a previously submitted profile. Save draft or submit again
                  when finished.
                </p>
              )}

              {measurementSections.map((section) => (
                <MeasurementSectionCard
                  key={section.id}
                  section={section}
                  unitLabel={unitLabel}
                  preferredFit={preferredFit}
                  onPreferredFitChange={setPreferredFit}
                  values={values}
                  onFieldChange={handleFieldChange}
                />
              ))}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-4">
                <Button
                  variant="zinc"
                  size="lg"
                  className="flex-1 py-4"
                  onClick={() => void persistProfile("submitted")}
                >
                  Submit Final Measurements
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="px-8 py-4 sm:flex-none"
                  onClick={() => void persistProfile("draft")}
                >
                  Save Draft
                </Button>
                {profileStatus === "submitted" && (
                  <Button
                    variant="secondary"
                    size="lg"
                    className="px-8 py-4 sm:flex-none"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            <div className="lg:col-span-4">
              <MeasurementGuideSidebar />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
