"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_LIST_PAGE_SIZE, paginateItems } from "@/lib/list-pagination";

export function useListPagination<T>(
  items: T[],
  pageSize = DEFAULT_LIST_PAGE_SIZE,
  resetKey?: string
) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey, items.length]);

  const result = useMemo(() => paginateItems(items, page, pageSize), [items, page, pageSize]);

  useEffect(() => {
    if (page > result.totalPages) {
      setPage(result.totalPages);
    }
  }, [page, result.totalPages]);

  return {
    ...result,
    setPage,
  };
}
