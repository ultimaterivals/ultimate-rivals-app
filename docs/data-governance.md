# Governança de dados

## Classificação e minimização

- Público controlado: nomes públicos, catálogos e entidades explicitamente publicadas em sprint futura.
- Interno: vínculos, níveis, formações e estados operacionais.
- Pessoal: nome completo, nascimento, bio e vínculo conta–atleta. O MVP não coleta CPF, RG ou credenciais.
- Segurança/auditoria: papéis, atribuições, atores, mudanças e request IDs.

## Fonte e responsabilidade

`profiles.role` é a fonte de verdade do papel global. Atribuições de escopo ficam em `access_assignments`. Apenas fluxos administrativos server-side podem alterar ambos. Atletas não podem promover papel, atribuir nível ou vínculo.

## Temporalidade e retenção

Datas usam `timestamptz` e UTC. Vínculos, níveis, rosters e atribuições mantêm início/fim. Entidades com valor histórico usam status e `archived_at`; exclusão física exige processo administrativo futuro. `audit_logs` é append-only para papéis da aplicação.

## Integridade

Enums controlam estados estáveis. Categoria e formato usam tabelas de referência para expansão sem alteração destrutiva de enum. Constraints e índices parciais garantem unicidade corrente; services validam coerência entre agregados.

## Exposição Supabase

Todas as tabelas em `public` têm RLS. Grants e RLS são tratados separadamente: `anon` não recebe acesso; `authenticated` recebe apenas privilégios necessários para que policies decidam as linhas. Ausência de policy significa negação.

## Auditoria

Triggers registram mudanças críticas. O ator vem de `auth.uid()` e não de payload do cliente. O log guarda JSON anterior/posterior, ação, entidade e metadados. UPDATE/DELETE de logs são revogados e não possuem policies.

## Limitações atuais

Política de retenção LGPD, anonimização, exportação, restauração e resposta a incidentes ainda requerem decisão organizacional. Testes reais de RLS dependem de Docker/Supabase local ou projeto de desenvolvimento.
