export const DEFAULT_LIST_PAGE_SIZE = 20;

export function paginateItems<T>(items: T[], page: number, pageSize = DEFAULT_LIST_PAGE_SIZE) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    pageSize,
    totalPages,
    totalItems,
    items: items.slice(start, start + pageSize),
    rangeStart: totalItems === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, totalItems),
  };
}
