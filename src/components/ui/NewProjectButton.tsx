import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface NewProjectButtonProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function NewProjectButton({ size = "sm", className }: NewProjectButtonProps) {
  return (
    <Link href="/projects/new">
      <Button variant="zinc" size={size} className={cn("gap-2", className)}>
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    </Link>
  );
}
