# Ordens de serviço no Balaio — proposta para aprovação

Estado: primeiro incremento implementado apenas no checkout local, sem migration
no Supabase, commit ou publicação. Modelos/dependências estruturadas continuam
planejados.

## Objetivo e base

Dar ao gestor visibilidade de quantas OS estão abertas, em execução, aguardando uma dependência e concluídas, com motivo e responsável. A proposta usa os áudios transcritos em `docs/CONDOMINIO_EVOLUCAO.md` e as decisões posteriores: condomínio define modelos; a OS tem responsável principal; somente ele conclui; trabalho de outro técnico e entrega externa podem bloquear; a pendência é visível à equipe autorizada. Implementar primeiro no Balaio; refinar regras antes de reproduzir no Silune.

## Navegação e telas propostas

- Dashboard: cartão compacto e expansível de OS, abaixo dos indicadores existentes, sem reorganizar os cartões atuais. Mostra contagem de abertas, em execução e aguardando, lista curta das mais urgentes, motivo resumido e link para a página de OS. Somente para `os.view`.
- `/service-orders`: cabeçalho e ação `Abrir OS` para quem tem `os.create`; a aba inicial `Prioridades` reúne as OS em ordem de atenção. As demais abas são `Aguardando` (`WAITING`), `Em andamento` (`IN_PROGRESS`), `Em aberto` (`OPEN`) e `Concluídas` (`COMPLETED`). As contagens por estado não se sobrepõem. Cada linha informa número, serviço, local, principal, prazo e motivo da espera. Filtros por busca, responsável, local e período virão após validar os dados reais.
- `/service-orders/new`: escolher modelo opcional, local, título, prioridade, responsável principal, prazo e descrição. O modelo preenche atividades, dependências e materiais previstos; o criador revisa e edita o snapshot antes de abrir.
- `/service-orders/[id]`: resumo, estado, responsável, atividades, dependências, linha do tempo e materiais. Ação principal contextual: `Iniciar`, `Registrar andamento`, `Confirmar etapa` ou `Concluir OS`, somente se a permissão e as regras permitirem. Toda espera exibe `Aguardando [o quê] · responsável [quem]`.
- `/service-orders/templates`: modelos configurados pela administração; criar, versionar/desativar. Alteração futura não muda OS já aberta.

## Fluxo de ponta a ponta

1. Administração ou líder com `os.create` abre a OS, escolhe modelo ou cria uma OS simples, define principal e local e revisa as atividades. Técnico comum não abre OS na primeira versão, salvo concessão explícita da permissão.
2. Profissionais atribuídos veem as atividades autorizadas. O principal ou líder inicia a OS. Uma atividade só pode avançar quando suas dependências obrigatórias foram satisfeitas. Cada atividade registra responsável, conclusão, data e observação.
3. Se faltar tomada, material ou ação de terceiro, o responsável registra uma pendência específica. Ela identifica quem deve agir, prazo e evidência opcional. Todos com `os.view` veem o motivo; apenas alguém autorizado confirma atendimento. O prestador externo não recebe acesso ao sistema automaticamente; um colaborador interno registra e valida sua entrega.
4. A etapa de outro técnico pode ser concluída individualmente, mas a OS segue aberta. O responsável principal testa o resultado e solicita a conclusão. O servidor verifica principal atual, atividades obrigatórias e pendências ainda abertas na mesma transação. Se houver bloqueio, mostra quais são, sem fechar.
5. A OS concluída fica somente de leitura para a equipe comum e preserva histórico. Reabertura e cancelamento exigirão regra e permissão separadas, a definir antes de implementação.

## Estados e regras

Estados persistidos propostos: `OPEN`, `IN_PROGRESS`, `WAITING`, `COMPLETED`, `CANCELLED` (cancelamento não entra na primeira entrega sem regra aprovada). `WAITING` exige uma ou mais pendências abertas; ao resolver a última, volta para `IN_PROGRESS` ou `OPEN` conforme já tenha começado. `Concluída` é terminal no fluxo inicial. O rótulo `não concluída` não é um estado separado: inclui abertas, em execução e aguardando. Prazo vencido é indicador transversal, não altera automaticamente o estado. Nenhuma etapa externa encerra a OS principal.

Dependências formam um grafo acíclico entre atividades da mesma OS. Na primeira entrega, limitar profundidade e quantidade, impedir ciclos e preservar ordem visual; não criar árvore ilimitada de OS. Uma OS guarda um snapshot do modelo. Materiais previstos não devem diminuir estoque. Uma saída de estoque para consumo requer ação explícita e, futuramente, vínculo com OS/local; o registro não conclui atividade por si só.

## Permissões propostas

