# Court Ops

Court Ops transforma atletas presentes em fila operacional, compõe lados A/B, reserva quadra e conduz `queued → called → ready → in_progress`. A quadra é `free`, `reserved` ou `playing` por derivação das partidas da sessão; o cadastro global da quadra não é alterado.

Ausência na chamada usa `unavailable` na fila e não modifica presença global. Participantes ficam congelados após o início.
