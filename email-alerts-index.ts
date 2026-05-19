// ============================================================
// NEXLET — email-alerts Edge Function
// File: supabase/functions/email-alerts/index.ts
//
// Sends 4 branded transactional email types + 8 legacy alerts.
// Triggered by pg_cron or HTTP POST from frontend.
//
// NEW MODES (branded templates):
//   welcome              — HTTP POST     — Welcome / trial start
//   trial_expiry_warning — HTTP POST     — Trial expiry (direct)
//   cron_digest          — pg_cron       — Weekly compliance digest
//   cron_expiry          — pg_cron       — Daily cert expiry check
//   cron_trial           — pg_cron       — Daily trial expiry check
//
// LEGACY MODES (backward compatible):
//   daily                — pg_cron       — 7 daily alert types
//   weekly_summary       — pg_cron       — Weekly portfolio summary
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── Environment ──────────────────────────────────────────────
const RESEND_API_KEY        = Deno.env.get("RESEND_API_KEY")!
const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const FROM_EMAIL            = "documents@nexlet.co.uk"
const APP_URL               = "https://nexlet.co.uk"

// ── Brand colours ───────────────────────────────────────────
const NAVY  = "#1A2B45"
const BLUE  = "#3B6FE8"
const GREEN = "#00A87A"
const AMBER = "#D97706"
const RED   = "#E53E3E"
const BG    = "#F4F6F9"
const MUTED = "#8899B0"

// ── Alert thresholds ────────────────────────────────────────
const CERT_DAYS_BEFORE        = [60, 30, 14, 7]
const INSURANCE_DAYS_BEFORE   = [60, 30]
const MTD_DAYS_BEFORE         = [30, 14, 7]
const MAINTENANCE_OVERDUE_DAYS = 7
const AWAAB_BREACH_DAYS       = 14
const RENT_OVERDUE_DAYS       = 1
const COMPLIANCE_THRESHOLD    = 70
const TRIAL_WARNING_DAYS      = [25, 30]
const AWAAB_KEYWORDS = ['damp', 'mould', 'mold', 'condensation', 'leak', 'water ingress', 'black mould']

// ════════════════════════════════════════════════════════════
// SUPABASE CLIENT (service role)
// ════════════════════════════════════════════════════════════

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
  })
}

// ════════════════════════════════════════════════════════════
// EMAIL DEDUPLICATION
// ════════════════════════════════════════════════════════════

async function alreadySent(
  sb: ReturnType<typeof getSupabase>, userId: string,
  alertType: string, referenceKey: string
): Promise<boolean> {
  const { data, error } = await sb.from('email_log').select('id')
    .eq('landlord_id', userId).eq('alert_type', alertType)
    .eq('reference_key', referenceKey).maybeSingle()
  if (error) console.error('[alreadySent]', error.message)
  return !!data
}

async function markSent(
  sb: ReturnType<typeof getSupabase>, userId: string,
  alertType: string, referenceKey: string,
  recipientEmail: string, metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await sb.from('email_log').upsert({
    landlord_id: userId, alert_type: alertType,
    reference_key: referenceKey, recipient_email: recipientEmail, metadata
  }, { onConflict: 'landlord_id,alert_type,reference_key' })
  if (error) console.error('[markSent]', error.message)
}

// ════════════════════════════════════════════════════════════
// RESEND — SEND EMAIL
// ════════════════════════════════════════════════════════════

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: `NexLet <${FROM_EMAIL}>`, to, subject, html })
    })
    if (!res.ok) { const err = await res.text(); console.error('[Resend] HTTP', res.status, err.slice(0, 300)) }
    return res.ok
  } catch (e) { console.error('[sendEmail] exception:', e); return false }
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0,0,0,0)
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

async function getLandlordEmail(sb: ReturnType<typeof getSupabase>, userId: string): Promise<string | null> {
  try {
    const { data, error } = await sb.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) return null
    return data.user.email
  } catch (e) { console.error('[getLandlordEmail]', e); return null }
}

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function firstNameFromProfile(profile: any): string {
  if (!profile?.full_name) return 'there'
  return (profile.full_name as string).trim().split(' ')[0] || 'there'
}

// ════════════════════════════════════════════════════════════
// BRANDED EMAIL WRAPPER (master template for 4 new types)
// ════════════════════════════════════════════════════════════

interface BrandedEmail {
  subject: string; preheader?: string; heading: string;
  bodyHtml: string; ctaUrl: string; ctaText: string;
}

function wrapBrandedEmail(e: BrandedEmail): string {
  const ph = e.preheader ? `
    <div style="display:none;font-size:1px;color:#FFFFFF;line-height:1px;max-height:0;opacity:0;overflow:hidden;">${e.preheader}</div>` : ''
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escHtml(e.subject)}</title></head>
<body style="margin:0;padding:0;background-color:${BG};font-family:Inter,Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">${ph}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(26,43,69,0.08);">
        <tr><td style="background:${NAVY};padding:28px 32px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td><span style="color:#FFFFFF;font-size:24px;font-weight:700;letter-spacing:0.5px;">NEXLET</span><br><span style="color:${MUTED};font-size:12px;font-weight:400;">UK Landlord Compliance</span></td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 32px 8px;">
          <h2 style="margin:0 0 16px;color:${NAVY};font-size:18px;font-weight:700;line-height:1.4;">${e.heading}</h2>
          <div style="color:#4A5568;font-size:15px;line-height:1.7;">${e.bodyHtml}</div>
        </td></tr>
        <tr><td style="padding:20px 32px 32px;">
          <a href="${e.ctaUrl}" style="display:inline-block;background:${BLUE};color:#FFFFFF;padding:14px 32px;border-radius:24px;text-decoration:none;font-size:15px;font-weight:600;">${e.ctaText} &rarr;</a>
        </td></tr>
        <tr><td style="padding:20px 32px;background:${BG};border-top:1px solid #E2E8F0;">
          <p style="margin:0;color:${MUTED};font-size:11px;line-height:1.6;text-align:center;">NexLet Ltd &middot; UK Landlord Compliance Platform<br><a href="#" style="color:${MUTED};">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// ════════════════════════════════════════════════════════════
// LEGACY BRANDED EMAIL (for 8 original alert types)
// ════════════════════════════════════════════════════════════

type BadgeStyle = 'critical' | 'warning' | 'info' | 'success'
const BADGE_COLOURS: Record<BadgeStyle, string> = {
  critical: '#DC2626', warning: '#D97706', info: '#2563EB', success: '#059669'
}

interface EmailOpts {
  badgeStyle: BadgeStyle; badgeText: string; heading: string;
  bodyHtml: string; ctaUrl: string; ctaText: string; footerNote?: string;
}

function buildLegacyEmail(opts: EmailOpts): string {
  const bc = BADGE_COLOURS[opts.badgeStyle]
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escHtml(opts.heading)}</title></head>
<body style="margin:0;padding:0;background-color:#EFF6FF;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(27,58,107,0.10);">
        <tr><td style="background:linear-gradient(135deg,#1B3A6B 0%,#1E4D8C 100%);padding:32px 40px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td><span style="font-size:26px;vertical-align:middle;">\uD83C\uDFE0</span><span style="color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:-0.3px;vertical-align:middle;margin-left:8px;">NexLet</span></td>
            <td align="right"><span style="display:inline-block;background:${bc};color:#FFFFFF;font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;padding:5px 12px;border-radius:20px;">${opts.badgeText}</span></td></tr>
          </table>
        </td></tr>
        <tr><td style="background:${bc};height:4px;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:36px 40px 8px;">
          <h2 style="margin:0 0 16px;color:#1B3A6B;font-size:20px;font-weight:700;line-height:1.3;">${opts.heading}</h2>
          <div style="color:#374151;font-size:14px;line-height:1.7;">${opts.bodyHtml}</div>
        </td></tr>
        <tr><td style="padding:28px 40px 36px;">
          <a href="${opts.ctaUrl}" style="display:inline-block;background:#1B3A6B;color:#FFFFFF;padding:13px 26px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.2px;">${opts.ctaText} &rarr;</a>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
          <p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.5;">${opts.footerNote ?? 'This is an automated alert from NexLet.'} &nbsp;&bull;&nbsp; <a href="${APP_URL}" style="color:#1B3A6B;text-decoration:none;">nexlet.co.uk</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 1 — COMPLIANCE DIGEST (cron_digest)
