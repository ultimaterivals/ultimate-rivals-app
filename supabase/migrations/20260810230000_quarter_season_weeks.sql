create table if not exists public.season_weeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  week_number smallint not null check (week_number between 1 and 13),
  name text not null,
  phase text not null,
  objective text not null,
  primary_product text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned','active','closing','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint season_weeks_period_check check (ends_at > starts_at),
  constraint season_weeks_season_week_key unique (season_id, week_number)
);

create index if not exists season_weeks_season_dates_idx
  on public.season_weeks(season_id, starts_at, ends_at);

alter table public.season_weeks enable row level security;

drop policy if exists season_weeks_select on public.season_weeks;
create policy season_weeks_select
  on public.season_weeks
  for select
  to authenticated
  using (
    private.has_any_role(
      array['admin','operator','pole_manager','team_manager','athlete']::public.app_role[]
    )
  );

drop policy if exists season_weeks_admin_all on public.season_weeks;
create policy season_weeks_admin_all
  on public.season_weeks
  for all
  to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));

drop trigger if exists season_weeks_set_updated_at on public.season_weeks;
create trigger season_weeks_set_updated_at
before update on public.season_weeks
for each row execute function private.set_updated_at();

create or replace function private.admin_create_quarter_season(
  p_name text,
  p_code text,
  p_starts_on date
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid;
  v_season_id uuid;
  v_name text := trim(p_name);
  v_code text := lower(trim(p_code));
  v_start timestamptz;
  v_end timestamptz;
  v_week integer;
  v_week_name text;
  v_phase text;
  v_objective text;
  v_primary_product text;
begin
  v_actor := private.require_admin_actor();

  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'INVALID_SEASON_NAME';
  end if;
  if v_code !~ '^[a-z0-9][a-z0-9-]{1,31}$' then
    raise exception 'INVALID_SEASON_CODE';
  end if;
  if p_starts_on is null then
    raise exception 'INVALID_SEASON_START';
  end if;

  v_start := p_starts_on::timestamp at time zone 'America/Sao_Paulo';
  v_end := v_start + interval '13 weeks';

  insert into public.seasons(
    name,
    code,
    starts_at,
    ends_at,
    ranking_cutoff_at,
    status,
    registration_starts_at,
    registration_ends_at
  ) values (
    v_name,
    v_code,
    v_start,
    v_end,
    v_end,
    'draft',
    null,
    null
  )
  returning id into v_season_id;

  -- The legacy trigger creates three equal thirds. Re-map them to explicit
  -- compatibility macro-cycles while season_weeks remains the operational truth.
  update public.season_cycles
  set
    name = case cycle_number
      when 1 then 'Macro 1 · Semanas 1–4'
      when 2 then 'Macro 2 · Semanas 5–8'
      when 3 then 'Macro 3 · Semanas 9–13'
    end,
    starts_at = case cycle_number
      when 1 then v_start
      when 2 then v_start + interval '4 weeks'
      when 3 then v_start + interval '8 weeks'
    end,
    ends_at = case cycle_number
      when 1 then v_start + interval '4 weeks'
      when 2 then v_start + interval '8 weeks'
      when 3 then v_end
    end,
    status = 'planned'
  where season_id = v_season_id;

  for v_week in 1..13 loop
    v_week_name := case v_week
      when 1 then 'Entre no jogo'
      when 2 then 'Descubra seu nível'
      when 3 then 'Comece a construir'
      when 4 then 'Seu histórico começa a pesar'
      when 5 then 'Quem está subindo?'
      when 6 then 'A Series está chegando'
      when 7 then 'UR Series'
      when 8 then 'O jogo mudou'
      when 9 then 'Defenda seu polo'
      when 10 then 'UR Cup'
      when 11 then 'Quem marcou a temporada?'
      when 12 then 'UR Legends'
      when 13 then 'Entre para a história'
    end;

    v_phase := case
      when v_week between 1 and 3 then 'Entrada e descoberta'
      when v_week between 4 and 6 then 'Formação e recorrência'
      when v_week between 7 and 9 then 'Competição'
      when v_week between 10 and 12 then 'Reta final'
      else 'Virada de Ranking'
    end;

    v_objective := case v_week
      when 1 then 'Ativar a entrada, apresentar o ecossistema e gerar a primeira participação.'
      when 2 then 'Coletar dados e avançar o nivelamento dos atletas ativos.'
      when 3 then 'Consolidar histórico inicial, recorrência e formações.'
      when 4 then 'Transformar participação em histórico comparável e recorrente.'
      when 5 then 'Evidenciar evolução, subida de desempenho e corrida de ranking.'
      when 6 then 'Fechar elegibilidade, operação e narrativa para a UR Series.'
      when 7 then 'Executar a UR Series e homologar resultados, dados e mídia.'
      when 8 then 'Absorver aprendizados da Series e abrir a corrida para a Cup.'
      when 9 then 'Fortalecer polos, formações e qualificação competitiva.'
      when 10 then 'Executar a UR Cup e consolidar mérito competitivo.'
      when 11 then 'Construir narrativa de temporada e fechar a corrida para Legends.'
      when 12 then 'Executar a UR Legends e consolidar os protagonistas do ciclo.'
      when 13 then 'Fechar ranking, repasses, reconhecimento, Virada e próxima temporada.'
    end;

    v_primary_product := case v_week
      when 7 then 'UR Series'
      when 10 then 'UR Cup'
      when 12 then 'UR Legends'
      when 13 then 'Virada de Ranking'
      else 'UR Play'
    end;

    insert into public.season_weeks(
      season_id,
      week_number,
      name,
      phase,
      objective,
      primary_product,
      starts_at,
      ends_at,
      status
    ) values (
      v_season_id,
      v_week,
      v_week_name,
      v_phase,
      v_objective,
      v_primary_product,
      v_start + make_interval(weeks => v_week - 1),
      v_start + make_interval(weeks => v_week),
      'planned'
    );
  end loop;

  insert into public.audit_logs(
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  ) values (
    v_actor,
    'season.quarter_created',
    'season',
    v_season_id,
    jsonb_build_object(
      'name', v_name,
      'code', v_code,
      'starts_at', v_start,
      'ends_at', v_end,
      'weeks', 13,
      'compatibility_cycles', 3,
      'status', 'draft'
    ),
    jsonb_build_object('source','admin_quarter_setup')
  );

  return v_season_id;
end;
$function$;

create or replace function public.admin_create_quarter_season(
  p_name text,
  p_code text,
  p_starts_on date
)
returns uuid
language sql
security invoker
set search_path to ''
as $function$
  select private.admin_create_quarter_season(p_name, p_code, p_starts_on);
$function$;

revoke all on function public.admin_create_quarter_season(text,text,date) from public, anon;
grant execute on function public.admin_create_quarter_season(text,text,date) to authenticated, service_role;

create or replace function private.admin_homologate_season(p_season_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid;
  v_season public.seasons%rowtype;
  v_cycle_count integer;
  v_week_count integer;
  v_invalid integer;
  v_overlap integer;
  v_gaps integer;
  v_target_status public.season_status;
begin
  v_actor := private.require_admin_actor();
  select * into v_season from public.seasons where id=p_season_id for update;
  if not found then raise exception 'SEASON_NOT_FOUND'; end if;
  if v_season.status not in ('draft','registration') then raise exception 'SEASON_NOT_HOMOLOGATABLE'; end if;

  select count(*)::integer into v_week_count
  from public.season_weeks where season_id=p_season_id;
  if v_week_count <> 13 then raise exception 'SEASON_REQUIRES_THIRTEEN_WEEKS'; end if;

  select count(*)::integer into v_invalid
  from public.season_weeks
  where season_id=p_season_id
    and (
      week_number not between 1 and 13
      or starts_at < v_season.starts_at
      or ends_at > v_season.ends_at
      or ends_at <= starts_at
    );
  if v_invalid > 0 then raise exception 'INVALID_SEASON_WEEK_PERIOD'; end if;

  select count(*)::integer into v_overlap
  from public.season_weeks a
  join public.season_weeks b
    on b.season_id=a.season_id
   and b.week_number>a.week_number
   and a.starts_at < b.ends_at
   and b.starts_at < a.ends_at
  where a.season_id=p_season_id;
  if v_overlap > 0 then raise exception 'SEASON_WEEKS_OVERLAP'; end if;

  select count(*)::integer into v_gaps
  from (
    select
      week_number,
      starts_at,
      lag(ends_at) over (order by week_number) as previous_end
    from public.season_weeks
    where season_id=p_season_id
  ) ordered_weeks
  where previous_end is not null and starts_at <> previous_end;
  if v_gaps > 0 then raise exception 'SEASON_WEEKS_NOT_CONTIGUOUS'; end if;

  select count(*)::integer into v_cycle_count
  from public.season_cycles where season_id=p_season_id;
  if v_cycle_count <> 3 then raise exception 'SEASON_REQUIRES_THREE_COMPATIBILITY_CYCLES'; end if;

  select count(*)::integer into v_invalid
  from public.season_cycles
  where season_id=p_season_id
    and (starts_at < v_season.starts_at or ends_at > v_season.ends_at or ends_at <= starts_at);
  if v_invalid > 0 then raise exception 'INVALID_SEASON_CYCLE_PERIOD'; end if;

  select count(*)::integer into v_overlap
  from public.season_cycles a
  join public.season_cycles b
    on b.season_id=a.season_id
   and b.cycle_number>a.cycle_number
   and a.starts_at < b.ends_at
   and b.starts_at < a.ends_at
  where a.season_id=p_season_id;
  if v_overlap > 0 then raise exception 'SEASON_CYCLES_OVERLAP'; end if;

  v_target_status := case
    when now() >= v_season.starts_at and now() < v_season.ends_at then 'active'::public.season_status
    else 'registration'::public.season_status
  end;

  update public.seasons set status=v_target_status where id=p_season_id;

  update public.season_weeks
  set status=case
    when now() >= starts_at and now() < ends_at then 'active'
    when now() >= ends_at then 'closed'
    else 'planned'
  end
  where season_id=p_season_id;

  update public.season_cycles
  set status=case
    when now() >= starts_at and now() < ends_at then 'active'::public.cycle_status
    when now() >= ends_at then 'closed'::public.cycle_status
    else 'planned'::public.cycle_status
  end
  where season_id=p_season_id and status in ('planned','active','closed');

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,
    'season.homologated',
    'season',
    p_season_id,
    jsonb_build_object('status',v_target_status,'weeks',13,'compatibility_cycles',3),
    jsonb_build_object('source','admin_quarter_setup')
  );

  return p_season_id;
end;
$function$;
