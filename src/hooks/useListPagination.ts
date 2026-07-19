"use client";

import { useMemo, useState } from "react";
import { DEFAULT_LIST_PAGE_SIZE, paginateItems } from "@/lib/list-pagination";

export function useListPagination<T>(
  items: T[],
  pageSize = DEFAULT_LIST_PAGE_SIZE,
  resetKey?: string
) {
  const [page, setPage] = useState(1);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  const [prevLength, setPrevLength] = useState(items.length);

  if (resetKey !== prevResetKey || items.length !== prevLength) {
    setPrevResetKey(resetKey);
    setPrevLength(items.length);
    setPage(1);
  }

  const result = useMemo(() => paginateItems(items, page, pageSize), [items, page, pageSize]);

  if (page > result.totalPages) {
    setPage(result.totalPages);
  }

  return {
    ...result,
    setPage,
  };
}
