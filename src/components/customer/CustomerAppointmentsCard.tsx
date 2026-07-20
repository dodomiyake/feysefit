"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  formatAppointmentStatus,
  formatAppointmentType,
  formatMeetingMode,
  type StudioAppointment,
} from "@/lib/local-customer";
import { listAppointmentsForCustomer } from "@/lib/services/appointmentService";
import { CUSTOMER_APPOINTMENTS_HREF } from "@/lib/customer-designer-links";

const statusTone: Record<string, string> = {
  requested: "bg-primary/10 text-primary",
  confirmed: "bg-emerald-100 text-emerald-800",
  rescheduled: "bg-amber-100 text-amber-900",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-surface-container text-primary/70",
  no_show: "bg-red-50 text-red-700",
};

export function CustomerAppointmentsCard({
  variant = "dashboard",
}: {
  variant?: "dashboard" | "embedded" | "page";
}) {
  const { authUser, projects } = useApp();
  const customerId = authUser?.customerId;
  const projectRefreshKey = projects
    .map((project) => `${project.id}:${project.customerUpdate}:${project.lastUpdated}`)
    .join("|");
  const [appointments, setAppointments] = useState<StudioAppointment[]>([]);
  const [loading, setLoading] = useState(Boolean(customerId));
  const requestKey = `${customerId ?? ""}:${projectRefreshKey}`;
  const [activeKey, setActiveKey] = useState(requestKey);

  if (requestKey !== activeKey) {
    setActiveKey(requestKey);
    setLoading(Boolean(customerId));
  }

  if (!customerId && loading) {
    setLoading(false);
  }

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    void listAppointmentsForCustomer(customerId)
      .then((items) => {
        if (!cancelled) setAppointments(items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, projectRefreshKey]);

  useEffect(() => {
    if (!customerId) return;
    const refresh = () => {
      void listAppointmentsForCustomer(customerId)
        .then(setAppointments)
        .catch(() => undefined);
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [customerId]);

  if (!customerId || loading) return null;

  const upcoming = appointments.filter(
    (item) => item.status !== "cancelled" && item.status !== "completed"
  );

  if (variant === "embedded" && !upcoming.length) return null;
  if (variant === "dashboard" && !upcoming.length) return null;

  return (
    <section className="mb-8 rounded-xl border border-primary/10 bg-surface-container p-5 lg:p-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-accent" />
        <h2 className="font-headline text-lg font-semibold text-primary">Your appointments</h2>
      </div>
      <p className="mt-1 text-sm text-primary/60">
        Confirmed and pending visits with your designer appear here. You&apos;ll also get a bell
        notification when your designer schedules or updates an appointment.
      </p>
      {upcoming.length ? (
        <ul className="mt-4 space-y-3">
          {upcoming.map((appointment) => (
            <li
              key={appointment.id}
              className="rounded-lg border border-primary/10 bg-background/60 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {formatAppointmentType(appointment.appointmentType)}
                    {" · "}
                    {formatMeetingMode(appointment.meetingMode)}
                  </p>
                  <p className="mt-0.5 text-xs text-primary/55">
                    {appointment.scheduledAt
                      ? new Date(appointment.scheduledAt).toLocaleString()
                      : appointment.status === "requested"
                        ? "Awaiting designer confirmation"
                        : "Date pending confirmation"}
                  </p>
                  {appointment.designerNotes && (
                    <p className="mt-2 text-sm text-primary/75">{appointment.designerNotes}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    statusTone[appointment.status] ?? "bg-primary/10 text-primary"
                  }`}
                >
                  {formatAppointmentStatus(appointment.status)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-primary/10 bg-background/60 px-4 py-3 text-sm text-primary/70">
          No upcoming appointments yet. Pick an open slot above when your designer has published
          availability.
        </p>
      )}
      {variant === "dashboard" && (
        <Link
          href={CUSTOMER_APPOINTMENTS_HREF}
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Manage appointments
        </Link>
      )}
    </section>
  );
}
