import { getRawDb } from "@/db";
import { assertSameOrigin, COOKIE, newSession, passwordHash, passwordMatches, sessionToken, tokenHash } from "@/lib/auth";
import { routeError, SessionError } from "@/lib/session";
export async function POST(request: Request) {
  try {
    try { assertSameOrigin(request); } catch { throw new SessionError("Requisição não permitida.", 403); }
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new SessionError("Formato inválido.", 400);
    const text = await request.text();
    if (text.length > 4096) throw new SessionError("Dados muito longos.", 400);
    let body;
    try { body = JSON.parse(text); } catch { throw new SessionError("Dados inválidos.", 400); }
    if (!body || typeof body !== "object") throw new SessionError("Dados inválidos.", 400);
    const db = getRawDb();
    if (body.action === "logout") {
      const token = sessionToken(request);
      if (token) await db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await tokenHash(token)).run();
      return Response.json({ success: true }, { headers: { "Cache-Control": "no-store", "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } });
    }
    if (!["login", "register"].includes(body.action)) throw new SessionError("Ação inválida.", 400);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) {
      throw new SessionError("Informe um e-mail válido e uma senha de 12 a 128 caracteres.", 400);
    }
    const window = Math.floor(Date.now() / 900000);
    const keys = [`email:${await tokenHash(email)}:${window}`, `ip:${await tokenHash(request.headers.get("cf-connecting-ip") ?? "unknown")}:${window}`];
    for (const key of keys) {
      const row = await db.prepare("INSERT INTO auth_attempts (key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts")
        .bind(key, (window + 1) * 900000).first<{ attempts: number }>();
      if ((row?.attempts ?? 100) > (key.startsWith("ip:") ? 30 : 10)) throw new SessionError("Muitas tentativas. Aguarde 15 minutos.", 429);
    }
    await db.batch([
      db.prepare("DELETE FROM auth_attempts WHERE expires_at < ?").bind(Date.now()),
      db.prepare("DELETE FROM auth_sessions WHERE expires_at < ?").bind(Date.now()),
    ]);
    let userId: string;
    if (body.action === "register") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 100) throw new SessionError("Informe seu nome (2 a 100 caracteres).", 400);
      const hash = await passwordHash(password);
      userId = crypto.randomUUID();
      try {
        await db.batch([
          db.prepare("INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, 'customer')").bind(userId, name, email),
          db.prepare("INSERT INTO auth_credentials (user_id, password_hash) VALUES (?, ?)").bind(userId, hash),
        ]);
      } catch (error) {
        if (String(error).includes("UNIQUE constraint")) throw new SessionError("Não foi possível cadastrar. Se já possui conta, use Entrar.", 409);
        throw error;
      }
    } else {
      const row = await db.prepare("SELECT u.id, c.password_hash FROM users u JOIN auth_credentials c ON c.user_id = u.id WHERE u.email = ?")
        .bind(email).first<{ id: string; password_hash: string }>();
      const dummy = `scrypt-v1$${"0".repeat(64)}$${"0".repeat(128)}`;
      const valid = await passwordMatches(password, row?.password_hash ?? dummy);
      if (!row || !valid) throw new SessionError("E-mail ou senha incorretos.");
      userId = row.id;
    }
    return Response.json({ success: true }, { headers: { "Cache-Control": "no-store", "Set-Cookie": await newSession(userId) } });
  } catch (error) { return routeError(error); }
}
