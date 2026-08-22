# FeyseFit Marketplace Enquiries Release Plan

## Scope

This release introduces the marketplace enquiry workflow and the relationship/project lifecycle fixes validated on staging.

## Feature changes

- Public marketplace enquiry flow replaces immediate linking.
- Customers send limited enquiries to designers.
- Designers can accept or decline enquiries.
- Accepted enquiries create/reactivate the exact customer-designer relationship.
- Designers create projects only for actively linked clients.
- Linked-client project creation now uses a trusted RPC instead of browser-side inserts.
- Project reference images are stored as JSONB.
- Customers can unlink immediately when there is no active project.
- Cancelled, completed, and admin-support projects no longer block unlinking.
- Designer project cancellation is separated from project deletion.
- Designers can delete only closed projects.
- Cancelled/deleted/closed projects disappear from normal active workspaces but remain available for audit where appropriate.
- Admin project detail pages render as support/audit records, not live production workspaces.
- Admin relationship views default to current links and label old links as ended/unlinked.
- Admin recent activity is compacted to the latest snapshot so the dashboard does not grow into an unbounded log wall.

## Database patches included on the feature branch

Apply the matching SQL patches before deploying the marketplace app code to any environment:

- `supabase/patch-marketplace-enquiries.sql`
- `supabase/patch-self-unlink-no-active-project.sql`
- `supabase/patch-safe-designer-project-creation.sql`
- `supabase/patch-project-cancel-delete-controls.sql`
- `supabase/patch-auto-approved-unlink-admin-sync.sql`

Security hardening patches from PR #3 must be applied before or with this release where required by the app code.

## Staging verification summary

Validated manually on FeyseFit Staging:

- Customer can submit a marketplace enquiry.
- Designer receives enquiry.
- Designer can accept and reply.
- Acceptance creates the exact customer-designer relationship.
- Designer can create a project for the linked client.
- Project creation works after cancelled projects.
- Reference image JSONB type mismatch is fixed.
- Designer can cancel a project.
- Cancelled projects clear from normal client/designer workspaces.
- Client can unlink after a project is cancelled.
- No-active-project unlink is auto-approved and visible to admin as an audit event.
- Admin relationships page shows current links by default and labels historical links as ended/unlinked.
- Admin project pages show support/audit records instead of live production workspaces.
- Admin recent activity is compact and limited to a dashboard snapshot.
- Latest Vercel preview build for `feature/marketplace-enquiries` is READY.

## Release blockers before production

Do not merge/deploy to production until these are complete:

1. Production Supabase backup is taken.
2. Production Supabase has the required PR #3 security hardening database patches.
3. Production Supabase has the required PR #4 marketplace enquiry database patches.
4. Production Vercel environment variables are confirmed.
5. Production Supabase Auth security settings are confirmed.
6. Post-deploy smoke test is completed against the production URL.

## Recommended merge order

1. Mark PR #3 ready only after production-prep decision is made.
2. Merge PR #3 into `master`.
3. Retarget PR #4 from `security/hardening-pass` to `master`.
4. Confirm PR #4 remains mergeable and preview is green.
5. Mark PR #4 ready.
6. Merge PR #4.
7. Verify production deployment and smoke test.

## Production smoke test

After production deploy:

- Public marketplace loads while signed out.
- Signup/login works.
- Customer sends enquiry.
- Designer receives and accepts enquiry.
- Designer creates a project for the linked client.
- Project can be cancelled.
- Client can unlink after cancellation.
- Admin sees the unlink audit and relationship state correctly.
- Closed project does not appear in normal active workspaces.
