import { Suspense } from "react";
import SignUpContent from "../SignUpContent";

export default function ClientSignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignUpContent role="customer" />
    </Suspense>
  );
}
