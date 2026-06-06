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
15. [COMPLIANCE_DOCS Reference](#15-compliance_docs-reference)
16. [Recent Features (May 2026)](#16-recent-features-may-2026)

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
├── feedback.html                   Feedback & Suggestions page (Session 19)
├── landlord.html                   Main SPA app (~11,200 lines) — entire landlord dashboard
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
├── email-welcome.html              Email template: welcome / onboarding (Session 20)
├── email-trial-expiry.html         Email template: trial expiry countdown (Session 20)
├── email-compliance-digest.html    Email template: weekly compliance digest (Session 20)
├── email-cert-expiry.html          Email template: cert expiry alert (Session 20)
├── sidebar-hybrid-comparison.html  Email template: sidebar comparison (Session 20)
├── sidebar-hybrid-preview.html     Email template: sidebar preview (Session 20)
├── og-image.png                    OpenGraph social share image (1200×630)
├── CNAME                           GitHub Pages custom domain: nexlet.co.uk
├── email-alerts-index.ts           Supabase Edge Function source (Sprint 10 → rebuilt Session 20)
├── stripe-checkout-index.ts        Supabase Edge Function source (Sprint 13)
├── stripe-webhook-index.ts         Supabase Edge Function source (Sprint 13)
├── mtd_tables.sql                  SQL migration: MTD tables
├── sprint10_step1_db.sql           SQL migration: Sprint 10 DB setup
├── sprint10_step1_fix.sql          SQL migration: Sprint 10 patch/fix
├── sprint10_step2_cron.sql         SQL: pg_cron scheduled jobs
├── sprint10_fix_cron_key.sql       SQL: re-creates cron jobs with real service role key
├── cron_setup.sql                  SQL: updated pg_cron jobs (Session 20 — replaces sprint10_step2_cron)
├── sprint13_db.sql                 SQL migration: Sprint 13 (user_profiles, stripe_subscriptions)
├── session7_tenant_documents.sql   SQL migration: Session 7 (tenant_documents table + RLS)
├── session10_multi_doc.sql          SQL migration: Session 10 (multi-doc KYC — drop slot unique, add columns)
├── session10_tenants_columns.sql    SQL migration: Session 10 (add missing tenants columns)
├── session10_esign_requests.sql     SQL migration: Session 10 (esign_requests table + RLS)
├── session11_landlord_sig.sql       SQL migration: Session 11 (landlord signature columns)
├── sprint11_feedback_table.sql      SQL migration: Sprint 11 (feedback table)
├── session13_inventory_reports.sql  SQL migration: Session 13 (inventory_reports table + RLS)
├── session14_tenant_checklist.sql   SQL migration: Session 14 (compliance_checklist JSONB on tenants)
├── session14_trial_fields.sql       SQL migration: Session 14 (trial fields on user_profiles)
├── session14_rent_payments.sql      SQL migration: Session 14 (rent_payments table + RLS)
├── session18_feedback_v2.sql        SQL migration: Session 18 (urgency + files — superseded by session19)
├── session19_user_reports.sql       SQL migration: Session 19 (user_reports table)
├── session_archive.sql              SQL migration: Session 11 (archive + deleted_at columns)
├── session_property_status.sql      SQL migration: Session 18 (property status columns)
├── fix_rent_payments.sql            SQL migration: Session 22 (month + notes columns on rent_payments)
├── SPRINT10_DEPLOY.md              Sprint 10 deployment guide
├── PROJECT_KNOWLEDGE.md            THIS FILE — agent initialization reference
├── fix.py                          Python patching script (landlord.html fixes)
├── fix.b64                         Binary patch (base64 encoded)
├── fix.patch                       Git patch file
├── landlord_backup.html            Backup copy of landlord.html (dev artifact)
├── landlord.txt.html               Text-only export of landlord.html (dev artifact)
├── js/landlord.html                Dev artifact (JS file misnamed as .html)
└── .claude/                        Claude AI dev config directory
```

> **`supabase/functions/`** exists for: `ai-proxy`, `stripe-checkout`, `stripe-webhook`, `stripe-cancel`, `email-alerts`.

### HTML File Responsibilities

| File | Purpose | Auth required | Notes |
|---|---|---|---|
| `index.html` | Marketing landing page — slate teal/amber palette (rebranded May 2026) | None | |
| `login.html` | Supabase email+password + Google OAuth + password reset | None | |
| `signup.html` | Account creation with password strength meter | None | |
| `profile.html` | Account details, personal info, Stripe subscription management | Yes | |
| `feedback.html` | Bug reports & feature suggestions with file upload | Yes | Session 19 |
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
| `na_docs` | jsonb | Session 23: Array of doc IDs marked as N/A for this property (e.g. `["legionella","pat"]`). Default `[]`. Run: `ALTER TABLE properties ADD COLUMN IF NOT EXISTS na_docs jsonb DEFAULT '[]'::jsonb;` |

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
| `month` | text | Session 22 fix: month label e.g. `2026-05` — was missing from DB write |
| `notes` | text | Session 22 fix: payment notes — was missing from DB write |

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
| `user_reports` | Session 19. Bug reports and feature suggestions: `user_id`, `type` (bug/feature), `title`, `description`, `urgency` (low/medium/high/critical), `files` (TEXT[]), `status` (open/reviewed/in_progress/completed/declined), `created_at`, `updated_at`. Files uploaded to `user-feedback-documents` Storage bucket. **Requires `session19_user_reports.sql` migration.** |

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
- Bucket: `certificates` — path: `{prop_id}/{cert_id}`, signed URL downloads
- Bucket: `tenant-documents` — tenant KYC docs, path: `{user_id}/{tenant_id}/{slot}_{timestamp}.{ext}`
- Bucket: `documents` — general uploads (inspections, inventory photos, pre-tenancy audit PDFs)
- Bucket: `user-feedback-documents` — feedback file uploads, path: `user-feedback-documents/{user_id}/{timestamp}_{index}.{ext}` (Session 19)
- Bucket: `signed-documents` — completed e-sign PDFs
- Bucket: `esign-documents` — e-sign document storage
- Bucket: `pretenancy-audits` — pre-tenancy checklist audit PDFs
- Access: Signed URL downloads used where needed; RLS policies control upload access

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

#### `email-alerts` (Sprint 10 → rebuilt Session 20)
- **Source file:** `email-alerts-index.ts` (root) → deploy from `supabase/functions/email-alerts/index.ts`
- **Auth:** Uses service role key in `Authorization` header (sent by pg_cron or frontend)
- **`--no-verify-jwt`:** NOT used — cron jobs authenticate with service role key
- **Modes handled:**
  - `cron_digest` — Weekly compliance digest to newsletter-opted-in users
  - `cron_expiry` — Daily cert expiry check (60/30/14/7 days) for opted-in users
  - `cron_trial` — Daily trial expiry warnings (day 25, 30), skips subscribed users
  - `welcome` — HTTP POST triggered on signup: `{ user_id, email, first_name }`
  - `trial_expiry_warning` — HTTP POST direct: `{ user_id, email, first_name, trial_ends_at }`
  - `daily` — Legacy backward compat: runs all 7 original alert types
  - `weekly_summary` — Legacy backward compat: original weekly summary
- **Templates:** 4 branded HTML templates with master `wrapBrandedEmail()` wrapper
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

#### `stripe-cancel`
- **Source:** `supabase/functions/stripe-cancel/index.ts` — exists in repo
- **Purpose:** Handles subscription cancellation requests from `profile.html`

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
| `cron_setup.sql` | Updated pg_cron jobs (Session 20) — replaces `sprint10_step2_cron.sql` | Run independently |
| `sprint10_fix_cron_key.sql` | Re-creates cron jobs with real service role key (Session 11) | Patch |
| `mtd_tables.sql` | Creates MTD module tables | Independent |
| `sprint13_db.sql` | Creates `user_profiles` and `stripe_subscriptions` tables with RLS | Independent |
| `session7_tenant_documents.sql` | Creates `tenant_documents` table with RLS | Independent |
| `session10_multi_doc.sql` | Drops `tenant_documents_slot_unique` index; adds `issuing_authority`, `doc_type_extracted` columns | Already run |
| `session10_tenants_columns.sql` | Adds 13 missing columns to `tenants`: `type`, `rent_day`, `scheme_ref`, `rtr_*` (6), `addr_proof_*` (2), `is_lead`, `invite_used` | Already run |
| `session10_esign_requests.sql` | Creates `esign_requests` table + RLS (Session 13) | Independent |
| `session11_landlord_sig.sql` | Adds landlord signature columns to `esign_requests`: `landlord_name`, `landlord_signed_at`, `landlord_sig_png` | Independent |
| `session_archive.sql` | Adds `user_profiles.deleted_at`, `tenants.archived`, `tenants.archived_at`, `tenants.end_reason` | Independent |
| `sprint11_feedback_table.sql` | Creates `feedback` table for in-app feedback | Independent |
| `session13_inventory_reports.sql` | Creates `inventory_reports` table + RLS | Independent |
| `session14_tenant_checklist.sql` | Adds `compliance_checklist` JSONB column to `tenants` (Session 14) | Independent |
| `session14_trial_fields.sql` | Adds trial fields to `user_profiles`: `trial_started_at`, `trial_expires_at`, `plan`, `plan_activated_at` (Session 14) | Independent |
| `session14_rent_payments.sql` | Creates `rent_payments` table + RLS (Session 14) | Independent |
| `session18_feedback_v2.sql` | Adds urgency + files columns to legacy `feedback` table — superseded by `session19_user_reports.sql` | Superseded |
| `session19_user_reports.sql` | Creates `user_reports` table for bug reports and feature suggestions with full RLS | Independent |
| `session_property_status.sql` | Adds property status columns: `status`, `archive_reason`, `archived_at`, `vacant_since`, `tenancy_started_at`, `tenancy_ended_at` | Independent |
| `fix_rent_payments.sql` | Adds `month` and `notes` columns to `rent_payments` (Session 22) | Independent |

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
| 51 | `user_profiles` missing `plan` + `newsletter_opted_in` columns | Database | **FIXED 23 May 2026** — ALTER TABLE run in SQL Editor |
| 52 | `inventory_reports` table missing | Database | **FIXED 23 May 2026** — CREATE TABLE + RLS run in SQL Editor |
| 53 | No favicon.ico | Static files | Pending — add to repo root |
| 11 | `parseInt()` on UUID `prop_id`/`tenant_id` values — produces NaN | Data integrity | **FIXED Session 7** — replaced with `String()` (22 locations) |
| 12 | `tenant_documents` table missing from DB — KYC scanning fails silently | Database | **SQL created** — run `session7_tenant_documents.sql` in Supabase SQL Editor |
| 13 | `tenant-documents` Storage bucket RLS — uploads fail with "row-level security policy" | Storage | **FIXED** — INSERT + SELECT policies added via SQL Editor |
| 42 | Back button exits app (no browser history in SPA) | Navigation | **FIXED Session 18** — `nav()` uses `history.pushState` + `popstate` listener |
| 43 | `certificates` table missing `amount` column — EICR save fails | Database | **FIXED Session 18** — code-side fallback removes `amount` + `cert_ref` on schema error. Pending DB: `ALTER TABLE certificates ADD COLUMN IF NOT EXISTS amount numeric;` |
| 44 | `properties` table missing `status`, `archive_reason`, `archived_at`, `vacant_since`, `tenancy_started_at`, `tenancy_ended_at` columns | Database | **SQL created** — run `session_property_status.sql` in Supabase SQL Editor |
| 54 | `esign_requests` table not yet created via SQL migration | Database | **SQL created** — run `session10_esign_requests.sql` in Supabase SQL Editor |
| 55 | `certificates` table missing `amount` column — EICR save fails on schema error | Database | Code-side fallback exists (drops `amount` + `cert_ref` on schema error). Pending DB: `ALTER TABLE certificates ADD COLUMN IF NOT EXISTS amount numeric;` |
| 56 | `tenant-documents` Storage bucket RLS — uploads fail for some users | Storage | Policies need recreation (see Session 18 Storage RLS Fix steps in change log) |
| 57 | `js/landlord.html` — misnamed dev artifact in `js/` directory | Cleanup | Remove from repo |
| 45 | `esign_requests` RLS too permissive — anon UPDATE on any row | Security | **FIXED** — policy tightened to `USING (token IS NOT NULL)`; run SQL in Editor |
| 46 | Missing cert types: Boiler Service, Fire Extinguisher, Emergency Lighting, Pest Control | Compliance | **FIXED Session 18** — added to all cert lists + compliance grid |
| 47 | AI scan skips fields without warning — missing data silently dropped | AI / UX | **FIXED Session 18** — missing-field detection + amber warning banner in scan results |
| 48 | No-expiry docs (RTR, S48, How to Rent, etc.) show as "EXPIRED" | Compliance | **FIXED Session 18** — show "✓ SERVED / ⚠ NOT SERVED" via `NO_EXPIRY` constant in `buildCertStatusGrid` |
| 49 | HMO-only certs (Fire Extinguisher, Emergency Lighting) shown for non-HMO properties | Compliance | **FIXED Session 18** — `HMO_ONLY` constant hides them when property is not HMO |
| 50 | Compliance document lists defined in 4+ separate places with different contents (`_GD`/`_GN`/`_GS`, `_pgGD`/`_pgGN`/`_pgGS`, `CERT_TYPES`, `moWelcomeKit.docs[]`) — causing inconsistencies between compliance tab, pgCompliance page, and welcome kit | Compliance | **FIXED 18 May 2026** — single `COMPLIANCE_DOCS` master definition used by all three; `_GD`/`_GN`/`_GS` and `_pgGD`/`_pgGN`/`_pgGS` arrays removed

---

## 11. Pricing & Plans

Pricing uses a **founding / standard** two-tier model displayed via a billing toggle on `index.html`. The JS `prices` object (in the inline `<script>` at the bottom of `index.html`) drives all displayed values.

| Plan | Founding price (monthly) | Founding price (annual) | Standard price (monthly) | Standard price (annual) | Properties | Target user |
|---|---|---|---|---|---|---|---|
| Starter | £4.99/mo | £4.16/mo | £7.99/mo | £6.66/mo | Up to 2 | Accidental landlords |
| Landlord | £11.99/mo | £9.99/mo | £18.99/mo | £15.83/mo | Up to 10 | ★ Most popular |
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
| `feedback.html` | `js/feedback.js` ✓ Exists |
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
- **Property limits updated:** Starter 2, Landlord 10, Portfolio Unlimited
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
- **`isPortfolio()`** — now plan-gated: `return getUserPlan()==='portfolio'` (May 2026)
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
  - Starter: £4.99 (founding), £7.99 (standard), yearly removed
  - Landlord: £11.99 (founding), £18.99 (standard), yearly removed
  - Portfolio: £23.99 (founding), standard £39.99 unchanged, yearly removed
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

#### E-Sign Workflow Fixes
- **Edit button after AI generation:** `_esignToggleEdit()` toggles between preview and raw HTML editor (`landlord.html:11018`)
- **Signed documents retrieval:** `esign_requests` loaded in `loadData()` (`D.esignReq`). Signed Documents panel in property detail tenant tab with download links (`landlord.html:4342`)
- **Email error logging:** `.catch(() => {})` replaced with `console.error` on landlord + tenant email sends
- **Email branding:** "RentSafe AI" → "NexLet" in esign email templates (`esign-content.js`)
- **RLS fix SQL:** Added tighter `esign_requests` anon policies (run in SQL Editor)

#### Document Upload Fixes
- **Navigation removed from `uploadTenantDoc`:** no longer jumps to `tenant-detail` on success/failure — stays in current workflow (`landlord.html:5845-5866`)
- **Upload Docs buttons:** Added `📄 Docs` button next to Edit on tenant detail page + property detail tenant tab, opens `moTenantDocs(tid, propId)` modal with 6 doc slots + AI scan (`landlord.html:4308, 5586`)
- **Checklist auto-refresh:** `moTenantDocsUpload` re-runs `initPropChecklist` after upload so auto-detection re-ticks items
- **Guidance message:** Blue box in Start Tenancy checklist pointing to Upload Docs button (`landlord.html:3829`)
- **Storage RLS:** `rent_payments` UPDATE policy added (SQL run in Editor)
- **Syntax fix:** Missing closing backtick restored in `pdTabContent` template literal

#### Compliance Section Enhancement
- **New cert types:** Boiler Service Certificate, Fire Extinguisher Service Record, Emergency Lighting Test Record, Pest Control Report — added to `CERT_TYPES`, `moCert()` dropdown, `_GD`/`_GN`/`_GS` arrays, `_pgGD`/`_pgGN`/`_pgGS` arrays
- **AI scan improved:** `max_tokens` 300→500, type-specific prompts, missing-data detection with amber warnings (`landlord.html:1103-1122`). `scanDoc` shows "⚠ Could not determine: X, Y" banner (`landlord.html:1479`)
- **Smart expiry:** No-expiry docs (How to Rent, Written Statement, RRA Sheet, RTR, S48, Inventory, Pest Control) show "✓ SERVED / ⚠ NOT SERVED" instead of Valid/Expired (`buildCertStatusGrid`: `NO_EXPIRY` constant)
- **HMO-only certs:** HMO Licence, Fire Extinguisher, Emergency Lighting hidden from compliance grid unless property `type === 'HMO'` or `licence_type` contains "hmo"/"mandatory" (`buildCertStatusGrid`: `HMO_ONLY` constant)
- **`findCert()`:** Rewritten with generic fallback matching, covers all 25 cert types

#### Checklist Auto-Detection
- `initPropChecklist` auto-ticks checklist items when corresponding documents already exist in the system (`landlord.html:3999-4023`):
  - RTR check → right_to_rent doc uploaded
  - Written Statement → esign signed
  - RRA Sheet / How to Rent → email_log sent
  - Gas Safety → valid GSC cert
  - EICR → valid EICR cert
  - EPC → EPC rating set + not expired
  - Deposit registered → tenant.deposit_scheme set
  - Prescribed info → deposit doc uploaded
  - Move-in inventory → inventory report generated
  - Insurers notified → insurance policy exists
- Auto-detected checks persist to Supabase via `sbSaveChecklist`

### Fixes 1–5 — 18 May 2026 — Compliance Document Unification & Welcome Kit Rewrite

**Date:** 18 May 2026  
**Scope:** `landlord.html` only — 5 targeted edits to unify compliance document definitions and align the welcome kit with the compliance engine.

#### Fix 1 — Master COMPLIANCE_DOCS Definition (`landlord.html:~653`)
- **Inserted `COMPLIANCE_DOCS`** constant immediately after `// ── DATA STORE ──` comment, before `const D = {`
- Defines 6 groups: `safety`, `licensing`, `tenancy`, `movein`, `insurance`, `recommended`
- Each doc spec includes: `id`, `label`, `frequency`, `note`, `mandatory`, `no_expiry`, `hmo_only`, `match[]`, plus group-specific fields (`insurance_type`, `ref_group`/`ref_id`, `recommended`)
- **Inserted 3 helper functions:**
  - `getDocsForProperty(pid)` — filters docs by property type (hides HMO-only docs for standard properties)
  - `findCertForDoc(doc, certList)` — matches a doc definition to an existing cert record via the `match` array
  - `getDocStatus(doc, certList, insuranceList)` — returns `{ lbl, bg, col, bdr, days, overdue, action? }` for each doc, handling: expiry-based certs, no-expiry docs (SERVED/NOT SERVED), insurance group (pulls from insurance data), recommended docs (amber-only), and missing mandatory docs

#### Fix 2 — Property Detail Compliance Tab Rewrite (`landlord.html:~4933`)
- **Replaced** the old compliance tab in `pdTabContent` which used inline `_cgGetSt`/`_cgGroup` helpers with hardcoded label matching
- **New structure:** RAG score bar → 5 groups (safety, licensing, tenancy, movein, insurance) → Recommended (collapsed) → Inspections (unchanged)
- Each group uses `renderCompGroup()` which calls `getDocStatus()` via `COMPLIANCE_DOCS`
- Licensing group (`hmo_section`) hidden for standard properties — only renders when `propDocs.licensing.docs.length` is truthy
- Groups with overdue items auto-expand; clean groups collapsed by default
- Doc rows show note text, days left/overdue, `+ Upload` button on missing mandatory items, `Manage →` on insurance items
- Removed: `_cgGetSt`, `_cgGroup`, `_GD`, `_GN`, `_GS` arrays; `_cgToday`

#### Fix 3 — pgCompliance() Full Rewrite (`landlord.html:~5428`)
- **Replaced** the entire `pgCompliance()` function
- **Portfolio health score** now calculated from mandatory doc slots across all properties via `COMPLIANCE_DOCS` — not raw cert count
- **Stat cards** count expired/urgent/missing/compliant across mandatory groups 1–4 (safety, licensing, tenancy, movein)
- **Action list** shows all overdue mandatory items across all properties with flat sorting by urgency; each row shows doc label, note, property address, group pill, and "View →" button linking to property detail compliance tab
- **Filter chips** work for 'expired', 'critical' (urgent + expiring soon), 'missing' (MISSING/NOT UPLOADED/NOT SERVED), 'all'
- **Full audit view:** Per-property mini gauge cards with score, overdue count; clicking opens per-property drill-down showing all 5 groups
- **Property drill-down:** Each group collapsible with `✓ All good` / `N action` badge; safety group shows `+ Add cert` button
- Removed: `_pgGD`, `_pgGN`, `_pgGS` arrays; `_pgGetSt`, `_pgGroup` helpers; `filterCompliance()` onclick handlers (replaced with inline `window._compFilter` + `nav('compliance')`)

#### Fix 4 — moWelcomeKit() Rewrite (`landlord.html:~3469`)
- **Replaced** hardcoded 9-item `docs[]` array with document list built from `COMPLIANCE_DOCS.tenancy` + `COMPLIANCE_DOCS.movein` via `getDocsForProperty(pid)`
- Documents merge tenancy docs first, then move-in docs, deduplicated by `id`
- Each doc enriched with `getDocStatus()` + welcome-kit-specific status notes (for gas/eicr/epc cert availability, deposit scheme, written statement e-sign)
- **Mandatory pill:** Only appears when doc `hasIssue` — NOT on every row. Green `✓ Ready` when doc is valid, red `⚠ Action needed` only on genuine problems
- **Group pills:** "Tenancy doc" / "Move-in doc" labels for landlord orientation
- Optional docs retain Include checkbox; mandatory docs show ✅/⚠️ icon
- **moWelcomeKit no longer references its own document list** — same documents as compliance tab Move-In Pack + Tenancy Documents groups
- `sendWelcomeKit` function NOT modified

#### Fix 5 — Pre-Tenancy Checklist Enhancements (`landlord.html:~4423–~4769`)

**PART A — Extended Auto-Detection:**
- `autoCheck()` now takes a `reason` parameter — auto-ticked items record the detection reason in `_pretenancyRecord`
- New `_hasCert(matchTerms)` helper checks cert expiry before auto-ticking
- Extended auto-detection coverage: ob4 (deposit amount), ob5 (e-sign or cert), ob6 (RRA email), ob7 (welcome kit), ob8 (valid GSC), ob9 (valid EICR), ob10 (valid EPC), ob11 (scheme set), ob12 (scheme + welcome kit sent), ob13 (inventory cert)
- ob14–ob19 remain manual (physical move-in actions cannot be auto-detected)

**PART B — Auto-Detect Summary Banner:**
- Blue info banner at top of `renderPropChecklist` (onboard mode only) showing "N item(s) auto-verified from your records" + remaining manual items count
- Checklist item rows show `✦ Auto-verified` blue pill on auto-ticked items

**PART C — Hardened Bypass Link:**
- Skip link replaced with "Bypass checks →" button calling `moBypassConfirm(pid)`
- `moBypassConfirm()` opens confirmation modal requiring user to type `CONFIRM` before proceeding
- Original `bypassPretenancyChecklist(pid)` function NOT modified

#### Impact Summary
- **Before:** 4+ separate compliance document lists (`_GD`/`_GN`/`_GS`, `_pgGD`/`_pgGN`/`_pgGS`, `CERT_TYPES`, `moWelcomeKit.docs[]`) with inconsistent contents
- **After:** Single `COMPLIANCE_DOCS` master definition used by `pdTabContent` compliance tab, `pgCompliance()` page, and `moWelcomeKit()` welcome kit
- `buildCertStatusGrid()` retained as standalone definition (not called from rewritten functions)
- All new code uses `getDocsForProperty` → `getDocStatus` pattern with group-aware filtering (HMO/standard, no-expiry, insurance-linked)

### Session 19 — 18 May 2026 — Feedback Page & Rebrand Fixes
**Date:** 18 May 2026

#### New Feature: Feedback Page
- **Created `feedback.html`** — standalone page for bug reports and feature suggestions, matching `profile.html` styling
- **Created `js/feedback.js`** — IIFE module with auth guard, file upload, and DB insert to `user_reports` table
- **Created `session19_user_reports.sql`** — fresh table with all columns: `type` (bug/feature), `title`, `description`, `urgency` (low/medium/high/critical), `files` (TEXT[]), `status` (open/reviewed/in_progress/completed/declined)
- **Type toggle:** Two card selector — Bug Report / Feature Suggestion
- **Form fields:** Title (single line, 120 char max), Urgency dropdown, Description textarea (2000 char max)
- **File upload:** Multi-file (max 5, 5 MB each, PNG/JPG/PDF), drag-and-drop, live thumbnail preview with ✕ remove, uploaded to `documents` bucket under `feedback/{userId}/`
- **Submit flow:** Validates fields → uploads files → inserts row into `user_reports` table → shows success state with "Back to Dashboard" button
- **Sidebar:** Added "Feedback" sidebar item in `landlord.html` (between AI Assistant and footer)
- **Note:** Replaces `session18_feedback_v2.sql` (which altered legacy `feedback` table). The `user_reports` table is standalone — no dependency on the old `feedback` schema.

#### Rebrand Fix
- **`profile.html:266`** — Logo corrected from `Rent SafeAI` to `NexLet` (was missed in Session 14 rebrand)
### UX Fixes 1 — 18 May 2026 — Properties Page & Property Detail UX Polish

**Date:** 18 May 2026 — 7 small fixes across `landlord.html`

- **Fix A:** Removed duplicate `voidLine` calculation in `propRow()` — vacant nudge now only via single `voidNudge` banner below row with `Start Tenancy →` button
- **Fix B:** Replaced clickable `›` button at end of property rows with non-clickable visual indicator — whole row already clickable
- **Fix C:** Group count badges in `groupBlock()` changed from navy filled pills to light muted style with border
- **Fix D:** Property detail topbar now shows breadcrumb "Properties / 123 High Street" instead of just "Properties" — "Properties" is clickable
- **Fix E:** Last tab renamed "Property" → "Details" with 📋 icon
- **Fix F:** Compliance tab badge now shows count of overdue mandatory items via `getDocsForProperty` + `getDocStatus` instead of raw cert count
- **Fix G:** Maintenance tab badge shows open issues only (excludes Resolved); Financials badge set to 0 (rent record count was meaningless)

### UX Fixes 2 — 18 May 2026 — Dashboard UX Polish

**Date:** 18 May 2026 — 3 fixes in `pgDashboard()`, `landlord.html`

- **Fix A:** Removed duplicate "Dashboard" h1 — replaced with compact inline summary: `N urgent · M due soon · X properties · Y active tenants` — only non-zero counts shown
- **Fix B:** Section 8 promo card now **context-conditional** — compact single-line strip shown by default (no triggers). Full dark card only appears when: late rent detected, arrears, Awaab issue open, or post-RRA deadline (1 June 2026+). Trigger subheading changes to match context.
- **Fix C:** Quick actions dropdown trimmed to 2 items — "Report issue" removed. "Add certificate" gets correct bottom border-radius.

### UX Fixes 3 — 18 May 2026 — Sidebar Navigation UX Polish

**Date:** 18 May 2026 — 4 fixes in sidebar HTML + `initSbGroups()`, `landlord.html`

- **Fix A:** Insurance icon changed from shield-with-checkmark to document-with-tick SVG — visually distinct from Compliance shield
- **Fix B:** Inventory Reports emoji 📋 replaced with clipboard SVG matching nav icon style
- **Fix C:** Maintenance and Calendar moved into new **Activity** group with collapsible header — no more orphaned standalone nav items between Compliance and Finance groups
- **Fix D:** `initSbGroups()` updated to include `'activity'` in its init array — new group starts expanded. `toggleSbGroup('activity')` works via existing generic handler.

### Feature 1 — 18 May 2026 — Global Document Viewer Overlay

**Date:** 18 May 2026  
**Scope:** `landlord.html` — single overlay + View buttons in 3 places

- **Part A:** Document viewer overlay HTML inserted before `</body>` — dark backdrop with title bar (document name + meta), Download and Close buttons, iframe for PDFs, img tag for images, fallback panel for unsupported formats
- **Part B:** JS functions (`dvoOpen`, `dvoClose`, `dvoDownload`, `_dvoType`, `_dvoIsPrivate`, `_dvoExt`) inserted before main `</script>`
  - `dvoOpen(url, title, meta)` — main entry point, handles private bucket signed URLs, PDF fallback to Google Docs viewer after 4s, image display in img tag
  - `dvoClose()` — closes overlay, clears iframe, removes body overflow lock
  - `dvoDownload()` — triggers browser download of current document
  - Escape key closes overlay; backdrop click closes overlay
- **Part C:** View buttons added in 3 locations:
  - Property detail compliance tab (`renderCompGroup`) — `👁 View` button on cert rows with URL
  - Compliance page drill-down (`pgCompliance` selProp) — `👁 View` via IIFE using `findCertForDoc`
  - Document Library (`pgDocLibrary`) — View button calls `dvoOpen()` instead of `viewDocInline()`
- **Supabase buckets:** All buckets are public except `user-feedback-documents` (private — uses signed URL)

### Feature 2 — 18 May 2026 — Newsletter Opt-In

**Date:** 18 May 2026  
**Scope:** `landlord.html`, `profile.html`, `signup.html`, `js/signup.js`

- **Part A:** Newsletter helper functions inserted before main `</script>` in `landlord.html`:
  - `_nlShouldShowBanner()` — shows when `newsletter_opted_in` is null and not dismissed
  - `nlSubscribe(source)` — sets `newsletter_opted_in: true` on `user_profiles`, updates `D.userProfile` cache
  - `nlUnsubscribe(source)` — sets `newsletter_opted_in: false`
  - `nlDismiss()` — sets `localStorage` dismissal, records `dismissed_at` on profile, animates banner out
  - `nlToggleHtml()` — returns toggle switch HTML for settings page
- **Part B:** Dashboard banner in `pgDashboard()` shows when appropriate — "Get free compliance tips by email" with Subscribe + No thanks buttons
- **Part C:** Communication preferences panel added to `profile.html` between Personal Details and Subscription sections — toggle switch wired via inline script reading/writing `user_profiles.newsletter_opted_in`
- **Part D:** `D.userProfile` already loaded with `select('*')` on login — no change needed. Added sync of `newsletter_opted_in` from auth `user_metadata` (set during signup) to `user_profiles` on first login.
- **Part E:** Newsletter checkbox added to `signup.html` before Create account button. `signUp()` in `signup.js` passes checkbox value as `options.data.newsletter_opted_in`.
- **Required DB columns:** `user_profiles.newsletter_opted_in` (boolean), `newsletter_opted_at` (timestamptz), `newsletter_dismissed_at` (timestamptz)

### Feature 3 — 18 May 2026 — Trial Expiry UX Overhaul

**Date:** 18 May 2026  
**Scope:** `landlord.html` — 6 parts

- **Part A:** No duplicate `showTrialExpiryPopup` found (only one definition existed)
- **Part B:** `showTrialExpiryPopup()` rewritten — shows 3 plan cards with founding/standard pricing, "Continue read-only" + "Delete my account" footer links. Hard popup close button removal removed — user can close the modal.
- **Part C:** Nav guard (`nav()`) changed from hard block to **soft lock** — allows browsing 13 pages (dashboard, properties, tenants, compliance, maintenance, insurance, inspections, rent, financials, calendar, doclibrary, contractors, prop-detail) and billing. Only blocks write-heavy pages (templates, inventory-reports, MTD, assistant).
- **Part D:** `_expiredGuard(actionLabel)` added after `isExpired()` — reusable guard for write actions. Returns `true` and shows modal if trial expired. Guards added to 8 write functions: `moAddProp`, `savePropToDB`, `moCert`, `moTenant`, `_saveTenantSetupToDB`, `moIssue`, `sendWelcomeKit`, `moSection8`.
- **Part E:** `moDeleteAccount()` + `execDeleteAccount()` added. Confirmation modal requires typing DELETE. Deletes from all tables (`certificates`, `maintenance`, `rent`, `tenants`, `insurance`, `properties`, `user_profiles`, `stripe_subscriptions`, `profiles`) then signs out.
- **Part F:** Trial expired banner HTML replaced — now red-styled flex bar with built-in "View plans →" and "Read-only mode" buttons. Text set via `trial-expired-banner-text` span ID instead of `innerHTML` replacement.

### Feature 4 — 18 May 2026 — Client-Side Data Export

**Date:** 18 May 2026  
**Scope:** `landlord.html`, `profile.html`

- **Part A:** JSZip 3.10.1 loaded from cdnjs in `<head>`
- **Part B:** Export functions inserted before main `</script>`:
  - `_toCSV(rows)` — converts array of objects to CSV string with proper escaping
  - `_expFmt(val)` — formats dates as DD/MM/YYYY HH:MM in en-GB locale
  - `_exportReadme()` — generates README.txt with generation timestamp, user email, file listing, GDPR notice
  - Per-table export helpers: `_exportProperties(pid)`, `_exportTenants(pid)`, `_exportCerts(pid)`, `_exportMaintenance(pid)`, `_exportRent(pid)`, `_exportInsurance(pid)`, `_exportEmailLog(pid)`, `_exportContractors()`, `_exportEsign(pid)`
  - `exportData(pid)` — main function, creates ZIP with all CSVs + README, triggers download
- **Part C:** "My Data" panel added to `profile.html` above Communication preferences — Export all data + Delete account buttons
- **Part D:** "⬇ Download audit trail" button added after RAG score bar in property detail compliance tab — calls `exportData(pid)` for per-property export

### Pricing & Signup Fixes — 19 May 2026 — Plans Repriced, Landing Page + Legal Pages Updated

**Date:** 19 May 2026  
**Scope:** `landlord.html`, `index.html`, `terms.html`, `privacy.html`, `login.html`, `signup.html`, `js/signup.js`

- **Landing page (`index.html`):**
  - Hero: "1–15 properties" → "1–10+ properties"
  - All pricing repriced: Starter £5.99→£4.99, Landlord £12.99→£11.99, Portfolio £24.99→£23.99 (founding)
  - Standard rates lowered: Starter £9.99→£7.99, Landlord £19.99→£18.99
  - JS `prices` object updated with new founding/standard rates
  - Comparison table: Landlord 5→10 properties
  - Removed "Dedicated onboarding" + "Multi-user access" from comparison (unbuilt)
  - Removed "Shareable compliance certificate" from features list (unbuilt)
  - Next Phase Band: added PECR consent line, compliance tips chip, wired to `resend-audience-sync` edge function
  - Founder strip: "Built by Saby" → anonymised "Built by a UK landlord and managing agent"
  - Signup CTA: "deadline is 31 May" → "RRA 2025 now in force"

- **Pricing config (`landlord.html`):**
  - `PLAN_LIMITS`: Landlord 5→10
  - `isPortfolio()`: removed `||getUserPlan()==='pro'`
  - `isLandlordOrAbove()`: removed `'pro'` from array
  - `planLabels`: removed `pro:'Pro'`
  - AI system prompt pricing: lowered all founding/standard rates, removed yearly rates
  - Trial expiry modal plans array: all 3 founding/standard prices lowered
  - Upgrade modal tierCards array: all 3 prices lowered, Landlord limit 5→10
  - Property add upgrade prompt: Starter now prompts for Landlord, not Portfolio
  - Compliance view default: `||'action'` → `||'full'` (3 occurrences) + `_compView` initialiser
  - RRA post-deadline: blue banner shown for unsent tenants after 31 May instead of returning empty
  - Cert expiry field hidden for no-expiry doc types in `moCert` modal
  - PAT certificate marked `furnished_only: true` — hidden for unfurnished properties via `isFurnished` filter in `getDocsForProperty`
  - Safety group default collapsed in compliance tab
  - S8 compact card "Generate →" button calls `s8LaunchFromTemplates()` instead of broken `s8-compact-sel` lookup
  - `closeModal()` alias added next to `closeMo()` for comms hub compatibility
  - Doc library View buttons extended to check `engineer` field (stores public URL for uploaded docs)

- **Newsletter opt-in (`landlord.html`, `profile.html`):**
  - `nlSubscribe`/`nlUnsubscribe` rewritten with `upsert` on both `profiles` and `user_profiles` tables
  - Both functions sync to `resend-audience-sync` edge function fire-and-forget
  - Dashboard newsletter banner removed — lives on `index.html` only
  - `_nlShouldShowBanner()` and `nlDismiss()` deleted

- **Legal pages (`terms.html`):**
  - Founder pricing updated: Landlord £9.99→£11.99, Portfolio £24.99→£23.99
  - Trial clause 6.2: "payment details required" → "no payment details required", no-auto-charge language
  - Prohibited Activities 9.2: replaced with 8-item tailored list (account sharing, false compliance records, etc.)
  - Compliance with Law 9.3: expanded with specific legislation references
  - AI clause 10: stronger disclaimers (draft aids only, sole responsibility, Form 3A handoff, indemnity)
  - Consumer Rights 3.3: saving clause added — "nothing affects your statutory rights"
  - VAT clause 5.4: explicitly states not VAT registered, fees exclusive of VAT, 30 days' notice
  - Third-Party Services 17: Stripe added with card-data-not-stored disclaimer

- **Legal pages (`privacy.html`):**
  - Stripe added to sub-processors table (PCI-DSS certified, card data never stored)
  - Newsletter added to data processing purposes table (consent-based, withdrawable)

- **Signup (`signup.html` + `js/signup.js`):**
  - `signup.js` fully rewritten with IIFE module pattern
  - Password strength meter: 5 rules, 4-bar visual, score 0-5 with weak/fair/good/strong labels
  - Confirm password match: real-time ✓/✗ hint
  - Form submission: validates strength ≥Fair, calls `signUp()` with newsletter preference in metadata
  - Upserts `newsletter_opted_in` to `user_profiles` fire-and-forget after signup
  - Redirects to `login.html` after 2s on success
  - Checks existing session on init — redirects to `landlord.html` if logged in

### Editorial Fix — 19 May 2026 — S8 compact + closeModal + compView

**Date:** 19 May 2026 — 3 surgical fixes in `landlord.html`

- S8 compact card "Generate →" button now calls `s8LaunchFromTemplates()` — broken `s8-compact-sel` DOM lookup removed
- `closeModal()` alias added next to `closeMo()` for comms hub action buttons
- Compliance view default `||'action'` → `||'full'` on all 3 fallbacks — Full Audit is default view

### 9 Surgical Fixes — 19 May 2026 — Pricing Reprice

**Date:** 19 May 2026 — 9 fixes in `landlord.html`

- `PLAN_LIMITS`: Landlord 5→10
- `isPortfolio()` + `isLandlordOrAbove()`: removed `'pro'`
- `planLabels`: removed `pro:'Pro'`
- AI system prompt pricing: all rates lowered, yearly removed
- Trial expiry modal plans array: all founding/standard prices lowered
- Upgrade modal tierCards: all prices lowered, Landlord limit 5→10
- Property add upgrade: Starter prompts for Landlord, not Portfolio
- RRA post-deadline: blue banner shown for unsent tenants after 31 May
- Initial `_compView` default: `'action'` → `'full'`

### index.html Reprice — 19 May 2026

**Date:** 19 May 2026 — 9 fixes in `index.html`

- Hero: "1–15" → "1–10+" properties
- Starter: £5.99/£9.99 → £4.99/£7.99
- Landlord: 5→10 props, £12.99/£19.99 → £11.99/£18.99
- Portfolio: £24.99 → £23.99
- JS prices object: all founding/standard lowered
- Comparison table: Landlord 5→10
- Removed "Dedicated onboarding" + "Multi-user access" (unbuilt)
- Removed "Shareable compliance certificate" (unbuilt)
- Founder strip anonymised

### terms.html + privacy.html Updates — 19 May 2026

**Date:** 19 May 2026

- **`terms.html`:** Plans repriced, Trial clause no-payment-details, Prohibited Activities replaced, Compliance with Law expanded, AI clause strengthened, Consumer saving clause, VAT exclusive, Stripe added to third-party services
- **`privacy.html`:** Stripe added to sub-processors, Newsletter added to data processing purposes

### signup.js Rewrite — 19 May 2026

**Date:** 19 May 2026

- Full IIFE rewrite: password strength meter (5 rules, 4-bar visual), confirm password match, form validation, Supabase signUp with newsletter metadata, fire-and-forget user_profiles upsert, session check redirect

### S8 Compact + closeModal + CompView — 19 May 2026

**Date:** 19 May 2026

- S8 compact card button calls `s8LaunchFromTemplates()`
- `closeModal()` alias for comms hub
- Compliance view `||'action'` → `||'full'`

### Post-RRA + PAT + Expiry Hide — 19 May 2026

**Date:** 19 May 2026

- RRA post-deadline: blue banner for unsent tenants
- PAT: `furnished_only: true` + `isFurnished` filter in `getDocsForProperty`
- moCert cert type select: hides expiry field for 8 no-expiry doc types via `_toggleCertExpiry()`

### login.html — 19 May 2026

**Date:** 19 May 2026

- Signup CTA: "deadline is 31 May" → "RRA 2025 now in force"

### Secondary Compliance Fixes — 19 May 2026

**Date:** 19 May 2026

- Safety group default collapsed in compliance tab (`addCertBtn, false`)
- Doc library View buttons check `engineer` field for public URL (handles doc library uploads)

### Session 20 — 20 May 2026 — Branded Email System Rebuild

**Date:** 20 May 2026

**Files created:**
- `email-compliance-digest.html` — Template 1 preview (weekly digest with score card + properties table)
- `email-cert-expiry.html` — Template 2 preview (cert expiry alert with days badge)
- `email-welcome.html` — Template 3 preview (3-step onboarding checklist)
- `email-trial-expiry.html` — Template 4 preview (trial countdown + pricing table)
- `cron_setup.sql` — 3 new pg_cron jobs replacing old Sprint 10 jobs

**Edge Function Rebuild** (`supabase/functions/email-alerts/index.ts`, `email-alerts-index.ts`):
- Complete rewrite — retains 8 legacy alert types for backward compatibility, adds 4 new branded templates
- New master template: Navy `#1A2B45` header, white card body, `#3B6FE8` blue CTA pill, Inter font, inline styles only, mobile responsive
- New modes: `welcome` (HTTP POST), `trial_expiry_warning` (HTTP POST), `cron_digest` (pg_cron weekly — newsletter-opted-in users only), `cron_expiry` (pg_cron daily), `cron_trial` (pg_cron daily — day 25/30, skips subscribed users)
- Uses existing `email_log` with `(landlord_id, alert_type, reference_key)` dedup index
- New DB columns needed: `user_profiles.newsletter_opted_in` (boolean), `user_profiles.trial_expires_at` (timestamptz)

### Session 20 — 20 May 2026 — login.html Updates

- Left panel: "Be RRA-compliant before 31 May" → "Stay RRA-compliant"; deadline timer removed
- Google button: "Continue with Google"; footer: "Sign up free" → `signup.html`
- Newsletter opt-in checkbox added; `login()` saves `newsletter_opted_in` to `user_profiles`
- Cookie banner: `rsa_cookies` → `nexlet_cookies` (×3)

### Session 20 — 20 May 2026 — Compliance UX & Certificate CRUD

- Compliance doc rows now have `onclick="dvoOpen(...)"` on entire row when cert URL exists, with `cursor:pointer`
- View/Edit/Delete buttons have `event.stopPropagation()` to prevent double-fire
- `dlDelete(id, returnPage)` — added `returnPage` param, `logAudit('DELETE_CERT', ...)`, `String()` ID comparisons
- `moEditCert(id)` — modal with 6 fields (type, ref, issued, expiry, engineer, issuing_authority)
- `saveEditCert(id)` — DB update + in-memory cache sync + `logAudit('EDIT_CERT', ...)`; spinner uses `class="spin"`
- Delete (✕) and Edit (✎) buttons added to: `renderCompGroup`, `pgCompliance` drill-down, doc library rows
- `LEGAL_DOC_TYPES` expanded from 3 to 13 document types

### Session 20 — 20 May 2026 — Property Re-let, Tenant Comms, Legal Pack

- **Re-let:** "🧹 Prepare to Re-let" button on vacant properties; `moPreparRelet(pid)` modal with 3 checkboxes + cert health check; `confirmRelet(pid)` clears data + audit log
- **Tenant Comms:** "✉ Message" button in tenant detail; `moTenantComms(tid)` with AI draft + 7 categories; `sendTenantComms` sends via `ai-proxy` Resend, logs to `email_log`, `logAudit('TENANT_COMMS')`
- **Legal Evidence Pack:** "📋 Legal Evidence Pack" button replaces "⬇ Download audit trail"; `moLegalPack(pid)` with tenant/date/section selectors; `generateLegalPack(pid)` — jsPDF with cover page, chain of custody, 5 data sections, auto-pagination, branded footer, `logAudit('LEGAL_PACK_GENERATED')`

### Session 20 — 20 May 2026 — Sidebar Redesign (17 → 7 tabs)

- **17 items → 7** across 3 groups: My Portfolio (Dashboard, Properties, Tenants), Staying Legal (Compliance, Maintenance), Money & Records (Rent & Finance, Documents)
- AI Assistant → green card between nav and footer; Feedback → footer text link
- `initSbGroups()` updated for new group IDs: `portfolio`, `legal`, `records`
- `nav()` pageMap redirects 10 old names → 7 new tab homes; plan gating moved inside `pgRentFinance()`/`pgDocuments()` wrapper renderers
- New renderers: `pgRentFinance()` (sub-tabs), `pgDocuments()` (sub-tabs), `showAssistant()`
- Old pages merged: Insurance/Inspections/Inventory Reports → Compliance; Calendar/Contractors → Maintenance; Rent/Finance/MTD → Rent & Finance; Templates/Doc Library/Contractors → Documents

### Session 20 — 20 May 2026 — Property Detail Page Reorganization

- **5 tabs → 4:** Tenants, Compliance, Maintenance, Details
- **Tenant tab:** Massive cards → compact clickable rows (avatar, name, rent, signing badge, →); click navigates to `tenant-detail`
- **E-sign:** Moved from per-tenant card button → property header action bar (`moEsign(pid, tid)` for active properties)
- **Signed documents:** Moved from Tenant tab bottom → property-level panel visible on ALL tabs
- **Details tab:** Merged property info + financials (mortgage, insurance, rent records, licence, rooms, notes)
- **Financials tab:** Removed (content in Details)
- **Compliance tab:** Inventory Reports section added at bottom (Portfolio-only, `D.inventoryReports` filtered by property)
- **Archived properties:** "📋 View History" + "🧹 Prepare to Re-let" buttons

### Session 20 — 20 May 2026 — Syntax Fix

- **Bug:** `Uncaught SyntaxError: Unexpected end of input` — `pdTabContent()` was missing `return ''; }` at end of function
- **Root cause:** When removing the old Property tab block (`if (tab === 'property')`), the function's closing `return '';` and `}` were also removed
- **Fix:** Added `return ''; }` between maintenance tab closing and `buildCertStatusGrid` at line ~6125

---

## 14. Stripe Integration Guide

> **Architecture:** Stripe Payment Links (hosted checkout). No edge function needed for checkout.
> The browser opens the Stripe Payment Link in a new tab, then Stripe fires webhook events to
> `stripe-webhook` to record the subscription in the database.

### How the Payment Flow Works

```
User clicks "Subscribe" on profile.html
  ↓
js/profile.js reads data-link from the plan button
  ↓
window.open(link, '_blank') opens Stripe Payment Link in a new tab
  ↓
User pays on Stripe's hosted checkout page
  ↓
Stripe fires 'checkout.session.completed' to webhook:
  https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/stripe-webhook
  ↓
stripe-webhook Edge Function:
  1. Verifies Stripe-Signature
  2. Retrieves subscription from Stripe API
  3. Maps price_id → plan_name via PRICE_TO_PLAN
  4. Upserts into stripe_subscriptions table
```

### Plan Cards

| Plan | Payment Link | Price ID |
|---|---|---|
| Starter | `https://buy.stripe.com/test_7sY8wQ023cGmg6d5oX9Ve01` | `price_1TYw3tICNn8XxxhbIhMQ47XE` |
| Landlord | `https://buy.stripe.com/test_bJe6oI7uv0XE7zHaJh9Ve02` | `price_1TYwEuICNn8XxxhbXpY1bl1O` |
| Portfolio | `https://buy.stripe.com/test_fZueVebKLeOu9HPg3B9Ve04` | `price_1TYwIHICNn8Xxxhbw76LS7h5` |

### Stripe Payment Link Creation (one-time setup)

1. Log in to https://dashboard.stripe.com
2. Go to **Products → Add product** — create 3 products (Starter, Landlord, Portfolio) with recurring pricing
3. For each product, create a **Payment Link** — copy the buy.stripe.com URL
4. Update `data-link` attributes in `profile.html` with the Payment Link URLs

### Edge Function Secrets (for stripe-webhook)

Set in Supabase Dashboard → Project Settings → Edge Functions → Secrets:

| Secret | Value source |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → signing secret (`whsec_...`) |

### Deploy stripe-webhook

```powershell
Copy-Item stripe-webhook-index.ts supabase\functions\stripe-webhook\index.ts -Force
npx supabase functions deploy stripe-webhook --project-ref mahtcfukgzbonwibtsxz --no-verify-jwt
```

### Register Webhook in Stripe Dashboard

1. Go to **Developers → Webhooks → Add endpoint**
2. URL: `https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/stripe-webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET`

### Database

`sprint13_db.sql` creates the `stripe_subscriptions` table with columns:
`id`, `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `plan_name`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `created_at`, `updated_at`

### Test the Flow

1. Open `profile.html` as logged-in user → click Subscribe on any plan
2. Pays on Stripe test page (card `4242 4242 4242 4242`, any future date, any CVC)
3. Webhook fires → `SELECT * FROM stripe_subscriptions;` should show a row

### Test Card Numbers

| Card | Scenario |
|---|---|
| `4242 4242 4242 4242` | Successful |
| `4000 0025 0000 3155` | 3D Secure |
| `4000 0000 0000 9995` | Declined |

### Going Live

1. Switch Stripe to **Live mode**
2. Get live Secret key (`sk_live_...`) and create live Price IDs / Payment Links
3. Update `data-link` values in `profile.html` with live Payment Link URLs
4. Update `PRICE_TO_PLAN` mapping in `stripe-webhook-index.ts` with live Price IDs
5. Redeploy `stripe-webhook`, register live webhook endpoint

---

## 15. COMPLIANCE_DOCS Reference

> **Location:** `landlord.html:~653` — inserted after `// ── DATA STORE ──` comment  
> **Purpose:** Single master definition of all compliance document types used by `pdTabContent` compliance tab, `pgCompliance()` page, and `moWelcomeKit()` welcome kit.

### Structure

`COMPLIANCE_DOCS` is a const object with 6 group keys:

| Group Key | Label | Icon | Notes |
|---|---|---|---|
| `safety` | Safety Certificates | 🛡 | Mandatory legal obligations (6 docs) |
| `licensing` | Licensing & Property Type | 📋 | HMO-section — hidden for standard properties (6 docs) |
| `tenancy` | Tenancy Documents | 📄 | Served/not-served status, not expiry (7 docs) |
| `movein` | Move-In Pack | 📦 | Cross-references Group 1 certs for service confirmation (6 docs) |
| `insurance` | Insurance | 🔒 | Pulls from Insurance module data (3 docs) |
| `recommended` | Recommended | 💡 | Best practice, amber-only, no red badges (4 docs) |

### Per-Doc Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (e.g. `'gas'`, `'rra_sheet'`) |
| `label` | string | Display label (e.g. `'Gas Safety Certificate (CP12)'`) |
| `frequency` | string | Renewal/recheck frequency |
| `note` | string | Legal requirement explanation text |
| `mandatory` | boolean | `true` = legal obligation |
| `no_expiry` | boolean | `true` = tracked by served/not-served, not expiry date |
| `hmo_only` | boolean | `true` = hidden for standard properties by `getDocsForProperty()` |
| `furnished_only` | boolean | `true` = hidden for unfurnished properties by `getDocsForProperty()` (e.g. PAT testing only applies to furnished lets) |
| `match` | string[] | Keywords for `findCertForDoc()` to match against cert records |
| `recommended` | boolean | (optional) Best practice but not law |
| `insurance_type` | string | (insurance group only) Insurance policy type name |
| `ref_group` / `ref_id` | string | (movein group only) Cross-reference to parent group/doc |
| `conditional` | boolean | (optional) May not apply to all properties |

### Helper Functions

**`getDocsForProperty(pid)`** — Returns a filtered copy of `COMPLIANCE_DOCS`:
- Checks if property is HMO via `p.type === 'HMO'` or `licence_type` contains "hmo"/"mandatory"
- Checks if property is furnished via `p.furnished === true` or `furnished_status` includes "furnished"/"part furnished"
- Hides `hmo_only: true` docs for standard properties
- Hides `furnished_only: true` docs (e.g. PAT testing) for unfurnished properties
- Returns all 6 group keys with filtered doc arrays

**`findCertForDoc(doc, certList)`** — Matches a doc definition to a cert record:
- Iterates `doc.match[]` keywords against `certList[].type` (lowercased)
- Returns the first matching cert or `undefined`

**`getDocStatus(doc, certList, insuranceList)`** — Returns `{ lbl, bg, col, bdr, days, overdue, action? }`:
- **Insurance group:** Searches `insuranceList` for matching `insurance_type`; returns EXPIRED/URGENT/EXPIRING SOON/VALID/NOT ADDED; sets `action: 'insurance'`
- **No-expiry docs:** Returns SERVED/NOT SERVED (green/amber) or NOT UPLOADED (grey)
- **Recommended docs:** Returns NOT ON FILE (amber, not red) when missing
- **Expiry-based certs:** Returns EXPIRED/URGENT/EXPIRING SOON/VALID/MISSING
- `overdue: true` when item needs action (mandatory and expired/missing/not-served)

### Usage Pattern

```javascript
const propDocs = getDocsForProperty(pid);
const certList = CF(pid);
const insList = D.insurance.filter(i => String(i.prop_id) === String(pid));

// Get status for a single doc type
const st = getDocStatus(propDocs.safety.docs[0], certList, insList);
// st = { lbl: 'VALID', bg: 'var(--green-bg)', col: '#00A87A', ... }

// Iterate all mandatory groups
['safety','licensing','tenancy','movein'].forEach(gk => {
  propDocs[gk].docs.forEach(doc => {
    if (!doc.mandatory) return;
    const st = getDocStatus(doc, certList, insList);
    // Use st.lbl, st.overdue, st.days, etc.
  });
});
```

### Consumers

| Consumer | What it uses | Location |
|---|---|---|
| `pdTabContent` compliance tab | `getDocsForProperty` → all 5 groups + recommended + inspections | `landlord.html:~4933` |
| `pgCompliance()` page | `getDocsForProperty` → mandatory groups 1–4 for scoring + action list + full audit | `landlord.html:~5428` |
| `moWelcomeKit()` | `getDocsForProperty` → tenancy + movein merged | `landlord.html:~3469` |
| `initPropChecklist` auto-detection | `_hasCert()` helper using `CF(pid)` — indirect via `getDocStatus` pattern | `landlord.html:~4769` |

---

## 16. Recent Features (May 2026)

Quick-reference documentation for features added in the May 2026 UX refresh.

### 16.1 Document Viewer Overlay (`dvoOpen`)

**Location:** `landlord.html` — overlay HTML before `</body>`, functions before `</script>`

The global document viewer overlay provides a consistent way to preview any uploaded document across the platform. It is accessible from the property detail compliance tab, the compliance page drill-down, and the document library.

**Key functions:**
- `dvoOpen(url, title, meta)` — Opens the overlay with a document. Auto-detects file type (PDF/image/other). Falls back to Google Docs viewer for cross-origin PDFs after 4 seconds. Generates signed URLs for private buckets.
- `dvoClose()` — Closes overlay, clears iframe, restores body scroll
- `dvoDownload()` — Triggers browser download of current document

**Supported formats:** PDF (iframe), images (img tag), all others (fallback with Download button)

**View buttons appear in:** property detail compliance tab cert rows, compliance page drill-down, document library page

### 16.2 Newsletter Opt-In System

**Location:** `landlord.html` (helpers + dashboard banner), `profile.html` (settings toggle), `signup.html` (signup checkbox), `js/signup.js` (signUp metadata)

**DB columns on `user_profiles`:** `newsletter_opted_in` (boolean), `newsletter_opted_at` (timestamptz), `newsletter_dismissed_at` (timestamptz)

**Flow:**
1. Signup → checkbox state passed as `options.data.newsletter_opted_in` in `auth.signUp()`
2. Login → `loadData()` syncs auth `user_metadata.newsletter_opted_in` to `user_profiles` if not already set
3. Dashboard → banner shows when `newsletter_opted_in` is null and `localStorage nl_banner_dismissed` is not set
4. Settings → toggle switch in profile.html reads/writes `user_profiles.newsletter_opted_in`
5. Dismiss → "No thanks" sets `localStorage` dismissal + `dismissed_at` timestamp, animates banner out

### 16.3 Trial Expiry Soft Lock

**Location:** `landlord.html` — `nav()`, `_expiredGuard()`, `showTrialExpiryPopup()`, `moDeleteAccount()`, `execDeleteAccount()`

**Nav guard** (`nav()`): Expired users can browse 13 allowed pages (properties, tenants, compliance, maintenance, insurance, inspections, rent, financials, calendar, doclibrary, contractors, prop-detail, dashboard). Billing/profile always accessible. Write-heavy pages blocked (templates, inventory-reports, MTD, assistant).

**Write guard** (`_expiredGuard(actionLabel)`): Called at the start of 8 write functions. Returns `true` (block) if trial expired, showing a modal with "View plans →" link to profile.html and "Continue read-only" dismiss button.

**Guarded functions:** `moAddProp`, `savePropToDB`, `moCert`, `moTenant`, `_saveTenantSetupToDB`, `moIssue`, `sendWelcomeKit`, `moSection8`

**Expired banner:** Red flex bar with `trial-expired-banner-text` span (set by `showTrialExpiredBanner()`) + built-in "View plans →" and "Read-only mode" buttons.

**Delete account:** `moDeleteAccount()` requires typing DELETE to confirm. `execDeleteAccount()` deletes from all tables then signs out.

### 16.4 Data Export (CSV + ZIP)

**Location:** `landlord.html` (functions + compliance tab button), `profile.html` (My Data panel)  
**Dependency:** JSZip 3.10.1 from cdnjs (loaded in `<head>`)

**Entry points:**
- Settings page → "⬇ Export all data" button (full export of all properties, tenants, certs, etc.)
- Property detail compliance tab → "⬇ Download audit trail" button (per-property export filtered by PID)
- `exportData()` — callable from console for debugging
- `exportData(pid)` — per-property export

**ZIP contents (full export):** `properties.csv`, `tenants.csv`, `certificates.csv`, `maintenance.csv`, `rent.csv`, `insurance.csv`, `email-log.csv`, `contractors.csv`, `esign.csv`, `README.txt`

**ZIP contents (per-property):** Same minus `contractors.csv` — all files filtered to that property only

**README.txt includes:** generation timestamp, user email, file descriptions, GDPR legal notice

**CSV format:** Properly escaped (quotes commas/quotes/newlines), header row, empty tables export as "No data". Dates formatted en-GB `DD/MM/YYYY HH:MM`.

### 16.5 Sidebar Navigation Structure

The sidebar after the May 2026 Session 20 redesign — **7 items across 3 groups** (was 17 items, 5 groups):

| Group | Items |
|---|---|
| *(standalone)* | **Dashboard** |
| **My Portfolio** | Properties, Tenants |
| **Staying Legal** | Compliance, Maintenance |
| **Money & Records** | Rent & Finance, Documents |

All groups collapsible via `toggleSbGroup()` with `sb-group-body`/`sb-group-hdr` pattern. Init state set in `initSbGroups()` for IDs: `portfolio`, `legal`, `records`.

**AI Assistant** is a green card between nav and footer (`showAssistant()`).
**Feedback** is a tiny text link below the footer.
**Badges:** 4 dynamic badges retained (`nav-badge-properties`, `nav-badge-compliance`, `nav-badge-maintenance`, `nav-badge-rent`).

**Old pages redirected via nav() pageMap:**
- `insurance`, `inspections`, `inventory-reports` → Compliance tab
- `calendar`, `contractors` → Maintenance tab
- `rent`, `financials`, `mtd` → Rent & Finance tab (with sub-tabs)
- `templates`, `doclibrary`, `contractors` → Documents tab (with sub-tabs)
- `assistant` → Dashboard (opens via `showAssistant()`)

**Plan gating:** Handled inside `pgRentFinance()` and `pgDocuments()` wrapper renderers with upgrade prompts for Starter users. No sidebar-level blocking.

### 16.6 Property Detail Tab Structure

Tabs in `pgPropDetail()` after Session 20 reorganization (4 tabs, was 5):

| Tab | Content |
|---|---|
| **Tenants** | Compact rows (avatar, name, rent, signing badge, →). Click → `tenant-detail`. Section 8 promo card. Email log. "+ Add tenant" button. |
| **Compliance** | RAG score bar, Legal Evidence Pack button, 5 collapsible doc groups + Recommended + Inspections + **Inventory Reports** (Portfolio-only) |
| **Maintenance** | Metric cards (open/resolved/Awaab), issues table with status flow buttons |
| **Details** | Financial metrics (income/costs/profit), property details, mortgage, insurance, rent records, licence, rooms, notes |

**Merged into Details:** Financials tab (metrics + mortgage + insurance + rent records)  
**Moved to Compliance:** Inventory Reports (was promo card in Tenant tab)  
**Moved to header:** E-sign Agreement button (was per-tenant card button)  
**Moved to property-level panel:** Signed Documents (visible on all tabs, shows per-tenant signing status)

Topbar shows breadcrumb: `Properties / 123 High Street` — "Properties" clickable.
Status-dependent header buttons: Vacant (Start Tenancy + Prepare to Re-let + Archive), Active (E-sign + End Tenancy + Archive), Refurbishment (Mark Ready + Archive), Archived (View History + Prepare to Re-let).

### 16.7 Pricing (Post-Reprice)

Final pricing after the 19 May 2026 repricing pass (founding / standard monthly):

| Plan | Founding | Standard | Properties |
|---|---|---|---|
| Starter | £4.99/mo | £7.99/mo | Up to 2 |
| Landlord | £11.99/mo | £18.99/mo | Up to 10 |
| Portfolio | £23.99/mo | £39.99/mo | Unlimited |

- Founding prices locked for life for first 100 users. No card required. Cancel anytime.
- `PLAN_LIMITS`: `{ starter:2, landlord:10, portfolio:999 }`
- Pro plan removed — all `'pro'` references purged from `isPortfolio()`, `isLandlordOrAbove()`, `planLabels`
- Default compliance view is Full Audit — all `||'action'` fallbacks changed to `||'full'`
- Upgrade prompt: Starter hitting limit is prompted to upgrade to Landlord, not Portfolio

### 16.8 Recent Editorial Fixes

- **RRA post-deadline (31 May 2026+):** Blue banner shown for unsent tenants instead of empty return — keeps the RRA Sheet visible for late compliance
- **PAT furnished filter:** PAT Testing Certificate hidden for unfurnished properties via `furnished_only: true` + `isFurnished` filter in `getDocsForProperty`
- **Cert expiry hide:** `_toggleCertExpiry()` hides the expiry date field in the `moCert` modal for 8 no-expiry doc types (Smoke Alarm, CO Alarm, Pest Control, How to Rent, Right to Rent, Deposit Protection, Prescribed Information, Written Statement)
- **Safety group default:** Collapsed in compliance tab — overdue items still auto-expand
- **S8 compact card:** "Generate →" button calls `s8LaunchFromTemplates()` — handles 1-property (auto-launch) and multi-property (picker modal)
- **`closeModal()` alias:** Added next to `closeMo()` for comms hub compatibility
- **Doc library View buttons:** Extended URL resolution to check `engineer` field (stores public URL for doc library uploads)

### Session 21 — 23 May 2026 — Bug Fixes, Onboarding Stepper & Journey Card Updates

**Date:** 23 May 2026
**File modified:** `landlord.html` (15,288 → 15,297 lines)

#### Supabase Schema Fixes

- **`user_profiles` 400 error fixed:** Missing `plan` (text, default 'trial') and `newsletter_opted_in` (boolean, default false) columns added via SQL:
  ```sql
  ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS newsletter_opted_in boolean DEFAULT false;
  ```
- **`inventory_reports` 404 fixed:** Table created (was missing) — full schema with RLS policy:
  ```sql
  CREATE TABLE IF NOT EXISTS inventory_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    prop_id text, type text, notes text, file_url text,
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE inventory_reports ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users manage own inventory reports" ON inventory_reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  ```

#### Bug Fixes (Priority Gap List — all 10 resolved)

| # | Fix | Details |
|---|-----|---------|
| 1 | **Mark Served / upload button** | Compliance detail view cert rows now show green `✓ Mark Served` button (calls `markServed(certId)`) when status is NOT SERVED. NOT UPLOADED rows show red `+ Upload` button. |
| 2 | **Post-tenant-add CTA modal** | After `_saveTenantSetupToDB()` saves, instead of silent nav, shows "Next steps 🎉" modal with: Send Welcome Kit → `moWelcomeKit()`, Upload Documents & RTR → `nav('tenants', tid)`, Skip for now → original nav. String concatenation used (not template literals) to avoid nesting syntax errors. |
| 3 | **E-sign repositioned as Day 1 step** | "✍️ Written Statement e-signed" moved from Day 30 Pack to Day 1 Pack. Day 30 now contains deposit-only items: Prescribed info served, Deposit scheme protected, Smoke & CO alarm tested. |
| 4 | **Deposit protection reminder** | `checkAllReminders()` now fires at day 25 and day 28 after tenancy start for any tenant with `deposit > 0` and no `scheme`/`scheme_ref`. Email includes deadline date + 3× deposit penalty warning. Added to `REMINDER_TYPES` as mandatory (`id: 'deposit_protect'`). |
| 5 | **Inventory in Day 1 journey card** | "📋 Inventory / schedule of condition" added as last item in Day 1 Pack. Done check: cert type includes 'inventory' or 'schedule of condition'. Action: `nav('inventory-reports')`. |
| 6 | **New user onboarding stepper** | `renderNewUserStepper()` function added (line ~10922). Renders a 4-step card on dashboard when `D.properties.length === 0`: (1) Add property, (2) Upload certs, (3) Add tenant, (4) Send welcome kit. Step 1 highlighted navy. Dismissable (localStorage `nexlet_onboard_stepper_v1`). Auto-hides once properties exist. Slot added to `pgDashboard()` as `<div id="new-user-stepper-slot">` above setup-banner-slot. Called via `setTimeout(renderNewUserStepper, 50)` after `nav('dashboard')` in `initApp`. |
| 7 | **RTR/ID upload prompt actionable** | Passive blue info banner in pre-tenancy checklist (onboard mode) replaced with flex row + `📄 Upload Docs →` button calling `nav('tenants', pid)`. |
| 8 | **Co-tenants grouped on contract** | `moEsign()` now gathers all active tenants for property via `_esignAllTenants`. Blue info banner shown for joint tenancies. Modal subtitle + `esign-tname` field show all tenant names comma-separated. AI prompt updated from `Tenant:` to `Tenant(s):`. |
| 9 | Legionella missing from compliance | Already present in `COMPLIANCE_DOCS` as mandatory — no change needed. |
| 10 | Deposit protection date not verified | Covered by deposit protection reminder (Fix #4) + existing deposit scheme check in compliance. |

#### Syntax Errors Fixed

- **Fix 2 (post-tenant CTA):** Original used nested template literals with `${_skipNav}` inside onclick inside outer backtick string — caused `SyntaxError: Invalid or unexpected token`. Rewritten as plain string concatenation.
- **Fix 3 (RTR banner):** `+(pid||'')+` embedded inside single-quoted string broke string boundary. Rewritten as multi-part string concatenation with `+` operators outside quotes. Em dash replaced with HTML entity `&#x2014;`.

#### Post-Launch Backlog Added

- **In-app workflow guidance** (contextual "?" tooltips or help modal) — parked post-launch. Option A = modal (quick), Option B = inline tooltips.

#### Key Function Locations (updated)

| Function | Line ~ | Notes |
|---|---|---|
| `renderNewUserStepper()` | 10922 | New user 4-step onboarding stepper |
| `_saveTenantSetupToDB()` | 3475 | Now shows post-add CTA modal instead of silent nav |
| `moEsign(pid, tid)` | 13405 | Now co-tenant aware — shows all tenant names |
| Day 1 journey items | 7921 | Now includes e-sign + inventory |
| Day 30 journey items | 7979 | Now deposit-only (3 items) |
| Deposit protect reminder | ~7530 | New block in `checkAllReminders()` |
| Mark Served button | ~6908 | In compliance detail cert row button IIFE |


---

### Session 22 — 24 May 2026 — Rent Collection, Documents & E-Sign Full Audit

**Date:** 24 May 2026
**File modified:** `landlord.html`

#### Bug Fixes — Rent Collection

| # | Bug | Fix |
|---|-----|-----|
| 1 | **`savePaymentRecord` dropped `month` and `notes`** | `dp` payload now includes `month: month\|\|null` and `notes: notes\|\|null`. Both were passed in but never written to DB. Every payment saved without a month label. |
| 2 | **`pgRent()` showed only raw DB records** | Replaced with `buildRentSchedule()` per property — now shows full schedule including auto-generated rows, matching property detail view. Orphan DB records (properties without active tenant) appended separately. "✓ Mark received" button on unrecorded overdue rows. |
| 3 | **Nav badge missed auto-generated overdue rows** | Badge now also iterates `buildRentSchedule()` rows with no DB id and `Late`/`Due` status. No longer shows 0 when months are genuinely unpaid. |
| 4 | **Overdue reminder suppressed by same-month payment from prior year** | Added `.getFullYear()===today.getFullYear()` to the paid check in `checkAllReminders()`. |
| 5 | **Receipt checkbox stale after property dropdown change** | Added `onchange` handler to property dropdown in `moAddPayment` — refreshes checkbox state and label for the newly selected property's tenant. Added `id="pay-receipt-lbl"` to the label div. |
| 6 | **`buildRentSchedule` never assigned `'Late'` status** | `cur < today` → `'Late'`, `cur.getTime() === today.getTime()` → `'Due'`. Auto-rows now correctly distinguish overdue from due-today. |

#### Bug Fixes — Documents

| # | Bug | Fix |
|---|-----|-----|
| 7 | **`dlUpload` used wrong storage bucket** | Changed from `esign-documents` to `documents` bucket — consistent with all other cert/doc uploads. |
| 8 | **Doc Library showed `expiry` as "Uploaded" date** | Now uses `created_at` (fallback to `expiry`) for the upload date label. |

#### Bug Fixes — E-Sign

| # | Bug | Fix |
|---|-----|-----|
| 11 | **E-sign status mismatch** | `_sendEsignRequest` inserted `status: 'pending'` but tenant card queried `r.status === 'sent'`. Changed insert to `'sent'`. Pending e-sign badges now appear correctly. |
| 12 | **`esignShowOptionA` function body split** | `_esignToggleEdit` was accidentally nested inside the opening of `esignShowOptionA`. Restructured as two properly separate top-level functions. |

#### Key Function Changes

| Function | Change |
|---|---|
| `savePaymentRecord(payload, editId)` | Now destructures and writes `month` + `notes` to `dp` |
| `pgRent()` | Full rewrite — uses `buildRentSchedule()` across all properties |
| `buildRentSchedule(pid)` | `cur < today` → `'Late'`; `cur === today` → `'Due'` |
| `renderNewUserStepper()` (nav badge block) | Badge counts auto-generated overdue rows |
| `checkAllReminders()` — rent overdue check | Year added to paid-check: `.getFullYear()===today.getFullYear()` |
| `moAddPayment()` | Property dropdown has `onchange` to refresh receipt checkbox/label |
| `dlUpload()` | Storage bucket: `esign-documents` → `documents` |
| `pgDocLibrary()` | Upload date uses `created_at` not `expiry` |
| `_sendEsignRequest()` | Insert `status` changed from `'pending'` to `'sent'` |
| `esignShowOptionA()` / `_esignToggleEdit()` | Functions separated — were incorrectly interleaved |

---

### Session 23 — 24 May 2026 — W2 E-sign Placement, C2 Optional Doc Toggles, U3 Onboarding, Deposit Receipt Template

**Date:** 24 May 2026
**File modified:** `landlord.html`

#### U3 — New User Onboarding Wizard

`renderNewUserStepper()` fully rebuilt. Two-mode system:

**Mode 1 — Full-screen wizard** (first login, zero properties):
- Overlays entire screen with blurred navy backdrop (`onboard-wizard-overlay` div injected into `<body>`)
- 4 steps with live progress bar, vertical stepper, connecting lines turn green as steps complete
- Completed steps struck through. Next actionable step highlighted navy with CTA button
- Dismissed via `nexlet_onboard_wizard_v1` localStorage key — never shows again once skipped
- On close: calls `renderNewUserStepper()` again to render slot widget

**Mode 2 — Dashboard slot widget** (after wizard dismissed, steps still incomplete):
- Compact panel in `new-user-stepper-slot` on dashboard
- Shows 4 rows with progress dots + "N of 4 complete" header with mini progress bar
- Only next incomplete step gets CTA button
- Dismissed via `nexlet_onboard_stepper_v1` key

**Real progress detection** (was hardcoded `false` before):
- Step 1: `D.properties.length > 0`
- Step 2: active tenant exists
- Step 3: any cert with `has_file` uploaded
- Step 4: `welcome_kit` in email log

**RTR/KYC nudge (Option B contextual):**
- Step 2 (Add tenant) has a `note` field: amber pill `"⚠️ Right to Rent check required — verify ID, share code or visa before move-in"` with `Go to tenant →` link
- Only appears when `hasTenant === true` (tenant just added — exactly the right moment)
- Renders in both wizard and slot widget

#### C2 — Optional Doc N/A Toggles

**New functions:**
- `bypassDoc(pid, docId)` — adds `docId` to `p.na_docs` array, saves to Supabase `properties.na_docs` (jsonb), logs to audit trail, re-navs
- `unbypassDoc(pid, docId)` — removes `docId` from array, same persistence

**`getDocStatus(doc, certList, insuranceList, naDocs)`:**
- New optional 4th param `naDocs`
- If `!doc.mandatory && naDocs.includes(doc.id)`: returns `{ lbl:'N/A', overdue:false, isNA:true }` immediately

**`renderCompGroup(..., naDocs)`:**
- New `naDocs` param passed to `getDocStatus` and `overdueCount` filter
- `_naBtn` variable: pill-style `N/A` button on non-mandatory, non-insurance rows. When `st.isNA`: shows `↩ Undo N/A` instead
- Row states: N/A rows → only Undo button. Overdue rows → Upload + N/A. Valid rows → edit/view/delete + N/A

**Recommended block:** Same `_recNA` treatment — `getDocStatus` passes `pNaDocs`, `_recNA` button wired into output

**All 5 `renderCompGroup` call sites** updated to pass `pNaDocs = Array.isArray(p?.na_docs) ? p.na_docs : []`

**Supabase column required:**
```sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS na_docs jsonb DEFAULT '[]'::jsonb;
```

#### W2 — E-sign Placement (Two New Entry Points)

**Entry point 1 — Compliance tab, Written Statement row:**
- `_esignTenant` = active tenant lookup for `pid`
- `_esignBtn` green pill: `✍ Send for e-sign` + sub-label `AI generates & tenant signs online`
- Appears on overdue rows (alongside Upload) and valid rows
- Hidden if no active tenant or doc is N/A

**Entry point 2 — Templates page, Written Statement card:**
- E-sign button below "Generate with AI" on `writtenstatement` card only
- Finds first active tenant across portfolio for `moEsign()` call
- Toast `"Add a tenant first"` if no tenant exists
- Sub-label: `AI generates & tenant signs online`

#### Deposit Receipt Letter Template

New template added to **Tenancy Documents** category (sits above Deposit Deduction — chronological order):

| Field | Value |
|---|---|
| Template ID | `depositreceipt` |
| Name | `Deposit Receipt Letter` |
| Tag | `Deposit` |
| Category | `LEGAL_DOC_TYPES` |

**Form fields (`TEMPLATE_FIELDS.depositreceipt`):**
- Deposit amount (£) — required
- Protection scheme — dropdown: DPS / MyDeposits / TDS / Not yet protected
- Scheme reference — optional text
- Date deposit received — required

**AI prompt:** Generates UK landlord deposit receipt letter covering: amount, date received, scheme + reference, 30-day legal protection deadline (Housing Act 2004), note that Prescribed Information follows separately. Professional tone, addressed to tenant by name.

**Doc name map + LEGAL_DOC_TYPES:** Both updated with `depositreceipt`.


---

### Session 25 — 29 May 2026 — Stripe Integration Complete + Go Live

**Date:** 29 May 2026
**Files modified:** `landlord.html`, `profile.html`, `js/profile.js`, `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/stripe-cancel/index.ts` (new)

#### Stripe Price IDs (Sandbox/Test — founding prices)

| Plan | Type | Price ID |
|---|---|---|
| Starter | founding | `price_1TX2zp2LDL4FOJhEvpaUe6sa` |
| Starter | standard | `price_1TcSFV2LDL4FOJhEsUm1W7Ro` |
| Landlord | founding | `price_1TcSLU2LDL4FOJhEamxB9g97` |
| Landlord | standard | `price_1TcSNa2LDL4FOJhEguNEJjhd` |
| Portfolio | founding | `price_1TcSPs2LDL4FOJhEJS7VUati` |
| Portfolio | standard | `price_1TcSRK2LDL4FOJhEIXd9FLKP` |

#### Database Changes

```sql
-- stripe_subscriptions table created with full schema
-- Columns: id, user_id, stripe_customer_id, stripe_subscription_id,
--          price_id, plan_name, status, current_period_end,
--          cancel_at_period_end, created_at, updated_at
-- RLS: authenticated role SELECT policy (auth.uid() = user_id)
```

#### Edge Functions Deployed

| Function | Flag | Status |
|---|---|---|
| `stripe-checkout` | default | ✅ deployed |
| `stripe-webhook` | `--no-verify-jwt` | ✅ deployed |
| `stripe-cancel` | default | ✅ deployed (new) |

**Webhook endpoint:** `https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/stripe-webhook`
**Stripe events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
**Webhook name in Stripe:** `exquisite-wonder`

#### Code Changes

| File | Change |
|---|---|
| `landlord.html` | Added `PRICE_MAP` const with 3 founding price IDs. `redirectToCheckout(plan)` now sends `{ price_id }` instead of `{ plan, billing_cycle }` |
| `profile.html` | Plan card Subscribe buttons changed from `data-link` (hardcoded buy.stripe.com URLs) to `data-price` with real price IDs. Lib scripts changed from `defer` to synchronous load |
| `js/profile.js` | Subscribe button click handler fixed: `btn.dataset.link` → `btn.dataset.price`, calls `_startCheckout(priceId)`. `_loadSubscription` changed from `.single()` to `.maybeSingle()` to fix 406 error |
| `stripe-webhook/index.ts` | Full rewrite: corrected price IDs in `PRICE_TO_PLAN` map, fixed imports to `stripe@14.21.0`, changed `serve()` to `Deno.serve()` |
| `stripe-cancel/index.ts` | New edge function: sets `cancel_at_period_end: true` on Stripe subscription and updates local DB |

#### Known Issues Post-Session

| Issue | Detail |
|---|---|
| `stripe_price_id` NULL in DB | Webhook writes to `price_id` column but table column is named `stripe_price_id` — minor, `plan_name` and `status` work correctly |
| `favicon.ico` 404 | No favicon file in repo — cosmetic only |
| `newsletter_opted_in` column | Not yet added to `user_profiles` table |

#### E2E Test Result

✅ Test card `4242 4242 4242 4242` → Stripe checkout → payment → webhook 200 OK → `stripe_subscriptions` row created with `plan_name: starter`, `status: active`

**NEXLET IS LIVE at https://nexlet.co.uk**

---

### Session 26 — 30 May 2026 — Post-Launch UI Polish (Batch A–C)

**Date:** 30 May 2026
**Files modified:** `landlord.html`

#### Summary

Post-launch UI upgrade pass targeting enterprise SaaS aesthetics. All changes are CSS/rendering only — no schema, no edge functions, no logic changes.

#### Changes Made

**Global CSS tokens:**
| Variable | Old | New |
|---|---|---|
| `--off` | `#F8F6F1` (warm cream) | `#F4F5F7` (cool grey) |
| `--border` | `#D8D4CC` | `#E2E5EA` |
| `--txt` | `#1E2A2A` | `#1A2332` |
| `--muted` | `#6B7A7A` | `#64748B` (slate) |

**Component polish:**
- `.mc` + `.panel`: added `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`
- `.topbar`: height 52→56px + micro shadow
- Founding price banner: large orange box → compact navy pill
- Send feedback: increased opacity 10%→40%, added `border-top`
- `.b-green` badge: now correctly uses `--status-green-bg/dark` (#00875A) — "Active", "Valid", "Paid", "Protected" all green
- Property list rent values: changed from orange `var(--green-dark)` → neutral `var(--txt)`

**Tables & compliance:**
- `tr:hover td`: hover colour changed to `rgba(59,111,232,0.04)` with CSS transition
- `.ph2 h2`: 14px → 13px + letter-spacing
- `th`: white background, letter-spacing .4→.6px
- `td`: hardcoded `#3D5166` → `var(--txt)`
- Kanban column headers: `var(--muted)` → `var(--txt)`, letter-spacing bump

**Property detail stat cards (pgTenantDetail):**
- Removed coloured tinted backgrounds (`var(--green-bg)`, `rgba(59,111,232,0.09)`, etc.)
- Now: `background:var(--white)`, `border-left:3px solid {status-colour}`, `box-shadow:0 1px 3px rgba(0,0,0,0.06)`
- Icon bg: `var(--off)` (was `rgba(255,255,255,0.5)`)

**Compliance row density:**
- Mandatory overdue doc labels: `font-weight:700`
- Optional docs remain `font-weight:500`

**Postcode lookup fix:**
- `lookupPostcode()` rewritten: exact lookup first (`/postcodes/{pc}`), fuzzy only as fallback
- Added `.toUpperCase()` normalisation
- Fixes random/incorrect results on partial postcode matches

#### Remaining / Next Session

| Task | Detail |
|---|---|
| Tenant detail KYC duplication | Sticky summary bar (`stickyCard`) at top of tenant detail repeats "🗂 KYC Documents" heading + pills that are already shown in full section below. Remove sticky bar or collapse it to a minimal status chip only |


---

### Session 27 — 31 May 2026 — UI Polish, Navy Border Treatment & Competitive Audit

#### Navy left-border panel treatment — applied app-wide
All key feature panels now have `border-left:3px solid var(--navy);background:rgba(11,30,61,0.02)`. Applied to 15 panels:

| Panel | Location in file |
|---|---|
| ✉ Email log | Property detail (pgPropDetail) |
| 🏠 Property details | Property detail |
| 🔧 Issues | Property detail |
| Compliance action list (`#comp-action-list`) | pgComplianceSection |
| Recent reminders sent | pgReminders |
| Tenancy Details | pgTenantDetail |
| 📋 Compliance Checklist | pgTenantDetail |
| 🗓 Day 1 Pack | pgTenantDetail |
| 📆 Day 30 Pack | pgTenantDetail |
| KYC Documents (`#kyc-docs-section`) | pgTenantDetail |
| 📨 Communications | pgTenantDetail |
| 🏠 Tenant Portal card | pgTenantDetail (pre-existing from Session 26) |
| Property breakdown | pgFinancials |
| Upload Document | pgDocLibrary |
| Stored Documents | pgDocLibrary |

Visual rule: navy left border = key feature / action panel. Data/table-only panels (e.g. rent ledger rows, kanban task rows) do not get this treatment.

#### Completed earlier this session (pre-compaction)
- **KYC section deduplication** — removed redundant `<h2>🗂 KYC Documents</h2>` + `<p>` subheading from `#kyc-docs-section` panel body (sticky bar retained)
- **Tenant portal token rename** — `rsa_tenant_token` → `nxl_tenant_token` (5 occurrences in `tenant.html`)
- **Tenant portal: Ended tenancy** — `handleToken()` checks for `status === 'Ended'` and shows "Tenancy ended — portal access no longer active"
- **`moEndTenancy()`** — now nulls `invite_token`, `invite_used`, `portal_enabled` for primary AND co-tenants on the same property
- **`newsletter_opted_in` column** — added `newsletter_opted_in BOOLEAN DEFAULT NULL` and `newsletter_opted_at TIMESTAMPTZ DEFAULT NULL` to `user_profiles` (default NULL = never chosen, not false)
- **`stripe_price_id` webhook fix** — deployed `stripe-webhook.ts` fix: changed `price_id` → `stripe_price_id` in both `checkout.session.completed` upsert and `customer.subscription.updated` update
- **`favicon.ico`** — generated white "N" on NEXLET navy (#0B1E3D) circular background, 16×16 + 32×32 ICO. Added `<link rel="icon">` to `landlord.html` and `tenant.html`. File pushed to GitHub repo root.
- **AI badge on all tenant doc upload buttons** — `✦ AI auto-scan` badge shown on both empty-state and has-docs "Add another" upload buttons
- **Tenant portal open link** — changed from hardcoded `https://nexlet.co.uk/tenant.html` to `${window.location.origin}/tenant.html`

#### Competitive intelligence audit — LetCompliance vs NEXLET (May 2026)

**LetCompliance confirmed features (from their live site):**
- 0–100 compliance score, 6 areas
- Gas / EICR / EPC / deposit / Right to Rent tracking
- Email + WhatsApp reminders at 90/30/14/7/1 days
- Section 8 — 14 grounds only
- SA105 tax pack, MTD quarterly summary, Section 24 calculator
- Tenant portal (Standard plan only)
- Free public compliance checker (no signup)
- Full editorial blog / content hub driving SEO
- AES-256 / GDPR trust badges in nav
- £14.99/mo from, 7-day trial

**NEXLET exclusive advantages:**
1. All 37 RRA 2025 Section 8 grounds (vs their 14) — headline differentiator
2. AI document scanner on every upload (name mismatch warnings) — not offered by competitor
3. 30-day free trial, no card (vs their 7 days)
4. Founding member pricing from £4.99/mo, locked for life (no equivalent at LetCompliance)
5. Dual e-sign flow (landlord signs first, tenant counter-signs) — not offered
6. Awaab's Law 24h/7d/14d SLA engine — not offered
7. Prescribed Information PDF generator — not offered
8. Right-to-Rent share code wizard — not offered
9. Ground 8 arrears auto-calculator — not offered
10. Powered by Claude / Anthropic (they use Gemini)
11. White-label agent portal planned (Portfolio tier)

**NEXLET gaps vs LetCompliance (to close):**
1. WhatsApp reminders — they promote heavily, NEXLET email-only
2. Free public compliance checker (no signup) — high SEO value
3. Blog / content hub — they rank for every landlord compliance keyword
4. Trust badges (AES-256, GDPR, ICO) not yet prominent on landing page
5. Section 21 urgency messaging — they own "Section 21 is gone. Are you ready?"

#### Landing page marketing recommendations (priority order)

1. **[HIGH] Rewrite hero headline** — lead with court loss fear: "Section 21 is dead. Miss one of the 37 Section 8 grounds and your possession case fails. NEXLET is the only tool built around all 37."
2. **[HIGH] Named competitor comparison table** — 3-column table on landing page: NEXLET vs LetCompliance on 37 grounds, trial length, price. Converts extremely well.
3. **[HIGH] Founding price urgency counter** — "87 founding slots taken. 13 remaining." Live counter on hero. Drives urgency.
4. **[MED] AI scanner as headline feature** — dedicated section with "✦ AI scan complete" badge demo. No other landlord tool does this.
5. **[MED] E-sign proof point** — frame as court-admissible evidence with dual audit trail, not just convenience.
6. **[MED] Trust badges** — add AES-256 / GDPR / ICO (when registered) / Co. No. above the fold.
7. **[LOW] Founder story specificity** — add real numbers: properties managed, Section 8 notices served, compliance checks run.

**Positioning statement (for landing, social, email):**
"NEXLET is the only UK landlord compliance platform built for all 37 RRA 2025 Section 8 grounds — with AI document scanning, dual e-sign, and founding member pricing from £4.99/mo."

#### Known issues still open
| # | Issue | Status |
|---|---|---|
| 1 | ICO number placeholder in legal docs | Pending registration |
| 2 | MX record for inbound email | Parked post-launch |
| 3 | `login.html` newsletter signup checkbox | Not built |
| 4 | `moFinancials` PDF export — jsPDF needed | Post-launch backlog |
| 5 | Section 8 UX handoff to Form 3A | Post-launch backlog |
| 6 | Dual e-sign flow — partially built, not complete | Post-launch backlog |
| 7 | WhatsApp reminders | Post-launch backlog |
| 8 | Free public compliance checker | Marketing priority |
| 9 | Blog / content hub | Marketing priority |

---

### Session 27 — 31 May 2026 — Pre-Launch Branding Fix + Dashboard Wow Factor + Compliance Checklist AI Scanner

**Date:** 31 May 2026
**Files modified:** `landlord.html`, `tenant.html`

---

#### 1. Tenant portal branding — `tenant.html` (Issues 1 & 4)

Two hardcoded `Rent<span>Safe</span> AI` strings remained in `tenant.html` from the original brand. Both replaced with `Nex<span>Let</span>`:

| Location | Old | New |
|---|---|---|
| Loading screen (`div.loading-logo`) | `Rent<span>Safe</span> AI` | `Nex<span>Let</span>` |
| Portal header topbar (`div.portal-logo`) | `Rent<span>Safe</span> AI` | `Nex<span>Let</span>` |

Both use existing CSS classes (`.loading-logo`, `.portal-logo`) which apply the navy + green split — renders as **Nex**<span style="color:green">**Let**</span> matching the main app.

---

#### 2. Dashboard — Portfolio Health Score ring + micro-charts (Issue 2)

**New: Portfolio Health Score ring** — inserted above the `.metrics` grid in `pgDashboard()`.

- SVG circular progress dial (0–100) colour-coded: ≥80 green, ≥50 amber, <50 red
- Score formula (100 pts total):
  - **Certificates (30pts)** — `validCerts / totalCerts × 30`
  - **Rent (30pts)** — `(totalRent - lateRent) / totalRent × 30`
  - **Maintenance (20pts)** — deducted for Awaab open / urgent / count
  - **KYC (20pts)** — `tenantsWithFullKYC / activeTeants × 20`
- Four mini horizontal progress bars below the ring (one per component)
- Entire card clickable → `nav('compliance')`

**Enhanced stat cards** — all four cards now include a micro progress bar at the bottom:

| Card | Metric | Bar shows |
|---|---|---|
| Properties | Occupancy % | `activeTenants / activeProps × 100` |
| Monthly rent | Collection rate % | `paidRent / totalRent × 100` |
| Certificates *(new — replaces Active tenants)* | Valid cert % | `(certCount - issues) / certCount × 100` |
| Open issues | Resolved % | `resolved / totalMaintenance × 100` |

Note: "Active tenants" card removed — occupancy bar on Properties card conveys same info more efficiently. Certificates card added as standalone metric with expiry tracking.

---

#### 3. Compliance checklist — AI scanner on upload (Issue 3)

**New constant:** `CHECKLIST_UPLOAD_SLOTS` — maps checklist keys to KYC upload slots:

```js
const CHECKLIST_UPLOAD_SLOTS = {
  rtr:       { slot: 'right_to_rent', label: 'Upload R2R doc' },
  id_docs:   { slot: 'passport',      label: 'Upload ID doc' },
  agreement: { slot: 'agreement',     label: 'Upload agreement' },
};
```

**`_checklistRowHtml()` updated:**
- Rows with an upload slot (`rtr`, `id_docs`, `agreement`) now show:
  - `✦ AI scan` badge pill in the collapsed row header
  - Upload button inside the expanded detail panel, wired to `uploadTenantDoc(tid, slot, input)` → auto-triggers `scanTenantDoc()` exactly as KYC section does
  - After scan: shows extracted name, doc type, expiry + name match / mismatch indicator
  - "↺ Replace" label if a doc already exists for that slot
- Rows without an upload slot (`deposit_protection`, `rent_guarantee`, `insurance`) — unchanged, manual status dropdown only
- Scan results pulled from `D.tenantDocs` filtered by `tenant_id` + `slot` — no new Supabase table needed

---

#### Known issues updated

| # | Issue | Status |
|---|---|---|
| 1 | ICO number placeholder in legal docs | Pending registration |
| 2 | MX record for inbound email | Parked post-launch |
| 3 | `login.html` newsletter signup checkbox | Not built |
| 4 | `moFinancials` PDF export — jsPDF needed | Post-launch backlog |
| 5 | Section 8 UX handoff to Form 3A | Post-launch backlog |
| 6 | Dual e-sign flow — partially built, not complete | Post-launch backlog |
| 7 | WhatsApp reminders | Post-launch backlog |
| 8 | Free public compliance checker | Marketing priority |
| 9 | Blog / content hub | Marketing priority |

---

### Session 30 — 3 June 2026 — Live Bug Fixes

**Date:** 3 June 2026
**Files modified:** `landlord.html`, `esign.html`

---

#### 1. Postcode finder removed

**Bug:** `postcodes.io` only returns area/district data — not individual addresses. After 5 failed fix attempts the feature was removed entirely.

**Fix:** "Find →" button and result div removed from both Add property and Edit property forms. `lookupPostcode()` function removed. Postcode field is now a plain manual text input on both forms.

**Post-launch backlog:** Replace with `getAddress.io` API (~£5–20/month) — returns full address list per postcode for dropdown selection.

---

#### 2. Post-property-save popup redesigned

**Bug:** After adding a property the popup said "Add tenant?" but clicking it went to the pre-tenancy checklist, not the tenant setup form.

**Fix:** Popup replaced with three clearly labelled stacked buttons:
- 👤 **Add tenant now** → `moTenant(pid)` — opens tenant setup modal directly
- ✅ **Complete compliance checks first** → `nav('prop-detail', pid)` — property detail with pre-tenancy checklist
- 🕐 **Do this later** → `nav('properties')` — back to properties list

---

#### 3. Tenancy setup flow — full rebuild

**New feature:** Multi-step guided tenancy setup replacing the single "next steps" popup.

**Popup chain (steps 1–2):**
- After lead tenant saved → Popup 1: "Add co-tenant" / "No co-tenants — continue"
- After co-tenant saved → loops: "Add another co-tenant" / "Done — continue setup"
- Step 2 popup → "Prepare Written Statement" (opens e-sign flow) / "Do this later"

**Sticky progress bar on prop-detail (steps 3–6):**
- Rendered by `_renderTenancySetupBar(pid)` — injected above stat cards in `pgPropDetail()`
- 4 steps: Written Statement · Tenant documents · Property compliance · Welcome Kit
- Welcome Kit locked until tenant docs + property docs both done
- Progress bar disappears when all steps complete
- Each step card is a `<button>` element for reliable click handling

**Auto-marking:**
- `written_statement_done` — marked on e-sign send in `_sendEsignRequest()`
- `tenant_docs_done` — auto-marked when `pgTenantDetail()` is visited
- `property_docs_done` — auto-marked when compliance tab is opened via `pdSetTab()`
- `welcome_kit_done` — marked in `sendWelcomeKit()` success path

**New helper functions:** `_moCoTenant()`, `_tenancySetupStep2()`, `_getTenancyProgress()`, `_markTenancyStep()`, `_renderTenancySetupBar()`

**Supabase migration required:**
```sql
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS tenancy_setup_progress JSONB DEFAULT '{
  "co_tenants_done": false,
  "written_statement_done": false,
  "tenant_docs_done": false,
  "property_docs_done": false,
  "welcome_kit_done": false
}'::jsonb;
```

---

#### 4. E-sign modal — written statement improvements

**Bugs fixed:**
- Modal too narrow (520px) and preview too small (260px) for reading legal documents
- Fields not all mandatory — missing landlord details

**Fixes:**
- Modal widened to 760px (`mo-wide` class applied in `moEsign()`)
- Preview area: `min-height:500px`, `max-height:65vh`, font 13.5px / 1.8 line-height, `contain:strict` removed
- Editor textarea height increased to match

**New mandatory fields added to e-sign form:**
- Landlord full name (auto-filled from `_profileName()`)
- Landlord address (auto-filled from `D.userProfile.landlord_address` after first entry; saved to Supabase)
- Rent due day (auto-filled from `t.rent_day`)
- All existing fields (start date, rent, deposit, scheme, bills, pets) now validated before Generate

**New optional field:** Property licence number (auto-filled from `p.licence_number`)

**AI prompt upgraded:**
- `max_tokens` increased to 5000
- 10 mandatory RRA 2025 clauses explicitly listed including Awaab's Law, Section 8 only notices, Section 13 rent review
- Signature blocks for all parties included
- Permitted occupiers = named tenants (no separate field)
- Notice period + repair responsibilities pre-filled as standard clauses

**Validation:** Toast error listing missing fields if any mandatory field empty before Generate fires.

**Landlord address persistence:**
```sql
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS landlord_address TEXT;
```

---

#### 5. Modal overlay layout fix — page compression

**Bug:** App content area was shrinking/compressing when modals opened on dashboard and prop-detail.

**Root cause:** `.mo` overlay used `align-items:center` + `.mo-box` had `max-height:90vh` — together they squashed the background layout.

**Fix:**
- `.mo` changed to `align-items:flex-start; overflow-y:auto` — overlay scrolls, background unaffected
- `.mo-box` `max-height` removed — modal grows with content
- `.content` given `flex-shrink:0; min-height:0` — prevents content area collapsing

---

#### 6. E-sign post-send navigation

**Bug:** After sending e-sign document, app redirected to dashboard instead of property detail.

**Fix:** `_sendEsignRequest()` now calls `nav('prop-detail', String(pid))` after send, returning landlord to the property with the progress bar updated.

---

#### 7. E-sign signing link domain fix

**Bug:** Tenant received email with signing link pointing to `sddhawan79-lang.github.io/esign.html` (GitHub Pages origin) instead of `nexlet.co.uk/esign.html`.

**Fix:** `window.location.origin` replaced with hardcoded `https://nexlet.co.uk` in signing link construction.

---

#### 8. esign.html — fully self-contained rebuild

**Bug:** `esign.html` referenced `js/lib/supabase-client.js` which did not exist in the repository root, causing `window.RSA?.sb` to be undefined and the entire signing flow to fail silently.

**Fix:** `esign.html` rebuilt as fully self-contained single file:
- Supabase init inlined directly (URL + anon key from `landlord.html`)
- All `esign-content.js` logic inlined into a `<script>` block
- External `js/lib/supabase-client.js` and `js/esign-content.js` no longer referenced
- Logo fixed: `Rent<span>Safe</span> AI` → `Nex<span>Let</span>`
- Document frame CSS improved for reading legal HTML (headings, paragraphs, lists styled)
- `js/esign-content.js` can remain in repo harmlessly

---

#### 9. Known issues updated

| # | Issue | Status |
|---|---|---|
| 1 | ICO number placeholder in legal docs | Pending registration |
| 2 | MX record for inbound email | Parked post-launch |
| 3 | `login.html` newsletter signup checkbox | Not built |
| 4 | `moFinancials` PDF export — jsPDF needed | Post-launch backlog |
| 5 | Section 8 UX handoff to Form 3A | Post-launch backlog |
| 6 | WhatsApp reminders | Post-launch backlog |
| 7 | Free public compliance checker | Marketing priority |
| 8 | Blog / content hub | Marketing priority |
| 9 | Postcode finder — replace with getAddress.io | Post-launch backlog |
| 10 | `stripe_price_id` NULL in webhook | Non-critical, plan_name/status correct |
| 11 | `newsletter_opted_in` column missing from user_profiles | Post-launch backlog |
| 12 | favicon.ico missing | Post-launch backlog |

### Session 31 — 3 June 2026 — Profile Subscribe → Stripe Payment Links

**Date:** 3 June 2026
**Files modified:** `profile.html`, `js/profile.js`, `stripe-checkout-index.ts`, `stripe-webhook-index.ts`

#### Change Summary

Profile page Subscribe buttons now link directly to Stripe Payment Links (buy.stripe.com) instead of calling the `stripe-checkout` edge function. This simplifies the checkout flow and doesn't require the edge function to be deployed.

| Plan | Payment Link |
|---|---|
| Starter | `https://buy.stripe.com/test_7sY8wQ023cGmg6d5oX9Ve01` |
| Landlord | `https://buy.stripe.com/test_bJe6oI7uv0XE7zHaJh9Ve02` |
| Portfolio | `https://buy.stripe.com/test_fZueVebKLeOu9HPg3B9Ve04` |

#### Changes

- **`profile.html`** — Subscribe buttons changed from `data-price` (price IDs) to `data-link` (Stripe Payment Link URLs)
- **`js/profile.js`** — Click handler reads `btn.dataset.link` and calls `window.open(link, '_blank')` — no edge function call
- **`stripe-checkout-index.ts`** — Removed `PRICE_IDS` mapping; accepts `price_id` directly in request body (still functional if deployed);
- **`stripe-webhook-index.ts`** — Added `PRICE_TO_PLAN` mapping for the three price IDs; maps `price_id` → `plan_name` in `checkout.session.completed` handler; removed `STRIPE_PRICE_*` secret dependency

#### Stripe Webhook Price-to-Plan Mapping

```typescript
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1TYw3tICNn8XxxhbIhMQ47XE': 'starter',
  'price_1TYwEuICNn8XxxhbXpY1bl1O': 'landlord',
  'price_1TYwIHICNn8Xxxhbw76LS7h5': 'portfolio',
};
```

#### Deploy Status

| Function | Source | Status |
|---|---|---|
| `stripe-webhook` | `supabase/functions/stripe-webhook/index.ts` | Updated — needs redeploy |
| `stripe-checkout` | `supabase/functions/stripe-checkout/index.ts` | Updated — no longer called from profile.html |

---

### Session 32 — 3 June 2026 — Live Bug Fixes & Post-Launch UX

**Date:** 3 June 2026
**Files modified:** `landlord.html`, `esign.html`

---

#### 1. `portal_enabled` column missing from `tenants` table

**Bug:** End Tenancy threw `Error: Could not find the 'portal_enabled' column of 'tenants' in the schema cache`. All End Tenancy options were non-functional.

**Fix:** SQL run in Supabase SQL Editor:
```sql
ALTER TABLE tenants ADD COLUMN portal_enabled boolean DEFAULT true;
```
Default `true` preserves portal access for all existing active tenants. Code sets it `false` on end/archive — no code change needed.

---

#### 2. Prepare to Re-let — ended tenants still showing in UI

**Bug:** After "Clear & prepare", ended tenants still appeared in the property stat card, tenant tab, and tenant count — making the property look occupied.

**Root cause:** `pgPropDetail()` and `pdTabContent()` fetched all tenants for the property including ended/archived ones. `confirmRelet()` cleared docs but never flagged tenants as hidden.

**Fix (landlord.html — 4 changes):**
- `confirmRelet()` now sets `archived:true, relet_prepared:true` on all ended tenants + updates local D cache
- `pgPropDetail()` `t = D.tenants.find(...)` → added `&& !x.relet_prepared`
- `pdTabContent()` `ts = D.tenants.filter(...)` → added `&& !x.relet_prepared`
- Tenant tab count badge → added `&&!x.relet_prepared`

**Data retention:** Records NOT deleted — retained for 6-year legal obligation. `relet_prepared:true` hides from active UI only.

**Post re-let flow:** After "Clear & prepare" completes, `startTenancy(pid)` auto-triggers (400ms delay) — same guided wizard as a new property.

**SQL migration required:**
```sql
ALTER TABLE tenants ADD COLUMN relet_prepared boolean DEFAULT false;
```

---

#### 3. Portal invite firing automatically with e-sign

**Bug:** Portal invite checkbox in Add Tenant was `checked` by default — invites sent without landlord explicitly choosing to send them.

**Fix:** Removed `checked` attribute from `#ts-send-invite`. Changed JS fallback default from `true` → `false`:
```js
s.sendInvite = document.getElementById('ts-send-invite')?.checked ?? false;
```
Portal invite is now opt-in only.

---

#### 4. E-sign modal background compression (ongoing)

**Bug:** Background app content shrank when e-sign modal opened with a generated written statement.

**Fix (landlord.html — 2 changes):**
- `.mo-box` desktop: `max-height:none; overflow-y:visible` → `max-height:90vh; overflow-y:auto`
- `.mo-box` mobile: added `overflow-y:auto` (was missing despite `max-height:92vh`)
- `esign-doc-preview`: `min-height:500px; max-height:65vh` → `height:45vh; max-height:45vh` — fixed height prevents modal expanding beyond viewport

---

#### 5. Written statement — ` ```html ` appearing in preview

**Bug:** AI response wrapped HTML in markdown code fences (` ```html ` / ` ``` `) which rendered visibly in the document preview and signed PDFs.

**Fix (landlord.html):**
```js
_esignDocHtml = (data.content?.[0]?.text || '')
  .replace(/^```html\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/```\s*$/i, '')
  .trim();
```

---

#### 6. Signed documents panel — duplicate rows

**Bug:** "Signed Documents" panel showed duplicate rows when esign was sent/attempted more than once.

**Fix (landlord.html):** Deduplication by `tenant_id + document_type`, keeping most recent signed record only:
```js
const _dedupMap = new Map();
_allSigned.sort((a,b) => new Date(b.signed_at) - new Date(a.signed_at))
  .forEach(r => {
    const key = String(r.tenant_id) + '|' + r.document_type;
    if (!_dedupMap.has(key)) _dedupMap.set(key, r);
  });
const signed = Array.from(_dedupMap.values());
```

---

#### 7. Progress bar — written statement step not ticking after signing

**Bug:** Tenancy setup bar "Written Statement" step didn't tick even when tenant had signed.

**Root causes:**
1. `_getTenancyProgress()` read only the stored JSONB — never checked actual `D.esignReq`
2. `_markTenancyStep` fired on *send* not *sign*

**Fix (landlord.html — 2 changes):**

**`_getTenancyProgress()` — live cross-check:**
```js
if (!prog.written_statement_done) {
  const propTenantIds = D.tenants.filter(t => String(t.prop_id) === String(pid)).map(t => String(t.id));
  const hasSigned = (D.esignReq || []).some(r =>
    propTenantIds.includes(String(r.tenant_id)) &&
    r.document_type === 'written_statement' &&
    r.status === 'signed'
  );
  if (hasSigned) prog.written_statement_done = true;
}
```

**`pgPropDetail()` — auto-persist on load:**
On every property detail load, if signed esign detected but not persisted, `_markTenancyStep(pid, 'written_statement_done', false)` fires to write to Supabase.

---

#### 8. Page refresh always returning to dashboard

**Bug:** Refreshing browser always navigated to dashboard, losing current page context.

**Root cause:** `initApp()` always called `nav('dashboard')` regardless of `window.location.hash`. Hash routing was already writing `#page/param` to URL via `nav()` — just never read on load.

**Fix (landlord.html — `initApp()`):**
```js
const _hash = window.location.hash.replace('#', '');
const _parts = _hash.split('/');
const _hashPage = _parts[0];
const _hashParam = _parts.slice(1).join('/') || null;
const _validPages = Object.keys(PAGES || {}).concat([...known pages...]);
if (_hashPage && _validPages.includes(_hashPage)) {
  nav(_hashPage, _hashParam);
} else {
  nav('dashboard');
}
```

---

#### 9. esign.html — post-sign success screen rebuilt (Option C timeline)

**Old:** Simple ✅ card with one-line message and download button.

**New — step completion timeline:**
- Navy gradient header: large checkmark, tenant name + signing date injected dynamically
- 4 timeline steps with green connectors: Document reviewed → Electronic consent given → Signed electronically → Copy emailed
- Tenant email injected into "Copy emailed" step: "A signed copy has been sent to [email] and your landlord"
- Primary action: ⬇ Download your signed copy
- Secondary action: ✓ All done — close this tab (`window.close()`)
- Legal footer: "This document was signed electronically and is legally binding under the Electronic Communications Act 2000."

---

#### Known issues updated

| # | Issue | Status |
|---|---|---|
| 1 | ICO number placeholder in legal docs | Pending registration |
| 2 | MX record for inbound email | Parked post-launch |
| 3 | `login.html` newsletter signup checkbox | Not built |
| 4 | `moFinancials` PDF export — jsPDF needed | Post-launch backlog |
| 5 | Section 8 UX handoff to Form 3A | Post-launch backlog |
| 6 | WhatsApp reminders | Post-launch backlog |
| 7 | Free public compliance checker | Marketing priority |
| 8 | Blog / content hub | Marketing priority |
| 9 | Postcode finder — replace with getAddress.io | Post-launch backlog |
| 10 | `stripe_price_id` NULL — sandbox only, live table clean | Closed |
| 11 | `newsletter_opted_in` column missing from user_profiles | Pending SQL |
| 12 | favicon.ico missing | Post-launch backlog |
| 13 | `relet_prepared` column needed on tenants | Run SQL above |
| 14 | `portal_enabled` column needed on tenants | ✅ SQL run this session |

---

#### SQL migrations required (Session 32)

```sql
-- 1. portal_enabled (already run this session)
ALTER TABLE tenants ADD COLUMN portal_enabled boolean DEFAULT true;

-- 2. relet_prepared (run before deploying landlord.html)
ALTER TABLE tenants ADD COLUMN relet_prepared boolean DEFAULT false;
```


---

## Session 33 — Bug Fixes & RTR Wizard (4 June 2026)

### Features & Changes

---

#### 1. AI response corruption guard — Written Statement (both HTML-rendering AI calls)

**Bug:** AI occasionally returned PDF binary or malformed content into the Written Statement preview, causing raw CSS/HTML tags to render visibly.

**Root cause:** `_esignDocHtml` was set directly from raw AI response with no validation. Two functions affected:
- `esignGenerateDoc` (document generation)
- `_esignApplyStructuredEdit` (edit terms)

**Fix (landlord.html — both functions):**
```js
// Reject if suspiciously large (binary/PDF bleed)
if (_rawHtml.length > 200000 || (!_rawHtml.includes('<') && !_rawHtml.includes('>'))) {
  throw new Error('Generated document appears corrupt — please try again');
}
// Extract body content if full HTML doc returned
const _bodyMatch = _rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (_bodyMatch) _rawHtml = _bodyMatch[1];
// Strip embedded style/script tags
_rawHtml = _rawHtml.replace(/<script[\s\S]*?<\/script>/gi, '')
                   .replace(/<style[\s\S]*?<\/style>/gi, '').trim();
if (!_rawHtml || _rawHtml.length < 100) throw new Error('Generated document was empty — please try again');
```

**Scope:** Only two places in the entire app render AI output as raw HTML — both now protected. All other AI calls return JSON and were never at risk.

---

#### 2. Download draft — simplified

`_esignDownloadDraft()` simplified — no longer needs its own body extraction since `_esignDocHtml` is now always pre-cleaned body-only HTML before storage. Draft wraps clean content in styled document shell with amber DRAFT banner.

---

#### 3. Right to Rent — full 3-step wizard (replaces basic share code modal)

**Old:** Single-screen modal — share code entry, expiry date, save. No result recording, no evidence upload, no follow-up calendar entry.

**New — `moShareCodeWizard()` fully rebuilt as 3-step guided wizard:**

**Step 1 — Enter details**
- Share code input (auto-uppercase, format validation, character count hint)
- Tenant date of birth (required — needed for GOV.UK check)
- Check date (defaults to today)
- Previous check banner shown if record exists

**Step 2 — Check on UKVI**
- Displays share code + DOB in a reference panel
- "Open GOV.UK Right to Rent check ↗" button (opens `gov.uk/view-right-to-rent` in new tab)
- Landlord confirms result back in NEXLET: **Valid / Time-limited / Invalid** (styled radio buttons)
- Expiry date field — required for Time-limited, optional for Valid, hidden for Invalid
- Invalid result shows red warning: must not allow tenancy to proceed, take legal advice
- Note: UKVI has no public API — check is manually confirmed by landlord (by design)

**Step 3 — Save record**
- Full summary review (tenant, share code, DOB, check date, result, expiry, follow-up date)
- Screenshot upload slot (JPG/PNG/PDF) — stored to Supabase Storage at `rtr-evidence/{tid}-{timestamp}.ext`
- Time-limited: amber notice that a calendar reminder will be added automatically
- On save:
  - All fields written to `tenants` row
  - If Time-limited: calendar event inserted (`category: 'compliance'`) for follow-up date
  - Audit log entry: `RTR_CHECK`
  - Toast confirms save + evidence upload + reminder

**Step bar:** Visual 3-step progress indicator at top of modal (navy = current, green tick = complete, grey = pending)

**New functions added:**
- `moShareCodeWizard(tid)` — entry point, initialises `window._rtrWiz` state
- `_rtrWizRender(tArg)` — renders current step into modal
- `_rtrCodeHint()` — live share code format validation
- `_rtrWizSetScreenshot(input)` — handles file selection, reads as base64
- `_rtrWizNext()` — validates and advances step
- `_rtrWizBack()` — steps back
- `_rtrWizSave()` — uploads screenshot to storage, saves tenant record, creates calendar reminder, logs audit

**Old functions removed:**
- `rtrValidateCode()` — replaced by `_rtrCodeHint()`
- `rtrCalcFollowUp()` — logic now inline in `_rtrWizRender` step 3
- `saveShareCode(tid)` — replaced by `_rtrWizSave()`

---

#### 4. Known issues updated

| # | Issue | Status |
|---|---|---|
| 1 | ICO number placeholder in legal docs | Pending registration |
| 2 | MX record for inbound email | Parked post-launch |
| 3 | `login.html` newsletter signup checkbox | Not built |
| 4 | `moFinancials` PDF export — jsPDF needed | Post-launch backlog |
| 5 | Section 8 UX handoff to Form 3A | Post-launch backlog |
| 6 | WhatsApp reminders | Post-launch backlog |
| 7 | Free public compliance checker | Marketing priority |
| 8 | Blog / content hub | Marketing priority |
| 9 | Postcode finder — replace with getAddress.io | Post-launch backlog |
| 10 | `stripe_price_id` NULL — sandbox only, live table clean | Closed |
| 11 | `newsletter_opted_in` column missing from user_profiles | Pending SQL |
| 12 | favicon.ico missing | Post-launch backlog |
| 13 | `relet_prepared` column needed on tenants | Pending SQL |
| 14 | `portal_enabled` column needed on tenants | ✅ SQL run Session 32 |
| 15 | RTR new columns needed on tenants | Run SQL below |

---

#### 5. SQL migrations required (Session 33)

```sql
-- RTR wizard new columns (run each separately in Supabase SQL editor)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rtr_result text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rtr_followup_date date;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rtr_evidence_path text;
```

> Existing columns already present: `share_code`, `rtr_expiry`, `rtr_check_date`, `date_of_birth`

---

#### 6. Supabase Storage

RTR evidence screenshots are stored in the existing `tenant-documents` bucket under path prefix `rtr-evidence/`. No new bucket required.


---

## Session 34 — Dashboard Bugs, Tenant Detail UX Overhaul & Compliance Wiring (4 June 2026)

### Features & Changes

---

#### 1. Portfolio Health Score — two bug fixes (landlord.html)

**Bug 1 — Every click routed to Compliance:**
Outer `<div>` had blanket `onclick="nav('compliance')"`. All clicks — bars, "View full report →" — fired same handler.

**Fix:** Removed blanket onclick. Each element routes independently:
- Score ring → `nav('compliance')`
- Certificates bar → `nav('compliance')`
- Rent bar → `nav('finance')`
- Maintenance bar → `nav('maintenance')`
- KYC bar → `nav('tenants')`
- "View full report →" → `nav('compliance')`

**Bug 2 — Maintenance bar green before login:**
`maintScore` scored 20 (green) when `D.maintenance` empty — same as zero open jobs.

**Fix:**
```js
const _maintHasData = D.properties.length > 0;
const maintScore = !_maintHasData ? 0 : _awaabO>0 ? 0 : _urgO>0 ? 8 : open>3 ? 12 : open>0 ? 16 : 20;
```
Bar renders grey (`var(--border)`) when no property data exists.

---

#### 2. RTR Share Code Wizard — surfaced in Compliance Checklist (landlord.html)

Wizard existed only in KYC doc section. Now also appears inside the expanded RTR checklist row (`_checklistRowHtml`). Button calls `moShareCodeWizard(tid)` with "Check on UKVI & save result" hint.

---

#### 3. Day 1 / Day 30 Pack restructure (landlord.html)

**Problem:** `moWelcomeKit` was duplicated as both a standalone button and an item inside Day 1 Pack.

**Day 1 Pack changes:**
- Removed "Welcome Kit sent" checklist row — absorbed into Dispatch button
- Added "📖 How to Rent guide served" item
- Inventory moved to Day 30 (legally correct)
- "📦 Dispatch Day 1 Pack" button → calls `moWelcomeKit` → marks `welcome_kit_done`
- Once dispatched: button → "✓ Day 1 Pack dispatched"

**Day 30 Pack — legally expanded:**
- Added: Inventory / schedule of condition signed
- Added: Legionella risk assessment completed
- Added: Pet agreement signed (conditional on `t.pet_allowed || t.has_pet`)
- "📨 Dispatch Day 30 Pack" button → routes to Communications Hub
- Dispatched detection: `day30_pack` template_id in email log

**`moWelcomeKit` and `welcome_kit_done` unchanged** — all other call sites unaffected.

---

#### 4. Tenant Detail Page — full UX restructure (landlord.html)

**Problem:** Three separate sections owned the same data — sticky KYC bar, Compliance Checklist panel, KYC Documents section. Documents listed twice. Page order wrong.

**CHECKLIST_ITEMS reduced:**
Removed `rtr` and `id_docs` keys. Now contains only: `agreement`, `deposit_protection`, `rent_guarantee`, `insurance`.

**New unified panel — `unifiedDocsCard` (`#unified-docs-section`):**
Replaces both `checklistCard` and `kyc-docs-section`. Single panel, two visual groups:
- *KYC Identity Documents* — Passport, RTR (+ wizard inline), Address 1, Address 2, Reference, Guarantor, Other — Upload + AI auto-scan each
- *Tenancy Compliance* (divider) — Written Statement, Deposit Protected, Rent Guarantee, Buildings/Contents Insurance — RAG + expand

**New page order (top to bottom):**
1. Tenancy Details — always first
2. KYC sticky bar — scrolls to `#unified-docs-section`
3. Ground 8 alert (if triggered)
4. Documents & Compliance unified panel
5. Tenant Portal
6. Day 1 / Day 30 Packs
7. Communications

**Removed:** `checklistCard`, `kyc-docs-section`, `checklistHtml`, `kycRows` (dead code, not rendered).

---

#### 5. Guarantor & Other Document — contextual notes (landlord.html)

Added `note` field to KYC_SLOTS optional slots. Renders as small italic hint when slot empty:
- **Guarantor Check** — *(Upload signed guarantor agreement — generate one via Documents library)*
- **Other Document** — *(Any additional supporting document — use AI assistant to draft if needed)*

Note disappears once document uploaded.

---

#### 6. Written Statement label + e-sign auto-detection (landlord.html)

**Label change:** "Tenancy agreement" → "Written Statement" throughout `CHECKLIST_ITEMS` and `CHECKLIST_UPLOAD_SLOTS`. Correct post-RRA 2025 terminology.

**E-sign auto-detection added to `_checklistRAG` for `agreement` key:**
```js
const req = (D.esignReq||[]).find(r => String(r.tenant_id)===String(tenant?.id) && r.document_type==='written_statement');
if (req?.status === 'signed')  → green  "Signed"
if (req?.status === 'sent')    → amber  "Awaiting signature"
// fallback: email log esign send → amber
```
No manual RAG change needed — status reflects real e-sign state automatically.

---

#### 7. Co-tenant shared compliance items (landlord.html)

**Problem:** Property-level compliance items (deposit, insurance) were blank for co-tenants because they read from `tenant.scheme` which is only set on the lead tenant row.

**Fix — `_checklistRAG` deposit_protection key:**
```js
const _lead = D.tenants.find(t => String(t.prop_id)===String(_propId) && t.is_lead && t.status==='Active') || tenant;
// resolves scheme/deposit from lead tenant — co-tenants now inherit correct status
```

**Insurance/rent_guarantee:** Already used `prop_id` — co-tenants already worked correctly, confirmed.

**Agreement (e-sign):** Each co-tenant has their own `esign_requests` record with their own `tenant_id` — tracked individually, correctly.

**New shared variable `_propId`** set at top of `_checklistRAG`:
```js
const _propId = tenant?.prop_id;
```
Used by `agreement`, `deposit_protection` blocks.

---

#### 8. Known Issues — updated

| # | Issue | Status |
|---|---|---|
| 1 | ICO number placeholder in legal docs | Pending registration |
| 2 | MX record for inbound email | Parked post-launch |
| 3 | `login.html` newsletter signup checkbox | Not built |
| 4 | `moFinancials` PDF export — jsPDF needed | Post-launch backlog |
| 5 | Section 8 UX handoff to Form 3A | Post-launch backlog |
| 6 | WhatsApp reminders | Post-launch backlog |
| 7 | Free public compliance checker | Marketing priority |
| 8 | Blog / content hub | Marketing priority |
| 9 | Postcode finder — replace with getAddress.io | Post-launch backlog |
| 10 | `stripe_price_id` NULL — sandbox only | Closed |
| 11 | `newsletter_opted_in` column missing from user_profiles | Pending SQL |
| 12 | favicon.ico missing | Post-launch backlog |
| 13 | `relet_prepared` column needed on tenants | Pending SQL |
| 14 | `portal_enabled` column needed on tenants | ✅ SQL run Session 32 |
| 15 | RTR new columns needed on tenants | ✅ SQL run Session 33 |
| 16 | `day30_pack` email template not yet built | Dispatch routes to comms hub — dedicated template pending |
| 17 | `kycRows` dead code still in `pgTenantDetail` | Harmless — remove next session |

---

#### 9. No new SQL migrations required this session

All schema changes were in Session 33. Session 34 changes are UI/logic only.


---

#### 10. Compliance rows — Upload + AI scanner added (landlord.html)

**Problem:** Deposit protected, Rent Guarantee Insurance, Buildings/Contents Insurance had no upload or AI scan option — violating the standing rule that every doc section must have both.

**Fix:** Added three entries to `CHECKLIST_UPLOAD_SLOTS`:
```js
deposit_protection: { slot: 'deposit_cert',       label: 'Upload deposit certificate' },
rent_guarantee:     { slot: 'rent_guarantee_doc',  label: 'Upload RGI policy' },
insurance:          { slot: 'insurance_doc',       label: 'Upload insurance certificate' },
```

All three fall through to the `other` AI scan prompt (extracts doc type, reference number, expiry, issuing authority). No bespoke prompt needed.

`deposit_cert` slot already existed in the system (line 846, AI scan field map line 1078) — consistent. `rent_guarantee_doc` and `insurance_doc` are new slot names, no conflicts.


---

## Session 35 — Bug Fixes & Tenant Document Pipeline Overhaul (June 2026)

### Summary
Extensive bug-fix session focused on the tenant detail page document upload/scan/display pipeline, RTR wizard, compliance RAG logic, and UI correctness. No new features — all changes are fixes and UX improvements.

---

#### 1. `renderDocCard` Temporal Dead Zone Crash (landlord.html)

**Problem:** `ReferenceError: Cannot access 'renderDocCard' before initialization` on tenant detail page load. `const renderDocCard` was defined at line ~8803 but called at line ~8745.

**Fix:** Moved `renderDocCard` definition above its first call site (`_kycUploadRows` map). Also removed `kycRows` dead code block (83 lines, never referenced).

---

#### 2. Onboarding Wizard Continue → Non-Responsive (landlord.html)

**Problem:** "Tenant documents" step in the onboarding wizard had `action: () => {...}` (arrow function). The button renderer only handles `typeof action === 'string'` — rendered with no `onclick`, appeared clickable but did nothing.

**Fix:** Converted to IIFE string: `action: "(function(){ ... })()"`. Both sticky bar and dashboard card use same `actionAttr` logic — both fixed.

---

#### 3. RTR Wizard — `date_of_birth` Schema Error (landlord.html)

**Problem:** `Save failed — Could not find the 'date_of_birth' column of 'tenants' in the schema cache`. Column doesn't exist on `tenants` table.

**Fix:** Removed `date_of_birth` from `_rtrWizSave` update payload. DOB still collected in wizard for GOV.UK check but not persisted.

---

#### 4. RTR Wizard — View Screenshot Non-Responsive (landlord.html)

**Root cause 1:** `dvoOpen` called with raw base64 string — `_dvoType` checks URL extension, base64 has none → fell through to `'other'` → "Preview not available".

**Root cause 2:** Inline IIFE `onclick` had nested template literal quote collapse — button silently did nothing.

**Fix:**
- Added `_rtrWizViewScreenshot()` global helper — converts base64 to Blob with correct MIME type, creates Object URL, calls `dvoOpen`
- Extended `_dvoType` to handle `blob:` URLs via `window._rtrWiz._previewMime`
- `_rtrWizSetScreenshot` now calls `_rtrWizRender()` on file load so View button appears immediately

---

#### 5. RTR Columns SQL Migration (Supabase)

**Migration run:**
```sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS share_code text,
  ADD COLUMN IF NOT EXISTS rtr_result text,
  ADD COLUMN IF NOT EXISTS rtr_expiry date,
  ADD COLUMN IF NOT EXISTS rtr_check_date date,
  ADD COLUMN IF NOT EXISTS rtr_followup_date date,
  ADD COLUMN IF NOT EXISTS rtr_evidence_path text;
```

Removed the per-column fallback retry loop from `_rtrWizSave` — no longer needed.

---

#### 6. `name_mismatch_reason` Column + Override UX (landlord.html + Supabase)

**Migration run:**
```sql
ALTER TABLE tenant_documents ADD COLUMN IF NOT EXISTS name_mismatch_reason text;
```

**New UX — mismatch override flow:**
When AI scan detects name mismatch, instead of just flagging red, landlord sees:
- Reason dropdown: `Joint certificate / Name abbreviated or informal / Typo on document / Other`
- `✓ Verify anyway` button — requires reason selected
- On confirm: saves `verified=true` + `name_mismatch_reason` to DB, logs full override to audit trail
- Card border flips green, shows `✓ Verified · [reason]`

**New function:** `verifyTenantDocOverride(docId, tid)`

**Card border logic:** Red = mismatch AND unverified. Green = verified (even if mismatch existed).

---

#### 7. `_checklistRAG` — Manual Green Never Overridden (landlord.html)

**Problem:** User manually sets compliance item to Complete/green via status dropdown → saves to `compliance_checklist[key].ra = 'green'` → but `_checklistRAG` runs auto-detect which returns early and ignores the manual value. Item stays red.

**Fix:** Added early return at top of `_checklistRAG`:
```js
if (item.ra === 'green') return item; // manual green always respected
```
Auto-detect now only runs when status is red/amber — can only improve, never downgrade a manual green.

---

#### 8. Insurance & RGI Removed from Tenant CHECKLIST_ITEMS (landlord.html)

**Decision:** Buildings/Contents Insurance and Rent Guarantee Insurance are property-level records, not tenant-facing compliance items. Already fully tracked on property compliance tab.

**Changes:**
- Removed `insurance` from `CHECKLIST_ITEMS`, `CHECKLIST_UPLOAD_SLOTS`, `_checklistRAG`
- Removed `rent_guarantee` from `CHECKLIST_ITEMS` and `CHECKLIST_UPLOAD_SLOTS`

**`CHECKLIST_ITEMS` now contains only:** `agreement`, `deposit_protection`

RGI and buildings insurance remain tracked on property compliance tab unchanged.

---

#### 9. RTR KYC Slot — Two-Step UX (landlord.html)

**Problem:** RTR slot showed "Not uploaded" even after wizard was complete. Wizard saves to `tenants.rtr_check_date` but KYC slot only checked `tenant_documents` for `slot='right_to_rent'`.

**Fix — `slotDone` logic:**
```js
const rtrWizardDone = isRTR && !!(t.rtr_check_date);
const slotDone = hasDocs || rtrWizardDone;
```
All four display checks (border, background, margin, "Not uploaded" text) now use `slotDone`.

**Sticky bar count fix:**
```js
const _rtrComplete = !!(t.rtr_check_date);
uploadedCount = ...slot === 'right_to_rent' ? (_rtrComplete || hasDocs) : hasDocs
```

**New two-step RTR card UI:**
| State | Display |
|---|---|
| Nothing | 🔴 "Right to Rent check required" + navy wizard button |
| Doc uploaded, wizard not run | 🟠 "Step 2 of 2 — Run the UKVI check" + explanation |
| Wizard complete | 🟢 "Right to Rent check complete" + result/date + Re-check button |

**`_rtrWizSave` cache update:** After save, sets `compliance_checklist.rtr = green` in local cache before `nav()` re-renders.

---

#### 10. Deposit Protection — AI Auto-Fill (landlord.html)

**Problem:** AI scan of deposit cert extracted `issuing_authority` and `doc_number` into `tenant_documents` but `_checklistRAG` reads `scheme`/`scheme_ref` from `tenants` table — two never connected.

**Fix:** After successful scan of `deposit_cert` slot, `scanTenantDoc` auto-writes extracted data back to tenant:
```js
if (slot === 'deposit_cert' && issuing_authority && extracted_doc_num) {
  await sb.from('tenants').update({ scheme: _schemeName, scheme_ref: extracted_doc_num }).eq('id', tid);
  // Also sets compliance_checklist.deposit_protection = green
}
```
Scheme name normalised via map: `'deposit protection service' → 'DPS'`, `'tenancy deposit scheme' → 'TDS'`, `'mydeposits' → 'MyDeposits'`.

**New slot-specific scan prompts added:**
- `deposit_cert` / `deposit_protection` — extracts scheme name, reference, expiry, address
- `rent_guarantee_doc` — extracts insurer, policy number, expiry

---

#### 11. `uploadTenantDoc` — Replace Duplicate Key Fix (landlord.html)

**Problem:** `uploadTenantDoc` always did a blind `INSERT` — when replacing existing doc for a slot, hit unique constraint → `duplicate key value violates unique constraint`.

**Fix:** Before inserting, check for existing doc in same slot:
```js
const existingDoc = D.tenantDocs.find(d => d.slot === slot && String(d.tenant_id) === String(tid));
if (existingDoc) {
  await sb.storage.from('tenant-documents').remove([existingDoc.file_name]);
  await sb.from('tenant_documents').delete().eq('id', existingDoc.id);
}
// then INSERT fresh
```

---

#### 12. `scanTenantDoc` — No More `nav()` (landlord.html)

**Root cause of cascading bugs:** `scanTenantDoc` called `nav('tenant-detail', tid)` on completion → full page re-render → `pgTenantDetail` ran again → auto-rescan `setTimeout` fired again → potential infinite cycle.

**Fix — targeted DOM update:**
- Each doc card now has `id="doc-card-{docId}"`
- On scan complete: `document.getElementById('doc-card-' + docId).outerHTML = renderTenantDocCard(...)`
- No full page re-render
- `catch` block also updates DOM and shows actual error message (not silent fail)

---

#### 13. `renderTenantDocCard` — Extracted as Global Function (landlord.html)

Was a local `const` inside `pgTenantDetail` — inaccessible to `scanTenantDoc` for DOM updates.

**Now:** `function renderTenantDocCard(doc, isLast, tid, tenantName)` defined globally before `pgTenantDetail`. Local `renderDocCard` is a thin wrapper: `(doc, isLast) => renderTenantDocCard(doc, isLast, tid, t.name)`.

---

#### 14. `_scanningDocs` Session Set — Correct "Scanning…" Display (landlord.html)

**Problem:** Any doc without `extracted_name` showed "Scanning… refresh in a moment" forever, including on every page reload after a failed scan.

**Fix:** `window._scanningDocs = new Set()` — in-memory, cleared on page reload.
- Doc ID added to Set when `uploadTenantDoc` triggers scan
- Removed from Set on scan success or failure
- "Scanning…" only shows if doc ID is in Set
- On reload: Set empty → unscanned docs show "Not scanned — Re-scan" immediately

**Auto-rescan:** On `pgTenantDetail` load, unscanned docs (no `extracted_name`, not in Set) are fire-and-forget rescanned via storage fetch. DOM update only — no `nav()`.

---

#### 15. `_viewLatestSlotDoc` and `_viewDoc` Global Helpers (landlord.html)

Added to avoid nested template literal quote issues in inline `onclick` handlers:

```js
function _viewLatestSlotDoc(slot, tid) {
  // finds latest doc for slot from D.tenantDocs, calls viewDocInline
}
function _viewDoc(url, label) {
  viewDocInline(url, label);
}
```

View buttons added/fixed across: KYC slot header, compliance checklist rows, `moTenantDocs` modal, individual doc cards (`renderTenantDocCard`), RTR wizard screenshot.

---

#### 16. Scan API Error Handling (landlord.html)

**Problem:** If AI API returned error response, `data.content?.[0]?.text` was undefined → fell back to `'{}'` → parsed as empty object → wrote all nulls to DB → "Not scanned" shown but no error toast.

**Fix:**
```js
if (data.error || !data.content?.[0]?.text) throw new Error('Scan API error: ' + errMsg);
if (!raw || raw === '{}') throw new Error('Empty response from scan API');
```
Now throws properly → catch block fires → shows actual error message in toast.

---

#### 17. Known Issues — Updated

| # | Issue | Status |
|---|---|---|
| 1 | ICO number placeholder in legal docs | Pending registration |
| 2 | MX record for inbound email | Parked post-launch |
| 3 | `login.html` newsletter signup checkbox | Not built |
| 4 | `moFinancials` PDF export — jsPDF needed | Post-launch backlog |
| 5 | Section 8 UX handoff to Form 3A | Post-launch backlog |
| 6 | WhatsApp reminders | Post-launch backlog |
| 7 | Free public compliance checker | Marketing priority |
| 8 | Blog / content hub | Marketing priority |
| 9 | Postcode finder — replace with getAddress.io | Post-launch backlog |
| 10 | `stripe_price_id` NULL — sandbox only | Closed |
| 11 | `newsletter_opted_in` column missing from user_profiles | Pending SQL |
| 12 | favicon.ico missing | Post-launch backlog |
| 13 | `relet_prepared` column needed on tenants | Pending SQL |
| 14 | `portal_enabled` column — ✅ run Session 32 | Closed |
| 15 | RTR columns on tenants — ✅ run Session 35 | Closed |
| 16 | `day30_pack` email template not yet built | Post-launch backlog |
| 17 | `kycRows` dead code — ✅ removed Session 35 | Closed |
| 18 | Block 4 `new Function()` syntax check fails | Likely false positive — all individual functions test clean. Confirm in browser. |

---

## Session 36 — 5 June 2026 — Syntax Errors, Bug Fixes & KYC Layout Fix

**Date:** 5 June 2026
**Files modified:** `landlord.html`

### Bug Fixes

#### 1. Syntax error — over-escaped `replace()` in KYC slot View button onclick (line 9396)
**Problem:** `SyntaxError: Invalid or unexpected token` — the View button `onclick` passed doc label via `replace(/'/g, \\"\\\\\\\\'\\"`)` inside a single-quoted JS arg. The `\\"` broke out of the `onclick="..."` HTML attribute, causing the browser to see a premature attribute close.
**Fix:** Removed label arg entirely — passes `''` as second arg to `viewDocInline`. Function already handles empty label gracefully. No quote escaping needed.

#### 2. Missing `}` closing ternary in KYC slot renderer (line 9395)
**Problem:** `SyntaxError: Missing } in template expression` — the ternary `${slotDocs.length ? ... : ...}` was missing its closing `}` after the false branch.
**Fix:** Added `}` after the AI auto-scan div closing backtick.

#### 3. `SB is not defined` in `_markTenancyStep` (line 3697)
**Problem:** `ReferenceError: SB is not defined` — Supabase client is `sb` (lowercase) throughout the file. `_markTenancyStep` was using `SB` (uppercase).
**Fix:** `SB.from(...)` → `sb.from(...)`.

#### 4. `start_date` ISO timestamp failing `<input type="date">` validation (line 13139)
**Problem:** `"2026-06-03T23:50:46.054501+00:00" does not conform to required format "yyyy-MM-dd"` — Supabase returns `start_date` as a full ISO timestamp but the e-sign modal date input requires `yyyy-MM-dd` only.
**Fix:** `value="${t.start_date||''}"` → `value="${t.start_date ? t.start_date.slice(0,10) : ''}"`.

#### 5. Duplicate `calToday` function declaration (lines 11424/11430)
**Problem:** `SyntaxError: Identifier 'calToday' has already been declared` — exact duplicate function body back-to-back. Killed entire JS block before any code ran, causing full page layout failure (no styles, no nav, nothing).
**Fix:** Removed the duplicate definition. Single `calToday` at line 11424 retained.

#### 6. Duplicate View button in KYC slot header
**Problem:** Each slot had a `👁 View` button in the slot header row (left side) AND a View button inside each doc card (right side) — two View buttons per uploaded document.
**Fix:** Removed the slot-header View button. View remains only inside individual doc cards via `renderTenantDocCard`.

#### 7. Missing `</div>` for `flex-shrink:0` wrapper in `_kycUploadRows` (line ~8831)
**Problem:** The `<div style="flex-shrink:0">` wrapping the Upload button and AI auto-scan badge was never closed. Doc cards rendered inside the flex wrapper instead of below it — causing the entire KYC slot layout to collapse (icon, label, badge, and button all stacking vertically in a narrow column).
**Fix:** Added the missing `</div>` closing the `flex-shrink:0` div, before the `${hasDocs ? slotDocs.map...}` doc cards.

### DB Migrations Run This Session
None.

### Known Issues — Updated

| # | Issue | Status |
|---|---|---|
| 1 | ICO number placeholder in legal docs | Pending registration |
| 2 | MX record for inbound email | Parked post-launch |
| 3 | `login.html` newsletter signup checkbox | Not built |
| 4 | `moFinancials` PDF export — jsPDF needed | Post-launch backlog |
| 5 | Section 8 UX handoff to Form 3A | Post-launch backlog |
| 6 | WhatsApp reminders | Post-launch backlog |
| 7 | Free public compliance checker | Marketing priority |
| 8 | Blog / content hub | Marketing priority |
| 9 | Postcode finder — replace with getAddress.io | Post-launch backlog |
| 10 | `stripe_price_id` NULL — sandbox only | Closed |
| 11 | `newsletter_opted_in` column missing from user_profiles | Pending SQL |
| 12 | favicon.ico missing | Post-launch backlog |
| 13 | `relet_prepared` column needed on tenants | Pending SQL |
| 14 | `portal_enabled` column — ✅ run Session 32 | Closed |
| 15 | RTR columns on tenants — ✅ run Session 35 | Closed |
| 16 | `day30_pack` email template not yet built | Post-launch backlog |
| 17 | `kycRows` dead code — ✅ removed Session 35 | Closed |
| 18 | Block 4 `new Function()` false positive | Closed — confirmed browser-only issue |
| 19 | `start_date` ISO timestamp on date input | ✅ Fixed Session 36 |
| 20 | Duplicate `calToday` declaration | ✅ Fixed Session 36 |

---

## Session 37 — 5 June 2026 — Day 1/30 Kit Overhaul, PDF Attachments, Bulk Scan Fix

**Date:** 5 June 2026
**Files modified:** `landlord.html`, `ai-proxy.ts` (edge function)

---

### Overview
Major overhaul of the Day 1 and Day 30 compliance pack system. Root causes identified and fixed: docs not ticking, wrong tenant selected, email sending doc names not actual PDFs, bulk scan not storing files, Day 30 dispatch not working.

---

### Bug Fixes

#### 1. Welcome kit "Done" button — page not refreshing after send
**Problem:** After sending the welcome kit, the "Done" button only called `closeMo()`. The DOM never re-rendered, so Day 1 journey card ticks stayed stale even though `D.certs` was updated in memory with `served: true`.
**Fix:** Done button now calls `closeMo();nav(window._currentPage,window._currentParam)` — forces re-render of current page using updated in-memory data.

#### 2. Written Statement tick — checking wrong data source
**Problem:** The Day 1 "Written Statement e-signed" done check read `email_log` for entries with `'sign'` in the template ID. This fires when the request is *sent*, not when it's *signed*. So the tick never appeared even after the tenant signed.
**Fix:** Done check now reads `D.esignReq` directly: `(D.esignReq||[]).some(r=>String(r.tenant_id)===String(t.id)&&r.document_type==='written_statement'&&r.status==='signed')`.

#### 3. Gas/EICR/EPC Day 1 ticks — required `served: true` which was never set on upload
**Problem:** All three cert done checks required `c.served || c.served_to_tenant === true`. `served: true` is only ever set when the welcome kit is dispatched (lines 4868–4870). If EICR/EPC were uploaded after the welcome kit was already sent, they'd never tick.
**Fix:** Removed `&& (c.served_to_tenant || c.served)` from all three. Tick fires as soon as cert exists in `D.certs` for that property.

#### 4. Bulk scan 8s timeout — scan results silently lost
**Problem:** `scanAndFill` AI call raced against an 8-second `setTimeout(resolve, 8000)`. Edge function calls routinely take longer. When timeout fired first, `resolve()` was called with nothing in `results[]`. User saw "0 documents saved" toast.
**Fix:** Timeout increased to 30s. `resolved` flag prevents double-resolve race condition. If AI genuinely times out, file still appears in results with blank fields and "⚠ Fill manually" label so landlord can type details and save.

#### 5. `saveBulkResults` — insert errors swallowed silently + file never stored
**Problem 1:** `if (!error && data)` silently skipped on insert failure — user saw no feedback.
**Problem 2:** Bulk scan only saved cert metadata (type, expiry) — never uploaded the actual file to Supabase storage. `file_url` was always null, so attachments could never work.
**Fix:** Added `if (error) { toast(...); continue; }` to surface failures. After successful insert, file is now uploaded to `documents/certs/{userId}/{certId}.{ext}` bucket, public URL retrieved and saved back to cert row as `file_url`. Degrades gracefully if file upload fails — cert metadata still saved.

#### 6. Welcome kit email — document names sent, not actual PDFs
**Problem:** Frontend tried to fetch cert files and convert to base64 using `btoa(String.fromCharCode(...new Uint8Array(buf)))`. This crashes silently for files over ~1MB — the spread operator hits browser call stack limits. Email sent successfully but with zero attachments.
**Fix (two parts):**
- **Frontend:** Changed to send `attachment_urls: [{url, filename}]` — just the storage URLs, no browser-side file fetching.
- **Edge function (`ai-proxy.ts`):** Added `attachment_urls` handler — Deno fetches each file server-side (no memory constraints), converts to base64 using a safe loop, passes to Resend `attachments[]`. Old `attachments` (base64) path kept for inventory report and RRA sheet sends.

#### 7. Welcome kit — wrong tenant selected
**Problem:** `moWelcomeKit` used `D.tenants.find(t => t.prop_id===pid && t.status==='Active')` — returns first active tenant. With multiple tenants on a property, this picked the wrong person.
**Fix:** Now finds `is_lead` tenant first: `D.tenants.find(t => t.prop_id===pid && t.is_lead && t.status==='Active') || D.tenants.find(t => t.prop_id===pid && t.status==='Active')`.

#### 8. Welcome kit modal — everything showing red for missing docs
**Problem:** Any doc with `hasIssue: true` (including simply "not yet uploaded") showed red `⚠ Action needed` badge with red border/background. Looked like a crisis even for normal pre-tenancy state.
**Fix:** Split into two states — `isExpired` (red, only for `st.lbl === 'EXPIRED'/'URGENT'`) vs `isMissing` (amber). Missing mandatory docs now show amber "Not uploaded" badge. Note font increased 11px → 12px.

#### 9. Smoke & CO alarm test — not wired to cert system
**Problem:** Day 30 "Smoke & CO alarm tested" done check read `email_log` for emails with "smoke" in subject — fragile and wrong. No upload path existed.
**Fix:** Done check now reads `propCerts` for type containing "smoke"/"co alarm"/"carbon monoxide". Button changed from `moCommunicationsHub` → `moBulkScan`. "Smoke & CO Alarm Test Record" and "Legionella Risk Assessment" added to bulk scan cert type dropdown.

#### 10. `_pollEsignSigned` — new function for post-kit esign monitoring
**New function added** before `moIssue`. Triggered after welcome kit dispatch. Polls `esign_requests` every 30s (max 20 attempts / 10 mins) for all active tenants on property. When all have `status === 'signed'`: calls `_markTenancyStep('written_statement_done')`, toasts landlord, writes audit log, re-renders tenant detail page if currently open.

#### 11. Day 30 pack — Dispatch button not working, no dedicated send function
**Problem:** "Dispatch Day 30 Pack" button and all Day 30 individual action buttons called `moCommunicationsHub` — a generic comms menu with no Day 30 logic.
**Fix:** Built `moDay30Kit(tid)` and `sendDay30Kit(tid)` functions:
- `moDay30Kit`: Opens modal showing readiness checklist (Prescribed Info, Inventory, Smoke/CO, Legionella). Always shows send button — non-blocking.
- `sendDay30Kit`: Generates Prescribed Information PDF using jsPDF (same logic as `generatePrescribedInfoPDF`). If inventory report exists for property, generates that PDF too. Sends both as `attachments[]` via edge function. Logs `template_id: 'day30_pack'`. Re-renders page on success.
- Deposit "Send now" row action wired to `moDay30Kit`. "Dispatch Day 30 Pack" button wired to `moDay30Kit`.

---

### Edge Function Changes

#### `ai-proxy.ts` — new `attachment_urls` handler
```
if (body.attachment_urls && Array.isArray(body.attachment_urls)) {
  for (const a of body.attachment_urls) {
    // fetch file server-side, convert to base64, push to attachments[]
  }
}
```
- Old `attachments` (direct base64) path preserved for inventory report and RRA sheet
- Returns Resend response status correctly (was always returning 200 previously)
- **Must be deployed to Supabase for PDF attachments to work**

---

### DB Migrations Run This Session
None.

---

### Known Issues — Updated

| # | Issue | Status |
|---|---|---|
| 1 | ICO number placeholder in legal docs | Pending registration |
| 2 | MX record for inbound email | Parked post-launch |
| 3 | `login.html` newsletter signup checkbox | Not built |
| 4 | `moFinancials` PDF export — jsPDF needed | Post-launch backlog |
| 5 | Section 8 UX handoff to Form 3A | Post-launch backlog |
| 6 | WhatsApp reminders | Post-launch backlog |
| 7 | Free public compliance checker | Marketing priority |
| 8 | Blog / content hub | Marketing priority |
| 9 | Postcode finder — replace with getAddress.io | Post-launch backlog |
| 10 | `stripe_price_id` NULL — sandbox only | Closed |
| 11 | `newsletter_opted_in` column missing from user_profiles | Pending SQL |
| 12 | favicon.ico missing | Post-launch backlog |
| 13 | `relet_prepared` column needed on tenants | Pending SQL |
| 14 | `portal_enabled` column — ✅ run Session 32 | Closed |
| 15 | RTR columns on tenants — ✅ run Session 35 | Closed |
| 16 | `day30_pack` email template | ✅ Built Session 37 |
| 17 | `kycRows` dead code — ✅ removed Session 35 | Closed |
| 18 | Block 4 `new Function()` false positive | Closed |
| 19 | `start_date` ISO timestamp on date input | ✅ Fixed Session 36 |
| 20 | Duplicate `calToday` declaration | ✅ Fixed Session 36 |
| 21 | Welcome kit PDF attachments not arriving | ✅ Fixed Session 37 — requires `ai-proxy.ts` deploy |
| 22 | Existing certs have no `file_url` — won't attach until re-uploaded | Known — landlords must re-upload via bulk scan |
| 23 | Day 30 kit modal behaviour — needs live test | Pending test Session 38 |
| 24 | `start_date` amber warning in `nav()` — second date input not yet traced | Carry forward |

---

## Session 38 — 6 June 2026

### Summary
Post-launch bug fixes and UX improvements. Focus: system documents, kit send flow, next-step guidance, written statement wiring, deposit cert scan, and kit modal simplification.

---

### Changes

#### 1. System Documents — upload once, attach to all Day 1 kits
**New feature.** Two new columns on `user_profiles`: `rra_doc_url TEXT`, `h2r_doc_url TEXT`.

**SQL run:**
```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS rra_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS h2r_doc_url TEXT;
```

**New "System Documents" card** added to top of `pgCompliance()`. Shows upload slots for:
- RRA 2025 Prescribed Particulars (GOV.UK link)
- How to Rent Guide (GOV.UK link)

Each slot shows ✓ Uploaded / ⚠ Not uploaded, View link, Upload/Replace button. Badge shows "Both uploaded" / "1 of 2" / "Not uploaded".

**New function `uploadSystemDoc(key, input)`:** Uploads to `property-documents/system/{key}-{uid}.pdf` in `documents` bucket (upsert). Writes public URL to `user_profiles`. Updates `D.userProfile` in memory. Refreshes compliance page.

**Day 1 kit send (`sendWelcomeKit`):** After cert attachments built, both `rra_doc_url` and `h2r_doc_url` injected into `attachment_urls`. If either missing, amber toast with link to Compliance > System Documents — kit still sends.

---

#### 2. "Send guide" button wired up
**Problem:** "How to Rent guide served · Send guide" button on Day 1 pack called `moCommunicationsHub` — did nothing useful.

**Fix:** New function `sendH2RGuide(tid)`:
- Checks `D.userProfile.h2r_doc_url` — if missing, toasts and redirects to Compliance
- Sends email directly to tenant with H2R PDF as attachment
- Logs `template_id: 'how_to_rent_guide'` to `email_log` so Day 1 tick fires
- Button now calls `sendH2RGuide('${tid}')` instead of `moCommunicationsHub`

---

#### 3. Next-step flow after Day 1 kit send
**New behaviour.** After `sendWelcomeKit` succeeds, instead of a static "Kit sent!" confirmation, a smart next-step modal fires:

1. **Co-tenants pending kit** → "Send kit to [name] →" (passes `targetTid` so correct tenant shown)
2. **All kits sent, KYC incomplete** → "Upload KYC for [first tenant needing docs] →"
3. **KYC done, certs missing** → Shows which certs missing → opens Bulk Scan
4. **Everything done** → "Tenancy setup complete!" · Auto-adds Day 30 reminder to `calendar_events` (start_date + 30 days) · Feature tour (Calendar, Rent & Finance, Maintenance, Documents) · Go to dashboard

All steps have a "Later" button — dismisses modal, progress bar handles state.

`moWelcomeKit(pid, targetTid)` — second param added so co-tenant flow passes correct tenant ID.

---

#### 4. RTR upload button hidden when wizard complete
When `rtrWizardDone === true`, Upload button and AI auto-scan label hidden from RTR KYC slot. Re-check button in green wizard card still available.

---

#### 5. Written Statement — esign PDF shown in checklist slot
**Problem:** After e-sign flow completed, Written Statement checklist slot showed "No document uploaded yet" even though signed PDF existed in `esign_requests.signed_pdf_url`.

**Fix:** `_checklistRowHtml` for `agreement` slot now checks `D.esignReq` for signed record with `signed_pdf_url` first. When found: shows "📎 Signed Written Statement (e-sign)" + signed date + View + Download buttons. Manual Upload button still present for override.

---

#### 6. Deposit cert scan — proper prompt + write-back to tenant
**Problem:** Deposit certs scanned via `moCert` / `scanDoc` used generic prompt → all fields "Not detected". Scheme/ref not written to tenant row so property page showed "Unprotected".

**Fix 1:** Added deposit cert branch to `scanDoc` prompt selector. Triggers when type includes "deposit", "dps", "tds", "mydeposit". Uses specific prompt extracting: scheme name (DPS/MyDeposits/TDS), reference, amount, tenant name, dates, address.

**Fix 2:** After scan callback, if deposit cert detected (`parsed.scheme` present), auto-writes `scheme`, `scheme_ref`, `deposit` to lead tenant row via `sb.from('tenants').update(patch)` and updates `D.tenants` in memory. Toast confirms write-back. Property page "Deposit" stat card then shows "Protected" immediately.

---

#### 7. Day 1 and Day 30 kit modals — simplified to glance-confirm
**Problem:** Both kit modals were showing full checklist with instructions, notes, action buttons — overwhelming at point of send.

**Fix:** Both modals rebuilt as 5-line glance-confirm:
- Sending to `[email]`
- 5 items: each shows ✅ Ready or ⚠ Missing — nothing else
- Cancel / Send button only

**Day 1 items:** RRA Prescribed Particulars, How to Rent Guide, Gas Safety Certificate, EICR, EPC.
**Day 30 items:** Deposit scheme & reference, Prescribed Information, Smoke & CO Alarm Test Record, Legionella Risk Assessment, Inventory.

Both send functions (`sendWelcomeKit`, `sendDay30Kit`) now pull `email` and `name` directly from `D.tenants` — no form inputs in modal.

---

### DB Migrations Run This Session
```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS rra_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS h2r_doc_url TEXT;
```

---

### Known Issues — Updated

| # | Issue | Status |
|---|---|---|
| 1 | ICO number placeholder in legal docs | Pending registration |
| 2 | MX record for inbound email | Parked post-launch |
| 3 | `login.html` newsletter signup checkbox | Not built |
| 4 | `moFinancials` PDF export — jsPDF needed | Post-launch backlog |
| 5 | Section 8 UX handoff to Form 3A | Post-launch backlog |
| 6 | WhatsApp reminders | Post-launch backlog |
| 7 | Free public compliance checker | Marketing priority |
| 8 | Blog / content hub | Marketing priority |
| 9 | Postcode finder — replace with getAddress.io | Post-launch backlog |
| 10 | `stripe_price_id` NULL — sandbox only | Closed |
| 11 | `newsletter_opted_in` column missing from user_profiles | Pending SQL |
| 12 | favicon.ico missing | Post-launch backlog |
| 13 | `relet_prepared` column needed on tenants | Pending SQL |
| 14 | `portal_enabled` column — ✅ run Session 32 | Closed |
| 15 | RTR columns on tenants — ✅ run Session 35 | Closed |
| 16 | `day30_pack` email template | ✅ Built Session 37 |
| 17 | `kycRows` dead code — ✅ removed Session 35 | Closed |
| 18 | Block 4 `new Function()` false positive | Closed |
| 19 | `start_date` ISO timestamp on date input | ✅ Fixed Session 36 |
| 20 | Duplicate `calToday` declaration | ✅ Fixed Session 36 |
| 21 | Welcome kit PDF attachments not arriving | ⚠ Edge function fix pending developer — `ai-proxy.ts` must handle `attachment_urls` |
| 22 | Existing certs have no `file_url` — won't attach until re-uploaded | Known — landlords must re-upload via bulk scan |
| 23 | Day 30 kit modal — rebuilt Session 38 | ✅ Rebuilt as glance-confirm |
| 24 | `start_date` amber warning in `nav()` — second date input not yet traced | Carry forward |
| 25 | Deposit cert scan all "Not detected" | ✅ Fixed Session 38 — deposit-specific prompt + write-back |
| 26 | Property page shows "Unprotected" after deposit cert upload | ✅ Fixed Session 38 — auto write-back to tenant row on scan |
| 27 | Written Statement shows "No document uploaded" after e-sign | ✅ Fixed Session 38 — reads `signed_pdf_url` from `esign_requests` |
| 28 | "Send guide" button unresponsive | ✅ Fixed Session 38 — `sendH2RGuide(tid)` built and wired |
