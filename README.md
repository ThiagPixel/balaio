# Balaio

Sistema web de gestão de estoque e financeiro por empresa, com usuários, permissões por operação e interface em português.

## Stack

- Next.js 14.2.15 (App Router), React 18 e TypeScript em modo estrito.
- Tailwind CSS e componentes próprios.
- Supabase Auth, PostgreSQL e Storage.
- Zod para validar os dados recebidos pelas Server Actions.

As versões instaladas são determinadas pelo `package-lock.json`.

## Funcionalidades presentes no código

- Login, cadastro de empresa, confirmação de email e recuperação de senha.
- Cadastro por convite, gestão de permissões e ativação/desativação de membros.
- Dashboard com indicadores de estoque e financeiro, conforme as permissões.
- Produtos com SKU, unidade, custo, preço, estoque mínimo e imagem.
- Entrada, saída e ajuste de estoque.
- Contas a pagar/receber com filtros, pagamento, reabertura, cancelamento e exclusão.
- Configurações da empresa e navegação adaptada às permissões do usuário.
- Interface responsiva e console de depuração mobile opcional.

Essa lista descreve a implementação local. O funcionamento completo depende das funções, triggers e políticas instaladas no projeto Supabase utilizado.

## Executar localmente

1. Utilize Node.js e npm compatíveis com as versões registradas no projeto.
2. Instale as dependências com `npm ci`.
3. Copie `.env.example` para `.env.local` e preencha as três variáveis:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   O código atual utiliza a chave pública e a sessão do usuário. Não requer `SUPABASE_SERVICE_ROLE_KEY`. Arquivos `.env` e `.env.local` não devem ser versionados; se ambos existirem, confira se apontam para o ambiente desejado.

4. Conecte a aplicação a um projeto Supabase que já possua o schema completo. Leia [o estado do banco](supabase/README.md) antes de executar SQL.
5. Configure no Supabase Auth a URL da aplicação e os redirecionamentos utilizados: `/auth/callback` e `/reset-password`. A confirmação de email depende da configuração do projeto Supabase; não é definida por este repositório.
6. Execute `npm run dev` e acesse `http://localhost:3000`.

**Banco novo:** as migrations versionadas não bastam para reproduzir o estado esperado pela aplicação. É necessário recuperar o schema e as migrations ausentes antes de tratar este repositório como uma instalação completa.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run typecheck` | Verificação de TypeScript |
| `npm run lint` | ESLint com as regras `next/core-web-vitals` |
| `npm run build` | Build de produção |
| `npm start` | Executar o build de produção |

Ainda não há suíte de testes automatizados no repositório. Typecheck e lint não validam os contratos das RPCs nem as permissões do banco em execução.

## Organização

```text
src/
├── app/
│   ├── (auth)/          Login, cadastro, convites e recuperação de senha
│   ├── (app)/           Dashboard, produtos, estoque, financeiro e configurações
│   ├── actions/         Server Actions por área de negócio
│   ├── auth/callback/   Troca do código de autenticação por sessão
│   ├── account-disabled/ Conta desativada ou sem vínculo válido
│   └── forbidden/       Acesso negado
├── components/
│   ├── ui/              Controles, cards, formulários e upload de imagem
│   ├── layout/          Sidebar responsiva e logout
│   ├── auth/            Apoio à recuperação de senha
│   └── debug/           Console mobile opcional
├── lib/
│   ├── auth/            Catálogo de permissões
│   ├── supabase/        Clientes, sessão, empresa e autorização
│   └── utils.ts         Formatação e utilitários
├── types/               Interfaces manuais de domínio
└── middleware.ts        Atualização da sessão e redirecionamentos
supabase/
├── migrations/          Histórico SQL parcial
├── diagnostics/         Consultas de diagnóstico sem alteração do banco
└── seed.sql             Dados de exemplo para desenvolvimento
```

## Fluxo de dados e acesso

As páginas consultam o Supabase principalmente por RPCs (funções SQL). Formulários client usam `useFormState`, do React DOM, para chamar Server Actions. Essas actions validam os dados com Zod, verificam permissões, executam RPCs e revalidam as páginas.

O middleware verifica a sessão e o status da conta. `requireTenant` resolve o vínculo empresarial; `requirePermission` protege operações; `requirePagePermission` protege páginas. A sidebar recebe apenas os links permitidos pelo contexto de acesso.

O cadastro chama `auth.signUp` com `signup_flow` igual a `create_company` ou `accept_invitation`. A criação do vínculo depende dos triggers do banco, que não estão integralmente versionados. Convites usam hash SHA-256 do token.

O isolamento por empresa usa `tenant_id`, RLS e funções SQL. A proteção efetiva depende também das políticas, permissões de execução e verificações dentro dessas funções. As validações no Next.js não substituem a autorização no banco.

Imagens são enviadas pelo navegador ao bucket `product-images`; a migration local configura leitura pública. As interfaces em `src/types` são manuais e não tipam automaticamente os argumentos ou resultados das RPCs.

## Depuração mobile

Na área autenticada, `?debug=1` ativa o console Eruda 1.4.4, carregado do jsDelivr. A preferência fica no `localStorage` (`tablet-debug`). `?debug=0` desativa a preferência; recarregue a página para remover um console já carregado.

## Publicação

O projeto está organizado para execução em um ambiente compatível com Next.js, incluindo Vercel. Configure as mesmas três variáveis, use a URL de produção em `NEXT_PUBLIC_APP_URL` e ajuste os redirecionamentos no Supabase Auth. Este repositório não comprova o estado de um deploy remoto.
