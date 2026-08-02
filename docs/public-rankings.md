# Rankings públicos e privacidade

As rotas `/rankings/*` leem somente `public_rankings`. `anon` não recebe acesso a `ranking_transactions`, contribuições, snapshots ou operações.

Campos públicos: nome/código esportivo, nível, equipe, polo, formato/categoria, posição, movimento, pontos e estatísticas homologadas. E-mail, telefone, nascimento, nome civil, notas e dados administrativos não fazem parte da projeção.

`/athletes/[athleteCode]` usa o mesmo contrato e envia `noindex, nofollow`. Indexação futura depende de decisão de produto.

Processamento, publicação e snapshot invalidam os caminhos relevantes. Materialized views não foram usadas porque não suportam RLS e a escala atual não justifica a complexidade.
