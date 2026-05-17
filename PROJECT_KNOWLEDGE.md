# PROJECT_KNOWLEDGE.md
## NexLet — Agent Initialization Reference

> **Purpose:** Single point of truth for any agentic AI coding agent working on this project.
> Read this file first before making any changes. Update it as new features are added or
> architectural decisions are made.
>
> **Standing instruction:** After **every completed task** (feature, bug fix, refactor, config change,
> schema migration, edge function change, etc.), the AI agent **must** append an entry to
> [Section 13 — Feature Change Log](#13-feature-change-log) and update any other affected sections
> (schema, file structure, known issues, business logic, etc.) to keep this document current.
> Do not wait for the user to ask — do it automatically as part of task completion.

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

**NexLet** is a UK landlord SaaS platform designed to help private landlords stay legally compliant, manage properties efficiently, and prepare for upcoming Making Tax Digital (MTD) obligations.

**Live URL:** https://nexlet.co.uk
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
| **Resend** | Transactional email (`documents@nexlet.co.uk`) | Edge Function secret `RESEND_API_KEY` |
| **Stripe** | Subscription billing for Starter/Landlord/Portfolio plans | Edge Function secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs |
| **Anthropic Claude** (`claude-sonnet-4-5`) | AI chat assistant + maintenance priority classification | `ai-proxy` edge function |
| **Formspree** (`xdapbzqv`) | Waitlist email capture on landing page | Inline in `index.html` |
| **Crisp** (ID: `6a5c5215-3c14-4afa-94a4-f1f8b05e2f62`) | Live chat widget | `index.html`, `login.html`, `tenant.html`, `mtd.html` |
| **signature_pad** v4.1.7 | E-signature canvas on tenant portal | CDN in `tenant.html` |
| **jsPDF** v2.5.1 | PDF generation in tenant portal + landlord document downloads (Session 9) | CDN in `tenant.html`, `landlord.html` |
| **GitHub Pages** | Static hosting with custom domain (`nexlet.co.uk`) | `CNAME` file |
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
├── CNAME                           GitHub Pages custom domain: nexlet.co.uk
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
├── session10_tenants_columns.sql    SQL migration: Session 10 (add missing tenants columns — rtr, rent_day, scheme_ref, etc.)
├── session10_esign_requests.sql     SQL migration: Session 10 (esign_requests table + RLS)
├── session11_feedback_table.sql     SQL migration: Session 11 (user_feedback table)
├── session11_landlord_sig.sql       SQL migration: Session 11 (landlord signature columns on esign_requests)
├── sprint11_feedback_table.sql      SQL migration: Sprint 11 (feedback table — alternate name)
├── sprint13_db.sql                  SQL migration: Sprint 13 (user_profiles, stripe_subscriptions)
├── SPRINT10_DEPLOY.md              Sprint 10 deployment guide
├── PROJECT_KNOWLEDGE.md            THIS FILE — agent initialization reference
├── fix.py                          Python patching script (landlord.html fixes)
├── fix.b64                         Binary patch (base64 encoded)
└── fix.patch                       Git patch file
```

> **`supabase/functions/ai-proxy/index.ts` now exists** (created Session 6).
> Other edge function sources remain as loose `.ts` files at the repo root.
> Deploy command: `npx supabase functions deploy <name> --project-ref mahtcfukgzbonwibtsxz`

### HTML File Responsibilities

| File | Purpose | Auth required | Notes |
|---|---|---|---|
| `index.html` | Marketing landing page — slate teal/amber palette (rebranded May 2026) | None | |
| `login.html` | Supabase email+password + Google OAuth + password reset | None | |
| `signup.html` | Account creation with password strength meter | None | |
| `profile.html` | Account details, personal info, Stripe subscription management | Yes | |
| `landlord.html` | Full landlord SPA — all dashboard modules | Yes | ~11,200 lines |
| `tenant.html` | Tenant portal — token-based, no Supabase auth needed | Token | |
| `esign.html` | Standalone e-sign page | Token | |
| `mtd.html` | MTD tax module — standalone (Tailwind CSS) | Yes | |

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
| `status` | text | Session 18: `vacant` \| `active` \| `refurbishment` \| `archived` (default: `active`) |
| `archive_reason` | text | Session 18: e.g. Sold, No longer letting, Long-term vacant |
| `archive_reason_detail` | text | Session 18: free-text detail |
| `archived_at` | timestamptz | Session 18 |
| `tenancy_started_at` | timestamptz | Session 18 |
| `tenancy_ended_at` | timestamptz | Session 18 |
| `vacant_since` | timestamptz | Session 18 |

#### `tenants`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | Landlord's Supabase user |
| `prop_id` | uuid FK | → properties |
| `name`, `email`, `phone` | text | |
| `type` | text | Tenancy type: APT / AST / Company let / co-tenant |
| `tenant_type` | text | Session 18: `lead` or `co-tenant` (co-tenants inherit property/rent/deposit from lead) |
| `start_date`, `end_date` | date | Tenancy period |
| `rent`, `rent_day` | numeric, int | Monthly rent + due day |
| `deposit` | numeric | |
| `deposit_scheme` | text | TDS / DPS / MyDeposits |
| `scheme_ref` | text | Deposit scheme reference number |
| `addr_proof_1`, `addr_proof_2` | text | Address proof document types |
| `rtr_doc_type`, `rtr_ref` | text | Right to Rent document info |
| `rtr_check_date`, `rtr_expiry` | date | RTR check + document expiry dates |
| `rtr_checked_by` | text | Who performed RTR check |
| `rtr_skipped` | boolean | RTR check deferred |
| `is_lead` | boolean | Lead tenant for property |
| `status` | text | `active`, `revoked` |
| `invite_token` | text | **Unique token for tenant portal URL** |
| `invite_used` | boolean | Whether invite link has been clicked |
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
| `esign_requests` | E-signature requests with `token` for tenant portal. **Requires `session10_esign_requests.sql` + `session11_landlord_sig.sql` migrations.** |
| `tenant_documents` | Tenant KYC documents — passport, RTR, address proofs, references, guarantor. **Multiple docs per slot** (unique index removed Session 10). AI-scanned via Claude with `issuing_authority` + `doc_type_extracted` fields. **Requires `session7_tenant_documents.sql` + `session10_multi_doc.sql` migrations + `tenant-documents` Storage bucket.** |
| `pretenancy_checks` | Session 18. Pre-tenancy checklist audit records: `prop_id`, `tenant_id` (nullable), `landlord_id`, `checks` (JSONB), `completed_at`, `bypassed`, `bypass_reason`. PDF audit trails stored in `pretenancy-audits` Storage bucket. |

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
- **CORS:** Full headers with `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers`, `Access-Control-Allow-Methods: POST, OPTIONS`
- **BASE_URL:** `https://nexlet.co.uk` (updated from `rentsafeai.co.uk` Session 15)
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
- **Custom domain:** `nexlet.co.uk` (configured via `CNAME` file)
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
| `session10_tenants_columns.sql` | Adds 13 missing columns to `tenants`: `type`, `rent_day`, `scheme_ref`, `rtr_*` (6), `addr_proof_*` (2), `is_lead`, `invite_used` | Run now |
| `session11_landlord_sig.sql` | Adds landlord signature columns to `esign_requests`: `landlord_name`, `landlord_signed_at`, `landlord_sig_png` | Independent |
| `session11_feedback_table.sql` / `sprint11_feedback_table.sql` | Creates `user_feedback` table for in-app feedback | Independent |

> **Note:** `session14_tenant_checklist.sql`, `session14_trial_fields.sql`, `session14_rent_payments.sql`, and `session13_inventory_reports.sql` are referenced in the change log below but do not yet exist as files in the repo. They must be created before the corresponding DB features can be deployed.

**Service role key location:** Supabase → Settings → API → `service_role` (secret key)

### Environment Secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets)
| Secret | Value source |
|---|---|
| `RESEND_API_KEY` | Copy from `ai-proxy` function — same key (`re_xxxxxxxxxxxxxxxxxxxxxxxx`) |

### DNS / Domain Configuration
- **Domain:** `nexlet.co.uk`
- **Hosting:** GitHub Pages (CNAME `sddhawan79-lang.github.io`)
- **Email sender:** `documents@nexlet.co.uk` via Resend
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
- All RRA 2025 grounds (38 grounds, Housing Act 1988 Schedule 2 as amended 1 May 2026)
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
`loadData()` fires 13 parallel Supabase queries on startup:
`properties`, `tenants`, `certificates`, `maintenance`, `rent_payments`, `insurance`, `email_log`, `custom_templates`, `contractors`, `job_assignments`, `tenant_documents`, `user_profiles`, `stripe_subscriptions` (added Session 9)

The `user_profiles` row is queried by `currentUser.id` via `.maybeSingle()` and stored in `D.userProfile`. Use the `_profileName()` helper (not raw `email.split('@')[0]`) for all landlord name references in AI prompts and legal documents — it resolves `full_name` from the profile, falling back to email username.

### Subscription Plan Gating (Session 9 → Updated May 2026)
**Trial state:** All trial functions stubbed to always return full access (`isTrialActive() → true`, `isTrialExpired() → false`, `trialDaysLeft() → 30`). `getTrialState()` returns a safe full-access state with both old (`isTrialing`, `daysLeft`) and new (`isExpired`, `daysRemaining`) key shapes preserved.

**Plan resolution:** `window._userPlan` set at startup from `stripe_subscriptions.plan_name` (falls back to `'trial'`). `getUserPlan()` reads from this cached value. Trial users get full Portfolio access via `effectivePlan()`.

| Plan | Property limit | Features gated |
|---|---|---|
| Starter | 2 | Core only: compliance, certificates, maintenance, templates, calendar, AI assistant. NO financials, rent, insurance, contractors, MTD, inventory. |
| Landlord | **5** (was 10) | Starter + financials, rent, insurance, contractors. NO MTD, NO inventory. |
| Portfolio | Unlimited | All features: compliance, certificates, maintenance, templates, calendar, assistant, financials, rent, insurance, contractors, MTD, inventory-reports. |

**Gating enforcement:** `PLAN_FEATURES` constant (line 911) maps each plan to an array of allowed feature slugs. `nav()` checks feature access before rendering restricted pages. `PLAN_LIMITS = { starter:2, landlord:5, portfolio:999 }` controls property creation.

**Active plan helpers:** `getUserPlan()`, `isPortfolio()`, `isLandlordOrAbove()`, `isStarter()`, `getPropLimit()`, `upgradePrompt(feature, targetPlan)`, `redirectToCheckout(plan)`, `applyPlanGating()`. `redirectToCheckout()` recreates the Stripe checkout session and falls back to `profile.html` on edge function failure. Trial modals (`showTrialExpiryPopup`, `showTrialUpgradeModal`) use `btn-navy btn-sm` for non-highlighted plan cards.

### AI Chat Assistant (`sendChat()` in `landlord.html`)
- Powered by Claude via `ai-proxy` edge function (replaced `super-processor` — Session 6)
- Session 9 upgrade: `SYSTEM_PROMPT` constant (line 631, template literal) provides the AI with full platform knowledge + UK law expertise
- **Platform knowledge:** all sidebar navigation paths, feature locations, key workflows (Section 8, e-sign, rent marking, RRA sheet), pricing
- **Law expertise:** RRA 2025, all 38 Section 8 grounds, Section 13, Awaab's Law, deposits, EPC/EICR/GSC, Right to Rent, HMO licensing, MTD phases, Section 24
- **Rules for AI:** give exact sidebar navigation path for platform questions, be honest about limitations, always state guidance only/not legal advice
- Chat history stored in `D.chat[]` (in-memory only — clears on refresh)
- Input placeholder updated to hint at both legal and platform questions
- `max_tokens` set to 800 (was 600 before Session 9)

### AI Inventory Report (`moInventoryReport()` in `landlord.html`)
- Upload room photos → AI generates a formal room-by-room condition report
- Supports 4 report types: Move-in, Move-out, Mid-tenancy inspection, General inventory
- **Session 9 bug fix:** file input was inside `#inv-upload-box` div — `invPhotosSelected()` replaced innerHTML, destroying the input element. Files now saved to `window._invFiles` and the input stays in DOM.
- **Photo limit:** 12 photos (was 8 before fix)
- **AI prompt:** structured room-by-room format (KITCHEN, LIVING ROOM, BEDROOM 1/2, BATHROOM, HALLWAY/EXTERIOR) with photo filenames as room hints, condition rating (Excellent/Good/Fair/Poor), deposit risk assessment
- **PDF download:** jsPDF with auto-pagination (Session 9 upgrade from `window.print()`)
- **Output container:** `max-height:55vh` (was 280px)
- AI model: `claude-sonnet-4-5` with `max_tokens:2000`

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
| 1 | HTTPS "Not secure" on nexlet.co.uk | GitHub Pages SSL | Pending |
| 2 | Resend SPF/DKIM records not set | Email delivery | Pending — emails unreliable |
| 3 | RRA PDF (GOV.UK Form 3A) not attached | Section 8 notices | **IMPROVED Session 13** — direct Form 3A download link added to review screen; actual PDF bundle pending |
| 4 | Section 8 output is draft text only — handoff to Form 3A UI | UX | **IMPROVED Session 13** — Form 3A link added, instructions clear; complete Form 3A auto-fill pending |
| 5 | Email sending via `super-processor` (not dedicated function) | Architecture | **FIXED Session 6** — replaced with `ai-proxy` |
| 6 | PDF export via `window.print()` (not jsPDF) | Landlord dashboard | **FIXED Session 9** — `downloadAsPDF()`, `s8DownloadPDF()`, `invDownloadPDF()` all rewritten to jsPDF with A4 auto-pagination |
| 7 | No tenant data input validation | Tenant portal | Technical debt |
| 8 | No offline/error recovery states | General | Technical debt |
| 9 | MX record missing for `nexlet.co.uk` | DNS / Email | Post-launch |
| 10 | Supabase credentials hardcoded in HTML files | Security hygiene | Acceptable — anon key is public-safe |
| 11 | `parseInt()` on UUID `prop_id`/`tenant_id` values — produces NaN | Data integrity | **FIXED Session 7** — replaced with `String()` (22 locations) |
| 12 | `tenant_documents` table missing from DB — KYC scanning fails silently | Database | **SQL created** — run `session7_tenant_documents.sql` in Supabase SQL Editor |
| 13 | `tenant-documents` Storage bucket RLS — uploads fail with "row-level security policy" | Storage | Pending — add INSERT + SELECT RLS policies via Supabase Dashboard (see Session 18 step-by-step) |
| 14 | Section 8 missing RRA 2025 grounds (1B, 2ZA, 2ZB, 2ZC, 2ZD) | Legal compliance | **FIXED Session 7** |
| 15 | Landlord name derived from email username instead of `user_profiles.full_name` | Document generation | **FIXED Session 8** — added `_profileName()` helper |
| 16 | Footer links on `index.html` — 6 dead `href="#"` links | Marketing page | **FIXED Session 8** — all now point to real `.html` files; added Complaints link |
| 17 | No complaints policy page | Legal compliance | **FIXED Session 8** — created `complaints.html` |
| 18 | Rent "Mark received" errors on save | Rent module | **FIXED Session 9** |
| 19 | Property detail tabs unresponsive | Property detail | **FIXED Session 9** |
| 20 | Generated document output shrunk to 360px | Document gen | **FIXED Session 9** |
| 21 | Calendar "Mark received" parsed rent amount from display label | Calendar | **FIXED Session 9** |
| 22 | `rent_payments` table has no SQL migration file in repo | Database docs | **PARTIAL** — table exists in DB but `session14_rent_payments.sql` not yet committed to repo |
| 23 | Inventory report: file input destroyed by `innerHTML` replacement | Inventory | **FIXED Session 9** |
| 24 | No subscription plan gating | Architecture | **FIXED Session 9** |
| 25 | S8_GROUNDS had 31 entries, comment said "37" | Documentation | **FIXED Session 13** — expanded to 38 grounds, all comments updated |
| 26 | Template count comment said "17 AI-generated" (actual: 20) | Documentation | **FIXED Session 13** |
| 27 | 14 bare `console.error` calls in production code | Code quality | **FIXED Session 13** — wrapped in `_logError()` behind `RENTSAFE_DEBUG` flag |
| 28 | Stray `alert('Add rooms — coming soon')` | UX | **FIXED Session 13** — replaced with `toast()` |
| 29 | `esign_requests` table has no SQL migration file | Database | **FIXED Session 13** — `session10_esign_requests.sql` created |
| 30 | `moFinancials` PDF marked "coming soon" but actually implemented | Documentation | **FIXED Session 13** — comment corrected |
| 31 | Inventory report was modal-only, no persistence or tenant sharing | Feature gap | **FIXED Session 13** — full-page view, send-to-tenant with email body, DB persistence added |
| 32 | Document Library had no inline preview | UX | **FIXED Session 13** — View button opens inline viewer |
| 33 | Tenant wizard was 7-step, overly complex for basic tenant creation | UX | **FIXED Session 14** — replaced with single-screen fast-add modal |
| 34 | No compliance checklist per tenant | Feature gap | **FIXED Session 14** — RAG checklist with 5 items, expandable accordion, JSONB persistence |
| 35 | No free trial system — all users defaulted to portfolio | Feature gap | **FIXED Session 14** — 30-day trial with expiry popup, banner, indicator, email triggers |
| 36 | No plan gating on inventory-reports page | Plan gating | **FIXED Session 14** — `nav()` now gates `inventory-reports` for non-Portfolio users |
| 37 | `session13_inventory_reports.sql` referenced in change log but not committed to repo | Database docs | Pending — file must be created |
| 38 | `session14_tenant_checklist.sql` referenced in change log but not committed to repo | Database docs | Pending — file must be created |
| 39 | `pretenancy_checks` table + `pretenancy-audits` Storage bucket not created | Database | Pending — run `CREATE TABLE` in SQL Editor + create bucket in Supabase Dashboard → Storage |
| 40 | `tenant_type` column may not exist on `tenants` table | Database | Pending — `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_type text;` |
| 41 | `session14_trial_fields.sql` referenced in change log but not committed to repo | Database docs | Pending — file must be created |
| 42 | Back button exits app (no browser history in SPA) | Navigation | **FIXED Session 18** — `nav()` uses `history.pushState` + `popstate` listener |
| 43 | `certificates` table missing `amount` column — EICR save fails | Database | **FIXED Session 18** — code-side fallback removes `amount` + `cert_ref` on schema error. Pending DB: `ALTER TABLE certificates ADD COLUMN IF NOT EXISTS amount numeric;` |
| 44 | `properties` table missing `status`, `archive_reason`, `archived_at`, `vacant_since`, `tenancy_started_at`, `tenancy_ended_at` columns | Database | Pending — run: `ALTER TABLE properties ADD COLUMN IF NOT EXISTS status text, ADD COLUMN IF NOT EXISTS archive_reason text, ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS vacant_since timestamptz, ADD COLUMN IF NOT EXISTS tenancy_started_at timestamptz, ADD COLUMN IF NOT EXISTS tenancy_ended_at timestamptz;` |

---

## 11. Pricing & Plans

Pricing uses a **founding / standard** two-tier model displayed via a billing toggle on `index.html`. The JS `prices` object (in the inline `<script>` at the bottom of `index.html`) drives all displayed values.

| Plan | Founding price (monthly) | Founding price (annual) | Standard price (monthly) | Standard price (annual) | Properties | Target user |
|---|---|---|---|---|---|---|---|
| Starter | £5.99/mo | £4.99/mo | £9.99/mo | £8.33/mo | Up to 2 | Accidental landlords |
| Landlord | £12.99/mo | £10.83/mo | £19.99/mo | £16.66/mo | Up to 5 | ★ Most popular |
| Portfolio | £24.99/mo | £20.83/mo | £39.99/mo | £33.32/mo | Unlimited | Portfolio landlords |

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

### Pricing Update — 17 May 2026 — Full Price Refresh
**Date:** 17 May 2026
- **All plans repriced:** Starter £5.99/£9.99, Landlord £12.99/£19.99, Portfolio £24.99/£39.99 (founding/standard monthly)
- **Yearly rates added:** Starter £59.90/£99.90, Landlord £129.90/£199.90, Portfolio £249.90/£399.90
- **Property limits updated:** Starter 2, Landlord 5, Portfolio Unlimited
- Changes applied in `index.html` (HTML display + JS `prices` object), `landlord.html` (PRICING comment, trial modals, PLAN_LIMITS, PLAN_FEATURES)

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
  - Email: `{ type: 'send_email', to, subject, html }` → sends via Resend from `documents@nexlet.co.uk`
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

**5. AI Assistant upgraded with platform knowledge**
- Rewrote system prompt from 25-word generic to ~500-word comprehensive template literal (`SYSTEM_PROMPT` constant at line 631)
- Covers: all sidebar navigation paths, feature locations, key workflows (Section 8, Section 13, e-sign, Welcome Kit, RRA sheet, rent marking), pricing (3 tiers)
- Also retains full UK law expertise: RRA 2025, Section 8/13, Awaab's Law, deposits, EPC/EICR/GSC, Right to Rent, HMO licensing, MTD phases, Section 24
- Rules for Claude: give exact sidebar paths, be honest about limitations, always disclaim "not legal advice"
- Increased `max_tokens` 600→800
- Updated initial greeting and input placeholder to hint at platform questions

**6. Inventory report generation fixed**
- File input was nested inside `#inv-upload-box` div — `invPhotosSelected()` replaced its innerHTML, destroying the `<input>` element
- Files now saved to `window._invFiles` array; input stays in DOM; `generateInventoryReport()` reads from saved files
- AI prompt rewritten: structured room-by-room format (KITCHEN/LIVING ROOM/BEDROOM/BATHROOM/HALLWAY) with photo filenames as hints, condition ratings, deposit risk
- Photo limit increased 8→12; `max_tokens` 1500→2000
- `invDownloadPDF()`: `window.print()` → jsPDF with auto-pagination
- Output container: `max-height:280px` → `55vh`

**7. Subscription plan gating implemented**
- Added `stripe_subscriptions.plan_name` query to `loadData()` (now 13 parallel queries) — falls back to `'portfolio'` for grandfathered users
- Plan helpers: `getUserPlan()`, `isPortfolio()`, `isLandlordOrAbove()`, `isStarter()`, `getPropLimit()`, `upgradePrompt(feature, plan)`
- `applyPlanGating()` runs after load — adds PRO badge to MTD sidebar item, intercepts clicks with upgrade prompt
- `nav()` intercepts restricted routes: `/mtd` (Portfolio only), `/financials`/`/rent`/`/insurance`/`/contractors` (Landlord+ only)
- `moAddProp()` blocks property creation at plan limit (Starter: 2, Landlord: 10, Portfolio: unlimited)
- Inventory Report banner hidden on property detail page for non-Portfolio users
- **Landing page updated:** tagline changed to "Tiered by portfolio size", Landlord card removed MTD+Inventory, Portfolio card added both as unique features, comparison table rows shifted
- All gated features show `upgradePrompt()` modal with a link to `profile.html` for Stripe billing

#### Remaining for Next Session (Priority Order)
1. **guidance-content.js** — NRLA compliance guide topics: Right to Rent checks, written tenancy terms, guarantor process, welcome letter

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

#### Wizard Restructure: 6 Steps → Variable Steps (7 or 4)
- **Old flow (6 steps):** Details → RTR → Deposit → Rent → Insurance → Review
- **New flow — First tenant at property (lead, 7 steps):** Details → IDs → RTR → Deposit → Rent → Insurance → Review
- **New flow — Additional tenants (4 steps):** Details → IDs → RTR → Review (deposit/rent/insurance auto-copied from lead tenant)
- **Step 2 — IDs:** 2 document slots (1 required, 1 optional) with AI scan. 9 acceptable ID types.
- **Step 3 — RTR:** 9 document types, AI scan with issuing authority extraction.
- **Fix:** Removed `first_pay_date` and `pay_method` from tenant insert — columns didn't exist in DB schema.
- **`moTenant`:** Auto-detects if first active tenant at property. Sets `isLead` flag and `totalSteps` (7 or 4). For subsequent tenants, pre-fills deposit, rent, scheme from lead tenant.
- **`_renderTenantStep`:** Variable step labels and progress bar (4 or 7 steps).
- **`tenantStepNext`:** Non-lead tenants jump from step 3 to save (step 4 = review).

---

### Session 11 — May 2026 — Account Deletion, Tenancy Lifecycle, Email Alerts & UX Polish

#### Account Closure (profile.html + js/profile.js)
- **Created `js/profile.js`** — full IIFE module for account & billing page (was missing — page was non-functional)
- **Section 4 — Danger Zone** added to `profile.html`: red-bordered "Close My Account" card
- **Closure modal:** Requires exact email confirmation, then soft-deletes via `user_profiles.deleted_at`, cancels Stripe subscription, logs `ACCOUNT_CLOSED` to `audit_log`, signs out
- **CSS:** `.btn-close-account` red outline button, confirmation modal with disabled-till-match button
- **New SQL:** `session_archive.sql` — adds `user_profiles.deleted_at`, `tenants.archived`, `tenants.archived_at`, `tenants.end_reason`

#### End Tenancy & Archive (landlord.html)
- **`moEndTenancy(tid)`** modal: end reason dropdown (mutual/notice/eviction/abandoned), end date picker
- **`_endTenancy(tid)`** function: sets `status='Ended'`, `archived=true`, `archived_at`, `end_reason`, `end_date`; updates in-memory cache; logs `END_TENANCY` audit
- **Tenancy card buttons** in `pgTenantDetail`: shows "✎ Edit" + "⏻ End Tenancy" for active tenants; shows "📦 Archived" label for ended tenants
- **Archive banner** in tenant detail: "Tenancy Ended — Archived" with date, reason, preservation notice
- **`pgTenants()` filter tabs:** Active / Ended / All toggle with counts, ended rows at `.65` opacity with "Archived" badge

#### Email Alert System — Deploy & Fix
- **`email-alerts` edge function deployed** — created `supabase/functions/email-alerts/index.ts`, deployed via `npx supabase functions deploy email-alerts`
- **Fixed `YOUR_SERVICE_ROLE_KEY` placeholder** in `sprint10_step2_cron.sql` — replaced with real service role key, cron jobs recreated
- **Added `checkAllReminders()` on login** — fires weekly compliance digest + all 12 reminder types at `landlord.html:852`
- **Fixed premature `return` bug** in `checkAllReminders()` — digest section no longer exits entire function when already-sent

#### Document Generation — Output Display Fixes
- **CSS leaking into PDF:** Added `_stripCSSCrap()` function (line 8124) — strips `<style>` blocks, CSS `{...}` rule blocks, HTML tags, `@page`/`@media` blocks from AI output
- **Scrollbar layout shift:** Added `scrollbar-gutter:stable` to `.mo-box` (desktop + mobile) — prevents horizontal reflow when scrollbar appears after generation
- **Input form collapse:** Wrapped gen-modal inputs in `#gen-inputs`, auto-collapses after generation, `toggleGenInputs()` shows "✎ Edit document details ▸" link
- **Modal wider:** Added `mo-wide` class (700px) for better document readability
- **Prompt tightened:** `PLACEHOLDER_RULE` now explicitly says "NO HTML, NO CSS, NO markdown, NO code blocks"
- **PDF signing block:** Added EXECUTION section to `downloadAsPDF()` with signature/date lines + document timestamp (HH:MM:SS)
- **Model/performance:** `max_tokens` kept at 1000, prompt trimmed ~60%

#### Sidebar Navigation Additions
- **Calendar** — standalone sidebar item (between Maintenance and Finance), calendar grid SVG icon
- **Rent Tracker** — inside Finance & Tax group, below Finance, with £ icon + `nav-badge-rent` badge showing Late/Due count
- **Insurance** — inside Compliance group, shield+checkmark SVG icon, `data-page="insurance"`
- **Inspections** — inside Compliance group, clipboard+magnifying glass SVG icon, `data-page="inspections"`
- **`updateNavBadges()`** updated to show red badge on Rent Tracker for overdue payments

#### Dashboard UX Improvements
- **Quick actions dropdown:** Replaced 3 buttons (Scan docs, Add certificate, Report issue) with single "Quick actions ▾" dropdown toggle — opens upward on click, closes on outside click
- **Action items clickable:** `ai-row` cards in dashboard now navigate to relevant page (compliance/maintenance/financials) with hover highlight + navy `›` arrow
- **UA() action items:** Added `link` property to every action (cert→compliance, maintenance→maintenance, rent→financials, licence→compliance, mortgage→financials)
- **Today panel:** Removed "View calendar" button (Calendar now in sidebar)

#### Property List Cleanup
- **Removed "🚀 Setup" button** from property rows — keep only `›` navigate button
- **Removed beds/type badges** column from property rows — visible inside property detail page

#### Templates Page Fixes
- **RRA deadline banner:** Wrapped in date check — auto-hides after 31 May 2026 and when all tenants have been sent the sheet
- **Disclaimer box:** Moved from above all templates to below categories (reads as footnote not warning), reduced margin
- **"↑ Use my own" button:** Now passes `templateId` + `templateName` to `moUploadTemplate()` so modal knows context
- **`moUploadTemplate()`** updated signature to `(templateId, templateName)` with context-aware subtitle + hidden `#upload-tmpl-id` input

#### Maintenance / Kanban Fixes
- **Kanban responsiveness:** Column `max-width:260px`, mobile touch scroll, "← Scroll to see all stages →" hint bar
- **Stage buttons simplified:** Single "→ Next Stage" button per card + ▾ dropdown for other stages
- **Dropdown outside-click-close:** `stage-overflow-dd` class, global click listener closes any open dropdown
- **Awaab's Law prominence:** Cards get full red border + white-on-red `⚠ Awaab's Law` pill badge
- **Empty column polish:** "✓ Clear" checkmark replacing grey "No jobs"

#### Financials Table Slim-down
- **9 columns → 6:** Removed separate Mortgage/Insurance/Maintenance/Tax columns
- **Expenses column:** Combined total (mortgage + insurance + maintenance) with M / I / R breakdown sub-text
- **Tax footnote:** Added "Tax estimates in Detail view are indicative only — not financial advice"

#### Compliance Page — View Toggle
- **⚠️ Action Required (default)** — filtered action items with urgency sorting
- **📋 Full Audit** — property-by-property breakdown with every cert slot color-coded
- **Toggle buttons** at panel header and full view header, `window._compView` persists across nav
- **`filterCompliance()`** now resets `_compView='action'` when stat card clicked

#### Inspection Photo Upload
- **Photo field** in `moAddInspection()` modal: multi-file (max 5, jpg/png), live thumbnail preview with ✕ remove
- **`previewInspPhotos()` / `removeInspPhoto()`** functions: DataTransfer-based file list management
- **`saveInspection()`** uploads to `documents` storage bucket under `inspections/{propId}/`, stores `photos` array in JSONB
- **`pgInspections()`** rows show 36px thumbnails, click to open full image

#### Insurance Page Topbar
- **"+ Add policy" button** added to `pgInsurance()` topbar, calls `moAddInsurance(null,'','')`

#### AI Assistant System Prompt — Pricing Correction
- Updated pricing line in `SYSTEM_PROMPT` constant (`landlord.html:677`) — corrected property limits (Starter=2, Landlord=10, Portfolio=unlimited), added founding-vs-standard pricing, annual equivalents, 30-day free trial + lifetime lock for first 100 users

#### Section 8 Dashboard Dropdown — Option Visibility Fix
- **Problem:** The `<select>` on the dark navy Section 8 dashboard card had `color:#fff` — the `<option>` elements inherited white text, rendering invisible against the browser's default white dropdown background
- **Fix:** Added `style="color:var(--txt)"` to each `<option>` in the `s8-dash-sel` dropdown (`landlord.html:3555`) so property names render in dark navy text inside the dropdown popup while the select itself stays white-on-dark

#### Postcode Lookup — Redesigned with Multi-Result Picker
- **Problem:** `lookupPostcode()` used exact-match endpoint returning single result; picked wrong city (used `parliamentary_constituency` as fallback); no results list for partial postcodes; no lookup in Edit Property modal
- **Fix (`landlord.html:10727`):** Switched to `api.postcodes.io/postcodes?q=` query endpoint returning up to 8 matches; shows clickable result list (postcode + ward/district/region); auto-fills city and postcode on selection; falls back to exact lookup; removed `parliamentary_constituency` fallback; added lookup to `moEditProp()` with `ep-` prefix IDs

#### Tenant Wizard — Deposit Certificate AI Scan (Step 4)
- Added `scanDepositCert()` function — uploads DPS/TDS/MyDeposits certificate, AI extracts scheme name, reference number, and deposit amount; auto-fills `ts-dep-scheme`, `ts-dep-ref`, `ts-deposit` fields
- Scan box with "✦ AI auto-extraction" badge in Step 4 deposit section

#### Tenant Wizard — Insurance Document AI Scan (Step 6)
- Added `scanInsDoc(insKey, input)` function — each of 4 insurance types (Buildings, Contents, Liability, Rent Guarantee) now has scan box; AI extracts provider, policy number, expiry date, annual premium; auto-fills matching fields

#### Tenant Wizard — ID Type Dropdown Default Bug Fix
- **Problem:** Step 2 ID document type `<select>` had no empty placeholder — browser auto-selected "Passport" when state was empty, making review show "✓ 1 document" despite nothing being added
- **Fix:** Added `<option value="">Select document type…</option>` as first option in both ID 1 and ID 2 selects

#### Database — Missing Tenant Columns
- **Problem:** `session10_tenants_columns.sql` had not been run — `rtr_check_date`, `rtr_checked_by`, `rtr_expiry`, `addr_proof_1`, `addr_proof_2`, `is_lead`, `invite_used` etc. columns missing from `tenants` table
- **Fix:** Ran `session10_tenants_columns.sql` (13 columns added to `tenants` table)

#### AI Certificate Scanning — Prompt Mismatch & Missing Fields Fix
- **Problem:** `scanAndFill()` sent the same generic "compliance certificate" prompt for every document type. `scanDepositCert` and `scanInsDoc` tried to read fields (`ref`, `amount`, `policy_number`, `premium`) the AI was never asked for — so they never auto-filled. The `moCert()` form also lacked fields for certificate/reference number and amount/cost.
- **Fixes:**
  - **`scanAndFill(file, onResult, customPrompt)`** (`landlord.html:1018`) — now accepts optional 3rd parameter for a custom AI prompt, falls back to default if not provided
  - **`scanDepositCert`** — sends deposit-specific prompt: `"Extract: scheme name (DPS/MyDeposits/TDS), deposit amount in GBP, protection reference number. Keys: scheme, amount, ref."`
  - **`scanInsDoc`** — sends insurance-specific prompt: `"Extract: provider, policy number, expiry date, annual premium in GBP. Keys: provider, policy_number, expiry, premium."`
  - **`scanDoc`** (`moCert` form) — sends enhanced prompt asking for `ref`, `amount` in addition to `type, issued, expiry, engineer, address`; auto-fills new `#cref` and `#camt` fields
  - **`moCert()` form** — added two new fields: Certificate/reference number (`#cref`) and Amount/cost (`#camt`)
  - **`saveCertToDB()`** — now reads and saves `cert_ref` and `amount` to DB insert

#### Tech Debt / Infrastructure
- **`C:\Dev\rentsafeai\session_archive.sql`** — DB migration for archived tenants + account soft-delete
- **`C:\Dev\rentsafeai\sprint10_fix_cron_key.sql`** — re-creates pg_cron jobs with real service role key
- **`C:\Dev\rentsafeai\supabase\functions\email-alerts\`** — deployed edge function directory
- **`session11_landlord_sig.sql`** — adds landlord signature columns to `esign_requests` table (run in Supabase SQL Editor)

---

### Session 13 — May 2026 — S8 Grounds Update & Code Quality Fixes
**Date:** May 2026

#### Section 8 Grounds — Updated to Full 38 Grounds
- **Before:** 31 grounds with outdated comment claiming "37"
- **After:** 38 grounds (full RRA 2025 Schedule 2 as amended 1 May 2026)
- **Removed:** Ground 3 (Former holiday let) — OMITTED by RRA 2025, commented out with note
- **Removed:** Ground 16 (Tenant was employee) — renumbered to Ground 5C, moved from Discretionary to Mandatory
- **Added 9 new grounds (all RRA 2025):**
  - 5A — Qualifying agricultural worker (Mandatory)
  - 5B — Social housing — employment requirements not met (Mandatory)
  - 5C — Employment-related tenancy ended / was old Ground 16 (Mandatory)
  - 5D — Social housing — employment condition breached (Mandatory)
  - 5E — Landlord needs dwelling for supported accommodation (Mandatory)
  - 5F — Supported accommodation — support ended/no longer needed (Mandatory)
  - 5G — Homeless duty under s193 HA 1996 discharged (Mandatory)
  - 5H — Eligibility conditions no longer met (Mandatory)
  - 14ZA — Conviction for indictable offence during a riot (Discretionary)
- **Note:** 5A-5H and 14ZA are niche/social-housing grounds — marked with appropriate disclaimers
- **Ground 8A** (Persistent rent arrears) — retained pending legislative verification
- Updated all comment counts: "all 37 RRA 2025 grounds" → correct count
- Updated AI system prompt reference from "31 grounds" → "38 grounds"

#### Code Quality Fixes
- **`alert()` replaced:** Stray `alert('Add rooms — coming soon')` at Rooms button → `toast()`
- **`console.error` wrapped:** 14 bare `console.error` calls replaced with `_logError()` helper behind `RENTSAFE_DEBUG` flag — can be toggled off for production
- **Template count fixed:** Comment said "17 AI-generated legal documents" → corrected to "20"
- **Section 8 Form 3A link:** Added direct GOV.UK Form 3A PDF download button to Section 8 review screen
- **moFinancials PDF:** Comment was stale — `exportFinancialsPDF()` already implemented and wired; comment corrected

#### Database
- **`esign_requests` SQL migration:** Created `session10_esign_requests.sql` with full table schema and RLS policies. Ready to run in Supabase SQL Editor.
- **`inventory_reports` SQL migration:** Created `session13_inventory_reports.sql` — table for persistent storage of AI-generated inventory reports with photo metadata.

#### Inventory Reports — Full-Page View & Send-to-Tenant
- **Before:** Inventory report was text-only in a pop-up modal, no way to view past reports, no send-to-tenant
- **After session 13:**
  - **Full-page view:** Sidebar > Compliance > **Inventory Reports** — dedicated page lists all reports, click any for full-width scrolling view with text + photo gallery
  - **Photo gallery:** 3-column responsive grid, click to enlarge any photo
  - **Three actions per report:** Download PDF (text + photos embedded), Send to tenant, Copy text
  - **Send-to-tenant:** Auto-generated email body with property details, report type, date, photo count, and 7-day review period. Editable before sending. PDF auto-generated and attached. Sent via `ai-proxy` edge function.
  - **Persistence:** Auto-saves to `inventory_reports` table on generation (photos uploaded to `documents` Storage bucket). Loads saved reports on startup. Falls back to session-only if table doesn't exist yet.
  - **Document Library:** All stored documents now have a "👁 View" button that opens inline viewer (images full-size, PDFs in iframe)
- **New functions:** `pgInventoryReports()`, `pgInventoryReport()`, `sendInventoryReport()`, `sendInventoryNow()`, `invReportDownloadPDF()`, `_saveInventoryToDb()`
- **Sidebar:** Added under Compliance group (between Inspections and Maintenance)
- **AI system prompt** updated to include Inventory Reports location + features

#### Infrastructure Items Noted (manual-only, not code-fixable)
- Resend DKIM/SPF records — need DNS configuration
- GitHub Pages HTTPS/SSL — needs enabling
- MX record for `nexlet.co.uk` — DNS
- `tenant-documents` Storage bucket — create in Supabase Dashboard

---

### Session 14 — May 2026 — Tenant Fast-Add + Compliance Checklist + Free Trial System
**Date:** May 2026

#### Tenant Onboarding — Fast-Add Modal
- **Removed:** 7-step tenant wizard (~645 lines — `_renderTenantStep`, `_tenantStepHtml`, `tenantStepNext`, `tenantStepBack`, `tsAddrFile`)
- **Replaced with:** Single-screen fast-add modal (`moTenant`) with 7 fields: name, email, phone, property, move-in date, rent, deposit + portal invite toggle
- **Simplified insert:** `_saveTenantSetupToDB` reduced to ~80 lines — basic tenant insert with default `compliance_checklist` JSONB
- **All 6 call sites preserved** — backwards-compatible `moTenant(pid)` signature

#### RAG Compliance Checklist
- **5 checklist items per tenant:** Right to Rent, ID documents, Tenancy agreement, Rent Guarantee Insurance, Buildings/Contents Insurance
- **Auto-detect:** RTR checks `rtr_check_date` on tenant record; ID docs count uploaded documents from `tenant_documents`
- **Insurance rows:** Manual-only — show "Unprotected" (red) until explicitly saved
- **Display:** `pgTenants()` table shows 5 RAG dots column; `pgTenantDetail()` shows full expandable accordion with dropdown, detail input, date picker
- **Persistence:** `compliance_checklist` JSONB column on `tenants` table. Falls back gracefully if column doesn't exist yet.
- **New functions:** `CHECKLIST_ITEMS`, `_checklistDefault`, `_checklistRAG`, `_checklistRowHtml`, `toggleChecklistItem`, `_saveChecklistToDB`, `_onChecklistChange`, `_onChecklistDetailChange`, `_onChecklistDateChange`
- **SQL migration:** `session14_tenant_checklist.sql`

#### 30-Day Free Trial System
- **Trial fields on `user_profiles`:** `trial_started_at`, `trial_expires_at`, `plan`, `plan_activated_at`
- **On first login:** Inline code in `initApp` auto-sets `trial_expires_at` to now + 30 days on `user_profiles`, `plan = 'trial'`
- **Architecture note:** Trial state resolved inline at startup via computed `_trialState` cache. `getTrialState()` returns cached state on subsequent calls. All UI (indicator, chip, banner, popup) rendered inline to avoid hoisting issues with the ~11k-line script block.
- **During trial:** Full portfolio-level access — `effectivePlan()` returns `'portfolio'`
- **Trial expiry (hard popup):** Non-dismissable modal with 3 tier cards, founding prices, CTA links to `profile.html`.
- **Amber banner:** Shown on every page after trial expiry — "Your trial ended on [date]. Upgrade to keep access →"
- **Header indicator:** Sidebar footer shows "Trial — X days left" (amber), turns red at ≤5 days. After upgrade shows plan name in green.
- **Mid-trial upgrade chip:** Sidebar shows "🎁 Founding price — upgrade now" card during trial. Click opens tier card modal with X to dismiss.
- **Post-trial gating:** `nav()` blocks all non-dashboard pages for expired trial users. `getPropLimit()` returns 0.
- **Trial emails:** `sendTrialEmail(type)` — day 25 (5 days left), day 28 (2 days), day 30 (last day), expired. Sent via `ai-proxy` edge function. Called from cron or manually.
- **Existing users:** SQL migration grandfaters existing users to `plan = 'portfolio'` with `trial_expires_at = now()` (trial ended).
- **Plan resolution:** `effectivePlan()` is the single source of truth. Replaces `window._userPlan` for all feature gating.
- **New functions:** `getTrialState`, `isTrialActive`, `isTrialExpired`, `trialDaysLeft`, `effectivePlan`, `isExpired`, `_ensureTrialStarted`, `showTrialExpiryPopup`, `showTrialExpiredBanner`, `renderTrialIndicator`, `renderTrialUpgradeChip`, `showTrialUpgradeModal`, `trialFeatureGate`, `sendTrialEmail`
- **SQL migration:** `session14_trial_fields.sql`
- **Stripe checkout:** All plan upgrade CTAs link to `profile.html` (placeholder — Stripe PHP checkout endpoints to be wired post-launch)

#### Landing Page Rebrand (index.html) — Visual Differentiation from LetCompliance
- **Colour palette replaced:** Navy/blue/grey enterprise scheme → warm slate teal + amber scheme
  - `--navy #1B2F5E` → `--teal #2D6A6A` | `--blue #3B82F6` + `--gold #D4A853` → `--amber #E8923A`
  - `--bg #F8FAFC` → `--bg #F8F6F1` (off-white warmth) | `--text #0F1F3D` → `--text #1E2A2A`
  - All 4 variable renames applied globally + hardcoded `#131F35`, `#1a2a4a`, `#EFF6FF` hex values replaced
- **Hero rewritten:** Founder-voice copy — "The Renters' Rights Act changes everything. Are your properties ready?" / "Built by a landlord who manages real properties..."
- **CTA changed:** "Start free — no card needed" primary, "See what's changing on 31 May" secondary
- **Dashboard mockup replaced:** Inline compliance score gauge SVG with gradient arc (no external assets)
- **Urgency banner:** "Renters' Rights Act enforcement begins 31 May 2026 — are you compliant?" at page top
- **Founder strip:** "Built by Saby — landlord, managing agent, and developer. 115+ compliance checks run." between hero and features
- **Pricing cards:** "Founding member" amber badge + "Price locked for life" microcopy on all 3 tiers
- **Preserved:** All navigation links, signup hrefs, pricing points, Crisp/Formspree wiring, footer links

#### Full Platform Rebrand — RentSafeAI → NexLet
- **All 15 HTML files** rebranded: index.html, landlord.html, login.html, signup.html, tenant.html, profile.html, mtd.html, esign.html, terms.html, privacy.html, complaints.html, cookies.html, dpa.html, ai-disclaimer.html, app-mockup.html
- **Domain:** `rentsafeai.co.uk` → `nexlet.co.uk` (all email addresses, portal links, invite URLs)
- **Brand:** `RentSafe AI` / `RentSafeAI` / `RentSafe` → `NexLet`
- **Emails:** `documents@rentsafeai.co.uk` → `documents@nexlet.co.uk` (support, hello, noreply variants)
- **File references:** `rentsafeai_mtd` → `nexlet_mtd`, `rent-safe-ai` → `nexlet`
- **Supabase URLs, API keys, JWT tokens, GitHub URLs** — preserved unchanged
- **PROJECT_KNOWLEDGE.md** fully rebranded

#### Trial Hoisting Fix
- **Problem:** `getTrialState` / `_ensureTrialStarted` / `renderTrialIndicator` defined after `initApp` in the ~11k-line script block — browser failed to hoist function declarations
- **Fix:** All trial state resolution moved inline into `initApp`. `_trialState` pre-computed at startup. UI (indicator, chip, banner, popup) rendered inline. Only `showTrialExpiryPopup` / `showTrialUpgradeModal` remain as standalone functions (called from `onclick` handlers).
- **Supabase upser tfix:** `.upsert()` requires `.then(()=>{})` before `.catch(()=>{})` in supabase-js v2.39.3

#### Modified Functions (Session 14)
- **`getUserPlan()`** — stubbed to `return 'trial'` (prevents reference errors from `effectivePlan` hoisting issue)
- **`isPortfolio()`** — now plan-gated: `return getUserPlan()==='portfolio'||getUserPlan()==='pro'` (May 2026)
- **`isLandlordOrAbove()`** — stubbed to `return true` (full access during development)
- **`applyPlanGating()`** — stubbed to `return` (no-op, prevents DOM errors)
- `getPropLimit()` — returns 0 for expired trial
- `nav()` — adds expired trial block + `inventory-reports` gating (was missing)
- `initApp()` — trial resolution + UI rendered inline
- `moTenant()` — replaced wizard with fast-add modal
- `_saveTenantSetupToDB()` — simplified to basic insert
- `pgTenants()` — added compliance RAG dots column
- `pgTenantDetail()` — added compliance checklist panel

#### Payment Save Refactor (May 2026)
- **`savePayment()`** refactored into 3 functions:
  - `savePaymentRecord(payload, editId)` — writes to `rent_payments` only using columns: `prop_id`, `amount`, `due_date`, `paid_date`, `status`, `user_id`. Returns `{success, error, data}`. Wrapped in try/catch. On failure: error inline, modal stays open, button re-enabled for retry.
  - `sendPaymentReceipt({prop_id, month, amount, paid, ...})` — fire-and-forget email. Sent after `closeMo()`. Failures logged via `_logError` but never block save or close.
  - `savePayment(editId)` — orchestrator: disables button → shows "Saving..." → calls `savePaymentRecord` → on success shows "✓ Payment recorded" → closes modal → fires `sendPaymentReceipt` in background.
- **`markRentReceived()`** wrapped in try/catch. Console.log calls removed, replaced with `_logError` behind debug flag.
- **Column fix:** `month` and `notes` columns removed from DB payload until SQL migration (`session14_rent_payments.sql`) is run, which adds them via `ALTER TABLE ADD COLUMN IF NOT EXISTS`.
- **No plan gating** in either function — payment recording works for all tiers.
- **Known issue #22 fixed** — `session14_rent_payments.sql` created with full table schema + RLS.

### Session 18 — 17 May 2026 — Tenant Onboarding & Document Flows
**Date:** 17 May 2026

#### Post-Save Property Prompt
- After saving a property in `savePropToDB()`, a simplified 2-button modal asks: "Would you like to add a tenant?"
- **"Add tenant"** → navigates to `prop-detail` with pre-tenancy checklist loaded. Sets `window._addPropOrigin = 'property-detail'`.
- **"Not yet"** → returns to `_addPropOrigin` (properties page, set at start of `moAddProp()`).

#### Pre-Tenancy Checklist Audit
- **`_pretenancyRecord`** tracks each checked item with `{ checkedAt, landlordId }` timestamps.
- **"Add tenant" button** disabled until all 19 onboard items are checked.
- **`completePretenancyChecklist(pid)`** — saves to `pretenancy_checks` table (`id`, `prop_id`, `tenant_id` nullable, `landlord_id`, `checks` JSONB, `completed_at`, `bypassed`, `bypass_reason`), generates jsPDF audit trail, uploads to Supabase Storage `pretenancy-audits/`, then opens tenant form.
- **Bypass flow** — "Skip checks — I take full responsibility" link opens disclaimer modal. On accept: saves bypass record with `bypassed:true`, `bypass_reason`, generates audit PDF, opens tenant form.
- **PDF audit trail** — jsPDF showing property address, landlord email, each item with DONE/NOT DONE/BYPASSED status + timestamp, footer "Generated by NexLet · date · Timestamped compliance record".

#### Lead / Co-Tenant Toggle
- Added to `moTenant()`: toggle bar at top — "Lead tenant" (default, full form) / "Co-tenant" (name/email/phone only, hides `#ts-full-fields`).
- `toggleTenantType(type)` switches button styles + field visibility.
- Co-tenants: `tenant_type: 'co-tenant'`, `type: 'co-tenant'`, auto-copy property + dates from lead tenant, `rent: 0`, `deposit: 0`, `rent_day: null`, `is_lead: false`, skip property/date validation. Lead: `tenant_type: 'lead'`, full validation.
- **Post-save redirect:** checks `_addPropOrigin` — if `'property-detail'` navigates to `prop-detail`, else `tenants`.

#### Shared Document Upload Modal (`moTenantDocs`)
- `moTenantDocs(tenantId, propId)` — modal with 6 document slots (Passport/Photo ID, Right to Rent, Address Proof ×2, References, Other).
- Each slot: icon, label, existing docs with view links, Upload button (reuses `uploadTenantDoc`), AI Scan button (calls `moTenantDocsScan` with slot-specific extraction prompts).
- **Entry point 1:** `pgTenants()` table — new "Docs" column with upload button per tenant row.
- **Entry point 2:** Tenant detail page KYC section (already has per-slot uploads, unchanged).
- Upload refreshes the modal in-place via `moTenantDocsUpload` wrapper.

#### Tenant Quick View Slide-In Panel
- `pgTenants()` rows now show **property address** beneath tenant name (replacing phone number).
- Clicking a row opens `openTenantPanel(tid)` — a 380px right-side slide-in panel.
- Panel shows: property address, compliance RAG score (GSC/EICR/EPC/deposit), expiring certs within 60 days, tenant contact info, "View tenant details →" and "View property →" buttons.
- Closes via × button or clicking backdrop overlay (`closeTenantPanel()`).

### Session 17 — 17 May 2026 — Plan Gating Restore & Pricing Update
**Date:** 17 May 2026
- **Plan gating re-enabled:**
  - `getUserPlan()` → reads `window._userPlan` (no longer hardcoded `'trial'`)
  - `isPortfolio()` → `getUserPlan()==='portfolio'||getUserPlan()==='pro'`
  - `isLandlordOrAbove()` → `['landlord','portfolio','pro'].includes(getUserPlan())`
  - `applyPlanGating()` → annotated as intentional no-op
  - `PLAN_FEATURES` constant added (maps plan → allowed feature array for `canAccess()` equivalent)
  - `PLAN_LIMITS` landlord cap reduced: 10 → **5**
- **Pricing updated** across `landlord.html` and `index.html`:
  - Starter: £4.99→**£5.99** (founding), £7.99→**£9.99** (standard), yearly £59.90/£99.90
  - Landlord: £9.99→**£12.99** (founding), £14.99→**£19.99** (standard), yearly £129.90/£199.90
  - Portfolio: £23.99→**£24.99** (founding), standard £39.99 unchanged, yearly £249.90/£399.90
  - PRICING comment in AI system prompt updated with yearly rates
  - Trial footer changed: `"All plans include 30-day trial"` → `"No card required · Cancel anytime"`
- **Portfolio display:** `limit:999` now renders `"Unlimited properties"` in tier cards (conditional: ≥999)
- **Logo rebranding complete:** `login.html`, `signup.html` left/mobile logos fixed. All 14 email template `Rent<span>Safe AI</span>` → `NexLet` in `landlord.html`.
- **Sidebar CSS:** `.sidebar` background now uses `var(--navy)` instead of hardcoded `#0B1E3D`.
- **`redirectToCheckout()`** recreated with Stripe checkout fallback (redirects to `profile.html` on edge function failure).

### Session 16 — 16 May 2026 — Rebrand Completion & Colour Fixes
**Date:** 16 May 2026
- **Rebrand complete:** All remaining `RentSafeAI`, `RentSafe AI`, `rentsafeai.co.uk`, `documents@rentsafeai.co.uk` references purged from active files: `landlord.html`, `js/esign-content.js`, `email-alerts-index.ts`, `supabase/functions/email-alerts/index.ts`, `stripe-checkout-index.ts`, `supabase/functions/ai-proxy/index.ts`.
- **`RENTSAFE_DEBUG` → `NEXLET_DEBUG`** variable renamed in `landlord.html`.
- **Colour CSS refactor:** `--navy` changed from teal `#2D6A6A` to `#0B1E3D`, `--navy-mid` from `#1F4D4D` to `#162F5C`. All hardcoded `#00C896` → `var(--green)`, all `rgba(0,200,150,*)` → `var(--green-bg)`. Sidebar, buttons, and nav now use consistent navy blue.
- **Git remote:** Updated from `rentsafeai.git` to `nexlet.git`.
- **Merge resolution:** 5 git conflicts in `landlord.html` resolved — plan gates removed (matched remote), `markRentPaid()` and `tenant_id` auto-lookup preserved, upgrade-wall HTML removed.
- **`js/profile.js`** restored from remote after accidental overwrite — developer's Stripe work preserved.
- **Edge functions:** `email-alerts/index.ts` and `ai-proxy/index.ts` rebranded — require redeployment to Supabase for live email changes to take effect.

### Session 15 — May 2026 — Stripe Checkout Fixes & Deploy
**Date:** 15 May 2026
- **`stripe-checkout-index.ts:35`** — BASE_URL corrected from `https://rentsafeai.co.uk` to `https://nexlet.co.uk` (post-rebrand fix).
- **`stripe-checkout-index.ts:44`** — CORS headers fixed: added `Access-Control-Allow-Methods: POST, OPTIONS` to resolve preflight issues.
- **`stripe-checkout-index.ts` copied** to `supabase/functions/stripe-checkout/index.ts` — ready for deploy.
- **Pending — blocked on auth:** `npx supabase login` required before deploy. No `SUPABASE_ACCESS_TOKEN` present in environment. Once logged in, run:
  ```powershell
  npx supabase functions deploy stripe-checkout --project-ref mahtcfukgzbonwibtsxz
  ```
- **Note:** `stripe-webhook` also not yet deployed — same login needed first.

### Session 18 — 17 May 2026 — Property Status System & Tenancy Flows
**Date:** 17 May 2026

#### Property Status System
- Added `PROPERTY_STATUS` constant (`landlord.html:914-920`): 4 states — `vacant`, `active`, `refurbishment`, `archived` — with label, colour, and emoji badge
- Added `_statusPillClr()` helper for status background colours (`landlord.html:921`)
- Added `moPropertyStatus(pid)` modal — 4 status cards (archived excluded), current disabled/highlighted, opens via `openMo()` (`landlord.html:1742`)
- Added `changePropertyStatus(pid, newStatus)` — updates DB + in-memory, writes timestamp columns, logs audit, refreshes list (`landlord.html:1765`)
- New `properties` columns written on status change: `archived_at`, `vacant_since`, `tenancy_started_at`, `tenancy_ended_at`
- `savePropToDB()` now inserts `status: 'active'` for new properties (`landlord.html:1071`)
- Status badge pills on property list rows (`propRow` — clickable, opens `moPropertyStatus`)
- Status badge on property detail header (`pgPropDetail` — clickable)
- `pgProperties()` grouping restructured: Needs attention, Active Tenancy, Vacant, Refurbishment, Archived

#### Contextual Action Buttons
- Property detail header renders status-driven buttons (`landlord.html:4178-4186`):
  - **vacant** → "Start Tenancy" + "Archive"
  - **active** → "End Tenancy" + "Archive"
  - **refurbishment** → "Mark Ready" + "Archive"
  - **archived** → "View History" label only

#### Archive Flow
- `archiveProperty(pid)` replaced with proper modal + reason picker dropdown (Sold, No longer letting, Long-term vacant, Major refurbishment, Other) (`landlord.html:1712`)
- `_archivePropertyConfirm(pid)` writes `archive_reason` + `archived_at` to DB (`landlord.html:1733`)
- Archived properties hidden from main list by default; toggle "Show archived (X)" at page bottom (`landlord.html:3609-3618`)
- Archived rows render greyed-out (opacity 0.55) with "🔒 Read only" badge

#### Tenancy Flow Functions
- `startTenancy(pid)` — opens `mo-wide` modal with pre-tenancy checklist loaded inside via `initPropChecklist('ob', pid, 'onboard')` (`landlord.html:1789`)
- `endTenancy(pid)` — finds active tenant, bridges to `moEndTenancy(t.id)` (`landlord.html:1805`)
- `markRefurbReady(pid)` — confirmation modal, calls `changePropertyStatus(pid, 'vacant')` (`landlord.html:1810`)
- `_endTenancy(tid)` — after ending tenancy, resets property to `vacant` + sets `vacant_since`, navigates to `prop-detail` (`landlord.html:2903-2910`)
- Removed always-on loading panels (Tenancy start/end guides) from `pdTabContent`
- Removed `initPropChecklist('ob'/'db')` calls from `pdSetTab`
- Replaced tenant tab empty state with "Ready to start a tenancy?" CTA calling `startTenancy(pid)`

#### Void Period Nudges
- Property list (`propRow`): compact one-line amber strip inside address block if vacant ≥ 30 days (`landlord.html:3601-3606`)
- Property detail (`pgPropDetail`): full amber banner with day count + "Start Tenancy →" button if vacant ≥ 30 days (`landlord.html:4193-4204`)

#### Bug Fixes
- **EICR amount column:** `saveCertToDB()` wraps insert in try/catch; falls back to insert without `amount` + `cert_ref` columns if schema mismatch (`landlord.html:1250-1262`)
- **Documents upload error handling:** `uploadTenantDoc()` now checks `insErr` on DB insert with proper toast feedback (`landlord.html:5816-5817`). **Pending Supabase fix:** Storage bucket `tenant-documents` needs RLS INSERT policy.
- **Back button navigation:** `nav()` now uses `history.pushState`/`replaceState` + `#page/param` hash URLs. `popstate` listener re-renders correct page on browser back/forward (`landlord.html:8498-8535`)

#### Storage RLS Fix — Step-by-Step (Supabase Dashboard)
1. Go to https://supabase.com/dashboard/project/mahtcfukgzbonwibtsxz
2. **Storage → Buckets → `tenant-documents`** (create if missing via "New bucket", name `tenant-documents`, public bucket unchecked)
3. Click **Policies** tab → **New policy**
4. Choose **For full customization** → paste:
   ```sql
   -- Allow authenticated users to upload their own documents
   CREATE POLICY "Users can upload tenant documents"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
   ```
5. Also create a SELECT policy so docs can be viewed:
   ```sql
   CREATE POLICY "Users can view their tenant documents"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
   ```
6. Click **Review** → **Save policy**
7. Verify in **SQL Editor**: `SELECT * FROM tenant_documents;` and `SELECT * FROM storage.objects WHERE bucket_id = 'tenant-documents';`

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
| NexLet Starter | £9.99 | Monthly |
| NexLet Landlord | £19.99 | Monthly |
| NexLet Portfolio | £39.99 | Monthly |

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
