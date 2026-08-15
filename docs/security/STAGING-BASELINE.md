# FeyseFit staging baseline

The historical production database has no entries in
`supabase_migrations.schema_migrations`. Do not assume Supabase can recreate it
from migration history, and do not copy production rows into staging.

For a new empty Supabase project, apply these files from
`security/hardening-pass` in the order below. This sequence was verified on the
isolated FeyseFit Staging project (`zopddfvabkxtnpzwusxe`) on 2026-08-15.

## Baseline

1. `supabase/schema.sql`
2. `supabase/storage.sql`
3. `supabase/patch-bootstrap.sql`
4. Re-run `supabase/schema.sql`

## Historical feature reconciliation

1. `patch-user-preferences.sql`
2. `patch-customer-phone.sql`
3. `patch-customer-style-notes.sql`
4. `patch-customer-profile-image.sql`
5. `patch-designer-years-experience.sql`
6. `patch-designer-marketplace-fields.sql`
7. `patch-marketplace-live.sql`
8. `patch-relationship-registration.sql`
9. `patch-relationships-is-active.sql`
10. `patch-studio-clients.sql`
11. `patch-studio-client-references.sql`
12. `patch-local-customers-mvp.sql`
13. `patch-project-status-enum.sql`
14. `patch-testimonials.sql`
15. `patch-post-delivery-flow.sql`
16. `patch-redelivered-status.sql`
17. `patch-appointment-model.sql`
18. `patch-appointments-setup.sql`
19. `patch-appointment-dates.sql`
20. `patch-availability-calendar-rpc.sql`
21. `patch-appointment-customer-booking.sql`
22. `patch-admin-studio-ops.sql`
23. `patch-customer-fabric-selection.sql`
24. `patch-invite-rls.sql`
25. `patch-invite-link.sql`
26. `patch-invite-accept.sql`
27. `patch-marketplace-request-rls.sql`
28. `patch-messaging-realtime.sql`
29. `patch-projects-realtime.sql`
30. `patch-designer-update.sql`
31. `patch-measurement-submit.sql`
32. `patch-user-profile-image.sql`
33. `patch-admin-profile-notes.sql`
34. `patch-admin-team.sql`
35. `patch-admin-realtime.sql`
36. `patch-account-moderation.sql`
37. `patch-auth-hardening.sql`
38. `patch-storage-message-files.sql`
39. `patch-storage-private.sql`
40. `patch-rls-anti-poaching.sql`
41. `patch-customer-delivery-confirm.sql`
42. `patch-enable-rls-all-tables.sql`
43. `patch-designer-authorized-relationship.sql`
44. `patch-storage-security.sql`
45. `patch-security-events.sql`
46. `patch-account-security.sql`
47. `patch-approve-unlink-clear-link.sql`
48. `patch-marketplace-link-rpc.sql`
49. `patch-designer-project-create-rls.sql`
50. `patch-project-items.sql`
51. `patch-project-status-unlink-terminal.sql`
52. `patch-unlink-archive-messaging.sql`
53. `patch-onboarding-status.sql`
54. `patch-marketplace-admin-approval.sql`
55. `patch-designer-contact-service-areas.sql`

## Security hardening

Continue with `docs/security/APPLY-ORDER.md`. Do not run `seed.sql` for
security verification. Create disposable test identities only inside
rollback-only test transactions.

## Required comparison

Before application testing, compare production and staging metadata—not rows:

- public base-table names and column sets
- enum labels
- view writability
- RLS policy count and role targets
- function signatures and EXECUTE grants
- storage bucket names and public/private flags

A mismatch is a hard stop. Never compensate by copying production user data.
