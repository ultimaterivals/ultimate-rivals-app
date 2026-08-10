create table if not exists public.athlete_activation_waves (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 100),
  target_size smallint not null default 8 check (target_size between 1 and 100),
  pole_id uuid references public.poles(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','preparing','running','completed','cancelled')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.athlete_activation_wave_members (
  wave_id uuid not null references public.athlete_activation_waves(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  selection_reason text not null check (char_length(trim(selection_reason)) between 5 and 500),
  priority smallint not null default 0 check (priority between -100 and 100),
  selected_by uuid not null references public.profiles(id) on delete restrict,
  selected_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references public.profiles(id) on delete restrict,
  removal_reason text,
  primary key (wave_id, athlete_id),
  check (
    (removed_at is null and removed_by is null and removal_reason is null)
    or
    (removed_at is not null and removed_by is not null and char_length(trim(coalesce(removal_reason,''))) between 5 and 500)
  )
);

create index if not exists athlete_activation_waves_status_idx
  on public.athlete_activation_waves(status, created_at desc);
create index if not exists athlete_activation_wave_members_active_idx
  on public.athlete_activation_wave_members(wave_id, priority desc, selected_at)
  where removed_at is null;
create index if not exists athlete_activation_wave_members_athlete_idx
  on public.athlete_activation_wave_members(athlete_id, selected_at desc);

alter table public.athlete_activation_waves enable row level security;
alter table public.athlete_activation_wave_members enable row level security;

create policy athlete_activation_waves_admin_select
on public.athlete_activation_waves
for select
to authenticated
using ((select private.has_any_role(array['admin'::public.app_role])));

create policy athlete_activation_wave_members_admin_select
on public.athlete_activation_wave_members
for select
to authenticated
using ((select private.has_any_role(array['admin'::public.app_role])));

create or replace function private.create_athlete_activation_wave(
  target_name text,
  target_size_value smallint default 8,
  target_pole_id uuid default null,
  target_notes text default null
)
returns public.athlete_activation_waves
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_admin_actor();
  created_wave public.athlete_activation_waves;
begin
  if char_length(trim(coalesce(target_name,''))) < 3 then
    raise exception 'WAVE_NAME_REQUIRED' using errcode = '22023';
  end if;

  if target_size_value is null or target_size_value < 1 or target_size_value > 100 then
    raise exception 'INVALID_WAVE_TARGET_SIZE' using errcode = '22023';
  end if;

  if target_pole_id is not null and not exists (
    select 1 from public.poles p where p.id = target_pole_id and p.status = 'active'
  ) then
    raise exception 'ACTIVE_POLE_REQUIRED' using errcode = '23514';
  end if;

  insert into public.athlete_activation_waves(
    name,target_size,pole_id,notes,created_by
  ) values (
    trim(target_name),target_size_value,target_pole_id,nullif(trim(coalesce(target_notes,'')),''),actor_id
  )
  returning * into created_wave;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,after_data,metadata
  ) values (
    actor_id,
    'athlete_activation_wave.created',
    'athlete_activation_wave',
    created_wave.id,
    to_jsonb(created_wave),
    jsonb_build_object('source','admin')
  );

  return created_wave;
end;
$$;

create or replace function public.create_athlete_activation_wave(
  target_name text,
  target_size_value smallint default 8,
  target_pole_id uuid default null,
  target_notes text default null
)
returns public.athlete_activation_waves
language sql
set search_path = ''
as $$
  select private.create_athlete_activation_wave(target_name,target_size_value,target_pole_id,target_notes)
$$;

create or replace function private.set_athlete_activation_wave_member(
  target_wave_id uuid,
  target_athlete_id uuid,
  target_selected boolean,
  target_reason text,
  target_priority smallint default 0
)
returns public.athlete_activation_wave_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_admin_actor();
  wave_row public.athlete_activation_waves;
  athlete_row public.athletes;
  member_row public.athlete_activation_wave_members;
  active_count integer;
