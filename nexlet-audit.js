/* ============================================================================
   nexlet-audit.js — append-only, hash-chained audit trail + external-step register
   Loaded by agent.html as a classic script, so it shares that file's globals
   (S, sb, LIVE, esc, toast, modal, render, go, P, L, _storageUpload).

   Two jobs:
     1. AUDIT TRAIL. Every meaningful write is recorded once, immutably, with a
        hash chain so tampering is detectable. Post-s21 the trail is the evidence.
     2. EXTERNAL STEP REGISTER. Some regulated steps happen on someone else's
        website — publishing to Zoopla, submitting a Let Alliance reference,
        registering a deposit with the scheme. NexLet can't perform those, but it
        knows they're required, runs the statutory clock, holds the reference
        number and the evidence, and keeps nagging until you record that it's done.
        That keeps NexLet the system of record even when it isn't the system of action.
   ========================================================================== */
(function () {
  'use strict';

  const LS_KEY = 'nexlet_audit_local_v1';
  const MAX_LOAD = 800;

  let rows = [];          // newest-first in memory
  let loaded = false;
  let tailHash = null;    // hash of the most recent row, seeds the chain
  let filters = { q: '', action: '', source: '', from: '', to: '' };

  /* ── helpers ─────────────────────────────────────────────────────────── */
  const nowISO = () => new Date().toISOString();
  const esc2 = s => (window.esc ? window.esc(s) : String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  // esc2 leaves apostrophes intact, which breaks interpolation into a
  // single-quoted JS string inside an on* attribute. Use this there instead.
  const escJs = s => String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');

  function fmtDT(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
  function daysBetween(a, b) { return Math.floor((new Date(b) - new Date(a)) / 864e5); }
  function addDays(iso, n) { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

  async function sha256(str) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { return null; }   // http:// origins have no crypto.subtle — chain degrades, log still works
  }

  const localRead = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; } };
  const localWrite = r => { try { localStorage.setItem(LS_KEY, JSON.stringify(r.slice(0, MAX_LOAD))); } catch (e) { } };

  /* ── the catalogue of actions ────────────────────────────────────────────
     Grouped so the audit view can filter, and so the labels stay consistent
     wherever an entry is rendered. Anything not listed still logs fine —
     it just renders with its raw action key. */
  const ACTIONS = {
    'record.saved':          { label: 'Record saved',                  grp: 'Data' },
    'record.deleted':        { label: 'Record deleted',                grp: 'Data' },
    'doc.uploaded':          { label: 'Document uploaded',              grp: 'Documents' },
    'doc.generated':         { label: 'Document generated',             grp: 'Documents' },
    'email.sent':            { label: 'Email sent',                     grp: 'Communications' },
    'agreement.sent':        { label: 'Agreement sent for signature',   grp: 'Agreements' },
    'agreement.signed':      { label: 'Agreement signed',               grp: 'Agreements' },
    'rtr.checked':           { label: 'Right to Rent check recorded',   grp: 'Compliance' },
    'cert.updated':          { label: 'Safety certificate updated',     grp: 'Compliance' },
    'deposit.registered':    { label: 'Deposit registered with scheme', grp: 'Deposit' },
    'deposit.pi_served':     { label: 'Prescribed information served',  grp: 'Deposit' },
    'deposit.returned':      { label: 'Deposit returned / apportioned', grp: 'Deposit' },
    'notice.generated':      { label: 'Notice generated',               grp: 'Possession' },
    'notice.served':         { label: 'Notice served',                  grp: 'Possession' },
    'notice.withdrawn':      { label: 'Notice withdrawn',               grp: 'Possession' },
    'listing.published':     { label: 'Listing published',              grp: 'Marketing' },
    'reference.submitted':   { label: 'Reference submitted',            grp: 'Referencing' },
    'reference.outcome':     { label: 'Reference outcome recorded',     grp: 'Referencing' },
    'payment.logged':        { label: 'Rent payment logged',            grp: 'Money' },
    'invoice.issued':        { label: 'Invoice issued',                 grp: 'Money' },
    'job.status':            { label: 'Maintenance job progressed',     grp: 'Maintenance' },
    'external.step':         { label: 'External step recorded',         grp: 'External' }
  };

  // Table name → what it means in the audit trail.
  const TABLE_MAP = {
    agency_landlords:      ['landlord',   'Landlord record'],
    properties:            ['property',   'Property record'],
    agency_listings:       ['listing',    'Listing'],
    agency_applicants:     ['applicant',  'Applicant'],
    agency_viewings:       ['viewing',    'Viewing'],
    agency_offers:         ['offer',      'Offer'],
    agency_keys:           ['keys',       'Key set'],
    agency_payouts:        ['payout',     'Landlord payout'],
    tenancies:             ['tenancy',    'Tenancy'],
    agency_references:     ['reference',  'Reference'],
    invoices:              ['invoice',    'Invoice'],
    agency_notices:        ['notice',     'Notice'],
    agency_tenants:        ['tenancy',    'Tenant record'],
    agency_rent_ledger:    ['rent',       'Rent ledger entry'],
    agency_maintenance:    ['job',        'Maintenance job'],
    agency_inventories:    ['inventory',  'Inventory'],
    agency_messages:       ['message',    'Message'],
    agency_landlord_leads: ['lead',       'Landlord lead'],
    agencies:              ['agency',     'Agency settings']
  };

  /* ── EXTERNAL STEPS ──────────────────────────────────────────────────────
     The register of things NexLet cannot do itself. `due` returns a list of
     outstanding items by reading current state; recording one writes an audit
     entry with source = the portal, plus the reference number and evidence. */
  const EXTERNAL_STEPS = {
    zoopla_listed: {
      portal: 'Zoopla', action: 'listing.published',
      label: 'Publish listing on Zoopla',
      why: 'Zoopla requires Part A/B/C material information before a listing is accepted. Anything without a dedicated field goes in the Full description.',
      refLabel: 'Zoopla listing reference or URL',
      evidenceLabel: 'Screenshot of the live listing'
    },
    la_submitted: {
      portal: 'Let Alliance', action: 'reference.submitted',
      label: 'Submit reference to Let Alliance',
      why: 'Referencing is performed in the Let Alliance portal. Record the submission so the applicant timeline is complete.',
      refLabel: 'Let Alliance application reference'
    },
    la_outcome: {
      portal: 'Let Alliance', action: 'reference.outcome',
      label: 'Record Let Alliance reference outcome',
      why: 'The outcome decides whether a guarantor or rent guarantee is needed. Attach the report — a rent guarantee claim can be refused if the reference did not meet their standard.',
      refLabel: 'Let Alliance application reference',
      evidenceLabel: 'Reference report PDF',
      extra: [
        { k: 'outcome', label: 'Outcome', type: 'select', options: ['Pass', 'Pass with guarantor', 'Pass with rent guarantee', 'Refer', 'Fail'] },
        { k: 'policyNo', label: 'Rent guarantee policy number', type: 'text', optional: true },
        { k: 'conditions', label: 'Policy conditions to observe', type: 'textarea', optional: true,
          hint: 'Anything that could void a claim later — arrears notification windows, notice requirements.' }
      ]
    },
    deposit_registered: {
      portal: 'Deposit scheme', action: 'deposit.registered',
      label: 'Register deposit with the scheme',
      why: 'Statutory: the deposit must be protected within 30 days of receipt. Custodial keeps the money out of your client account entirely.',
      refLabel: 'Scheme deposit reference / certificate number',
      evidenceLabel: 'Scheme certificate (PDF)',
      extra: [
        { k: 'scheme', label: 'Scheme', type: 'select', options: ['TDS Custodial', 'TDS Insured', 'DPS Custodial', 'DPS Insured', 'mydeposits'] },
        { k: 'held', label: 'How is it held?', type: 'select', options: ['Custodial — scheme holds the money', 'Insured — we hold the money'] }
      ]
    },
    deposit_landlord_cert: {
      portal: 'Landlord', action: 'deposit.registered',
      label: 'Obtain deposit certificate from landlord',
      why: 'The landlord received the deposit direct, so protecting it within 30 days is their statutory duty. Get the certificate and prescribed information for your file — if they protect late the tenant complains to you first.',
      refLabel: 'Scheme deposit reference',
      evidenceLabel: 'Landlord\u2019s scheme certificate',
      extra: [
        { k: 'schemeMembership', label: 'Landlord\u2019s scheme membership no.', type: 'text' },
        { k: 'piServed', label: 'Prescribed information served by landlord?', type: 'select', options: ['Yes \u2014 copy on file', 'No \u2014 chased', 'Unknown'] }
      ]
    },
    deposit_pi: {
      portal: 'Deposit scheme', action: 'deposit.pi_served',
      label: 'Serve prescribed information',
      why: 'Statutory: within the same 30 days. Without it a court can refuse possession and order up to 3x the deposit.',
      evidenceLabel: 'Signed prescribed information'
    },
    court_claim: {
      portal: 'PCOL / court', action: 'external.step',
      label: 'Possession claim issued',
      why: 'Rent-arrears-only claims go through PCOL; mixed grounds use the paper N5 + N119.',
      refLabel: 'Claim number',
      evidenceLabel: 'Issued claim form'
    }
  };

  /* Which external steps are outstanding right now, and by when.
     Deliberately conservative: only flags a step when the trigger clearly exists. */
  function due() {
    const S = window.S || {};
    const out = [];
    const has = (action, entityId) => rows.some(r => r.action === action && (!entityId || r.entity_id === entityId));

    (S.listings || []).forEach(l => {
      if (l.status === 'live' && !has('listing.published', l.id)) {
        const p = (window.P && window.P(l.propertyId)) || {};
        out.push({ step: 'zoopla_listed', entity: 'listing', entityId: l.id,
          label: p.address || l.title || 'Listing', deadline: null });
      }
    });

    (S.tenants || []).forEach(rec => {
      if (!rec || !rec.deposit) return;
      const p = (window.P && window.P(rec.propertyId)) || {};
      const label = p.address || rec.name || 'Tenancy';
      // The 30 days run from RECEIPT of the deposit (s213 Housing Act 2004).
      // Tenancy start is only a fallback when no receipt date was recorded.
      const from = rec.depositReceived || rec.start;
      const deadline = from ? addDays(from, 30) : null;
      // Where the LANDLORD receives the deposit, protecting it is their duty,
      // not ours — so chase the evidence rather than the registration.
      const held = rec.depositHolder || 'landlord';
      if (!rec.schemeRef && !has('deposit.registered', rec.id))
        out.push({ step: held === 'landlord' ? 'deposit_landlord_cert' : 'deposit_registered',
          entity: 'tenancy', entityId: rec.id, label, deadline });
      if (!rec.piServedAt && !has('deposit.pi_served', rec.id))
        out.push({ step: 'deposit_pi', entity: 'tenancy', entityId: rec.id, label, deadline });
    });

    (S.references || []).forEach(r => {
      const st = (r.creditState || '').toLowerCase();
      if (st && st !== 'complete' && st !== 'pass' && !has('reference.submitted', r.id))
        out.push({ step: 'la_submitted', entity: 'reference', entityId: r.id, label: r.applicant || 'Applicant', deadline: null });
      if (has('reference.submitted', r.id) && !has('reference.outcome', r.id))
        out.push({ step: 'la_outcome', entity: 'reference', entityId: r.id, label: r.applicant || 'Applicant', deadline: null });
    });

    return out.map(o => {
      const overdue = o.deadline && new Date(o.deadline) < new Date();
      const soon = o.deadline && !overdue && daysBetween(new Date(), o.deadline) <= 7;
      return Object.assign(o, { overdue: !!overdue, soon: !!soon, def: EXTERNAL_STEPS[o.step] });
    }).sort((a, b) => (b.overdue - a.overdue) || (b.soon - a.soon));
  }

  /* ── write path ──────────────────────────────────────────────────────── */
  async function ensureLoaded() {
    if (loaded) return;
    loaded = true;
    if (window.LIVE && window.sb && window._agencyId) {
      try {
        const { data } = await window.sb.from('agency_audit')
          .select('*').eq('agency_id', window._agencyId)
          .order('seq', { ascending: false }).limit(MAX_LOAD);
        rows = data || [];
      } catch (e) { console.warn('audit load failed', e); rows = []; }
    } else {
      rows = localRead();
    }
    tailHash = rows.length ? (rows[0].hash || null) : null;
  }

  async function log(o) {
    if (!o || !o.action) return;
    await ensureLoaded();
    const actor = (window.S && window.S.me && (window.S.me.name || window.S.me.email)) || 'Agent';
    const row = {
      agency_id: window._agencyId || null,
      at: nowISO(),
      actor,
      action: o.action,
      entity: o.entity || null,
      entity_id: o.entityId != null ? String(o.entityId) : null,
      entity_label: o.entityLabel || null,
      detail: o.detail || {},
      source: o.source || 'nexlet',
      external_ref: o.externalRef || null,
      evidence_name: o.evidenceName || null,
      evidence_url: o.evidenceUrl || null,
      ua: (navigator.userAgent || '').slice(0, 180),
      prev_hash: tailHash
    };
    row.hash = await sha256([row.prev_hash, row.at, row.actor, row.action,
      row.entity, row.entity_id, row.source, row.external_ref,
      JSON.stringify(row.detail)].join('|'));
    tailHash = row.hash;

    rows.unshift(row);
    if (rows.length > MAX_LOAD) rows.length = MAX_LOAD;

    if (window.LIVE && window.sb) {
      try { const { error } = await window.sb.from('agency_audit').insert(row); if (error) console.warn('audit insert', error); }
      catch (e) { console.warn('audit insert', e); }
    } else {
      localWrite(rows);
    }
    return row;
  }

  // Called from the instrumented _w() in agent.html — one entry per persisted write.
  // `rec` is the record itself, so the entry can name WHICH landlord/property/tenancy
  // changed. An entry that can't identify its subject is no use as dispute evidence.
  function labelFor(entity, rec) {
    if (!rec) return null;
    const addr = () => { try { const p = window.P && window.P(rec.propertyId); return (p && p.address) || null; } catch (e) { return null; } };
    switch (entity) {
      case 'landlord': try { return (window.landlordName && window.landlordName(rec)) || rec.name || null; } catch (e) { return rec.name || null; }
      case 'property': return rec.address || null;
      case 'invoice': return rec.no ? 'Invoice ' + rec.no : null;
      case 'reference': return rec.applicant || null;
      case 'applicant':
      case 'lead': return rec.name || null;
      case 'tenancy': return [rec.name || rec.who, addr()].filter(Boolean).join(' \u2014 ') || null;
      case 'rent': return [addr(), rec.amount != null ? '\u00a3' + rec.amount : null].filter(Boolean).join(' \u2014 ') || null;
      case 'job': return [addr(), rec.category].filter(Boolean).join(' \u2014 ') || null;
      default: return addr() || rec.address || rec.name || rec.title || rec.label || null;
    }
  }

  function noteWrite(table, op, rec) {
    const m = TABLE_MAP[table];
    if (!m) return;
    const label = labelFor(m[0], rec);
    log({
      action: op === 'delete' ? 'record.deleted' : 'record.saved',
      entity: m[0],
      entityId: rec && rec.id != null ? rec.id : null,
      entityLabel: label || m[1],
      detail: { type: m[1], table: table, op: op || 'upsert' }
    });
  }

  /* ── verify the chain ────────────────────────────────────────────────── */
  async function verify() {
    await ensureLoaded();
    const asc = rows.slice().reverse();
    let prev = asc.length ? asc[0].prev_hash : null;
    for (let i = 0; i < asc.length; i++) {
      const r = asc[i];
      if (r.prev_hash !== prev) return { ok: false, at: r.at, reason: 'chain break — a row was altered or removed before this one' };
      const h = await sha256([r.prev_hash, r.at, r.actor, r.action, r.entity, r.entity_id, r.source, r.external_ref, JSON.stringify(r.detail || {})].join('|'));
      if (h && r.hash && h !== r.hash) return { ok: false, at: r.at, reason: 'row contents no longer match their hash' };
      prev = r.hash;
    }
    return { ok: true, count: asc.length };
  }

  /* ── record an external step ─────────────────────────────────────────── */
  let _pendingFile = null;

  function openExternal(stepKey, entity, entityId, label) {
    const def = EXTERNAL_STEPS[stepKey];
    if (!def) return;
    const extras = (def.extra || []).map(x => {
      if (x.type === 'select')
        return `<div class="fg"><label>${esc2(x.label)}</label><select id="ex-${x.k}">${x.options.map(o => `<option>${esc2(o)}</option>`).join('')}</select>${x.hint ? `<div class="hint">${esc2(x.hint)}</div>` : ''}</div>`;
      if (x.type === 'textarea')
        return `<div class="fg"><label>${esc2(x.label)}${x.optional ? ' <span class="faint">(optional)</span>' : ''}</label><textarea id="ex-${x.k}" rows="2"></textarea>${x.hint ? `<div class="hint">${esc2(x.hint)}</div>` : ''}</div>`;
      return `<div class="fg"><label>${esc2(x.label)}${x.optional ? ' <span class="faint">(optional)</span>' : ''}</label><input id="ex-${x.k}" type="text"></div>`;
    }).join('');

    const body = `
      <div class="note" style="margin-bottom:14px"><b>${esc2(def.portal)}</b> — ${esc2(def.why)}</div>
      ${label ? `<div class="kv"><span class="k">Relates to</span><span class="v">${esc2(label)}</span></div>` : ''}
      <div class="fg" style="margin-top:12px"><label>Date completed</label>
        <input id="ex-date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
      ${def.refLabel ? `<div class="fg"><label>${esc2(def.refLabel)}</label><input id="ex-ref" type="text" placeholder="Paste the reference from ${esc2(def.portal)}"></div>` : ''}
      ${extras}
      ${def.evidenceLabel ? `<div class="fg"><label>${esc2(def.evidenceLabel)} <span class="faint">(optional but recommended)</span></label>
        <input type="file" onchange="NexLetAudit._file(this)"><div class="hint">Stored against this entry so the evidence and the record never drift apart.</div></div>` : ''}
      <div class="fg"><label>Notes <span class="faint">(optional)</span></label><textarea id="ex-notes" rows="2"></textarea></div>`;

    _pendingFile = null;
    window.modal(def.label, body,
      `<button class="btn" onclick="closeModal()">Cancel</button>
       <button class="btn navy" onclick="NexLetAudit._saveExternal('${stepKey}','${entity || ''}','${entityId || ''}','${escJs(label || '')}')">Record it</button>`, true);
  }

  async function saveExternal(stepKey, entity, entityId, label) {
    const def = EXTERNAL_STEPS[stepKey];
    if (!def) return;
    const val = id => (document.getElementById(id) || {}).value || '';
    const detail = { step: stepKey, completedOn: val('ex-date'), notes: val('ex-notes') };
    (def.extra || []).forEach(x => { const v = val('ex-' + x.k); if (v) detail[x.k] = v; });

    let evidenceUrl = '', evidenceName = '';
    if (_pendingFile && window._storageUpload) {
      evidenceName = _pendingFile.name;
      const ext = (_pendingFile.name.split('.').pop() || 'pdf');
      evidenceUrl = await window._storageUpload(_pendingFile,
        (entityId || 'audit') + '/external-' + stepKey + '-' + Date.now() + '.' + ext, 'property-documents') || '';
    }
    _pendingFile = null;

    await log({
      action: def.action, entity: entity || null, entityId: entityId || null, entityLabel: label || null,
      source: def.portal, externalRef: val('ex-ref'), detail, evidenceUrl, evidenceName
    });

    // Mirror the scheme reference back onto the tenancy so the rest of the app sees it.
    if (stepKey === 'deposit_registered' && entityId && window.S) {
      const rec = (window.S.tenants || []).find(t => t.id === entityId);
      if (rec) {
        rec.schemeRef = val('ex-ref') || rec.schemeRef;
        rec.scheme = detail.scheme || rec.scheme;
        if (window.pushTenantRec) window.pushTenantRec(rec);
        if (window.save) window.save();
      }
    }

    if (window.closeModal) window.closeModal();
    if (window.render) window.render();
    if (window.toast) window.toast('✓ Recorded — ' + def.label);
  }

  /* ── views ───────────────────────────────────────────────────────────── */
  function actionLabel(a) { return (ACTIONS[a] && ACTIONS[a].label) || a; }
  function actionGrp(a) { return (ACTIONS[a] && ACTIONS[a].grp) || 'Other'; }

  function filtered() {
    const q = filters.q.toLowerCase();
    return rows.filter(r => {
      if (filters.action && r.action !== filters.action) return false;
      if (filters.source && r.source !== filters.source) return false;
      if (filters.from && r.at < filters.from) return false;
      if (filters.to && r.at > filters.to + 'T23:59:59Z') return false;
      if (q) {
        const hay = [r.actor, r.action, actionLabel(r.action), r.entity_label, r.external_ref, r.source,
          JSON.stringify(r.detail || {})].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function entryRow(r) {
    const src = r.source && r.source !== 'nexlet';
    return `<div class="row" style="align-items:flex-start">
      <div style="width:132px;flex-shrink:0;font-size:11.5px;color:var(--faint)">${fmtDT(r.at)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--navy)">${esc2(actionLabel(r.action))}
          ${src ? `<span class="pill" style="background:var(--purple-bg);color:var(--purple);margin-left:6px">${esc2(r.source)}</span>` : ''}</div>
        ${r.entity_label ? `<div class="faint" style="font-size:11.5px;margin-top:2px">${esc2(r.entity_label)}</div>` : ''}
        ${r.external_ref ? `<div style="font-size:11.5px;margin-top:3px">Ref <b>${esc2(r.external_ref)}</b></div>` : ''}
        ${(r.detail && Object.keys(r.detail).length)
          ? `<div class="faint" style="font-size:11px;margin-top:3px">${Object.entries(r.detail)
              .filter(([k, v]) => v && k !== 'step').map(([k, v]) => esc2(k) + ': ' + esc2(String(v)).slice(0, 120)).join(' · ')}</div>` : ''}
      </div>
      <div style="width:120px;flex-shrink:0;font-size:11.5px;color:var(--muted);text-align:right">${esc2(r.actor || '—')}</div>
      <div style="width:70px;flex-shrink:0;text-align:right">${r.evidence_url
        ? `<button class="btn sm" onclick="viewDoc('${escJs(r.evidence_url)}','${escJs(r.evidence_name || 'Evidence')}')">View</button>` : ''}</div>
    </div>`;
  }

  function view() {
    ensureLoaded().then(() => { if (!rows.__painted) { rows.__painted = 1; if (window.render) window.render(); } });
    const list = filtered();
    const pend = due();
    const overdue = pend.filter(p => p.overdue).length;
    const sources = Array.from(new Set(rows.map(r => r.source).filter(Boolean)));
    const actions = Array.from(new Set(rows.map(r => r.action))).sort();

    return `<h1 class="pg">Audit Trail</h1>
      <div class="sub">An append-only record of every action, hash-chained so alteration is detectable. Includes steps completed on external portals, so the trail stays whole even when the work happens elsewhere.</div>

      <div class="grid4" style="margin-bottom:18px">
        <div class="kpi"><div class="l">Entries held</div><div class="v">${rows.length}</div><div class="s">most recent ${rows.length ? fmtDT(rows[0].at) : '—'}</div></div>
        <div class="kpi"><div class="l">External steps due</div><div class="v" style="color:${pend.length ? 'var(--amber)' : 'var(--green)'}">${pend.length}</div></div>
        <div class="kpi"><div class="l">Past deadline</div><div class="v" style="color:${overdue ? 'var(--red)' : 'var(--green)'}">${overdue}</div></div>
        <div class="kpi"><div class="l">Chain</div><div class="v" style="font-size:15px;padding-top:6px" id="audit-chain">Not checked</div>
          <div class="s"><button class="btn sm" style="margin-top:4px" onclick="NexLetAudit._verify()">Verify integrity</button></div></div>
      </div>

      ${pend.length ? `<div class="panel"><div class="panel-hd">
        <h2 style="font-size:13px">Waiting on an external portal</h2>
        <span class="faint" style="font-size:11.5px">NexLet can't do these itself — record them here once done</span></div>
        <div>${pend.map(p => {
          const d = p.def || {};
          return `<div class="row">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:var(--navy)">${esc2(d.label || p.step)}</div>
              <div class="faint" style="font-size:11.5px;margin-top:2px">${esc2(p.label)} · ${esc2(d.portal || '')}</div>
            </div>
            ${p.deadline ? `<span class="pill" style="background:${p.overdue ? 'var(--red-bg)' : p.soon ? 'var(--amber-bg)' : 'var(--off)'};color:${p.overdue ? 'var(--red)' : p.soon ? 'var(--amber)' : '#8A7D6E'}">${p.overdue ? 'Overdue' : 'By'} ${esc2(p.deadline)}</span>` : ''}
            <button class="btn sm navy" onclick="NexLetAudit.record('${p.step}','${p.entity}','${p.entityId}','${escJs(p.label)}')">Record</button>
          </div>`;
        }).join('')}</div></div>` : ''}

      <div class="panel"><div class="panel-hd">
          <h2 style="font-size:13px">Log</h2>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn sm" onclick="NexLetAudit.exportCsv()">Export CSV</button>
            <button class="btn sm navy" onclick="NexLetAudit.recordPicker()">＋ Record external step</button>
          </div></div>
        <div style="padding:12px 20px;border-bottom:1px solid #EEF1F5;display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
          <div class="fg" style="margin:0;flex:1;min-width:170px"><label style="font-size:11px">Search</label>
            <input type="text" value="${esc2(filters.q)}" oninput="NexLetAudit._f('q',this.value)" placeholder="Name, reference, action…"></div>
          <div class="fg" style="margin:0;width:190px"><label style="font-size:11px">Action</label>
            <select onchange="NexLetAudit._f('action',this.value)"><option value="">All</option>
              ${actions.map(a => `<option value="${esc2(a)}" ${filters.action === a ? 'selected' : ''}>${esc2(actionLabel(a))}</option>`).join('')}</select></div>
          <div class="fg" style="margin:0;width:150px"><label style="font-size:11px">Source</label>
            <select onchange="NexLetAudit._f('source',this.value)"><option value="">All</option>
              ${sources.map(s => `<option value="${esc2(s)}" ${filters.source === s ? 'selected' : ''}>${esc2(s)}</option>`).join('')}</select></div>
          <div class="fg" style="margin:0;width:140px"><label style="font-size:11px">From</label>
            <input type="date" value="${esc2(filters.from)}" onchange="NexLetAudit._f('from',this.value)"></div>
          <div class="fg" style="margin:0;width:140px"><label style="font-size:11px">To</label>
            <input type="date" value="${esc2(filters.to)}" onchange="NexLetAudit._f('to',this.value)"></div>
        </div>
        <div>${list.length ? list.map(entryRow).join('')
          : `<div class="empty">${rows.length ? 'Nothing matches those filters.' : 'No entries yet. Actions are recorded from now on.'}</div>`}</div>
      </div>`;
  }

  // Compact timeline for embedding on a property / tenancy / landlord page.
  function strip(entity, entityId, limit) {
    const list = rows.filter(r => r.entity === entity && r.entity_id === String(entityId)).slice(0, limit || 6);
    if (!list.length) return '';
    return `<div class="panel"><div class="panel-hd"><h2 style="font-size:13px">Audit trail</h2>
      <button class="btn sm ghost" onclick="go('audit')">See all →</button></div>
      <div>${list.map(entryRow).join('')}</div></div>`;
  }

  function recordPicker() {
    const body = Object.entries(EXTERNAL_STEPS).map(([k, d]) =>
      `<div class="chk" onclick="closeModal();NexLetAudit.record('${k}','','','')">
        <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--navy)">${esc2(d.label)}</div>
        <div class="faint" style="font-size:11.5px;margin-top:2px">${esc2(d.portal)}</div></div></div>`).join('');
    window.modal('Record an external step', body, `<button class="btn" onclick="closeModal()">Cancel</button>`);
  }

  function exportCsv() {
    const cols = ['at', 'actor', 'action', 'entity', 'entity_label', 'source', 'external_ref', 'detail', 'hash'];
    const cell = v => '"' + String(v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v).replace(/"/g, '""') + '"';
    const csv = [cols.join(',')].concat(filtered().map(r => cols.map(c => cell(r[c])).join(','))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'nexlet-audit-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    if (window.toast) window.toast('✓ Audit trail exported');
  }

  window.NexLetAudit = {
    log, noteWrite, due, verify, view, strip, exportCsv, recordPicker,
    record: openExternal,
    STEPS: EXTERNAL_STEPS,
    _f(k, v) { filters[k] = v; if (window.render) window.render(); },
    _file(input) { _pendingFile = (input.files && input.files[0]) || null; },
    _saveExternal: saveExternal,
    async _verify() {
      const el = document.getElementById('audit-chain');
      if (el) el.textContent = 'Checking…';
      const r = await verify();
      if (el) {
        el.textContent = r.ok ? '✓ Intact' : '⚠ Broken';
        el.style.color = r.ok ? 'var(--green)' : 'var(--red)';
      }
      if (window.toast) window.toast(r.ok ? '✓ Chain intact — ' + r.count + ' entries verified' : '⚠ ' + r.reason, r.ok ? 0 : 1);
    }
  };
})();
