import { Suspense } from "react";
import { ClientMeasurementsPageContent } from "./ClientMeasurementsPageContent";

export default function ClientMeasurementsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-5 py-16 text-sm text-primary/60 lg:px-16">
          Loading client measurements…
        </div>
      }
    >
      <ClientMeasurementsPageContent />
    </Suspense>
  );
}
