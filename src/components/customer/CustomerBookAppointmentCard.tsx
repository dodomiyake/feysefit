"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import type { Designer } from "@/lib/mock-data";
import { CUSTOMER_APPOINTMENTS_HREF } from "@/lib/customer-designer-links";

export function CustomerBookAppointmentCard({ designer }: { designer: Designer }) {
  return (
    <section className="mb-8 rounded-xl border border-primary/10 bg-surface-container p-5 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            <h2 className="font-headline text-lg font-semibold text-primary">Book with your designer</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-primary/60">
            Request measurement, fitting, consultation, or a video session with{" "}
            {designer.businessName}. Open Appointments to pick a published slot or send a flexible
            request.
          </p>
        </div>
        <Link
          href={CUSTOMER_APPOINTMENTS_HREF}
          className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Open appointments
        </Link>
      </div>
    </section>
  );
}
