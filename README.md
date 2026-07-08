# Balaio

Sistema web de **gestão de estoque e financeiro**, **multi-tenant**, **responsivo**.

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres + Auth + RLS)**, com deploy feito na **Vercel**.

---

## ✨ Funcionalidades (MVP)

- 🔐 **Auth completo** com Supabase (login, signup, confirmação por email)
- 🏢 **Multi-tenant**: cada signup cria uma empresa isolada via **RLS** (Row Level Security)
- 📊 **Dashboard** com saldo, contas a pagar/receber, vencimentos e estoque baixo
- 📦 **Produtos**: CRUD com SKU, preços, estoque mínimo
- 🔄 **Movimentações de estoque**: entrada, saída e ajuste (inventário)
- 💰 **Financeiro**: contas a pagar e receber, com filtros e marcação de pago
- ⚙️ **Configurações** da empresa
- 📱 **Responsivo** (mobile-first, sidebar com drawer)
- 🔒 **Isolamento total por tenant** garantido no banco com RLS

---

## 🚀 Setup local

### 1. Pré-requisitos

- Node.js 18+ (recomendado 20+)
- Conta gratuita no [Supabase](https://supabase.com)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar o Supabase

1. Crie um projeto novo em [supabase.com/dashboard](https://supabase.com/dashboard)
2. Anote:
   - **Project URL** (`Settings > API`)
   - **anon public key** (`Settings > API`)
   - **service_role key** (`Settings > API`) — ⚠️ nunca exponha no client

### 4. Rodar as migrations SQL

No Supabase, vá em **SQL Editor** e rode os arquivos na ordem:

1. `supabase/migrations/0001_initial_schema.sql` — tabelas e triggers de `updated_at`
2. `supabase/migrations/0002_rls_policies.sql` — habilita RLS e cria as policies
3. `supabase/migrations/0003_auth_triggers.sql` — funções SQL helper para tenant e estoque

### 5. Configurar confirmação de email

**Por padrão, a confirmação de email está desabilitada** para uma experiência mais fluida.

Se quiser habilitar:

- **Authentication > Providers > Email** → ative **"Confirm email"**
- Os usuários receberão um link por email para confirmar a conta

Para manter desabilitado (recomendado para MVP):

- Deixe desabilitado no Supabase Dashboard — o login após signup é instantâneo.

### 7. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 8. Rodar o app

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## 🌐 Deploy na Vercel

1. Suba o código para um repositório no GitHub
2. Importe o projeto na [Vercel](https://vercel.com/new)
3. Em **Environment Variables**, adicione as mesmas 4 variáveis do `.env.local`
   - Lembre-se de atualizar `NEXT_PUBLIC_APP_URL` para a URL de produção (ex: `https://stockflow.vercel.app`)
4. Deploy!

Após o deploy, atualize no Supabase:

- **Authentication > URL Configuration**:
  - **Site URL**: `https://stockflow.vercel.app`
  - **Additional Redirect URLs**: `https://stockflow.vercel.app/auth/callback`

---

## 🧱 Arquitetura

```
src/
├── app/
│   ├── (auth)/              # Rotas públicas (login, signup)
│   ├── (app)/               # Rotas autenticadas (com sidebar)
│   │   ├── page.tsx         # Dashboard
│   │   ├── products/        # CRUD de produtos
│   │   ├── stock/           # Movimentações
│   │   ├── financial/       # Financeiro
│   │   └── settings/        # Configurações
│   ├── actions/             # Server actions
│   └── auth/callback/       # Callback do Supabase Auth
├── components/
│   ├── ui/                  # Componentes base (Button, Input, Card, etc.)
│   └── layout/              # Sidebar, logout
├── lib/
│   ├── supabase/            # Clientes Supabase (server, client, middleware)
│   └── utils.ts
├── types/                   # Tipos do banco
└── middleware.ts            # Refresh de sessão + redirect
```

### Multi-tenancy

O isolamento é feito em **3 camadas**:

1. **Tabela `tenants`** + `tenant_id` em todas as tabelas de negócio
2. **Row Level Security (RLS)** filtra automaticamente todas as queries usando `get_tenant_id()` que busca tenant_id no banco via `auth.uid()`

Isso significa que **um bug no app não vaza dados entre tenants** — o banco se recusa a entregar.

### Decisões

- **Sem Prisma**: usamos `@supabase/ssr` diretamente, assim o RLS é respeitado em todas as queries
- **Sem shadcn**: componentes UI próprios em Tailwind puro, menos dependências
- **Server Actions**: mutations com `useActionState` para feedback inline
- **Mobile-first**: tabelas viram cards no mobile, sidebar vira drawer

---

## 🧪 Validações de segurança recomendadas

- [x] RLS habilitado em todas as tabelas
- [x] Policies com `get_tenant_id()` que busca tenant_id no banco
- [x] Service role usada **apenas** no signup (server-side)
- [ ] Após o MVP: adicionar rate-limit no signup
- [ ] Após o MVP: logs de auditoria (quem fez o quê)

---

## 📋 Próximos passos (pós-MVP)

- [ ] Convite de usuários (multi-user por tenant)
- [ ] Relatórios (DRE, fluxo de caixa, posição de estoque)
- [ ] Exportação CSV/PDF
- [ ] Notificações por email (vencimentos)
- [ ] Categorias customizáveis
- [ ] Histórico de movimentações por produto
- [ ] Multi-unidade (caixa → unidade)
- [ ] Subdomínio por tenant (`empresa.app.com`)

---

## 📝 Licença

MIT
