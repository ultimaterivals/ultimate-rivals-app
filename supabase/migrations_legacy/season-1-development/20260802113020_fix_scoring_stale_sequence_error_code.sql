do $$
declare
  definition text;
begin
  select pg_get_functiondef(
    'private.record_match_rally(uuid,uuid,integer,integer,timestamptz,uuid)'::regprocedure
  ) into definition;
  definition := replace(
    definition,
    'errcode = ''40001''',
    'errcode = ''P0001'''
  );
  if definition not like '%errcode = ''P0001''%' then
    raise exception 'record_match_rally stale sequence guard was not replaced';
  end if;
  execute definition;
end;
$$;