// ════════════════════════════════════════════════════════════

interface PropertyDigest { address: string; score: number; outstanding: number }

function buildDigestHtml(firstName: string, overallScore: number, properties: PropertyDigest[], totalProps: number, activeTenancies: number, totalOutstanding: number): string {
  const needsAction = overallScore < 80
  const propRows = properties.map(p => {
    const sc = p.score < 50 ? RED : p.score < 80 ? AMBER : GREEN
    return `<tr style="border-bottom:1px solid #EDF2F7;">
      <td style="padding:12px 4px;color:${NAVY};font-size:14px;line-height:1.4;">${escHtml(p.address)}</td>
      <td style="padding:12px 4px;text-align:center;"><span style="display:inline-block;background:${sc};color:#FFFFFF;font-size:12px;font-weight:700;padding:3px 8px;border-radius:10px;">${p.score}%</span></td>
      <td style="padding:12px 4px;text-align:center;color:${p.outstanding ? RED : NAVY};font-size:14px;font-weight:600;">${p.outstanding}</td>
    </tr>`
  }).join('')

  const alertBanner = needsAction ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:6px;padding:12px 16px;margin:0 0 24px;">
    <tr><td style="width:20px;vertical-align:top;"><span style="font-size:14px;">&#9888;</span></td>
    <td style="color:#9A3412;font-size:13px;line-height:1.5;">Action required &mdash; ${totalOutstanding} outstanding compliance item${totalOutstanding !== 1 ? 's' : ''} across your properties.</td></tr>
  </table>` : ''

  const bodyHtml = `
    <p style="margin:0 0 8px;color:${NAVY};font-size:16px;font-weight:700;line-height:1.5;">Hi ${escHtml(firstName)},</p>
    <p style="margin:0 0 24px;color:#4A5568;font-size:15px;line-height:1.6;">Here&#39;s your weekly compliance summary.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY};border-radius:8px;padding:24px 24px;margin:0 0 24px;">
      <tr><td align="center"><span style="display:block;color:#FFFFFF;font-size:48px;font-weight:700;line-height:1;">${overallScore}<small style="font-size:24px;">%</small></span>
      <span style="display:block;color:${MUTED};font-size:14px;margin-top:4px;">${needsAction ? 'Action Required' : 'Good Standing'}</span></td></tr>
    </table>
    ${alertBanner}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;">
      <tr style="border-bottom:2px solid #E2E8F0;"><td style="padding:10px 0;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Address</td>
      <td style="padding:10px 0;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:center;width:80px;">Score</td>
      <td style="padding:10px 0;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:center;width:80px;">Items</td></tr>
      ${propRows}
    </table>
    <p style="margin:0 0 4px;color:#64748B;font-size:11px;line-height:1.5;">&#9632; 80&ndash;100% Good &nbsp; &#9632; 50&ndash;79% Action &nbsp; &#9632; 0&ndash;49% Critical</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr><td style="color:#64748B;font-size:13px;line-height:1.8;">${totalProps} propert${totalProps === 1 ? 'y' : 'ies'} &middot; ${activeTenancies} active tenanc${activeTenancies === 1 ? 'y' : 'ies'} &middot; ${totalOutstanding} outstanding item${totalOutstanding !== 1 ? 's' : ''}</td></tr>
    </table>`

  return wrapBrandedEmail({
    subject: `Your NEXLET Compliance Summary \u2014 ${fmtDate(new Date())}`,
    preheader: `Compliance: ${overallScore}% \u00B7 ${totalOutstanding} items need attention`,
    heading: `Compliance Summary \u2014 ${fmtDate(new Date())}`,
    bodyHtml, ctaUrl: `${APP_URL}/landlord.html`, ctaText: 'View Full Dashboard'
  })
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 2 — CERTIFICATE EXPIRY ALERT (cron_expiry)
// ════════════════════════════════════════════════════════════

function buildCertExpiryHtml(firstName: string, certType: string, propAddress: string, expiryDate: string, daysRemaining: number): string {
  const urgency = daysRemaining <= 14 ? RED : AMBER
  const borderC = daysRemaining <= 14 ? RED : AMBER
  const alertBg = daysRemaining <= 14 ? '#FFF5F5' : '#FFFDF5'

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${alertBg};border-left:4px solid ${borderC};border-radius:4px;padding:16px 20px;margin:0 0 8px;">
      <tr><td style="width:24px;vertical-align:top;"><span style="font-size:18px;">&#9888;</span></td>
      <td style="color:${urgency};font-size:14px;font-weight:700;line-height:1.4;">Certificate expiring in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</td></tr>
    </table>
    <p style="margin:0 0 16px;color:#4A5568;font-size:15px;line-height:1.6;">Hi ${escHtml(firstName)}, a certificate for one of your properties requires renewal.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:6px;padding:16px 20px;margin:0 0 16px;">
      <tr><td style="color:#64748B;font-size:12px;padding-bottom:2px;">Certificate type</td></tr>
      <tr><td style="color:${NAVY};font-size:15px;font-weight:600;padding-bottom:12px;">${escHtml(certType)}</td></tr>
      <tr><td style="color:#64748B;font-size:12px;padding-bottom:2px;">Property</td></tr>
      <tr><td style="color:${NAVY};font-size:14px;padding-bottom:12px;">${escHtml(propAddress)}</td></tr>
      <tr><td style="color:#64748B;font-size:12px;padding-bottom:2px;">Expiry date</td></tr>
      <tr><td style="color:${urgency};font-size:15px;font-weight:600;padding-bottom:12px;">${fmtDate(expiryDate)}</td></tr>
      <tr><td style="color:#64748B;font-size:12px;padding-bottom:2px;">Days remaining</td></tr>
      <tr><td style="color:${urgency};font-size:16px;font-weight:700;">${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</td></tr>
    </table>
    <p style="margin:0 0 4px;color:#64748B;font-size:13px;line-height:1.6;">Uploading a renewed certificate keeps your compliance score accurate and protects you from enforcement action.</p>`

  return wrapBrandedEmail({
    subject: `${daysRemaining <= 14 ? '\u26A0\uFE0F ' : ''}Certificate expiring in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} \u2014 ${propAddress}`,
    preheader: `${certType} expires ${fmtDate(expiryDate)} \u2014 ${daysRemaining} days left`,
    heading: 'Certificate Expiry Alert',
    bodyHtml, ctaUrl: `${APP_URL}/landlord.html#compliance`, ctaText: 'Upload Renewed Certificate'
  })
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 3 — WELCOME / TRIAL START (welcome)
// ════════════════════════════════════════════════════════════

function buildWelcomeHtml(firstName: string): string {
  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ECFDF5;border-radius:6px;padding:14px 20px;margin:0 0 16px;">
      <tr><td style="color:#065F46;font-size:15px;font-weight:600;">&#10003; Your 30-day free trial has started</td></tr>
    </table>
    <p style="margin:0 0 8px;color:${NAVY};font-size:16px;font-weight:700;line-height:1.5;">Hi ${escHtml(firstName)}, welcome to NEXLET.</p>
    <p style="margin:0 0 24px;color:#4A5568;font-size:15px;line-height:1.6;">You have 30 days free &mdash; no card required. Here&#39;s how to get started:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px;padding:16px 20px;margin:0 0 12px;">
      <tr><td style="width:36px;vertical-align:top;"><span style="font-size:22px;">&#127968;</span></td>
      <td><p style="margin:0;color:${NAVY};font-size:15px;font-weight:600;line-height:1.5;">Add your first property</p>
      <p style="margin:4px 0 0;color:#64748B;font-size:13px;line-height:1.5;">Enter the address, type, and rental details for each property you manage.</p></td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px;padding:16px 20px;margin:0 0 12px;">
      <tr><td style="width:36px;vertical-align:top;"><span style="font-size:22px;">&#128196;</span></td>
      <td><p style="margin:0;color:${NAVY};font-size:15px;font-weight:600;line-height:1.5;">Upload your compliance certificates</p>
      <p style="margin:4px 0 0;color:#64748B;font-size:13px;line-height:1.5;">Gas safety, EICR, EPC &mdash; scan or upload and our AI extracts the key dates.</p></td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px;padding:16px 20px;margin:0 0 8px;">
      <tr><td style="width:36px;vertical-align:top;"><span style="font-size:22px;">&#128101;</span></td>
      <td><p style="margin:0;color:${NAVY};font-size:15px;font-weight:600;line-height:1.5;">Add your tenants</p>
      <p style="margin:4px 0 0;color:#64748B;font-size:13px;line-height:1.5;">Invite tenants to their own portal for maintenance requests, document access, and e-signing.</p></td></tr>
    </table>
    <p style="margin:24px 0 4px;color:#64748B;font-size:13px;line-height:1.5;">Need help? Reply to this email or contact <a href="mailto:${FROM_EMAIL}" style="color:${BLUE};">${FROM_EMAIL}</a>.</p>`

  return wrapBrandedEmail({
    subject: 'Welcome to NEXLET \u2014 your 30-day free trial has started',
    preheader: '30 days free \u2014 no card required',
    heading: 'Welcome to NEXLET',
    bodyHtml, ctaUrl: `${APP_URL}/landlord.html`, ctaText: 'Go to Dashboard'
  })
}

// ════════════════════════════════════════════════════════════
// TEMPLATE 4 — TRIAL EXPIRY WARNING (cron_trial)
// ════════════════════════════════════════════════════════════

interface TrialStats { propertyCount: number; certCount: number; complianceScore: number }

function buildTrialExpiryHtml(firstName: string, expiryDate: string, daysLeft: number, stats: TrialStats): string {
  const scoreC = stats.complianceScore < 50 ? RED : stats.complianceScore < 80 ? AMBER : GREEN
  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF5;border-radius:6px;padding:14px 20px;margin:0 0 16px;">
      <tr><td style="color:#9A3412;font-size:15px;font-weight:600;">&#9200; Trial ending &mdash; ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</td></tr>
    </table>
    <p style="margin:0 0 8px;color:${NAVY};font-size:16px;font-weight:700;line-height:1.5;">Hi ${escHtml(firstName)},</p>
    <p style="margin:0 0 4px;color:#4A5568;font-size:15px;line-height:1.6;">Your 30-day free trial ends on <strong style="color:${NAVY};">${fmtDate(expiryDate)}</strong>.</p>
    <p style="margin:0 0 24px;color:#64748B;font-size:13px;line-height:1.6;">After this date, your compliance records and tenant documents will become read-only.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FA;border-radius:6px;padding:20px 24px;margin:0 0 24px;">
      <tr><td align="center" style="padding:0 12px;"><span style="display:block;color:${NAVY};font-size:22px;font-weight:700;">${stats.propertyCount}</span>
      <span style="display:block;color:#64748B;font-size:11px;margin-top:2px;">Properties</span></td>
      <td align="center" style="padding:0 12px;"><span style="display:block;color:${NAVY};font-size:22px;font-weight:700;">${stats.certCount}</span>
      <span style="display:block;color:#64748B;font-size:11px;margin-top:2px;">Certificates</span></td>
      <td align="center" style="padding:0 12px;"><span style="display:block;color:${scoreC};font-size:22px;font-weight:700;">${stats.complianceScore}%</span>
      <span style="display:block;color:#64748B;font-size:11px;margin-top:2px;">Compliance</span></td></tr>
    </table>
    <p style="margin:0 0 20px;color:#4A5568;font-size:14px;line-height:1.6;">Upgrade to keep access to your compliance records, certificates and tenant documents.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden;margin:0 0 16px;">
      <tr><td style="padding:14px 16px;border-right:1px solid #E2E8F0;text-align:center;vertical-align:top;width:33%;">
        <p style="margin:0 0 4px;color:${NAVY};font-size:14px;font-weight:700;">Starter</p>
        <p style="margin:0 0 2px;color:${NAVY};font-size:18px;font-weight:700;">&pound;4.99<span style="font-size:12px;color:#64748B;font-weight:400;">/mo</span></p>
        <p style="margin:4px 0 0;color:#64748B;font-size:11px;line-height:1.4;">Up to 2 properties</p></td>
      <td style="padding:14px 16px;border-right:1px solid #E2E8F0;text-align:center;vertical-align:top;width:33%;background:#F0F4FA;">
        <p style="margin:0 0 4px;color:${NAVY};font-size:14px;font-weight:700;">Landlord</p>
        <p style="margin:0 0 2px;color:${NAVY};font-size:18px;font-weight:700;">&pound;11.99<span style="font-size:12px;color:#64748B;font-weight:400;">/mo</span></p>
        <p style="margin:4px 0 0;color:#64748B;font-size:11px;line-height:1.4;">Up to 10 properties</p>
        <span style="display:inline-block;background:${BLUE};color:#FFFFFF;font-size:10px;font-weight:600;padding:2px 8px;border-radius:8px;margin-top:6px;">Most popular</span></td>
      <td style="padding:14px 16px;text-align:center;vertical-align:top;width:33%;">
        <p style="margin:0 0 4px;color:${NAVY};font-size:14px;font-weight:700;">Portfolio</p>
        <p style="margin:0 0 2px;color:${NAVY};font-size:18px;font-weight:700;">&pound;23.99<span style="font-size:12px;color:#64748B;font-weight:400;">/mo</span></p>
        <p style="margin:4px 0 0;color:#64748B;font-size:11px;line-height:1.4;">Unlimited properties</p></td></tr>
    </table>
    <p style="margin:0 0 4px;color:${MUTED};font-size:11px;line-height:1.5;text-align:center;">Founding member pricing &mdash; first 100 users only. Locks in for life.</p>`

  return wrapBrandedEmail({
    subject: `Your NEXLET trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    preheader: `${daysLeft} days left \u00B7 ${stats.propertyCount} propert${stats.propertyCount === 1 ? 'y' : 'ies'} \u00B7 Choose a plan`,
    heading: `Your Trial Ends in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`,
    bodyHtml, ctaUrl: `${APP_URL}/profile.html#pricing`, ctaText: 'Choose a Plan'
  })
}

// ════════════════════════════════════════════════════════════
// COMPUTE PROPERTY COMPLIANCE SCORE
// ════════════════════════════════════════════════════════════

async function computePropertyScore(sb: ReturnType<typeof getSupabase>, propId: string): Promise<{ score: number; outstanding: number }> {
  const { data: certs, error } = await sb
    .from('certificates').select('cert_type, expiry_date, has_file, status').eq('prop_id', propId)
  if (error || !certs) return { score: 100, outstanding: 0 }

  const mandatoryTypes = ['gas_safety', 'eicr', 'electrical', 'epc', 'energy', 'deposit', 'gas', 'electrical_safety']
  const today = new Date(); today.setHours(0, 0, 0, 0)
  let compliant = 0, outstanding = 0

  for (const mt of mandatoryTypes) {
    const matched = certs.filter((c: any) => {
      const ct = (c.cert_type || c.type || '').toLowerCase().replace(/[ _-]/g, '_')
      const mtN = mt.toLowerCase().replace(/[ _-]/g, '_')
      return ct.includes(mtN) || mtN.includes(ct)
    })
    if (matched.length === 0) { outstanding++; continue }
    const hasValid = matched.some((c: any) => {
      const exp = c.expiry_date || c.expiry
      if (!exp) return c.status !== 'expired'
      const expDate = new Date(exp); expDate.setHours(0, 0, 0, 0)
      return expDate >= today
    })
    hasValid ? compliant++ : outstanding++
  }
  return { score: mandatoryTypes.length ? Math.round((compliant / mandatoryTypes.length) * 100) : 100, outstanding }
}

// ════════════════════════════════════════════════════════════
// NEW PROCESSOR — COMPLIANCE DIGEST (cron_digest)
// ════════════════════════════════════════════════════════════

async function processComplianceDigest(sb: ReturnType<typeof getSupabase>) {
  console.log('\u2192 Processing: Compliance Digest (newsletter)')

  const { data: profiles, error } = await sb
    .from('user_profiles').select('user_id, full_name').eq('newsletter_opted_in', true)
  if (error) { console.error('[digest] profile query error:', error.message); return }
  if (!profiles?.length) { console.log('  (no opted-in users)'); return }

  const currentWeek = isoWeek(); let sent = 0

  for (const profile of profiles) {
    const userId = profile.user_id
    const firstName = firstNameFromProfile(profile)
    const refKey = `digest_${userId}_${currentWeek}`
    if (await alreadySent(sb, userId, 'compliance_digest', refKey)) continue

    const email = await getLandlordEmail(sb, userId)
    if (!email) continue

    const { data: properties, error: propErr } = await sb
      .from('properties').select('id, address, status').eq('user_id', userId).neq('status', 'archived')
    if (propErr || !properties?.length) continue

    const propDigests: PropertyDigest[] = []
    for (const prop of properties) {
      const { score, outstanding } = await computePropertyScore(sb, prop.id)
      propDigests.push({ address: prop.address, score, outstanding })
    }

    const overallScore = propDigests.length > 0
      ? Math.round(propDigests.reduce((s, p) => s + p.score, 0) / propDigests.length) : 100
    const totalOutstanding = propDigests.reduce((s, p) => s + p.outstanding, 0)

    const { count: activeTenancies } = await sb
      .from('tenants').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active')

    const html = buildDigestHtml(firstName, overallScore, propDigests, properties.length, activeTenancies ?? 0, totalOutstanding)
    const subject = `Your NEXLET Compliance Summary \u2014 ${fmtDate(new Date())}`

    const ok = await sendEmail(email, subject, html)
    if (ok) {
      await markSent(sb, userId, 'compliance_digest', refKey, email, {
        subject, template_id: 'compliance_digest', status: 'sent', overall_score: overallScore, property_count: properties.length
      })
      console.log(`  \u2713 Digest sent: ${email} | score: ${overallScore}%`); sent++
    }
  }
  console.log(`  Digest complete: ${sent} sent, ${profiles.length} opted-in users`)
}

// ════════════════════════════════════════════════════════════
// NEW PROCESSOR — CERTIFICATE EXPIRY CHECK (cron_expiry)
// ════════════════════════════════════════════════════════════

async function processCertExpiryCheck(sb: ReturnType<typeof getSupabase>) {
  console.log('\u2192 Processing: Certificate Expiry Check')

  const { data: profiles } = await sb.from('user_profiles').select('user_id, full_name').eq('newsletter_opted_in', true)
  if (!profiles?.length) { console.log('  (no opted-in users)'); return }
  const optedInIds = profiles.map((p: any) => p.user_id)

  const { data: certs, error } = await sb.from('certificates').select(`
      id, cert_type, expiry_date, prop_id,
      properties!inner ( id, address, user_id )
    `).not('expiry_date', 'is', null)
    .gte('expiry_date', new Date().toISOString().split('T')[0])
    .lte('expiry_date', new Date(Date.now() + 61 * 86400000).toISOString().split('T')[0])

  if (error) { console.error('[cert-expiry] query error:', error.message); return }
  if (!certs?.length) { console.log('  (no certs expiring)'); return }

  let sent = 0
  for (const cert of certs) {
    const property = (cert as any).properties
    const userId = property?.user_id
    if (!userId || !optedInIds.includes(userId)) continue

    const days = daysUntil(cert.expiry_date)
    if (!CERT_DAYS_BEFORE.includes(days)) continue

    const certLabel = (cert.cert_type || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Certificate'
    const refKey = `cert_expiry_${cert.id}_${days}d`
    if (await alreadySent(sb, userId, 'cert_expiry', refKey)) continue

    const email = await getLandlordEmail(sb, userId)
    if (!email) continue

    const profile = profiles.find((p: any) => p.user_id === userId)
    const firstName = firstNameFromProfile(profile)

    const html = buildCertExpiryHtml(firstName, certLabel, property?.address ?? 'Your property', cert.expiry_date, days)
    const subject = `${days <= 14 ? '\u26A0\uFE0F ' : ''}Certificate expiring in ${days} days \u2014 ${property?.address ?? ''}`

    const ok = await sendEmail(email, subject, html)
    if (ok) {
      await markSent(sb, userId, 'cert_expiry', refKey, email, {
        subject, template_id: 'cert_expiry', status: 'sent', cert_id: cert.id, days_before: days
      })
      console.log(`  \u2713 Cert expiry sent: ${email} | ${certLabel} | ${days}d`); sent++
    }
  }
  console.log(`  Cert expiry complete: ${sent} sent`)
}

// ════════════════════════════════════════════════════════════
// NEW PROCESSOR — WELCOME (HTTP POST)
// ════════════════════════════════════════════════════════════

async function processWelcome(sb: ReturnType<typeof getSupabase>, userId: string, email: string, firstName: string) {
  console.log('\u2192 Processing: Welcome email')
  const refKey = `welcome_${userId}`
  if (await alreadySent(sb, userId, 'welcome', refKey)) { console.log('  (already sent)'); return }
  const html = buildWelcomeHtml(firstName || 'there')
  const subject = 'Welcome to NEXLET \u2014 your 30-day free trial has started'
  const ok = await sendEmail(email, subject, html)
  if (ok) {
    await markSent(sb, userId, 'welcome', refKey, email, { subject, template_id: 'welcome', status: 'sent' })
    console.log(`  \u2713 Welcome sent: ${email}`)
  }
}

// ════════════════════════════════════════════════════════════
// NEW PROCESSOR — TRIAL EXPIRY CHECK (cron_trial)
// ════════════════════════════════════════════════════════════

async function processTrialExpiryCheck(sb: ReturnType<typeof getSupabase>) {
  console.log('\u2192 Processing: Trial Expiry Warnings')
  const { data: profiles, error } = await sb
    .from('user_profiles').select('user_id, full_name, trial_expires_at').not('trial_expires_at', 'is', null)
  if (error) { console.error('[trial] profile query error:', error.message); return }
  if (!profiles?.length) { console.log('  (no trial users)'); return }

  let sent = 0
  for (const profile of profiles) {
    const userId = profile.user_id
    const trialEndStr = profile.trial_expires_at
    if (!trialEndStr) continue

    const daysLeft = daysUntil(trialEndStr)
    if (!TRIAL_WARNING_DAYS.includes(daysLeft)) continue

    const refKey = `trial_expiry_${userId}_${daysLeft}d`
    if (await alreadySent(sb, userId, 'trial_expiry', refKey)) continue

    const { data: sub } = await sb.from('stripe_subscriptions').select('id, status').eq('user_id', userId).maybeSingle()
    if (sub && ['active', 'trialing'].includes((sub as any).status)) continue

    const email = await getLandlordEmail(sb, userId)
    if (!email) continue

    const firstName = firstNameFromProfile(profile)

    const { count: propCount } = await sb.from('properties').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    const propIds = (await sb.from('properties').select('id').eq('user_id', userId)).data?.map((p: any) => p.id) ?? []
    const { count: certCount } = await sb.from('certificates').select('*', { count: 'exact', head: true }).in('prop_id', propIds.length ? propIds : ['__none__'])
    const { data: scoreData } = await sb.rpc('get_compliance_score', { p_landlord_id: userId })
    const complianceScore = Number(scoreData ?? 100)

    const html = buildTrialExpiryHtml(firstName, trialEndStr, daysLeft, { propertyCount: propCount ?? 0, certCount: certCount ?? 0, complianceScore })
    const subject = `Your NEXLET trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`

    const ok = await sendEmail(email, subject, html)
    if (ok) {
      await markSent(sb, userId, 'trial_expiry', refKey, email, {
        subject, template_id: 'trial_expiry', status: 'sent', days_left: daysLeft, trial_ends_at: trialEndStr
      })
      console.log(`  \u2713 Trial warning sent: ${email} | ${daysLeft} days left`); sent++
    }
  }
  console.log(`  Trial check complete: ${sent} sent`)
}

// ════════════════════════════════════════════════════════════
// NEW PROCESSOR — TRIAL EXPIRY DIRECT (HTTP POST)
// ════════════════════════════════════════════════════════════

async function processTrialExpiryDirect(sb: ReturnType<typeof getSupabase>, userId: string, email: string, firstName: string, trialEndStr: string) {
  console.log('\u2192 Processing: Trial Expiry Warning (direct)')
  const daysLeft = daysUntil(trialEndStr)
  const refKey = `trial_expiry_${userId}_${daysLeft}d`
  if (await alreadySent(sb, userId, 'trial_expiry', refKey)) { console.log('  (already sent)'); return }

  const { count: propCount } = await sb.from('properties').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  const propIds = (await sb.from('properties').select('id').eq('user_id', userId)).data?.map((p: any) => p.id) ?? []
  const { count: certCount } = await sb.from('certificates').select('*', { count: 'exact', head: true }).in('prop_id', propIds.length ? propIds : ['__none__'])
  const { data: scoreData } = await sb.rpc('get_compliance_score', { p_landlord_id: userId })
  const complianceScore = Number(scoreData ?? 100)

  const html = buildTrialExpiryHtml(firstName || 'there', trialEndStr, daysLeft, { propertyCount: propCount ?? 0, certCount: certCount ?? 0, complianceScore })
  const subject = `Your NEXLET trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
  const ok = await sendEmail(email, subject, html)
  if (ok) {
    await markSent(sb, userId, 'trial_expiry', refKey, email, { subject, template_id: 'trial_expiry', status: 'sent', days_left: daysLeft })
    console.log(`  \u2713 Trial warning sent: ${email}`)
  }
}

// ════════════════════════════════════════════════════════════
// LEGACY PROCESSORS (full implementations from Sprint 10)
// Called when type = 'daily' or 'weekly_summary'
// ════════════════════════════════════════════════════════════

// LEGACY ALERT 1 — CERTIFICATE EXPIRING
async function lProcessCertExpiry(sb: ReturnType<typeof getSupabase>) {
  console.log('\u2192 Processing [legacy]: Certificate Expiry')

  const { data: certs, error } = await sb.from('certificates').select(`
      id, cert_type, expiry_date,
      properties!inner ( id, address, landlord_id )
    `).not('expiry_date', 'is', null)
    .gte('expiry_date', new Date().toISOString().split('T')[0])
    .lte('expiry_date', new Date(Date.now() + 61 * 86400000).toISOString().split('T')[0])

  if (error) { console.error('cert query error:', error.message); return }
  if (!certs?.length) return

  for (const cert of certs) {
    const property = (cert as any).properties
    const landlordId = property?.landlord_id
    const days = daysUntil(cert.expiry_date)
    if (!CERT_DAYS_BEFORE.includes(days)) continue

    const certLabel = cert.cert_type?.replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? 'Certificate'
    const refKey = `cert_${cert.id}_${days}d`
    const alertType = 'cert_expiry'
    if (await alreadySent(sb, landlordId, alertType, refKey)) continue

    const email = await getLandlordEmail(sb, landlordId)
    if (!email) continue

    const urgency = days <= 14 ? 'critical' as BadgeStyle : days <= 30 ? 'warning' as BadgeStyle : 'info' as BadgeStyle
    const html = buildLegacyEmail({
      badgeStyle: urgency, badgeText: `${days} DAYS REMAINING`,
      heading: `${certLabel} Expiring \u2014 Action Required`,
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
        <p style="color:#6B7280;font-size:13px;">Book a renewal now to maintain compliance and avoid penalties.</p>`,
      ctaUrl: `${APP_URL}/certificates`, ctaText: 'View Certificate',
      footerNote: 'Compliance alert \u2014 sent by your NexLet account.'
    })

    const ok = await sendEmail(email, `\u26A0 ${certLabel} expires in ${days} days \u2014 ${property?.address ?? ''}`, html)
    if (ok) {
      await markSent(sb, landlordId, alertType, refKey, email, { cert_id: cert.id, days_before: days })
      console.log(`  \u2713 Cert expiry sent: ${email} | ${certLabel} | ${days}d`)
    }
  }
}

