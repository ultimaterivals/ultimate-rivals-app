# Handoff — Sprint 4

Branch: `feature/sprint-4-teams-rosters`.

Migration aditiva: `20260801211243_teams_rosters_operational_domain.sql`, homologada somente no DEV `ultimate-rivals-dev` (`jrzmqlhfkhaejvmiyxzy`). Ela adiciona identidade de equipe, responsáveis explícitos, histórico temporal de polo, diretório esportivo mínimo, validações de formações, RLS, auditoria e bucket privado `team-logos`.

Os testes remotos usam exclusivamente fixtures `[TEST]` e removem seus dados. A chave `service_role` não é usada no cliente nem para mascarar RLS.

Fora do escopo: partidas, ranking, pontuação, torneios, UR Coins, repasses e qualificação Regional/Legends.
