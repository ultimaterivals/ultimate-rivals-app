# Sprint C0 — Fundação do Command Center

## Objetivo

Transformar o portal `/admin` da fundação técnica em uma central administrativa navegável e protegida por módulo, sem alterar o banco e sem apresentar dados operacionais fictícios.

## Entregue

- configuração central dos módulos administrativos;
- matriz de acesso por papel;
- autorização server-side por módulo;
- navegação agrupada em Comando, Esportivo, Negócio e Gestão;
- navegação desktop e mobile;
- estado de rota ativa;
- Home `Command Center` estruturada para a C1;
- rotas de Agenda, Atletas, Equipes, UR Play, Competições, Financeiro, Ecossistema, Comercial e Inteligência;
- placeholders contextuais honestos;
- testes de matriz de acesso e navegação.

## Matriz C0

- `admin`: todos os módulos;
- `operator`: Comando, Agenda, Atletas, UR Play, Competições;
- `pole_manager`: Comando, Agenda, Atletas, Equipes, UR Play, Competições, Inteligência;
- `team_manager`: Comando, Atletas, Equipes, Competições;
- `athlete` e `public`: nenhum módulo administrativo.

A restrição por polo/equipe permanece para sprint posterior, utilizando a infraestrutura de `access_assignments`. A C0 não simula escopos ainda não conectados ao aplicativo.

## Banco

Nenhuma migration, DDL, RLS, seed ou escrita no Supabase faz parte desta sprint.

## Próxima sprint

A C1 deve substituir os estados `Aguardando integração C1` por um snapshot executivo alimentado por dados reais, reutilizando views administrativas existentes antes de propor novas entidades.
