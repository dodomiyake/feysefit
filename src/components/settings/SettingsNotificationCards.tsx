"use client";

import { Bell, Mail } from "lucide-react";
import { cn } from "@/lib/cn";

interface SettingsNotificationCardsProps {
  emailDigests: boolean;
  pushAlerts: boolean;
  onEmailDigestsChange: (value: boolean) => void;
  onPushAlertsChange: (value: boolean) => void;
}

function NotificationCard({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: typeof Mail;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "block cursor-pointer rounded-lg border bg-background p-4 transition-colors",
        checked ? "border-accent/40" : "border-[#d3c3ba]/25"
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-[#d3c3ba] text-accent focus:ring-accent/30"
        />
      </div>
      <p className="text-sm font-medium text-primary">{title}</p>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>
    </label>
  );
}

export function SettingsNotificationCards({
  emailDigests,
  pushAlerts,
  onEmailDigestsChange,
  onPushAlertsChange,
}: SettingsNotificationCardsProps) {
  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:p-8">
      <h2 className="mb-6 font-headline text-xl font-semibold text-primary">Notification Channels</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NotificationCard
          icon={Mail}
          title="Email Digests"
          description="Weekly trend reports and project summaries."
          checked={emailDigests}
          onChange={onEmailDigestsChange}
        />
        <NotificationCard
          icon={Bell}
          title="Push Alerts"
          description="Real-time collaboration and project updates."
          checked={pushAlerts}
          onChange={onPushAlertsChange}
        />
      </div>
    </section>
  );
}
