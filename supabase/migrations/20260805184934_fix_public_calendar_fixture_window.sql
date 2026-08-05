-- Keep DEV public calendar fixtures inside the current public read window.

update public.calendar_events
set
  starts_at = case id
    when '71000000-0000-4000-8000-000000000001'::uuid then date_trunc('day', now()) + interval '3 days 18 hours'
    when '71000000-0000-4000-8000-000000000002'::uuid then date_trunc('day', now()) + interval '5 days 19 hours'
    when '71000000-0000-4000-8000-000000000003'::uuid then date_trunc('day', now()) + interval '10 days 9 hours'
    else starts_at
  end,
  ends_at = case id
    when '71000000-0000-4000-8000-000000000001'::uuid then date_trunc('day', now()) + interval '3 days 21 hours'
    when '71000000-0000-4000-8000-000000000002'::uuid then date_trunc('day', now()) + interval '5 days 20 hours 30 minutes'
    when '71000000-0000-4000-8000-000000000003'::uuid then date_trunc('day', now()) + interval '10 days 15 hours'
    else ends_at
  end,
  updated_at = now()
where id in (
  '71000000-0000-4000-8000-000000000001'::uuid,
  '71000000-0000-4000-8000-000000000002'::uuid,
  '71000000-0000-4000-8000-000000000003'::uuid
);
