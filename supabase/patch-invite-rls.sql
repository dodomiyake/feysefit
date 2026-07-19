-- Tighten invite_codes RLS and add safe public lookup by code
-- Run in Supabase SQL editor

drop policy if exists "invites_read_by_code" on public.invite_codes;

-- Designers and admins retain full access via invites_designer_manage

create or replace function public.lookup_invite_code(invite_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  invite_row public.invite_codes%rowtype;
  designer_row public.designer_profiles%rowtype;
begin
  normalized := upper(trim(invite_code));
  if normalized = '' then
    return null;
  end if;

  select * into invite_row
  from public.invite_codes
  where code = normalized;

  if not found then
    return null;
  end if;

  select * into designer_row
  from public.designer_profiles
  where id = invite_row.designer_id;

  return json_build_object(
    'id', invite_row.id,
    'legacy_id', invite_row.legacy_id,
    'code', invite_row.code,
    'name', invite_row.name,
    'project_type', invite_row.project_type,
    'sent_at', invite_row.sent_at,
    'sent_ago', invite_row.sent_ago,
    'status', invite_row.status,
    'designer_name', coalesce(designer_row.designer_name, designer_row.business_name, 'Your designer'),
    'business_name', coalesce(designer_row.business_name, ''),
    'designer_legacy_id', coalesce(designer_row.legacy_id, designer_row.id::text)
  );
end;
$$;

revoke all on function public.lookup_invite_code(text) from public;
grant execute on function public.lookup_invite_code(text) to anon, authenticated;
