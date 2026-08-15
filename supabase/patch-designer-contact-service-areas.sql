-- Designer phone/contact and service areas as structured profile fields.
-- Phone is private (not selected by the anonymous marketplace query).
-- Service areas and tagline are public marketplace fields.
-- Also backfills rows whose bio still has the generated onboarding suffix.

alter table public.designer_profiles
  add column if not exists phone text not null default '',
  add column if not exists service_areas text[] not null default '{}'::text[],
  add column if not exists tagline text not null default '';

do $$
declare
  rec record;
  cleaned text;
  extracted_phone text;
  extracted_areas text[];
  service_match text;
  contact_match text;
begin
  for rec in
    select id, bio, phone, service_areas
    from public.designer_profiles
    where bio ~ '(^|\n\n)(Contact: |Service areas: )'
  loop
    cleaned := regexp_replace(rec.bio, E'\r\n', E'\n', 'g');
    extracted_phone := rec.phone;
    extracted_areas := rec.service_areas;

    service_match := (
      regexp_match(
        cleaned,
        '(?:\n\n)?Service areas: ((?:Local fittings|Nationwide delivery|International shipping|Virtual consultations)(?:, (?:Local fittings|Nationwide delivery|International shipping|Virtual consultations))*)\s*$'
      )
    )[1];
    if service_match is not null then
      if extracted_areas is null or cardinality(extracted_areas) = 0 then
        extracted_areas := string_to_array(service_match, ', ');
      end if;
      cleaned := regexp_replace(
        cleaned,
        '(?:\n\n)?Service areas: ((?:Local fittings|Nationwide delivery|International shipping|Virtual consultations)(?:, (?:Local fittings|Nationwide delivery|International shipping|Virtual consultations))*)\s*$',
        ''
      );
    end if;

    contact_match := (regexp_match(cleaned, '(?:\n\n)?Contact: ([^\n]*[0-9][^\n]*)\s*$'))[1];
    if contact_match is not null then
      if extracted_phone is null or btrim(extracted_phone) = '' then
        extracted_phone := btrim(contact_match);
      end if;
      cleaned := regexp_replace(cleaned, '(?:\n\n)?Contact: ([^\n]*[0-9][^\n]*)\s*$', '');
    end if;

    update public.designer_profiles
    set
      phone = coalesce(nullif(btrim(extracted_phone), ''), phone),
      service_areas = coalesce(extracted_areas, service_areas),
      bio = btrim(cleaned),
      updated_at = now()
    where id = rec.id
      and (
        bio is distinct from btrim(cleaned)
        or phone is distinct from coalesce(nullif(btrim(extracted_phone), ''), phone)
        or service_areas is distinct from coalesce(extracted_areas, service_areas)
      );
  end loop;
end $$;
