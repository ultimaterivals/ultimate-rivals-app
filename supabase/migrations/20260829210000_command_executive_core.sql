-- C40: executive management core for the internal Command Center.
-- This migration creates approved organizational structure only. It does not
-- invent people assignments, operational results, deadlines or evidence.

create type public.command_function_criticality as enum ('critical', 'essential', 'support');
create type public.command_assignment_status as enum ('planned', 'active', 'paused', 'ended');
create type public.command_work_priority as enum ('p0', 'p1', 'p2', 'p3');
create type public.command_work_status as enum ('backlog', 'planned', 'in_progress', 'blocked', 'review', 'done', 'cancelled');
create type public.command_work_signal as enum ('green', 'yellow', 'red');

create table public.command_workstreams (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null check (char_length(trim(name)) between 2 and 100),
  purpose text not null check (char_length(trim(purpose)) between 10 and 600),
  position smallint not null unique check (position between 1 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.command_functions (
  id uuid primary key default gen_random_uuid(),
  workstream_id uuid not null references public.command_workstreams(id) on delete restrict,
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{1,49}$'),
  title text not null check (char_length(trim(title)) between 2 and 120),
  mission text not null check (char_length(trim(mission)) between 10 and 800),
  criticality public.command_function_criticality not null default 'essential',
  expected_outcomes text[] not null default '{}',
  performance_indicators text[] not null default '{}',
  decision_authority text not null check (char_length(trim(decision_authority)) between 5 and 800),
  weekly_ritual text check (weekly_ritual is null or char_length(trim(weekly_ritual)) between 5 and 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint command_functions_id_workstream_unique unique (id, workstream_id)
);

create table public.command_function_assignments (
  id uuid primary key default gen_random_uuid(),
  function_id uuid not null references public.command_functions(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  status public.command_assignment_status not null default 'planned',
  starts_at timestamptz not null,
  ends_at timestamptz,
  review_due_at date,
  allocation_percent smallint not null default 100 check (allocation_percent between 1 and 100),
  mandate text check (mandate is null or char_length(trim(mandate)) between 5 and 1000),
  assigned_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint command_function_assignments_valid_period check (ends_at is null or ends_at > starts_at),
  constraint command_function_assignments_status_period check (
    (status = 'ended' and ends_at is not null) or
    (status <> 'ended' and ends_at is null)
  )
);

create or replace function private.enforce_command_work_item_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_focus_count integer;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not (
      (old.status = 'backlog' and new.status in ('planned', 'cancelled')) or
      (old.status = 'planned' and new.status in ('backlog', 'in_progress', 'cancelled')) or
      (old.status = 'in_progress' and new.status in ('planned', 'blocked', 'review', 'cancelled')) or
      (old.status = 'blocked' and new.status in ('planned', 'in_progress', 'cancelled')) or
      (old.status = 'review' and new.status in ('in_progress', 'blocked', 'done', 'cancelled'))
    ) then
      raise exception 'invalid command work item transition: % -> %', old.status, new.status
        using errcode = '23514';
    end if;
  end if;

  if new.status = 'in_progress' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform pg_advisory_xact_lock(hashtext('command_work_items_focus_limit'));
    select count(*) into active_focus_count
    from public.command_work_items
    where status = 'in_progress' and id <> new.id;
    if active_focus_count >= 3 then
      raise exception 'command focus limit exceeded' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_command_work_item_transition() from public, anon, authenticated;

create table public.command_work_items (
  id uuid primary key default gen_random_uuid(),
  workstream_id uuid not null references public.command_workstreams(id) on delete restrict,
  function_id uuid,
  assignee_profile_id uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(trim(title)) between 3 and 180),
  description text check (description is null or char_length(trim(description)) between 3 and 4000),
  priority public.command_work_priority not null default 'p2',
  status public.command_work_status not null default 'backlog',
  signal public.command_work_signal not null default 'green',
  due_at date,
  acceptance_criteria text not null check (char_length(trim(acceptance_criteria)) between 5 and 2000),
  result_summary text check (result_summary is null or char_length(trim(result_summary)) between 3 and 4000),
  evidence_url text check (evidence_url is null or evidence_url ~ '^https://'),
  blocked_reason text check (blocked_reason is null or char_length(trim(blocked_reason)) between 3 and 1000),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint command_work_items_function_workstream_fk
    foreign key (function_id, workstream_id)
    references public.command_functions(id, workstream_id) on delete restrict,
  constraint command_work_items_blocked_reason check (
    (status = 'blocked' and blocked_reason is not null) or status <> 'blocked'
  ),
  constraint command_work_items_completion check (
    (status = 'done' and completed_at is not null and result_summary is not null) or
    (status <> 'done' and completed_at is null)
  )
);

create unique index command_function_assignments_one_current_idx
  on public.command_function_assignments(function_id)
  where status in ('planned', 'active', 'paused') and ends_at is null;

create index command_functions_workstream_idx on public.command_functions(workstream_id, active, criticality);
create index command_assignments_profile_idx on public.command_function_assignments(profile_id, status);
create index command_assignments_assigned_by_idx on public.command_function_assignments(assigned_by);
create index command_assignments_review_idx on public.command_function_assignments(review_due_at) where status = 'active';
create index command_work_items_execution_idx on public.command_work_items(status, priority, due_at);
create index command_work_items_workstream_idx on public.command_work_items(workstream_id, status);
create index command_work_items_function_idx on public.command_work_items(function_id, workstream_id);
create index command_work_items_assignee_idx on public.command_work_items(assignee_profile_id, status) where assignee_profile_id is not null;
create index command_work_items_created_by_idx on public.command_work_items(created_by);

create trigger command_workstreams_set_updated_at before update on public.command_workstreams
for each row execute function private.set_updated_at();
create trigger command_functions_set_updated_at before update on public.command_functions
for each row execute function private.set_updated_at();
create trigger command_function_assignments_set_updated_at before update on public.command_function_assignments
for each row execute function private.set_updated_at();
create trigger command_work_items_set_updated_at before update on public.command_work_items
for each row execute function private.set_updated_at();
create trigger command_work_items_validate before insert or update on public.command_work_items
for each row execute function private.enforce_command_work_item_transition();

create trigger command_workstreams_audit after insert or update or delete on public.command_workstreams
for each row execute function private.capture_audit_log();
create trigger command_functions_audit after insert or update or delete on public.command_functions
for each row execute function private.capture_audit_log();
create trigger command_function_assignments_audit after insert or update or delete on public.command_function_assignments
for each row execute function private.capture_audit_log();
create trigger command_work_items_audit after insert or update or delete on public.command_work_items
for each row execute function private.capture_audit_log();

alter table public.command_workstreams enable row level security;
alter table public.command_workstreams force row level security;
alter table public.command_functions enable row level security;
alter table public.command_functions force row level security;
alter table public.command_function_assignments enable row level security;
alter table public.command_function_assignments force row level security;
alter table public.command_work_items enable row level security;
alter table public.command_work_items force row level security;

create policy command_workstreams_admin_select on public.command_workstreams for select to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));
create policy command_workstreams_admin_insert on public.command_workstreams for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy command_workstreams_admin_update on public.command_workstreams for update to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy command_workstreams_admin_delete on public.command_workstreams for delete to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));

