export const LINKED_DESIGNER_PAGE_HREF = "/my-designer";
export const CUSTOMER_APPOINTMENTS_HREF = "/my-appointments";

export function linkedDesignerPageHref(linkedDesignerId?: string | null) {
  return linkedDesignerId ? LINKED_DESIGNER_PAGE_HREF : "/marketplace";
}
