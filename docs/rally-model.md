# Modelo de rallies

`match_rallies` é append-only e guarda ordem lógica, lado vencedor, timestamps cliente/servidor, autor e chave idempotente. `match_rally_corrections` guarda `reverse`, `replace_winner`, `void` e correções técnicas.

O rally original não é atualizado nem apagado. `match_rally_effective` escolhe a correção esportiva mais recente e `match_scoreboard` conta somente eventos efetivamente válidos/corrigidos. `match_game_points` aponta o rally exato do encerramento; `match_scoring_streaks` deriva sequências de três e cinco sem persistir bônus.

Uma sequência obsoleta retorna erro de domínio `P0001`, evitando retry automático de transação. Índices únicos em `(match_id, rally_number)`, `(match_id, client_sequence)` e `client_operation_id` complementam o lock da partida.
