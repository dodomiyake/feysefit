"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Link2, Mail, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { CustomerLinkState } from "@/lib/customer-access";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { getAdminCustomerDetail, updateAdminCustomerNotes, type AdminCustomerDetail } from "@/lib/services/adminUserService";
import { AdminUserNotesCard } from "@/components/admin/AdminUserNotesCard";

interface AdminCustomerDetailViewProps {
  customerId: string;
}

function formatRegistrationType(link: CustomerLinkState) {
  if (link.registrationType === "invited") return "Invited by designer";
  if (link.registrationType === "direct") return "Direct signup";
  return "—";
}

function formatUnlinkStatus(link: CustomerLinkState) {
  if (link.unlinkStatus === "none") return "None";
  return link.unlinkStatus.replace(/_/g, " ");
}

export function AdminCustomerDetailView({ customerId }: AdminCustomerDetailViewProps) {
  const { customers, designers, projects } = useApp();
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isSupabaseEnabled()) {
          const result = await getAdminCustomerDetail(customerId);
          if (!cancelled) setDetail(result);
          return;
        }

        const customer = customers.find((entry) => entry.id === customerId) ?? null;
        if (!customer) {
          if (!cancelled) setDetail(null);
          return;
        }

        const link: CustomerLinkState = {
          linkedDesignerId: null,
          linkedDesignerName: null,
          hasConcludedProject: false,
          unlinkStatus: "none",
          unlinkReason: null,
          unlinkSubmittedAt: null,
          activeUnlinkRequestId: null,
          registrationType: null,
        };
        const linkedDesigner = link.linkedDesignerId
          ? designers.find((entry) => entry.id === link.linkedDesignerId) ?? null
          : null;
        const customerProjects = projects.filter(
          (project) => project.customerId === customer.id || project.customerName === customer.name
        );

        if (!cancelled) {
          setDetail({
            customer,
            profileUuid: customer.id,
            link,
            linkedDesigner,
            projects: customerProjects,
            adminNotes: "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load client");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [customerId, customers, designers, projects]);

  if (loading) {
    return <Card padding="md"><p className="text-sm text-primary/60">Loading client…</p></Card>;
  }

  if (error) {
    return <Card padding="md"><p className="text-sm text-red-600">{error}</p></Card>;
  }

  if (!detail) {
    return (
      <Card padding="md" className="text-center">
        <p className="text-sm text-primary/60">Client not found.</p>
        <Link
          href="/dashboard/admin/customers"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
      </Card>
    );
  }

  const { customer, link, linkedDesigner, projects: customerProjects, adminNotes } = detail;

  return (
    <div className="space-y-6">
      <Card padding="md">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-primary/10 bg-surface-container">
            {customer.profileImage ? (
              <Image
                src={customer.profileImage}
                alt={customer.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-primary">
                {customer.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-headline text-xl font-bold text-primary">{customer.name}</h2>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-primary/60">
              {customer.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4 shrink-0" />
                  {customer.email}
                </span>
              )}
              {customer.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4 shrink-0" />
                  {customer.phone}
                </span>
              )}
              {customer.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {customer.location}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-primary/70">
              {customer.projectCount} project{customer.projectCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <div className="mb-4 flex items-center gap-2">
          <Link2 className="h-5 w-5 text-accent" />
          <h3 className="font-headline text-lg font-semibold text-primary">Designer link</h3>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-primary/45">Linked designer</dt>
            <dd className="mt-1 font-medium text-primary">
              {linkedDesigner ? (
                <Link
                  href={`/dashboard/admin/designers/${linkedDesigner.id}`}
                  className="text-accent hover:underline"
                >
                  {linkedDesigner.businessName}
                </Link>
              ) : link.linkedDesignerName ? (
                link.linkedDesignerName
              ) : (
                "Not linked"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-primary/45">Registration</dt>
            <dd className="mt-1 text-primary/70">{formatRegistrationType(link)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-primary/45">Unlink status</dt>
            <dd className="mt-1">
              <Badge variant={link.unlinkStatus === "none" ? "outline" : "default"}>
                {formatUnlinkStatus(link)}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-primary/45">Concluded project</dt>
            <dd className="mt-1 text-primary/70">{link.hasConcludedProject ? "Yes" : "No"}</dd>
          </div>
        </dl>
        {link.unlinkReason && (
          <p className="mt-4 text-sm text-primary/60">
            <span className="font-medium text-primary">Unlink reason:</span> {link.unlinkReason}
          </p>
        )}
      </Card>

      <AdminUserNotesCard
        notes={adminNotes}
        readOnly={!isSupabaseEnabled()}
        onSave={async (notes) => {
          await updateAdminCustomerNotes(customerId, notes);
          setDetail((current) => (current ? { ...current, adminNotes: notes } : current));
        }}
      />

      <section className="rounded-xl bg-surface-container p-6 shadow-sm">
        <h3 className="mb-4 font-headline text-lg font-semibold text-primary">
          Projects ({customerProjects.length})
        </h3>
        {customerProjects.length === 0 ? (
          <p className="text-sm text-primary/50">No projects for this client.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/10 text-left text-xs uppercase tracking-wider text-primary/50">
                  <th className="p-4">Project</th>
                  <th className="p-4">Status</th>
                  <th className="hidden p-4 md:table-cell">Budget</th>
                  <th className="hidden p-4 lg:table-cell">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {customerProjects.map((project) => (
                  <tr key={project.id} className="border-b border-primary/5 last:border-0">
                    <td className="p-4">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {project.title}
                      </Link>
                      <p className="text-xs text-primary/45">{project.projectCode}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant={project.status === "Delivered" ? "gold" : "default"}>
                        {project.status}
                      </Badge>
                    </td>
                    <td className="hidden p-4 text-primary/70 md:table-cell">{project.budget || "—"}</td>
                    <td className="hidden p-4 text-primary/70 lg:table-cell">{project.deadline || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
