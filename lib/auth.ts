import { scrypt, timingSafeEqual } from "node:crypto";
import { getRawDb } from "@/db";
export const COOKIE = "__Host-cupcake_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export function assertSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new Error("Origem inválida.");
}
export function sessionToken(request: Request) {
  const value = request.headers.get("cookie")?.split(";").map(v => v.trim())
    .find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
}
export async function tokenHash(token: string) {
  return Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).toString("hex");
}
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64,
    { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
    (error, key) => error ? reject(error) : resolve(key)));
}
export async function passwordHash(password: string) {
  const salt = randomToken();
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function passwordMatches(password: string, encoded: string) {
  const [version, salt, hash] = encoded.split("$");
  if (version !== "scrypt-v1" || !/^[a-f0-9]{64}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(hash ?? "")) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(hash, "hex"));
}
export async function newSession(userId: string) {
  const token = randomToken();
  await getRawDb().prepare("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await tokenHash(token), userId, Date.now() + SESSION_SECONDS * 1000).run();
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}
