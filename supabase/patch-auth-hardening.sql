-- Harden signup: never assign admin via client metadata; preserve role on profile conflict
-- Run in Supabase SQL editor

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_name text;
  user_role public.user_role;
  customer_path text;
  requested_role text;
begin
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  requested_role := lower(trim(coalesce(new.raw_user_meta_data->>'role', 'customer')));

  if requested_role = 'designer' then
    user_role := 'designer';
  else
    user_role := 'customer';
  end if;

  customer_path := new.raw_user_meta_data->>'customer_path';

  insert into public.users (id, email, name, role)
  values (new.id, new.email, user_name, user_role)
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        updated_at = now();

  if user_role = 'designer' then
    insert into public.designer_profiles (
      user_id, business_name, designer_name, location, specialty, bio, cover_image, profile_image
    )
    values (new.id, user_name || ' Atelier', user_name, '', 'Bespoke', '', '', '')
    on conflict (user_id) do nothing;
  elsif user_role = 'customer' then
    insert into public.customer_profiles (user_id, name, email, registration_type)
    values (
      new.id,
      user_name,
      new.email,
      case
        when customer_path = 'direct' then 'direct'::public.registration_type
        else 'invited'::public.registration_type
      end
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
