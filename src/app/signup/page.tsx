import { redirect } from "next/navigation";

/**
 * Legacy /signup entry — send people to the role account gate or a role-specific form.
 * Query: ?role=designer|customer, optional ?invite= / ?code=
 */
export default async function SignUpIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const roleRaw = typeof params.role === "string" ? params.role : "";
  const invite =
    (typeof params.invite === "string" && params.invite) ||
    (typeof params.code === "string" && params.code) ||
    "";

  if (invite || roleRaw === "customer") {
    const qs = invite ? `?invite=${encodeURIComponent(invite)}` : "";
    redirect(`/signup/client${qs}`);
  }
  if (roleRaw === "designer") {
    redirect("/signup/designer");
  }

  redirect("/account/designer");
}
