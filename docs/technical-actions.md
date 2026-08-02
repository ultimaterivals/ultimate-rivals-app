# Ações técnicas

Um rally pode não ter ação técnica. Quando houver, aceita uma classificação principal: `ace`, `attack`, `block`, `defense` ou `assist`.

O atleta precisa ser participante ativo do mesmo lado que venceu o rally. Reserva no banco, atleta adversário ou pessoa fora da partida são rejeitados. A última ação efetiva é exposta por `match_technical_action_effective`; correções criam uma nova versão com motivo e referência à anterior.

Ações tardias também deixam um evento `technical_action_correction`. Não existem valores negativos, moedas ou conversão em pontuação esportiva.
