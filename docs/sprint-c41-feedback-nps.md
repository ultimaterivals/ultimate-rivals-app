# Sprint C41 — Feedback & NPS por Evidência

## Objetivo

Transformar a frente `feedback` do Pós-Sessão 360 em um ciclo mensurável sem exigir que o operador consiga controlar se o atleta responde.

## Elegibilidade

Todo atleta com presença real em sessão concluída (`confirmed` + `checked_in`/`present`) recebe uma solicitação.

## Disparo

- Atleta com conta vinculada: solicitação fica disponível automaticamente em `/athlete/feedback`; o sistema registra canal `app` e evidência do portal.
- Atleta sem conta vinculada: permanece pendente até operador confirmar WhatsApp, e-mail, Instagram, telefone ou outro canal com evidência.
- Dispensa é exceção administrativa e exige justificativa.

A frente `feedback` do Pós-Sessão 360 fica concluída quando não existe atleta elegível sem canal de feedback aberto. Responder não é requisito para fechar a sessão.

## Resposta

O atleta pode responder no portal com nota de 0 a 10 e comentário opcional. Operadores também podem registrar respostas recebidas por canais externos.

Respostas continuam permitidas após o fechamento 360. O fechamento congela o disparo/dispensa, não a voz do atleta.

## Métricas

- elegíveis;
- solicitações enviadas;
- respostas;
- taxa de resposta;
- Nota média UR de recomendação (0–10);
- NPS padrão (-100 a 100) exibido separadamente;
- promotores, passivos e detratores;
- sinal da meta interna UR de média acima de 8.

A separação entre Nota média UR e NPS padrão evita alterar silenciosamente a métrica histórica descrita no Playbook UR.
