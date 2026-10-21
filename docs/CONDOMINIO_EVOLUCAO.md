# Evolução do Balaio para operação de condomínio

Estado: requisitos e plano para revisão, sem implementação de banco ou interface.
Atualizado em 2026-10-21. O Balaio em uso recebe primeiro as novas funções;
o Silune comercial recebe depois um modelo refinado, sem compartilhar o banco.

## Origem e distinção entre fato e hipótese

Base: três áudios transcritos pela equipe (protocolo de materiais, OS e relatórios),
com esclarecimentos do usuário em 2026-10-21. A transcrição é insumo de requisitos;
as recomendações de implementação abaixo são propostas técnicas, não pedidos
literais do solicitante.

O Balaio atual contém produtos, movimentações IN/OUT/ADJUST, usuários, empresas,
permissões e indicadores básicos. `stock_movements` registra produto, quantidade,
tipo, data, usuário e observações. Há tabela `destinations`, mas a movimentação
não contém `destination_id`. Também não existe no código examinado um módulo de
OS, empréstimo/devolução, ranking filtrável ou relatório de consumo por local.
`list_stock_movements` é usado pela página com limite 100: não agregá-la no
browser para gerar relatório completo.

O histórico local de migrations é incompleto (`0004`–`0019` ausentes). Toda nova
migration é incremental sobre o schema real, depois de diagnóstico e teste
isolado. Não reexecutar SQL antigo para recriar o banco em produção.

## Decisões confirmadas

1. Implementar primeiro no Balaio em uso; levar experiência e regras refinadas
   depois ao Silune como produto comercial. Reusar comportamento, não copiar
   automaticamente React/Next/Supabase para SvelteKit/Go.
2. A OS principal tem um responsável principal. Só esse profissional pode
   concluir a OS. O sistema impede a conclusão enquanto houver dependência
   obrigatória aberta ou atividade principal não validada.
3. Prestadores externos participam do processo. Uma entrega de material por
   outra empresa pode bloquear uma OS; a pendência permanece visível à equipe
   autorizada até ser confirmada como atendida.
4. O condomínio configura os próprios modelos de OS, etapas e variações;
   programadores não cadastram cada padrão de serviço em código.
5. Relatórios precisam permitir recortes de tempo, produto, local e tipo de
   operação, com categorias separadas para empréstimos, OS e estoque.

## Modelo de trabalho proposto

### 1. Locais e materiais

Criar uma referência estruturada de local (ex.: bloco, andar, sala) vinculada
à empresa. Pode ser uma árvore curta de locais; não inferir bloco de texto
livre. Estudar se a tabela `destinations` existente pode ser estendida com
`parent_id` e tipo; confirmar uso real antes de alterá-la.

Saída de estoque para consumo recebe local e, opcionalmente, OS/etapa.
Manter separadas as medidas de **estoque disponível**, **material reservado**
(se esse recurso for aprovado), **material consumido** e **bem temporariamente
emprestado**. Não usar uma saída `OUT` comum para chave que será devolvida.

### 2. Protocolo de bens emprestáveis

Cada item controlado individualmente pode ter identificação própria: “Chave
banheiro, bloco 2, cópia 01”. Um empréstimo registra item, empresa, quem
registrou a entrega, quem recebeu (usuário ou pessoa externa identificada),
retirada, devolução, condição e observação. Definir política de dados pessoais
antes de coletar documento/telefone de terceiros; nome é o mínimo do exemplo.

Estados iniciais: disponível → emprestado → devolvido. Bloquear dois empréstimos
abertos do mesmo exemplar dentro da transação no banco; não confiar somente no
botão desabilitado da tela. Devolução fecha o empréstimo sem apagar o histórico.
O registro é consultável por período, item, local, recebedor e situação.

### 3. Modelos de OS e instâncias reais

O condomínio cria **modelos** (ex.: “Instalar câmera”) com atividades, ordem
visual, materiais previstos e dependências. Abrir uma OS cria um snapshot
editável do modelo: alterar o modelo no mês seguinte não reescreve OS antigas.
Uma OS pode ter um local, responsável principal, descrição, prioridade,
abertura, histórico e conclusão. Cada atividade tem responsável interno ou
referência a prestador externo, estado e prazo próprio. Definir se uma pessoa
externa ganha acesso ao sistema ou se um funcionário registra suas ações; não
conceder acesso só porque o nome consta em uma OS.

**Composição** e **dependência** são relações diferentes: “passar cabo” faz
parte da OS; “testar câmera” depende de cabo e tomada prontos. Na primeira
versão, usar uma OS com atividades e dependências explícitas entre atividades,
sem árvore ilimitada de OS aninhadas. Caso “sala nova” exija vários serviços
administrados independentemente, validar depois um agrupador/projeto acima
de várias OS.

Estados propostos de atividade: pendente, pronta, em andamento, bloqueada,
concluída, dispensada. A condição “pronta” é derivada das dependências, não
um valor manual que pode contradizê-las. Registrar conclusão real e dispensa
com autor, data e justificativa. Não marcar entrega recebida só porque passou
o prazo.

Uma dependência de material pode apontar a uma **solicitação de fornecimento**:
item, quantidade, fornecedor/prestador, solicitante, previsão, situação,
evidência de recebimento e quem confirmou. Quando o material chega, a pessoa
autorizada confirma a entrega; só então as atividades dependentes são liberadas.
Vincular a entrada real ao estoque quando houver recebimento físico, sem criar
entrada automática ao simplesmente fechar a pendência. Prestador pode ter
várias entregas parciais; a regra para quantidade suficiente deve ser definida.

