# Sprint C1 — Command Center com dados reais

## Objetivo

Substituir os estados de demonstração da Home administrativa por leituras reais do Supabase, sem realizar qualquer escrita no banco.

## Fontes reutilizadas

- `seasons`;
- `season_executive_report_summary`;
- `admin_calendar_operations`;
- `admin_demand_dashboard`;
- `admin_athlete_engagement`;
- `admin_acquisition_dashboard`;
- `admin_payment_operations`;
- `admin_prize_repass_operations`.

Nenhuma nova entidade foi criada para o Command Center.

## Arquitetura

- contratos em `features/admin-command`;
- leitura em `server/repositories/admin-command-repository.ts`;
- derivação de métricas, alertas e ações em `server/services/admin-command-service.ts`;
- componentes React apenas recebem o snapshot pronto;
- `/admin` não consulta Supabase diretamente.

## Comportamento sem dados

A base de produção ainda pode não possuir temporada ou operações. Nesse caso, a interface mostra zeros somente para fontes que responderam com sucesso e usa `—` quando a métrica depende de um registro inexistente, como receita sem temporada.

A ausência de temporada gera uma ação real de configuração, e não um dado simulado.

## Falhas parciais

Se uma view não puder ser lida, o Command continua renderizando as outras fontes e lista a falha em `Saúde das fontes`. Isso evita transformar uma indisponibilidade parcial em tela totalmente quebrada.

## Escritas

A C1 é estritamente read-only. Não há migration, DDL, insert, update, delete ou RPC nova.
