# Sprint C9 — UR Play no Command

## Objetivo

Substituir o placeholder de UR Play por uma visão real das sessões, inscrições, check-ins, quadras, staff, escopos e capacidade.

## Regras

- confirmação e lista de espera permanecem separadas;
- ocupação usa confirmados/capacidade;
- sessões futuras alimentam capacidade operacional;
- a demanda pode existir na Agenda antes de uma sessão oficial ser criada;
- preço vem do registro da sessão, nunca de valor hardcoded na UI.

## Escritas

C9 é read-only. Reserva, cancelamento, check-in e consumo de créditos serão tratados por operações transacionais separadas.
