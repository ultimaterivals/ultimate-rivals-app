# Rankings de equipes e polos

Equipe e polo são creditados pelos snapshots congelados em cada transação. Equipe atual do atleta e local físico da partida não reatribuem mérito histórico. Um atleta de Betim jogando em Belo Horizonte continua contribuindo ao polo snapshot de Betim.

Todas as contribuições válidas contam; não há corte por tamanho de elenco. Jogos e vitórias coletivos são deduplicados por partida, enquanto pontos somam contribuições líquidas. Reversões cancelam mérito anterior.

`ranking_contributions` oferece decomposição por atleta sob RLS. Admin/operator veem tudo, gestor de equipe vê sua equipe, gestor de polo vê seu polo e atleta vê as próprias contribuições. A tabela não é pública.

Formações oficiais seguem `roster_id`. Reservas não recebem estatística individual sem participação, mas o resultado pode contribuir para o mesmo quarteto oficial.
