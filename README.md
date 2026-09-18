# Controle financeiro (casal)

App em Next.js que lê e escreve na planilha Google Sheets de controle financeiro, via uma
Service Account do Google Cloud. Veja o plano completo em
`~/.claude/plans/claude-atualmente-uso-uma-calm-storm.md`.

## Configuração

1. Copie `.env.local.example` para `.env.local` e preencha as variáveis (Service Account do
   Google, ID da planilha por ano, senha de acesso ao app). O próprio arquivo explica cada passo.
2. `npm install`
3. `npm run dev` — abre em [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm test` — testes (Vitest), incluindo `locateTables` contra o CSV real em `reference/`

## Estrutura

- `src/lib/sheets/` — toda a comunicação com a Google Sheets API (localização das tabelas,
  leitura, escrita, rollover do Nubank)
- `src/app/(app)/[year]/[month]/` — tela do mês (KPIs, tabelas, cadastro)
- `src/proxy.ts` — gate de senha (Next.js 16 renomeou `middleware.ts` para `proxy.ts`)
- `reference/` — export da planilha usado como fixture de teste (nomes e valores anonimizados,
  estrutura idêntica à real)
