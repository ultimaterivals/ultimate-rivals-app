create or replace function private.activate_athlete_activation_wave(
  target_wave_id uuid,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_admin_actor();
  wave_row public.athlete_activation_waves;
  member_row record;
  selected_count integer;
  activated_count integer := 0;
  already_active_count integer := 0;
begin
  if char_length(trim(coalesce(target_reason,''))) < 5 then
    raise exception 'ACTIVATION_REASON_REQUIRED' using errcode = '22023';
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

  select count(*) into selected_count
  from public.athlete_activation_wave_members
  where wave_id = target_wave_id and removed_at is null;

  if selected_count <> wave_row.target_size then
    raise exception 'WAVE_TARGET_NOT_FILLED:%/%', selected_count, wave_row.target_size
      using errcode = '23514';
  end if;

  for member_row in
    select m.athlete_id, a.status
    from public.athlete_activation_wave_members m
    join public.athletes a on a.id = m.athlete_id
    where m.wave_id = target_wave_id and m.removed_at is null
    order by m.priority desc, m.selected_at, m.athlete_id
    for update of a
  loop
    if member_row.status = 'active'::public.athlete_status then
      already_active_count := already_active_count + 1;
    elsif member_row.status = 'draft'::public.athlete_status then
      perform private.admin_activate_athlete(member_row.athlete_id);
      activated_count := activated_count + 1;
    else
      raise exception 'WAVE_MEMBER_NOT_ACTIVATABLE:%:%', member_row.athlete_id, member_row.status
        using errcode = '23514';
    end if;
  end loop;

  update public.athlete_activation_waves
  set status = case when status = 'draft' then 'preparing' else status end,
      updated_at = now()
  where id = target_wave_id;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,after_data,metadata
  ) values (
    actor_id,
    'athlete_activation_wave.batch_activated',
    'athlete_activation_wave',
    target_wave_id,
    jsonb_build_object(
      'selected_count',selected_count,
      'activated_count',activated_count,
      'already_active_count',already_active_count
    ),
    jsonb_build_object('reason',trim(target_reason),'source','admin_wave_execution')
  );

  return jsonb_build_object(
    'wave_id', target_wave_id,
    'selected_count', selected_count,
    'activated_count', activated_count,
    'already_active_count', already_active_count
  );
end;
$$;

create or replace function public.activate_athlete_activation_wave(
  target_wave_id uuid,
  target_reason text
)
returns jsonb
language sql
set search_path = ''
as $$
  select private.activate_athlete_activation_wave(target_wave_id,target_reason)
$$;

create or replace function private.issue_athlete_activation_wave_invites(
  target_wave_id uuid,
  target_invites jsonb,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_admin_actor();
  wave_row public.athlete_activation_waves;
  invite_row record;
  invite_id uuid;
  invite_count integer;
  distinct_count integer;
  selected_count integer;
  results jsonb := '[]'::jsonb;
begin
  if char_length(trim(coalesce(target_reason,''))) < 5 then
    raise exception 'INVITE_REASON_REQUIRED' using errcode = '22023';
  end if;

  if target_invites is null or jsonb_typeof(target_invites) <> 'array' then
    raise exception 'INVITE_PAYLOAD_REQUIRED' using errcode = '22023';
  end if;

  invite_count := jsonb_array_length(target_invites);
  if invite_count < 1 or invite_count > 100 then
    raise exception 'INVALID_INVITE_BATCH_SIZE' using errcode = '22023';
  end if;

  select count(distinct x.athlete_id) into distinct_count
  from jsonb_to_recordset(target_invites) as x(
    athlete_id uuid,
    token_hash text,
    expires_at timestamptz
  );

  if distinct_count <> invite_count then
    raise exception 'DUPLICATE_INVITE_ATHLETE' using errcode = '23514';
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

  select count(*) into selected_count
  from public.athlete_activation_wave_members
  where wave_id = target_wave_id and removed_at is null;

  if selected_count <> wave_row.target_size then
    raise exception 'WAVE_TARGET_NOT_FILLED:%/%', selected_count, wave_row.target_size
      using errcode = '23514';
  end if;

  for invite_row in
    select x.athlete_id,x.token_hash,x.expires_at
    from jsonb_to_recordset(target_invites) as x(
      athlete_id uuid,
      token_hash text,
      expires_at timestamptz
    )
    order by x.athlete_id
  loop
    if not exists (
      select 1
      from public.athlete_activation_wave_members m
      where m.wave_id = target_wave_id
        and m.athlete_id = invite_row.athlete_id
        and m.removed_at is null
    ) then
      raise exception 'ATHLETE_NOT_IN_ACTIVE_WAVE:%', invite_row.athlete_id
        using errcode = '23514';
    end if;

    invite_id := private.admin_issue_athlete_access_invite(
      invite_row.athlete_id,
      invite_row.token_hash,
      invite_row.expires_at
    );

    results := results || jsonb_build_array(
      jsonb_build_object(
        'athlete_id',invite_row.athlete_id,
        'invite_id',invite_id,
        'expires_at',invite_row.expires_at
      )
    );
  end loop;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,after_data,metadata
  ) values (
    actor_id,
    'athlete_activation_wave.invite_bundle_issued',
    'athlete_activation_wave',
    target_wave_id,
    jsonb_build_object('issued_count',invite_count,'selected_count',selected_count),
    jsonb_build_object('reason',trim(target_reason),'source','admin_wave_execution')
  );

  return jsonb_build_object(
    'wave_id', target_wave_id,
    'issued_count', invite_count,
    'invites', results
  );
end;
$$;

create or replace function public.issue_athlete_activation_wave_invites(
  target_wave_id uuid,
  target_invites jsonb,
  target_reason text
)
returns jsonb
language sql
set search_path = ''
as $$
  select private.issue_athlete_activation_wave_invites(
    target_wave_id,target_invites,target_reason
  )
$$;

revoke all on function private.activate_athlete_activation_wave(uuid,text) from public,anon;
revoke all on function private.issue_athlete_activation_wave_invites(uuid,jsonb,text) from public,anon;
grant execute on function private.activate_athlete_activation_wave(uuid,text) to authenticated;
grant execute on function private.issue_athlete_activation_wave_invites(uuid,jsonb,text) to authenticated;
revoke all on function public.activate_athlete_activation_wave(uuid,text) from public,anon;
revoke all on function public.issue_athlete_activation_wave_invites(uuid,jsonb,text) from public,anon;
grant execute on function public.activate_athlete_activation_wave(uuid,text) to authenticated;
grant execute on function public.issue_athlete_activation_wave_invites(uuid,jsonb,text) to authenticated;

comment on function public.activate_athlete_activation_wave(uuid,text) is
  'Atomically homologates every selected draft athlete in a fully selected activation wave using the existing athlete activation gate. Selection itself never activates athletes.';
comment on function public.issue_athlete_activation_wave_invites(uuid,jsonb,text) is
  'Atomically issues or renews access invites for selected active unlinked members of a fully selected activation wave. Raw tokens are generated by the application and only hashes are persisted.';
