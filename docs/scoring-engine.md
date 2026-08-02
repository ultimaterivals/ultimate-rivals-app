# Scoring engine

O placar oficial é uma projeção de `match_rally_effective`, nunca um campo livre. Cada partida recebe `match_scoring_rules`; no UR Play MVP a regra é rally point, jogo único, 11 pontos, `win_by = 1` e sem teto adicional.

`record_match_rally` trava a partida, valida papel e sessão, exige sequência lógica e `client_operation_id`, insere um único rally e reconstrói o placar. Ao chegar a 11, cria resultado provisório, grava vencedor e snapshot final consistentes, identifica o game point, libera a fila e move a partida para `pending_review`.

A mutation retorna rally e scoreboard canônicos. A UI pode antecipar visualmente um ponto, mas sempre reconcilia com essa resposta e com a projeção do banco.

Não há ranking, pontos de ranking, UR Coins ou torneios neste módulo.
