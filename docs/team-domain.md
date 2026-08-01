# Domínio de equipes

`teams` representa o clube esportivo e mantém identidade, escudo, status e o polo atual de conveniência. `team_manager_assignments` é a fonte explícita dos responsáveis (`owner`, `manager`, `assistant`). `team_memberships` continua sendo a fonte histórica do vínculo atleta-equipe por temporada; encerrar um vínculo preenche `ends_at` e muda o status, nunca apaga o passado.

Gestores acessam somente a equipe atribuída. O diretório `athlete_public_profiles` projeta apenas código, nome público e avatar, sem emergência, contato privado ou notas internas.

Portais: admin em `/admin/teams`, gestor em `/team` e atleta em `/athlete/profile`. Não existem colunas ou rotinas de pontos, ranking, UR Coins ou classificação neste domínio.
