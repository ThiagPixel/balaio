# Estado do banco de dados

O histórico SQL local é parcial: há migrations `0001`, `0002`, `0003`, `0020`,
`0021` e `0022`. Os arquivos `0004` a `0019` não estão presentes. A sequência
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

Essas constatações descrevem arquivos locais, não as definições instaladas no
banco remoto. Não foram criadas migrations substitutas com base em suposições.

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
