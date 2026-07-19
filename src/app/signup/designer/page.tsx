import { Suspense } from "react";
import SignUpContent from "../SignUpContent";

export default function DesignerSignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignUpContent role="designer" />
    </Suspense>
  );
}
