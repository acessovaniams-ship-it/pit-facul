import { getRawDb } from "@/db";

const seedProducts = [
  {
    name: "Chocolate Belga",
    slug: "chocolate-belga",
    description: "Massa intensa de cacau e ganache cremosa de chocolate belga.",
    ingredients: "Farinha, ovos, leite, manteiga, cacau, chocolate belga e açúcar.",
    price: 1690,
    image: "/cupcakes/chocolate.png",
    featured: 1,
  },
  {
    name: "Red Velvet",
    slug: "red-velvet",
    description: "Massa aveludada, creme de queijo suave e framboesa fresca.",
    ingredients: "Farinha, ovos, leite, manteiga, cacau, cream cheese, framboesa e açúcar.",
    price: 1790,
    image: "/cupcakes/red-velvet.png",
    featured: 1,
  },
  {
    name: "Limão e Mirtilo",
    slug: "limao-e-mirtilo",
    description: "Cupcake cítrico com mirtilos e cobertura leve de limão siciliano.",
    ingredients: "Farinha, ovos, leite, manteiga, limão siciliano, mirtilo e açúcar.",
    price: 1750,
    image: "/cupcakes/limao-frutas.png",
    featured: 1,
  },
  {
    name: "Brigadeiro Crocante",
    slug: "brigadeiro-crocante",
    description: "Chocolate, brigadeiro artesanal e finalização crocante de cacau.",
    ingredients: "Farinha, ovos, leite, manteiga, cacau, leite condensado e chocolate.",
    price: 1850,
    image: "/cupcakes/chocolate.png",
    featured: 0,
  },
  {
    name: "Baunilha e Framboesa",
    slug: "baunilha-e-framboesa",
    description: "Baunilha natural, recheio delicado e framboesa no acabamento.",
    ingredients: "Farinha, ovos, leite, manteiga, baunilha, framboesa e açúcar.",
    price: 1790,
    image: "/cupcakes/red-velvet.png",
    featured: 0,
  },
  {
    name: "Blueberry Lemon",
    slug: "blueberry-lemon",
    description: "Massa amanteigada com mirtilos e cobertura fresca de limão.",
    ingredients: "Farinha, ovos, leite, manteiga, mirtilo, limão e açúcar.",
    price: 1790,
    image: "/cupcakes/limao-frutas.png",
    featured: 0,
  },
];

export async function ensureSeedProducts() {
  const db = getRawDb();
  const row = await db
    .prepare("SELECT COUNT(*) AS total FROM products")
    .first<{ total: number }>();
  if (Number(row?.total ?? 0) > 0) return;

  const statements = seedProducts.map((product) =>
    db
      .prepare(
        `INSERT INTO products
          (name, slug, description, ingredients, price_cents, image_url, available, featured)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      )
      .bind(
        product.name,
        product.slug,
        product.description,
        product.ingredients,
        product.price,
        product.image,
        product.featured,
      ),
  );
  await db.batch(statements);
}
