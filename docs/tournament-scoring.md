# Tournament Scoring

O Tournament Engine usa partidas melhor de 3 sets para torneios oficiais:

- set 1: 21 pontos, vence por 2;
- set 2: 21 pontos, vence por 2;
- set 3: 15 pontos, vence por 2.

Persistência reconciliada na Sprint 12:

- `match_rallies.set_number` registra o set real de cada rally;
- `match_results.set_scores` guarda o resumo oficial dos sets;
- `match_results.sets_a`, `sets_b` e `current_set` guardam o estado homologável da partida;
- `tournament_match_scoreboard` expõe placar por set com `security_invoker`;
- `tournament_results` é append-only: correções devem criar nova versão, não editar a linha oficial anterior.

Regra de GAME_POINT:

- game/set point intermediário não encerra a partida;
- apenas o rally que define o vencedor da partida pode ser tratado como `GAME_POINT` final.
