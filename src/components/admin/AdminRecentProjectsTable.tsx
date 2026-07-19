"use client";

import { AdminProjectsTable } from "@/components/admin/AdminProjectsTable";

export function AdminRecentProjectsTable(props: { limit?: number | null }) {
  return (
    <AdminProjectsTable
      limit={props.limit}
      showFilters={props.limit === null}
    />
  );
}
