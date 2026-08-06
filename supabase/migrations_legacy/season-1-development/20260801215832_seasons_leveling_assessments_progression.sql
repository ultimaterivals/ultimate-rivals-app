alter table public.seasons
  add column registration_starts_at timestamptz,
  add column registration_ends_at timestamptz,
  add column closed_at timestamptz,
  add constraint seasons_registration_period check (registration_starts_at is null or registration_ends_at > registration_starts_at);

create type public.cycle_status as enum ('planned','active','closing','closed');
create type public.leveling_process_status as enum ('pending','in_progress','ready_for_review','completed','cancelled');
create type public.assessment_type as enum ('leveling','periodic','promotion_review','relegation_review','development');
create type public.assessment_status as enum ('draft','submitted','validated','cancelled');
create type public.assessment_scope as enum ('overall','doubles','fours');
create type public.assessment_category as enum ('TECHNICAL','TACTICAL','COGNITIVE','BEHAVIORAL');
create type public.level_review_type as enum ('leveling','promotion','relegation','correction');
create type public.level_review_status as enum ('pending','approved','rejected','cancelled');

create table public.season_cycles (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_number smallint not null check(cycle_number between 1 and 3), name text not null check(char_length(trim(name)) between 2 and 80),
  starts_at timestamptz not null, ends_at timestamptz not null, status public.cycle_status not null default 'planned',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(season_id,cycle_number), constraint cycle_period check(ends_at>starts_at)
);
create table public.athlete_leveling_processes (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.athletes(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict, status public.leveling_process_status not null default 'pending',
  started_at timestamptz not null default now(), completed_at timestamptz, required_observations smallint not null default 3 check(required_observations>=3),
  completed_observations smallint not null default 0 check(completed_observations>=0), final_level public.athlete_level,
  decision_reason text, decided_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(athlete_id,season_id)
);
create or replace function private.create_season_cycles() returns trigger language plpgsql security definer set search_path='' as $$
declare i int; cycle_start timestamptz; cycle_end timestamptz;
begin for i in 1..3 loop cycle_start:=new.starts_at+(new.ends_at-new.starts_at)*((i-1)::numeric/3); cycle_end:=new.starts_at+(new.ends_at-new.starts_at)*(i::numeric/3); insert into public.season_cycles(season_id,cycle_number,name,starts_at,ends_at) values(new.id,i,'Ciclo '||i,cycle_start,cycle_end) on conflict(season_id,cycle_number) do nothing; end loop; return new; end $$;
revoke all on function private.create_season_cycles() from public,anon,authenticated;
create trigger seasons_create_cycles after insert on public.seasons for each row execute function private.create_season_cycles();
insert into public.season_cycles(season_id,cycle_number,name,starts_at,ends_at)
select s.id,n,'Ciclo '||n,s.starts_at+(s.ends_at-s.starts_at)*((n-1)::numeric/3),s.starts_at+(s.ends_at-s.starts_at)*(n::numeric/3) from public.seasons s cross join generate_series(1,3) n on conflict do nothing;
create table public.assessment_criteria (
  id uuid primary key default gen_random_uuid(), code text not null unique check(code~'^[a-z][a-z0-9_]{1,63}$'),
  name text not null unique, category public.assessment_category not null, description text, sort_order smallint not null default 0,
  status public.entity_status not null default 'active', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.athlete_assessments (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.athletes(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict, leveling_process_id uuid references public.athlete_leveling_processes(id) on delete restrict,
  assessment_type public.assessment_type not null, scope public.assessment_scope not null default 'overall', evaluator_user_id uuid not null references public.profiles(id) on delete restrict,
  context text not null check(char_length(trim(context)) between 2 and 500), notes text, athlete_feedback text,
  athlete_visible boolean not null default false, overall_score numeric(3,2) check(overall_score between 1 and 5),
  status public.assessment_status not null default 'draft', assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.athlete_assessment_scores (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.athlete_assessments(id) on delete cascade,
  criterion_id uuid not null references public.assessment_criteria(id) on delete restrict, score smallint not null check(score between 1 and 5),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(assessment_id,criterion_id)
);
create table public.assessment_weight_config (
  id uuid primary key default gen_random_uuid(), season_id uuid references public.seasons(id) on delete restrict,
  technical_review_weight numeric(3,2) not null default .60, system_data_weight numeric(3,2) not null default .40,
  status text not null default 'partial' check(status in('partial','complete')), created_at timestamptz not null default now(),
  constraint weights_total check(technical_review_weight+system_data_weight=1)
);
create table public.level_change_reviews (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.athletes(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict, current_level public.athlete_level not null,
  proposed_level public.athlete_level not null, review_type public.level_review_type not null, status public.level_review_status not null default 'pending',
  requested_by uuid not null references public.profiles(id) on delete restrict, reviewed_by uuid references public.profiles(id) on delete restrict,
  decision_reason text, evidence_summary text, created_at timestamptz not null default now(), reviewed_at timestamptz
);
create table public.athlete_level_protections (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.athletes(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict, level public.athlete_level not null,
  starts_at timestamptz not null, ends_at timestamptz not null, reason text not null check(char_length(trim(reason))>=10),
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  constraint protection_period check(ends_at>starts_at)
);

insert into public.assessment_criteria(code,name,category,sort_order) values
('serve','Saque','TECHNICAL',10),('reception','Recepção','TECHNICAL',20),('setting','Levantamento','TECHNICAL',30),
('attack','Ataque','TECHNICAL',40),('block','Bloqueio','TECHNICAL',50),('defense','Defesa','TECHNICAL',60),
('game_reading','Leitura de jogo','TACTICAL',70),('decision_making','Tomada de decisão','COGNITIVE',80),
('positioning','Posicionamento','TACTICAL',90),('adaptation','Adaptação','COGNITIVE',100),('communication','Comunicação','BEHAVIORAL',110),
('discipline','Disciplina','BEHAVIORAL',120),('posture','Postura','BEHAVIORAL',130),('competitiveness','Competitividade','BEHAVIORAL',140),
('teamwork','Trabalho em equipe','BEHAVIORAL',150),('resilience','Resiliência','BEHAVIORAL',160);
insert into public.assessment_weight_config(season_id) select id from public.seasons where status in('active','registration') on conflict do nothing;

create or replace function public.transition_season(target_season_id uuid,target_status public.season_status)
returns public.seasons language plpgsql security invoker set search_path='' as $$
declare current_status public.season_status; result public.seasons;
begin
 if not private.has_any_role(array['admin']::public.app_role[]) then raise exception 'admin required' using errcode='42501'; end if;
 select status into current_status from public.seasons where id=target_season_id for update;
 if not ((current_status='draft' and target_status='registration') or (current_status='registration' and target_status='active') or
         (current_status='active' and target_status='closing') or (current_status='closing' and target_status='closed') or
         (current_status='closed' and target_status='archived')) then raise exception 'invalid season transition % -> %',current_status,target_status using errcode='23514'; end if;
 update public.seasons set status=target_status,closed_at=case when target_status='closed' then now() else closed_at end where id=target_season_id returning * into result; return result;
end $$;
revoke all on function public.transition_season(uuid,public.season_status) from public,anon; grant execute on function public.transition_season(uuid,public.season_status) to authenticated;

create or replace function private.refresh_leveling_observations() returns trigger language plpgsql security definer set search_path='' as $$
declare process_id uuid; total int; required int;
begin process_id:=case when tg_op='DELETE' then old.leveling_process_id else new.leveling_process_id end; if process_id is null then if tg_op='DELETE' then return old; else return new; end if; end if;
 select count(*) into total from public.athlete_assessments where leveling_process_id=process_id and status in('submitted','validated');
 select required_observations into required from public.athlete_leveling_processes where id=process_id;
 update public.athlete_leveling_processes set completed_observations=total,status=case when total>=required then 'ready_for_review'::public.leveling_process_status when total>0 then 'in_progress'::public.leveling_process_status else 'pending'::public.leveling_process_status end where id=process_id and status not in('completed','cancelled'); if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.refresh_leveling_observations() from public,anon,authenticated;
create trigger assessments_refresh_leveling after insert or update of status or delete on public.athlete_assessments for each row execute function private.refresh_leveling_observations();

create or replace function private.valid_level_change(current_level public.athlete_level,proposed_level public.athlete_level,kind public.level_review_type)
returns boolean language sql immutable security invoker set search_path='' as $$ select case when kind='correction' then true when kind='leveling' then current_level='leveling' and proposed_level in('n3','n2','n1') when kind='promotion' then (current_level='n3' and proposed_level='n2') or (current_level='n2' and proposed_level='n1') when kind='relegation' then (current_level='n1' and proposed_level='n2') or (current_level='n2' and proposed_level='n3') else false end $$;

create or replace function public.approve_level_change(target_review_id uuid,effective_at timestamptz,protection_ends_at timestamptz default null)
returns public.level_change_reviews language plpgsql security invoker set search_path='' as $$
declare review public.level_change_reviews; current_row public.athlete_levels; result public.level_change_reviews;
begin
 if not private.has_any_role(array['admin']::public.app_role[]) then raise exception 'admin required' using errcode='42501'; end if;
 select * into review from public.level_change_reviews where id=target_review_id and status='pending' for update;
 if not found then raise exception 'pending review not found' using errcode='23514'; end if;
 if review.review_type='correction' and coalesce(char_length(trim(review.decision_reason)),0)<10 then raise exception 'correction reason required' using errcode='23514'; end if;
 if not private.valid_level_change(review.current_level,review.proposed_level,review.review_type) then raise exception 'invalid level progression' using errcode='23514'; end if;
 select * into current_row from public.athlete_levels where athlete_id=review.athlete_id and season_id=review.season_id and status='active' for update;
 if current_row.level<>review.current_level then raise exception 'current level changed' using errcode='23514'; end if;
 if review.review_type='relegation' and exists(select 1 from public.athlete_level_protections where athlete_id=review.athlete_id and season_id=review.season_id and starts_at<=effective_at and ends_at>effective_at) then raise exception 'athlete level is protected' using errcode='23514'; end if;
 update public.athlete_levels set ends_at=effective_at,status='inactive' where id=current_row.id;
 insert into public.athlete_levels(athlete_id,season_id,level,starts_at,reason,assigned_by) values(review.athlete_id,review.season_id,review.proposed_level,effective_at,review.decision_reason,auth.uid());
 update public.level_change_reviews set status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=review.id returning * into result;
 if protection_ends_at is not null and review.review_type='promotion' then insert into public.athlete_level_protections(athlete_id,season_id,level,starts_at,ends_at,reason,created_by) values(review.athlete_id,review.season_id,review.proposed_level,effective_at,protection_ends_at,'Proteção após promoção homologada',auth.uid()); end if;
 update public.athlete_leveling_processes set status='completed',completed_at=effective_at,final_level=review.proposed_level,decision_reason=review.decision_reason,decided_by=auth.uid() where athlete_id=review.athlete_id and season_id=review.season_id and review.review_type='leveling'; return result;
end $$;
revoke all on function public.approve_level_change(uuid,timestamptz,timestamptz) from public,anon; grant execute on function public.approve_level_change(uuid,timestamptz,timestamptz) to authenticated;

create or replace function public.can_athlete_compete_at_level(target_athlete_id uuid,target_season_id uuid,target_level public.athlete_level)
returns boolean language sql stable security invoker set search_path='' as $$ select case l.level when 'leveling' then false when 'n3' then target_level in('n3','n2','n1') when 'n2' then target_level in('n2','n1') when 'n1' then target_level='n1' else false end from public.athlete_levels l where l.athlete_id=target_athlete_id and l.season_id=target_season_id and l.status='active' limit 1 $$;
grant execute on function public.can_athlete_compete_at_level(uuid,uuid,public.athlete_level) to authenticated;

create or replace function public.create_athlete_assessment(
 target_athlete_id uuid,target_season_id uuid,target_process_id uuid,target_type public.assessment_type,target_scope public.assessment_scope,
 assessment_context text,assessment_notes text,feedback text,is_athlete_visible boolean,scores jsonb
) returns uuid language plpgsql security invoker set search_path='' as $$
declare new_assessment_id uuid; item jsonb;
begin
 if not private.has_any_role(array['admin','operator']::public.app_role[]) then raise exception 'evaluator role required' using errcode='42501'; end if;
 insert into public.athlete_assessments(athlete_id,season_id,leveling_process_id,assessment_type,scope,evaluator_user_id,context,notes,athlete_feedback,athlete_visible,status)
 values(target_athlete_id,target_season_id,target_process_id,target_type,target_scope,auth.uid(),assessment_context,assessment_notes,feedback,is_athlete_visible,'submitted') returning id into new_assessment_id;
 for item in select value from jsonb_array_elements(scores) loop
  insert into public.athlete_assessment_scores(assessment_id,criterion_id,score,notes) values(new_assessment_id,(item->>'criterion_id')::uuid,(item->>'score')::smallint,item->>'notes');
 end loop;
 update public.athlete_assessments set overall_score=(select round(avg(score)::numeric,2) from public.athlete_assessment_scores where assessment_id=new_assessment_id) where id=new_assessment_id;
 return new_assessment_id;
end $$;
revoke all on function public.create_athlete_assessment(uuid,uuid,uuid,public.assessment_type,public.assessment_scope,text,text,text,boolean,jsonb) from public,anon;
grant execute on function public.create_athlete_assessment(uuid,uuid,uuid,public.assessment_type,public.assessment_scope,text,text,text,boolean,jsonb) to authenticated;

create or replace function public.assign_athlete_level(
  target_athlete_id uuid,target_season_id uuid,target_level public.athlete_level,effective_at timestamptz,assignment_reason text default null
) returns public.athlete_levels language plpgsql security invoker set search_path='' as $$
declare current_value public.athlete_level; review_id uuid; result public.athlete_levels;
begin
 if not private.has_any_role(array['admin']::public.app_role[]) then raise exception 'admin required' using errcode='42501'; end if;
 if coalesce(char_length(trim(assignment_reason)),0)<10 then raise exception 'auditable reason required' using errcode='23514'; end if;
 select level into current_value from public.athlete_levels where athlete_id=target_athlete_id and season_id=target_season_id and status='active' order by starts_at desc limit 1;
 if current_value is null then
  insert into public.athlete_levels(athlete_id,season_id,level,starts_at,reason,assigned_by) values(target_athlete_id,target_season_id,'leveling',effective_at-interval '1 millisecond','Entrada padrão em nivelamento',auth.uid()); current_value:='leveling';
 end if;
 insert into public.level_change_reviews(athlete_id,season_id,current_level,proposed_level,review_type,requested_by,decision_reason,evidence_summary)
 values(target_athlete_id,target_season_id,current_value,target_level,'correction',auth.uid(),assignment_reason,'Compatibilidade administrativa migrada') returning id into review_id;
 perform public.approve_level_change(review_id,effective_at,null);
 select * into result from public.athlete_levels where athlete_id=target_athlete_id and season_id=target_season_id and status='active'; return result;
end $$;

do $$ declare n text; begin foreach n in array array['season_cycles','athlete_leveling_processes','assessment_criteria','athlete_assessments','athlete_assessment_scores','assessment_weight_config','level_change_reviews','athlete_level_protections'] loop execute format('alter table public.%I enable row level security',n); execute format('alter table public.%I force row level security',n); execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',n,n); end loop; end $$;
create policy sprint5_admin_cycles on public.season_cycles for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));
create policy sprint5_admin_leveling on public.athlete_leveling_processes for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));
create policy sprint5_leveling_read on public.athlete_leveling_processes for select to authenticated using(athlete_id=private.current_athlete_id() or private.has_any_role(array['operator']::public.app_role[]) or exists(select 1 from public.team_memberships m join public.teams t on t.id=m.team_id where m.athlete_id=athlete_leveling_processes.athlete_id and m.status='active' and (private.manages_team(m.team_id) or private.manages_pole(t.primary_pole_id))));
create policy sprint5_criteria_read on public.assessment_criteria for select to authenticated using(true); create policy sprint5_criteria_admin on public.assessment_criteria for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));
create policy sprint5_assessment_read on public.athlete_assessments for select to authenticated using(private.has_any_role(array['admin','operator']::public.app_role[]) or (athlete_visible and athlete_id=private.current_athlete_id()) or exists(select 1 from public.team_memberships m join public.teams t on t.id=m.team_id where m.athlete_id=athlete_assessments.athlete_id and m.status='active' and (private.manages_team(m.team_id) or private.manages_pole(t.primary_pole_id))));
create policy sprint5_assessment_write on public.athlete_assessments for all to authenticated using(private.has_any_role(array['admin','operator']::public.app_role[])) with check(private.has_any_role(array['admin','operator']::public.app_role[]) and evaluator_user_id=auth.uid());
create policy sprint5_scores_read on public.athlete_assessment_scores for select to authenticated using(exists(select 1 from public.athlete_assessments a where a.id=assessment_id));
create policy sprint5_scores_write on public.athlete_assessment_scores for all to authenticated using(exists(select 1 from public.athlete_assessments a where a.id=assessment_id and a.evaluator_user_id=auth.uid() and a.status='draft')) with check(exists(select 1 from public.athlete_assessments a where a.id=assessment_id and a.evaluator_user_id=auth.uid() and a.status='draft'));
create policy sprint5_weights_read on public.assessment_weight_config for select to authenticated using(true); create policy sprint5_weights_admin on public.assessment_weight_config for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));
create policy sprint5_reviews_read on public.level_change_reviews for select to authenticated using(private.has_any_role(array['admin','operator']::public.app_role[]) or athlete_id=private.current_athlete_id() or exists(select 1 from public.team_memberships m join public.teams t on t.id=m.team_id where m.athlete_id=level_change_reviews.athlete_id and m.status='active' and (private.manages_team(m.team_id) or private.manages_pole(t.primary_pole_id))));
create policy sprint5_reviews_admin on public.level_change_reviews for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));
create policy sprint5_protections_read on public.athlete_level_protections for select to authenticated using(private.has_any_role(array['admin','operator']::public.app_role[]) or athlete_id=private.current_athlete_id() or exists(select 1 from public.team_memberships m join public.teams t on t.id=m.team_id where m.athlete_id=athlete_level_protections.athlete_id and m.status='active' and (private.manages_team(m.team_id) or private.manages_pole(t.primary_pole_id))));
create policy sprint5_protections_admin on public.athlete_level_protections for all to authenticated using(private.has_any_role(array['admin']::public.app_role[])) with check(private.has_any_role(array['admin']::public.app_role[]));
grant select,insert,update,delete on public.season_cycles,public.athlete_leveling_processes,public.assessment_criteria,public.athlete_assessments,public.athlete_assessment_scores,public.assessment_weight_config,public.level_change_reviews,public.athlete_level_protections to authenticated;
grant all on public.season_cycles,public.athlete_leveling_processes,public.assessment_criteria,public.athlete_assessments,public.athlete_assessment_scores,public.assessment_weight_config,public.level_change_reviews,public.athlete_level_protections to service_role;