// LEGACY ALERT 2 — RENT OVERDUE
async function lProcessRentOverdue(sb: ReturnType<typeof getSupabase>) {
  console.log('\u2192 Processing [legacy]: Rent Overdue')
  const yesterday = new Date(Date.now() - RENT_OVERDUE_DAYS * 86400000).toISOString().split('T')[0]

  const { data: tenancies, error } = await sb.from('tenants').select(`
      id, name, rent, next_rent_due,
      properties!inner ( id, address, landlord_id:user_id )
    `).eq('status', 'active').not('next_rent_due', 'is', null).lte('next_rent_due', yesterday)

  if (error) { console.error('rent query error:', error.message); return }
  if (!tenancies?.length) return

  for (const t of tenancies) {
    const property = (t as any).properties
    const landlordId = property?.landlord_id || property?.user_id
    const dueDateStr = t.next_rent_due
    const refKey = `rent_overdue_${t.id}_${dueDateStr}`
    if (await alreadySent(sb, landlordId, 'rent_overdue', refKey)) continue

    const email = await getLandlordEmail(sb, landlordId)
    if (!email) continue

    const html = buildLegacyEmail({
      badgeStyle: 'critical', badgeText: 'RENT OVERDUE', heading: 'Rent Payment Overdue',
      bodyHtml: `<p>A rent payment is <strong>overdue</strong> for one of your properties.</p>
        <table role="presentation" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;">
          <tr><td style="color:#64748B;font-size:13px;">Property</td></tr>
          <tr><td style="color:#1B3A6B;font-weight:600;font-size:15px;">${property?.address ?? 'Your property'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Tenant</td></tr>
          <tr><td style="color:#374151;font-size:14px;">${(t as any).name ?? 'Tenant'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Amount Due</td></tr>
          <tr><td style="color:#DC2626;font-weight:700;font-size:16px;">\u00A3${Number((t as any).rent ?? 0).toFixed(2)}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Due Date</td></tr>
          <tr><td style="color:#DC2626;font-weight:600;font-size:14px;">${fmtDate(dueDateStr)}</td></tr>
        </table>`,
      ctaUrl: `${APP_URL}/rent`, ctaText: 'View Rent Tracker',
      footerNote: 'Rent alert \u2014 sent by your NexLet account.'
    })

    const ok = await sendEmail(email, `\uD83D\uDD34 Rent overdue \u2014 ${property?.address ?? 'Your property'}`, html)
    if (ok) {
      await markSent(sb, landlordId, 'rent_overdue', refKey, email, { tenancy_id: (t as any).id, due_date: dueDateStr })
      console.log(`  \u2713 Rent overdue sent: ${email}`)
    }
  }
}

