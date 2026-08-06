create or replace function public.import_athletes_csv(rows jsonb)
returns setof public.athletes language plpgsql security invoker set search_path = '' as $$
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) < 1 or jsonb_array_length(rows) > 500 then
    raise exception 'invalid import batch' using errcode='22023';
  end if;
  return query
  insert into public.athletes(public_name,full_name,birth_date,gender,email_contact,phone,city,state)
  select trim(x.public_name),trim(x.full_name),nullif(x.birth_date,'')::date,
    x.gender::public.gender_type,nullif(lower(trim(x.email_contact)),''),nullif(trim(x.phone),''),
    nullif(trim(x.city),''),nullif(upper(trim(x.state)),'')
  from jsonb_to_recordset(rows) as x(public_name text,full_name text,birth_date text,gender text,email_contact text,phone text,city text,state text)
  returning *;
end $$;
revoke all on function public.import_athletes_csv(jsonb) from public, anon;
grant execute on function public.import_athletes_csv(jsonb) to authenticated;
