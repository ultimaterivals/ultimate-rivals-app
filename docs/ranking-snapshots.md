# Snapshots e fechamentos

`capture_ranking_snapshot()` atualiza projeções, grava uma linha por posição e registra operação auditável. Motivos: diário, semanal, fechamento de ciclo/temporada, manual, pré-evento e pós-evento. Não há snapshot por rally.

Movimento compara a posição corrente com o snapshot mais recente: `up`, `down`, `stable` ou `new`. O delta é `posição anterior - posição atual`.

`close_ranking_cycle()` captura e publica o mês sem zerar o trimestre. `close_season_ranking()` rejeita fontes pendentes/falhas, captura o resultado e fecha a temporada.

Rankings fechados bloqueiam transações retroativas comuns. `reprocess_closed_ranking_match()` exige admin e motivo auditado. Advisory locks serializam captura e fechamento em transações curtas. Automação futura pode chamar o mesmo serviço; cron externo não é requisito.
