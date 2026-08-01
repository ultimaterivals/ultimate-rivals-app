# Handoff — Sprint 2

## Entregue

- 15 tabelas de domínio e 14 enums controlados.
- Categorias feminino/masculino/misto e formatos duplas/quartetos como catálogos expansíveis.
- Vínculos, níveis, atribuições de acesso e elencos temporais.
- RLS deny-by-default, grants explícitos e escopo por polo/equipe.
- Auditoria central por triggers append-only.
- Sete migrations, seed dev/test e Supabase CLI fixado.
- Sete schemas Zod, sete repositories e services autorizados.
- CRUD mínimo de atletas, equipes, polos e temporadas; perfil read-only do atleta.

## Validação disponível

TypeScript, ESLint, Vitest, build e Playwright são executáveis sem banco local. Migrations foram geradas via CLI oficial e revisadas estaticamente.

## Bloqueio de ambiente

Docker não está instalado e não há projeto Supabase remoto configurado. Portanto não foi possível executar `supabase start`, `db reset`, seed, advisors ou testes reais de RLS/auditoria. Esta limitação não deve ser interpretada como aprovação do SQL em runtime.

## Primeira ação da próxima estação com Docker

1. `npx supabase start`
2. `npx supabase db reset`
3. executar testes de RLS com usuários admin/operator/pole_manager/team_manager/athlete
4. `npx supabase db advisors`
5. `npx supabase migration list --local`

## Riscos

- Policies e triggers ainda não passaram pelo parser/runtime do Postgres.
- Fluxo de bootstrap do primeiro admin precisa ser definido fora do Data API comum.
- Exclusões temporais bloqueiam sobreposição por temporada; regras futuras de transferência exigirão desenho explícito.
- Escrita de gestores foi deliberadamente negada até homologação dos casos de uso.
