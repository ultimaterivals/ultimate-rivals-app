# Preparação offline

O MVP exige conexão. Mutações críticas recebem UUID e são idempotentes, preparando futura fila local. Ela deverá reenviar em ordem, resolver duplicatas pelo servidor, exibir pendências e nunca tratar cache como autoridade de autorização ou capacidade.
