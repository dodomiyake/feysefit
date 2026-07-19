"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Mail, MapPin, Store, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import {
  getAdminDesignerDetail,
  updateAdminDesignerNotes,
  type AdminDesignerDetail,
} from "@/lib/services/adminUserService";
import { AdminUserNotesCard } from "@/components/admin/AdminUserNotesCard";
import { AdminAppointmentsTable } from "@/components/admin/AdminAppointmentsTable";
import { AdminStudioClientsTable } from "@/components/admin/AdminStudioClientsTable";

interface AdminDesignerDetailViewProps {
  designerId: string;
}

export function AdminDesignerDetailView({ designerId }: AdminDesignerDetailViewProps) {
  const {
    designers,
    customers,
    projects,
    marketplaceApprovals,
    isDesignerMarketplaceLive,
    adminSetDesignerMarketplaceLive,
    showToast,
  } = useApp();
  const [detail, setDetail] = useState<AdminDesignerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketplaceSaving, setMarketplaceSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isSupabaseEnabled()) {
          const result = await getAdminDesignerDetail(designerId);
          if (!cancelled) setDetail(result);
          return;
        }

        const designer = designers.find((entry) => entry.id === designerId) ?? null;
        if (!designer) {
          if (!cancelled) setDetail(null);
          return;
        }

        const clients = customers.filter((customer) =>
          projects.some(
            (project) =>
              project.customerName === customer.name &&
              project.customerId === customer.id
          )
        );
        const designerProjects = projects.filter((project) =>
          clients.some((client) => client.id === project.customerId || client.name === project.customerName)
        );

        if (!cancelled) {
          setDetail({
            designer,
            email: "",
            profileUuid: designer.id,
            marketplaceLive: isDesignerMarketplaceLive(designer.id),
            pendingApproval:
              marketplaceApprovals.find(
                (approval) => approval.designerId === designer.id && approval.status === "pending"
              ) ?? null,
            clients,
            projects: designerProjects,
            adminNotes: "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load designer");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    designerId,
    designers,
    customers,
    projects,
    marketplaceApprovals,
    isDesignerMarketplaceLive,
  ]);

  if (loading) {
    return <Card padding="md"><p className="text-sm text-primary/60">Loading designer…</p></Card>;
  }

  if (error) {
    return <Card padding="md"><p className="text-sm text-red-600">{error}</p></Card>;
  }

  if (!detail) {
    return (
      <Card padding="md" className="text-center">
        <p className="text-sm text-primary/60">Designer not found.</p>
        <Link
          href="/dashboard/admin/designers"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to designers
        </Link>
      </Card>
    );
  }

  const { designer, email, marketplaceLive, pendingApproval, clients, projects: designerProjects, adminNotes } =
    detail;

  async function handleMarketplaceToggle(live: boolean) {
    setMarketplaceSaving(true);
    try {
      await adminSetDesignerMarketplaceLive(designer.id, live);
      setDetail((current) => (current ? { ...current, marketplaceLive: live } : current));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update marketplace", "error");
    } finally {
      setMarketplaceSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card padding="md">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-primary/10 bg-surface-container">
            {designer.profileImage ? (
              <Image
                src={designer.profileImage}
                alt={designer.designerName}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-primary">
                {designer.designerName.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-headline text-xl font-bold text-primary">{designer.businessName}</h2>
              <Badge variant={marketplaceLive ? "gold" : "outline"}>
                {marketplaceLive ? "Marketplace live" : "Not listed"}
              </Badge>
              {pendingApproval && (
                <Link href={`/dashboard/admin/marketplace-approvals/${pendingApproval.id}`}>
                  <Badge variant="default">Approval pending</Badge>
                </Link>
              )}
            </div>
            <p className="mt-1 text-sm text-primary/70">{designer.designerName}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-primary/60">
              {email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4 shrink-0" />
                  {email}
                </span>
              )}
              {designer.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {designer.location}
                </span>
              )}
              {designer.specialty && <Badge>{designer.specialty}</Badge>}
            </div>
            {designer.bio && (
              <p className="mt-4 text-sm leading-relaxed text-primary/70">{designer.bio}</p>
            )}
          </div>
        </div>
      </Card>

      <Card padding="md">
        <div className="mb-4 flex items-center gap-2">
          <Store className="h-5 w-5 text-accent" />
          <h3 className="font-headline text-lg font-semibold text-primary">Marketplace</h3>
        </div>
        <Toggle
          checked={marketplaceLive}
          disabled={marketplaceSaving}
          onChange={(live) => void handleMarketplaceToggle(live)}
          label="Listed on marketplace"
          description={
            pendingApproval && !marketplaceLive
              ? "A listing approval is pending — you can still enable the marketplace directly as admin."
              : marketplaceLive
                ? "This designer is visible to clients browsing the marketplace."
                : "Turn on to publish this designer on the marketplace without waiting for approval."
          }
        />
        {pendingApproval && (
          <Link
            href={`/dashboard/admin/marketplace-approvals/${pendingApproval.id}`}
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            Review pending approval
          </Link>
        )}
      </Card>

      <AdminUserNotesCard
        notes={adminNotes}
        readOnly={!isSupabaseEnabled()}
        onSave={async (notes) => {
          await updateAdminDesignerNotes(designerId, notes);
          setDetail((current) => (current ? { ...current, adminNotes: notes } : current));
        }}
      />

      <section className="rounded-xl bg-surface-container p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" />
          <h3 className="font-headline text-lg font-semibold text-primary">
            Linked clients ({clients.length})
          </h3>
        </div>
        {clients.length === 0 ? (
          <p className="text-sm text-primary/50">No active client links.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/10 text-left text-xs uppercase tracking-wider text-primary/50">
                  <th className="p-4">Name</th>
                  <th className="hidden p-4 sm:table-cell">Email</th>
                  <th className="p-4">Projects</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b border-primary/5 last:border-0">
                    <td className="p-4">
                      <Link
                        href={`/dashboard/admin/customers/${client.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td className="hidden p-4 text-primary/60 sm:table-cell">{client.email || "—"}</td>
                    <td className="p-4 text-primary/70">{client.projectCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-surface-container p-6 shadow-sm">
        <h3 className="mb-4 font-headline text-lg font-semibold text-primary">
          Projects ({designerProjects.length})
        </h3>
        {designerProjects.length === 0 ? (
          <p className="text-sm text-primary/50">No projects for this designer.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/10 text-left text-xs uppercase tracking-wider text-primary/50">
                  <th className="p-4">Project</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Status</th>
                  <th className="hidden p-4 md:table-cell">Budget</th>
                </tr>
              </thead>
              <tbody>
                {designerProjects.map((project) => (
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
                    <td className="p-4 text-primary/70">{project.customerName || "—"}</td>
                    <td className="p-4">
                      <Badge variant={project.status === "Delivered" ? "gold" : "default"}>
                        {project.status}
                      </Badge>
                    </td>
                    <td className="hidden p-4 text-primary/70 md:table-cell">{project.budget || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AdminStudioClientsTable designerId={designerId} limit={null} showFilters={false} />

      <AdminAppointmentsTable designerId={designerId} limit={null} showFilters={false} />
    </div>
  );
}