create policy command_functions_admin_select on public.command_functions for select to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));
create policy command_functions_admin_insert on public.command_functions for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy command_functions_admin_update on public.command_functions for update to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy command_functions_admin_delete on public.command_functions for delete to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));

create policy command_assignments_admin_select on public.command_function_assignments for select to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));
create policy command_assignments_admin_insert on public.command_function_assignments for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])) and assigned_by = (select auth.uid()));
create policy command_assignments_admin_update on public.command_function_assignments for update to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy command_assignments_admin_delete on public.command_function_assignments for delete to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));

create policy command_work_items_admin_select on public.command_work_items for select to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));
create policy command_work_items_admin_insert on public.command_work_items for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])) and created_by = (select auth.uid()));
create policy command_work_items_admin_update on public.command_work_items for update to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy command_work_items_admin_delete on public.command_work_items for delete to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));

revoke all on public.command_workstreams, public.command_functions,
  public.command_function_assignments, public.command_work_items from public, anon, authenticated;
grant select, insert, update, delete on public.command_workstreams, public.command_functions,
  public.command_function_assignments, public.command_work_items to authenticated;
grant all on public.command_workstreams, public.command_functions,
  public.command_function_assignments, public.command_work_items to service_role;

create or replace function public.admin_assign_command_function(
  target_function_id uuid,
  target_profile_id uuid,
  target_status public.command_assignment_status default 'active',
  target_allocation_percent smallint default 100,
  target_review_due_at date default null,
  target_mandate text default null
) returns public.command_function_assignments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.command_function_assignments;
  assignment_time timestamptz := clock_timestamp();
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if target_status not in ('planned', 'active', 'paused') then
    raise exception 'invalid assignment status' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = target_profile_id and status = 'active'
  ) then
    raise exception 'target profile is not active' using errcode = '23503';
  end if;

  update public.command_function_assignments
  set status = 'ended',
      ends_at = greatest(assignment_time, starts_at + interval '1 microsecond')
  where function_id = target_function_id
    and status in ('planned', 'active', 'paused')
    and ends_at is null;

  insert into public.command_function_assignments(
    function_id, profile_id, status, starts_at, review_due_at,
    allocation_percent, mandate, assigned_by
  ) values (
    target_function_id, target_profile_id, target_status, assignment_time,
    target_review_due_at, target_allocation_percent, nullif(trim(target_mandate), ''), auth.uid()
  ) returning * into result;

  return result;
