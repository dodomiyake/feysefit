import type { Metadata } from "next";
import CustomerDashboardClient from "./CustomerDashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Dashboard — FeyseFit",
};

export default function CustomerDashboardPage() {
  return <CustomerDashboardClient />;
}
