# Court Ops

Court Ops transforma atletas presentes em fila operacional, compõe lados A/B, reserva quadra e conduz `queued → called → ready → in_progress`. A quadra é `free`, `reserved` ou `playing` por derivação das partidas da sessão; o cadastro global da quadra não é alterado.

Ausência na chamada usa `unavailable` na fila e não modifica presença global. Participantes ficam congelados após o início.

Quartetos usam quatro titulares e até três reservas por lado. Convocados vivem em `match_squad_members`; somente os quatro ativos vivem em `match_participants`. Antes do start, operador pode confirmar presença, promover reserva e escolher o destino do titular. A quadra pode ser alterada apenas para outra quadra ativa e livre da mesma sessão, com unicidade protegida no banco.
