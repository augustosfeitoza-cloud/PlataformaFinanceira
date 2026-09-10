# Plataforma de Planejamento e Gestão Financeira

Plataforma para registrar, organizar, analisar e planejar as finanças
pessoais — pensada desde o início para evoluir para um módulo de
Pessoa Jurídica sem precisar ser reconstruída (veja [ARCHITECTURE.md](./ARCHITECTURE.md)).

## Funcionalidades (Pessoa Física)

- **Receitas e despesas**: data, descrição, valor, categoria, subcategoria,
  forma de pagamento (Pix, cartão de crédito/débito, boleto, transferência,
  dinheiro) e recorrência (semanal/mensal/anual).
- **Categorias de despesa**: essenciais, lazer, educação, compras,
  financeiro e investimentos — com relatório por tipo e por percentual.
- **Contas financeiras**: corrente, poupança, digital e cartão de crédito
  (com limite, dia de fechamento/vencimento e parcelamento de compras).
- **Investimentos**: renda fixa (Tesouro Direto, CDB, RDB, LCI, LCA), renda
  variável (ações, FIIs, ETFs) e fundos — com espaço para novos subtipos.
- **Metas e orçamento**: metas com progresso, orçamento mensal por
  categoria e comparação planejado x realizado.
- **Dashboard e análises**: saldo mensal, despesas por categoria, %
  da renda comprometida e evolução patrimonial.

## Stack

- **Backend**: Node.js + TypeScript + Express + Prisma ORM + SQLite (dev).
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Recharts.
- **Autenticação**: JWT.

## Como rodar localmente

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate   # cria o banco SQLite e aplica o schema
npm run prisma:seed      # cria um usuário demo com dados de exemplo
npm run dev              # http://localhost:3333
```

Usuário demo criado pelo seed: `demo@plataforma.local` / `demo1234`.

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxy para a API em /api)
```

### Rodando tudo a partir da raiz (workspaces)

```bash
npm install
npm run dev:backend    # em um terminal
npm run dev:frontend   # em outro terminal
```

## Produção / PostgreSQL

O schema Prisma usa SQLite por padrão para não exigir nenhuma
infraestrutura em desenvolvimento. Para produção, troque o `provider` em
`backend/prisma/schema.prisma` de `"sqlite"` para `"postgresql"`, aponte
`DATABASE_URL` para o banco real e rode `npx prisma migrate deploy`. Os
modelos foram desenhados para serem portáveis entre os dois bancos.

## Estrutura do repositório

```
backend/
  prisma/schema.prisma   # modelo de dados (ver ARCHITECTURE.md)
  prisma/seed.ts          # dados de demonstração
  src/modules/*           # um módulo por domínio (auth, accounts, ...)
frontend/
  src/pages/*              # uma página por módulo
  src/components/          # layout e componentes de UI reutilizáveis
```
