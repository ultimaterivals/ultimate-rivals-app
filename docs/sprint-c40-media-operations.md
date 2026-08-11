# Sprint C40 — Mídia Pós-Jogo por Evidência

## Objetivo
Transformar a frente de mídia do Pós-Sessão 360 em uma operação auditável, com pauta automática, SLA e evidência real de publicação.

## Entregas obrigatórias
- Resultado / resumo final — até 4h.
- Fotos da sessão — até 24h.
- Destaques individuais — até 24h.
- Melhores momentos — até 48h.
- Ranking atualizado — até 48h.

As cinco entregas acima bloqueiam o fechamento da frente `media` no Pós-Sessão 360.

## Continuidade
- Próxima oportunidade — até 7 dias.

Essa entrega permanece visível e auditável, mas não bloqueia o fechamento de 48h do Pós-Sessão 360.

## Regra de verdade
Uma entrega só é `published` quando o operador informa o canal e registra um link de publicação/evidência ou, futuramente, vincula um `media_asset` da mesma sessão. O sistema não presume publicação em Instagram, YouTube, WhatsApp ou outros canais sem integração observável.

## Segurança e auditoria
- Leitura protegida por RLS e escopo de operação da sessão.
- Escrita somente por RPCs autorizadas.
- Dispensa somente por administrador e com justificativa.
- Toda publicação, início de produção e dispensa gera `audit_logs`.
- Após o fechamento 360, mutações de mídia são bloqueadas até reabertura administrativa.

## Interface
Nova mesa operacional em `/admin/ur-play/midia`, acessível pela navegação do UR Play.