# DEV SPEC — NexLet Agency Portal (`agent.html`)

Turns the agent front-end (`agent.html`, currently local-state) into a live multi-landlord app on the **existing Supabase backend** (same project as `landlord.html` / `tenant.html`). The UI, flows and data shapes are already final in `agent.html` — this spec is the backend + auth glue.

---

## 1. The core architectural change: an Agency → Landlords → Properties hierarchy

Today the schema assumes **one user = one landlord**. Agency mode adds an **agency layer above** that owns many landlords. The cleanest model that reuses everything:

```
agencies (id, owner_user_id, name, redress_scheme, redress_no, cmp_scheme, cmp_no)
landlords (id, agency_id, name, email, phone, address,
           aml_verified bool, ownership_verified bool,
           service text check (service in ('full','letonly')),
           agreement_signed bool, status text, user_id nullable)  -- user_id = optional landlord login (Phase 2)
properties  → ADD COLUMN agency_id (nullable), landlord_id  -- existing table, now linkable to an agency-managed landlord
references (id, agency_id, applicant, property_id, income int,
            docs jsonb, credit_ref text, status text, note text)
tenancies  (id, agency_id, who, property_id, stage text)  -- pipeline stages: instructed|marketing|referencing|contract|movein|managed
```

Reuse the **existing** `properties`, `tenants`, `certificates`, `documents`, e-sign and inventory tables unchanged — they just gain an `agency_id` so an agent can operate them on a landlord's behalf. A self-serve landlord (no agency) keeps working exactly as now (`agency_id` null).

---

## 2. Auth & roles

- The agent logs in with a normal Supabase auth user whose id = `agencies.owner_user_id`.
- Add a lightweight role concept: a user is an **agent** if they own an `agencies` row.
- **Phase 2 (landlord login):** a managed landlord can be invited — `landlords.user_id` links their auth account; they get a **read-only** view of their own properties/certs/rent. Tenants keep the existing tenant portal unchanged.

---

## 3. RLS (the security that makes this safe — non-negotiable)

Every agency table must be walled to its owner; managed records must be reachable by the agent but isolated from other agencies.

```sql
-- agencies: owner only
create policy agency_owner on agencies
  for all using (owner_user_id = auth.uid());

-- landlords / references / tenancies: belong to the agent's agency
create policy agency_scoped on landlords
  for all using (agency_id in (select id from agencies where owner_user_id = auth.uid()));
-- (repeat the same predicate for references, tenancies)

-- properties/tenants/certificates: existing owner policy OR the managing agency
create policy prop_owner_or_agency on properties
  for all using (
    user_id = auth.uid()
    OR agency_id in (select id from agencies where owner_user_id = auth.uid())
  );
-- (extend the existing policies on tenants/certificates/documents the same way)

-- Phase 2 landlord read-only: a landlord sees only their own rows
create policy landlord_readonly on properties
  for select using (landlord_id in (select id from landlords where user_id = auth.uid()));
```

**Test matrix:** Agency A cannot read Agency B's landlords/properties/references; a managed landlord (Phase 2) can read only their own and cannot write; a self-serve landlord is unaffected.

---

## 4. Wiring `agent.html` to the backend

`agent.html` keeps all state in an `S` object persisted to `localStorage` (key `nexlet_agency_v1`). To go live, replace the local read/write with Supabase calls — the shapes already match the tables above:

- `load()` → `select` from `agencies` (single), `landlords`, `properties`, `references`, `tenancies` scoped by `agency_id`.
- `save()` paths → targeted `insert`/`update` instead of dumping the whole `S` to localStorage:
  - `obFinish()` → insert `landlords` (+ `properties`, `tenancies`) rows.
  - `saveReference()` → upsert `references`.
  - `advance()` → update `tenancies.stage`.
  - `signAgreement()` / onboarding step 6 → trigger the **existing e-sign engine** for the Management Agreement + Terms of Business, then set `agreement_signed` on the webhook return.
  - `saveSettings()` → update `agencies`.

Keep the local-state version working behind a flag for demos.

---

## 5. Referencing — what's in-house vs partner (legal split)

- **In-house (no licence):** document collection (ID, Right-to-Rent share code, proof of income, employer & previous-landlord references), the **affordability test** (income ≥ 30× monthly rent — already computed in `vReferencing`/`renderReference`), and the overall pass/caution/fail decision. All legal for an agent to do.
- **Partner (regulated):** the **credit search** (CCJs, score) and **Open Banking** income verification require an FCA-authorised referencing provider / CRA. v1 = run it in the partner's portal and record the reference in `references.credit_ref`. v2 = API integration (Vouch / FCC Paragon / HomeLet / Van Mildert; ~£15–25/tenant, usually passed to the landlord). The `references.credit_ref` field + status are the integration seam.

---

## 6. Legal/compliance flags already surfaced in the UI (keep them)

- **Redress scheme** (TPO or PRS) — mandatory for all letting agents; captured in Agency Settings and shown in the sidebar. Must appear on agency paperwork.
- **CMP** — only required if holding client money. The app is deliberately set to **tenant-pays-landlord-direct (no client money)**, so CMP stays off. If the agency later collects rent, this flips on and a CMP scheme + dedicated client account become mandatory.
- **AML/ID** on landlords (onboarding step 2) and applicants (referencing) — keep as gating checks.

---

## 7. Build order
1. Tables + RLS (§1, §3) + agent auth (§2).
2. Swap `agent.html` load/save to Supabase (§4).
3. Management-agreement e-sign via existing engine (§4).
4. Phase 2: landlord read-only portal (§2, §3).
5. Phase 2: referencing partner API (§5).
