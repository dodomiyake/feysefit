import { AppShell } from "@/components/layout/AppShell";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";

export default function CreateProjectPage() {
  return (
    <AppShell
      mobileTitle="Create Project"
      showMobileTopBar
      mobileBackHref="/projects"
    >
      <CreateProjectForm />
    </AppShell>
  );
}
