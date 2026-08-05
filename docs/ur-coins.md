# UR Coins MVP

UR Coins sao a economia interna da experiencia Ultimate Rivals. Eles sao separados do ranking oficial: pontos de ranking continuam vindo do ranking ledger, enquanto UR Coins vivem em um ledger proprio.

## Regras Q1 ativas

- Participacao UR Play: `+4 URC`.
- Vitoria homologada: `+6 URC`.
- Derrota homologada: `0 URC`.

Nenhuma outra regra foi inventada nesta etapa. Regras futuras devem entrar por `ur_coin_rule_sets` e `ur_coin_rules`, com status `draft` ou `disabled` quando houver duvida operacional.

## Ledger e wallet

`ur_coin_transactions` e append-only. O saldo mostrado em `/athlete/wallet` vem de `ur_coin_wallet_projection`, derivado por soma de creditos e debitos.

Regras obrigatorias:

- nao existe `athlete.coins` como fonte mutavel;
- toda transacao automatica precisa de `idempotency_key`;
- homologar o mesmo earning duas vezes nao pode gerar pagamento duplicado;
- grants administrativos exigem `reason` e audit log;
- atletas veem somente a propria wallet;
- service role nao pode ser usada para mascarar falhas de RLS no client.

## Market + URC

Ofertas do Market podem aceitar BRL, URC ou os dois quando configuradas. O MVP do Market continua funcionando sem depender de UR Coins. Redemptions com URC precisam ser atomicas e nao podem permitir saldo negativo antes de virarem fluxo financeiro completo.
