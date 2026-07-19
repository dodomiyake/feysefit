"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Project } from "@/lib/mock-data";
import { messageThreadHref } from "@/lib/project-details";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { uploadProjectProgressImage } from "@/lib/services/storageService";
import { Camera, MessageSquare } from "lucide-react";

interface ProjectDetailsHeroProps {
  project: Project;
  isDesigner: boolean;
  isAdmin?: boolean;
  canManageProject?: boolean;
}

export function ProjectDetailsHero({
  project,
  isDesigner,
  isAdmin = false,
  canManageProject = isDesigner,
}: ProjectDetailsHeroProps) {
  const { showToast, authUser, addProjectGalleryImage } = useApp();
  const useSupabase = isSupabaseEnabled();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleProgressPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      if (useSupabase) {
        if (!authUser?.id) throw new Error("You must be signed in to upload photos.");
        const url = await uploadProjectProgressImage(authUser.id, file, project.id);
        addProjectGalleryImage(project.id, url);
      } else {
        showToast("Progress photo saved");
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
    <header className="mb-8 flex flex-col gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <StatusPill status={project.status} />
          <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
            {project.projectCode}
          </span>
        </div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-primary lg:text-5xl lg:leading-tight">
          {project.title}
        </h1>
        <p className="mt-2 text-sm text-ink-muted lg:text-base">
          Bespoke creation for{" "}
          <span className="font-medium text-primary">{project.customerName}</span>
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href={messageThreadHref(project.id)} className="w-full sm:w-auto">
          <Button variant="zinc" className="w-full gap-2" size="lg">
            <MessageSquare className="h-4 w-4" />
            {isDesigner || isAdmin ? "Message Client" : "Message Designer"}
          </Button>
        </Link>
        {canManageProject && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="sr-only"
              onChange={handleProgressPhoto}
            />
            <Button
              variant="secondary"
              className="w-full gap-2 sm:w-auto"
              size="lg"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              {uploading ? "Uploading..." : "Send Progress Photo"}
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
