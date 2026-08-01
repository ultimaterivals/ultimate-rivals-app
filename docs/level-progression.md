# Progressão de nível

Mudanças oficiais exigem `level_change_reviews`. Promoções normais: N3→N2 e N2→N1. Rebaixamentos: N1→N2 e N2→N3. Saídas do nivelamento podem homologar N3, N2 ou N1. Saltos somente são aceitos como `correction` administrativa com justificativa obrigatória.

`approve_level_change` bloqueia a review, valida a transição e proteção, encerra o nível atual, cria o novo nível, registra proteção opcional e conclui o nivelamento na mesma transação. Qualquer falha provoca rollback.

Elegibilidade não permite `leveling` nem downgrade competitivo. N3 compete em N3 ou acima, N2 em N2/N1 e N1 somente em N1.