Exemplo:

```text
OS instalar câmera — principal: Thiago — Bloco 2
  [pendente] Fornecedor entregar lâmpada/tomada/material necessário
       └── desbloqueia instalação elétrica — outro técnico
                └── desbloqueia teste da câmera — Thiago
                         └── Thiago valida e conclui a OS
```

Uma atividade concluída por outro técnico nunca conclui automaticamente a OS.
O backend verifica, no momento da conclusão, o ator principal, todas as
dependências obrigatórias, a etapa principal e o estado atual. Fazer a checagem
e a atualização em uma transação para evitar duas alterações concorrentes.
Reabertura, transferência do principal e substituto em férias são casos de
produto pendentes; não contornar a regra confirmada silenciosamente.

### 4. Relatórios com métricas definidas

| Categoria | Primeiras medidas e filtros | Fonte / pré-requisito |
| --- | --- | --- |
| Estoque | Entradas, saídas, ajustes, saldo no fim do período, ranking por produto e por mês | Movimentações históricas; consultar/agregar no banco, sem limite de 100 da tela |
| Consumo | Saídas por bloco, andar, sala, OS, profissional e período | Novos vínculos estruturados; histórico antigo sem local aparece “não informado” |
| Protocolo | Empréstimos abertos, atrasos quando houver prazo, retiradas e devoluções | Módulo de bens emprestáveis |
| OS | Abertas, concluídas, bloqueadas, tempo total e tempo esperando terceiros/material | Histórico de eventos e estados de OS/atividades |

Não misturar unidades distintas em um total sem conversão de unidade. Para
ranking, mostrar “quantidade de saídas por produto” e critérios de ordenação;
um produto de unidade `m` não é comparável diretamente a outro de unidade
`un`. Entrada não equivale a compra; saída não prova instalação concluída.
Registrar custo no momento da operação se relatórios de custo histórico forem
aprovados; o `cost_price` atual do produto não reconstrói o passado.

Filtros mínimos: empresa implícita pelo usuário, intervalo inclusivo/limites
claros, produto, tipo de movimentação e local quando disponível. Presets 15/30/90
dias e período personalizado; visão diária/mensal/anual com fuso da empresa.
Totais e tabela usam o mesmo filtro. Exportação vem depois de validar os
números em tela, reaproveitando exatamente a mesma consulta autorizada.
Permissões de estoque/OS/protocolo e permissão de custo são separadas.

## Sequência de entregas no Balaio

| Incremento | Entrega verificável | Dependências |
| --- | --- | --- |
| B1 | Relatório básico de estoque por período/produto/tipo, com totais e ranking; inclui ajustes separados | Diagnóstico do schema real e RPC autorizada. Não depende de locais/OS |
| B2 | Cadastro de locais e destino nas novas saídas; relatório por local para registros novos | Migração incremental e fluxo de saída atualizado |
| B3 | Protocolo de item emprestável, retirada/devolução e histórico | Novo modelo de posse, controle transacional e permissões |
| B4 | OS simples: criar, atribuir profissional principal, atividades, pendências, concluir apenas pelo principal | Modelos de usuário/externo e autorização definidos |
| B5 | Modelos editáveis pelo condomínio, dependências de atividades e pendência de fornecimento externo | B4 e regras de entrega, dispensa, transferência aprovadas |
| B6 | Relatórios de OS e protocolo, depois cruzamento com consumo real de estoque | Dados acumulados de B2–B5; métricas validadas com usuários |

B1 e B3 podem ser priorizados conforme necessidade operacional; começar a OS
sem entender modelo de responsáveis e entrega externa aumenta retrabalho.
Cada incremento inclui teste de permissão, isolamento entre empresas e
regressão de fluxos atuais. Código web, Server Action, RPC, grants e política
de acesso ao banco são uma única entrega; a interface sozinha não autoriza.
Produção recebe primeiro código compatível e depois migration/ativação
conforme plano de rollout, com checagem funcional e reversão preparada.

## Transição ao Silune

Após uso real no Balaio, registrar regras mantidas, exceções, métricas úteis
e alterações pedidas pelo condomínio. Implementar no Silune nos módulos Go
e BFF SvelteKit existentes, com banco e identidade escolhidos para esse projeto.
Não copiar dados, `.env`, SQL legado ou credenciais por padrão; eventual migração
de clientes merece plano separado. Acrescentar ao mapa
`Silune/docs/legacy/BALAIO_REFERENCE.md` as regras efetivamente validadas,
distinguindo “planejado no Balaio” de “implementado e testado”.

## Pontos que faltam definir com o solicitante

1. Quais relatórios são prioritários para o uso de hoje? B1 mostra tudo o que
   já é mensurável sem inventar destino de saídas antigas.
2. O prestador externo acessará o aplicativo ou a equipe interna confirmará
   recebimento/conclusão em nome dele? Quem valida entrega parcial?
3. Se o responsável principal sair de férias, quem pode transferir sua OS?
   Concluir por substituto exige mudança explícita do responsável principal.
4. Quem pode editar/dispensar etapas de uma OS já aberta e com qual justificativa?
5. Local é obrigatório para toda saída? Quais níveis existem de fato no
   condomínio (bloco, andar, sala ou outros)?

Até essas respostas, B1 pode ser especificado e implementado com os dados
existentes. As demais entregas mantêm suas decisões abertas de modo visível.
