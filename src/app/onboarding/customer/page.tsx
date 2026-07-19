import { Suspense } from "react";
import { CustomerOnboardingContent } from "@/components/onboarding/customer/CustomerOnboardingContent";

export default function CustomerOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-primary/60">
          Loading setup…
        </div>
      }
    >
      <CustomerOnboardingContent mode="invite" />
    </Suspense>
  );
}
