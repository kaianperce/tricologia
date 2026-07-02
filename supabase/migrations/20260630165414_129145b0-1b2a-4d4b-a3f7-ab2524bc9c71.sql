
create or replace function public.bootstrap_clinic(_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing uuid;
  new_clinic uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select clinic_id into existing from public.clinic_members where user_id = uid limit 1;
  if existing is not null then return existing; end if;

  insert into public.clinics (name) values (coalesce(nullif(trim(_name), ''), 'Minha clínica'))
  returning id into new_clinic;

  insert into public.clinic_members (clinic_id, user_id, role)
  values (new_clinic, uid, 'admin');

  insert into public.user_roles (user_id, role)
  values (uid, 'admin')
  on conflict do nothing;

  return new_clinic;
end;
$$;

grant execute on function public.bootstrap_clinic(text) to authenticated;