// LEGACY ALERT 3 — MAINTENANCE JOB OVERDUE
async function lProcessMaintenanceOverdue(sb: ReturnType<typeof getSupabase>) {
  console.log('\u2192 Processing [legacy]: Maintenance Overdue')
  const cutoff = new Date(Date.now() - MAINTENANCE_OVERDUE_DAYS * 86400000).toISOString()

  const { data: jobs, error } = await sb.from('maintenance').select(`
      id, title, status, created_at:issue_date, updated_at:issue_date,
      properties!inner ( id, address, landlord_id:user_id )
    `).not('status', 'in', '("completed","closed","Completed","Closed")').lt('issue_date', cutoff)

  if (error) { console.error('maintenance query error:', error.message); return }
  if (!jobs?.length) return

  const currentWeek = isoWeek()
  for (const job of jobs) {
    const property = (job as any).properties
    const landlordId = property?.landlord_id || property?.user_id
    const refKey = `maint_overdue_${job.id}_${currentWeek}`
    if (await alreadySent(sb, landlordId, 'maintenance_overdue', refKey)) continue

    const email = await getLandlordEmail(sb, landlordId)
    if (!email) continue

    const updatedAt = (job as any).updated_at || (job as any).created_at || (job as any).issue_date
    const daysSinceUpdate = Math.round((Date.now() - new Date(updatedAt).getTime()) / 86400000)

    const html = buildLegacyEmail({
      badgeStyle: 'warning', badgeText: 'MAINTENANCE OVERDUE', heading: 'Maintenance Job Needs Attention',
      bodyHtml: `<p>A maintenance job has had <strong>no update for ${daysSinceUpdate} days</strong>.</p>
        <table role="presentation" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;">
          <tr><td style="color:#64748B;font-size:13px;">Job Title</td></tr>
          <tr><td style="color:#1B3A6B;font-weight:600;font-size:15px;">${job.title ?? 'Maintenance Job'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Property</td></tr>
          <tr><td style="color:#374151;font-size:14px;">${property?.address ?? 'Your property'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Status</td></tr>
          <tr><td style="color:#D97706;font-weight:600;font-size:14px;">${job.status ?? 'Open'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Last Updated</td></tr>
          <tr><td style="color:#D97706;font-weight:600;font-size:14px;">${fmtDate(updatedAt)} (${daysSinceUpdate} days ago)</td></tr>
        </table>`,
      ctaUrl: `${APP_URL}/maintenance`, ctaText: 'View Job',
      footerNote: 'Maintenance alert \u2014 sent by your NexLet account.'
    })

    const ok = await sendEmail(email, `\u26A0 Stale maintenance job \u2014 ${job.title ?? 'update required'}`, html)
    if (ok) {
      await markSent(sb, landlordId, 'maintenance_overdue', refKey, email, { job_id: job.id, days_since_update: daysSinceUpdate })
      console.log(`  \u2713 Maintenance overdue sent: ${email}`)
    }
  }
}

