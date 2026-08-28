# Athlete App — Release Checklist

- **Status do documento:** checklist oficial de gates
- **Data-base:** 2026-08-28
- **Escopo:** Ultimate Rivals Athlete App
- **Repositório:** `ultimaterivals/ultimate-rivals-app`

## Finalidade

Este checklist registra os gates obrigatórios de release do Athlete App. Ele não autoriza deploy, alteração de dados, mudança de secrets, bypass de RLS nem correção direta de ledger. Cada gate precisa ser decidido para um SHA candidato específico e sustentado por evidência verificável.

O checklist preserva os contratos aprovados: Production só pode ser alterada na fase explicitamente autorizada; mudanças de banco são forward-only e auditáveis; Ranking Points e UR Coins permanecem separados; Preview é somente leitura; dados ausentes não podem ser transformados em números, badges, scores, recomendações ou progressão fictícia.

## Estados permitidos

| Estado          | Significado                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------- |
| `PENDENTE`      | Gate ainda não executado ou sem evidência suficiente para decisão.                          |
| `EM VALIDAÇÃO`  | Execução iniciada; a evidência final ainda não foi consolidada.                             |
| `APROVADO`      | Critério atendido para o SHA candidato indicado, com evidência vinculada.                   |
| `REPROVADO`     | Critério não atendido; o release não pode avançar enquanto o resultado permanecer assim.    |
| `BLOQUEADO`     | Avaliação impedida por dependência, ambiente, acesso ou decisão externa registrada.         |
| `NÃO APLICÁVEL` | Uso excepcional, com justificativa e evidência; não equivale a ignorar um gate obrigatório. |

## Regras de preenchimento

1. Todo `APROVADO`, `REPROVADO`, `BLOQUEADO` ou `NÃO APLICÁVEL` deve conter evidência, responsável e data.
2. Todo `APROVADO` deve registrar o SHA efetivamente validado. Se o SHA mudar, os gates impactados voltam para `PENDENTE`.
3. Evidência pode ser um workflow, relatório de UAT, consulta auditável, runbook aprovado, deployment, log, issue ou PR, conforme o gate.
4. `NÃO APLICÁVEL` exige justificativa explícita e aprovação de release; não deve ser usado para contornar validação.
5. Um resultado verde de branch ou de `main` não é transferido implicitamente para outro SHA.

## Gates de release

