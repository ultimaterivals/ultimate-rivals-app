# Modelo de domínio

## Contextos identificados

- Identidade e acesso
- Atletas, equipes e polos
- Quadras e sessões UR Play
- Check-in e montagem de jogos
- Partidas, resultados, ações e homologação
- Pontuação, rankings e níveis
- UR Coins e repasses
- Auditoria

## Limite desta etapa

Somente identidade, sessão e o vocabulário de papéis são representados em código. Não há tabelas definitivas, agregados de ranking, fórmulas de pontuação ou estados de partida.

## Fluxo-alvo do MVP

Atleta → vínculo com polo/equipe → sessão UR Play → check-in → jogo → resultado/ações → homologação → pontuação → ranking → perfil.

Cada seta ainda exige especificação de autorização, invariantes, transições de estado e auditoria antes de virar schema.
