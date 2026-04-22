import type { UserRole } from "@bia-ops/shared";

export interface BiaSession {
  userId: string;
  role: UserRole;
  email: string;
  clientId?: string;
}

export function encodeSession(session: BiaSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

export function decodeSession(raw?: string): BiaSession | null {
  if (!raw) return null;
  try {
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
    const decoded =
      typeof Buffer !== "undefined"
        ? Buffer.from(raw, "base64url").toString("utf8")
        : atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "="));
    const session = JSON.parse(decoded) as BiaSession;
    if (!session.userId || !session.role || !session.email) return null;
    return session;
  } catch {
    return null;
  }
}
