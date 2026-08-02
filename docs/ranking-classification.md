# Classificações oficiais

O ranking trimestral é uma projeção do `ranking_transactions` homologado. Nenhum ponto é editado ou duplicado na classificação. `ranking_entries` contém somente dados esportivos sanitizados e é refeita ao concluir um processamento do ledger ou por publicação/snapshot administrativo.

O ranking geral serve para pesquisa e contexto. A posição competitiva oficial é separada em N1, N2 e N3. Atletas em `leveling` preservam pontos e histórico, mas recebem `current_position = null`.

Quando o nível muda, os pontos continuam com o atleta. A posição corrente usa o nível vigente; snapshots anteriores preservam nível, posição e pontuação sem reescrever história.

O recorte mensal usa `season_cycle_id`; o trimestre usa `cycle_id = null` e não é zerado entre ciclos. Temporadas não são somadas nesta sprint.

Projeções: `individual_ranking`, `team_rankings`, `pole_rankings`, `doubles_rankings`, `fours_rankings`, `formation_rankings`, `leveling_ranking_history` e `public_rankings`.

Duplas e quartetos só entram quando `roster_id` identifica formação oficial. Um lado temporário não cria formação competitiva.