`os.view`: consultar dashboard, lista e detalhes da própria empresa. `os.create`: abrir OS. `os.manage`: editar dados, atribuir e registrar pendências. `os.execute`: atualizar apenas atividades atribuídas ao usuário. `os.resolve`: confirmar atendimento de pendências. `os.complete`: solicitar conclusão, combinada obrigatoriamente com identidade do responsável principal. `os.templates`: configurar modelos. `os.cancel` e `os.reopen` ficam fora da primeira versão. O papel de técnico/líder/administração é um conjunto de permissões, não um nome de perfil embutido no SQL. Não conceder novas permissões a todos os funcionários existentes por padrão. Visibilidade de toda a equipe técnica requer concessão de `os.view`.

## Banco e segurança

Migrations incrementais sobre o schema real: `service_order_templates`, `service_order_template_steps`, `service_orders`, `service_order_steps`, `service_order_step_dependencies`, `service_order_blockers` e `service_order_events` (nomes sujeitos ao inventário de schema). Todas as linhas operacionais têm `tenant_id`, como os módulos atuais; chaves estrangeiras compostas ou validação transacional impedem referência a usuário, local, etapa ou modelo de outra empresa. Histórico de eventos é append-only para clientes. Registrar ator, instante, mudança e justificativa. Evitar exclusão física de OS.

RLS sem acesso direto de escrita para clientes; RPCs `SECURITY DEFINER` com `search_path` fixo, resolução da empresa do JWT e verificação de permissão em cada operação. RPCs de leitura também filtram empresa e permissão. Finalizar atividade, resolver pendência e concluir OS usam transações e travas apropriadas para concorrência. Índices por `(company_id, status, created_at)`, principal, prazo e FKs. Paginação por cursor/limite na lista; contagens via agregação no banco. Não usar carregamento de todas as OS no dashboard.

## Entregas em ordem

1. Inventariar schema/permissões reais e validar com a equipe as decisões abertas abaixo. Desenhar contrato de dados e migration; testar isolamento entre empresas, permissões e transições em PostgreSQL local.
2. Entregar OS simples com lista, detalhe, criação restrita, atribuição, atividades e conclusão exclusiva pelo principal. Sem modelos configuráveis neste incremento.
3. Adicionar modelos editáveis/snapshot, dependências e bloqueios por material ou prestador. Cobrir entrega parcial, dispensa e alteração de atividades com auditoria.
4. Adicionar indicadores da dashboard e relatório de OS (abertas, concluídas, bloqueadas, tempo total e tempo aguardando) com filtros. Medir por eventos; não inferir duração de estado apenas do valor atual.

O carregamento de `/reports` é uma melhoria separada: `loading.tsx` com skeleton do mesmo tamanho aproximado dos filtros, métricas e gráficos; preservar filtros durante navegação, usar texto acessível e respeitar movimento reduzido. Separar consultas pesadas em blocos/streaming só após medir latência. Testar filtro lento, erro, tela vazia e celular. A prioridade foi alterada para OS pelo usuário antes de iniciar esse trabalho.

### Estado do primeiro incremento local

A migration `0027_service_orders.sql`, a atualização de consultas `0028_service_order_priority.sql` e a interface em `/service-orders` cobrem
abertura, responsável principal, etapas atribuídas, dependência opcional da
etapa imediatamente anterior, pendências manuais, resolução, conclusão
condicionada, histórico e indicadores do dashboard. Modelos reutilizáveis e
dependências arbitrárias entre etapas ainda não existem. O
schema real usa `tenant_id`; o local é texto de referência nesta etapa. O
calendário de abertura mostra dia/mês/ano e limita a seleção à data corrente no
fuso de Brasília ou posterior. O dashboard exibe as OS sem expansão manual,
ordenando material/compra pendente, outras pendências, andamento, abertas e
concluídas. A suíte
PGlite confirma os fluxos e negações básicos. O SQL ainda não foi aplicado no
Supabase, portanto a interface não pode ser exercitada no app conectado até a
sequência de rollout ser aprovada. A maquete anterior continua conceitual e
deve ser atualizada com as quatro abas reais antes de qualquer publicação.

Cada incremento exige preview visual antes de commit, revisão do diff e aprovação explícita antes de publicar. Código e migration precisam ser compatíveis com a versão em produção; executar e verificar a migration no banco só na sequência combinada com a equipe.

## Decisões pendentes

- Quem pode transferir o principal quando ele se afasta? Sugestão: `os.manage`, com motivo e evento de auditoria; o novo principal passa a poder concluir.
- Quem pode dispensar uma atividade obrigatória? Sugestão: líder/administração, com justificativa; nunca automaticamente.
- Uma entrega externa é confirmada por quem? Sugestão: técnico atribuído ou líder; sem conta externa na primeira versão. Definir critério para entrega parcial.
- Local é obrigatório na abertura? Sugestão: sim para OS novas, depois de existir cadastro estruturado de locais. Até lá, campo textual temporário não pode ser usado para relatório por bloco confiável.
- Quem pode ver todas as OS da empresa e quem vê só as atribuídas? A maquete assume `os.view` para todas da empresa, concedida somente à equipe autorizada.
