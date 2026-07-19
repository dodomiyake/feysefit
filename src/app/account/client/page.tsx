import { RoleAccountGate } from "@/components/auth/RoleAccountGate";

export default function ClientAccountPage() {
  return <RoleAccountGate role="customer" />;
}
