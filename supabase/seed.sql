-- FeyseFit seed data (run AFTER schema.sql and AFTER creating auth users)
-- Replace these UUIDs with your auth.users ids from the Supabase dashboard.

-- Example: set these from Authentication → Users
-- \set designer_user_id '...'
-- \set customer_user_id '...'
-- \set admin_user_id '...'

-- For manual seeding without psql variables, edit the UUIDs below.

-- Designer profile (legacy_id '1' = Adaeze)
insert into public.designer_profiles (
  legacy_id, user_id, business_name, designer_name, location, specialty, bio,
  rating, review_count, cover_image, profile_image, marketplace_live
)
select
  '1',
  u.id,
  'Adaeze Atelier',
  'Adaeze Okonkwo',
  'Lagos, Nigeria',
  'Bridal & Aso-Ebi',
  'Luxury bespoke designer specialising in Nigerian wedding couture.',
  4.9,
  128,
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
  true
from public.users u
where u.email = 'adaeze@adaezeatelier.com'
on conflict (legacy_id) do nothing;

-- Customer profile (legacy_id '1' = Chioma)
insert into public.customer_profiles (
  legacy_id, user_id, name, location, email, project_count, registration_type
)
select
  '1',
  u.id,
  'Chioma Adeyemi',
  'Manchester, UK',
  'chioma.a@email.com',
  2,
  'invited'
from public.users u
where u.email = 'chioma.a@email.com'
on conflict (legacy_id) do nothing;

-- Link Chioma to Adaeze
insert into public.designer_customer_relationships (designer_id, customer_id, registration_type)
select d.id, c.id, 'invited'
from public.designer_profiles d, public.customer_profiles c
where d.legacy_id = '1' and c.legacy_id = '1'
on conflict (designer_id, customer_id) do nothing;

-- Sample project
insert into public.projects (
  legacy_id, project_code, palette_id, title, customer_name, customer_id, designer_id,
  outfit_type, deadline, budget, status, reference_images, customer_update, internal_notes,
  measurements, last_updated
)
select
  '1',
  'FF-2401',
  'emerald-gala',
  'Emerald Gala Gown',
  'Chioma Adeyemi',
  c.id,
  d.id,
  'Evening Gown',
  'Aug 15, 2026',
  '£3,500',
  'In Production',
  '[]'::jsonb,
  'Silk swatches approved — moving to final fitting.',
  'Prioritise hand embroidery on bodice.',
  '{"chest":"38\"","waist":"32\"","hips":"42\"","height":"5''7\""}'::jsonb,
  'Jun 28, 2026'
from public.designer_profiles d, public.customer_profiles c
where d.legacy_id = '1' and c.legacy_id = '1'
on conflict (legacy_id) do nothing;

-- Customer measurement profile
insert into public.measurements (customer_id, unit, preferred_fit, status, values, updated_at)
select c.id, 'inches', 'regular', 'submitted',
  '{"chest":"38\"","waist":"32\"","hips":"42\"","height":"5''7\""}'::jsonb,
  'Jun 28, 2026'
from public.customer_profiles c
where c.legacy_id = '1'
on conflict do nothing;

-- Sample messages on project
insert into public.messages (project_id, sender_role, sender_name, text, timestamp_label)
select p.id, 'customer', 'Chioma Adeyemi',
  'Hello Adaeze, I love the draping — can we consider a slightly more muted gold for the embroidery?',
  '10:15 AM'
from public.projects p where p.legacy_id = '1';

insert into public.messages (project_id, sender_role, sender_name, text, timestamp_label)
select p.id, 'designer', 'Adaeze Okonkwo',
  'Absolutely. I have Champagne Dust and Antiqued Brass thread options — sketches attached.',
  '10:20 AM'
from public.projects p where p.legacy_id = '1';

-- Pending marketplace listing (designer 2) and unlink request samples can be added similarly.
