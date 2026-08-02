# Regras de pontuação

`ranking_rules` versiona valores por temporada opcional, contexto, intervalo de vigência e versão. Cada transação congela `rule_id`, `rule_version` e `points_applied`.

Regras UR Play v1 ativas: participação +8, vitória +6, derrota +2, ace +4, ataque +2, bloqueio +3, defesa +1, assistência +1 e game point +6 quando a ação final possui autor válido.

Preparadas sem geração automática: MVP +10, Fair Play +5, amarelo -5 e vermelho -20 dependem de fonte homologada. `STREAK_3`, `STREAK_5`, `COMEBACK` e `SQUAD_RESERVE_PRESENT` ficam inativas até decisão oficial sobre alvo/distribuição. O modo documentado para streak é `highest_only`; uma sequência de cinco não deve acumular o bônus de três.

Uma regra já referenciada não pode ter código, pontos, escopo, vigência ou versão alterados. Mudanças futuras exigem uma nova versão.