// LEGACY ALERT 4 — AWAAB'S LAW
async function lProcessAwaabLaw(sb: ReturnType<typeof getSupabase>) {
  console.log("\u2192 Processing [legacy]: Awaab's Law")
  const cutoff = new Date(Date.now() - AWAAB_BREACH_DAYS * 86400000).toISOString()
  const keywordFilter = AWAAB_KEYWORDS.map(k => `title.ilike.%${k}%`).join(',')

  const { data: jobs, error } = await sb.from('maintenance').select(`
      id, title, description, status, created_at:issue_date,
      properties!inner ( id, address, landlord_id:user_id )
    `).not('status', 'in', '("completed","closed","Completed","Closed")').lt('issue_date', cutoff).or(keywordFilter)

  if (error) { console.error('awaab query error:', error.message); return }
  if (!jobs?.length) return

  const currentWeek = isoWeek()
  for (const job of jobs) {
    const property = (job as any).properties
    const landlordId = property?.landlord_id || property?.user_id
    const refKey = `awaab_${job.id}_${currentWeek}`
    if (await alreadySent(sb, landlordId, 'awaab_law', refKey)) continue

    const email = await getLandlordEmail(sb, landlordId)
    if (!email) continue

    const createdAt = (job as any).created_at || (job as any).issue_date
    const daysOpen = Math.round((Date.now() - new Date(createdAt).getTime()) / 86400000)

    const html = buildLegacyEmail({
      badgeStyle: 'critical', badgeText: "AWAAB'S LAW \u2014 URGENT",
      heading: "Awaab's Law Breach Risk \u2014 Immediate Action Required",
      bodyHtml: `<p style="background:#FEF2F2;border-left:4px solid #DC2626;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
        <strong>Legal warning:</strong> Under Awaab's Law, landlords must investigate damp and mould hazards within <strong>14 days</strong>.</p>
        <p>The following job has been open for <strong>${daysOpen} days</strong>.</p>
        <table role="presentation" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;">
          <tr><td style="color:#64748B;font-size:13px;">Job Title</td></tr>
          <tr><td style="color:#DC2626;font-weight:700;font-size:15px;">${job.title ?? 'Damp/Mould Issue'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Property</td></tr>
          <tr><td style="color:#1B3A6B;font-weight:600;font-size:15px;">${property?.address ?? 'Your property'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Days Open</td></tr>
          <tr><td style="color:#DC2626;font-weight:700;font-size:16px;">${daysOpen} days (${daysOpen - 14} days over Awaab threshold)</td></tr>
        </table>`,
      ctaUrl: `${APP_URL}/maintenance`, ctaText: 'Take Action Now',
      footerNote: "Awaab's Law compliance alert \u2014 sent by your NexLet account."
    })

    const ok = await sendEmail(email, `\uD83D\uDEA8 URGENT: Awaab's Law breach risk \u2014 ${property?.address ?? 'your property'}`, html)
    if (ok) {
      await markSent(sb, landlordId, 'awaab_law', refKey, email, { job_id: job.id, days_open: daysOpen })
      console.log(`  \u2713 Awaab's Law alert sent: ${email}`)
    }
  }
}

