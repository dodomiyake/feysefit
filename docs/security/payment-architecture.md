# Payment security design (not implemented)

FeyseFit must not collect card numbers, CVC, bank account numbers, or Stripe identity documents in Supabase. This document is the payment-ready architecture only. **Do not add Checkout or Connect until this design is implemented and reviewed.**

## Checkout

- Use **Stripe-hosted Checkout Sessions** (or Stripe-hosted embedded Checkout). The browser never sees a Stripe secret key.
- Create sessions on a trusted Next.js route using a **restricted secret key** stored only in server environment variables.
- Success/cancel URLs are UX only. **Webhook events are payment truth**, not the browser redirect.
- Verify webhook signatures against the **raw request body**. Do not `JSON.parse` before verification.
- Persist Stripe `event.id` and reject duplicates (idempotent processing).

## Connect (designer payouts)

- Use current Stripe Connect **Accounts v2** patterns.
- Designers complete **hosted or embedded Stripe onboarding**. FeyseFit stores only the Stripe account id, not identity documents.
- Decide merchant-of-record before launch:
  - Platform MoR: FeyseFit is the seller; designers are suppliers; platform takes dispute liability.
  - Designer MoR (destination charges / separate charges): designer is the seller; platform fee is an application fee; dispute liability follows Stripe’s Connect model for that charge type.
- Document platform fees and who funds refunds/chargebacks **before** the first live charge.

## Keys

- Separate test and production keys.
- Restricted keys for runtime (Checkout session create, refund, Connect account read) with the minimum Connect/Checkout permissions.
- Never expose secret or restricted keys to browser bundles (`NEXT_PUBLIC_*` is forbidden for Stripe secrets).

## Administration

- Refunds, payout destination changes, and Connect account unlinking require **admin AAL2** plus recent step-up reauthentication (`REAUTH_MAX_AGE_MS`).
- Write audit rows for refunds, payout changes, and payment-state transitions (no PAN/CVC in logs).

## Data that must not be stored in Supabase

- Card numbers, CVC, full magnetic-stripe data
- Bank account / routing numbers
- Stripe identity document images or government ID scans
- Unmasked customer tax IDs beyond what Stripe already stores

Store only Stripe object ids, payment status, amount, currency, and non-sensitive metadata required for support.
