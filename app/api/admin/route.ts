import { getRawDb } from "@/db";
import { requireAdmin, routeError } from "@/lib/session";

const orderStatuses = new Set([
  "recebido",
  "em_preparo",
  "saiu_para_entrega",
  "entregue",
  "cancelado",
]);
const imageOptions = new Set([
  "/cupcakes/chocolate.png",
  "/cupcakes/red-velvet.png",
  "/cupcakes/limao-frutas.png",
]);

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = getRawDb();
    const [products, orders, metrics] = await Promise.all([
      db
        .prepare(
          `SELECT id, name, slug, description, ingredients, price_cents,
                  image_url, available, featured, updated_at
             FROM products
            ORDER BY available DESC, name ASC`,
        )
        .all(),
      db
        .prepare(
          `SELECT o.id, o.status, o.payment_method, o.payment_status,
                  o.total_cents, o.address_text, o.created_at,
                  u.name AS customer_name, u.email AS customer_email,
                  GROUP_CONCAT(oi.product_name || ' x' || oi.quantity, ', ') AS summary
             FROM orders o
             JOIN users u ON u.id = o.user_id
             LEFT JOIN order_items oi ON oi.order_id = o.id
            GROUP BY o.id
            ORDER BY o.created_at DESC, o.id DESC`,
        )
        .all(),
      db
        .prepare(
          `SELECT
              (SELECT COUNT(*) FROM orders) AS order_count,
              (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customer_count,
              (SELECT COALESCE(SUM(total_cents), 0) FROM orders WHERE status != 'cancelado') AS revenue_cents,
              (SELECT COUNT(*) FROM products WHERE available = 1) AS active_products`,
        )
        .first(),
    ]);

    return Response.json({
      products: products.results ?? [],
      orders: orders.results ?? [],
      metrics,
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const payload = (await request.json()) as {
      name?: string;
      description?: string;
      ingredients?: string;
      priceCents?: number;
      imageUrl?: string;
      featured?: boolean;
    };
    const name = payload.name?.trim() ?? "";
    const description = payload.description?.trim() ?? "";
    const ingredients = payload.ingredients?.trim() ?? "";
    const priceCents = Number(payload.priceCents);
    const imageUrl = payload.imageUrl ?? "";
    if (name.length < 3 || description.length < 10 || ingredients.length < 10) {
      return Response.json({ error: "Preencha nome, descrição e ingredientes." }, { status: 400 });
    }
    if (!Number.isInteger(priceCents) || priceCents < 100) {
      return Response.json({ error: "Preço inválido." }, { status: 400 });
    }
    if (!imageOptions.has(imageUrl)) {
      return Response.json({ error: "Imagem inválida." }, { status: 400 });
    }
    const slug = `${name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${Date.now().toString().slice(-5)}`;
    const db = getRawDb();
    const product = await db
      .prepare(
        `INSERT INTO products
          (name, slug, description, ingredients, price_cents, image_url, available, featured)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)
         RETURNING id`,
      )
      .bind(name, slug, description, ingredients, priceCents, imageUrl, payload.featured ? 1 : 0)
      .first();
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const payload = (await request.json()) as {
      resource?: "order" | "product";
      id?: number;
      status?: string;
      available?: boolean;
      featured?: boolean;
      priceCents?: number;
    };
    const id = Number(payload.id);
    if (!Number.isInteger(id) || id < 1) {
      return Response.json({ error: "Registro inválido." }, { status: 400 });
    }
    const db = getRawDb();
    if (payload.resource === "order") {
      if (!payload.status || !orderStatuses.has(payload.status)) {
        return Response.json({ error: "Status inválido." }, { status: 400 });
      }
      await db
        .prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(payload.status, id)
        .run();
      return Response.json({ success: true });
    }
    if (payload.resource === "product") {
      const priceCents = Number(payload.priceCents);
      if (!Number.isInteger(priceCents) || priceCents < 100) {
        return Response.json({ error: "Preço inválido." }, { status: 400 });
      }
      await db
        .prepare(
          `UPDATE products
              SET price_cents = ?, available = ?, featured = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
        )
        .bind(priceCents, payload.available ? 1 : 0, payload.featured ? 1 : 0, id)
        .run();
      return Response.json({ success: true });
    }
    return Response.json({ error: "Recurso inválido." }, { status: 400 });
  } catch (error) {
    return routeError(error);
  }
}
