# Matchmaking operacional

A sugestão é determinística e não cria partida. Ordena por: menos jogos, maior tempo desde o último jogo, maior espera e identificador estável; depois alterna os selecionados entre os lados. Nível serve apenas para compatibilidade e não existe ranking de habilidade.

O operador revisa e confirma. Repetição de parceiros/adversários e descanso curto são warnings, enquanto presença, disponibilidade, composição, gênero, nível e exclusividade são bloqueios.

Para fours, a sugestão seleciona oito atletas ativos: 4+4 para female, male ou mixed (2F+2M por lado). Reservas nunca entram automaticamente nesses oito; são adicionadas manualmente depois da sugestão.
