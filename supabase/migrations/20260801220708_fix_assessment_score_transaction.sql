create or replace function public.create_athlete_assessment(
 target_athlete_id uuid,target_season_id uuid,target_process_id uuid,target_type public.assessment_type,target_scope public.assessment_scope,
 assessment_context text,assessment_notes text,feedback text,is_athlete_visible boolean,scores jsonb
) returns uuid language plpgsql security invoker set search_path='' as $$
declare new_assessment_id uuid; item jsonb;
begin
 if not private.has_any_role(array['admin','operator']::public.app_role[]) then raise exception 'evaluator role required' using errcode='42501'; end if;
 insert into public.athlete_assessments(athlete_id,season_id,leveling_process_id,assessment_type,scope,evaluator_user_id,context,notes,athlete_feedback,athlete_visible,status)
 values(target_athlete_id,target_season_id,target_process_id,target_type,target_scope,auth.uid(),assessment_context,assessment_notes,feedback,is_athlete_visible,'draft') returning id into new_assessment_id;
 for item in select value from jsonb_array_elements(scores) loop
  insert into public.athlete_assessment_scores(assessment_id,criterion_id,score,notes) values(new_assessment_id,(item->>'criterion_id')::uuid,(item->>'score')::smallint,item->>'notes');
 end loop;
 update public.athlete_assessments set overall_score=(select round(avg(score)::numeric,2) from public.athlete_assessment_scores where assessment_id=new_assessment_id),status='submitted' where id=new_assessment_id;
 return new_assessment_id;
end $$;

drop policy sprint5_scores_write on public.athlete_assessment_scores;
create policy sprint5_scores_write on public.athlete_assessment_scores for all to authenticated
using(private.has_any_role(array['admin']::public.app_role[]) or exists(select 1 from public.athlete_assessments a where a.id=assessment_id and a.evaluator_user_id=auth.uid() and a.status='draft'))
with check(private.has_any_role(array['admin']::public.app_role[]) or exists(select 1 from public.athlete_assessments a where a.id=assessment_id and a.evaluator_user_id=auth.uid() and a.status='draft'));
