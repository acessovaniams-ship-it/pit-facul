import { getRawDb } from "@/db";
import { ensureUser, routeError } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const user = await ensureUser(request);
    const payload = (await request.json()) as {
      productId?: number;
      rating?: number;
      comment?: string;
    };
    const productId = Number(payload.productId);
    const rating = Number(payload.rating);
    const comment = payload.comment?.trim() ?? "";

    if (!Number.isInteger(productId) || productId < 1) {
      return Response.json({ error: "Produto inválido." }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "Escolha uma nota de 1 a 5." }, { status: 400 });
    }
    if (comment.length > 500) {
      return Response.json({ error: "O comentário deve ter até 500 caracteres." }, { status: 400 });
    }

    const db = getRawDb();
    const purchase = await db
      .prepare(
        `SELECT oi.product_id
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
          WHERE o.user_id = ?
            AND oi.product_id = ?
            AND o.payment_status = 'aprovado'
            AND o.status != 'cancelado'
          LIMIT 1`,
      )
      .bind(user.id, productId)
      .first();
    if (!purchase) {
      return Response.json(
        { error: "Somente clientes que compraram o produto podem avaliá-lo." },
        { status: 403 },
      );
    }

    await db
      .prepare(
        `INSERT INTO reviews (user_id, product_id, rating, comment)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, product_id)
         DO UPDATE SET rating = excluded.rating,
                       comment = excluded.comment,
                       created_at = CURRENT_TIMESTAMP`,
      )
      .bind(user.id, productId, rating, comment)
      .run();

    return Response.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
