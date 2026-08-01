# Modelo temporal de polo

`team_pole_assignments` é a fonte histórica do polo oficial de uma equipe. Uma exclusion constraint impede períodos ativos sobrepostos para a mesma equipe e temporada.

`teams.primary_pole_id` permanece como projeção conveniente do polo atual. A função `assign_team_pole` fecha o período anterior, cria o novo período e atualiza essa projeção na mesma transação. Mudanças não são silenciosas nem apagam história.

Essa estrutura permite que, futuramente, um evento use o polo válido no instante da partida. Nenhuma pontuação foi implementada.
