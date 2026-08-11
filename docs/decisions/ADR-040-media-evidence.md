# ADR-040 — Publicação de mídia exige evidência

## Decisão

Enquanto o Ultimate Rivals não possuir integração direta e observável com os canais de distribuição, nenhuma entrega de mídia será considerada publicada apenas por confirmação textual genérica.

O registro `published` exige canal e evidência vinculável: URL de publicação/evidência ou `media_asset` pertencente à mesma sessão.

## Consequências

- O Pós-Sessão 360 mede trabalho efetivamente comprovado.
- Stories e conteúdos efêmeros podem usar um link de evidência preservada.
- Integrações futuras poderão substituir a confirmação humana por evidência automática sem alterar a semântica do domínio.
- O anúncio da próxima oportunidade é acompanhado, mas não bloqueia o SLA de 48h do fechamento 360.
