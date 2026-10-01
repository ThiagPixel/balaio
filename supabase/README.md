# Estado do banco de dados

O histórico SQL local é parcial: há migrations `0001`, `0002`, `0003`, `0020`,
`0021`, `0022` e `0023`. Os arquivos `0004` a `0019` não estão presentes. A sequência
disponível não constitui uma instalação completa para um banco novo.

## Divergências verificadas

- O código exige `get_my_account_status`, `get_my_access_context`, `has_permission`,
  funções financeiras, indicadores e administração de membros que não são
  definidas nas migrations locais.
- O cadastro depende de triggers que criem a empresa ou aceitem o convite.
  A migration `0020` cita `handle_new_company_user` e `private.member_invitations`,
  mas não contém suas definições.
- `execute_stock_movement` em `0003` exige `p_tenant_id` e `p_new_stock`; a action
  atual envia apenas produto, tipo, quantidade, custo e observações.
- As funções de produtos em `0022` usam `SECURITY DEFINER` e filtro por empresa,
  mas não verificam as permissões granulares usadas pelo app. As leituras retornam
  custo sem verificar `products.view_cost`.
- As políticas iniciais de `0002` não representam todo o controle de acesso
  granular exigido pelo código atual.

O inventário fornecido em 2026-10-01 confirmou funções e políticas antigas
instaladas junto ao modelo atual de permissões. A migration `0023` corrige as
falhas confirmadas nesse inventário; sua aplicação no Supabase ainda deve ser
verificada. Ela não preenche o histórico ausente.

## Aplicação da correção 0023

1. Publique o código que envia imagens com o prefixo `user.id/`. A política nova
   exige esse caminho nos uploads. Imagens existentes continuam com suas URLs.
2. Confira também os outros clientes, inclusive o projeto mobile: a migration
   remove acesso direto a `products`, `stock_movements` e `transactions` e escrita
   direta em `users` e `tenants`. Esses acessos devem usar RPCs autorizadas.
   A assinatura antiga de estoque com tenant e saldo final é bloqueada.
3. Execute `migrations/0023_security_hardening.sql` no SQL Editor do ambiente
   conferido. O script usa uma transação e falha se helpers necessários faltarem.
4. Execute `diagnostics/verify_security_hardening.sql`: todas as linhas devem
   mostrar `passed = true`. Depois confira login, cadastro, convites, produtos,
   estoque, financeiro e imagens com usuários de permissões diferentes.

As RPCs de produtos passam a ocultar custo sem `products.view_cost`, e as mutations
exigem permissões no banco. Conta desativada não recebe tenant ativo. Membros não
podem conceder permissões que não possuem. Novas funções públicas criadas pelo
papel `postgres` exigem `GRANT EXECUTE` explícito; a consulta pública de convite
continua disponível para `anon`. O bucket de imagens mantém sua leitura pública.

Não reexecute migrations antigas depois de `0023`: elas reintroduzem funções e
políticas vulneráveis. Correções futuras devem usar migrations incrementais.

## Conferir o ambiente existente

Execute `diagnostics/schema_inventory.sql` no SQL Editor do projeto Supabase
correto. O script lê catálogos de funções, triggers, políticas e privilégios;
não altera objetos nem consulta registros dos usuários ou dados de negócio.

Compare o resultado com as chamadas em `src/app` e `src/lib/supabase`. Existência
de uma função não comprova compatibilidade de assinatura ou autorização correta.
O inventário não substitui um backup completo do schema.

Após obter o schema real, recupere o histórico ausente e prepare migrations
incrementais para diferenças confirmadas. Valide a reconstrução em desenvolvimento
e os acessos de proprietário, membro e conta desativada antes de aplicar mudanças
no ambiente em uso. Não reexecute migrations antigas para tentar completar o
histórico de um banco já configurado.

## Dados de exemplo

`seed.sql` seleciona o primeiro usuário de `public.users` e insere produtos e
lançamentos na empresa dele. Não cria empresa nem usuário, não tem garantia de
reexecução e é destinado apenas a desenvolvimento. Confira o tenant antes de usar.
