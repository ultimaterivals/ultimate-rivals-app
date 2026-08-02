# Squad, reservas e escalação

O domínio separa quatro conceitos: `team_rosters` é a formação oficial; `match_squad_members` é a convocação para uma partida; `match_participants` é a escalação efetiva em quadra; presença é um estado independente. Portanto, roster não implica convocação, convocação não implica presença e presença não implica participação.

Quartetos têm exatamente quatro titulares e de zero a três reservas por lado. Reservas permanecem fora de `match_participants` até uma promoção pré-jogo. A promoção troca um titular por uma reserva presente, preserva o histórico dos dois papéis e revalida a composição mixed 2F+2M. Após `in_progress`, squad, escalação e quadra ficam congelados.

`initial_squad_role`, `squad_role`, `reserve_presence_status`, timestamps, motivo, ator e `event_context` deixam o modelo preparado para distinguir no futuro convocação, banco e participação efetiva em UR Play ou competições oficiais. Esta sprint não define pontos, multiplicadores nem transações de ranking.

Todas as mutações passam por RPCs auditadas, idempotentes e autorizadas no banco. Operadores da sessão gerenciam; evaluator e media têm leitura mínima; team manager lê seus atletas; atleta lê apenas o próprio estado; anon é negado.
