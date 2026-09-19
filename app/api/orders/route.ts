import { getRawDb } from "@/db";
import { ensureUser, routeError } from "@/lib/session";

type CartItemInput = { productId?: number; quantity?: number };
type ProductRow = {
  id: number;
  name: string;
  price_cents: number;
  available: number;
};

const paymentMethods = new Set(["pix", "cartao"]);

export async function POST(request: Request) {
  try {
    const user = await ensureUser(request);
    const payload = (await request.json()) as {
      items?: CartItemInput[];
      address?: string;
      paymentMethod?: string;
    };

    const address = payload.address?.trim() ?? "";
    const paymentMethod = payload.paymentMethod?.trim() ?? "";
    const items = (payload.items ?? [])
      .map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      }))
      .filter(
        (item) =>
          Number.isInteger(item.productId) &&
          item.productId > 0 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          item.quantity <= 20,
      );

    if (items.length === 0) {
      return Response.json({ error: "Seu carrinho está vazio." }, { status: 400 });
    }
    if (address.length < 12) {
      return Response.json(
        { error: "Informe o endereço completo de entrega." },
        { status: 400 },
      );
    }
    if (!paymentMethods.has(paymentMethod)) {
      return Response.json({ error: "Forma de pagamento inválida." }, { status: 400 });
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const placeholders = productIds.map(() => "?").join(",");
    const db = getRawDb();
    const productResult = await db
      .prepare(
        `SELECT id, name, price_cents, available
           FROM products
          WHERE id IN (${placeholders})`,
      )
      .bind(...productIds)
      .all<ProductRow>();
    const products = productResult.results ?? [];

    if (products.length !== productIds.length || products.some((product) => !product.available)) {
      return Response.json(
        { error: "Um dos produtos selecionados não está disponível." },
        { status: 409 },
      );
    }

    const normalizedItems = items.map((item) => {
      const product = products.find((row) => row.id === item.productId)!;
      return { ...item, product };
    });
    const totalCents = normalizedItems.reduce(
      (sum, item) => sum + item.product.price_cents * item.quantity,
      0,
    );

    const order = await db
      .prepare(
        `INSERT INTO orders
          (user_id, status, payment_method, payment_status, address_text, total_cents)
         VALUES (?, 'recebido', ?, 'aprovado', ?, ?)
         RETURNING id, status, payment_status, created_at`,
      )
      .bind(user.id, paymentMethod, address, totalCents)
      .first<{ id: number; status: string; payment_status: string; created_at: string }>();
    if (!order) throw new Error("Não foi possível criar o pedido.");

    const statements = normalizedItems.map((item) =>
      db
        .prepare(
          `INSERT INTO order_items
            (order_id, product_id, product_name, unit_price_cents, quantity)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          order.id,
          item.product.id,
          item.product.name,
          item.product.price_cents,
          item.quantity,
        ),
    );
    await db.batch(statements);

    return Response.json(
      { order: { ...order, total_cents: totalCents } },
      { status: 201 },
    );
  } catch (error) {
    return routeError(error);
  }
}
