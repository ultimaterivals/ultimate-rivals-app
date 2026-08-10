create or replace function private.athlete_activation_blockers(p_athlete_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_athlete public.athletes%rowtype;
  v_pole public.poles%rowtype;
  v_blockers jsonb := '[]'::jsonb;
  v_phone_digits text;
begin
  select * into v_athlete from public.athletes where id=p_athlete_id;
  if not found then
    return jsonb_build_array(jsonb_build_object('code','ATHLETE_NOT_FOUND','detail','Cadastro de atleta não encontrado.'));
  end if;

  if v_athlete.status='active'::athlete_status then return '[]'::jsonb; end if;
  if v_athlete.status<>'draft'::athlete_status then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','STATUS_NOT_DRAFT','detail','Somente cadastros draft podem ser homologados por este fluxo.'));
  end if;
  if nullif(trim(v_athlete.full_name),'') is null then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','FULL_NAME_REQUIRED','detail','Nome completo é obrigatório.'));
  end if;
  if nullif(trim(v_athlete.public_name),'') is null then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','PUBLIC_NAME_REQUIRED','detail','Nome público é obrigatório.'));
  end if;
  if v_athlete.birth_date is null then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','BIRTH_DATE_REQUIRED','detail','Data de nascimento é obrigatória para homologação.'));
  elsif v_athlete.birth_date > current_date then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','BIRTH_DATE_INVALID','detail','Data de nascimento não pode estar no futuro.'));
  elsif v_athlete.birth_date > (current_date - interval '18 years')::date then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','MINOR_GUARDIAN_REQUIRED','detail','Atleta menor de 18 anos exige fluxo de responsável e consentimento antes da ativação.'));
  end if;
  if v_athlete.email_contact is null or v_athlete.email_contact !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','EMAIL_REQUIRED','detail','E-mail de contato válido é obrigatório.'));
  end if;
  v_phone_digits := regexp_replace(coalesce(v_athlete.phone,''),'\D','','g');
  if length(v_phone_digits) not in (12,13) or left(v_phone_digits,2)<>'55' then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','PHONE_REQUIRED','detail','WhatsApp/telefone brasileiro normalizado é obrigatório.'));
  end if;
  if v_athlete.primary_pole_id is null then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','POLE_REQUIRED','detail','Polo principal é obrigatório.'));
  else
    select * into v_pole from public.poles where id=v_athlete.primary_pole_id;
    if not found or v_pole.status<>'active'::entity_status then
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','POLE_NOT_ACTIVE','detail','O polo principal precisa estar homologado/ativo antes da ativação do atleta.'));
    end if;
  end if;

  return v_blockers;
end;
$$;

create or replace function private.admin_activate_athlete(p_athlete_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_athlete public.athletes%rowtype;
  v_blockers jsonb;
begin
  v_actor := private.require_admin_actor();
  select * into v_athlete from public.athletes where id=p_athlete_id for update;
  if not found then raise exception 'ATHLETE_NOT_FOUND'; end if;
  if v_athlete.status='active'::athlete_status then return v_athlete.id; end if;

  v_blockers := private.athlete_activation_blockers(p_athlete_id);
  if jsonb_array_length(v_blockers)>0 then
    raise exception 'ATHLETE_ACTIVATION_BLOCKED:%', v_blockers::text;
  end if;

  update public.athletes
  set status='active'::athlete_status,updated_at=now(),archived_at=null
  where id=p_athlete_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(
    v_actor,'athlete.activated','athlete',p_athlete_id,
    jsonb_build_object('status',v_athlete.status,'primary_pole_id',v_athlete.primary_pole_id),
    jsonb_build_object('status','active','primary_pole_id',v_athlete.primary_pole_id),
    jsonb_build_object('source','admin_homologation')
  );
  return p_athlete_id;
end;
$$;

create or replace function public.admin_get_athlete_activation_readiness(p_athlete_id uuid)
returns jsonb
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.athlete_activation_blockers(p_athlete_id); $$;

create or replace function public.admin_activate_athlete(p_athlete_id uuid)
returns uuid
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.admin_activate_athlete(p_athlete_id); $$;

revoke all on function public.admin_get_athlete_activation_readiness(uuid) from public,anon;
revoke all on function public.admin_activate_athlete(uuid) from public,anon;
grant execute on function public.admin_get_athlete_activation_readiness(uuid) to authenticated;
grant execute on function public.admin_activate_athlete(uuid) to authenticated;
