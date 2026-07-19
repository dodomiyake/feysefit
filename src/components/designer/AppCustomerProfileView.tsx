"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FolderKanban, Mail, MapPin, MessageSquare, Phone, Ruler } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Customer } from "@/lib/mock-data";
import type { CustomerMeasurementProfile } from "@/lib/customer-measurements";
import { isApiEnabled, isSupabaseEnabled } from "@/lib/config/backend";
import { getCustomerInitials } from "@/lib/customer-display";
import { customerMessageThreadHref } from "@/lib/message-links";
import {
  measurementSections,
  PREFERRED_FIT_OPTIONS,
} from "@/lib/measurement-sections";
import { formatRecordedBy } from "@/lib/local-customer";
import { getMeasurementProfile } from "@/lib/services/measurementService";
import { cn } from "@/lib/cn";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/40 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-primary/50">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-primary">{value || "—"}</dd>
    </div>
  );
}

function formatPreferredFit(fit: CustomerMeasurementProfile["preferredFit"]) {
  return PREFERRED_FIT_OPTIONS.find((option) => option.value === fit)?.label ?? fit;
}

function actionLinkClass(variant: "primary" | "secondary" = "primary") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
    variant === "primary" &&
      "bg-accent text-white shadow-sm hover:bg-[#9a7201] active:scale-[0.98]",
    variant === "secondary" &&
      "border border-primary/20 bg-transparent text-primary hover:bg-primary/5"
  );
}

interface AppCustomerProfileViewProps {
  customer: Customer;
}

export function AppCustomerProfileView({ customer }: AppCustomerProfileViewProps) {
  const { projects } = useApp();
  const useSupabase = isSupabaseEnabled();
  const useRemote = useSupabase || isApiEnabled();
  const [profile, setProfile] = useState<CustomerMeasurementProfile | null>(null);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);

  const customerProjects = useMemo(
    () => projects.filter((project) => project.customerId === customer.id),
    [projects, customer.id]
  );

  const messageHref = customerMessageThreadHref(customer.id, projects);
  const measurementsHref = `/clients/measurements?customer=${encodeURIComponent(customer.id)}`;

  useEffect(() => {
    if (!useRemote) {
      const projectWithMeasurements = customerProjects.find(
        (project) => project.measurements && Object.keys(project.measurements).length > 0
      );
      setProfile(
        projectWithMeasurements?.measurements
          ? {
              customerId: customer.id,
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
            }
          : null
      );
      return;
    }

    let cancelled = false;
    setLoadingMeasurements(true);

    void (async () => {
      try {
        const next = useSupabase
          ? await getMeasurementProfile(customer.id)
          : await import("@/lib/api/client").then((m) => m.api.measurements.get(customer.id));
        if (!cancelled) {
          setProfile(
            Object.values(next.values).some((value) => value.trim().length > 0) ? next : null
          );
        }
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoadingMeasurements(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customer.id, customerProjects, useRemote, useSupabase]);

  const unitLabel = profile?.unit === "cm" ? "cm" : "in";
  const filledMeasurementSections = profile
    ? measurementSections
        .map((section) => ({
          section,
          fields: section.fields.filter((field) => profile.values[field.key]?.trim()),
        }))
        .filter((entry) => entry.fields.length > 0)
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card">
            {customer.profileImage ? (
              <Image
                src={customer.profileImage}
                alt=""
                fill
                className="object-cover"
                unoptimized={customer.profileImage.startsWith("data:")}
              />
            ) : (
              <span className="font-headline text-lg font-semibold text-primary">
                {getCustomerInitials(customer.name)}
              </span>
            )}
          </div>
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary">{customer.name}</h1>
            <p className="mt-1 text-sm text-primary/60">
              App client · {customer.projectCount}{" "}
              {customer.projectCount === 1 ? "project" : "projects"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={messageHref} className={actionLinkClass("secondary")}>
            <MessageSquare className="h-4 w-4" />
            Message
          </Link>
          <Link href="/projects/new" className={actionLinkClass("primary")}>
            Create project
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-primary/10 bg-surface-container p-6">
        <h2 className="font-headline text-lg font-semibold text-primary">Contact details</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <SummaryRow label="Name" value={customer.name} />
          <SummaryRow label="Email" value={customer.email} />
          <SummaryRow label="Phone" value={customer.phone} />
          <SummaryRow label="Location" value={customer.location} />
          {customer.createdAt && (
            <SummaryRow
              label="Joined"
              value={new Date(customer.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
          )}
        </dl>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-primary/60">
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary/40" />
            {customer.email}
          </p>
          {customer.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary/40" />
              {customer.phone}
            </p>
          )}
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary/40" />
            {customer.location || "No location set"}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-primary/10 bg-surface-container p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-headline text-lg font-semibold text-primary">Measurements</h2>
            <p className="mt-1 text-sm text-primary/60">
              Submitted by the customer from their app account.
            </p>
          </div>
          <Link href={measurementsHref} className={actionLinkClass("secondary")}>
            <Ruler className="h-4 w-4" />
            Full measurements
          </Link>
        </div>

        {loadingMeasurements ? (
          <p className="mt-4 text-sm text-primary/60">Loading measurements…</p>
        ) : !profile ? (
          <p className="mt-4 text-sm text-primary/55">
            No measurement profile submitted yet. Ask {customer.name} to complete measurements from
            their dashboard.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <dl className="grid gap-3 sm:grid-cols-3">
              <SummaryRow label="Unit" value={profile.unit === "cm" ? "Centimetres" : "Inches"} />
              <SummaryRow label="Preferred fit" value={formatPreferredFit(profile.preferredFit)} />
              <SummaryRow label="Recorded by" value={formatRecordedBy(profile.recordedBy)} />
            </dl>
            {filledMeasurementSections.map(({ section, fields }) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-primary">{section.title}</h3>
                <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                  {fields.map((field) => (
                    <SummaryRow
                      key={field.key}
                      label={field.label}
                      value={`${profile.values[field.key]} ${unitLabel}`}
                    />
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-primary/10 bg-surface-container p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-headline text-lg font-semibold text-primary">Projects</h2>
            <p className="mt-1 text-sm text-primary/60">Commissions linked to this client.</p>
          </div>
        </div>

        {customerProjects.length === 0 ? (
          <p className="mt-4 text-sm text-primary/55">No projects yet for this client.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {customerProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-primary/10 bg-background/50 px-4 py-3 transition-colors hover:border-primary/20 hover:bg-background"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-primary">{project.title}</p>
                    <p className="text-sm text-primary/55">
                      {project.outfitType} · {project.status}
                    </p>
                  </div>
                  <FolderKanban className="h-4 w-4 shrink-0 text-primary/40" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
