alter table public.activity_reservations
  drop constraint if exists activity_reservations_status_check;

alter table public.activity_reservations
  add constraint activity_reservations_status_check
  check (status in (
    'reserved',
    'confirmed',
    'waitlisted',
    'cancelled',
    'checked_in',
    'consumed',
    'no_show'
  ));
