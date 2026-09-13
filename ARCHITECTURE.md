# Arquitetura e roadmap Pessoa Física → Pessoa Jurídica

Este documento explica a decisão de design central do projeto: como o
sistema pode evoluir de um gestor financeiro pessoal (PF) para também
suportar Pessoa Jurídica (PJ) sem reescrever o que já existe.

## A ideia central: `FinancialEntity`

Nenhum dado financeiro (conta, categoria, transação, investimento, meta,
orçamento) pertence diretamente a um `User`. Todos eles pertencem a uma
**`FinancialEntity`** — e é o `User` que possui uma ou mais entidades.

```
User 1---N FinancialEntity 1---N { Account, Category, Transaction,
                                    Investment, Goal, Budget }
```

Hoje, todo usuário recebe automaticamente uma `FinancialEntity` do tipo
`"PF"` no cadastro (`backend/src/modules/auth/routes.ts`). Todas as rotas
da API resolvem a entidade ativa a partir do usuário autenticado
(`backend/src/middleware/auth.ts`) e filtram os dados por `entityId` — o
restante do código (contas, transações, relatórios etc.) nunca precisa
saber se está lidando com uma PF ou uma PJ.

Esse é o encaixe que permite adicionar Pessoa Jurídica depois **sem
migrar dados nem alterar as telas de PF**:

1. Ao criar uma empresa, criamos uma segunda `FinancialEntity` do tipo
   `"PJ"` para o mesmo usuário (ou para uma equipe, com um relacionamento
   adicional `EntityMember` no futuro, se for necessário multiusuário).
2. O `X-Entity-Id` (já suportado em `middleware/auth.ts`) permite ao
   frontend alternar qual entidade está ativa — hoje ele apenas escolhe a
   primeira entidade do usuário, mas o mecanismo já existe para um seletor
   de "Pessoa Física / Empresa X" na interface.
3. Contas, categorias, transações e investimentos **já funcionam
   igualmente para uma empresa** (uma conta corrente PJ, categorias de
   despesa da empresa, etc.) — nenhuma mudança de schema é necessária para
   o que já foi construído.

## O que falta ser adicionado para PJ (não construído ainda)

Os módulos abaixo são específicos de empresa e não existem hoje porque
não fazem sentido para Pessoa Física. Eles seriam novas tabelas que
referenciam `FinancialEntity`, seguindo o mesmo padrão dos módulos atuais
(schema + rotas Zod-validadas + página React), sem tocar em nada do que
já existe:

- **`AccountsPayable` / `AccountsReceivable`** (contas a pagar/receber):
  título, fornecedor/cliente, vencimento, status (pago/pendente/atrasado),
  forma de pagamento — reaproveitando o mesmo conceito de `PaymentMethod`
  já usado em `Transaction`.
- **`CashFlowEntry`** (fluxo de caixa): pode ser derivado das mesmas
  `Transaction`s (como o relatório `net-worth` já faz para PF) somado às
  contas a pagar/receber projetadas.
- **`DreLine`** (DRE gerencial): estrutura de linhas (receita bruta,
  deduções, custos, despesas operacionais, resultado) que agrega
  `Transaction`s por categoria — reaproveita `Category`/`expenseKind`,
  bastando mapear categorias PJ para linhas de DRE.
- **Margem de lucro e previsto x realizado (PJ)**: mesmo padrão do
  `Budget`/`reports/budget-vs-actual` que já existe para PF, aplicado a
  categorias e contas de uma entidade `"PJ"`.

Nenhum desses itens exige alterar `Account`, `Category`, `Transaction`,
`Investment`, `Goal` ou `Budget` — eles só ganham nova companhia ao lado,
todos amarrados por `entityId`.

## Módulo à parte: Obrigações Contábeis (prática do contador)

`Client`, `ObligationType`, `ClientObligation` e `ObligationCompletion`
(backend/src/modules/{clients,obligationTypes,clientObligations,obligations})
ficam de fora do modelo `FinancialEntity` de propósito: eles não são dados
financeiros do usuário (PF/PJ), e sim dados da **prática profissional** do
contador — quais empresas ele atende e quais obrigações cada uma precisa
cumprir. Por isso pertencem diretamente a `User`, não a uma entidade.

- `ObligationType` é o catálogo (ex.: PGDAS-D, DCTFWeb), com a regra de
  vencimento (mensal com dia + deslocamento de mês, ou anual com mês fixo).
  É seedado com os 5 tipos padrão no cadastro do usuário
  (`src/data/defaultObligationTypes.ts`) mas pode ser editado/expandido
  depois pelo próprio contador, sem alteração de código.
- `ClientObligation` liga um `Client` a um `ObligationType` (com `active`
  para desligar uma obrigação que não se aplica a um cliente específico,
  sem perder o histórico).
- `ObligationCompletion` só existe para competências já enviadas — nada é
  pré-criado para competências futuras/pendentes. O painel mensal
  (`GET /api/obligations/dashboard?month=YYYY-MM`) calcula quais obrigações
  vencem no mês pedido a partir da regra de cada `ObligationType` e cruza
  com `ObligationCompletion` para determinar Pendente/Atrasado/Enviado —
  dispensando qualquer cron/scheduler.

## Outras decisões de design relevantes

- **Valores monetários em centavos (`Int`)**: evita erros de
  arredondamento de ponto flutuante em cálculos financeiros. O frontend
  converte para/de reais nas bordas (`frontend/src/utils/format.ts`).
- **Enums como `String` no Prisma**: o SQLite (usado em desenvolvimento)
  não suporta enums nativos. Os valores permitidos são documentados no
  `schema.prisma` e validados via Zod nas rotas. Ao migrar para
  PostgreSQL em produção, é possível (opcionalmente) convertê-los para
  enums nativos sem perda de dados.
- **Parcelas e recorrência compartilham `installmentGroupId`**: tanto uma
  compra parcelada no cartão quanto uma despesa recorrente (ex.: aluguel
  mensal) geram múltiplas linhas de `Transaction` ligadas por um "id de
  série", permitindo editar/excluir o grupo inteiro de uma vez
  (`backend/src/modules/transactions/recurrence.ts`).
- **Fatura de cartão calculada, não armazenada**: em vez de uma tabela de
  faturas, o `invoiceMonth` de cada transação de cartão é calculado a
  partir do dia de fechamento da conta (`computeInvoiceMonth`), e o
  endpoint `GET /api/transactions/invoice` agrupa por conta + mês sob
  demanda.
