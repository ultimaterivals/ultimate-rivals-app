# Motor oficial de pontuação

O motor transforma exclusivamente resultados homologados do UR Play em transações de mérito. `private.process_homologated_match` executa dentro da mesma transação da homologação, usa advisory lock por partida, valida o estado do resultado e grava um `ranking_processing_run`.

## Pipeline

1. Calcula um fingerprint determinístico de resultado, participantes, rallies e ações efetivas.
2. Retorna um processamento concluído com zero transações quando a entrada não mudou.
3. Em correções, cria reversals das transações ativas anteriores.
4. Resolve a versão de cada regra pela temporada, contexto e data do evento.
5. Gera participação, vitória/derrota, ações técnicas e game point com autor identificado.
6. Conclui o run somente depois de todas as escritas; qualquer erro causa rollback integral.

A homologação dispara o motor automaticamente. `public.process_homologated_match` é a operação idempotente de recuperação disponível para admin e coordinator autorizado no escopo da sessão.

Streaks e comeback permanecem preparados, mas desativados: são méritos coletivos cuja distribuição ainda não foi homologada.
