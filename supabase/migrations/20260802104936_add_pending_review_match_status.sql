alter type public.match_status
  add value if not exists 'pending_review' after 'in_progress';
