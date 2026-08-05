# Midia e video

A fundacao de midia da Temporada 1 guarda metadados no banco e arquivos fora do PostgreSQL.

## Entidades

- `media_assets`: master, proxy, highlight, foto, entrevista e sponsor asset.
- `match_media_links`: vinculo entre partida e asset.
- `video_annotations`: marcacoes manuais por tempo.
- `highlight_clips`: highlights revisaveis/publicaveis.
- `analysis_suggestions`: readiness para sugestoes manuais ou futuras sugestoes de IA.

## Storage

Nao armazenar video binario em PostgreSQL. O banco guarda `storage_bucket`, `storage_path` ou `external_url`.

Padrao recomendado de path futuro:

`season/<pole>/<YYYY-MM-DD>/<session>/<match-id>/`

Nao incluir PII desnecessaria em nome de arquivo ou path.

## Seguranca

- Assets `private_source` ficam restritos a admin/operator e ao atleta dono quando aplicavel.
- Assets `publishable` ou `public` podem ser lidos por usuarios autenticados.
- Anon nao recebe acesso a tabelas privadas de midia.
- `analysis_suggestions` nao alimentam ranking sem revisao, aprovacao e fluxo de homologacao proprio.
