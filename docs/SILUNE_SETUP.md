# Silune — planejamento transferido para repositório próprio

Atualizado em 2026-10-19.

O Silune agora é um projeto independente em https://github.com/ThiagPixel/silune.
O plano inicial deste arquivo supunha evolução dentro do Balaio e foi substituído
após a inspeção do novo repositório. Não usar a proposta antiga de `backend/` ou
Next.js para iniciar o Silune: ele já possui `apps/api` (Go) e `apps/web` (SvelteKit).

## Fonte de verdade do novo projeto

- Plano das três tasks e decisões: [`docs/SETUP.md` no Silune](https://github.com/ThiagPixel/silune/blob/main/docs/SETUP.md).
- Regras e capacidades de origem: [`docs/legacy/BALAIO_REFERENCE.md` no Silune](https://github.com/ThiagPixel/silune/blob/main/docs/legacy/BALAIO_REFERENCE.md).

Esses arquivos foram preparados no checkout local do Silune e ainda não foram
commitados/publicados; os links remotos só existirão após essa publicação.
Checkout local desta sessão: `C:\Users\coopg\Documents\Programação\Silune`.

## Papel do Balaio

O Balaio permanece como referência histórica e funcional, na base `4c51a92`.
Seu código, banco, autenticação e deploy não foram alterados por esta separação.
A documentação do Silune registra quais arquivos do Balaio consultar por commit,
sem tratar funcionalidades antigas como já implementadas no novo produto.

Não copiar `.env`, dados, usuários, storage ou migrations para o Silune sem plano
específico. Go/Gin está confirmado pela equipe; no scaffold Silune inspecionado,
a API ainda usa `net/http`. Banco e provedor de login continuam em discussão,
embora PostgreSQL já apareça no código e na infraestrutura do novo repo.
