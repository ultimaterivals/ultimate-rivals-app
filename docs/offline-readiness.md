# Preparação offline

O MVP exige conexão. Mutações críticas recebem UUID e são idempotentes, preparando futura fila local. Ela deverá reenviar em ordem, resolver duplicatas pelo servidor, exibir pendências e nunca tratar cache como autoridade de autorização ou capacidade.

Criação, alteração de fila, call e start poderão ser enfileirados futuramente. Conflitos de atleta/quadra são sempre resolvidos pelo servidor; rejeições retornam à interface para recomposição manual.
