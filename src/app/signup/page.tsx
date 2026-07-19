import { Suspense } from "react";
import SignUpPage from "./SignUpContent";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignUpPage />
    </Suspense>
  );
}
