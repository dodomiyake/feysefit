"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ruler } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useApp } from "@/context/AppContext";
import type { CustomerMeasurementProfile } from "@/lib/customer-measurements";
import { emptyMeasurementProfile } from "@/lib/customer-measurements";
import { isApiEnabled, isSupabaseEnabled } from "@/lib/config/backend";
import {
  measurementSections,
  PREFERRED_FIT_OPTIONS,
} from "@/lib/measurement-sections";
import { formatRecordedBy } from "@/lib/local-customer";
import { getMeasurementProfile } from "@/lib/services/measurementService";

interface DesignerClientMeasurementsViewProps {
  initialCustomerId?: string | null;
}

function formatPreferredFit(fit: CustomerMeasurementProfile["preferredFit"]) {
  return PREFERRED_FIT_OPTIONS.find((option) => option.value === fit)?.label ?? fit;
}

function hasMeasurementValues(profile: CustomerMeasurementProfile) {
  return Object.values(profile.values).some((value) => value.trim().length > 0);
}

export function DesignerClientMeasurementsView({
  initialCustomerId,
}: DesignerClientMeasurementsViewProps) {
  const { customers, projects, showToast } = useApp();
  const useSupabase = isSupabaseEnabled();
  const useRemote = useSupabase || isApiEnabled();

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.name,
      })),
    [customers]
  );

  const preferredCustomerId = useMemo(() => {
    if (!customers.length) return "";
    if (initialCustomerId && customers.some((customer) => customer.id === initialCustomerId)) {
      return initialCustomerId;
    }
    return customers[0].id;
  }, [customers, initialCustomerId]);

  const [selectedCustomerId, setSelectedCustomerId] = useState(preferredCustomerId);
  const [trackedPreferred, setTrackedPreferred] = useState(preferredCustomerId);
  const [remoteProfile, setRemoteProfile] = useState<CustomerMeasurementProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);

  if (preferredCustomerId !== trackedPreferred) {
    setTrackedPreferred(preferredCustomerId);
    setSelectedCustomerId(preferredCustomerId);
  }

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const offlineProfile = useMemo((): CustomerMeasurementProfile | null => {
    if (!selectedCustomerId || useRemote) return null;
    const projectWithMeasurements = projects.find(
      (project) =>
        (project.customerId === selectedCustomerId ||
          project.customerName === selectedCustomer?.name) &&
        project.measurements &&
        Object.keys(project.measurements).length > 0
    );
    if (!projectWithMeasurements?.measurements) {
      return emptyMeasurementProfile(selectedCustomerId);
    }
    return {
      customerId: selectedCustomerId,
      unit: "inches",
      preferredFit: "regular",
      status: "submitted",
      recordedBy: projectWithMeasurements.measurementRecordedBy ?? "customer",
      values: Object.fromEntries(
        Object.entries(projectWithMeasurements.measurements).map(([key, value]) => [
          key,
          value.replace(/"/g, ""),
        ])
      ),
    };
  }, [selectedCustomerId, useRemote, projects, selectedCustomer?.name]);

  if (useRemote && selectedCustomerId && selectedCustomerId !== loadedForId && !loading) {
    setLoading(true);
  }

  useEffect(() => {
    if (!selectedCustomerId || !useRemote) return;

    let cancelled = false;
    void (async () => {
      try {
        const next = useSupabase
          ? await getMeasurementProfile(selectedCustomerId)
          : await import("@/lib/api/client").then((m) =>
              m.api.measurements.get(selectedCustomerId)
            );
        if (!cancelled) {
          setRemoteProfile(next);
          setLoadedForId(selectedCustomerId);
        }
      } catch (error) {
        if (!cancelled) {
          setRemoteProfile(emptyMeasurementProfile(selectedCustomerId));
          setLoadedForId(selectedCustomerId);
          showToast(
            error instanceof Error ? error.message : "Could not load measurements",
            "error"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCustomerId, useRemote, useSupabase, showToast]);

  const profile = useRemote ? remoteProfile : offlineProfile;

  if (customers.length === 0) {
    return (
      <Card padding="md" className="text-center">
        <Ruler className="mx-auto h-8 w-8 text-accent" />
        <p className="mt-4 font-medium text-primary">No linked clients yet</p>
        <p className="mt-2 text-sm text-primary/55">
          Invite a client or connect through the marketplace. Their measurements will appear here
          once submitted.
        </p>
        <Link
          href="/invite"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Invite client
        </Link>
      </Card>
    );
  }

  const unitLabel = profile?.unit === "cm" ? "cm" : "in";
  const filled = profile ? hasMeasurementValues(profile) : false;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Client"
          options={customerOptions}
          value={selectedCustomerId}
          onChange={(event) => setSelectedCustomerId(event.target.value)}
        />
        {selectedCustomer && (
          <div className="rounded-xl border border-primary/10 bg-surface-container px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/45">Client</p>
            <p className="mt-1 font-medium text-primary">{selectedCustomer.name}</p>
            <p className="text-sm text-primary/55">{selectedCustomer.email}</p>
            {selectedCustomer.phone && (
              <p className="text-sm text-primary/55">{selectedCustomer.phone}</p>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <Card padding="md">
          <p className="text-sm text-primary/60">Loading measurements…</p>
        </Card>
      ) : !profile || !filled ? (
        <Card padding="md">
          <p className="font-medium text-primary">No measurements submitted yet</p>
          <p className="mt-2 text-sm text-primary/55">
            {selectedCustomer?.name ?? "This client"} has not submitted their measurement profile.
            Ask them to complete the form from their dashboard.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={profile.status === "submitted" ? "gold" : "outline"}>
              {profile.status === "submitted" ? "Submitted" : "Draft"}
            </Badge>
            <Badge variant="outline">Unit: {profile.unit}</Badge>
            <Badge variant="outline">Preferred fit: {formatPreferredFit(profile.preferredFit)}</Badge>
            <Badge variant="outline">{formatRecordedBy(profile.recordedBy)}</Badge>
            {profile.updatedAt && (
              <span className="text-xs text-primary/45">Updated {profile.updatedAt}</span>
            )}
          </div>

          <div className="space-y-6">
            {measurementSections.map((section) => {
              const sectionValues = section.fields
                .map((field) => ({
                  ...field,
                  value: profile.values[field.key]?.trim() ?? "",
                }))
                .filter((field) => field.value.length > 0);

              if (sectionValues.length === 0) return null;

              const Icon = section.icon;

              return (
                <section
                  key={section.id}
                  className="rounded-xl border border-primary/10 bg-surface-container p-6 shadow-sm"
                >
                  <div className="mb-5 flex items-center gap-3">
                    <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
                    <h3 className="font-headline text-lg font-semibold text-primary">
                      {section.title}
                    </h3>
                  </div>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {sectionValues.map((field) => (
                      <div
                        key={field.key}
                        className="rounded-lg border border-primary/8 bg-card px-4 py-3"
                      >
                        <dt className="text-xs font-semibold uppercase tracking-wider text-primary/45">
                          {field.label}
                        </dt>
                        <dd className="mt-1 text-lg font-semibold text-primary">
                          {field.value}
                          <span className="ml-1 text-sm font-normal text-primary/45">{unitLabel}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
