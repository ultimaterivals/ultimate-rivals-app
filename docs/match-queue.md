# Fila de partidas

Check-in/presença cria entrada `waiting`. A fila admite `assigned`, `playing`, `resting`, `unavailable` e `finished`. `current_match_id` é a trava operacional do atleta; trigger com row lock impede duas partidas concorrentes.

Jogos disputados e histórico são derivados de participantes/partidas, sem contador competitivo redundante.