// LEGACY ALERT 5 — MTD DEADLINE
async function lProcessMtdDeadline(sb: ReturnType<typeof getSupabase>) {
  console.log('\u2192 Processing [legacy]: MTD Deadlines')
  const { data: periods, error } = await sb.from('mtd_periods')
    .select('id, landlord_id, period_start, period_end, submission_deadline, tax_year, quarter, status')
    .eq('status', 'pending')
    .gte('submission_deadline', new Date().toISOString().split('T')[0])
    .lte('submission_deadline', new Date(Date.now() + 31 * 86400000).toISOString().split('T')[0])

  if (error) { console.error('MTD query error:', error.message); return }
  if (!periods?.length) return

  for (const period of periods) {
    const days = daysUntil(period.submission_deadline)
    if (!MTD_DAYS_BEFORE.includes(days)) continue
    const refKey = `mtd_${period.id}_${days}d`
    if (await alreadySent(sb, period.landlord_id, 'mtd_deadline', refKey)) continue

    const email = await getLandlordEmail(sb, period.landlord_id)
    if (!email) continue

    const html = buildLegacyEmail({
      badgeStyle: days <= 7 ? 'critical' : 'warning', badgeText: `MTD \u2014 ${days} DAYS`,
      heading: `MTD Submission Due in ${days} Days`,
      bodyHtml: `<p>Your MTD submission is due in <strong>${days} days</strong>.</p>
        <table role="presentation" style="background:#F1F5F9;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;">
          <tr><td style="color:#64748B;font-size:13px;">Tax Year</td></tr>
          <tr><td style="color:#1B3A6B;font-weight:600;font-size:15px;">${period.tax_year ?? 'Current year'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">HMRC Deadline</td></tr>
          <tr><td style="color:#DC2626;font-weight:700;font-size:15px;">${fmtDate(period.submission_deadline)}</td></tr>
        </table>`,
      ctaUrl: `${APP_URL}/finance`, ctaText: 'View Finance',
      footerNote: 'MTD compliance alert \u2014 sent by your NexLet account.'
    })

    const ok = await sendEmail(email, `\uD83D\uDCCB MTD deadline in ${days} days \u2014 action required`, html)
    if (ok) {
      await markSent(sb, period.landlord_id, 'mtd_deadline', refKey, email, { period_id: period.id, days_before: days })
      console.log(`  \u2713 MTD alert sent: ${email}`)
    }
  }
}

