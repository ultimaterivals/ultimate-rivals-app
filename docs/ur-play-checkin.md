# Check-in e presença

Check-in requer inscrição confirmada e staff atribuído. `checkin_ur_play` é idempotente. Desfazer inativa o check-in; presença admite `present`, `absent`, `no_show` e `excused`.

`walkin_ur_play` reúne inscrição e check-in na mesma transação e reverte tudo sem capacidade confirmada.
