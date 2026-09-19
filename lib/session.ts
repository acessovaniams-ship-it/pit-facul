import { getRawDb } from "@/db";

export type StoreUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "customer";
};

export class SessionError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "SessionError";
    this.status = status;
  }
}

function decodeFullName(request: Request): string | null {
  const encoded = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get(
    "oai-authenticated-user-full-name-encoding",
  );
  if (!encoded || encoding !== "percent-encoded-utf-8") return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

function identityFromRequest(request: Request) {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");

  if (userId && email) {
    return {
      userId,
      email,
      name: decodeFullName(request) ?? email.split("@")[0],
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      userId: "demo-vania",
      email: "vania.demo@cupcake.local",
      name: "Vania",
    };
  }

  throw new SessionError("Entre para acessar sua conta.");
}

export async function ensureUser(request: Request): Promise<StoreUser> {
  const identity = identityFromRequest(request);
  const db = getRawDb();
  const existing = await db
    .prepare(
      "SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1",
    )
    .bind(identity.userId)
    .first<StoreUser>();

  if (existing) return existing;

  const adminCount = await db
    .prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'")
    .first<{ total: number }>();
  const role = Number(adminCount?.total ?? 0) === 0 ? "admin" : "customer";

  await db
    .prepare(
      "INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)",
    )
    .bind(identity.userId, identity.name, identity.email, role)
    .run();

  return { id: identity.userId, name: identity.name, email: identity.email, role };
}

export async function requireAdmin(request: Request): Promise<StoreUser> {
  const user = await ensureUser(request);
  if (user.role !== "admin") {
    throw new SessionError("Acesso restrito à administração.", 403);
  }
  return user;
}

export function routeError(error: unknown) {
  if (error instanceof SessionError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  console.error(error);
  return Response.json(
    { error: message || "Não foi possível concluir a operação." },
    { status: 500 },
  );
}
