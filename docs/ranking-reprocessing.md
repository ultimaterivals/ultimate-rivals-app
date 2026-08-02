# Reprocessamento e reversals

O botão **Reprocessar pontuação** chama a mesma função atômica usada pela homologação.

- Entrada idêntica: run concluído, `transaction_count = 0`, nenhuma duplicação.
- Resultado corrigido: reversals das transações ativas, depois nova geração com a versão efetiva das regras.
- Partida void: reversals de todas as transações ativas; nada é apagado.
- Falha em qualquer etapa: homologação/processamento inteiro é revertido pela transação PostgreSQL.

O advisory lock transacional serializa processamentos concorrentes da mesma partida. `ranking_processing_runs` preserva fingerprint, ator, horários, contagem, erro e metadados de reversão.
