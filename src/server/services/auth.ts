import bcrypt from "bcryptjs";
import type { UserRole } from "@/lib/design-tokens";
import { prisma } from "@/server/db";
import { signSessionToken, type SessionPayload } from "@/server/auth";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  customerId?: string;
  designerId?: string;
}

function mapUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  customerId: string | null;
  designerId: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    customerId: user.customerId ?? undefined,
    designerId: user.designerId ?? undefined,
  };
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return mapUser(user);
}

export async function createSessionForUser(user: AuthUser) {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    customerId: user.customerId,
    designerId: user.designerId,
  };
  const token = await signSessionToken(payload);
  return { user, token };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? mapUser(user) : null;
}
