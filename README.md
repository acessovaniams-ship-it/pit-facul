# Cupcake Gourmet

Aplicação web desenvolvida para o Projeto Integrador Transdisciplinar em Engenharia de Software II, com base no planejamento aprovado no PIT I de Vania Martins dos Santos.

## Objetivo

Disponibilizar uma loja digital de cupcakes gourmet em que clientes possam consultar o catálogo, salvar favoritos, montar o carrinho, finalizar pedidos simulados, acompanhar o status da entrega e avaliar produtos comprados. A aplicação também oferece uma área administrativa para gerenciar produtos e pedidos.

## Funcionalidades

- Cadastro e login próprios com e-mail e senha (mínimo de 12 caracteres).
- Senhas protegidas por scrypt; sessões revogáveis em cookies HttpOnly/Secure.
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
- Hospedagem na conta Cloudflare, em workers.dev.

## Arquitetura

O front-end React consome rotas HTTP internas. As rotas validam sessões no D1 e aplicam regras de negócio no servidor. Cabeçalhos de identidade enviados pelo navegador não são aceitos. Todos os cadastros recebem a função de cliente; a administração é concedida explicitamente pelo responsável pelo banco.

## Ativar o login na Cloudflare

1. No banco D1 já preparado, execute o conteúdo de `cloudflare/auth.sql` no Console. São três tabelas adicionais; os dados da loja não são apagados. O SQL pode ser executado novamente com segurança.
2. Confirme o binding `DB` no Worker `pit-facul`. O ID configurado é `2ec7eee1-df87-4f5b-8506-8c813e3f153b`.
3. Build: `npm run build`. Deploy: `npx wrangler deploy --config dist/server/wrangler.json`. A integração GitHub da Cloudflare pode usar esses comandos. Não use o fluxo de publicação do ChatGPT para este endereço.
4. Abra o site e selecione **Ainda não tenho conta**. Crie sua conta com uma senha própria (não a senha do ChatGPT).
5. Após cadastrar sua conta, execute no Console D1, substituindo o endereço pelo e-mail exato que você cadastrou: `UPDATE users SET role = 'admin' WHERE email = 'SEU_EMAIL_CADASTRADO';`. Recarregue a loja. Não promova contas desconhecidas.

Sessões duram sete dias e são revogadas ao sair. O login limita tentativas por e-mail e IP. Esta versão não inclui confirmação de e-mail ou recuperação de senha; contas antigas sem credenciais não podem ser assumidas apenas informando seu e-mail. O catálogo inicial é preenchido no primeiro acesso autenticado, se estiver vazio. R2 não é necessário.

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
