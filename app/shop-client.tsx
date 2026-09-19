"use client";
import LoginForm from "./login-form";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CakeSlice,
  Check,
  ChevronRight,
  ClipboardList,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "customer";
};

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  ingredients: string;
  price_cents: number;
  image_url: string;
  available: number;
  featured: number;
  avg_rating: number;
  review_count: number;
};

type OrderItem = {
  order_id: number;
  product_id: number;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

type Order = {
  id: number;
  status: string;
  payment_method: string;
  payment_status: string;
  address_text: string;
  total_cents: number;
  created_at: string;
  items: OrderItem[];
};

type ShopData = {
  user: User;
  products: Product[];
  favorites: number[];
  orders: Order[];
};

type CartItem = { product: Product; quantity: number };

type AdminProduct = Product & { updated_at: string };
type AdminOrder = {
  id: number;
  status: string;
  payment_method: string;
  payment_status: string;
  total_cents: number;
  address_text: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  summary: string;
};
type AdminData = {
  products: AdminProduct[];
  orders: AdminOrder[];
  metrics: {
    order_count: number;
    customer_count: number;
    revenue_cents: number;
    active_products: number;
  };
};

const statusLabels: Record<string, string> = {
  recebido: "Recebido",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value.replace(" ", "T") + "Z"));
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw Object.assign(new Error(result.error ?? "Não foi possível concluir a operação."), { status: response.status });
  return result;
}

