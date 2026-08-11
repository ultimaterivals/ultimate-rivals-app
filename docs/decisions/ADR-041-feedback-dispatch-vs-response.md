# ADR-041 — Disparo de feedback e resposta são estados diferentes

## Decisão

O fechamento do Pós-Sessão 360 depende de abrir um canal real de feedback para cada atleta presente, não de obter resposta de todos.

Atletas com conta vinculada recebem a solicitação no próprio portal. Para os demais, o operador registra o canal e a evidência do disparo.

## Respostas tardias

Uma resposta pode chegar depois do fechamento 360 e continua sendo aceita. O fechamento congela somente as decisões operacionais de disparo e dispensa. Isso evita transformar a ausência de resposta do atleta em pendência artificial da operação.

## Métrica

O sistema mantém separadas:

- `average_recommendation_score`: média da pergunta 0–10 usada pela operação UR;
- `standard_nps_score`: cálculo padrão de NPS por promotores, passivos e detratores.

Essa separação preserva a fonte operacional histórica e elimina ambiguidade analítica.
