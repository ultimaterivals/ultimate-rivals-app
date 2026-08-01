# Modelo de domínio

Atleta possui código UR imutável, identidade esportiva, associação opcional a profile, histórico de nível, memberships e notas administrativas com visibilidade explícita.

## Princípios

Identidade, cadastro esportivo, vínculos e autorização são conceitos separados. Vínculos e níveis possuem validade temporal; registros históricos são arquivados em vez de apagados; mudanças críticas são auditadas no banco.

## Identidade e autorização

- `profiles`: extensão de `auth.users`; guarda nome, papel global e estado da conta. Não representa atleta.
- `access_assignments`: atribui, por período, papéis gerenciais a um `pole` ou `team`. Resolve de forma explícita o escopo de pole/team managers.
- `athletes`: cadastro esportivo, que pode existir sem conta; `profile_id` é opcional e único.

`profiles.role` é a fonte de verdade. `app_metadata` não decide autorização. Helpers server-side e RLS consultam o banco, evitando claims obsoletos e divergência silenciosa.

## Estrutura esportiva

- `seasons`: calendário controlado, sem regra de ranking.
- `poles`: unidade oficial regional.
- `venues`: espaço esportivo pertencente a um polo.
- `courts`: quadra pertencente a um espaço; esporte inicialmente `beach_volleyball`.
- `teams`: organização oficial vinculada a um polo primário.

## Históricos e formações

- `team_memberships`: vínculo temporal atleta–equipe por temporada, como atleta ou capitão.
- `athlete_levels`: histórico temporal de nível (`leveling`, `n3`, `n2`, `n1`).
- `competitive_categories`: catálogo expansível (`female`, `male`, `mixed`).
- `competitive_formats`: catálogo expansível (`doubles`, `fours`).
- `team_rosters`: formação de equipe por temporada, categoria, formato e nível.
- `team_roster_members`: participação temporal de atleta em formação, como titular, reserva ou capitão.
- `audit_logs`: trilha append-only com ator, entidade, antes/depois e metadados.

## Relações

`auth.users 1—0..1 profiles 1—0..1 athletes`; `poles 1—N venues 1—N courts`; `poles 1—N teams`; `athletes N—N teams` por `team_memberships`; `teams 1—N team_rosters 1—N team_roster_members`; temporadas contextualizam vínculos, níveis e formações.

## Invariantes

- Intervalos terminam depois de começar.
- Temporadas terminam depois de começar; cutoff fica dentro do período.
- Apenas um vínculo corrente compatível por atleta/temporada.
- Apenas um nível corrente por atleta/temporada.
- Atleta não pode aparecer duas vezes na mesma formação.
- Formação precisa pertencer a equipe/temporada coerentes com seus membros; validação cruzada adicional fica nos services.
- Role, nível e vínculos não são alteráveis pelo próprio atleta.
- Nenhuma tabela armazena pontuação ou ranking.