// LEGACY ALERT 6 — INSURANCE EXPIRING
async function lProcessInsuranceExpiry(sb: ReturnType<typeof getSupabase>) {
  console.log('\u2192 Processing [legacy]: Insurance Expiry')
  const { data: policies, error } = await sb.from('property_insurance').select(`
      id, provider, policy_type, expiry_date, policy_number,
      properties!inner ( id, address, landlord_id:user_id )
    `).gte('expiry_date', new Date().toISOString().split('T')[0])
    .lte('expiry_date', new Date(Date.now() + 61 * 86400000).toISOString().split('T')[0])

  if (error) { console.error('insurance query error:', error.message); return }
  if (!policies?.length) return

  for (const policy of policies) {
    const property = (policy as any).properties
    const landlordId = property?.landlord_id || property?.user_id
    const days = daysUntil(policy.expiry_date)
    if (!INSURANCE_DAYS_BEFORE.includes(days)) continue

    const refKey = `insurance_${policy.id}_${days}d`
    if (await alreadySent(sb, landlordId, 'insurance_expiry', refKey)) continue

    const email = await getLandlordEmail(sb, landlordId)
    if (!email) continue

    const policyLabel = policy.policy_type?.replace(/_/g,' ').replace(/\b\w/g, (c:string)=>c.toUpperCase()) ?? 'Insurance'

    const html = buildLegacyEmail({
      badgeStyle: days <= 30 ? 'warning' : 'info', badgeText: `INSURANCE \u2014 ${days} DAYS`,
      heading: `${policyLabel} Policy Expiring in ${days} Days`,
      bodyHtml: `<p>Your <strong>${policyLabel}</strong> policy is due to expire in <strong>${days} days</strong>.</p>
        <table role="presentation" style="background:#F1F5F9;border-radius:8px;padding:16px 20px;margin:16px 0;width:100%;">
          <tr><td style="color:#64748B;font-size:13px;">Property</td></tr>
          <tr><td style="color:#1B3A6B;font-weight:600;font-size:15px;">${property?.address ?? 'Your property'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Provider</td></tr>
          <tr><td style="color:#374151;font-size:14px;">${policy.provider ?? 'Not specified'}</td></tr>
          <tr><td style="color:#64748B;font-size:13px;padding-top:8px;">Expiry Date</td></tr>
          <tr><td style="color:#D97706;font-weight:700;font-size:15px;">${fmtDate(policy.expiry_date)}</td></tr>
        </table>`,
      ctaUrl: `${APP_URL}/compliance`, ctaText: 'View Compliance'
    })

    const ok = await sendEmail(email, `\u26A0 ${policyLabel} insurance expires in ${days} days`, html)
    if (ok) {
      await markSent(sb, landlordId, 'insurance_expiry', refKey, email, { policy_id: policy.id, days_before: days })
      console.log(`  \u2713 Insurance alert sent: ${email}`)
    }
  }
}

// LEGACY ALERT 7 — COMPLIANCE SCORE BELOW 70%
async function lProcessComplianceScore(sb: ReturnType<typeof getSupabase>) {
  console.log('\u2192 Processing [legacy]: Compliance Score')
  const { data: landlords, error } = await sb.from('properties').select('landlord_id:user_id')
  if (error) { console.error('compliance landlord query error:', error.message); return }
  if (!landlords?.length) return

  const uniqueIds = [...new Set(landlords.map((l: any) => l.landlord_id || l.user_id).filter(Boolean))]
  const today = new Date().toISOString().split('T')[0]

  for (const landlordId of uniqueIds) {
    const { data: scoreData, error: scoreError } = await sb.rpc('get_compliance_score', { p_landlord_id: landlordId })
    if (scoreError) { console.error('score rpc error:', scoreError.message); continue }

    const score = Number(scoreData ?? 100)
    if (score >= COMPLIANCE_THRESHOLD) continue

    const refKey = `compliance_${landlordId}_${today}`
    if (await alreadySent(sb, landlordId, 'compliance_score', refKey)) continue

    const email = await getLandlordEmail(sb, landlordId)
    if (!email) continue

    const html = buildLegacyEmail({
      badgeStyle: score < 50 ? 'critical' : 'warning', badgeText: `COMPLIANCE: ${score}%`,
      heading: `Your Compliance Score Has Dropped to ${score}%`,
      bodyHtml: `<p>Your NexLet compliance score has dropped to <strong style="color:#DC2626;">${score}%</strong>, below the recommended <strong>${COMPLIANCE_THRESHOLD}%</strong>.</p>
        <div style="background:#E2E8F0;border-radius:20px;height:18px;margin:20px 0;overflow:hidden;">
          <div style="background:${score < 50 ? '#DC2626' : '#D97706'};width:${score}%;height:18px;border-radius:20px;"></div>
        </div>
        <p style="text-align:right;margin-top:-12px;color:#64748B;font-size:12px;">${score}% / 100%</p>
        <p style="color:#374151;">A low score typically means expired or missing certificates.</p>
        <ul style="color:#374151;font-size:14px;margin:8px 0;padding-left:20px;line-height:2;">
          <li>Expired or missing Gas Safety Certificate</li>
          <li>Expired or missing EICR</li>
          <li>Expired or missing EPC</li>
          <li>Overdue maintenance issues</li>
        </ul>`,
      ctaUrl: `${APP_URL}/compliance`, ctaText: 'Fix Compliance Issues',
      footerNote: 'Compliance alert \u2014 sent by your NexLet account.'
    })

    const ok = await sendEmail(email, `\uD83D\uDD34 Compliance score at ${score}% \u2014 action needed`, html)
    if (ok) {
      await markSent(sb, landlordId, 'compliance_score', refKey, email, { score, date: today })
      console.log(`  \u2713 Compliance alert sent: ${email} | score: ${score}%`)
    }
  }
}

