"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, UserRound } from "lucide-react";
import type { SettingsProfile } from "@/lib/settings-profile";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { uploadAvatarImage } from "@/lib/services/storageService";

const fieldClass =
  "signup-field w-full rounded-lg border px-4 py-3 text-primary outline-none focus:outline-none";

interface SettingsProfileCardProps {
  profile: SettingsProfile;
  editing: boolean;
  onEdit: () => void;
  onChange: (profile: SettingsProfile) => void;
  variant?: "default" | "admin";
  showPhone?: boolean;
  showYearsExperience?: boolean;
}

function ProfileField({
  label,
  value,
  editing,
  onChange,
  id,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
  id: string;
  type?: string;
  readOnly?: boolean;
}) {
  const showInput = editing && !readOnly;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold text-ink-muted">
        {label}
      </label>
      {showInput ? (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
      ) : (
        <p className="text-base font-medium text-primary">{value || "—"}</p>
      )}
    </div>
  );
}

export function SettingsProfileCard({
  profile,
  editing,
  onEdit,
  onChange,
  variant = "default",
  showPhone = false,
  showYearsExperience = false,
}: SettingsProfileCardProps) {
  const isAdmin = variant === "admin";
  const { showToast, authUser } = useApp();
  const useSupabase = isSupabaseEnabled();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const avatarInitial = profile.fullName.trim().charAt(0).toUpperCase() || "?";

  const update = (key: keyof SettingsProfile, value: string) => {
    onChange({ ...profile, [key]: value });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      if (useSupabase) {
        if (!authUser?.id) throw new Error("You must be signed in to upload a photo.");
        const url = await uploadAvatarImage(authUser.id, file);
        onChange({ ...profile, avatar: url });
        showToast("Profile photo updated — save settings to keep it");
      } else {
        const url = URL.createObjectURL(file);
        onChange({ ...profile, avatar: url });
        showToast("Profile photo updated");
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not upload photo. Try JPG or PNG under 5MB.",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:col-span-8 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-headline text-xl font-semibold text-primary">Profile Details</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {isAdmin
              ? "How you appear in the admin portal and team list"
              : "Your public identity within the FeyseFit ecosystem"}
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <div className="relative shrink-0 self-start">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="sr-only"
            onChange={handlePhotoChange}
          />
          <div className="relative h-40 w-32 overflow-hidden rounded-lg border-2 border-[#d3c3ba]/30 bg-background">
            {profile.avatar ? (
              <Image
                src={profile.avatar}
                alt={profile.fullName}
                fill
                className="object-cover"
                sizes="128px"
                unoptimized={profile.avatar.startsWith("blob:")}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface text-primary">
                <UserRound className="h-10 w-10 text-ink-muted" aria-hidden />
                <span className="text-2xl font-semibold">{avatarInitial}</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 rounded-full bg-primary p-2 text-background shadow-lg disabled:opacity-60"
            aria-label="Change profile photo"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <ProfileField
            label="Full Name"
            id="settings-name"
            value={profile.fullName}
            editing={editing}
            onChange={(v) => update("fullName", v)}
          />
          <ProfileField
            label="Email Address"
            id="settings-email"
            type="email"
            value={profile.email}
            editing={editing}
            readOnly
            onChange={(v) => update("email", v)}
          />
          <ProfileField
            label={isAdmin ? "Role" : "Professional Role"}
            id="settings-role"
            value={profile.professionalRole}
            editing={editing}
            readOnly={isAdmin}
            onChange={(v) => update("professionalRole", v)}
          />
          {!isAdmin && (
            <ProfileField
              label="Location"
              id="settings-location"
              value={profile.location}
              editing={editing}
              onChange={(v) => update("location", v)}
            />
          )}
          {showYearsExperience && (
            <ProfileField
              label="Years of experience"
              id="settings-years-experience"
              type="number"
              value={profile.yearsExperience ?? ""}
              editing={editing}
              onChange={(v) => update("yearsExperience", v)}
            />
          )}
          {showPhone && (
            <ProfileField
              label="Phone Number"
              id="settings-phone"
              type="tel"
              value={profile.phone}
              editing={editing}
              onChange={(v) => update("phone", v)}
            />
          )}
        </div>
      </div>
    </section>
  );
}
