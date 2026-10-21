# Estado do banco de dados

## Ordens de serviço locais (0027 — ainda não aplicada)

`migrations/0027_service_orders.sql` é uma proposta **local**, ainda não
executada no Supabase. Cria OS, etapas atribuídas, dependência da etapa anterior,
pendências e eventos; adiciona
`os.view`, `os.create`, `os.manage`, `os.execute`, `os.resolve` e `os.complete`.
Somente o responsável principal pode concluir uma OS, após todas as etapas e
pendências estarem resolvidas. Tabelas têm RLS forçada e nenhum acesso direto
do cliente; as RPCs verificam permissão e empresa. `npm run test:security`
executa a migration e as transições em PostgreSQL em memória, preservando os
testes dos módulos antigos.

Este é o primeiro incremento: **não** inclui ainda modelos configuráveis,
dependências arbitrárias entre etapas, transferência do principal, cancelamento,
reabertura ou vínculo de material consumido com estoque. `location_label` é texto
de referência, não um identificador estruturado para relatório por bloco.
Antes de publicar a aplicação, aplicar e verificar a migration no ambiente
correto: contas proprietárias passam a receber `os.view` pelo modelo atual e o
dashboard novo chama `get_service_order_dashboard`. Publicar o código antes
da migration faria o dashboard falhar para essas contas. Não aplicar em produção
sem revisão e autorização da equipe.
Após aplicação autorizada, executar `diagnostics/verify_service_orders.sql`;
todas as linhas precisam retornar `passed = true` antes de publicar o código.

`migrations/0028_service_order_priority.sql` atualiza apenas as duas RPCs de
listagem/resumo criadas em 0027. Ela inclui OS concluídas no resumo, prioriza
pendências de material/compra e preserva as OS já registradas. Aplicar após
0027 e antes da interface que espera `id`, motivo e tipo de pendência no cartão
do dashboard. Não substituir a 0027 já executada por uma versão editada.

## Empréstimos de exemplares (0025)

`migrations/0025_item_loans.sql` cria exemplares devolvíveis e histórico de
entrega/devolução, sem usar `stock_movements`. Aplique uma única vez, após 0023 e
0024, no SQL Editor do ambiente conferido. A migration é aditiva e deve entrar
**antes** do código da aplicação: o dashboard chama a RPC nova para contas com
`loans.view`.

Permissões: `loans.view`, `loans.manage`, `loans.lend` e `loans.return`.
Proprietários as recebem pelo modelo atual; membros só por atribuição explícita.
As tabelas têm RLS forçada e nenhum acesso direto para `authenticated`; as RPCs
exigem permissão e restringem todas as operações à empresa ativa. Uma chave
única parcial impede dois empréstimos abertos do mesmo exemplar, inclusive em
solicitações simultâneas. Inativar um exemplar impede novas entregas e preserva
o histórico e a eventual entrega ainda em aberto.

`npm run test:security` executa a migration em PGlite isolado, sem conexão com a
produção. O futuro teste integrado deve usar uma empresa exclusiva de
desenvolvimento e contas de teste, sem dados operacionais ou credenciais reais
nas fixtures. Validar leitura, cadastro, entrega, devolução, negações e isolamento
entre empresas antes de liberar acesso aos usuários do condomínio.

## Relatórios de gestão (0024)

`migrations/0026_report_current_stock.sql` acrescenta uma RPC de leitura para
exibir o estoque **atual** do produto selecionado, sempre restrita à empresa e à
permissão `stock.view`. Aplique depois de 0024 e antes de publicar a interface
que exibe o novo indicador. “Diferença no período” é entradas menos retiradas
filtradas; não representa necessariamente o estoque restante, pois pode haver
saldo anterior, ajustes ou movimentações fora do intervalo. O saldo atual é
mostrado separadamente e não corresponde obrigatoriamente à data final filtrada.

`migrations/0024_management_reports.sql` acrescenta três RPCs de leitura:
`list_report_products`, `get_stock_report` e `get_financial_report`. Execute após
`0023`, primeiro em ambiente de teste e depois no projeto conferido, somente
após publicar a aplicação compatível. O script cria índices e não modifica dados
existentes. Reexecutá-lo mantém as funções e privilégios esperados.

As RPCs exigem, respectivamente, `stock.view`, `stock.view` e `finance.view`;
sempre filtram pela empresa ativa. A consulta financeira usa lançamentos com
status `PAID` e `paid_at` no período. A consulta de estoque usa data de
movimentação no fuso de São Paulo. `ADJUST` é novo saldo absoluto, então o
relatório conta ajustes, sem somar sua quantidade como perda ou consumo.

O primeiro relatório não calcula custo de consumo ou gasto por bloco: os dados
históricos não têm destino vinculado nem custo de saída confiável. Não atribua
blocos ou perdas a partir de observações livres. Os testes locais incluem
isolamento entre empresas, rejeição de usuários sem permissão e períodos inválidos.

Após aplicar, confira `/reports` com contas que possuam só `stock.view`, só
`finance.view` e ambas; compare os totais de um período pequeno com os registros
originais. Uma conta sem essas permissões não deve acessar o relatório.

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
