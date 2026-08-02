# Domínio de partida

Uma partida possui código operacional estável, sessão, quadra, formato, categoria, nível snapshot e exatamente dois lados `A`/`B`. Duplas exigem 2+2 e quartetos 4+4. Mixed exige metade female e metade male em cada lado.

`ready_for_scoring` só é verdadeiro em `in_progress`. Completed, placar, rally e resultado ficam para a Sprint 8.

`matches.event_context` identifica a origem futura (`ur_play`, `pole_tournament`, `regional` ou `legends`) sem implementar torneios. `match_squad_members` preserva papel inicial/atual, presença e transições auditáveis; `match_participants` continua sendo a fonte dos atletas efetivamente em quadra.
