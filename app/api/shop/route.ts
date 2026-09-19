import { getRawDb } from "@/db";
import { ensureSeedProducts } from "@/lib/seed";
import { ensureUser, routeError } from "@/lib/session";

type OrderRow = {
  id: number;
  status: string;
  payment_method: string;
  payment_status: string;
  address_text: string;
  total_cents: number;
  created_at: string;
};

type ItemRow = {
  order_id: number;
  product_id: number;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

export async function GET(request: Request) {
  try {
    const user = await ensureUser(request);
    await ensureSeedProducts();
    const db = getRawDb();

    const [productResult, favoriteResult, orderResult] = await Promise.all([
      db
        .prepare(
          `SELECT p.id, p.name, p.slug, p.description, p.ingredients,
                  p.price_cents, p.image_url, p.available, p.featured,
                  COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
                  COUNT(r.id) AS review_count
             FROM products p
             LEFT JOIN reviews r ON r.product_id = p.id
            WHERE p.available = 1
            GROUP BY p.id
            ORDER BY p.featured DESC, p.name ASC`,
        )
        .all(),
      db
        .prepare("SELECT product_id FROM favorites WHERE user_id = ?")
        .bind(user.id)
        .all<{ product_id: number }>(),
      db
        .prepare(
          `SELECT id, status, payment_method, payment_status, address_text,
                  total_cents, created_at
             FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC, id DESC`,
        )
        .bind(user.id)
        .all<OrderRow>(),
    ]);

    const orderRows = orderResult.results ?? [];
    let items: ItemRow[] = [];
    if (orderRows.length > 0) {
      const placeholders = orderRows.map(() => "?").join(",");
      const itemResult = await db
        .prepare(
          `SELECT order_id, product_id, product_name, unit_price_cents, quantity
             FROM order_items
            WHERE order_id IN (${placeholders})
            ORDER BY id ASC`,
        )
        .bind(...orderRows.map((order) => order.id))
        .all<ItemRow>();
      items = itemResult.results ?? [];
    }

    const orders = orderRows.map((order) => ({
      ...order,
      items: items.filter((item) => item.order_id === order.id),
    }));

    return Response.json({
      user,
      products: productResult.results ?? [],
      favorites: (favoriteResult.results ?? []).map((row) => row.product_id),
      orders,
    });
  } catch (error) {
    return routeError(error);
  }
}
