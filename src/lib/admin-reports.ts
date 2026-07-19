export interface UserReport {
  id: string;
  handle: string;
  name: string | null;
  reportedUserId: string | null;
  adminProfileHref: string | null;
  priority: string;
  reason: string;
  detail: string;
  variant: "default" | "outline";
  status: "open" | "dismissed" | "resolved";
  createdAt?: string;
}

export function getOpenReportedUsersCount(reports: UserReport[]) {
  return reports.filter((r) => r.status === "open").length;
}