function Rating({ value, count }: { value: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-[#725f55]">
      <Star className="size-4 fill-[#b58a38] text-[#b58a38]" aria-hidden="true" />
      <strong className="font-semibold text-[#4a2a34]">{value || "Novo"}</strong>
      {count > 0 && <span>({count})</span>}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "entregue"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "cancelado"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-amber-50 text-amber-800 border-amber-200";
  return <Badge className={style}>{statusLabels[status] ?? status}</Badge>;
}

export default function ShopClient() {
  const [data, setData] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<{ id: number; name: string } | null>(null);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await api<ShopData>("/api/shop");
      setData(result);
      setNeedsLogin(false);
      setError("");
    } catch (requestError) {
      if ((requestError as { status?: number }).status === 401) {
        setData(null); setNeedsLogin(true); setCart([]); setAdminData(null);
        setAccountOpen(false); setAdminOpen(false); setCartOpen(false);
      }
      setError(requestError instanceof Error ? requestError.message : "Erro ao carregar a loja.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadAdmin = useCallback(async () => {
    if (!data || data.user.role !== "admin") return;
    setAdminLoading(true);
    try {
      setAdminData(await api<AdminData>("/api/admin"));
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Erro na administração.");
    } finally {
      setAdminLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (adminOpen) void loadAdmin();
  }, [adminOpen, loadAdmin]);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return data.products.filter((product) => {
      const matches =
        !term ||
        product.name.toLocaleLowerCase("pt-BR").includes(term) ||
        product.description.toLocaleLowerCase("pt-BR").includes(term) ||
        product.ingredients.toLocaleLowerCase("pt-BR").includes(term);
      return matches && (!favoritesOnly || data.favorites.includes(product.id));
    });
  }, [data, favoritesOnly, search]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price_cents * item.quantity,
    0,
  );

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(20, item.quantity + quantity) }
            : item,
        );
      }
      return [...current, { product, quantity: Math.max(1, Math.min(20, quantity)) }];
    });
    toast.success(`${product.name} adicionado ao carrinho.`);
  }, []);

  const setQuantity = (productId: number, quantity: number) => {
    setCart((current) =>
      quantity <= 0
        ? current.filter((item) => item.product.id !== productId)
        : current.map((item) =>
            item.product.id === productId
              ? { ...item, quantity: Math.min(20, quantity) }
              : item,
          ),
    );
  };

  const toggleFavorite = async (productId: number) => {
    if (!data) return;
    const wasFavorite = data.favorites.includes(productId);
    setData({
      ...data,
      favorites: wasFavorite
        ? data.favorites.filter((id) => id !== productId)
        : [...data.favorites, productId],
    });
    try {
      await api("/api/favorites", {
        method: "POST",
        body: JSON.stringify({ productId }),
      });
    } catch (requestError) {
      await refresh();
      toast.error(requestError instanceof Error ? requestError.message : "Não foi possível favoritar.");
    }
  };

  const checkout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cart.length === 0) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await api<{ order: { id: number } }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          address: form.get("address"),
          paymentMethod: form.get("paymentMethod"),
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });
      setCart([]);
      setCartOpen(false);
      toast.success(`Pedido #${result.order.id} confirmado.`);
      await refresh();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Não foi possível finalizar.");
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewProduct) return;
    setBusy(true);
    try {
      await api("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId: reviewProduct.id,
          rating: Number(reviewRating),
          comment: reviewComment,
        }),
      });
      toast.success("Avaliação registrada. Obrigada!");
      setReviewProduct(null);
      setReviewComment("");
      await refresh();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Não foi possível avaliar.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool || !data) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool(
        {
          name: "buscar_cupcakes",
          title: "Buscar cupcakes",
          description: "Busca produtos disponíveis pelo nome, descrição ou ingredientes.",
          inputSchema: {
            type: "object",
            properties: { termo: { type: "string" } },
            required: ["termo"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute(input) {
            const term = String((input as { termo?: string }).termo ?? "")
              .trim()
              .toLocaleLowerCase("pt-BR");
            return data.products
              .filter((product) =>
                `${product.name} ${product.description} ${product.ingredients}`
                  .toLocaleLowerCase("pt-BR")
                  .includes(term),
              )
              .map((product) => ({
                id: product.id,
                nome: product.name,
                preco: money(product.price_cents),
              }));
          },
        },
        { signal: lifecycle.signal },
      );
      await context.registerTool(
        {
          name: "adicionar_cupcake_ao_carrinho",
          title: "Adicionar ao carrinho",
          description: "Adiciona um cupcake disponível ao carrinho visível da loja.",
          inputSchema: {
            type: "object",
            properties: {
              produtoId: { type: "integer" },
              quantidade: { type: "integer", minimum: 1, maximum: 20 },
            },
            required: ["produtoId", "quantidade"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            const values = input as { produtoId?: number; quantidade?: number };
            const product = data.products.find((item) => item.id === Number(values.produtoId));
            const quantity = Number(values.quantidade);
            if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
              throw new Error("Produto ou quantidade inválida.");
            }
            addToCart(product, quantity);
            return { adicionado: true, produto: product.name, quantidade: quantity };
          },
        },
        { signal: lifecycle.signal },
      );
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [addToCart, data]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fbf7f2] px-6 text-[#401c2b]">
        <div className="text-center">
          <CakeSlice className="mx-auto mb-4 size-10 animate-pulse" />
          <p className="font-medium">Preparando a vitrine...</p>
        </div>
      </main>
    );
  }

  if (needsLogin) return <LoginForm onSuccess={refresh} />;

  if (!data || error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fbf7f2] px-6 text-[#401c2b]">
        <div className="max-w-md text-center">
          <CakeSlice className="mx-auto mb-4 size-10" />
          <h1 className="font-serif text-3xl font-semibold">Cupcake Gourmet</h1>
          <p className="mt-3 text-[#725f55]">{error || "A loja está temporariamente indisponível."}</p>
          <Button className="mt-6" onClick={() => void refresh()}>Tentar novamente</Button>
        </div>
      </main>
    );
  }

  const featured = data.products.find((product) => product.featured) ?? data.products[0];
  const favoriteProducts = data.products.filter((product) => data.favorites.includes(product.id));

  return (
    <div className="min-h-screen bg-[#fbf7f2] text-[#341c25]">
      <header className="sticky top-0 z-40 border-b border-[#eadfd9] bg-[#fffaf6]/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            className="flex items-center gap-3 text-left"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Voltar ao início"
          >
            <span className="grid size-10 place-items-center rounded-full bg-[#5b1932] text-white shadow-sm">
              <CakeSlice className="size-5" />
            </span>
            <span>
              <strong className="block font-serif text-xl leading-none">Cupcake Gourmet</strong>
              <span className="text-xs tracking-wide text-[#8b6b62]">feito em pequenos lotes</span>
            </span>
          </button>

          <div className="relative ml-auto hidden w-full max-w-sm md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8b6b62]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar sabor ou ingrediente"
              className="h-10 rounded-full border-[#dfd0c8] bg-white pl-10"
              aria-label="Buscar cupcakes"
            />
          </div>

          {data.user.role === "admin" && (
            <Button
              variant="outline"
              className="hidden border-[#dfd0c8] lg:inline-flex"
              onClick={() => setAdminOpen(true)}
            >
              <ShieldCheck /> Administração
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAccountOpen(true)}
            aria-label="Abrir minha conta"
          >
            <UserRound />
          </Button>
          <Button
            className="relative rounded-full bg-[#5b1932] text-white hover:bg-[#421124]"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag />
            <span className="hidden sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#d8aa52] text-[11px] font-bold text-[#341c25]">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <main>
        <section className="border-b border-[#eadfd9] bg-[#f5e8e2]">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-14">
            <div className="max-w-xl">
              <Badge className="mb-4 border-[#d7b066] bg-[#fff8e9] text-[#6a4a13]">
                <Sparkles className="mr-1 size-3.5" /> Sabores artesanais
              </Badge>
              <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-[#4b1830] sm:text-5xl lg:text-6xl">
                Cupcakes delicados, frescos e cheios de sabor.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#705b53] sm:text-lg">
                Escolha seus favoritos, monte o carrinho e acompanhe cada etapa do pedido em um só lugar.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  className="rounded-full bg-[#5b1932] px-6 text-white hover:bg-[#421124]"
                  onClick={() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Escolher cupcakes <ChevronRight />
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-[#cdbbb2] bg-white/50"
                  onClick={() => setAccountOpen(true)}
                >
                  <ClipboardList /> Acompanhar pedidos
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6e5a52]">
                <span className="inline-flex items-center gap-2"><Check className="size-4 text-[#8b6d28]" /> Produção artesanal</span>
                <span className="inline-flex items-center gap-2"><Check className="size-4 text-[#8b6d28]" /> Pagamento simulado seguro</span>
              </div>
            </div>

            {featured && (
              <button
                className="group relative mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] bg-[#2f1520] text-left shadow-[0_24px_60px_rgba(69,25,43,.18)]"
                onClick={() => setSelectedProduct(featured)}
                aria-label={`Ver detalhes de ${featured.name}`}
              >
                <img
                  src={featured.image_url}
                  alt={`Cupcake ${featured.name}`}
                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2b0e1c]/95 via-[#2b0e1c]/65 to-transparent px-6 pb-6 pt-20 text-white">
                  <span className="text-xs font-semibold uppercase tracking-[.16em] text-[#f1d79f]">Destaque da casa</span>
                  <div className="mt-1 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-3xl font-semibold">{featured.name}</h2>
                      <p className="mt-1 max-w-sm text-sm text-white/80">{featured.description}</p>
                    </div>
                    <span className="shrink-0 text-xl font-bold">{money(featured.price_cents)}</span>
                  </div>
                </div>
              </button>
            )}
          </div>
        </section>

        <section id="catalogo" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#9a7132]">Nossa vitrine</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-[#4b1830] sm:text-4xl">Escolha seu sabor</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative md:hidden">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8b6b62]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar sabor"
                  className="rounded-full border-[#dfd0c8] bg-white pl-10"
                />
              </div>
              <label className="inline-flex items-center gap-3 rounded-full border border-[#dfd0c8] bg-white px-4 py-2 text-sm font-medium">
                <Switch checked={favoritesOnly} onCheckedChange={setFavoritesOnly} />
                Somente favoritos
              </label>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cdbbb2] bg-white/50 px-6 py-16 text-center">
              <CakeSlice className="mx-auto size-10 text-[#966d7d]" />
              <h3 className="mt-4 font-serif text-2xl font-semibold">Nenhum cupcake encontrado</h3>
              <p className="mt-2 text-[#725f55]">Tente outro termo ou desative o filtro de favoritos.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const isFavorite = data.favorites.includes(product.id);
                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-[1.6rem] border border-[#eadfd9] bg-white shadow-[0_12px_36px_rgba(72,39,50,.06)]"
                  >
                    <div className="relative overflow-hidden bg-[#efe2dd]">
                      <button className="block w-full" onClick={() => setSelectedProduct(product)}>
                        <img
                          src={product.image_url}
                          alt={`Cupcake ${product.name}`}
                          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                        />
                      </button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-3 top-3 rounded-full bg-white/90 shadow-sm hover:bg-white"
                        onClick={() => void toggleFavorite(product.id)}
                        aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Heart className={isFavorite ? "fill-[#7c2445] text-[#7c2445]" : "text-[#5b1932]"} />
                      </Button>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-serif text-2xl font-semibold text-[#4b1830]">{product.name}</h3>
                          <Rating value={Number(product.avg_rating)} count={Number(product.review_count)} />
                        </div>
                        <span className="shrink-0 text-lg font-bold text-[#5b1932]">{money(product.price_cents)}</span>
                      </div>
                      <p className="mt-3 min-h-12 text-sm leading-6 text-[#725f55]">{product.description}</p>
                      <div className="mt-5 flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-full border-[#d7c5bd]"
                          onClick={() => setSelectedProduct(product)}
                        >
                          Detalhes
                        </Button>
                        <Button
                          className="flex-1 rounded-full bg-[#5b1932] text-white hover:bg-[#421124]"
                          onClick={() => addToCart(product)}
                        >
                          <Plus /> Adicionar
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-[#eadfd9] bg-[#35121f] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <CakeSlice className="size-5 text-[#e2ba6f]" />
            <span className="font-serif text-lg">Cupcake Gourmet</span>
          </div>
          <p className="text-sm text-white/65">Projeto acadêmico • pagamentos demonstrativos • sem cobrança real</p>
        </div>
      </footer>

      <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-3xl">
          {selectedProduct && (
            <div className="grid md:grid-cols-2">
              <img
                src={selectedProduct.image_url}
                alt={`Cupcake ${selectedProduct.name}`}
                className="h-full min-h-72 w-full object-cover"
              />
              <div className="flex flex-col p-6 sm:p-8">
                <DialogHeader>
                  <DialogTitle className="font-serif text-3xl text-[#4b1830]">{selectedProduct.name}</DialogTitle>
                  <DialogDescription className="text-base leading-7">{selectedProduct.description}</DialogDescription>
                </DialogHeader>
                <div className="mt-5"><Rating value={Number(selectedProduct.avg_rating)} count={Number(selectedProduct.review_count)} /></div>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-[#6b4c58]">Ingredientes</h4>
                  <p className="mt-2 text-sm leading-6 text-[#725f55]">{selectedProduct.ingredients}</p>
                </div>
                <div className="mt-auto flex items-center justify-between gap-4 pt-8">
                  <strong className="text-2xl text-[#5b1932]">{money(selectedProduct.price_cents)}</strong>
                  <Button
                    className="rounded-full bg-[#5b1932] px-6 text-white hover:bg-[#421124]"
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                  >
                    <ShoppingBag /> Adicionar ao carrinho
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full overflow-y-auto bg-[#fffaf6] sm:max-w-xl">
          <SheetHeader className="border-b border-[#eadfd9] px-6 py-6">
            <SheetTitle className="font-serif text-2xl text-[#4b1830]">Seu carrinho</SheetTitle>
            <SheetDescription>
              {cartCount} {cartCount === 1 ? "item selecionado" : "itens selecionados"}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-6 py-5">
            {cart.length === 0 ? (
              <div className="py-14 text-center">
                <ShoppingBag className="mx-auto size-10 text-[#9a7c70]" />
                <p className="mt-4 font-medium">Seu carrinho está vazio.</p>
                <Button variant="outline" className="mt-5 rounded-full" onClick={() => setCartOpen(false)}>Ver catálogo</Button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="flex gap-4 rounded-2xl border border-[#eadfd9] bg-white p-3">
                  <img src={item.product.image_url} alt="" className="size-20 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-semibold text-[#4b1830]">{item.product.name}</h3>
                      <span className="font-semibold">{money(item.product.price_cents * item.quantity)}</span>
                    </div>
                    <div className="mt-3 inline-flex items-center rounded-full border border-[#dfd0c8]">
                      <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setQuantity(item.product.id, item.quantity - 1)} aria-label="Diminuir quantidade"><Minus /></Button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setQuantity(item.product.id, item.quantity + 1)} aria-label="Aumentar quantidade"><Plus /></Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <form onSubmit={checkout} className="space-y-5 border-t border-[#eadfd9] px-6 py-6">
              <div className="flex items-center justify-between text-lg">
                <span>Total</span>
                <strong className="text-2xl text-[#5b1932]">{money(cartTotal)}</strong>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço completo de entrega</Label>
                <Textarea id="address" name="address" required minLength={12} placeholder="Rua, número, complemento, bairro e cidade" className="min-h-24 bg-white" />
              </div>
              <div className="space-y-3">
                <Label>Forma de pagamento</Label>
                <RadioGroup name="paymentMethod" defaultValue="pix" className="grid grid-cols-2 gap-3">
                  <Label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#dfd0c8] bg-white p-4"><RadioGroupItem value="pix" /> PIX simulado</Label>
                  <Label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#dfd0c8] bg-white p-4"><RadioGroupItem value="cartao" /> Cartão simulado</Label>
                </RadioGroup>
                <p className="text-xs leading-5 text-[#7d6960]">Ambiente acadêmico: nenhuma cobrança ou dado de cartão será processado.</p>
              </div>
              <Button type="submit" disabled={busy} className="h-12 w-full rounded-full bg-[#5b1932] text-white hover:bg-[#421124]">
                <PackageCheck /> {busy ? "Confirmando..." : "Confirmar pedido"}
              </Button>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl text-[#4b1830]">Minha conta</DialogTitle>
            <DialogDescription>Olá, {data.user.name}. Acompanhe seus pedidos e sabores favoritos.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="pedidos" className="mt-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
              <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
              <TabsTrigger value="perfil">Perfil</TabsTrigger>
            </TabsList>
            <TabsContent value="pedidos" className="mt-5 space-y-4">
              {data.orders.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-8 text-center text-[#725f55]">Você ainda não fez nenhum pedido.</p>
              ) : (
                data.orders.map((order) => (
                  <article key={order.id} className="rounded-2xl border border-[#eadfd9] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-[#7d6960]">Pedido #{order.id} • {shortDate(order.created_at)}</p>
                        <h3 className="mt-1 text-lg font-semibold">{money(order.total_cents)}</h3>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="mt-4 space-y-2 border-t border-[#eee4df] pt-4">
                      {order.items.map((item) => (
                        <div key={`${order.id}-${item.product_id}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span>{item.quantity}x {item.product_name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReviewProduct({ id: item.product_id, name: item.product_name })}
                          >
                            <Star /> Avaliar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </TabsContent>
            <TabsContent value="favoritos" className="mt-5">
              {favoriteProducts.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-8 text-center text-[#725f55]">Marque um coração no catálogo para salvar seus favoritos.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {favoriteProducts.map((product) => (
                    <button key={product.id} className="flex items-center gap-3 rounded-2xl border border-[#eadfd9] p-3 text-left" onClick={() => setSelectedProduct(product)}>
                      <img src={product.image_url} alt="" className="size-16 rounded-xl object-cover" />
                      <span><strong className="block">{product.name}</strong><span className="text-sm text-[#725f55]">{money(product.price_cents)}</span></span>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="perfil" className="mt-5">
              <div className="rounded-2xl border border-[#eadfd9] bg-[#fffaf6] p-6">
                <div className="grid size-12 place-items-center rounded-full bg-[#5b1932] text-white"><UserRound /></div>
                <h3 className="mt-4 text-xl font-semibold">{data.user.name}</h3>
                <p className="mt-1 text-[#725f55]">{data.user.email}</p>
                <Button className="mt-4" variant="outline" onClick={async () => {
                  try { await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }); await refresh(); }
                  catch { toast.error("Não foi possível sair. Tente novamente."); }
                }}>Sair da conta</Button>
                <Badge className="mt-4 bg-[#efe0e6] text-[#5b1932]">{data.user.role === "admin" ? "Administradora" : "Cliente"}</Badge>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reviewProduct)} onOpenChange={(open) => !open && setReviewProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[#4b1830]">Avaliar {reviewProduct?.name}</DialogTitle>
            <DialogDescription>Sua opinião ajuda a melhorar os próximos pedidos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitReview} className="space-y-4">
            <div className="space-y-2">
              <Label>Nota</Label>
              <Select value={reviewRating} onValueChange={setReviewRating}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((rating) => <SelectItem key={rating} value={String(rating)}>{rating} {rating === 1 ? "estrela" : "estrelas"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-comment">Comentário</Label>
              <Textarea id="review-comment" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={500} placeholder="Conte como foi sua experiência" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-[#5b1932] text-white hover:bg-[#421124]">Enviar avaliação</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AdminDialog
        open={adminOpen}
        onOpenChange={setAdminOpen}
        data={adminData}
        loading={adminLoading}
        refresh={loadAdmin}
        refreshShop={refresh}
      />

      <Toaster richColors position="bottom-right" />
    </div>
  );
}

function AdminDialog({
  open,
  onOpenChange,
  data,
  loading,
  refresh,
  refreshShop,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AdminData | null;
  loading: boolean;
  refresh: () => Promise<void>;
  refreshShop: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const patchAdmin = async (payload: object) => {
    setBusy(true);
    try {
      await api("/api/admin", { method: "PATCH", body: JSON.stringify(payload) });
      toast.success("Alteração salva.");
      await Promise.all([refresh(), refreshShop()]);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };

  const createProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    try {
      await api("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          name: values.get("name"),
          description: values.get("description"),
          ingredients: values.get("ingredients"),
          priceCents: Math.round(Number(values.get("price")) * 100),
          imageUrl: values.get("imageUrl"),
          featured: values.get("featured") === "on",
        }),
      });
      form.reset();
      toast.success("Produto cadastrado.");
      await Promise.all([refresh(), refreshShop()]);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Não foi possível cadastrar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl text-[#4b1830]">Administração da loja</DialogTitle>
          <DialogDescription>Gerencie produtos e acompanhe os pedidos recebidos.</DialogDescription>
        </DialogHeader>
        {loading || !data ? (
          <p className="py-12 text-center text-[#725f55]">Carregando informações...</p>
        ) : (
          <Tabs defaultValue="visao" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="visao">Visão geral</TabsTrigger>
              <TabsTrigger value="produtos">Produtos</TabsTrigger>
              <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
            </TabsList>
            <TabsContent value="visao" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ["Pedidos", data.metrics.order_count, ClipboardList],
                ["Clientes", data.metrics.customer_count, UserRound],
                ["Faturamento simulado", money(data.metrics.revenue_cents), Sparkles],
                ["Produtos ativos", data.metrics.active_products, Store],
              ] as const).map(([label, value, Icon]) => (
                <div key={String(label)} className="rounded-2xl border border-[#eadfd9] bg-[#fffaf6] p-5">
                  <Icon className="size-5 text-[#8b6d28]" />
                  <p className="mt-5 text-sm text-[#725f55]">{String(label)}</p>
                  <strong className="mt-1 block text-2xl text-[#4b1830]">{String(value)}</strong>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="produtos" className="mt-5 space-y-6">
              <form onSubmit={createProduct} className="grid gap-4 rounded-2xl border border-[#eadfd9] bg-[#fffaf6] p-5 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="new-name">Nome</Label><Input id="new-name" name="name" required /></div>
                <div className="space-y-2"><Label htmlFor="new-price">Preço em reais</Label><Input id="new-price" name="price" type="number" min="1" step="0.01" required /></div>
                <div className="space-y-2 md:col-span-2"><Label htmlFor="new-description">Descrição</Label><Textarea id="new-description" name="description" required minLength={10} /></div>
                <div className="space-y-2 md:col-span-2"><Label htmlFor="new-ingredients">Ingredientes</Label><Textarea id="new-ingredients" name="ingredients" required minLength={10} /></div>
                <div className="space-y-2"><Label htmlFor="new-image">Imagem</Label><select id="new-image" name="imageUrl" className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="/cupcakes/chocolate.png">Chocolate</option><option value="/cupcakes/red-velvet.png">Red Velvet</option><option value="/cupcakes/limao-frutas.png">Limão e frutas</option></select></div>
                <label className="flex items-center gap-3 self-end pb-2 text-sm font-medium"><input type="checkbox" name="featured" /> Produto em destaque</label>
                <Button type="submit" disabled={busy} className="md:col-span-2 bg-[#5b1932] text-white hover:bg-[#421124]"><Plus /> Cadastrar produto</Button>
              </form>
              <div className="space-y-3">
                {data.products.map((product) => (
                  <form
                    key={product.id}
                    className="grid items-center gap-3 rounded-2xl border border-[#eadfd9] p-4 sm:grid-cols-[1fr_130px_auto]"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const values = new FormData(event.currentTarget);
                      void patchAdmin({
                        resource: "product",
                        id: product.id,
                        priceCents: Math.round(Number(values.get("price")) * 100),
                        available: values.get("available") === "on",
                        featured: values.get("featured") === "on",
                      });
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img src={product.image_url} alt="" className="size-14 rounded-xl object-cover" />
                      <div><strong className="block">{product.name}</strong><span className="text-xs text-[#725f55]">#{product.id}</span></div>
                    </div>
                    <div><Label className="sr-only" htmlFor={`price-${product.id}`}>Preço</Label><Input id={`price-${product.id}`} name="price" type="number" step="0.01" min="1" defaultValue={(product.price_cents / 100).toFixed(2)} /></div>
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <label className="text-sm"><input type="checkbox" name="available" defaultChecked={Boolean(product.available)} className="mr-1" /> Ativo</label>
                      <label className="text-sm"><input type="checkbox" name="featured" defaultChecked={Boolean(product.featured)} className="mr-1" /> Destaque</label>
                      <Button type="submit" size="sm" disabled={busy}>Salvar</Button>
                    </div>
                  </form>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="pedidos" className="mt-5 space-y-3">
              {data.orders.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-8 text-center text-[#725f55]">Nenhum pedido recebido.</p>
              ) : (
                data.orders.map((order) => (
                  <article key={order.id} className="grid gap-4 rounded-2xl border border-[#eadfd9] p-5 md:grid-cols-[1fr_200px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><strong>Pedido #{order.id}</strong><StatusBadge status={order.status} /></div>
                      <p className="mt-2 text-sm text-[#725f55]">{order.customer_name} • {order.customer_email}</p>
                      <p className="mt-1 text-sm">{order.summary}</p>
                      <p className="mt-2 font-semibold">{money(order.total_cents)} • {order.payment_method.toUpperCase()}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Status do pedido</Label>
                      <Select value={order.status} onValueChange={(status) => void patchAdmin({ resource: "order", id: order.id, status })} disabled={busy}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </article>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
