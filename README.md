# Cupcake Gourmet

Aplicação web desenvolvida para o Projeto Integrador Transdisciplinar em Engenharia de Software II, com base no planejamento aprovado no PIT I de Vania Martins dos Santos.

## Objetivo

Disponibilizar uma loja digital de cupcakes gourmet em que clientes possam consultar o catálogo, salvar favoritos, montar o carrinho, finalizar pedidos simulados, acompanhar o status da entrega e avaliar produtos comprados. A aplicação também oferece uma área administrativa para gerenciar produtos e pedidos.

## Funcionalidades

- Cadastro automático do perfil no primeiro acesso autenticado.
- Login protegido pela autenticação da plataforma.
- Catálogo com busca, detalhes, ingredientes, preço e avaliações.
- Favoritos por usuário.
- Carrinho com alteração de quantidades e cálculo do total.
- Checkout com endereço e pagamento acadêmico simulado por PIX ou cartão.
- Histórico e acompanhamento do status dos pedidos.
- Avaliação permitida somente após a compra do produto.
- Administração de produtos, preços, disponibilidade e destaques.
- Administração de pedidos e atualização do fluxo de entrega.
- Layout responsivo e acessível para computador e celular.

## Tecnologias

- TypeScript, React e Vinext.
- Tailwind CSS e componentes Shadcn.
- Cloudflare Workers e D1 SQLite.
- Drizzle para definição do esquema e geração de migrações.
- Sites para hospedagem.

## Arquitetura

O front-end React consome rotas HTTP internas. As rotas aplicam validações e regras de negócio antes de consultar o D1 por instruções preparadas. A identidade autenticada é usada como chave estável do usuário. O primeiro perfil criado recebe a função administrativa; os demais recebem a função de cliente.

## Banco de dados

As tabelas principais são `users`, `products`, `favorites`, `orders`, `order_items` e `reviews`. O esquema está em `db/schema.ts` e a migração em `drizzle/`.

## Regras de negócio implementadas

- E-mails e produtos não podem ser duplicados pelas chaves definidas.
- O pedido exige carrinho preenchido, produtos disponíveis e endereço completo.
- Quantidades devem ficar entre 1 e 20 unidades por item.
- O pagamento é somente uma simulação acadêmica; nenhum dado financeiro real é coletado.
- Apenas quem comprou o produto pode avaliá-lo.
- Somente administradores alteram produtos ou o status de pedidos.

## Validação

Foram verificados os fluxos de catálogo, busca, favoritos, carrinho, criação de pedido, acompanhamento, avaliação após compra e atualização administrativa de pedido. Os testes com cinco colegas exigidos pela atividade devem ser executados por pessoas reais e registrados no formulário acadêmico.
