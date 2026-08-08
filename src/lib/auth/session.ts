import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { verifyBcryptPassword } from "@/lib/auth/password";

const cookieName = "cryptolyst_session";

function envValue(name: string) {
  return process.env[name]?.trim().replace(/^['\"]|['\"]$/g, "");
}

function secretKey() {
  const secret = envValue("SESSION_SECRET");
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function verifyPassword(password: string) {
  return verifyBcryptPassword(password, process.env.APP_PASSWORD_HASH);
}

export async function createSession() {
  const token = await new SignJWT({ sub: "single-user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, secretKey());
    return verified.payload.sub === "single-user" ? { user: "single-user" } : null;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}





