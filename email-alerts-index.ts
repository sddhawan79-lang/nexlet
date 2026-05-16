// ============================================================
// SPRINT 10 — email-alerts Edge Function
// File: supabase/functions/email-alerts/index.ts
//
// Handles all 8 NexLet alert types via Resend.
// Called by pg_cron daily (09:00) and weekly (Mon 08:00).
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── Environment ──────────────────────────────────────────────
const RESEND_API_KEY          = Deno.env.get("RESEND_API_KEY")!
const SUPABASE_URL            = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const FROM_EMAIL              = "documents@nexlet.co.uk"
const APP_URL                 = "https://nexlet.co.uk"

// Alert thresholds
const CERT_DAYS_BEFORE        = [60, 30, 14, 7]
const INSURANCE_DAYS_BEFORE   = [60, 30]
const MTD_DAYS_BEFORE         = [30, 14, 7]
const MAINTENANCE_OVERDUE_DAYS = 7
const AWAAB_BREACH_DAYS       = 14
const RENT_OVERDUE_DAYS       = 1
const COMPLIANCE_THRESHOLD    = 70

// Damp/mould keywords for Awaab's Law detection
const AWAAB_KEYWORDS = ['damp', 'mould', 'mold', 'condensation', 'leak', 'water ingress', 'black mould']


// ── Supabase client (service role — full access) ─────────────
function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
  })
}


// ────────────────────────────────────────────────────────────
// EMAIL DEDUPLICATION
// ────────────────────────────────────────────────────────────

async function alreadySent(
  supabase: ReturnType<typeof getSupabase>,
  landlordId: string,
  alertType: string,
  referenceKey: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('email_log')
    .select('id')
    .eq('landlord_id', landlordId)
    .eq('alert_type', alertType)
    .eq('reference_key', referenceKey)
    .maybeSingle()
  if (error) console.error('alreadySent error:', error.message)
  return !!data
}

async function markSent(
  supabase: ReturnType<typeof getSupabase>,
  landlordId: string,
  alertType: string,
  referenceKey: string,
  recipientEmail: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase.from('email_log').upsert({
    landlord_id:     landlordId,
    alert_type:      alertType,
    reference_key:   referenceKey,
    recipient_email: recipientEmail,
    metadata
  }, { onConflict: 'landlord_id,alert_type,reference_key' })
  if (error) console.error('markSent error:', error.message)
}


// ────────────────────────────────────────────────────────────
// RESEND — SEND EMAIL
// ────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: `NexLet <${FROM_EMAIL}>`,
        to,
        subject,
        html
      })
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
    }
    return res.ok
  } catch (e) {
    console.error('sendEmail exception:', e)
    return false
  }
}


// ────────────────────────────────────────────────────────────
// BRANDED HTML EMAIL TEMPLATE
// Inline CSS — compatible with all major email clients
// ────────────────────────────────────────────────────────────

type BadgeStyle = 'critical' | 'warning' | 'info' | 'success'

const BADGE_COLOURS: Record<BadgeStyle, string> = {
  critical: '#DC2626',
  warning:  '#D97706',
  info:     '#2563EB',
  success:  '#059669'
}

interface EmailOpts {
  badgeStyle:  BadgeStyle
  badgeText:   string
  heading:     string
  bodyHtml:    string
  ctaUrl:      string
  ctaText:     string
  footerNote?: string
}

function buildEmail(opts: EmailOpts): string {
  const badgeColour = BADGE_COLOURS[opts.badgeStyle]
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#EFF6FF;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(27,58,107,0.10);">

          <!-- ── HEADER ─────────────────────────────────── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1B3A6B 0%,#1E4D8C 100%);padding:32px 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:26px;vertical-align:middle;">🏠</span>
                    <span style="color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:-0.3px;vertical-align:middle;margin-left:8px;">NexLet</span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:${badgeColour};color:#FFFFFF;font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;padding:5px 12px;border-radius:20px;">
                      ${opts.badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── ACCENT BAR ─────────────────────────────── -->
          <tr>
            <td style="background:${badgeColour};height:4px;padding:0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- ── BODY ──────────────────────────────────── -->
          <tr>
            <td style="padding:36px 40px 8px;">
              <h2 style="margin:0 0 16px;color:#1B3A6B;font-size:20px;font-weight:700;line-height:1.3;">
                ${opts.heading}
              </h2>
              <div style="color:#374151;font-size:14px;line-height:1.7;">
                ${opts.bodyHtml}
              </div>
            </td>
          </tr>

          <!-- ── CTA ───────────────────────────────────── -->
          <tr>
            <td style="padding:28px 40px 36px;">
              <a href="${opts.ctaUrl}"
                style="display:inline-block;background:#1B3A6B;color:#FFFFFF;padding:13px 26px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.2px;">
                ${opts.ctaText} &rarr;
              </a>
            </td>
          </tr>

          <!-- ── FOOTER ─────────────────────────────────── -->
          <tr>
            <td style="padding:20px 40px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.5;">
                ${opts.footerNote ?? 'This is an automated alert from NexLet.'}
                &nbsp;&bull;&nbsp;
                <a href="${APP_URL}" style="color:#1B3A6B;text-decoration:none;">nexlet.co.uk</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}


// ────────────────────────────────────────────────────────────
// HELPER: get landlord email from Supabase Auth
// ────────────────────────────────────────────────────────────

async function getLandlordEmail(
  supabase: ReturnType<typeof getSupabase>,
  landlordId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(landlordId)
    if (error || !data?.user?.email) return null
    return data.user.email
  } catch (e) {
    console.error('getLandlordEmail error:', e)
    return null
  }
}