end;
$$;

revoke all on function public.admin_assign_command_function(
  uuid, uuid, public.command_assignment_status, smallint, date, text
) from public, anon;
grant execute on function public.admin_assign_command_function(
  uuid, uuid, public.command_assignment_status, smallint, date, text
) to authenticated;

insert into public.command_workstreams(code, name, purpose, position) values
  ('direction', 'Direção e Estratégia', 'Define prioridades, decisões executivas, alocação de recursos e cadência de gestão.', 1),
  ('sports', 'Esportivo', 'Garante metodologia, competições, ranking e desenvolvimento esportivo coerentes.', 2),
  ('operations', 'Operações', 'Transforma calendário, quadras, pessoas e padrões em sessões executadas com qualidade.', 3),
  ('people', 'Pessoas e Cultura', 'Desenha funções, integra pessoas e sustenta desempenho, cultura e responsabilização.', 4),
  ('technology', 'Tecnologia e Dados', 'Mantém produto, segurança, dados canônicos, automações e observabilidade do ecossistema.', 5),
  ('finance', 'Financeiro', 'Protege caixa, margem, preços, repasses, premiações e disciplina econômica.', 6),
  ('commercial', 'Comercial e Parcerias', 'Converte relações com quadras, patrocinadores e parceiros em receita e entregas verificáveis.', 7),
  ('media', 'Marca, Mídia e Conteúdo', 'Constrói audiência e narrativa por meio de identidade, conteúdo e entretenimento recorrente.', 8),
  ('community', 'Comunidade e Experiência', 'Eleva aquisição, relacionamento, retenção e experiência dos atletas e da comunidade.', 9),
  ('governance', 'Governança e Jurídico', 'Controla riscos, contratos, políticas, auditoria e conformidade das decisões.', 10);

insert into public.command_functions(
  workstream_id, code, title, mission, criticality, expected_outcomes,
  performance_indicators, decision_authority, weekly_ritual
)
select workstream.id, seed.code, seed.title, seed.mission,
  seed.criticality::public.command_function_criticality, seed.outcomes, seed.indicators,
  seed.authority, seed.ritual
