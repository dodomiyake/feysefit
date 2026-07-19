import type { LucideIcon } from "lucide-react";
import { PenLine, Ruler, Shirt } from "lucide-react";

export type InviteProjectType = "bespoke" | "ready-to-wear" | "consultation";

export interface InviteProjectTypeOption {
  id: InviteProjectType;
  label: string;
  icon: LucideIcon;
}

export const inviteProjectTypeOptions: InviteProjectTypeOption[] = [
  { id: "bespoke", label: "Bespoke", icon: Ruler },
  { id: "ready-to-wear", label: "Ready-to-Wear", icon: Shirt },
  { id: "consultation", label: "Consultation", icon: PenLine },
];

export const INVITE_OPEN_SLOTS = 4;

export const INVITE_EDITORIAL_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDu7MVSJO5myVbmIpvbACt8wHuk_kxhvto7iWNm3WeZ_F7x7XPKsuzZUY5TMgyK6nL13qxYugrpm_nb0vuNpcFmXd0GzzJmz87_cwJHKHkZ3Khg2nYA13lRB43G31tF3RD54ZB1X1C8T9nw7uNjMzZPFTI-yp3qbl0zYnLen2NGaooyK2ZcN8znGUKsH_7VdOyi4DQY466QQltIpIU813sjUOaHz00JGKC7tKaUW_El1VKGh3hJ27KNUUM3F53SPSrXg0eVryz2Wg";

export const INVITE_EDITORIAL_QUOTE =
  "Excellence is not an act, but a habit of design.";
