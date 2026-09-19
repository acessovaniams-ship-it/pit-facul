import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cupcake Gourmet",
  description:
    "Loja de cupcakes gourmet com catálogo, favoritos, pedidos e acompanhamento.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
