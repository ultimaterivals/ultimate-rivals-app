alter table public.teams
  add column description text check (description is null or char_length(description) <= 1200),
  add column founded_at date,
  add column instagram_handle text check (instagram_handle is null or instagram_handle ~ '^@?[A-Za-z0-9._]{1,30}$');

create type public.team_management_role as enum ('owner','manager','assistant');
create table public.team_manager_assignments (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict, management_role public.team_management_role not null,
  starts_at timestamptz not null default now(), ends_at timestamptz, status public.temporal_status not null default 'active',
  assigned_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  constraint team_manager_period check (ends_at is null or ends_at > starts_at)
);
create index team_manager_profile_idx on public.team_manager_assignments(profile_id,status,starts_at,ends_at);
create index team_manager_team_idx on public.team_manager_assignments(team_id,status);

insert into public.team_manager_assignments(profile_id,team_id,management_role,starts_at,ends_at,status,assigned_by)
select profile_id,team_id,'manager',starts_at,ends_at,status,created_by from public.access_assignments
where role='team_manager' and team_id is not null
on conflict do nothing;

create table public.team_pole_assignments (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete restrict,
  pole_id uuid not null references public.poles(id) on delete restrict, season_id uuid not null references public.seasons(id) on delete restrict,
  starts_at timestamptz not null, ends_at timestamptz, status public.temporal_status not null default 'active',
  assigned_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  constraint team_pole_period check (ends_at is null or ends_at > starts_at),
  exclude using gist (team_id with =, season_id with =, tstzrange(starts_at,coalesce(ends_at,'infinity'::timestamptz),'[)') with &&) where (status='active')
);
create index team_pole_team_season_idx on public.team_pole_assignments(team_id,season_id,starts_at desc);

create table public.athlete_public_profiles (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  athlete_code text not null unique, public_name text not null, avatar_url text, updated_at timestamptz not null default now()
);
create or replace function private.sync_athlete_public_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then delete from public.athlete_public_profiles where athlete_id=old.id; return old; end if;
  insert into public.athlete_public_profiles(athlete_id,athlete_code,public_name,avatar_url,updated_at)
  values(new.id,new.athlete_code,new.public_name,new.avatar_url,now())
  on conflict(athlete_id) do update set athlete_code=excluded.athlete_code,public_name=excluded.public_name,avatar_url=excluded.avatar_url,updated_at=now();
  return new;
end $$;
revoke all on function private.sync_athlete_public_profile() from public,anon,authenticated;
insert into public.athlete_public_profiles(athlete_id,athlete_code,public_name,avatar_url)
select id,athlete_code,public_name,avatar_url from public.athletes;
create trigger athletes_sync_public_profile after insert or update or delete on public.athletes
for each row execute function private.sync_athlete_public_profile();

alter table public.team_roster_members add column is_captain boolean not null default false;
update public.team_roster_members set role='starter',is_captain=true where role='captain';
alter table public.team_rosters add constraint roster_competitive_level check (level <> 'leveling');

create or replace function private.level_strength(value public.athlete_level)
returns smallint language sql immutable security invoker set search_path='' as $$
 select case value when 'n3' then 1 when 'n2' then 2 when 'n1' then 3 else 0 end::smallint
$$;

create or replace function private.validate_roster_member()
returns trigger language plpgsql security definer set search_path='' as $$
declare r public.team_rosters; format_code text; category_code text; athlete_gender public.gender_type; strongest smallint;
begin
 select * into r from public.team_rosters where id=new.roster_id;
 if not found then raise exception 'roster not found' using errcode='23503'; end if;
 select code into format_code from public.competitive_formats where id=r.format_id;
 select code into category_code from public.competitive_categories where id=r.category_id;
 if not exists(select 1 from public.team_memberships m where m.athlete_id=new.athlete_id and m.team_id=r.team_id and m.season_id=r.season_id and m.status='active' and m.starts_at<=new.joined_at and (m.ends_at is null or m.ends_at>new.joined_at)) then
   raise exception 'athlete has no active membership for roster team and season' using errcode='23514';
 end if;
 select gender into athlete_gender from public.athletes where id=new.athlete_id;
 if category_code='female' and athlete_gender<>'female' then raise exception 'female roster requires female athlete' using errcode='23514'; end if;
 if category_code='male' and athlete_gender<>'male' then raise exception 'male roster requires male athlete' using errcode='23514'; end if;
 if category_code='mixed' and athlete_gender not in ('female','male') then raise exception 'mixed roster requires female or male athlete' using errcode='23514'; end if;
 select max(private.level_strength(l.level)) into strongest from public.athlete_levels l where l.athlete_id=new.athlete_id and l.season_id=r.season_id and l.status='active';
 if coalesce(strongest,0)=0 then raise exception 'athlete has no competitive level' using errcode='23514'; end if;
 if private.level_strength(r.level)<strongest then raise exception 'roster level is below athlete level' using errcode='23514'; end if;
 if format_code='doubles' and new.role<>'starter' then raise exception 'doubles allow starters only' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function private.validate_roster_member() from public,anon,authenticated;
