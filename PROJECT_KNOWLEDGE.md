# PROJECT_KNOWLEDGE.md
## RentSafeAI — Agent Initialization Reference

> **Purpose:** Single point of truth for any agentic AI coding agent working on this project.
> Read this file first before making any changes. Update it as new features are added or
> architectural decisions are made.

---

## Table of Contents

1. [Project Overview & Business Purpose](#1-project-overview--business-purpose)
2. [Tech Stack](#2-tech-stack)
3. [Repository & File Structure](#3-repository--file-structure)
4. [Database Schema](#4-database-schema)
5. [Supabase Configuration](#5-supabase-configuration)
6. [Edge Functions](#6-edge-functions)
7. [Email Alert System (Sprint 10)](#7-email-alert-system-sprint-10)
8. [Deployment Configuration](#8-deployment-configuration)
9. [Key Business Logic](#9-key-business-logic)
10. [Known Issues & Technical Debt](#10-known-issues--technical-debt)
11. [Pricing & Plans](#11-pricing--plans)
12. [Code Standards & Maintainability](#12-code-standards--maintainability)
13. [Feature Change Log](#13-feature-change-log)
14. [Stripe Integration Guide](#14-stripe-integration-guide)

---

## 1. Project Overview & Business Purpose

**RentSafeAI** is a UK landlord SaaS platform designed to help private landlords stay legally compliant, manage properties efficiently, and prepare for upcoming Making Tax Digital (MTD) obligations.

**Live URL:** https://rentsafeai.co.uk
**GitHub:** https://github.com/sddhawan79-lang/rentsafeai
**Target market:** UK private landlords (particularly those with 1–10 properties)

### Core Value Propositions
- **Compliance tracking** — Gas Safety, EICR, EPC certificates with RAG (Red/Amber/Green) status
- **Maintenance management** — Kanban board with Awaab's Law enforcement (damp/mould deadlines)
- **Legal document generation** — Section 8 notices (all 31 RRA 2025 grounds), S13 rent increase, AST, inspection reports
- **Making Tax Digital (MTD)** — Quarterly submission tracking, Section 24 calculator, HMRC phase timeline
- **Tenant portal** — Token-based no-login access for tenants to report issues, view jobs, download certificates, e-sign documents
- **Email alerts** — 8 automated alert types delivered via Resend, deduplicated via `email_log`
- **AI assistant** — Claude-powered chat for landlord questions + AI maintenance priority classification

### Regulatory Context
- **Renters Rights Act 2025 (RRA 2025)** — All Section 8 grounds implemented (31 grounds, Housing Act 1988 Schedule 2 as amended 1 May 2026)
- **Awaab's Law** — Damp/mould issues open 14+ days trigger critical alerts
- **MTD for Income Tax (ITSA)** — Phase 1: Apr 2026 (>£50k), Phase 2: Apr 2027 (>£30k), Phase 3: Apr 2028 (>£20k)
- **Section 24 mortgage interest restriction** — Tax calculator built into MTD module

### Founder
Saurabh Dhawan (featured on landing page, `index.html` founder story section)

---

## 2. Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Language | Vanilla HTML5 / CSS3 / JavaScript (ES6+) — **no framework, no bundler** |
| CSS approach | Custom CSS variables, inline styles; `mtd.html` also uses Tailwind via CDN |
| Fonts | Google Fonts: `DM Serif Display` (headings), `DM Sans` (body) |
| Icons | Inline SVGs only — no icon library dependency |
| Supabase client | `@supabase/supabase-js` v2.39.3 via jsDelivr CDN |

### Backend / Third-Party Services
| Service | Purpose | Config location |
|---|---|---|
| **Supabase** | PostgreSQL database, Auth, Edge Functions, Storage, RLS | Hardcoded in HTML files |
| **Resend** | Transactional email (`documents@rentsafeai.co.uk`) | Edge Function secret `RESEND_API_KEY` |
| **Stripe** | Subscription billing for Starter/Landlord/Portfolio plans | Edge Function secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs |
| **Anthropic Claude** (`claude-sonnet-4-5`) | AI chat assistant + maintenance priority classification | `super-processor` edge function |
| **Formspree** (`xdapbzqv`) | Waitlist email capture on landing page | Inline in `index.html` |
| **Crisp** (ID: `6a5c5215-3c14-4afa-94a4-f1f8b05e2f62`) | Live chat widget | `index.html`, `login.html`, `tenant.html`, `mtd.html` |
| **signature_pad** v4.1.7 | E-signature canvas on tenant portal | CDN in `tenant.html` |
| **jsPDF** v2.5.1 | PDF generation in tenant portal + landlord document downloads (Session 9) | CDN in `tenant.html`, `landlord.html` |
| **GitHub Pages** | Static hosting with custom domain (`rentsafeai.co.uk`) | `CNAME` file |
| **Deno** | Runtime for all Supabase Edge Functions | Supabase managed |
| **pg_cron + pg_net** | Scheduled jobs within Supabase | `sprint10_step2_cron.sql` |

---

## 3. Repository & File Structure

> There is **no build step, no `node_modules`, no `package.json`, no `src/` folder**.
> All files live at the repository root and are served directly by GitHub Pages.

```
rentsafeai/
├── index.html                      Marketing landing page
├── login.html                      Auth page (login / signup / password reset)
├── signup.html                     Sign-up page (Sprint 11)
├── profile.html                    Account & Billing page (Sprint 13)
├── landlord.html                   Main SPA app (~10,070 lines) — entire landlord dashboard
├── tenant.html                     Tenant portal (~1,200+ lines)
├── esign.html                       Standalone e-sign page — landlord signs first, tenant counter-signs
├── mtd.html                        Making Tax Digital standalone page (~1,500+ lines)
├── app-mockup.html                 Static dashboard preview (iframe on landing page)
├── privacy.html                    Privacy policy
├── terms.html                      Terms of service
├── complaints.html                 Complaints policy (Session 8)
├── ai-disclaimer.html              AI liability disclaimer standalone page (Session 8)
├── cookies.html                    Cookie policy
├── dpa.html                        GDPR / Data Protection Act page
├── nav_snippet.html                Dev snippet: MTD nav item code (copy-paste reference)
├── og-image.png                    OpenGraph social share image (1200×630)
├── CNAME                           GitHub Pages custom domain: rentsafeai.co.uk
├── email-alerts-index.ts           Supabase Edge Function source (Sprint 10)
├── stripe-checkout-index.ts        Supabase Edge Function source (Sprint 13)
├── stripe-webhook-index.ts         Supabase Edge Function source (Sprint 13)
├── mtd_tables.sql                  SQL migration: MTD tables
├── sprint10_step1_db.sql           SQL migration: Sprint 10 DB setup
├── sprint10_step1_fix.sql          SQL migration: Sprint 10 patch/fix
├── sprint10_step2_cron.sql         SQL: pg_cron scheduled jobs
├── sprint13_db.sql                 SQL migration: Sprint 13 (user_profiles, stripe_subscriptions)
├── session7_tenant_documents.sql   SQL migration: Session 7 (tenant_documents table + RLS) — run in Supabase SQL Editor
├── session10_multi_doc.sql          SQL migration: Session 10 (multi-doc KYC — drop slot unique, add columns)
├── SPRINT10_DEPLOY.md              Sprint 10 deployment guide
├── PROJECT_KNOWLEDGE.md            THIS FILE — agent initialization reference
├── fix.b64                         Binary patch (base64 encoded)
└── fix.patch                       Git patch file
```

> **`supabase/functions/ai-proxy/index.ts` now exists** (created Session 6).
> Other edge function sources remain as loose `.ts` files at the repo root.
> Deploy command: `npx supabase functions deploy <name> --project-ref mahtcfukgzbonwibtsxz`

### HTML File Responsibilities

| File | Purpose | Auth required |
|---|---|---|
| `index.html` | Marketing: hero, pricing, features, founder, FAQ | None |
| `login.html` | Supabase email+password + Google OAuth + password reset | None |
| `signup.html` | Account creation with password strength meter | None |
| `profile.html` | Account details, personal info, Stripe subscription management | Yes — redirects to `login.html` |
| `landlord.html` | Full landlord SPA — all dashboard modules | Yes — redirects to `login.html` |
| `tenant.html` | Tenant portal — token-based, no Supabase auth needed | Token in URL or localStorage |
| `esign.html` | Standalone e-sign page — landlord initiates, tenant counter-signs, both get full PDF | Token in URL + design token |
| `mtd.html` | MTD tax module — standalone (Tailwind CSS) | Yes — uses Supabase session |

---

## 4. Database Schema

> All tables use PostgreSQL via Supabase. All have Row Level Security (RLS) enabled.
> No local migration tooling — all schema changes are run manually in Supabase SQL Editor.

### Core Tables

#### `properties`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | Supabase auth user |
| `address`, `city`, `postcode`, `country` | text | |
| `type` | text | Property type |
| `beds`, `bathrooms` | int | |
| `rent` | numeric | Monthly rent (£) |
| `score` | numeric | Compliance score |
| `purchase_price`, `current_value` | numeric | Portfolio valuation |
| `ownership_type` | text | Personal / Limited Co |
| `mortgage_outstanding` | numeric | |
| `licence_type` | text | HMO, selective, etc. |
| `epc_rating` | text | A–G |

#### `tenants`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | Landlord's Supabase user |
| `prop_id` | uuid FK | → properties |
| `name`, `email`, `phone` | text | |
| `start_date`, `end_date` | date | Tenancy period |
| `rent`, `deposit` | numeric | |
| `deposit_scheme` | text | TDS / DPS / MyDeposits |
| `status` | text | `active`, `revoked` |
| `invite_token` | text | **Unique token for tenant portal URL** |
| `landlord_email` | text | For portal email display |

#### `certificates`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `prop_id` | uuid FK | → properties |
| `type` | text | Certificate category (legacy column) |
| `cert_type` | text | Certificate category (canonical) |
| `status` | text | `valid`, `expired`, `due` |
| `expiry`, `expiry_date` | date | Both columns exist |
| `has_file` | boolean | Whether a file is in Storage |

#### `maintenance`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `prop_id` | uuid FK | |
| `user_id` | uuid FK | Landlord |
| `title`, `description` | text | |
| `cat` | text | Category |
| `priority` | text | low / medium / high / critical |
| `status` | text | Kanban stage |
| `stage` | text | |
| `issue_date` | date | |
| `awaab` | boolean | Awaab's Law flag |

#### `rent_payments`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `prop_id`, `user_id` | uuid FK | |
| `amount` | numeric | |
| `due_date`, `paid_date` | date | |
| `status` | text | `paid`, `overdue`, `pending` |

#### `tenant_maintenance`
Maintenance jobs submitted via the tenant portal (token-based, no auth).
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `tenancy_ref` | text | Invite token used for lookup |
| `prop_id` | uuid FK | |
| `user_id` | uuid | Landlord user ID |
| `description` | text | |
| `category`, `priority` | text | Tenant-entered |
| `ai_priority` | text | Claude-classified priority |
| `status` | text | |
| `locked` | boolean | Prevents editing after submission |
| `submitted_at` | timestamptz | |
| `photos` | text[] | Supabase Storage paths |
| `completion_notes`, `completion_contractor` | text | |
| `resolved_at` | timestamptz | |

#### `email_log`
Deduplication table for all outgoing alerts.
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `landlord_id` | uuid FK | |
| `alert_type` | text | One of 8 types |
| `reference_key` | text | Deterministic dedup key |
| `recipient_email` | text | |
| `sent_at` | timestamptz | |
| `metadata` | jsonb | Extra context |

**Unique index:** `(landlord_id, alert_type, reference_key)` — prevents duplicate sends.

#### `user_profiles` (Sprint 13)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Matches `auth.users(id)` — one row per user |
| `full_name` | text | |
| `phone` | text | |
| `company_name` | text | For limited company landlords |
| `address` | text | Personal/billing address |
| `utr_number` | text | 10-digit HMRC Unique Taxpayer Reference |
| `created_at`, `updated_at` | timestamptz | |

#### `stripe_subscriptions` (Sprint 13)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK UNIQUE | → `auth.users` — one row per user |
| `stripe_customer_id` | text | Stripe Customer ID (`cus_...`) |
| `stripe_subscription_id` | text | Stripe Subscription ID (`sub_...`) |
| `stripe_price_id` | text | Stripe Price ID (`price_...`) |
| `plan_name` | text | `starter` \| `landlord` \| `portfolio` |
| `status` | text | `active` \| `trialing` \| `past_due` \| `canceled` \| `incomplete` |
| `current_period_start`, `current_period_end` | timestamptz | |
| `cancel_at_period_end` | boolean | True if user has requested cancellation |
| `created_at`, `updated_at` | timestamptz | |

**RLS:** Users can SELECT their own row. INSERT/UPDATE is service-role only (webhook).

#### Other Core Tables
| Table | Purpose |
|---|---|
| `insurance` | Per-property insurance policies (`provider`, `expiry`) |
| `property_insurance` | Per-property insurance with `expiry_date` (Sprint 10 addition) |
| `contractors` | Contractor directory (`name`, `trade`, `phone`, `email`) |
| `job_assignments` | Links maintenance jobs to contractors |
| `custom_templates` | User-defined document templates |
| `audit_log` | Action audit trail (`action`, `table_name`, `record_id`, `details`) |
| `checklist_progress` | Inspection checklist state per property |
| `meter_readings` | Gas/electric meter readings |
| `esign_requests` | E-signature requests with `token` for tenant portal |
| `tenant_documents` | Tenant KYC documents — passport, RTR, address proofs, references, guarantor. **Multiple docs per slot** (unique index removed Session 10). AI-scanned via Claude with `issuing_authority` + `doc_type_extracted` fields. **Requires `session7_tenant_documents.sql` + `session10_multi_doc.sql` migrations + `tenant-documents` Storage bucket.** |

### MTD Tables (from `mtd_tables.sql`)
| Table | Purpose |
|---|---|
| `mtd_periods` | HMRC quarterly periods: `period_start`, `period_end`, `submission_deadline`, `status`, `tax_year`, `quarter` |
| `mtd_expenses` | HMRC-categorised expenses: `user_id`, `property_id`, `amount`, `category`, `expense_date`, `quarter`, `tax_year`, `is_section24` |
| `mtd_quarter_status` | Submission status per user/year/quarter: `not_started` → `in_progress` → `ready` → `submitted` |
| `mtd_settings` | User MTD profile: `gross_income`, `tax_rate`, `is_limited_co`, `use_cash_basis` |

### PostgreSQL Functions
| Function | Signature | Returns | Purpose |
|---|---|---|---|
| `get_compliance_score` | `(p_landlord_id uuid)` | numeric 0–100 | `ROUND((properties_with_no_expired_certs / total_properties) * 100, 1)` — excludes EPC |
| `purge_old_email_logs` | `()` | void | Deletes `email_log` entries older than 18 months |

---

## 5. Supabase Configuration

**Project reference:** `mahtcfukgzbonwibtsxz`
**Supabase URL:** `https://mahtcfukgzbonwibtsxz.supabase.co`
**Dashboard:** https://supabase.com/dashboard/project/mahtcfukgzbonwibtsxz

### Hardcoded Credentials (in HTML files)
```javascript
// These appear in landlord.html, tenant.html, mtd.html, login.html
const SUPABASE_URL      = 'https://mahtcfukgzbonwibtsxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
// Anon key is safe to expose (Supabase RLS enforces data security)
```

### Auth Configuration
- Email/password login via `signInWithPassword`
- Google OAuth via `signInWithOAuth` (redirect to `landlord.html`)
- Password reset via `resetPasswordForEmail`
- Magic link support in `login.html` via `onAuthStateChange`
- All pages: call `supabase.auth.getSession()` on load, redirect to `login.html` if no session

### Storage
- Bucket: `certificates`
- Path pattern: `{prop_id}/{cert_id}`
- Access: Signed URL downloads used in tenant portal

### Edge Function Secrets (set in Supabase Dashboard → Project Settings → Edge Functions → Secrets)
| Secret | Purpose |
|---|---|
| `RESEND_API_KEY` | Transactional email via Resend |
| `SUPABASE_URL` | Auto-injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase runtime |

---

## 6. Edge Functions

> **Important:** Edge functions use the **Deno** runtime. TypeScript syntax required.
> Deploy command: `npx supabase functions deploy <function-name> --project-ref mahtcfukgzbonwibtsxz`
> Run each command separately in PowerShell — `&&` is NOT supported.

### Deployed Functions

#### `email-alerts` (Sprint 10)
- **Source file:** `email-alerts-index.ts` (root) → must be placed at `supabase/functions/email-alerts/index.ts` for deploy
- **Auth:** Uses service role key in `Authorization` header (sent by pg_cron)
- **`--no-verify-jwt`:** NOT used — cron jobs authenticate with service role key
- **Trigger:** HTTP POST with `{"type": "daily"}` or `{"type": "weekly_summary"}`
- **Full details:** See [Section 7](#7-email-alert-system-sprint-10)

#### `ai-proxy` ✓ CANONICAL AI FUNCTION (Session 6)
- **Source:** `supabase/functions/ai-proxy/index.ts` — exists in repo
- **URL:** `https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/ai-proxy`
- **Deploy:** `npx supabase functions deploy ai-proxy --project-ref mahtcfukgzbonwibtsxz --no-verify-jwt`
- **Secrets:** `ANTHROPIC_API_KEY`, `RESEND_API_KEY`
- Handles: Claude AI requests + email sending via Resend
- Used by: ALL AI calls in `landlord.html` (document generation, chat, Section 8, e-sign, inventory, tenant doc scanning, reminders)
- **Replaces `super-processor`** — do not use `super-processor` in any new code

#### `super-processor` (DEPRECATED — do not use)
- Was the original AI proxy — source never in repo, `ANTHROPIC_API_KEY` was invalid
- All references replaced with `ai-proxy` in Session 6
- Still listed in Supabase Dashboard as `ai-proxy` function (same Supabase internal name)

#### `stripe-checkout` (Sprint 13)
- **Source file:** `stripe-checkout-index.ts` (root) → deploy from `supabase/functions/stripe-checkout/index.ts`
- **Auth:** Requires valid Supabase JWT (user must be logged in) — standard verify-jwt
- **`--no-verify-jwt`:** NOT used — user JWT is required and verified inside the function
- **Trigger:** HTTP POST from `js/profile.js` via `supabase.functions.invoke('stripe-checkout', { body: { plan } })`
- **Request body:** `{ plan: 'starter' | 'landlord' | 'portfolio' }`
- **Response:** `{ url: 'https://checkout.stripe.com/pay/...' }` — frontend redirects to this URL
- **Full details:** See [Section 14](#14-stripe-integration-guide)

#### `stripe-webhook` (Sprint 13)
- **Source file:** `stripe-webhook-index.ts` (root) → deploy from `supabase/functions/stripe-webhook/index.ts`
- **Auth:** NO Supabase JWT — Stripe calls this endpoint directly. Deploy with `--no-verify-jwt`
- **Security:** Stripe-Signature header verified via `stripe.webhooks.constructEventAsync()`
- **Events handled:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- **Webhook URL:** `https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/stripe-webhook`
- **Full details:** See [Section 14](#14-stripe-integration-guide)

---

## 7. Email Alert System (Sprint 10)

### Overview
8 alert types, all run through the single `email-alerts` edge function. Deduplicated via `email_log`. Branded HTML email template built by `buildEmail()` helper.

### Alert Types

| Alert | Trigger Condition | Dedup Key Pattern | Re-fires? |
|---|---|---|---|
| `cert_expiry` | 60 / 30 / 14 / 7 days before `expiry_date` | `cert_{id}_{days}d` | Never (once per window) |
| `rent_overdue` | 1 day after `next_rent_due` | `rent_overdue_{id}_{date}` | Never (once per due date) |
| `maintenance_overdue` | 7+ days with no update | `maint_overdue_{id}_{week}` | Weekly while unresolved |
| `awaab_law` | 14+ days open + damp/mould keyword | `awaab_{id}_{isoWeek}` | Weekly while unresolved |
| `mtd_deadline` | 30 / 14 / 7 days before submission deadline | `mtd_{id}_{days}d` | Never (once per window) |
| `insurance_expiry` | 60 / 30 days before policy expiry | `insurance_{id}_{days}d` | Never (once per window) |
| `compliance_score` | Score drops below 70% | `compliance_{landlord}_{date}` | Daily while below threshold |
| `weekly_summary` | Every Monday | `summary_{landlord}_{week}` | Weekly (new key each week) |

### Awaab's Law Keyword Detection
Matched keywords: `['damp', 'mould', 'mold', 'condensation', 'leak', 'water ingress', 'black mould']`
Used in: `email-alerts-index.ts` alert processor AND `tenant.html` AI priority assessor.

### Cron Schedule

| Job Name | Schedule (cron) | UTC Time | Action |
|---|---|---|---|
| `rentsafeai-daily-alerts` | `0 9 * * *` | 09:00 daily (10:00 BST / 09:00 GMT) | POST `{"type":"daily"}` to `email-alerts` |
| `rentsafeai-weekly-summary` | `0 8 * * 1` | 08:00 UTC Mondays | POST `{"type":"weekly_summary"}` to `email-alerts` |
| `rentsafeai-monthly-purge` | `0 2 1 * *` | 02:00 UTC on 1st of month | Calls `purge_old_email_logs()` |

### Monitoring Queries
```sql
-- Check cron job history
SELECT jrd.jobid, j.jobname, jrd.start_time, jrd.end_time, jrd.status, jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname LIKE 'rentsafeai%'
ORDER BY jrd.start_time DESC LIMIT 20;

-- Check emails sent
SELECT alert_type, COUNT(*) as sent_count, MAX(sent_at) as last_sent
FROM email_log GROUP BY alert_type ORDER BY last_sent DESC;

-- Clear test data (DEV ONLY — never run in prod)
TRUNCATE email_log;
```

---

## 8. Deployment Configuration

> **Critical:** PowerShell on Windows does not support `&&` for chaining commands.
> Run each command on a separate line.

### Static Frontend (GitHub Pages)
- **Repository:** `github.com/sddhawan79-lang/rentsafeai`
- **Hosting:** GitHub Pages, `main` branch, files served from root
- **Custom domain:** `rentsafeai.co.uk` (configured via `CNAME` file)
- **Deploy:** `git push origin main` — GitHub Pages auto-serves static files
- **No CI/CD pipeline** — manual push deploys immediately

### Edge Function Deployment
```powershell
# Step 1: Log in (only needed once per machine)
npx supabase login

# Step 2: Deploy email-alerts function
npx supabase functions deploy email-alerts --project-ref mahtcfukgzbonwibtsxz
```

**Pre-deploy checklist:**
1. Copy `email-alerts-index.ts` to `supabase/functions/email-alerts/index.ts`
2. Confirm `RESEND_API_KEY` secret exists in Supabase Dashboard

**Post-deploy verification:**
- Supabase Dashboard → Edge Functions → `email-alerts` → should be listed as Active
- Click function → check Logs panel is available

### Database Migrations
All migrations run manually in **Supabase → SQL Editor** (no automated migration tool).

| SQL File | Purpose | Order |
|---|---|---|
| `sprint10_step1_db.sql` | Creates `email_log`, `property_insurance`, `mtd_periods` tables; adds `next_rent_due` to `tenancies`; creates `get_compliance_score()` and `purge_old_email_logs()` functions | Run first |
| `sprint10_step1_fix.sql` | Patch/fix for Sprint 10 DB setup | Run after step1 |
| `sprint10_step2_cron.sql` | Sets up 3 pg_cron jobs — **must replace `YOUR_SERVICE_ROLE_KEY`** (2 occurrences) with actual service role key before running | Run last |
| `mtd_tables.sql` | Creates MTD module tables | Independent |
| `session7_tenant_documents.sql` | Creates `tenant_documents` table with RLS | Independent |
| `session10_multi_doc.sql` | Drops `tenant_documents_slot_unique` index; adds `issuing_authority`, `doc_type_extracted` columns | Already run |

**Service role key location:** Supabase → Settings → API → `service_role` (secret key)

### Environment Secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets)
| Secret | Value source |
|---|---|
| `RESEND_API_KEY` | Copy from `ai-proxy` function — same key (`re_xxxxxxxxxxxxxxxxxxxxxxxx`) |

### DNS / Domain Configuration
- **Domain:** `rentsafeai.co.uk`
- **Hosting:** GitHub Pages (CNAME `sddhawan79-lang.github.io`)
- **Email sender:** `documents@rentsafeai.co.uk` via Resend
- **Pending:** SPF/DKIM records for Resend (email unreliable until resolved)
- **Pending:** GitHub Pages HTTPS / SSL certificate

---

## 9. Key Business Logic

### Compliance Scoring

**Client-side (`calcRAG()` in `landlord.html`):**
- Required certificate types: Gas Safety, EICR, Electrical, EPC, Energy, Deposit
- Deductions: -15pts expired cert, -10pts missing cert, -5pts cert due, -10pts missing critical type
- RAG thresholds: Green ≥80%, Amber ≥50%, Red <50%

**Server-side (`get_compliance_score()` PostgreSQL function):**
- Counts properties with no expired certs (excluding EPC) as a ratio
- Returns 0–100 rounded to 1 decimal place

### Section 8 Notice Generator (`moSection8()` in `landlord.html`)
- All RRA 2025 grounds (31 grounds, Housing Act 1988 Schedule 2 as amended 1 May 2026)
- Mandatory (`s8-badge-m`) vs Discretionary (`s8-badge-d`) classification
- 5-step wizard: pre-conditions → reason/category → ground selection → notice details → review
- Auto-calculates notice periods and court filing dates
- 3-checkbox liability disclaimer with audit logging before generation
- Output: Draft notice text only — handoff to GOV.UK Form 3A still required (pending item)
- PDF download via jsPDF with proper A4 multi-page output (Session 9)

### Awaab's Law
- Triggered by damp/mould keyword match on maintenance description
- Keywords: `damp`, `mould`, `mold`, `condensation`, `leak`, `water ingress`, `black mould`
- Landlord email alert fires weekly if job remains unresolved after 14 days
- Visual flag (`awaab: true`) on maintenance record

### MTD Tax Logic (`mtd.html`)
- **Phase scope checker (`checkMTDScope()`):**
  - Gross income > £50,000: Phase 1 (mandatory Apr 2026)
  - Gross income > £30,000: Phase 2 (mandatory Apr 2027)
  - Gross income > £20,000: Phase 3 (mandatory Apr 2028)
- **Quarter status flow:** `not_started` → `in_progress` → `ready` → `submitted`
- **Section 24 calculator:** Compares full deduction (pre-2017) vs 20% tax credit (current law)
- **Expense categories (HMRC):** 7 categories available when logging expenses

### Tenant Portal Token System
- `invite_token` stored on the `tenants` record in Supabase
- Token passed via URL `?token=xxx` or read from `localStorage`
- No Supabase Auth required — access control via token lookup + RLS
- **Revocation:** Set `tenants.status = 'revoked'` → portal shows "Access revoked"
- E-sign flow triggered via `?esign=xxx` URL parameter → looks up `esign_requests` table

### Data Loading Pattern (`landlord.html`)
`loadData()` fires 12 parallel Supabase queries on startup:
`properties`, `tenants`, `certificates`, `maintenance`, `rent_payments`, `insurance`, `email_log`, `custom_templates`, `contractors`, `job_assignments`, `tenant_documents`, `user_profiles` (added Session 8)

The `user_profiles` row is queried by `currentUser.id` via `.maybeSingle()` and stored in `D.userProfile`. Use the `_profileName()` helper (not raw `email.split('@')[0]`) for all landlord name references in AI prompts and legal documents — it resolves `full_name` from the profile, falling back to email username.

### Legal Document Disclaimer Gate (`landlord.html`)
Session 8 introduced a 3-checkbox pre-generation consent gate for 4 legal document types: `section13`, `noticetoquit`, `writtenstatement`. Section 8 has its own dedicated flow with identical wording. The gate:
- Captures user form selections (`_gateCtx`) before replacing the modal body with the disclaimer
- Requires 3 explicit acknowledgements (AI draft, personal liability, independent legal advice)
- On acceptance: calls `logAudit('DISCLAIMER_ACCEPTED', ...)` with timestamp, restores modal + user selections, runs `runGenerate()`
- `gateBack()` restores the full generate modal with saved selections if user backs out
- All other templates (letters, inventories, RRA sheet) bypass the gate — only the lightweight inline banner applies

---

## 10. Known Issues & Technical Debt

| # | Issue | Area | Status |
|---|---|---|---|
| 1 | HTTPS "Not secure" on rentsafeai.co.uk | GitHub Pages SSL | Pending |
| 2 | Resend SPF/DKIM records not set | Email delivery | Pending — emails unreliable |
| 3 | RRA PDF (GOV.UK Form 3A) not attached | Section 8 notices | Pending |
| 4 | Section 8 output is draft text only — handoff to Form 3A UI | UX | Pending |
| 5 | Email sending via `super-processor` (not dedicated function) | Architecture | **FIXED Session 6** — replaced with `ai-proxy` |
| 6 | PDF export via `window.print()` (not jsPDF) | Landlord dashboard | **FIXED Session 9** — `downloadAsPDF()` + `s8DownloadPDF()` rewritten to jsPDF with A4 auto-pagination |
| 7 | No tenant data input validation | Tenant portal | Technical debt |
| 8 | No offline/error recovery states | General | Technical debt |
| 9 | MX record missing for `rentsafeai.co.uk` | DNS / Email | Post-launch |
| 10 | Supabase credentials hardcoded in HTML files | Security hygiene | Acceptable — anon key is public-safe |
| 11 | `parseInt()` on UUID `prop_id`/`tenant_id` values — produces NaN | Data integrity | **FIXED Session 7** — replaced with `String()` (22 locations) |
| 12 | `tenant_documents` table missing from DB — KYC scanning fails silently | Database | **SQL created** — run `session7_tenant_documents.sql` in Supabase SQL Editor |
| 13 | `tenant-documents` Storage bucket not created | Storage | Pending — create in Supabase Dashboard → Storage |
| 14 | Section 8 missing RRA 2025 grounds (1B, 2ZA, 2ZB, 2ZC, 2ZD) | Legal compliance | **FIXED Session 7** — added with social housing notes |
| 15 | Landlord name derived from email username instead of `user_profiles.full_name` | Document generation | **FIXED Session 8** — added `_profileName()` helper, hits `user_profiles` in `loadData()` |
| 16 | Footer links on `index.html` — 6 dead `href="#"` links (Privacy, Terms, Cookies, GDPR) | Marketing page | **FIXED Session 8** — all now point to real `.html` files; added Complaints link |
| 17 | No complaints policy page | Legal compliance | **FIXED Session 8** — created `complaints.html` (UK-compliant: ICO reference, ADR, 2/10 day timelines) |
| 18 | Rent "Mark received" errors on save — `month` column removed, `prop_id` String()-wrapped, calendar amount bug | Rent module | **FIXED Session 9** — 3 functions updated (`markRentReceived`, `buildRentSchedule`, `getCalEvents`) |
| 19 | Property detail tabs unresponsive — `pdSetTab` silently returns if content div missing | Property detail | **FIXED Session 9** — added re-render fallback when `#pd-tab-content` not in DOM |
| 20 | Generated document output shrunk to 360px — only ~10 lines visible | Document gen | **FIXED Session 9** — gen-text/s8-output/s13-preview `max-height` → vh units (50-55vh) |
| 21 | Calendar "Mark received" parsed rent amount from display label (address digits contaminated value) | Calendar | **FIXED Session 9** — `rentAmt` passed directly from calendar event object |
| 22 | `rent_payments` table has no SQL migration file in repo | Database docs | Pending — Saby to document actual schema or create SQL file |

---

## 11. Pricing & Plans

Pricing uses a **founding / standard** two-tier model displayed via a billing toggle on `index.html`. The JS `prices` object (in the inline `<script>` at the bottom of `index.html`) drives all displayed values.

| Plan | Founding price (monthly) | Founding price (annual) | Standard price (monthly) | Standard price (annual) | Properties | Target user |
|---|---|---|---|---|---|---|
| Starter | £4.99/mo | £3.99/mo | £7.99/mo | £6.66/mo | Up to 3 | Accidental landlords |
| Landlord | £9.99/mo | £8.33/mo | £14.99/mo | £12.49/mo | Up to 10 | ★ Most popular |
| Portfolio | £23.99/mo | £19.99/mo | £39.99/mo | £33.32/mo | Unlimited | Portfolio landlords |

Annual billing: 2 months free (pay 10 months, get 12)

---

## 12. Code Standards & Maintainability

> These rules apply to **all new and modified code** in this project.
> Every AI agent and developer working on this codebase must follow them without exception.

---

### 12.1 JavaScript File Structure

**Rule: Every HTML file must have a corresponding JS file in the `js/` folder.**

| HTML file | JS file |
|---|---|
| `index.html` | `js/index.js` |
| `login.html` | `js/login.js` |
| `signup.html` | `js/signup.js` |
| `profile.html` | `js/profile.js` ✓ Exists |
| `landlord.html` | `js/landlord.js` |
| `tenant.html` | `js/tenant.js` |
| `esign.html` | `js/esign-content.js` ✓ Exists |
| `mtd.html` | `js/mtd.js` |

**Rule: Shared utilities go in `js/lib/` — never duplicated across files.**

| File | Purpose |
|---|---|
| `js/lib/supabase-client.js` | Single Supabase client initialisation (`sb`) — import everywhere |
| `js/lib/auth.js` | Session check, redirect helpers, `onAuthStateChange` wrappers |
| `js/lib/ui.js` | Shared DOM helpers: `showError()`, `showSuccess()`, spinner toggle |
| `js/lib/validation.js` | Input validators: email, password strength, required fields |
| `js/lib/cookies.js` | Cookie banner accept/decline logic |

**Folder layout:**
```
rentsafeai/
├── js/
│   ├── lib/
│   │   ├── supabase-client.js   Supabase client singleton            ✓ Exists
│   │   ├── auth.js              Auth session helpers                  ✓ Exists
│   │   ├── ui.js                Shared UI utilities                   ✓ Exists
│   │   ├── validation.js        Input validation helpers              ✓ Exists
│   │   └── cookies.js           Cookie consent banner                ✓ Exists
│   ├── index.js                 Landing page scripts
│   ├── login.js                 Login / reset password logic
│   ├── signup.js                Sign-up + password strength           ✓ Exists
│   ├── profile.js               Account & Billing / Stripe            ✓ Exists
│   ├── landlord.js              Full landlord dashboard logic
│   ├── tenant.js                Tenant portal logic
│   ├── esign-content.js         Standalone e-sign signing flow        ✓ Exists
│   └── mtd.js                   MTD tax module logic
```

---

### 12.2 How to Link JS Files in HTML

Load shared libraries first, then the page-specific file. All as `defer` scripts at the bottom of `<body>`:

```html
<!-- Supabase CDN must load before any lib that uses it -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js"></script>

<!-- Shared libs -->
<script src="js/lib/supabase-client.js" defer></script>
<script src="js/lib/auth.js" defer></script>
<script src="js/lib/ui.js" defer></script>
<script src="js/lib/validation.js" defer></script>
<script src="js/lib/cookies.js" defer></script>

<!-- Page-specific -->
<script src="js/signup.js" defer></script>
```

> **Note:** Because the project has no bundler, shared state is passed via the `window` global or
> by loading files in dependency order. Lib files must attach their exports to `window` (e.g.
> `window.RSA = window.RSA || {}; window.RSA.showError = showError;`) so page scripts can call them.

---

### 12.3 Module Pattern (IIFE)

Wrap all page-level JS in an IIFE to avoid polluting the global scope. Expose only what HTML
`onclick` attributes need:

```javascript
// js/signup.js
(function () {
  'use strict';

  // ── private state ──
  let _passwordStrength = 0;

  // ── private helpers ──
  function _getStrength(pw) { /* ... */ }

  // ── public API (called from HTML onclick / event listeners) ──
  function signup() { /* ... */ }
  function onPasswordInput() { /* ... */ }
  function onConfirmInput() { /* ... */ }

  // ── init ──
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('password').addEventListener('input', onPasswordInput);
    document.getElementById('confirm-password').addEventListener('input', onConfirmInput);
    document.getElementById('signup-btn').addEventListener('click', signup);
    // Remove all inline onclick="" from HTML — wire events here instead
  });

  // Expose only what is strictly needed by HTML markup (prefer none)
  window.signup = signup;
})();
```

---

### 12.4 Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| JS files | `kebab-case.js` | `supabase-client.js` |
| Functions | `camelCase` | `loadProperties()` |
| Private helpers (within IIFE) | `_camelCase` | `_calcRAG()` |
| Constants | `UPPER_SNAKE_CASE` | `SUPABASE_URL` |
| DOM element IDs | `kebab-case` | `error-msg`, `signup-btn` |
| CSS classes | `kebab-case` | `pw-strength`, `btn-login` |
| Database column refs in JS | match DB column exactly | `prop_id`, `cert_type` |

---

### 12.5 Error Handling Rules

1. **Every `async` function must have a `try/catch` or check the Supabase `{ data, error }` return.**
2. **Never swallow errors silently** — at minimum `console.error()` with context.
3. **User-facing error messages** must be shown via the shared `showError(el, msg)` helper in `js/lib/ui.js`.
4. **Loading states** — disable the triggering button and show a spinner before any async call; re-enable in `finally` or after both success and error paths.

```javascript
async function signup() {
  const btn = document.getElementById('signup-btn');
  RSA.UI.setLoading(btn, true, 'Creating account…');
  try {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) { RSA.UI.showError(errEl, error.message); return; }
    RSA.UI.showSuccess(okEl, 'Account created! Check your email.');
  } catch (err) {
    console.error('[signup]', err);
    RSA.UI.showError(errEl, 'Unexpected error. Please try again.');
  } finally {
    RSA.UI.setLoading(btn, false, 'Create account');
  }
}
```

---

### 12.6 No Inline Scripts in HTML

- **Do not** place `<script>` blocks inside HTML files (except the Supabase CDN `<script src>` tag and the Crisp chat snippet, which must remain inline per vendor requirements).
- **Do not** use `onclick="..."` attributes in HTML markup. Wire all events in the page JS file inside `DOMContentLoaded`.
- **Exception:** The countdown timer and cookie banner initialiser in `login.html` / `signup.html` may remain inline until those pages are migrated to the `js/` pattern.

---

### 12.7 CSS Rules

- All CSS stays in `<style>` blocks within each HTML file — **no separate `.css` files** (GitHub Pages, no bundler, keep it simple).
- CSS variables are defined in `:root` at the top of each `<style>` block.
- **Shared design tokens** (colours, fonts, breakpoints) must use the same variable names across all pages — do not invent new names for existing colours.
- Canonical design token names:

```css
:root {
  --navy:      #0B1E3D;
  --navy-mid:  #132847;
  --green:     #00C896;
  --green-dark:#009970;
  --white:     #fff;
  --off:       #F6F8FB;
  --border:    #E4EAF1;
  --txt:       #1A2B45;
  --muted:     #7A8FA6;
  --red:       #E53E3E;
  --amber:     #D97706;
  --font:      'DM Sans', system-ui, sans-serif;
  --disp:      'DM Serif Display', Georgia, serif;
}
```

---

### 12.8 Code Comment Standards

Every function must have a one-line comment describing its purpose. Group related functions with a section header comment:

```javascript
// ── AUTH ─────────────────────────────────────────────────────────────────────

/** Redirects to login.html if no active Supabase session exists. */
async function requireAuth() { /* ... */ }

// ── DATA LOADING ──────────────────────────────────────────────────────────────

/** Fires 10 parallel Supabase queries and populates module-level state arrays. */
async function loadData() { /* ... */ }
```

---

### 12.9 Debugging Guidelines

- Use `console.group('[ModuleName]')` / `console.groupEnd()` to group related log output.
- Prefix all `console.log` / `console.error` calls with `[filename:functionName]`:
  ```javascript
  console.error('[signup:signup]', error);
  ```
- Never commit `console.log` debug statements — use `console.debug` for dev-only output (can be filtered in DevTools).
- All Supabase query errors must log the full error object: `console.error('[loadData]', error)`.

---

### 12.10 Migration Path for Existing Files

The existing monolithic HTML files (`landlord.html`, `tenant.html`, `mtd.html`) have all JS inline.
When **touching any of these files for a new feature or bug fix**, follow this process:

1. Extract only the functions you are modifying into the appropriate `js/` file.
2. Replace the inline code with a `<script src="js/...">` reference.
3. Do **not** attempt a full extraction in one go — extract incrementally as features are worked on.
4. Update this document's file structure table when a file is fully migrated.

> **Priority order for migration:** `login.js` → `signup.js` → `index.js` → `tenant.js` → `mtd.js` → `landlord.js`

---

## 13. Feature Change Log

> Add an entry here whenever a new feature, modification, or architectural decision is made.
> Format: `## Sprint N — [Date] — Brief Title` followed by bullet points.

### Sprint 10 — Email Alert System
**Deployed:** See `SPRINT10_DEPLOY.md` for full deployment guide.
- Added `email_log` table with unique dedup index `(landlord_id, alert_type, reference_key)`
- Added `property_insurance` table with RLS
- Added `mtd_periods` table (scaffolded for accounting module)
- Added `next_rent_due` column to `tenancies`
- Added `get_compliance_score(landlord_id)` PostgreSQL function (0–100 scale)
- Added `purge_old_email_logs()` cleanup function (removes logs >18 months old)
- Deployed `email-alerts` Supabase Edge Function with 8 alert types
- Set up 3 pg_cron scheduled jobs: daily alerts, weekly summary, monthly purge
- **Pending outstanding items from Sprint 10:**
  - GitHub Pages SSL certificate
  - Resend SPF record
  - RRA PDF attachment
  - Section 8 → Form 3A UX handoff

### Sprint 11 — signup.html + Code Standards
**Date:** May 2026
- Created `signup.html` — matches `login.html` styling, two-panel layout, mobile responsive
- Sign-up flow: email + password + confirm password, 5-rule strong password meter, real-time match indicator
- Duplicate email detection via Supabase `signUp()` — guards both error response and empty `identities[]`
- On success: confirmation message + auto-redirect to `login.html` after 3.5 s
- Updated `index.html` — all "Start Free" / "Start free trial" CTAs now point to `signup.html`; footer "Sign in" corrected to `login.html`
- Added Section 12 (Code Standards & Maintainability) to `PROJECT_KNOWLEDGE.md`:
  - `js/` folder convention — one JS file per HTML page
  - `js/lib/` for shared utilities (Supabase client, auth, UI, validation, cookies)
  - IIFE module pattern, naming conventions, error handling rules
  - No inline scripts policy (except Crisp and Supabase CDN)
  - CSS token canonicalisation
  - Incremental migration path for legacy monolithic HTML files

### Sprint 12 — Tenant Portal Enhancement (Planned)
**Goal:** Unique token-based URL per tenancy (no login required).
- Tenants can: view tenancy details, report maintenance issue (with photo upload), view open jobs, download latest certificates
- Uses existing `maintenance_jobs` and `certificates` tables
- All submissions create a row in `maintenance_jobs` and trigger landlord email alerts (Sprint 10 system)

### Pricing Update — May 2026 — index.html Pricing Corrections
**Date:** May 2026
- **Portfolio founding price:** updated from £11.99/mo → £23.99/mo
- **Portfolio standard price:** updated from £23.99/mo → £39.99/mo
- **Landlord standard price:** updated from £15.99/mo → £14.99/mo
- Annual equivalents recalculated consistently (10 months ÷ 12): Portfolio founding £19.99/mo, Portfolio standard £33.32/mo, Landlord standard £12.49/mo
- Changes applied in: HTML display (`id="portfolio-price"`, `id="portfolio-standard"`, `id="landlord-standard"`) and the `prices` JS object in `index.html`
- Section 11 of `PROJECT_KNOWLEDGE.md` updated to reflect the full founding/standard price matrix

### Session 6 — May 2026 — AI Fix & Edge Function Rebuild
**Date:** May 2026
- **Root cause diagnosed:** All AI generation calls in `landlord.html` pointed to `functions/v1/super-processor` — a pre-existing edge function whose source was not in the repo and whose `ANTHROPIC_API_KEY` secret was invalid/expired
- **Fix:** Created `supabase/functions/ai-proxy/index.ts` from scratch — a minimal Deno proxy that:
  - Forwards Claude AI requests to `https://api.anthropic.com/v1/messages` using `ANTHROPIC_API_KEY` secret
  - Handles email sending via Resend when `body.type === 'send_email'`
  - Full CORS headers for browser requests
  - Deployed with `--no-verify-jwt` flag
- **Updated `ANTHROPIC_API_KEY` secret** in Supabase Dashboard → Edge Functions → Secrets with a fresh Anthropic key (created May 8 2026, "Saurabh" key)
- **Global find-and-replace** in `landlord.html`: all occurrences of `functions/v1/super-processor` replaced with `functions/v1/ai-proxy` (affects ~20 fetch calls across document generation, AI chat, Section 8, e-sign, inventory, tenant doc scanning, email reminders)
- **Verified working:** PowerShell test returned Status 200 with Claude response content

#### ai-proxy Edge Function Reference
- **Source:** `supabase/functions/ai-proxy/index.ts` ✓ Exists in repo
- **URL:** `https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/ai-proxy`
- **Deploy:** `npx supabase functions deploy ai-proxy --project-ref mahtcfukgzbonwibtsxz --no-verify-jwt`
- **Secrets required:** `ANTHROPIC_API_KEY`, `RESEND_API_KEY`
- **Request formats supported:**
  - Claude AI: `{ model, max_tokens, messages, system? }` → proxies to Anthropic, returns full Claude response
  - Email: `{ type: 'send_email', to, subject, html }` → sends via Resend from `documents@rentsafeai.co.uk`
- **IMPORTANT:** This replaces `super-processor` entirely. Never reference `super-processor` in new code — always use `ai-proxy`

### Sprint 13 — User Profile Page & Stripe Subscription Billing
**Date:** May 2026
- Created `profile.html` — Account & Billing settings page (sticky top bar, no sidebar)
  - Section 1: Account — immutable email display
  - Section 2: Personal Details — full_name, phone, company_name, address, utr_number (upsert to `user_profiles`)
  - Section 3: Subscription & Billing — 3 plan cards (Starter/Landlord/Portfolio) with Stripe Checkout
- Created `js/profile.js` — IIFE module, code-standards compliant
- Created `sprint13_db.sql` — `user_profiles` and `stripe_subscriptions` tables with RLS
- Created `stripe-checkout-index.ts` — Edge Function: creates Stripe Checkout Session
  - Verifies Supabase JWT, reuses/creates Stripe Customer, creates Checkout Session
  - Returns `{ url }` for frontend redirect to Stripe-hosted payment page
- Created `stripe-webhook-index.ts` — Edge Function: receives Stripe events, updates `stripe_subscriptions`
  - Deploy with `--no-verify-jwt` (Stripe calls it directly, not user JWT)
  - Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Updated `landlord.html` — sidebar footer user avatar/username now links to `profile.html`
- Added Stripe to tech stack table
- **Pending Stripe setup steps (required before checkout works):**
  - Add `STRIPE_SECRET_KEY` secret in Supabase Dashboard
  - Add `STRIPE_WEBHOOK_SECRET` secret in Supabase Dashboard
  - Add `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_LANDLORD`, `STRIPE_PRICE_PORTFOLIO` secrets
  - Run `sprint13_db.sql` in Supabase SQL Editor
  - Deploy `stripe-checkout` and `stripe-webhook` edge functions
  - Register webhook endpoint in Stripe Dashboard
  - See Section 14 for full step-by-step

### Session 7 — May 2026 — QA, Bug Fixing & GOV.UK Compliance Review
**Date:** May 2026

#### Bugs Fixed

**1. Critical: `parseInt()` on UUID `prop_id` / `tenant_id` values (22 locations)**
- **Root cause:** All tables use UUID primary/foreign keys. Calling `parseInt()` on a UUID (e.g. `"550e8400-e29b-41d4-a716-..."`) returns `NaN`, causing Supabase inserts/updates to fail or store corrupt data.
- **Fixed:** Replaced all `parseInt(propId/pid/p.id/t.id)` with `String()` equivalents across:
  - `saveCertToDB()` — certificate saves
  - `saveIssueToDB()` — maintenance issue saves
  - Property setup wizard cert/insurance saves (3 certs, 3 insurance lines)
  - `saveBulkResults()` — bulk document scan
  - `_saveTenantSetupToDB()` — tenant wizard (prop_id + insurance)
  - Welcome kit email log, meter readings, Kanban stage change email log
  - Insurance save (`saveInsurance()`), payment save (`savePayment()`)
  - Document library upload
  - `sendEmailNow()` email log (template sends)
  - Section 8 draft + send email log entries (tenant_id + prop_id)
  - RRA Information Sheet email log
  - Section 13 email log
  - Maintenance notify email log

**2. Missing RRA 2025 Section 8 grounds**
- Added: Ground 1B (rent-to-buy, social housing), Ground 2ZA, 2ZB, 2ZC, 2ZD (superior tenancy / sub-tenancy scenarios)
- All new grounds include "social housing only" notes as they don't apply to typical private landlords
- Updated Ground 1 description to match RRA 2025 exact statutory wording:
  - Expanded family scope: now explicitly includes cohabiting partner and their children/grandchildren
  - Clarified 1-year tenancy minimum requirement
  - Updated field options for "Relationship to you" selector
- Removed "37 grounds" claim from all UI text — now says "All RRA 2025 grounds" (Housing Act 1988 as amended 1 May 2026)

**3. `tenant_documents` table missing from database**
- The KYC tenant document scanning feature (`uploadTenantDoc`, `scanTenantDoc`, `verifyTenantDoc`) queries a `tenant_documents` table that was never created in the DB
- Created `session7_tenant_documents.sql` — run in Supabase SQL Editor to create the table and storage bucket
- Storage bucket `tenant-documents` also needs to be created in Supabase Dashboard → Storage

#### QA Findings (No Code Changes Required)

| Module | Status | Notes |
|---|---|---|
| Dashboard / compliance score | ✓ Pass | `calcRAG()` logic correct; `get_compliance_score()` DB function working |
| Properties (add/edit/delete) | ✓ Pass after fix | Was affected by parseInt bug — fixed |
| Certificates (upload, RAG, expiry) | ✓ Pass after fix | saveCertToDB parseInt fixed; scanAndFill AI scan working |
| Maintenance (Kanban, Awaab's Law) | ✓ Pass | Keywords correct; 14-day trigger logic correct |
| Tenants (add, invite token, portal) | ✓ Pass after fix | Tenant wizard parseInt fixed; invite token logic correct |
| Document generation (17 templates) | ✓ Pass | All templates present; AI prompt quality good |
| Section 8 wizard | ✓ Pass after fix | Grounds updated; notice periods correct; Form 3A handoff noted |
| E-sign flow | ✓ Pass | Generates AST, sends to tenant, esign_requests table used |
| MTD tax module | ✓ Pass | Phase scope checker correct; quarter status flow correct |
| AI chat assistant | ✓ Pass | Uses ai-proxy; Claude responding correctly |
| Email alerts | ✓ Pass | 8 alert types; dedup via email_log working |
| Section 13 notice | ✓ Pass | 2-month notice correctly enforced; tribunal rights included |
| RRA Info Sheet | ✓ Pass | 31 May 2026 deadline clearly shown; email + log working |

#### GOV.UK Compliance Assessment

| Document | Compliance | Notes |
|---|---|---|
| Section 8 Notice | ✓ Compliant (with fixes) | Draft particulars + Form 3A handoff; all RRA 2025 grounds now included |
| Section 13 Notice | ✓ Compliant | Correct statutory references; tribunal rights stated; 2-month minimum enforced |
| RRA Information Sheet | ✓ Compliant | Correctly generates covering letter + GOV.UK document link; deadline warnings prominent |
| Written Statement | ✓ Pass | AI-generated — correct as of RRA 2025 (replaces AST from 1 May 2026) |

#### New Files Added
- `session7_tenant_documents.sql` — SQL migration to create `tenant_documents` table with RLS

### Session 8 — May 2026 — Landlord Name Fix, Complaints Policy & Liability Gate
**Date:** May 2026

#### Fixes
**Landlord name from user_profiles instead of email username**
- **Before:** All AI prompts, document signatures, and Section 13 used `currentUser.email.split('@')[0]` — shows `john.smith` not `John Smith`
- **After:** Added `userProfile: null` to `D` data store; added `sb.from('user_profiles').select('*').eq('id', currentUser.id).maybeSingle()` to `loadData()` (now 12 parallel queries); created `_profileName()` helper at line 636 which resolves `full_name` from profile first, falls back to email username
- Updated 5 locations: `runGenerate()` context info, `PLACEHOLDER_RULE` signature block, Section 8 AI prompt, RRA sheet AI prompt, Section 13 `landlordName` init
- Added joint landlord hint below landlord address field in Section 13 form — "If you are joint landlords, include both full names separated by 'and'"

**Footer dead links fixed in `index.html`**
- 6 `href="#"` dead links replaced: Privacy Policy → `privacy.html`, Terms → `terms.html`, Cookies → `cookies.html`, GDPR → `dpa.html`
- Added Complaints → `complaints.html` link

**UK-compliant complaints policy page (`complaints.html`)**
- Covers: platform bugs, billing, data protection, AI output, account access, email, general service
- Process: Stage 1 (2-day acknowledgment), Stage 2 (10-day investigation), Stage 3 (written response), Stage 4 (escalation to management)
- ICO contact details for data protection complaints
- ADR reference (Consumer Rights Act 2015 compliant)
- Re-directs tenant-vs-landlord complaints to Citizens Advice / Shelter
- Styling matches `privacy.html` / `terms.html` (Lora + DM Sans, navy/amber/cream palette)

**AI Disclaimer Gate (liability protection) — built earlier in Session 8**
- 3-checkbox consent modal for 4 legal document types: `section13`, `noticetoquit`, `writtenstatement` (Section 8 uses its own upgraded consent flow)
- Checkboxes: AI draft only / full personal liability / seek independent legal advice
- `_gateCtx` saves user selections before modal swap; `gateBack()` restores if user backs out
- On accept: `logAudit('DISCLAIMER_ACCEPTED', ...)` with timestamp; restores modal + selections; runs `runGenerate()`
- Section 8 consent upgraded from 4 boxes to 3 clearer boxes matching the same liability language
- All other templates bypass the gate — keep lightweight inline banner only

### Session 9 — May 2026 — Bug Fix Sprint: Rent Save, Tabs, Contract Display & PDF
**Date:** May 2026

#### Architecture Decision
- **Architecture shift:** Saby moving to separate module files. `landlord.html` becomes a shell. Each new feature = its own `.html` + `.js` file.
- Two people now working on codebase — Saby + developer. Build target: 31 May 2026 launch.

#### Bugs Fixed
**1. Rent "Mark received" save error (2 code paths)**
- `markRentReceived()` line 3598: `prop_id` was passed raw from onclick — now `String(pid)` wrapped
- `markRentReceived()` line 3599: `month: monthLabel` removed from DB insert payload (column may not exist in `rent_payments` table)
- `markRentReceived()` line 3600: `amount` now sanitized via `parseFloat(amount) || 0`
- `buildRentSchedule()` lines 3561-3563: matching changed from `r.month === monthLabel` to `r.due_date.slice()` only
- `console.error` logging added to both update and insert paths for debugging
- Calendar view `showCalDay()` line 6389: `amount` was parsed from `e.sub` (display label like `"£1,200 · 123 High St"`) — now uses `e.rentAmt` (added to calendar event at `getCalEvents()` line 6105)

**2. Unresponsive property detail tabs**
- `pdSetTab()` line 3748-3754: when `#pd-tab-content` div was missing (e.g. JS error during page render), function silently returned — tabs appeared frozen
- Now calls `nav('prop-detail', pid)` to re-render entire detail page, then restores the tab after DOM settles

**3. Contract display "shrink" — 3 locations**
- `gen-text` output container (line 7628): `max-height:360px` → `max-height:55vh`
- `s8-output` container (line 8732): `max-height:320px` → `max-height:55vh`
- Section 13 preview (line 9675): `max-height:320px` → `max-height:50vh`

**4. PDF download only 2 pages — 2 functions**
- `downloadAsPDF()`: `window.print()` pop-up → jsPDF with `splitTextToSize(W-32)`, auto `addPage()` at y>270mm, branded header/footer
- `s8DownloadPDF()`: same jsPDF rewrite with Section 8 disclaimer footer
- Both output proper multi-page A4 PDFs with clean text rendering (handles markdown headings, removes `**` bold markers)

#### Remaining for Next Session (Priority Order)
1. **guidance-content.js** — NRLA compliance guide topics: Right to Rent checks, written tenancy terms, guarantor process, welcome letter
2. **AI Assistant upgrade** — add app-aware FAQ responses ("where is X feature?" questions)

---

### Session 10 — May 2026 — Standalone E-Sign Page

#### New Feature: `esign.html` — Extraction from Monoliths
- **Purpose:** Extracted the tenant e-sign signing flow into a standalone page, decoupled from `tenant.html`
- **Files created:** `esign.html`, `js/esign-content.js`
- **Files modified:**
  - `landlord.html:9586` — signing link now points to `esign.html?esign={token}` (was `tenant.html`)
  - `tenant.html:init()` — `?esign=` token now hard-redirects to `esign.html`
  - `tenant.html:loadDocuments()` — "Sign Now" links point to `esign.html`
  - `tenant.html` — removed ~290 lines of dead esign CSS, HTML (screen-esign), and JS functions
- **Auth:** No Supabase auth required — token-based access via `?esign=` URL parameter
- **Key functionality (in `js/esign-content.js`, IIFE module):**
  - Token validation against `esign_requests` table
  - ECA 2000 consent overlay with sessionStorage persistence
  - Document rendering (HTML inline or PDF iframe)
  - `signature_pad` v4.1.7 canvas with DPR scaling and resize handling
  - PDF generation via jsPDF (cover page + signature confirmation page)
  - Signed PDF upload to `signed-documents` Storage bucket
  - Audit log insertion (`audit_log`)
  - Confirmation emails to tenant + landlord via `ai-proxy` edge function
  - IP address capture via ipify.org
- **Landlord initiate flow** remains in `landlord.html` (`moEsign`, `esignGenerateDoc`, `_sendEsignRequest`) — only the tenant signing path was extracted
- **`esign_requests` table** still has no SQL migration file (schema documented as comment in `landlord.html:9397`)

### Session 10 — May 2026 — Multi-Document KYC & AI Field Extraction

#### Feature: Multiple Documents Per Tenant KYC Slot
- **Problem:** `tenant_documents` had a UNIQUE INDEX `(tenant_id, slot)` enforcing one doc per category. Uploading a second passport or RTR doc would overwrite the first. No support for multiple IDs (passport + driving licence), multiple RTR docs (BRP + share code), or multiple address proofs.
- **Solution:** Removed the unique constraint. `uploadTenantDoc` now always INSERTs — no upsert. `pgTenantDetail` UI shows all documents under each category slot with "+ Add another" buttons everywhere.

#### Changes
- **New file:** `session10_multi_doc.sql` — DB migration: DROP INDEX `tenant_documents_slot_unique`, ADD `issuing_authority` and `doc_type_extracted` columns. Run in Supabase SQL Editor.
- **`uploadTenantDoc` (`landlord.html:5169`):** Removed existing-doc check (was upsert). Now always INSERTs, allowing unlimited docs per slot.
- **`scanTenantDoc` (`landlord.html:5215`):** AI prompts updated to extract `issuing_authority` (the authority/company that issued the document) and `doc_type_extracted` (the specific document type detected by AI). New fields mapped and saved.
- **`pgTenantDetail` (`landlord.html:4897`):** Complete UI overhaul. Each slot header now shows a doc count. All documents listed as sub-cards with individual View/Delete/Verify controls. "+ Add another" button always visible. AI Extracted block now shows Type and Issued by fields.
- **`scanRTRDoc` (`landlord.html:1922`):** Prompt updated to extract `issuing_authority`. Result display includes issuing authority.
- **`scanAndFill` (`landlord.html:919`):** Reusable cert scanner prompt updated to extract `issuing_authority` (company/organisation that issued the certificate). Applied across all cert scanning: `scanDoc`, `uploadScanCert`, `scanSetupCert`, `scanPropLicence`, `scanPropEPC`, `scanPropDeposit`, `runBulkScan`.
- **KYC slots unchanged** (7 slots: passport, right_to_rent, address_1, address_2, reference, guarantor, other).

#### Wizard Restructure: 6 Steps → 7 Steps
- **Old flow:** Details → RTR → Deposit → Rent → Insurance → Review
- **New flow:** Details → **IDs** → RTR → Deposit → Rent → Insurance → Review
- **Step 2 — IDs (new):** 2 ID document slots with AI scan. Acceptable types: Passport (any nationality), BRP, Photo Card Driving Licence (UK), National Identity Card (EU/EEA), Biometric Residence Card (BRC), HM Forces Identity Card, Firearms Certificate, UK Birth Certificate, Other. At least 1 required, 2 recommended.
- **Step 3 — Right to Rent (was Step 2):** Updated doc types: UK Passport, Irish Passport/Passport Card, UK Birth Certificate + NI proof, Share Code (eVisa/EUSS), BRP, BRC, Home Office Immigration Document, Passport with valid visa. AI scan with issuing authority extraction.
- **New function `scanIDDoc(num, input)` (`landlord.html:1922`):** AI scans ID documents in the wizard, auto-detects type (passport, driving licence, BRP, etc.), fills number, expiry, issuing authority. Maps to dropdown options.
- **`moTenant`, `_renderTenantStep`, `_tenantStepHtml`, `tenantStepNext`, Review step** all updated for 7-step flow with ID fields in state and display.
- **`_saveTenantSetupToDB`** unchanged — ID details captured in wizard for visual review; actual documents uploaded via `uploadTenantDoc` on tenant detail page after creation.

---

## 14. Stripe Integration Guide

> **Architecture:** Stripe Checkout (hosted). No Stripe.js SDK needed on the frontend.
> The browser is redirected to Stripe's own payment page, then back to `profile.html`.

### How the Payment Flow Works

```
User clicks "Subscribe" on profile.html
  ↓
js/profile.js calls supabase.functions.invoke('stripe-checkout', { body: { plan } })
  ↓
stripe-checkout Edge Function:
  1. Verifies user's Supabase JWT
  2. Retrieves or creates a Stripe Customer (cus_...)
  3. Creates a Stripe Checkout Session (cs_...)
  4. Returns { url: 'https://checkout.stripe.com/pay/cs_...' }
  ↓
profile.js redirects browser to that URL
  ↓
User pays on Stripe's hosted page (card 4242 4242 4242 4242 for test)
  ↓
Stripe redirects to: profile.html?success=true  (or ?canceled=true)
  ↓
In the background, Stripe POSTs 'checkout.session.completed' to:
  https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/stripe-webhook
  ↓
stripe-webhook Edge Function upserts stripe_subscriptions table
```

### Setup Checklist (one-time)

#### Step 1 — Stripe Dashboard: Get API Keys
1. Log in to https://dashboard.stripe.com
2. Go to **Developers → API Keys**
3. Make sure you're in **Test mode** (toggle in top-left)
4. Copy the **Publishable key** (`pk_test_...`) — not needed in code yet, save for later
5. Reveal and copy the **Secret key** (`sk_test_...`) — needed as Supabase secret

#### Step 2 — Stripe Dashboard: Create Products & Prices
1. Go to **Products → Add product**
2. Create three products with **Recurring** pricing:

| Product name | Price | Billing period |
|---|---|---|
| RentSafeAI Starter | £9.99 | Monthly |
| RentSafeAI Landlord | £19.99 | Monthly |
| RentSafeAI Portfolio | £39.99 | Monthly |

3. After creating each, click on the price row and copy the **Price ID** (`price_...`)

#### Step 3 — Supabase Dashboard: Add Edge Function Secrets
Go to: Supabase Dashboard → Project Settings → Edge Functions → Secrets

| Secret name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` from Step 1 |
| `STRIPE_PRICE_STARTER` | `price_...` for £9.99 product |
| `STRIPE_PRICE_LANDLORD` | `price_...` for £19.99 product |
| `STRIPE_PRICE_PORTFOLIO` | `price_...` for £39.99 product |
| `STRIPE_WEBHOOK_SECRET` | Set in Step 5 below |

#### Step 4 — Run Database Migration
Run `sprint13_db.sql` in **Supabase → SQL Editor**.

#### Step 5 — Deploy Edge Functions
```powershell
# Checkout function (standard JWT verification)
Copy-Item stripe-checkout-index.ts supabase\functions\stripe-checkout\index.ts -Force
npx supabase functions deploy stripe-checkout --project-ref mahtcfukgzbonwibtsxz

# Webhook function (no JWT — Stripe calls it directly)
Copy-Item stripe-webhook-index.ts supabase\functions\stripe-webhook\index.ts -Force
npx supabase functions deploy stripe-webhook --project-ref mahtcfukgzbonwibtsxz --no-verify-jwt
```

#### Step 6 — Register Webhook in Stripe Dashboard
1. Go to **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/stripe-webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Click **Add endpoint**
5. On the webhook detail page, reveal the **Signing secret** (`whsec_...`)
6. Add this as the `STRIPE_WEBHOOK_SECRET` secret in Supabase (Step 3)

#### Step 7 — Test the Flow
1. Open `profile.html` as a logged-in user
2. Click **Subscribe** on any plan
3. On the Stripe checkout page, use test card: `4242 4242 4242 4242`, any future date, any CVC
4. After payment, you should be redirected to `profile.html?success=true`
5. The plan card should show "Current Plan" after the webhook fires (may take a few seconds)
6. Check Supabase: `SELECT * FROM stripe_subscriptions;` to confirm the row was written

### Test Card Numbers (Stripe Test Mode)
| Card number | Scenario |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0000 0000 9995` | Card declined |

### Going Live
When ready to accept real payments:
1. In Stripe Dashboard, switch from **Test mode** to **Live mode**
2. Get the **live** Secret key (`sk_live_...`) and Publishable key
3. Create the same 3 Products/Prices in Live mode and copy their Price IDs
4. Replace all Supabase secrets with the live values
5. Register a new webhook endpoint in Live mode (same URL)
6. No code changes needed — the same edge functions work for both modes
