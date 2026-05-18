# Developer Note – Believe Nonprofit Barter Network (NNBN)

**For Ash** – Implementation status and next steps.

---

## What’s in this codebase (schema + controller outline)

- **Access:** Nonprofit-only. Gate: EIN validated, KYB approved, board officer on file, Bridge connected, admin approved (`registration_status = approved`).
- **Purpose:** Nonprofit-to-nonprofit barter + Believe Points (direct barter, points, or hybrid). Points settle value differences; no Stripe, no fiat.
- **Flow:** A requests B’s listing (with A’s return listing + optional extra points) → B accepts / chooses alternate return listing / counters / rejects → auto point settlement on accept → fulfillment → completion (ratings later).

---

## Implemented (ready for you)

### 1. Migrations

- **`nonprofit_barter_listings`** – `nonprofit_id`, `title`, `description`, `points_value`, `barter_allowed`, `requested_services` (JSON), `status` (active/paused/completed).
- **`nonprofit_barter_transactions`** – `requesting_nonprofit_id`, `responding_nonprofit_id`, `requested_listing_id`, `return_listing_id` (nullable until B chooses), `points_delta` (signed: >0 A pays B, <0 B pays A), `status`, `accepted_at`, `completed_at`, `dispute_flag`.
- **`nonprofit_barter_offers`** – counter-offers: `transaction_id`, `proposer_nonprofit_id`, `proposed_return_listing_id`, `proposed_points_delta`, `message`, `status`.
- **`nonprofit_barter_settlements`** – audit ledger: `transaction_id`, `from_organization_id`, `to_organization_id`, `points`. No Stripe; internal debit/credit only.

All FKs point to `organizations` (nonprofits). Index names kept short for MySQL.

### 2. Models

- `NonprofitBarterListing`, `NonprofitBarterTransaction`, `NonprofitBarterOffer`, `NonprofitBarterSettlement`.
- `Organization` has `barterListings()`, `barterTransactionsRequested()`, `barterTransactionsResponding()`.

### 3. Middleware

- **`barter.access`** – Ensures: auth, role organization/organization_pending, org linked to user, EIN present, Bridge connected, KYB approved, at least one active board member, `registration_status = approved`. Sets `barter_organization` on the request.

### 4. Controllers (outline; no UI yet)

- **`Barter\BarterNetworkController`** (all behind `auth` + `barter.access`):
  - `marketplace` – browse listings (filter by category), view points value.
  - `myListings` / `storeListing` / `updateListing` – create/edit/pause listings.
  - `requestTrade` – A sends request (requested_listing_id, return_listing_id, optional extra_points).
  - `incomingRequests` – B’s pending requests.
  - `acceptRequest` – B accepts (optional alternate return listing); point settlement runs; acceptance blocked if payer would go negative.
  - `rejectRequest` – B rejects.
  - `activeTrades` – accepted / in_fulfillment.
  - `tradeHistory` – completed.
  - `pointsWallet` – read-only balance (org’s user `believe_points`).
  - `reputation` – stub for Phase 2 ratings.

- **`Admin\BarterAuditController`** – List transactions; show both nonprofits, both listings, settlement delta, points ledger entries, status, dispute flag. Audit-critical.

### 5. Point settlement

- **`BarterPointSettlementService`** – `computeDelta(requestedListing, returnListing)`, `canSettle(transaction)`, `settle(transaction)`. Uses `User.believe_points` (org’s user); writes `nonprofit_barter_settlements` for audit. No negative balances; acceptance blocked if payer lacks points.

### 6. Routes

- **Barter (nonprofit):** `/barter/*` – marketplace, my-listings, listings store/update, request-trade, incoming-requests, transactions accept/reject, active-trades, trade-history, points-wallet, reputation. All under `barter.access`.
- **Admin:** `/admin/barter`, `/admin/barter/{transaction}` – audit list and detail.

---

## Guardrails (as per Ken)

- nonprofit_id only (no user_id in barter tables; org resolved via middleware).
- No cash fields.
- Points cannot go negative (checked before accept; ledger + user balance).
- KYB gate in middleware + controller checks.
- Every settlement in `nonprofit_barter_settlements` (transaction_id referenced).
- Admin override capability: admin can see all; dispute flag on transaction.

---

## MVP only (do not build yet)

- AI matching, escrow, DAO disputes, NFT receipts.

---

## Next steps for you

1. **UI (Inertia pages)** – Build the views referenced by the controller:
   - `barter/marketplace`, `barter/my-listings`, `barter/incoming-requests`, `barter/active-trades`, `barter/trade-history`, `barter/points-wallet`, `barter/reputation`.
   - Request Trade modal: pick return listing, preview point difference.
   - Incoming request: Accept / Counter / Reject, select alternate return listing.
2. **Counter-offers** – Use `nonprofit_barter_offers` when B counters (proposed return listing / points); wire into `acceptRequest` or a dedicated counter flow.
3. **Fulfillment / completion** – Move status from `accepted` → `in_fulfillment` → `completed`; optional ratings and reputation (Phase 2).
4. **Admin UI** – `admin/barter/audit` and `admin/barter/audit-show` for the audit views.

---

## Quick reference

- **Nonprofits** = `organizations` (EIN, Bridge/KYB, board, `registration_status`).
- **Believe Points** = `users.believe_points` (org’s primary user); barter settlements also recorded in `nonprofit_barter_settlements`.

Migrations are run. Controllers and routes are in place. You can start wiring UI and any counter-offer/fulfillment flows when ready.