create trigger roster_member_validate before insert or update on public.team_roster_members for each row execute function private.validate_roster_member();

create or replace function private.enforce_roster_member_limits()
returns trigger language plpgsql security definer set search_path='' as $$
declare rid uuid:=coalesce(new.roster_id,old.roster_id); format_code text; active_count int; starters int; reserves int;
begin
 select f.code into format_code from public.team_rosters r join public.competitive_formats f on f.id=r.format_id where r.id=rid;
 select count(*),count(*) filter(where role='starter'),count(*) filter(where role='reserve') into active_count,starters,reserves from public.team_roster_members where roster_id=rid and status='active';
 if format_code='doubles' and (active_count>2 or starters>2 or reserves>0) then raise exception 'invalid doubles composition' using errcode='23514'; end if;
 if format_code='fours' and (active_count>7 or starters>4 or reserves>3) then raise exception 'invalid fours composition' using errcode='23514'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.enforce_roster_member_limits() from public,anon,authenticated;
create constraint trigger roster_member_limits after insert or update or delete on public.team_roster_members deferrable initially immediate for each row execute function private.enforce_roster_member_limits();

create or replace function private.validate_roster_activation()
returns trigger language plpgsql security definer set search_path='' as $$
declare format_code text; active_count int; starters int; reserves int; same_count int;
begin
 if new.status='active' and old.status is distinct from 'active' then
  select code into format_code from public.competitive_formats where id=new.format_id;
  select count(*),count(*) filter(where role='starter'),count(*) filter(where role='reserve') into active_count,starters,reserves from public.team_roster_members where roster_id=new.id and status='active';
  if format_code='doubles' and (active_count<>2 or starters<>2 or reserves<>0) then raise exception 'doubles require exactly two starters' using errcode='23514'; end if;
  if format_code='fours' and (active_count<4 or active_count>7 or starters<>4 or reserves>3) then raise exception 'fours require four starters and at most three reserves' using errcode='23514'; end if;
 end if;
 return new;
end $$;
revoke all on function private.validate_roster_activation() from public,anon,authenticated;
create trigger roster_activation_validate before update of status on public.team_rosters for each row execute function private.validate_roster_activation();

create or replace function private.enforce_doubles_limit()
returns trigger language plpgsql security definer set search_path='' as $$
declare code text; total int;
begin select f.code into code from public.competitive_formats f where f.id=new.format_id;
 if new.level='leveling' then raise exception 'leveling cannot form competitive roster' using errcode='23514'; end if;
 if code='doubles' then select count(*) into total from public.team_rosters r where r.team_id=new.team_id and r.season_id=new.season_id and r.category_id=new.category_id and r.format_id=new.format_id and r.status<>'archived' and r.id<>new.id; if total>=5 then raise exception 'maximum five doubles per category and season' using errcode='23514'; end if; end if;
 return new; end $$;
revoke all on function private.enforce_doubles_limit() from public,anon,authenticated;
create trigger roster_doubles_limit before insert or update on public.team_rosters for each row execute function private.enforce_doubles_limit();

create or replace function private.manages_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_manager_assignments a where a.profile_id=(select auth.uid()) and a.team_id=target_team_id and a.status='active' and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()))
 or exists(select 1 from public.access_assignments a where a.profile_id=(select auth.uid()) and a.team_id=target_team_id and a.role='team_manager' and a.status='active' and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()))
$$;
revoke all on function private.manages_team(uuid) from public,anon; grant execute on function private.manages_team(uuid) to authenticated;

do $$ declare n text; begin foreach n in array array['team_manager_assignments','team_pole_assignments','athlete_public_profiles'] loop execute format('alter table public.%I enable row level security',n); execute format('alter table public.%I force row level security',n); end loop; end $$;
create policy team_managers_select on public.team_manager_assignments for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or profile_id=(select auth.uid()) or (select private.manages_team(team_id)));
create policy team_managers_admin_all on public.team_manager_assignments for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy team_poles_select on public.team_pole_assignments for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or (select private.manages_team(team_id)) or (select private.team_is_in_managed_pole(team_id)) or (select private.is_active_team_member(team_id)));
create policy team_poles_admin_all on public.team_pole_assignments for all to authenticated using ((select private.has_any_role(array['admin']::public.app_role[]))) with check ((select private.has_any_role(array['admin']::public.app_role[])));
create policy athlete_directory_select on public.athlete_public_profiles for select to authenticated using ((select private.has_any_role(array['admin','operator']::public.app_role[])) or athlete_id=(select private.current_athlete_id()) or exists(select 1 from public.team_memberships m where m.athlete_id=athlete_public_profiles.athlete_id and m.status='active' and ((select private.manages_team(m.team_id)) or (select private.team_is_in_managed_pole(m.team_id)))));

