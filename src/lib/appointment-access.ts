import type { CustomerLinkState } from "@/lib/customer-access";
import type { Designer } from "@/lib/mock-data";
import type { MeetingMode } from "@/lib/local-customer";

export function customerMayRequestAppointment(
  customerLink: CustomerLinkState,
  designerId: string,
  options?: { hasActiveProjectWithDesigner?: boolean }
): boolean {
  if (customerLink.linkedDesignerId === designerId) return true;
  if (options?.hasActiveProjectWithDesigner) return true;
  return false;
}

export function designerAcceptsAppointments(designer: Designer): boolean {
  const remoteModes = designer.offeredMeetingModes?.filter((mode) => mode === "video" || mode === "phone") ?? [];
  return Boolean(designer.offersInPersonAppointments || remoteModes.length > 0);
}

export function meetingModesForDesigner(designer: Designer): MeetingMode[] {
  const modes: MeetingMode[] = [];
  if (designer.offersInPersonAppointments) {
    modes.push("in_person", "pickup", "local_delivery");
  }
  for (const mode of designer.offeredMeetingModes ?? []) {
    if (!modes.includes(mode)) modes.push(mode);
  }
  return modes.length ? modes : ["in_person"];
}
