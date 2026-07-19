import type { SessionPayload } from "@/server/auth";
import { jsonError } from "@/server/http";
import { prisma } from "@/server/db";

/** Backend enforcement for the legacy Prisma API (Supabase uses RLS instead). */
export function forbidden(): Response {
  return jsonError("Forbidden", 403);
}

export async function assertCanAccessCustomer(
  session: SessionPayload,
  customerId: string
): Promise<true | Response> {
  if (session.role === "admin") return true;

  if (session.role === "customer") {
    if (session.customerId !== customerId) return forbidden();
    return true;
  }

  if (session.role === "designer") {
    if (!session.designerId) return forbidden();
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { linkedDesignerId: true },
    });
    if (!customer || customer.linkedDesignerId !== session.designerId) {
      return forbidden();
    }
    return true;
  }

  return forbidden();
}

export async function assertCanAccessProject(
  session: SessionPayload,
  projectId: string
): Promise<true | Response> {
  if (session.role === "admin") return true;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      designerId: true,
      customerId: true,
      customer: { select: { linkedDesignerId: true } },
    },
  });
  if (!project) return jsonError("Project not found", 404);

  if (session.role === "customer") {
    if (!session.customerId || project.customerId !== session.customerId) {
      return forbidden();
    }
    return true;
  }

  if (session.role === "designer") {
    if (!session.designerId || project.designerId !== session.designerId) {
      return forbidden();
    }
    // Authorised relationship required for platform customers.
    if (project.customerId) {
      if (project.customer?.linkedDesignerId !== session.designerId) {
        return forbidden();
      }
    }
    return true;
  }

  return forbidden();
}
