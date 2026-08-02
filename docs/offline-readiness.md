# Preparação offline

Rallies já carregam UUID de operação, `client_sequence`, `client_recorded_at` e timestamp de servidor. Um cliente futuro deverá enviar `op1 → op2 → op3` na ordem; retry da mesma operação retorna o mesmo rally.

Dois dispositivos offline com históricos divergentes para a mesma partida não serão mesclados silenciosamente. Sequência obsoleta bloqueia o branch divergente e o encaminha a conflito/revisão humana. O banco continua sendo a autoridade; IndexedDB e sync completo permanecem fora desta sprint.

O MVP exige conexão. Mutações críticas recebem UUID e são idempotentes, preparando futura fila local. Ela deverá reenviar em ordem, resolver duplicatas pelo servidor, exibir pendências e nunca tratar cache como autoridade de autorização ou capacidade.

Criação, alteração de fila, call e start poderão ser enfileirados futuramente. Conflitos de atleta/quadra são sempre resolvidos pelo servidor; rejeições retornam à interface para recomposição manual.

Convocação, confirmação de presença, promoção de reserva e troca de quadra também carregam `operation_id`. Um replay futuro deve preservar ordem e motivo, mas jamais contornar RLS, congelamento pós-start ou exclusividade de atleta/quadra.
