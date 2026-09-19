import { getRawDb } from "@/db";
import { tokenHash, sessionToken, assertSameOrigin } from "@/lib/auth";
export type StoreUser = { id: string; name: string; email: string; role: "admin" | "customer" };
export class SessionError extends Error {
  constructor(message: string, public status = 401) { super(message); }
}
export async function ensureUser(request: Request): Promise<StoreUser> {
  if (!["GET", "HEAD"].includes(request.method)) {
    try { assertSameOrigin(request); } catch { throw new SessionError("Requisição não permitida.", 403); }
  }
  const token = sessionToken(request);
  if (!token) throw new SessionError("Entre para acessar sua conta.");
  const user = await getRawDb().prepare(
    `SELECT u.id, u.name, u.email, u.role FROM auth_sessions s
     JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(await tokenHash(token), Date.now()).first<StoreUser>();
  if (!user) throw new SessionError("Sua sessão expirou. Entre novamente.");
  return user;
}
export async function requireAdmin(request: Request): Promise<StoreUser> {
  const user = await ensureUser(request);
  if (user.role !== "admin") throw new SessionError("Acesso restrito à administração.", 403);
  return user;
}
export function routeError(error: unknown) {
  const status = error instanceof SessionError ? error.status : 500;
  if (status === 500) console.error(error);
  return Response.json({ error: status === 500
    ? "Não foi possível acessar o serviço. Verifique a configuração do banco e tente novamente."
    : (error as Error).message }, { status, headers: { "Cache-Control": "no-store" } });
}
