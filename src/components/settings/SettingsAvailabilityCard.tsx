"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { formatAvailabilityDateLabel, localDateKey } from "@/lib/appointment-slots";
import {
  APPOINTMENT_TYPE_OPTIONS,
  MEETING_MODE_OPTIONS,
  type DesignerAvailabilityDate,
  type DesignerAvailabilitySettings,
  type MeetingMode,
} from "@/lib/local-customer";

interface SettingsAvailabilityCardProps {
  availability: DesignerAvailabilitySettings;
  onChange: (next: DesignerAvailabilitySettings) => void;
}

const fieldClass =
  "w-full rounded-lg border border-primary/15 bg-background px-3 py-2.5 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

function sortDates(dates: DesignerAvailabilityDate[]) {
  return [...dates].sort((a, b) => a.availableDate.localeCompare(b.availableDate));
}

function dateKey(entry: DesignerAvailabilityDate) {
  return entry.id ?? entry.availableDate;
}

export function SettingsAvailabilityCard({
  availability,
  onChange,
}: SettingsAvailabilityCardProps) {
  const [newDate, setNewDate] = useState("");
  const minDate = useMemo(() => localDateKey(), []);

  function addDate() {
    if (!newDate) return;
    if (availability.dates.some((entry) => entry.availableDate === newDate)) return;
    onChange({
      ...availability,
      dates: sortDates([
        ...availability.dates,
        { availableDate: newDate, startTime: "10:00", endTime: "16:00" },
      ]),
    });
    setNewDate("");
  }

  function updateDate(availableDate: string, patch: Partial<DesignerAvailabilityDate>) {
    onChange({
      ...availability,
      dates: availability.dates.map((entry) =>
        entry.availableDate === availableDate ? { ...entry, ...patch } : entry
      ),
    });
  }

  function removeDate(availableDate: string) {
    onChange({
      ...availability,
      dates: availability.dates.filter((entry) => entry.availableDate !== availableDate),
    });
  }

  function toggleMeetingMode(mode: MeetingMode) {
    const enabled = availability.offeredMeetingModes.includes(mode);
    onChange({
      ...availability,
      offeredMeetingModes: enabled
        ? availability.offeredMeetingModes.filter((item) => item !== mode)
        : [...availability.offeredMeetingModes, mode],
    });
  }

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm lg:col-span-8 lg:p-8">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <CalendarClock className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-primary">Appointment availability</h3>
          <p className="mt-1 text-sm text-primary/60">
            Add the specific dates you are available, then tap Save. Linked clients will see open
            slots on those dates on their dashboard and My Designer page. Once a slot is requested,
            other clients cannot book the same time.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-primary/60">Slot length (minutes)</span>
            <select
              value={availability.slotMinutes}
              onChange={(e) =>
                onChange({ ...availability, slotMinutes: Number.parseInt(e.target.value, 10) })
              }
              className={fieldClass}
            >
              {[30, 45, 60, 90].map((value) => (
                <option key={value} value={value}>
                  {value} minutes
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <p className="text-sm font-medium text-primary">Meeting formats you offer</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MEETING_MODE_OPTIONS.filter((option) =>
              ["in_person", "video", "phone", "pickup", "local_delivery"].includes(option.value)
            ).map((option) => {
              const active = availability.offeredMeetingModes.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleMeetingMode(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    active ? "bg-primary text-white" : "border border-primary/15 text-primary"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-primary">Available dates</p>
          <p className="mt-1 text-xs text-primary/55">
            Appointment types clients can request:{" "}
            {APPOINTMENT_TYPE_OPTIONS.map((option) => option.label).join(", ")}
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block min-w-[12rem] flex-1 text-sm">
              <span className="mb-1 block text-primary/60">Add a date</span>
              <input
                type="date"
                min={minDate}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className={fieldClass}
              />
            </label>
            <button
              type="button"
              onClick={addDate}
              disabled={!newDate}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add date
            </button>
          </div>

          {availability.dates.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-primary/15 px-4 py-6 text-sm text-primary/55">
              No dates added yet. Pick the days you want clients to book.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {sortDates(availability.dates).map((entry) => (
                <div
                  key={dateKey(entry)}
                  className="rounded-lg border border-primary/10 bg-background/50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        {formatAvailabilityDateLabel(entry.availableDate)}
                      </p>
                      <p className="mt-0.5 text-xs text-primary/55">{entry.availableDate}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDate(entry.availableDate)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block text-primary/60">From</span>
                      <input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) =>
                          updateDate(entry.availableDate, { startTime: e.target.value })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-primary/60">To</span>
                      <input
                        type="time"
                        value={entry.endTime}
                        onChange={(e) =>
                          updateDate(entry.availableDate, { endTime: e.target.value })
                        }
                        className={fieldClass}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
