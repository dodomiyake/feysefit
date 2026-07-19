import type { Customer } from "@/lib/mock-data";
import { MapPin, Mail } from "lucide-react";

export function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <div className="rounded-xl bg-card p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-highlight/20 font-headline text-lg font-semibold text-primary">
          {customer.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-primary">{customer.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-primary/60">
            <MapPin className="h-3 w-3" />
            {customer.location}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-primary/60">
            <Mail className="h-3 w-3" />
            {customer.email}
          </p>
        </div>
        <span className="text-xs font-medium text-accent">{customer.projectCount} projects</span>
      </div>
    </div>
  );
}