| Gate             | Critério mínimo para aprovação                                                                                           | Status     | Evidência | Owner     | Data | SHA |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- | --------- | --------- | ---- | --- |
| Product UX       | Jornada esportiva, hierarquia, navegação e estados de dados aderem ao Documento Mestre, sem aparência de portal admin.   | `PENDENTE` | —         | A definir | —    | —   |
| Mobile UAT       | Jornada principal validada em viewport/dispositivo mobile, incluindo os cinco destinos aprovados e estados críticos.     | `PENDENTE` | —         | A definir | —    | —   |
| Desktop UAT      | Adaptação desktop validada sem comandar ou descaracterizar a experiência mobile-first.                                   | `PENDENTE` | —         | A definir | —    | —   |
| Preview          | Preview administrativo comprovadamente somente leitura, sem impersonation e sem bypass de RLS.                           | `PENDENTE` | —         | A definir | —    | —   |
| Auth             | Login, sessão, autorização e fluxos de primeiro acesso validados para os perfis previstos.                               | `PENDENTE` | —         | A definir | —    | —   |
| RLS              | Políticas e acessos validados sem bypass; operações privilegiadas permanecem auditáveis e estritamente autorizadas.      | `PENDENTE` | —         | A definir | —    | —   |
| Migrations       | Inventário reconciliado e qualquer mudança necessária versionada, forward-only, revisada e testada.                      | `PENDENTE` | —         | A definir | —    | —   |
| Ranking          | Ranking individual e de formações usa fonte oficial, regras vigentes e ledger de Ranking Points, sem dados fabricados.   | `PENDENTE` | —         | A definir | —    | —   |
| Historical       | Histórico homologado aparece na carreira; datas desconhecidas permanecem desconhecidas e impactos seguem contratos.      | `PENDENTE` | —         | A definir | —    | —   |
| Teams            | Equipes, vínculos temporais, capacidade real e contribuição são validados sem associação implícita.                      | `PENDENTE` | —         | A definir | —    | —   |
| Doubles          | Duplas são tratadas como formações nativas e temporais, vinculadas à temporada/ciclo correto.                            | `PENDENTE` | —         | A definir | —    | —   |
| Quartets         | Quartetos são tratados como formações nativas e temporais, vinculadas à temporada/ciclo correto.                         | `PENDENTE` | —         | A definir | —    | —   |
| Hunter           | Hunter é opt-in, funciona como Escola de Desenvolvimento UR e permanece separado da Evolução esportiva comum.            | `PENDENTE` | —         | A definir | —    | —   |
| Wallet           | Saldo e extrato são derivados do ledger real de UR Coins, separados de Ranking Points e sem fallback enganoso.           | `PENDENTE` | —         | A definir | —    | —   |
| Market           | Ofertas vigentes e resgates reais são validados, com operação atômica, auditável e bloqueada no Preview.                 | `PENDENTE` | —         | A definir | —    | —   |
| Feedback         | Coleta, dispatch, resposta e privacidade de feedback seguem os contratos vigentes e possuem evidência operacional.       | `PENDENTE` | —         | A definir | —    | —   |
| Season           | Temporada, ciclo, fase, elegibilidade e classificação vêm de dados reais e vigentes, sem fallback apresentado como fato. | `PENDENTE` | —         | A definir | —    | —   |
| Quality          | Workflow `Quality` está verde no SHA candidato e seus checks obrigatórios são identificáveis.                            | `PENDENTE` | —         | A definir | —    | —   |
| Isolated QA      | Suite `Isolated QA` está verde no SHA candidato quando o escopo funcional/contratual exigir sua execução.                | `PENDENTE` | —         | A definir | —    | —   |
| Production Audit | Estado real de Production, versões, migrations, integrações e riscos foi auditado antes da autorização de deploy.        | `PENDENTE` | —         | A definir | —    | —   |
| Backup           | Evidência de backup aplicável ao release foi verificada conforme o runbook aprovado.                                     | `PENDENTE` | —         | A definir | —    | —   |
| Rollback         | Estratégia e critérios de rollback do aplicativo e de recuperação forward-only do banco estão aprovados e acessíveis.    | `PENDENTE` | —         | A definir | —    | —   |
| Smoke            | Smoke test pós-deploy cobre rotas e fluxos críticos no ambiente autorizado e produz evidência vinculada ao SHA.          | `PENDENTE` | —         | A definir | —    | —   |
| P0               | Não há divergência P0 aberta para o release candidato.                                                                   | `PENDENTE` | —         | A definir | —    | —   |
| P1               | Toda divergência P1 foi resolvida ou possui decisão explícita e aceita para o release.                                   | `PENDENTE` | —         | A definir | —    | —   |
| SHA              | O SHA candidato é imutável, está identificado e coincide com o artefato aprovado e o deployment auditado.                | `PENDENTE` | —         | A definir | —    | —   |

## Launch gate

O lançamento só pode receber decisão favorável quando:

- todos os gates aplicáveis estiverem `APROVADO` para o mesmo SHA candidato;
- qualquer `NÃO APLICÁVEL` estiver justificado e aceito formalmente;
- não houver P0 aberto;
- os P1 tiverem resolução ou decisão de aceite registrada;
- `Quality`, `Production Audit`, `Backup`, `Rollback`, `Smoke` e `SHA` estiverem aprovados;
- evidências de UAT mobile e desktop estiverem vinculadas ao candidato;
- o artefato aprovado e o deployment auditado corresponderem ao SHA registrado.

`P18 — Launch Gate V1` consolida a decisão final. A aprovação deste documento, isoladamente, não executa nem autoriza deploy.

## Rollback e recuperação

Este checklist define o gate, não inventa comandos ou um runbook de ambiente. Em `P17 — Auditoria Production + Deploy` e `P18 — Launch Gate V1`, a evidência deve apontar para o runbook operacional aprovado, contendo ao menos responsável, gatilhos, versão conhecida estável, validação posterior e comunicação.

O rollback da aplicação deve referenciar um SHA conhecido e aprovado. Alterações de banco não devem depender de migration destrutiva ou reversão informal: a recuperação deve respeitar o princípio forward-only e usar migration, RPC ou serviço auditável conforme o caso. Correções de ranking, UR Coins, resultados, elegibilidade, equipe ou repasse não podem ser feitas por direct write corretivo.

## Aplicabilidade ao P00

`P00 — Bootstrap documental e baseline` altera apenas documentação. Para este prompt:

- `format` documental é obrigatório;
- `lint` só é aplicável localmente se a configuração do repositório validar Markdown/docs;
- `Isolated QA` não é requerido porque nenhum contrato funcional ou código foi alterado;
- Mobile UAT, Desktop UAT e deploy não são requeridos;
- Production permanece sem mutação.

Essas dispensas do P00 não aprovam antecipadamente os gates correspondentes do release final.