begin
  if char_length(trim(coalesce(target_reason,''))) < 5 then
    raise exception 'SELECTION_REASON_REQUIRED' using errcode = '22023';
  end if;

  select * into wave_row
  from public.athlete_activation_waves
  where id = target_wave_id
  for update;

  if not found then
    raise exception 'WAVE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if wave_row.status in ('completed','cancelled') then
    raise exception 'WAVE_IS_CLOSED' using errcode = '23514';
  end if;

  select * into athlete_row
  from public.athletes
  where id = target_athlete_id;

  if not found then
    raise exception 'ATHLETE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if athlete_row.status in ('archived','suspended') then
    raise exception 'ATHLETE_NOT_ELIGIBLE_FOR_WAVE' using errcode = '23514';
  end if;

  if wave_row.pole_id is not null and athlete_row.primary_pole_id is distinct from wave_row.pole_id then
    raise exception 'ATHLETE_OUTSIDE_WAVE_POLE' using errcode = '23514';
  end if;

  if target_selected then
    select count(*) into active_count
    from public.athlete_activation_wave_members m
    where m.wave_id = target_wave_id
      and m.removed_at is null
      and m.athlete_id <> target_athlete_id;

    if active_count >= wave_row.target_size then
      raise exception 'WAVE_TARGET_REACHED' using errcode = '23514';
    end if;

    insert into public.athlete_activation_wave_members(
      wave_id,athlete_id,selection_reason,priority,selected_by,selected_at,
      removed_at,removed_by,removal_reason
    ) values (
      target_wave_id,target_athlete_id,trim(target_reason),coalesce(target_priority,0),actor_id,now(),
      null,null,null
    )
    on conflict (wave_id,athlete_id) do update set
      selection_reason = excluded.selection_reason,
      priority = excluded.priority,
      selected_by = excluded.selected_by,
      selected_at = now(),
      removed_at = null,
      removed_by = null,
      removal_reason = null
    returning * into member_row;

    insert into public.audit_logs(
      actor_user_id,action,entity_type,entity_id,after_data,metadata
    ) values (
      actor_id,
      'athlete_activation_wave.member_selected',
      'athlete',
      target_athlete_id,
      to_jsonb(member_row),
      jsonb_build_object('wave_id',target_wave_id,'source','admin')
    );
  else
    update public.athlete_activation_wave_members
    set removed_at = now(),
        removed_by = actor_id,
        removal_reason = trim(target_reason)
    where wave_id = target_wave_id
      and athlete_id = target_athlete_id
      and removed_at is null
    returning * into member_row;

    if not found then
      raise exception 'ACTIVE_WAVE_MEMBER_NOT_FOUND' using errcode = 'P0002';
    end if;

    insert into public.audit_logs(
      actor_user_id,action,entity_type,entity_id,after_data,metadata
    ) values (
      actor_id,
      'athlete_activation_wave.member_removed',
      'athlete',
      target_athlete_id,
      to_jsonb(member_row),
      jsonb_build_object('wave_id',target_wave_id,'source','admin')
    );
  end if;

  update public.athlete_activation_waves
  set updated_at = now(),
      status = case when status = 'draft' then 'preparing' else status end
  where id = target_wave_id;

  return member_row;
end;
$$;

create or replace function public.set_athlete_activation_wave_member(
  target_wave_id uuid,
  target_athlete_id uuid,
  target_selected boolean,
  target_reason text,
  target_priority smallint default 0
)
returns public.athlete_activation_wave_members
language sql
set search_path = ''
as $$
  select private.set_athlete_activation_wave_member(
    target_wave_id,target_athlete_id,target_selected,target_reason,target_priority
  )
$$;

create or replace function private.set_athlete_activation_wave_status(
  target_wave_id uuid,
  target_status text,
  target_reason text
)
returns public.athlete_activation_waves
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_admin_actor();
  wave_row public.athlete_activation_waves;
  previous_status text;
begin
  if target_status not in ('draft','preparing','running','completed','cancelled') then
    raise exception 'INVALID_WAVE_STATUS' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(target_reason,''))) < 5 then
    raise exception 'STATUS_REASON_REQUIRED' using errcode = '22023';
  end if;

  select * into wave_row
  from public.athlete_activation_waves
  where id = target_wave_id
  for update;

  if not found then
    raise exception 'WAVE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if wave_row.status in ('completed','cancelled') and target_status <> wave_row.status then
    raise exception 'WAVE_IS_CLOSED' using errcode = '23514';
  end if;

  previous_status := wave_row.status;
  update public.athlete_activation_waves
  set status = target_status,
      updated_at = now()
  where id = target_wave_id
  returning * into wave_row;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata
  ) values (
    actor_id,
    'athlete_activation_wave.status_updated',
    'athlete_activation_wave',
    target_wave_id,
    jsonb_build_object('status',previous_status),
    jsonb_build_object('status',wave_row.status),
    jsonb_build_object('reason',trim(target_reason),'source','admin')
  );

  return wave_row;
end;
$$;

create or replace function public.set_athlete_activation_wave_status(
  target_wave_id uuid,
  target_status text,
  target_reason text
)
returns public.athlete_activation_waves
language sql
set search_path = ''
as $$
  select private.set_athlete_activation_wave_status(target_wave_id,target_status,target_reason)
$$;

revoke all on table public.athlete_activation_waves from anon;
revoke all on table public.athlete_activation_wave_members from anon;
revoke all on function private.create_athlete_activation_wave(text,smallint,uuid,text) from public,anon;
revoke all on function private.set_athlete_activation_wave_member(uuid,uuid,boolean,text,smallint) from public,anon;
revoke all on function private.set_athlete_activation_wave_status(uuid,text,text) from public,anon;
grant execute on function private.create_athlete_activation_wave(text,smallint,uuid,text) to authenticated;
grant execute on function private.set_athlete_activation_wave_member(uuid,uuid,boolean,text,smallint) to authenticated;
grant execute on function private.set_athlete_activation_wave_status(uuid,text,text) to authenticated;
revoke all on function public.create_athlete_activation_wave(text,smallint,uuid,text) from public,anon;
revoke all on function public.set_athlete_activation_wave_member(uuid,uuid,boolean,text,smallint) from public,anon;
revoke all on function public.set_athlete_activation_wave_status(uuid,text,text) from public,anon;
grant execute on function public.create_athlete_activation_wave(text,smallint,uuid,text) to authenticated;
grant execute on function public.set_athlete_activation_wave_member(uuid,uuid,boolean,text,smallint) to authenticated;
grant execute on function public.set_athlete_activation_wave_status(uuid,text,text) to authenticated;

comment on table public.athlete_activation_waves is
  'Admin-defined rollout cohorts used to coordinate athlete activation without automatically activating or inviting anyone.';
comment on table public.athlete_activation_wave_members is
  'Auditable athlete selection history for activation waves. Membership does not grant active status or account access.';
