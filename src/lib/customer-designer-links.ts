export const LINKED_DESIGNER_PAGE_HREF = "/my-designer";

export function linkedDesignerPageHref(linkedDesignerId?: string | null) {
  return linkedDesignerId ? LINKED_DESIGNER_PAGE_HREF : "/marketplace";
}