create policy memberships_team_manager_insert on public.team_memberships for insert to authenticated with check ((select private.manages_team(team_id)) and created_by=(select auth.uid()));
create policy memberships_team_manager_update on public.team_memberships for update to authenticated using ((select private.manages_team(team_id))) with check ((select private.manages_team(team_id)));
create policy rosters_team_manager_insert on public.team_rosters for insert to authenticated with check ((select private.manages_team(team_id)));
create policy rosters_team_manager_update on public.team_rosters for update to authenticated using ((select private.manages_team(team_id))) with check ((select private.manages_team(team_id)));
create policy roster_members_team_manager_insert on public.team_roster_members for insert to authenticated with check (exists(select 1 from public.team_rosters r where r.id=roster_id and (select private.manages_team(r.team_id))));
create policy roster_members_team_manager_update on public.team_roster_members for update to authenticated using (exists(select 1 from public.team_rosters r where r.id=roster_id and (select private.manages_team(r.team_id)))) with check (exists(select 1 from public.team_rosters r where r.id=roster_id and (select private.manages_team(r.team_id))));

grant select,insert,update,delete on public.team_manager_assignments,public.team_pole_assignments to authenticated;
grant select on public.athlete_public_profiles to authenticated;
grant all on public.team_manager_assignments,public.team_pole_assignments,public.athlete_public_profiles to service_role;
create trigger team_managers_audit after insert or update or delete on public.team_manager_assignments for each row execute function private.capture_audit_log();
create trigger team_poles_audit after insert or update or delete on public.team_pole_assignments for each row execute function private.capture_audit_log();

create or replace function public.assign_team_pole(
  target_team_id uuid,
  target_pole_id uuid,
  target_season_id uuid,
  effective_at timestamptz
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare assignment_id uuid;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then
    raise exception 'admin role required' using errcode = '42501';
  end if;
  update public.team_pole_assignments
     set ends_at = effective_at, status = 'inactive'
   where team_id = target_team_id and season_id = target_season_id and status = 'active';
  insert into public.team_pole_assignments(team_id,pole_id,season_id,starts_at,assigned_by)
  values(target_team_id,target_pole_id,target_season_id,effective_at,(select auth.uid()))
  returning id into assignment_id;
  update public.teams set primary_pole_id = target_pole_id where id = target_team_id;
  return assignment_id;
end $$;
revoke all on function public.assign_team_pole(uuid,uuid,uuid,timestamptz) from public,anon;
grant execute on function public.assign_team_pole(uuid,uuid,uuid,timestamptz) to authenticated;

create or replace function private.safe_team_folder(object_name text)
returns uuid language plpgsql immutable security invoker set search_path = '' as $$
declare folder text;
begin
  folder := (storage.foldername(object_name))[1];
  return folder::uuid;
exception when others then return null;
end $$;
revoke all on function private.safe_team_folder(text) from public,anon;
grant execute on function private.safe_team_folder(text) to authenticated;

create or replace function private.protect_team_manager_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select private.has_any_role(array['admin']::public.app_role[])) then return new; end if;
  if not (select private.manages_team(old.id)) then raise exception 'team access denied' using errcode='42501'; end if;
  if (to_jsonb(new) - array['logo_url','updated_at']) is distinct from (to_jsonb(old) - array['logo_url','updated_at']) then
    raise exception 'team manager may update logo only' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function private.protect_team_manager_update() from public,anon,authenticated;
create trigger teams_protect_manager_update before update on public.teams
for each row execute function private.protect_team_manager_update();
create policy teams_manager_logo_update on public.teams for update to authenticated
using ((select private.manages_team(id))) with check ((select private.manages_team(id)));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('team-logos','team-logos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy team_logo_select on storage.objects for select to authenticated using (bucket_id='team-logos' and ((select private.has_any_role(array['admin','operator']::public.app_role[])) or (select private.manages_team(private.safe_team_folder(name))) or (select private.team_is_in_managed_pole(private.safe_team_folder(name))) or (select private.is_active_team_member(private.safe_team_folder(name)))));
create policy team_logo_insert on storage.objects for insert to authenticated with check (bucket_id='team-logos' and ((select private.has_any_role(array['admin']::public.app_role[])) or (select private.manages_team(private.safe_team_folder(name)))));
create policy team_logo_update on storage.objects for update to authenticated using (bucket_id='team-logos' and ((select private.has_any_role(array['admin']::public.app_role[])) or (select private.manages_team(private.safe_team_folder(name))))) with check (bucket_id='team-logos' and ((select private.has_any_role(array['admin']::public.app_role[])) or (select private.manages_team(private.safe_team_folder(name)))));
create policy team_logo_delete on storage.objects for delete to authenticated using (bucket_id='team-logos' and ((select private.has_any_role(array['admin']::public.app_role[])) or (select private.manages_team(private.safe_team_folder(name)))));
