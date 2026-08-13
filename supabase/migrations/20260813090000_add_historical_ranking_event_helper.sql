create or replace function private.insert_historical_ranking_events(p_season_id uuid,p_processing_run_id uuid,p_actor uuid,p_source_ref text,p_scope public.ranking_transaction_scope,p_athlete_id uuid,p_formation_id uuid,p_team_id uuid,p_pole_id uuid,p_entity_key text,p_rule_code text,p_event_count integer)
returns integer language plpgsql security definer set search_path to 'pg_catalog','public','private' as $$
declare v_rule public.ranking_rules%rowtype; v_i integer; v_inserted integer:=0;
begin
 if p_event_count<=0 then return 0; end if;
 select * into v_rule from public.ranking_rules where active=true and rule_code=p_rule_code and (season_id is null or season_id=p_season_id) order by (season_id is not null) desc,version desc limit 1;
 if v_rule.id is null then raise exception 'HISTORICAL_RULE_NOT_FOUND:%',p_rule_code; end if;
 for v_i in 1..p_event_count loop
  insert into public.ranking_transactions(season_id,athlete_id,team_id,pole_id,source_type,source_id,rule_id,rule_code,rule_version,points,points_applied,transaction_type,transaction_scope,status,event_context,event_context_data,metadata,processing_run_id,created_by,homologated_at,homologated_by,formation_id)
  values(p_season_id,p_athlete_id,p_team_id,p_pole_id,'ranking_transaction',md5(p_scope::text||'|'||p_source_ref||'|'||p_entity_key||'|'||p_rule_code||'|'||v_i::text)::uuid,v_rule.id,v_rule.rule_code,v_rule.version,v_rule.points,v_rule.points,'earn',p_scope,'homologated','ur_play',jsonb_build_object('historical_date_unresolved',true),jsonb_build_object('origin','historical_import','source_ref',p_source_ref,'entity_key',p_entity_key,'occurrence',v_i),p_processing_run_id,p_actor,now(),p_actor,p_formation_id) on conflict do nothing;
  if found then v_inserted:=v_inserted+1; end if;
 end loop;
 return v_inserted;
end;$$;
