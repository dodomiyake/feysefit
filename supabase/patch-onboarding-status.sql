-- FeyseFit: track post-signup onboarding progress and platform terms acceptance.
-- Run in Supabase SQL Editor after schema / auth patches.

begin;

alter table public.users
  add column if not exists onboarding_status text not null default 'not_started',
  add column if not exists onboarding_step text not null default '',
  add column if not exists onboarding_path text not null default '',
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists setup_checklist jsonb not null default '{}'::jsonb;

do $$ begin
  alter table public.users
    add constraint users_onboarding_status_check
    check (onboarding_status in ('not_started', 'in_progress', 'completed'));
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.users
    add constraint users_onboarding_path_check
    check (
      onboarding_path = ''
      or onboarding_path in ('designer', 'customer_invite', 'customer_direct')
    );
exception
  when duplicate_object then null;
end $$;

-- Existing accounts are treated as already onboarded so login is not disrupted.
update public.users
set
  onboarding_status = 'completed',
  onboarding_completed_at = coalesce(onboarding_completed_at, now()),
  terms_accepted_at = coalesce(terms_accepted_at, now()),
  onboarding_path = case
    when role = 'designer' then 'designer'
    when role = 'customer' then 'customer_direct'
    else ''
  end
where onboarding_status = 'not_started'
  and (
    exists (
      select 1 from public.designer_profiles dp
      where dp.user_id = users.id
        and nullif(trim(dp.business_name), '') is not null
        and nullif(trim(dp.location), '') is not null
    )
    or exists (
      select 1 from public.customer_profiles cp
      where cp.user_id = users.id
        and nullif(trim(cp.location), '') is not null
    )
    or role = 'admin'
    or created_at < now() - interval '1 day'
  );

-- Preserve auth-hardening rules; seed onboarding path for new signups.
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
  v_onboarding_path text;
begin
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  requested_role := lower(trim(coalesce(new.raw_user_meta_data->>'role', 'customer')));

  if requested_role = 'designer' then
    user_role := 'designer';
  else
    user_role := 'customer';
  end if;

  customer_path := new.raw_user_meta_data->>'customer_path';

  if user_role = 'designer' then
    v_onboarding_path := 'designer';
  elsif customer_path = 'direct' then
    v_onboarding_path := 'customer_direct';
  else
    v_onboarding_path := 'customer_invite';
  end if;

  insert into public.users (
    id, email, name, role, onboarding_status, onboarding_path, onboarding_step
  )
  values (
    new.id,
    new.email,
    user_name,
    user_role,
    'not_started',
    v_onboarding_path,
    case
      when user_role = 'designer' then 'professional'
      else 'profile'
    end
  )
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

commit;
