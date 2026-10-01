# Testes de segurança

Execute `npm run test:security`. O PGlite roda PostgreSQL em memória, sem conexão
ao Supabase e sem ler `.env`. Os IDs, usuários, empresas e registros são fictícios.

`fixtures/security-schema-before.json` contém somente as definições do inventário
enviado em 2026-10-01. Inclui funções vulneráveis para reproduzir ataques antes da
correção; **não é uma migration e não deve ser executado no Supabase**.

O bootstrap recria colunas, chaves primárias, helpers, funções, triggers, políticas
e privilégios usados nos cenários. Não reproduz integralmente constraints, roles,
extensões ou serviços do ambiente Supabase. Em particular, `auth.uid`, `auth.jwt`
e `storage.foldername` são adaptadores locais, não os serviços Auth e Storage.

A suíte confirma elevação de papel, exposição de custo e alteração de estoque
entre empresas antes da migration; depois testa bloqueios e fluxos autorizados.
A migration também é executada duas vezes para conferir reexecução.

Esses testes validam o SQL e a autorização no PostgreSQL local. A validação final
do ambiente exige `diagnostics/verify_security_hardening.sql` e testes funcionais
no Supabase, incluindo cadastro, convites e upload pelo serviço Storage.
