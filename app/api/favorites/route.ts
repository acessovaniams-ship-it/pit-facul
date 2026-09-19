import { getRawDb } from "@/db";
import { ensureUser, routeError } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const user = await ensureUser(request);
    const payload = (await request.json()) as { productId?: number };
    const productId = Number(payload.productId);
    if (!Number.isInteger(productId) || productId < 1) {
      return Response.json({ error: "Produto inválido." }, { status: 400 });
    }

    const db = getRawDb();
    const product = await db
      .prepare("SELECT id FROM products WHERE id = ? AND available = 1")
      .bind(productId)
      .first();
    if (!product) {
      return Response.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const favorite = await db
      .prepare("SELECT product_id FROM favorites WHERE user_id = ? AND product_id = ?")
      .bind(user.id, productId)
      .first();

    if (favorite) {
      await db
        .prepare("DELETE FROM favorites WHERE user_id = ? AND product_id = ?")
        .bind(user.id, productId)
        .run();
      return Response.json({ favorite: false });
    }

    await db
      .prepare("INSERT INTO favorites (user_id, product_id) VALUES (?, ?)")
      .bind(user.id, productId)
      .run();
    return Response.json({ favorite: true });
  } catch (error) {
    return routeError(error);
  }
}
