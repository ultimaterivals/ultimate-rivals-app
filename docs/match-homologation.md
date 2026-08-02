# Homologação de partidas

Fluxo oficial: `in_progress → pending_review → completed`. O game point cria `match_results.provisional`; o operador envia para `under_review`; coordenador atribuído à sessão ou admin homologa.

`match_results` é validado contra o placar derivado. Vencedor e 11 × N inconsistentes são recusados. Cada transição relevante cria `match_result_versions` append-only.

Após homologação, somente admin abre `match_result_correction_requests` com motivo. A correção preserva a versão anterior, retorna a partida à revisão e exige nova homologação. Admin também pode marcar resultado `void`; partidas abandonadas não entram no fluxo normal.
