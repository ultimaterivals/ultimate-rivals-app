create or replace function private.enforce_closed_ranking_period()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare correction_reason text:=nullif(current_setting('app.ranking_correction_reason',true),''); is_closed boolean;
begin
  select exists(
    select 1 from public.ranking_periods p where p.season_id=new.season_id
      and ((p.cycle_id is null and p.status='closed')
        or (p.cycle_id is not null and p.status in('official','closed') and p.cycle_id is not distinct from new.season_cycle_id))
  ) into is_closed;
  if is_closed then
    if not (select private.has_any_role(array['admin']::public.app_role[])) or char_length(coalesce(correction_reason,''))<10 then
      raise exception 'closed ranking requires audited admin correction reason' using errcode='42501';
    end if;
    new.metadata:=new.metadata||jsonb_build_object('retroactive_reason',correction_reason);
  end if;
  return new;
end $$;
revoke all on function private.enforce_closed_ranking_period() from public,anon,authenticated;