// LEGACY ALERT 8 — WEEKLY PORTFOLIO SUMMARY
async function lProcessWeeklySummary(sb: ReturnType<typeof getSupabase>) {
  console.log('\u2192 Processing [legacy]: Weekly Summary')
  const { data: propertyRows, error } = await sb.from('properties').select('landlord_id:user_id')
  if (error) { console.error('weekly landlord query error:', error.message); return }
  if (!propertyRows?.length) return

  const uniqueIds = [...new Set(propertyRows.map((l: any) => l.landlord_id || l.user_id).filter(Boolean))]
  const currentWeek = isoWeek()

  for (const landlordId of uniqueIds) {
    const refKey = `summary_${landlordId}_${currentWeek}`
    if (await alreadySent(sb, landlordId, 'weekly_summary', refKey)) continue

    const email = await getLandlordEmail(sb, landlordId)
    if (!email) continue

    const propIds = (await sb.from('properties').select('id').eq('user_id', landlordId)).data?.map((p: any) => p.id) ?? []
    const pidList = propIds.length ? propIds : ['__none__']

    const [ r1, r2, r3, r4, r5 ] = await Promise.all([
      sb.from('properties').select('*', { count: 'exact', head: true }).eq('user_id', landlordId),
      sb.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active').in('prop_id', pidList),
      sb.from('maintenance').select('*', { count: 'exact', head: true }).not('status', 'in', '("completed","closed","Completed","Closed")').in('prop_id', pidList),
      sb.from('certificates').select('*', { count: 'exact', head: true }).lte('expiry_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]).gte('expiry_date', new Date().toISOString().split('T')[0]).in('prop_id', pidList),
      sb.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active').not('next_rent_due', 'is', null).lt('next_rent_due', new Date().toISOString().split('T')[0]).in('prop_id', pidList),
    ])

    const propCount = r1.count ?? 0; const tenCount = r2.count ?? 0
    const activeMaint = r3.count ?? 0; const expCerts = r4.count ?? 0; const overdueRent = r5.count ?? 0

    const { data: scoreData } = await sb.rpc('get_compliance_score', { p_landlord_id: landlordId })
    const score = Number(scoreData ?? 100)
    const scoreColour = score >= 80 ? '#059669' : score >= 70 ? '#D97706' : '#DC2626'
    const weekLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const stat = (label: string, value: number | string, colour = '#1B3A6B', note = '') =>
      `<td style="text-align:center;padding:12px 8px;"><div style="font-size:28px;font-weight:700;color:${colour};line-height:1;">${value}</div><div style="font-size:11px;color:#64748B;margin-top:4px;">${label}</div>${note ? `<div style="font-size:10px;color:#94A3B8;">${note}</div>` : ''}</td>`

    const html = buildLegacyEmail({
      badgeStyle: 'info', badgeText: 'WEEKLY SUMMARY', heading: `Your Portfolio \u2014 Week of ${weekLabel}`,
      bodyHtml: `<p>Here's your weekly snapshot from NexLet.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:12px;margin:20px 0;border:1px solid #E2E8F0;">
          <tr>${stat('Properties', propCount)}${stat('Active Tenancies', tenCount)}${stat('Compliance Score', `${score}%`, scoreColour)}</tr>
          <tr style="border-top:1px solid #E2E8F0;">${stat('Open Jobs', activeMaint, activeMaint ? '#D97706' : '#059669', activeMaint ? 'needs review' : 'all clear')}${stat('Certs Expiring (30d)', expCerts, expCerts ? '#D97706' : '#059669', expCerts ? 'action needed' : 'all clear')}${stat('Rent Overdue', overdueRent, overdueRent ? '#DC2626' : '#059669', overdueRent ? 'chase payment' : 'all clear')}</tr>
        </table>${(activeMaint || expCerts || overdueRent) ? `<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;margin-top:8px;"><strong style="color:#92400E;font-size:13px;">\u26A0 Action items this week</strong></div>` : `<div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:12px 16px;margin-top:8px;"><strong style="color:#065F46;font-size:13px;">\u2713 All clear</strong></div>`}`,
      ctaUrl: `${APP_URL}/dashboard`, ctaText: 'Open Dashboard'
    })

    const ok = await sendEmail(email, `\uD83D\uDCCA Your NexLet weekly summary \u2014 ${weekLabel}`, html)
    if (ok) {
      await markSent(sb, landlordId, 'weekly_summary', refKey, email, { week: currentWeek, score })
      console.log(`  \u2713 Weekly summary sent: ${email}`)
    }
  }
}

// ════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { body = { type: 'daily' } }

  const type = (body.type as string) ?? 'daily'
  console.log(`\n\u2550\u2550\u2550 email-alerts | type=${type} | ${new Date().toISOString()} \u2550\u2550\u2550`)

  const sb = getSupabase()
  const results: Record<string, string> = {}

  try {
    // ── NEW BRANDED MODES ──────────────────────────────────

    if (type === 'welcome') {
      const userId = (body.user_id as string) || ''
      const emailAddr = (body.email as string) || ''
      const firstName = (body.first_name as string) || ''
      if (!userId || !emailAddr) {
        return new Response(JSON.stringify({ success: false, error: 'user_id and email required' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        })
      }
      await processWelcome(sb, userId, emailAddr, firstName)
      results.welcome = 'ok'

    } else if (type === 'trial_expiry_warning') {
      const userId = (body.user_id as string) || ''
      const emailAddr = (body.email as string) || ''
      const firstName = (body.first_name as string) || ''
      const trialEnds = (body.trial_ends_at as string) || ''
      if (!userId || !emailAddr || !trialEnds) {
        return new Response(JSON.stringify({ success: false, error: 'user_id, email, and trial_ends_at required' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        })
      }
      await processTrialExpiryDirect(sb, userId, emailAddr, firstName, trialEnds)
      results.trial_expiry_warning = 'ok'

    } else if (type === 'cron_digest') {
      await processComplianceDigest(sb)
      results.cron_digest = 'ok'

    } else if (type === 'cron_expiry') {
      await processCertExpiryCheck(sb)
      results.cron_expiry = 'ok'

    } else if (type === 'cron_trial') {
      await processTrialExpiryCheck(sb)
      results.cron_trial = 'ok'

    // ── LEGACY MODES ────────────────────────────────────────

    } else if (type === 'weekly_summary') {
      await lProcessWeeklySummary(sb)
      results.weekly_summary = 'ok'

    } else {
      // Default: daily — run all 7 legacy alerts in parallel
      const tasks = [
        lProcessCertExpiry(sb).then(() => { results.cert_expiry = 'ok' }).catch(e => { results.cert_expiry = e.message }),
        lProcessRentOverdue(sb).then(() => { results.rent_overdue = 'ok' }).catch(e => { results.rent_overdue = e.message }),
        lProcessMaintenanceOverdue(sb).then(() => { results.maintenance = 'ok' }).catch(e => { results.maintenance = e.message }),
        lProcessAwaabLaw(sb).then(() => { results.awaab = 'ok' }).catch(e => { results.awaab = e.message }),
        lProcessMtdDeadline(sb).then(() => { results.mtd = 'ok' }).catch(e => { results.mtd = e.message }),
        lProcessInsuranceExpiry(sb).then(() => { results.insurance = 'ok' }).catch(e => { results.insurance = e.message }),
        lProcessComplianceScore(sb).then(() => { results.compliance = 'ok' }).catch(e => { results.compliance = e.message }),
      ]
      await Promise.allSettled(tasks)
    }

    console.log('\n\u2550\u2550\u2550 Completed \u2550\u2550\u2550', results)
    return new Response(JSON.stringify({ success: true, type, results }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[email-alerts] Fatal error:', error)
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})