from (values
  ('direction','founder-ceo','Fundador e CEO','Conduzir visão, foco, capital e decisões irreversíveis do Ultimate Rivals.','critical',array['Prioridades claras','Recursos concentrados','Riscos executivos tratados'],array['OKRs críticos no prazo','Decisões pendentes','Runway e receita'],'Aprova estratégia, orçamento, contratações-chave, parcerias estruturantes e go/no-go.','Revisão executiva semanal e decisão dos três focos.'),
  ('direction','chief-of-staff','Liderança de Operações Executivas','Converter estratégia em cadência, responsáveis, dependências e cobrança executiva.','critical',array['Plano único atualizado','Bloqueios removidos','Ritos cumpridos'],array['Focos simultâneos','Itens bloqueados','Entregas no prazo'],'Coordena execução transversal e escala decisões reservadas ao CEO.','Preparar pauta, registrar decisões e acompanhar compromissos.'),
  ('sports','sports-director','Direção Esportiva','Proteger metodologia, regulamentos, formatos e qualidade competitiva.','critical',array['Padrão esportivo aplicado','Calendário homologado','Regras consistentes'],array['Sessões conformes','Contestações','Evolução dos atletas'],'Homologa decisões esportivas dentro dos regulamentos aprovados.','Revisão de calendário, incidentes e evolução esportiva.'),
  ('sports','competition-coordinator','Coordenação de Competições','Planejar e executar Series, Cup, Legends e demais formatos oficiais.','essential',array['Competições prontas','Resultados homologados'],array['Inscrições','Atrasos','Incidentes por evento'],'Decide operação de competição dentro do orçamento e regulamento.','Gate semanal de prontidão competitiva.'),
  ('operations','operations-manager','Gestão de Operações','Garantir prontidão e fechamento de cada operação de quadra.','critical',array['Sessões prontas','Checklists completos','Falhas tratadas'],array['Prontidão','Pontualidade','Incidentes','Margem por sessão'],'Aloca equipe operacional e interrompe sessão sem condições mínimas.','Revisão de agenda, capacidade, riscos e pós-sessão.'),
  ('operations','court-lead','Liderança de Quadra','Executar o padrão UR no local, do setup ao fechamento com evidências.','essential',array['Experiência consistente','Dados fechados','Materiais controlados'],array['Check-in concluído','Tempo de fechamento','NPS operacional'],'Comanda a sessão presencial e aciona escalonamento de incidentes.','Briefing pré-sessão e retrospectiva pós-sessão.'),
  ('people','people-performance','Gestão de Pessoas e Performance','Definir funções, integrar colaboradores e manter desempenho e cultura mensuráveis.','critical',array['Papéis claros','Onboarding concluído','Feedback recorrente'],array['Funções descobertas','Planos ativos','Ciclos de feedback'],'Propõe estrutura, metas e ações de desenvolvimento; desligamentos exigem CEO.','Revisão de capacidade, desempenho e lacunas.'),
  ('technology','product-lead','Liderança de Produto','Traduzir prioridades do negócio em produto simples, seguro e utilizável.','critical',array['Roadmap priorizado','Fluxos validados','Adoção crescente'],array['Lead time','Erros críticos','Adoção por fluxo'],'Prioriza backlog dentro dos objetivos e invariantes aprovados.','Revisão de produto, dados e feedback dos usuários.'),
  ('technology','engineering-data','Engenharia e Dados','Entregar plataforma, integrações, segurança e dados canônicos confiáveis.','critical',array['Deploys seguros','Dados íntegros','Incidentes observáveis'],array['Falhas de build','Incidentes','Cobertura de gates','Qualidade dos dados'],'Decide implementação técnica; mudanças de regra de negócio exigem aprovação.','Revisão de saúde técnica, releases e riscos.'),
  ('finance','finance-controller','Controladoria Financeira','Assegurar caixa, orçamento, conciliação, margem e prestação de contas.','critical',array['Caixa atualizado','Custos controlados','Repasses corretos'],array['Runway','Margem','Inadimplência','Divergências'],'Controla pagamentos aprovados e bloqueia gastos fora da política.','Fechamento e previsão semanal de caixa.'),
  ('commercial','commercial-lead','Liderança Comercial','Construir pipeline e fechar acordos rentáveis e executáveis.','critical',array['Pipeline qualificado','Receita contratada','Entregas viáveis'],array['Pipeline ponderado','Conversão','Ticket','Ciclo de venda'],'Negocia dentro de preço e margem; exceções exigem CEO e Financeiro.','Revisão de pipeline, propostas, próximos passos e riscos.'),
  ('commercial','partnership-success','Sucesso de Parceiros','Garantir ativação, entrega, comprovação e renovação dos parceiros.','essential',array['Entregas comprovadas','Parceiros informados','Renovações preparadas'],array['Entregas no prazo','Satisfação','Renovação'],'Coordena ativações contratadas e escala desvios de escopo.','Revisão de calendário de entregas e evidências.'),
  ('media','brand-content-lead','Liderança de Marca e Conteúdo','Transformar o esporte em narrativa reconhecível, recorrente e distribuível.','essential',array['Calendário publicado','Identidade consistente','Conteúdo aproveitável'],array['Cadência','Alcance','Retenção','Conversão por conteúdo'],'Aprova pauta e peças dentro do manual de marca e contratos.','Revisão editorial, produção, distribuição e desempenho.'),
  ('community','growth-community','Growth e Comunidade','Atrair, converter, ativar e reter atletas e comunidade com experiência mensurável.','critical',array['Funil operável','Ativação crescente','Retenção acompanhada'],array['CAC','Conversão','Ativação','Retenção','Indicações'],'Executa campanhas e relacionamento dentro do orçamento e posicionamento.','Revisão de funil, coortes, feedback e experimentos.'),
  ('community','athlete-success','Sucesso do Atleta','Conduzir comunicação, suporte e continuidade da jornada do atleta.','essential',array['Dúvidas resolvidas','Próximos passos claros','Risco de evasão tratado'],array['Tempo de resposta','Retorno','Recorrência','Satisfação'],'Resolve casos dentro das políticas e escala exceções esportivas ou financeiras.','Revisão de casos abertos, riscos e ações de retenção.'),
  ('governance','governance-legal','Governança e Jurídico','Reduzir exposição por contratos, políticas, consentimentos e trilhas auditáveis.','essential',array['Contratos controlados','Políticas vigentes','Riscos registrados'],array['Pendências críticas','Documentos vencidos','Exceções abertas'],'Pode bloquear operação sem cobertura jurídica ou de segurança mínima.','Revisão de contratos, riscos, incidentes e vencimentos.')
) as seed(workstream_code, code, title, mission, criticality, outcomes, indicators, authority, ritual)
join public.command_workstreams workstream on workstream.code = seed.workstream_code;
