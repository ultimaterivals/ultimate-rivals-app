# Ledger de pontuação

`ranking_transactions` é a fonte oficial. Atletas, equipes e polos não possuem coluna mutável de pontos.

Cada registro congela temporada/ciclo, atleta, snapshots de equipe e polo, roster/lado, partida/sessão, origem, regra e versão, pontos aplicados, contexto, homologador e run de processamento.

## Imutabilidade

UPDATE e DELETE são rejeitados por trigger, inclusive para admin via Data API. Correções e voids inserem transações `reversal` com valor oposto e `related_transaction_id`; o registro original permanece intacto. As projeções somam o ledger homologado, de modo que original + reversal resulte em zero.

A restrição por run e origem evita duplicidade dentro de uma geração, enquanto o fingerprint impede uma nova geração quando a entrada não mudou.
