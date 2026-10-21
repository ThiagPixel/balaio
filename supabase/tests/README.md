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

Há também regressão de estoque para um membro com permissões já existentes:
entrada, retirada e ajuste alteram o saldo e gravam o histórico; falta de permissão,
estoque insuficiente, custo sem autorização, produto de outra empresa e conta
inativa são rejeitados. A consulta não revela custo ao membro sem `products.view_cost`.
O teste usa o mesmo identificador de usuário antes e depois da troca de permissões,
mas simula a identidade por `request.jwt.claim.sub`: **não usa nem verifica um JWT
real já emitido pelo Supabase**.

O GitHub Actions executa typecheck, lint e esta suíte em pull requests e pushes
na `main`. Rodar `npm run test:security` localmente antes de uma migration dá
feedback antes da publicação; um push direto para `main` só recebe o resultado
do Actions após o push. Para barrar merge, usar pull request e proteção da branch.

Esses testes validam o SQL e a autorização no PostgreSQL local. A validação final
do ambiente exige `diagnostics/verify_security_hardening.sql` e testes funcionais
no Supabase, incluindo cadastro, convites e upload pelo serviço Storage.
Eles não cobrem todas as páginas e Server Actions, rede, RLS/serviços reais do
Supabase, nem provam compatibilidade de um cliente antigo que continue chamando
uma RPC removida. Antes de alterar uma assinatura ou grant, inventariar os clientes
em uso e acrescentar um teste de contrato para cada RPC antiga que deve continuar.

## Integração com a empresa de QA

`npm run test:live-stock` autentica `teste2@qa.com` no projeto configurado em
`.env`. Sem `LIVE_TEST_ALLOW_WRITES=1`, verifica apenas identidade, empresa,
permissões e rejeição de acesso anônimo. Com essa variável, exige o ID exato da
empresa `Teste` antes de criar o produto `QA-AUTOMATICO-*`; registra entrada,
retirada e ajuste, confere saldo e histórico e deixa o produto desativado. O
histórico de movimentações permanece na empresa de QA para auditoria.

Informe a senha por `LIVE_TEST_PASSWORD` no ambiente ou por stdin quando o
comando pedir, sem registrá-la no repositório. Este teste **não** está no CI:
seria preciso configurar secrets e isolar um projeto de homologação. A empresa
de QA no projeto atual está isolada por tenant, mas o teste ainda usa o mesmo
serviço Supabase; executar com escrita somente quando isso for aceitável.
O proprietário de QA prova os fluxos permitidos. Para testar permissões de
membro e tokens reais com concessão/revogação, é necessária outra conta de QA
com privilégios restritos nessa empresa. O teste local cobre esses casos com
identidades simuladas, mas não substitui o ensaio via Auth real.
