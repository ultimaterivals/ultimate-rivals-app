# Domínio de temporadas

Uma temporada representa um trimestre competitivo e percorre somente `draft → registration → active → closing → closed → archived`. A RPC `transition_season` rejeita saltos e retornos arbitrários. Cada temporada recebe três `season_cycles` proporcionais ao período, numerados de 1 a 3, sem associação com torneios.

Datas de inscrição, operação, cutoff futuro e fechamento permanecem explícitas. Nenhum reset ou cálculo de ranking ocorre na transição.
