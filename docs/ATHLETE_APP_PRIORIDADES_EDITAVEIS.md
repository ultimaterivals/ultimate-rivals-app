# Athlete App — prioridades editáveis para conclusão

Atualizado em 2026-10-11. Este é o quadro de trabalho do PR #94. Edite as tabelas deste arquivo em qualquer editor Markdown para mudar a ordem, o responsável ou o escopo de cada entrega. O [Documento Mestre](ATHLETE_APP_MASTER.md) define o produto; o [checklist de release](ATHLETE_APP_RELEASE_CHECKLIST.md) registra os gates. Mudar uma prioridade aqui não aprova um gate nem altera uma regra de negócio.

## Como atualizar

1. Use `Agora`, `Próximo`, `Depois` ou `Pós-V1` na coluna **Prioridade**. Mova as linhas conforme a ordem desejada.
2. Use `A fazer`, `Em andamento`, `Em validação`, `Concluído` ou `Bloqueado` em **Estado**. Registre o link da evidência quando concluir.
3. Preencha **Decisão necessária** antes de implementar uma regra operacional ainda não aprovada. A decisão deve indicar responsável, data e regra objetiva; quando mudar contrato estrutural, registre ADR.
4. Atualize o checklist oficial somente depois de validar cada gate para o SHA candidato. O SHA de um PR em andamento muda a cada commit.

## Trabalho priorizado

| ID  | Prioridade | Entrega verificável                                                                                        | Estado       | Decisão necessária                                          | Evidência / próximo passo                                                                                               |
| --- | ---------- | ---------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A01 | Agora      | Wallet e Market mostram saldo URC indisponível quando a fonte falha e impedem resgate sem saldo conhecido. | Em validação | Não                                                         | Validar diff e checks deste PR.                                                                                         |
| A02 | Agora      | Revisar vínculo de formação/equipe para impedir associação de atleta sem convite e aceite.                 | A fazer      | DEC-01/02/03 somente para regras de capacidade e progressão | Auditar a RPC atual e implementar contrato seguro.                                                                      |
| A03 | Agora      | Reconciliar migrations de Development e Production antes de qualquer deploy.                               | Bloqueado    | Não                                                         | Consulta ao banco de Production terminou por timeout em 2026-10-10; repetir auditoria por acesso operacional confiável. |
| A04 | Próximo    | Completar Equipes, recrutamento, duplas e quartetos com vínculos temporais e dados reais.                  | A fazer      | DEC-01/02/03                                                | P09–P10 do plano oficial; validar dados e regras antes de exibir vagas.                                                 |
| A05 | Próximo    | Completar Central de Oportunidades, premiações e repasses com elegibilidade e valores oficiais.            | A fazer      | DEC-10                                                      | P11; não prometer benefício sem contrato vigente.                                                                       |
| A06 | Próximo    | Fechar primeiro acesso, perfil, notificações e mídia autorizada.                                           | A fazer      | DEC-09                                                      | P12; o fluxo de claim já existe, falta UAT da jornada completa.                                                         |
| A07 | Próximo    | Validar concessão real de UR Coins e resgate de ofertas reais no Market.                                   | A fazer      | DEC-07/08                                                   | P13; exige ledger, catálogo e operação homologados.                                                                     |
| A08 | Depois     | Reconciliar atletas, Auth, histórico, equipes, formações e sessões de lançamento.                          | A fazer      | Fontes de dados oficiais                                    | P14; nenhuma lacuna deve ser preenchida com dados fictícios.                                                            |
| A09 | Depois     | Executar uma sessão nativa real da publicação ao resultado e pós-sessão.                                   | A fazer      | Operação e participantes reais                              | P15; registrar evidência de cada estado.                                                                                |
| A10 | Depois     | UAT final mobile e desktop com atleta, admin-atleta e Preview.                                             | A fazer      | Definir participantes e responsáveis                        | P16; registrar defeitos P0/P1/P2 e SHA.                                                                                 |
| A11 | Depois     | Auditar Production, backup e rollback; decidir GO/NO-GO e fazer smoke após deploy autorizado.              | Bloqueado    | Responsável de release e aprovação de GO                    | P17–P18; Production não foi alterada por este PR.                                                                       |
| A12 | Pós-V1     | Expansões como push completo, feed social e LMS Hunter ampliado.                                           | A fazer      | Priorização futura                                          | Seção 43 do Documento Mestre.                                                                                           |

## Decisões que podemos editar juntos

Estas respostas são campos de trabalho, não decisões aprovadas. O opt-in Hunter já registra interesse, mas não admite o atleta automaticamente.

| ID     | Pergunta objetiva                                                                        | Resposta proposta / a preencher | Responsável | Estado |
| ------ | ---------------------------------------------------------------------------------------- | ------------------------------- | ----------- | ------ |
| DEC-05 | Quem pode entrar no Hunter, quem aprova, qual capacidade e como comunicar aceite/recusa? | A definir                       | A definir   | Aberta |
| DEC-01 | Quantas vagas oficiais existem por polo e categoria, com qual fonte de capacidade?       | A definir                       | A definir   | Aberta |
| DEC-02 | Quais critérios verificáveis movem uma equipe na trilha de profissionalização?           | A definir                       | A definir   | Aberta |
| DEC-03 | Quantas duplas e quartetos por equipe/categoria/temporada?                               | A definir                       | A definir   | Aberta |
| DEC-07 | Quais 3–5 ofertas reais compõem o catálogo inicial do Market?                            | A definir                       | A definir   | Aberta |
| DEC-08 | Quais eventos homologados concedem UR Coins e em qual valor?                             | A definir                       | A definir   | Aberta |
| DEC-09 | Quem autoriza e modera fotos públicas, com qual consentimento?                           | A definir                       | A definir   | Aberta |
| DEC-10 | Quais benefícios de parceiros estão contratados e ativos para o V1?                      | A definir                       | A definir   | Aberta |

## Evidência existente e limite atual

O SHA `9bac464` do PR #94 passou [Quality](https://github.com/ultimaterivals/ultimate-rivals-app/actions/runs/38096738983), [Isolated QA](https://github.com/ultimaterivals/ultimate-rivals-app/actions/runs/38096737061) e [Visual UAT](https://github.com/ultimaterivals/ultimate-rivals-app/actions/runs/38096737052). O preview da Vercel foi criado. Esses resultados comprovam o incremento daquele SHA; não substituem UAT com pessoas e dados reais nem valem automaticamente para commits futuros.

O lançamento continua condicionado aos gates do checklist. A prioridade acima pode mudar, mas segurança, dados reais, Preview somente leitura, RLS, separação Ranking Points/UR Coins e aprovação explícita de Production permanecem obrigatórios.
