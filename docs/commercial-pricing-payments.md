# Preços, pacotes e pagamentos manuais

A camada comercial da Temporada 1 é configurável e não integra gateway externo.

- `products`: UR Play avulso, pacotes, desenvolvimento/Hunter e inscrição de torneio Q1.
- `pricing_rules`: preço-base configurável, incluindo UR Play R$25 e torneios Q1 R$100/R$90/R$85 como regra editável.
- `packages`: Pack 4, Pack 8, UR Play + Desenvolvimento e Jornada UR/Hunter.
- `charges`: cobranças manuais com snapshot de preço.
- `payments`: tentativas/verificações manuais sem armazenar dados sensíveis.

Status de cobrança: `pending`, `submitted`, `verified`, `waived`, `refunded`, `cancelled`.

O atleta vê apenas seus itens em `/athlete/billing`. Admin/operator usam `/admin/payments` para visão operacional.