// ────────────────────────────────────────────────────────────
// HELPER: Format date nicely
// ────────────────────────────────────────────────────────────

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function daysUntil(dateStr: string): number {
  const now  = new Date(); now.setHours(0,0,0,0)
  const then = new Date(dateStr); then.setHours(0,0,0,0)
  return Math.round((then.getTime() - now.getTime()) / 86_400_000)
}

function isoWeek(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`
}


// ════════════════════════════════════════════════════════════
// ALERT 1 — CERTIFICATE EXPIRING
// Triggers: 60, 30, 14, 7 days before expiry
// ════════════════════════════════════════════════════════════

async function processCertExpiry(supabase: ReturnType<typeof getSupabase>) {
  console.log('→ Processing: Certificate Expiry')

  const { data: certs, error } = await supabase
    .from('certificates')
    .select(`
      id, cert_type, expiry_date,
      properties!inner ( id, address, landlord_id )
    `)
    .not('expiry_date', 'is', null)
    .gte('expiry_date', new Date().toISOString().split('T')[0])
    .lte('expiry_date', new Date(Date.now() + 61 * 86400000).toISOString().split('T')[0])

  if (error) { console.error('cert query error:', error.message); return }
  if (!certs?.length) return

  for (const cert of certs) {
    const property    = (cert as any).properties
    const landlordId  = property?.landlord_id
    const days        = daysUntil(cert.expiry_date)

    // Only fire on exact threshold days
    if (!CERT_DAYS_BEFORE.includes(days)) continue

    const certLabel   = cert.cert_type?.replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? 'Certificate'
    const refKey      = `cert_${cert.id}_${days}d`
    const alertType   = 'cert_expiry'

    if (await alreadySent(supabase, landlordId, alertType, refKey)) continue

    const email = await getLandlordEmail(supabase, landlordId)
    if (!email) continue

    const urgency = days <= 14 ? 'critical' : days <= 30 ? 'warning' : 'info'
    const html = buildEmail({
      badgeStyle: urgency as BadgeStyle,
      badgeText:  `${days} DAYS REMAINING`,
      heading:    `${certLabel} Expiring — Action Required`,
      bodyHtml: `
        <p>Your <strong>${certLabel}</strong> for the property below is expiring in <strong>${days} days</strong>.</p>
        <table role="presentation" style="background:#F1F5F9;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;">
          <tr><td style="color:#64748B;font-size:13px;">Property</td></tr>
          <tr><td style="color:#1B3A6B;font-weight:600;font-size:15px;">${property?.address ?? 'Your property'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Certificate Type</td></tr>
          <tr><td style="color:#374151;font-size:14px;">${certLabel}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Expiry Date</td></tr>
          <tr><td style="color:#DC2626;font-weight:600;font-size:14px;">${fmtDate(cert.expiry_date)}</td></tr>
        </table>
        <p style="color:#6B7280;font-size:13px;">
          Book a renewal now to maintain compliance and avoid penalties. Expired certificates may breach your legal obligations as a landlord.
        </p>`,
      ctaUrl:  `${APP_URL}/certificates`,
      ctaText: 'View Certificate',
      footerNote: 'Compliance alert — sent by your NexLet account.'
    })

    const ok = await sendEmail(email, `⚠ ${certLabel} expires in ${days} days — ${property?.address ?? ''}`, html)
    if (ok) {
      await markSent(supabase, landlordId, alertType, refKey, email, { cert_id: cert.id, days_before: days })
      console.log(`  ✓ Cert expiry sent: ${email} | ${certLabel} | ${days}d`)
    }
  }
}


// ════════════════════════════════════════════════════════════
// ALERT 2 — RENT OVERDUE
// Triggers: 1 day after next_rent_due, active tenancies only
// ════════════════════════════════════════════════════════════

async function processRentOverdue(supabase: ReturnType<typeof getSupabase>) {
  console.log('→ Processing: Rent Overdue')

  const yesterday = new Date(Date.now() - RENT_OVERDUE_DAYS * 86400000)
    .toISOString().split('T')[0]

  const { data: tenancies, error } = await supabase
    .from('tenancies')
    .select(`
      id, tenant_name, rent_amount, next_rent_due,
      properties!inner ( id, address, landlord_id )
    `)
    .eq('status', 'active')
    .not('next_rent_due', 'is', null)
    .lte('next_rent_due', yesterday)

  if (error) { console.error('rent query error:', error.message); return }
  if (!tenancies?.length) return

  for (const t of tenancies) {
    const property   = (t as any).properties
    const landlordId = property?.landlord_id
    const dueDateStr = t.next_rent_due
    const refKey     = `rent_overdue_${t.id}_${dueDateStr}`
    const alertType  = 'rent_overdue'

    if (await alreadySent(supabase, landlordId, alertType, refKey)) continue

    const email = await getLandlordEmail(supabase, landlordId)
    if (!email) continue

    const html = buildEmail({
      badgeStyle: 'critical',
      badgeText:  'RENT OVERDUE',
      heading:    'Rent Payment Overdue',
      bodyHtml: `
        <p>A rent payment is <strong>overdue</strong> for one of your properties.</p>
        <table role="presentation" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;">
          <tr><td style="color:#64748B;font-size:13px;">Property</td></tr>
          <tr><td style="color:#1B3A6B;font-weight:600;font-size:15px;">${property?.address ?? 'Your property'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Tenant</td></tr>
          <tr><td style="color:#374151;font-size:14px;">${t.tenant_name ?? 'Tenant'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Amount Due</td></tr>
          <tr><td style="color:#DC2626;font-weight:700;font-size:16px;">£${Number(t.rent_amount ?? 0).toFixed(2)}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Due Date</td></tr>
          <tr><td style="color:#DC2626;font-weight:600;font-size:14px;">${fmtDate(dueDateStr)}</td></tr>
        </table>
        <p style="color:#6B7280;font-size:13px;">
          Log in to NexLet to record a payment, send a tenant reminder, or review your rent schedule.
        </p>`,
      ctaUrl:  `${APP_URL}/rent`,
      ctaText: 'View Rent Tracker',
      footerNote: 'Rent alert — sent by your NexLet account.'
    })

    const ok = await sendEmail(email, `🔴 Rent overdue — ${property?.address ?? 'Your property'}`, html)
    if (ok) {
      await markSent(supabase, landlordId, alertType, refKey, email, { tenancy_id: t.id, due_date: dueDateStr })
      console.log(`  ✓ Rent overdue sent: ${email}`)
    }
  }
}


// ════════════════════════════════════════════════════════════
// ALERT 3 — MAINTENANCE JOB OVERDUE (7+ days, no update)
// Re-fires weekly (keyed to ISO week) while job is stale
// ════════════════════════════════════════════════════════════

async function processMaintenanceOverdue(supabase: ReturnType<typeof getSupabase>) {
  console.log('→ Processing: Maintenance Overdue')

  const cutoff = new Date(Date.now() - MAINTENANCE_OVERDUE_DAYS * 86400000).toISOString()

  const { data: jobs, error } = await supabase
    .from('maintenance_jobs')
    .select(`
      id, title, status, created_at, updated_at,
      properties!inner ( id, address, landlord_id )
    `)
    .not('status', 'in', '("completed","closed","Completed","Closed")')
    .lt('updated_at', cutoff)

  if (error) { console.error('maintenance query error:', error.message); return }
  if (!jobs?.length) return

  const currentWeek = isoWeek()

  for (const job of jobs) {
    const property   = (job as any).properties
    const landlordId = property?.landlord_id
    const refKey     = `maint_overdue_${job.id}_${currentWeek}`
    const alertType  = 'maintenance_overdue'

    if (await alreadySent(supabase, landlordId, alertType, refKey)) continue

    const email = await getLandlordEmail(supabase, landlordId)
    if (!email) continue

    const daysSinceUpdate = Math.round((Date.now() - new Date(job.updated_at).getTime()) / 86400000)

    const html = buildEmail({
      badgeStyle: 'warning',
      badgeText:  'MAINTENANCE OVERDUE',
      heading:    'Maintenance Job Needs Attention',
      bodyHtml: `
        <p>A maintenance job has had <strong>no update for ${daysSinceUpdate} days</strong> and may need your attention.</p>
        <table role="presentation" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;">
          <tr><td style="color:#64748B;font-size:13px;">Job Title</td></tr>
          <tr><td style="color:#1B3A6B;font-weight:600;font-size:15px;">${job.title ?? 'Maintenance Job'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Property</td></tr>
          <tr><td style="color:#374151;font-size:14px;">${property?.address ?? 'Your property'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Status</td></tr>
          <tr><td style="color:#D97706;font-weight:600;font-size:14px;">${job.status ?? 'Open'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Opened</td></tr>
          <tr><td style="color:#374151;font-size:14px;">${fmtDate(job.created_at)}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Last Updated</td></tr>
          <tr><td style="color:#D97706;font-weight:600;font-size:14px;">${fmtDate(job.updated_at)} (${daysSinceUpdate} days ago)</td></tr>
        </table>
        <p style="color:#6B7280;font-size:13px;">
          Please update the job status or assign a contractor to ensure this issue is resolved promptly.
        </p>`,
      ctaUrl:  `${APP_URL}/maintenance`,
      ctaText: 'View Job',
      footerNote: 'Maintenance alert — sent by your NexLet account.'
    })

    const ok = await sendEmail(email, `⚠ Stale maintenance job — ${job.title ?? 'update required'}`, html)
    if (ok) {
      await markSent(supabase, landlordId, alertType, refKey, email, { job_id: job.id, days_since_update: daysSinceUpdate })
      console.log(`  ✓ Maintenance overdue sent: ${email}`)
    }
  }
}


// ════════════════════════════════════════════════════════════
// ALERT 4 — AWAAB'S LAW BREACH RISK
// Damp/mould jobs open 14+ days = legal risk
// Re-fires weekly while unresolved
// ════════════════════════════════════════════════════════════

async function processAwaabLaw(supabase: ReturnType<typeof getSupabase>) {
  console.log("→ Processing: Awaab's Law")

  const cutoff = new Date(Date.now() - AWAAB_BREACH_DAYS * 86400000).toISOString()

  // Build keyword filter: title OR description contains damp/mould keywords
  const keywordFilter = AWAAB_KEYWORDS.map(k => `title.ilike.%${k}%`).join(',')

  const { data: jobs, error } = await supabase
    .from('maintenance_jobs')
    .select(`
      id, title, status, created_at,
      properties!inner ( id, address, landlord_id )
    `)
    .not('status', 'in', '("completed","closed","Completed","Closed")')
    .lt('created_at', cutoff)
    .or(keywordFilter)

  if (error) { console.error('awaab query error:', error.message); return }
  if (!jobs?.length) return

  const currentWeek = isoWeek()

  for (const job of jobs) {
    const property   = (job as any).properties
    const landlordId = property?.landlord_id
    const refKey     = `awaab_${job.id}_${currentWeek}`
    const alertType  = 'awaab_law'

    if (await alreadySent(supabase, landlordId, alertType, refKey)) continue

    const email = await getLandlordEmail(supabase, landlordId)
    if (!email) continue

    const daysOpen = Math.round((Date.now() - new Date(job.created_at).getTime()) / 86400000)

    const html = buildEmail({
      badgeStyle: 'critical',
      badgeText:  "AWAAB'S LAW — URGENT",
      heading:    "Awaab's Law Breach Risk — Immediate Action Required",
      bodyHtml: `
        <p style="background:#FEF2F2;border-left:4px solid #DC2626;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
          <strong>Legal warning:</strong> Under Awaab's Law (Renter's Reform Act 2023), landlords must investigate damp and mould hazards within <strong>14 days</strong> and begin repairs within a specified timeframe.
        </p>
        <p>The following job has been open for <strong>${daysOpen} days</strong> and may constitute a legal breach.</p>
        <table role="presentation" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;">
          <tr><td style="color:#64748B;font-size:13px;">Job Title</td></tr>
          <tr><td style="color:#DC2626;font-weight:700;font-size:15px;">${job.title ?? 'Damp/Mould Issue'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Property</td></tr>
          <tr><td style="color:#1B3A6B;font-weight:600;font-size:15px;">${property?.address ?? 'Your property'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Days Open</td></tr>
          <tr><td style="color:#DC2626;font-weight:700;font-size:16px;">${daysOpen} days (${daysOpen - 14} days over Awaab threshold)</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Opened</td></tr>
          <tr><td style="color:#374151;font-size:14px;">${fmtDate(job.created_at)}</td></tr>
        </table>
        <p style="color:#6B7280;font-size:13px;">
          Assign a contractor and update the job status immediately to protect yourself from legal action. 
          Document all remediation steps taken. Consider seeking legal advice if the issue is complex.
        </p>`,
      ctaUrl:  `${APP_URL}/maintenance`,
      ctaText: 'Take Action Now',
      footerNote: "Awaab's Law compliance alert — sent by your NexLet account."
    })

    const ok = await sendEmail(email, `🚨 URGENT: Awaab's Law breach risk — ${property?.address ?? 'your property'}`, html)
    if (ok) {
      await markSent(supabase, landlordId, alertType, refKey, email, { job_id: job.id, days_open: daysOpen })
      console.log(`  ✓ Awaab's Law alert sent: ${email}`)
    }
  }
}


// ════════════════════════════════════════════════════════════
// ALERT 5 — MTD DEADLINE APPROACHING
// 30, 14, 7 days before submission_deadline
// ════════════════════════════════════════════════════════════

async function processMtdDeadline(supabase: ReturnType<typeof getSupabase>) {
  console.log('→ Processing: MTD Deadlines')

  const { data: periods, error } = await supabase
    .from('mtd_periods')
    .select('id, landlord_id, period_start, period_end, submission_deadline, tax_year, quarter, status')
    .eq('status', 'pending')
    .gte('submission_deadline', new Date().toISOString().split('T')[0])
    .lte('submission_deadline', new Date(Date.now() + 31 * 86400000).toISOString().split('T')[0])

  if (error) { console.error('MTD query error:', error.message); return }
  if (!periods?.length) {
    console.log('  (no MTD periods found — module not yet active)')
    return
  }

  for (const period of periods) {
    const days = daysUntil(period.submission_deadline)
    if (!MTD_DAYS_BEFORE.includes(days)) continue

    const refKey    = `mtd_${period.id}_${days}d`
    const alertType = 'mtd_deadline'

    if (await alreadySent(supabase, period.landlord_id, alertType, refKey)) continue

    const email = await getLandlordEmail(supabase, period.landlord_id)
    if (!email) continue

    const html = buildEmail({
      badgeStyle: days <= 7 ? 'critical' : 'warning',
      badgeText:  `MTD — ${days} DAYS`,
      heading:    `MTD Submission Due in ${days} Days`,
      bodyHtml: `
        <p>Your Making Tax Digital (MTD) submission for the period below is due in <strong>${days} days</strong>.</p>
        <table role="presentation" style="background:#F1F5F9;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;">
          <tr><td style="color:#64748B;font-size:13px;">Tax Year</td></tr>
          <tr><td style="color:#1B3A6B;font-weight:600;font-size:15px;">${period.tax_year ?? 'Current year'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Period</td></tr>
          <tr><td style="color:#374151;font-size:14px;">${fmtDate(period.period_start)} – ${fmtDate(period.period_end)}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">HMRC Deadline</td></tr>
          <tr><td style="color:#DC2626;font-weight:700;font-size:15px;">${fmtDate(period.submission_deadline)}</td></tr>
        </table>
        <p style="color:#6B7280;font-size:13px;">
          Ensure your income and expenses are up to date before submitting to HMRC. Missing MTD deadlines may result in penalties.
        </p>`,
      ctaUrl:  `${APP_URL}/finance`,
      ctaText: 'View Finance',
      footerNote: 'MTD compliance alert — sent by your NexLet account.'
    })

    const ok = await sendEmail(email, `📋 MTD deadline in ${days} days — action required`, html)
    if (ok) {
      await markSent(supabase, period.landlord_id, alertType, refKey, email, { period_id: period.id, days_before: days })
      console.log(`  ✓ MTD alert sent: ${email}`)
    }
  }
}


// ════════════════════════════════════════════════════════════
// ALERT 6 — INSURANCE EXPIRING
// 60 and 30 days before expiry_date
// ════════════════════════════════════════════════════════════

async function processInsuranceExpiry(supabase: ReturnType<typeof getSupabase>) {
  console.log('→ Processing: Insurance Expiry')

  const { data: policies, error } = await supabase
    .from('property_insurance')
    .select(`
      id, provider, policy_type, expiry_date, policy_number,
      properties!inner ( id, address, landlord_id )
    `)
    .gte('expiry_date', new Date().toISOString().split('T')[0])
    .lte('expiry_date', new Date(Date.now() + 61 * 86400000).toISOString().split('T')[0])

  if (error) { console.error('insurance query error:', error.message); return }
  if (!policies?.length) {
    console.log('  (no insurance policies found)')
    return
  }

  for (const policy of policies) {
    const property   = (policy as any).properties
    const landlordId = property?.landlord_id
    const days       = daysUntil(policy.expiry_date)

    if (!INSURANCE_DAYS_BEFORE.includes(days)) continue

    const refKey     = `insurance_${policy.id}_${days}d`
    const alertType  = 'insurance_expiry'

    if (await alreadySent(supabase, landlordId, alertType, refKey)) continue

    const email = await getLandlordEmail(supabase, landlordId)
    if (!email) continue

    const policyLabel = policy.policy_type?.replace(/_/g,' ').replace(/\b\w/g, (c:string)=>c.toUpperCase()) ?? 'Insurance'

    const html = buildEmail({
      badgeStyle: days <= 30 ? 'warning' : 'info',
      badgeText:  `INSURANCE — ${days} DAYS`,
      heading:    `${policyLabel} Policy Expiring in ${days} Days`,
      bodyHtml: `
        <p>Your <strong>${policyLabel} insurance</strong> policy is due to expire in <strong>${days} days</strong>.</p>
        <table role="presentation" style="background:#F1F5F9;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;">
          <tr><td style="color:#64748B;font-size:13px;">Property</td></tr>
          <tr><td style="color:#1B3A6B;font-weight:600;font-size:15px;">${property?.address ?? 'Your property'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Provider</td></tr>
          <tr><td style="color:#374151;font-size:14px;">${policy.provider ?? 'Not specified'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Policy Number</td></tr>
          <tr><td style="color:#374151;font-size:14px;">${policy.policy_number ?? 'Not specified'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Expiry Date</td></tr>
          <tr><td style="color:#D97706;font-weight:700;font-size:15px;">${fmtDate(policy.expiry_date)}</td></tr>
        </table>
        <p style="color:#6B7280;font-size:13px;">
          Renew your policy before the expiry date. Operating a rental property without valid insurance may invalidate your mortgage and expose you to significant financial risk.
        </p>`,
      ctaUrl:  `${APP_URL}/compliance`,
      ctaText: 'View Compliance',
    })

    const ok = await sendEmail(email, `⚠ ${policyLabel} insurance expires in ${days} days`, html)
    if (ok) {
      await markSent(supabase, landlordId, alertType, refKey, email, { policy_id: policy.id, days_before: days })
      console.log(`  ✓ Insurance alert sent: ${email}`)
    }
  }
}


// ════════════════════════════════════════════════════════════
// ALERT 7 — COMPLIANCE SCORE BELOW 70%
// Fires once per day while score is below threshold
// ════════════════════════════════════════════════════════════

async function processComplianceScore(supabase: ReturnType<typeof getSupabase>) {
  console.log('→ Processing: Compliance Score')

  // Get all distinct landlord IDs from properties
  const { data: landlords, error } = await supabase
    .from('properties')
    .select('landlord_id')

  if (error) { console.error('compliance landlord query error:', error.message); return }
  if (!landlords?.length) return

  const uniqueLandlordIds = [...new Set(landlords.map((l: any) => l.landlord_id))]
  const today = new Date().toISOString().split('T')[0]

  for (const landlordId of uniqueLandlordIds) {
    // Compute compliance score using the DB function
    const { data: scoreData, error: scoreError } = await supabase
      .rpc('get_compliance_score', { p_landlord_id: landlordId })

    if (scoreError) { console.error('score rpc error:', scoreError.message); continue }

    const score = Number(scoreData ?? 100)
    if (score >= COMPLIANCE_THRESHOLD) continue

    const refKey    = `compliance_${landlordId}_${today}`
    const alertType = 'compliance_score'

    if (await alreadySent(supabase, landlordId, alertType, refKey)) continue

    const email = await getLandlordEmail(supabase, landlordId)
    if (!email) continue

    const html = buildEmail({
      badgeStyle: score < 50 ? 'critical' : 'warning',
      badgeText:  `COMPLIANCE: ${score}%`,
      heading:    `Your Compliance Score Has Dropped to ${score}%`,
      bodyHtml: `
        <p>Your NexLet compliance score has dropped to <strong style="color:#DC2626;">${score}%</strong>, which is below the recommended minimum of <strong>${COMPLIANCE_THRESHOLD}%</strong>.</p>
        
        <!-- Score bar -->
        <div style="background:#E2E8F0;border-radius:20px;height:18px;margin:20px 0;overflow:hidden;">
          <div style="background:${score < 50 ? '#DC2626' : '#D97706'};width:${score}%;height:18px;border-radius:20px;"></div>
        </div>
        <p style="text-align:right;margin-top:-12px;color:#64748B;font-size:12px;">${score}% / 100%</p>
        
        <p style="color:#374151;">A low compliance score typically means one or more of your properties has:</p>
        <ul style="color:#374151;font-size:14px;margin:8px 0;padding-left:20px;line-height:2;">
          <li>An expired or missing Gas Safety Certificate</li>
          <li>An expired or missing EICR</li>
          <li>An expired or missing EPC</li>
          <li>Overdue maintenance issues</li>
        </ul>
        <p style="color:#6B7280;font-size:13px;">
          Review your compliance dashboard and resolve outstanding issues to protect your tenants and avoid penalties.
        </p>`,
      ctaUrl:  `${APP_URL}/compliance`,
      ctaText: 'Fix Compliance Issues',
      footerNote: 'Compliance alert — sent by your NexLet account.'
    })

    const ok = await sendEmail(email, `🔴 Compliance score at ${score}% — action needed`, html)
    if (ok) {
      await markSent(supabase, landlordId, alertType, refKey, email, { score, date: today })
      console.log(`  ✓ Compliance alert sent: ${email} | score: ${score}%`)
    }
  }
}


// ════════════════════════════════════════════════════════════
// ALERT 8 — WEEKLY PORTFOLIO SUMMARY (Mondays only)
// Aggregates: properties, tenancies, certs, maintenance, rent
// ════════════════════════════════════════════════════════════

async function processWeeklySummary(supabase: ReturnType<typeof getSupabase>) {
  console.log('→ Processing: Weekly Summary')

  const { data: landlords, error } = await supabase
    .from('properties')
    .select('landlord_id')

  if (error) { console.error('weekly landlord query error:', error.message); return }
  if (!landlords?.length) return

  const uniqueLandlordIds = [...new Set(landlords.map((l: any) => l.landlord_id))]
  const currentWeek = isoWeek()

  for (const landlordId of uniqueLandlordIds) {
    const refKey    = `summary_${landlordId}_${currentWeek}`
    const alertType = 'weekly_summary'

    if (await alreadySent(supabase, landlordId, alertType, refKey)) continue

    const email = await getLandlordEmail(supabase, landlordId)
    if (!email) continue

    // ── Gather stats ──
    const [
      { count: propCount  },
      { count: tenCount   },
      { count: activeMaint },
      { count: expCerts   },
      { count: overdueRent },
    ] = await Promise.all([
      supabase.from('properties').select('*', { count: 'exact', head: true })
        .eq('landlord_id', landlordId),
      supabase.from('tenancies').select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .in('property_id',
          (await supabase.from('properties').select('id').eq('landlord_id', landlordId)).data?.map((p: any) => p.id) ?? []
        ),
      supabase.from('maintenance_jobs').select('*', { count: 'exact', head: true })
        .not('status', 'in', '("completed","closed","Completed","Closed")')
        .in('property_id',
          (await supabase.from('properties').select('id').eq('landlord_id', landlordId)).data?.map((p: any) => p.id) ?? []
        ),
      supabase.from('certificates').select('*', { count: 'exact', head: true })
        .lte('expiry_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .in('property_id',
          (await supabase.from('properties').select('id').eq('landlord_id', landlordId)).data?.map((p: any) => p.id) ?? []
        ),
      supabase.from('tenancies').select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .not('next_rent_due', 'is', null)
        .lt('next_rent_due', new Date().toISOString().split('T')[0])
        .in('property_id',
          (await supabase.from('properties').select('id').eq('landlord_id', landlordId)).data?.map((p: any) => p.id) ?? []
        ),
    ])

    // ── Compliance score ──
    const { data: scoreData } = await supabase.rpc('get_compliance_score', { p_landlord_id: landlordId })
    const score = Number(scoreData ?? 100)

    const scoreColour = score >= 80 ? '#059669' : score >= 70 ? '#D97706' : '#DC2626'
    const weekLabel   = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    // Stat block helper
    const stat = (label: string, value: number | string, colour = '#1B3A6B', note = '') => `
      <td style="text-align:center;padding:12px 8px;">
        <div style="font-size:28px;font-weight:700;color:${colour};line-height:1;">${value}</div>
        <div style="font-size:11px;color:#64748B;margin-top:4px;">${label}</div>
        ${note ? `<div style="font-size:10px;color:#94A3B8;">${note}</div>` : ''}
      </td>`

    const html = buildEmail({
      badgeStyle: 'info',
      badgeText:  'WEEKLY SUMMARY',
      heading:    `Your Portfolio — Week of ${weekLabel}`,
      bodyHtml: `
        <p>Here's your weekly snapshot from NexLet. Have a great week.</p>

        <!-- Stats grid -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="background:#F8FAFC;border-radius:12px;margin:20px 0;border:1px solid #E2E8F0;">
          <tr>
            ${stat('Properties', propCount ?? 0)}
            ${stat('Active Tenancies', tenCount ?? 0)}
            ${stat('Compliance Score', `${score}%`, scoreColour)}
          </tr>
          <tr style="border-top:1px solid #E2E8F0;">
            ${stat('Open Jobs', activeMaint ?? 0, activeMaint ? '#D97706' : '#059669', activeMaint ? 'needs review' : 'all clear')}
            ${stat('Certs Expiring (30d)', expCerts ?? 0, expCerts ? '#D97706' : '#059669', expCerts ? 'action needed' : 'all clear')}
            ${stat('Rent Overdue', overdueRent ?? 0, overdueRent ? '#DC2626' : '#059669', overdueRent ? 'chase payment' : 'all clear')}
          </tr>
        </table>

        ${(activeMaint || expCerts || overdueRent) ? `
        <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;margin-top:8px;">
          <strong style="color:#92400E;font-size:13px;">⚠ Action items this week</strong>
          <ul style="margin:8px 0 0;padding-left:20px;color:#78350F;font-size:13px;line-height:1.8;">
            ${activeMaint ? `<li>${activeMaint} open maintenance job${activeMaint > 1 ? 's' : ''} awaiting update</li>` : ''}
            ${expCerts    ? `<li>${expCerts} certificate${expCerts > 1 ? 's' : ''} expiring within 30 days</li>` : ''}
            ${overdueRent ? `<li>${overdueRent} overdue rent payment${overdueRent > 1 ? 's' : ''}</li>` : ''}
          </ul>
        </div>` : `
        <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:12px 16px;margin-top:8px;">
          <strong style="color:#065F46;font-size:13px;">✓ All clear — no outstanding actions this week.</strong>
        </div>`}`,
      ctaUrl:  `${APP_URL}/dashboard`,
      ctaText: 'Open Dashboard',
      footerNote: 'Weekly portfolio summary — sent every Monday by NexLet.'
    })

    const ok = await sendEmail(email, `📊 Your NexLet weekly summary — ${weekLabel}`, html)
    if (ok) {
      await markSent(supabase, landlordId, alertType, refKey, email, { week: currentWeek, score })
      console.log(`  ✓ Weekly summary sent: ${email}`)
    }
  }
}


// ════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════

serve(async (req: Request) => {
  // Verify method
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Parse body
  let body: { type?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = { type: 'daily' }
  }

  const type = body.type ?? 'daily'
  console.log(`\n═══ email-alerts function fired | type=${type} | ${new Date().toISOString()} ═══`)

  const supabase = getSupabase()

  const results: Record<string, string> = {}

  try {
    if (type === 'weekly_summary') {
      // Weekly Monday summary only
      await processWeeklySummary(supabase)
      results.weekly_summary = 'ok'

    } else {
      // Daily — run all 7 alert types in parallel
      const tasks = [
        processCertExpiry(supabase).then(() => { results.cert_expiry = 'ok' }).catch(e => { results.cert_expiry = e.message }),
        processRentOverdue(supabase).then(() => { results.rent_overdue = 'ok' }).catch(e => { results.rent_overdue = e.message }),
        processMaintenanceOverdue(supabase).then(() => { results.maintenance = 'ok' }).catch(e => { results.maintenance = e.message }),
        processAwaabLaw(supabase).then(() => { results.awaab = 'ok' }).catch(e => { results.awaab = e.message }),
        processMtdDeadline(supabase).then(() => { results.mtd = 'ok' }).catch(e => { results.mtd = e.message }),
        processInsuranceExpiry(supabase).then(() => { results.insurance = 'ok' }).catch(e => { results.insurance = e.message }),
        processComplianceScore(supabase).then(() => { results.compliance = 'ok' }).catch(e => { results.compliance = e.message }),
      ]
      await Promise.allSettled(tasks)
    }

    console.log('\n═══ Completed ═══', results)
    return new Response(JSON.stringify({ success: true, type, results }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Fatal error in email-alerts:', error)
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
