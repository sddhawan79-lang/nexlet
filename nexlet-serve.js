/* nexlet-serve.js — serving documents on the tenant and on the landlord.
 *
 * WHY THIS EXISTS AS A REGISTRY, NOT AS BUTTONS
 *
 * Written key terms became a legal requirement on 1 May 2026 and were missing
 * from this app entirely — caught by chance the day before a move-in. The cause
 * was structural: what must be served lived scattered across panels, so nothing
 * could report that an item was absent. Absence looked identical to compliance.
 *
 * So the list below is the single source of truth. Each entry carries who it
 * goes to, the legal basis, the deadline, and how to obtain the document. The
 * modal is rendered FROM the list, which means an item with no document shows as
 * "not on file" instead of silently not appearing. Adding a new requirement is
 * one entry here and nothing else.
 *
 * Sent state is derived from the letters trail, not a flag, so it cannot drift.
 */
(function () {
  'use strict';

  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const dt = d => { try { return d && window.fmtDate ? window.fmtDate(d) : ''; } catch (e) { return ''; } };

  /* The Information Sheet is the same document for every tenancy, so it lives
     once against the agency rather than per property. Matched on label so the
     agent files it in Settings → Business documents like anything else. */
  function bizDoc(re) {
    return ((ST().agency || {}).bizDocs || [])
      .filter(d => d && d.url && re.test(d.label || ''))
      .sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')))[0] || null;
  }
  function infoSheetDoc() { return bizDoc(/information sheet/i); }
  /* The scheme's own leaflet — also one document for every tenancy. Matches the
     label offered in the Business-documents dropdown, and the titles the schemes
     actually ship the PDF under, so filing it under its own name still works. */
  function leafletDoc() { return bizDoc(/leaflet|scheme information|custodial scheme|what is the tenancy deposit/i); }

  function ctx(pid) {
    const p = (window.P && window.P(pid)) || {};
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    const l = (window.L && window.L(p.landlordId)) || {};
    let people = (window._tnPeopleView ? window._tnPeopleView(rec) : []).filter(x => x && x.name);
    /* The lead's address lives on the record itself; older person views did not
       carry it, which reported "no email on file" for a tenancy that had one. */
    if (people.length && !people[0].email && rec.email) people[0] = { ...people[0], email: rec.email };
    if (!people.length && rec.name) people = [{ name: rec.name, email: rec.email || '' }];
    const ta = (window.tenancyAgreementFor && rec.id) ? window.tenancyAgreementFor(rec.id) : null;
    return { p, rec, l, people, ta, certs: p.certs || {},
             brand: window.agencyBrand ? window.agencyBrand() : { name: 'Agency' },
             llName: (window.landlordName && window.landlordName(l)) || l.name || '' };
  }

  /* ── The registry ───────────────────────────────────────────────────────────
     file      a stored document: {name, url}
     inline    generated HTML embedded in the email body
     manual    a document the agent supplies (GOV.UK PDF), so it can only be
               ticked as sent by hand — but it still APPEARS, which is the point
     required  true = serving late or not at all has a legal consequence      */
  const REG = [
    { key: 'infosheet', to: 'tenant', required: true, kind: 'file',
      label: 'Renters\u2019 Rights Act Information Sheet 2026',
      why: 'Before the tenancy starts. Replaced the How to Rent guide on 1 May 2026. Penalty up to \u00a37,000 and it blocks possession.',
      has: () => !!infoSheetDoc(),
      file: () => { const d = infoSheetDoc(); return d ? { name: d.name, url: d.url, on: d.addedAt } : null; },
      note: 'Not filed yet — download it from GOV.UK and add it under Settings → Business documents. Held once, then served automatically for every tenancy.' },

    { key: 'keyterms', to: 'both', required: true, kind: 'inline',
      label: 'Written key terms',
      why: 'Before the tenancy starts, alongside the Information Sheet. Required for tenancies from 1 May 2026.',
      has: () => !!window.NexLetMoveIn,
      html: c => window.NexLetMoveIn ? window.NexLetMoveIn.keyTermsHtml(c.p.id) : '' },

    { key: 'propinfo', to: 'tenant', required: false, kind: 'inline',
      label: 'Property information',
      why: 'Not a statutory document, but it is what a tenant actually needs on day one \u2014 stopcock, meters, bin days, where the rent goes, who to call out of hours. The same sheet prints for handover.',
      has: c => !!(window.NexLetMoveIn && window.NexLetMoveIn.hasInfo && window.NexLetMoveIn.hasInfo(c.p.id)),
      html: c => window.NexLetMoveIn ? window.NexLetMoveIn.propInfoHtml(c.p.id) : '',
      note: 'Mostly blank \u2014 fill it in from the property page so the tenant gets something useful' },

    { key: 'gas', to: 'both', required: true, kind: 'file',
      label: 'Gas safety record',
      why: 'Before the tenant occupies. A new record within 28 days of each check.',
      has: c => !!c.certs.gas,
      file: c => ({ name: c.certs.gasDoc, url: c.certs.gasDocUrl, on: c.certs.gas }) },

    { key: 'eicr', to: 'both', required: true, kind: 'file',
      label: 'Electrical installation report (EICR)',
      why: 'Before occupation, and within 28 days of a written request.',
      has: c => !!c.certs.eicr,
      file: c => ({ name: c.certs.eicrDoc, url: c.certs.eicrDocUrl, on: c.certs.eicr }) },

    { key: 'epc', to: 'both', required: true, kind: 'file',
      label: 'Energy performance certificate',
      why: 'Before occupation. Must be band E or above to let at all.',
      has: c => !!(c.certs.epc || c.certs.epcRating),
      file: c => ({ name: c.certs.epcDoc, url: c.certs.epcDocUrl, on: c.certs.epc }) },

    { key: 'pi', to: 'both', required: true, kind: 'inline',
      label: 'Prescribed information',
      why: 'Within 30 days of the deposit being received, by whoever received it. Failure is a penalty of one to three times the deposit and blocks possession.',
      applies: c => !!parseFloat(c.rec.deposit),
      has: c => !!c.rec.schemeRef,
      html: c => piHtml(c) },

    { key: 'leaflet', to: 'tenant', required: true, kind: 'file',
      label: 'Deposit scheme information leaflet',
      why: 'Must be given WITH the prescribed information, within the same 30 days. The scheme’s own leaflet — the prescribed information alone is not enough.',
      applies: c => !!parseFloat(c.rec.deposit),
      has: () => !!leafletDoc(),
      file: () => { const d = leafletDoc(); return d ? { name: d.name, url: d.url, on: d.addedAt } : null; },
      note: 'Not filed yet — download your scheme’s leaflet and add it under Settings → Business documents. Held once, then served with every deposit.' },

    { key: 'depcert', to: 'tenant', required: false, kind: 'file',
      label: 'Deposit protection certificate',
      why: 'Issued by the scheme. Give it with the prescribed information.',
      applies: c => !!parseFloat(c.rec.deposit),
      has: c => !!c.rec.depositCertUrl,
      file: c => ({ name: c.rec.depositCertName, url: c.rec.depositCertUrl }) },

    { key: 'agreement', to: 'both', required: false, kind: 'inline',
      label: 'Signed tenancy agreement',
      why: 'Every party is entitled to a copy of the executed agreement.',
      has: c => !!(c.ta && c.ta.status === 'signed'),
      html: c => (window.tenancySigBlock ? window.tenancySigBlock(c.ta) : '') +
                 '<hr style="border:none;border-top:1px solid #E4EAF1;margin:22px 0">' +
                 (c.ta.document_html || '') },

    { key: 'receipt', to: 'landlord', required: false, kind: 'note',
      label: 'Receipt of documents, signed by the tenants',
      why: 'The landlord\u2019s evidence that the compliance documents were served on time. Scan the signed sheet in and attach it.',
      has: () => false, note: 'Scan the signed sheet, then attach it to this email' },

    { key: 'inventory', to: 'landlord', required: false, kind: 'note',
      label: 'Inventory and schedule of condition',
      why: 'Signed at check-in. This is what any deposit claim is measured against.',
      has: () => false, note: 'Send once signed at check-in' },

    { key: 'alarms', to: 'landlord', required: false, kind: 'note',
      label: 'Alarm test record',
      why: 'Smoke and CO alarms tested on the first day, tenant present. Penalty up to \u00a35,000 per breach.',
      has: c => !!(c.certs.smokeSounded),
      note: 'From the move-in pack, once signed' },

    { key: 'meters', to: 'landlord', required: false, kind: 'note',
      label: 'Meter readings at check-in',
      why: 'Opening readings, so a later billing dispute can be settled.',
      has: () => false, note: 'From the move-in pack, once recorded' }
  ];

  /* Prescribed information, generated. Wording follows who actually holds the
     deposit — the duty sits on the recipient, not on the agent by default. */
  /* Placeholder settings must never reach a document. */
  const PLACEHOLDER = /^(not yet a member|not applicable|n\/a|none|not holding client money|tbc)$/i;
  function schemeName(c, held) {
    if (held !== 'landlord') {
      const a = (ST().agency || {}).depScheme || '';
      return PLACEHOLDER.test(a.trim()) ? '' : a;
    }
    /* Landlord-held: the scheme is the landlord's. The agency setting says
       nothing about it, so print a rule rather than assert the wrong scheme. */
    return '';
  }

  function piHtml(c) {
    const held = window.NexLetDeposit ? window.NexLetDeposit.holderOf(c.rec) : 'landlord';
    const dep = parseFloat(c.rec.deposit) || 0;
    const scheme = schemeName(c, held);
    const row = (k, v) => '<tr><td style="padding:7px 12px 7px 0;color:#6B6055;width:36%;vertical-align:top;' +
      'border-bottom:1px solid #F0EAE0">' + k + '</td><td style="padding:7px 0;color:#1B2F4A;font-weight:600;' +
      'vertical-align:top;border-bottom:1px solid #F0EAE0">' + v + '</td></tr>';
    const blank = '<span style="display:inline-block;min-width:150px;border-bottom:1px solid #1B2F4A">&nbsp;</span>';
    return '<h3 style="font-size:17px;color:#1B2F4A;margin:0 0 4px">Prescribed information</h3>' +
      '<p style="font-size:13px;color:#6B6055;margin:0 0 12px;line-height:1.6">Given under the Housing Act 2004. ' +
      'It tells you where your deposit is held and how to get it back.</p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
      row('Property', esc(c.p.address || '')) +
      row('Deposit amount', dep ? '\u00a3' + dep.toFixed(2) : blank) +
      row('Date received', c.rec.depositReceived ? esc(dt(c.rec.depositReceived)) : blank) +
      row('Held by', held === 'landlord' ? esc(c.llName || 'The landlord') + ' \u2014 paid to them direct'
        : held === 'scheme' ? 'A government-approved custodial scheme' : esc(c.brand.name)) +
      row('Protection scheme' + (held === 'landlord' ? ' (the landlord\u2019s)' : ''),
        scheme ? esc(scheme) : blank) +
      row('Scheme reference', c.rec.schemeRef ? esc(c.rec.schemeRef) : blank) +
      (c.rec.landlordSchemeNo ? row('Scheme membership no.', esc(c.rec.landlordSchemeNo)) : '') +
      row('Landlord', esc(c.llName) || blank) +
      row('Agent', esc(c.brand.name)) +
      (c.rec.depositPaidBy ? row('Paid by', esc(c.rec.depositPaidBy) +
        ' \u2014 a relevant person, who receives this information too') : '') +
      row('Tenants', esc(c.people.map(x => x.name).join(', '))) +
      row('Getting it back', 'At the end of the tenancy, once any agreed deductions are settled. ' +
        'Deductions may be made only for unpaid rent, damage beyond fair wear and tear, cleaning back to the ' +
        'standard recorded at check-in, or keys not returned.') +
      row('If you disagree', 'The scheme\u2019s adjudicator will decide, free of charge, on the evidence both sides provide.') +
      '</table>';
  }

  /* ── Status, derived ────────────────────────────────────────────────────── */
  /* Which documents have actually gone out, and when — read back from the stamp
     on the filed copy, so it reflects what was sent rather than a separate flag
     that can drift out of step with it. */
  function servedKeys(pid) {
    const out = {};
    (ST().letters || [])
      .filter(x => x.property_id === pid && /^serve_/.test(x.type || '') && x.body_html)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      .forEach(x => {
        const body = String(x.body_html);
        /* A document served by hand carries the date it ACTUALLY went out, which is
           not the date the record was filed — you can record last week's post
           today, and the 30-day clocks must read the real date. */
        const on = (body.match(/<!--nexlet-served-on:([^>]*)-->/) || [])[1] || x.created_at;
        const m = body.match(/<!--nexlet-served:([^>]*)-->/);
        if (m) { m[1].split(',').filter(Boolean).forEach(k => { out[k] = on; }); return; }
        /* Filed before the stamp existed: the copy still names each document it
           carried, so read the labels back out of it. */
        REG.forEach(r => { if (r.label && body.indexOf(r.label) >= 0) out[r.key] = on; });
      });
    return out;
  }
  function servedAt(pid, key) { return servedKeys(pid)[key] || null; }

  function sentAt(pid, audience) {
    const rows = (ST().letters || []).filter(x => x.property_id === pid && x.type === 'serve_' + audience);
    if (!rows.length) return null;
    return rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0].created_at;
  }

  function items(pid, audience) {
    const c = ctx(pid);
    return REG.filter(r => (r.to === audience || r.to === 'both') && (!r.applies || r.applies(c)))
      .map(r => {
        const has = !!r.has(c);
        const f = (r.kind === 'file' && has && r.file) ? r.file(c) : null;
        const ready = r.kind === 'inline' ? has : r.kind === 'file' ? !!(f && f.url) : false;
        /* Manual and note items cannot be sent by the app, but they must still be
           confirmable — otherwise a required document the agent forgot to attach
           passes silently, which is the whole failure this registry prevents. */
        return { ...r, has, file: f, ready, confirmable: r.kind === 'manual' || r.kind === 'note' };
      });
  }
  /* Required items that will not go out and have not been confirmed by hand. */
  function unmet(list, picked) {
    return list.filter(x => x.required && !x.ready &&
      !(x.confirmable && picked && picked.indexOf(x.key) >= 0));
  }

  /* ── Modal ──────────────────────────────────────────────────────────────── */
  function open(pid, audience) {
    const c = ctx(pid);
    if (!c.rec.id) { window.toast('Set up the tenancy first', 1); return; }
    const list = items(pid, audience);
    const to = audience === 'tenant'
      ? c.people.filter(x => x.email).map(x => x.email)
      : (c.l.email ? [c.l.email] : []);
    const missing = unmet(list, []);
    const prev = sentAt(pid, audience);

    const row = x => {
      const was = servedAt(c.p.id, x.key);
      const state = was ? ['Served ' + (dt(was) || ''), 'green'] : x.ready ? ['Ready', 'green']
        : x.kind === 'manual' ? [x.required ? 'Tick to confirm attached' : 'Attach yourself', 'amber']
        : x.kind === 'note' ? ['Attach when ready', 'amber'] : ['Not on file', 'red'];
      return '<label style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;' +
        'border-bottom:1px solid var(--border);cursor:' + (x.ready ? 'pointer' : 'default') + '">' +
        '<input type="checkbox" class="srv-item" value="' + x.key + '"' +
        (x.ready ? ' checked' : x.confirmable ? '' : ' disabled') + ' style="width:auto;margin:3px 0 0">' +
        '<span style="flex:1;min-width:0">' +
        '<span style="font-size:12.5px;font-weight:600;color:var(--navy)">' + esc(x.label) + '</span>' +
        (x.required ? '<span style="font-size:10px;color:var(--red);font-weight:700;margin-left:6px">REQUIRED</span>' : '') +
        '<span class="faint" style="display:block;font-size:11px;line-height:1.55;margin-top:1px">' + x.why + '</span>' +
        (!x.ready && x.note ? '<span style="display:block;font-size:11px;color:var(--amber);margin-top:2px">' +
          esc(x.note) + '</span>' : '') +
        (x.file && x.file.name ? '<span class="faint" style="display:block;font-size:10.5px;margin-top:2px">' +
          esc(x.file.name) + (x.file.on ? ' \u00b7 ' + esc(dt(x.file.on)) : '') + '</span>' : '') +
        '</span>' +
        '<span class="pill" style="background:var(--' + state[1] + '-bg);color:var(--' + state[1] +
        ');flex:0 0 auto">' + state[0] + '</span></label>';
    };

    window.modal(
      (audience === 'tenant' ? 'Serve on the tenant' : 'Send to the landlord') + ' \u2014 ' + esc(c.p.address || ''),
      (prev ? '<div class="note ok" style="margin-bottom:12px"><b>Already sent ' + esc(dt(prev)) +
        '.</b> Sending again is fine \u2014 it files a fresh copy and the tenant keeps the earlier one.</div>' : '') +
      (missing.length ? '<div class="note warn" style="margin-bottom:12px"><b>' + missing.length +
        ' required document' + (missing.length === 1 ? '' : 's') + ' not accounted for:</b> ' +
        esc(missing.map(x => x.label).join(', ')) +
        '. Each of these has a legal consequence if not served in time. Upload it, or tick it to confirm you have attached it to the email yourself.</div>' : '') +
      '<div class="fg"><label>Going to</label>' +
      (to.length ? '<div style="font-size:12.5px;color:var(--navy);font-weight:600">' + esc(to.join(', ')) + '</div>'
        : '<div style="font-size:12.5px;color:var(--red)">No email address on file \u2014 add one first</div>') +
      '</div>' +
      '<div style="margin-top:6px">' + list.map(row).join('') + '</div>' +
      '<div class="fg" style="margin-top:12px"><label>Anything to add to the covering note</label>' +
      '<textarea id="srv-note" rows="2" placeholder="Optional \u2014 appears above the documents"></textarea></div>',
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn" onclick="NexLetServe.preview(\'' + pid + '\',\'' + audience + '\')">Preview</button>' +
      '<button class="btn navy"' + (to.length ? '' : ' disabled') +
      ' onclick="NexLetServe.send(\'' + pid + '\',\'' + audience + '\')">Send from NexLet</button>', true);
  }

  /* ── Compose ────────────────────────────────────────────────────────────── */
  function compose(pid, audience, picked, extra) {
    const c = ctx(pid);
    const chosen = items(pid, audience).filter(x => picked.indexOf(x.key) >= 0);
    const names = audience === 'tenant'
      ? c.people.map(x => x.name.split(' ')[0]).join(' and ')
      : (c.llName || 'there');
    const links = chosen.filter(x => x.kind === 'file' && x.file && x.file.url);
    const inlines = chosen.filter(x => x.kind === 'inline');

    const intro = audience === 'tenant'
      ? '<p>Dear ' + esc(names) + ',</p><p>Below are the documents for your tenancy at <b>' +
        esc(c.p.address || '') + '</b>' + (c.rec.start ? ', which begins on ' + esc(dt(c.rec.start)) : '') +
        '. Please keep them \u2014 several are documents you are entitled to receive by law, and you may need them later.</p>'
      : '<p>Dear ' + esc(names) + ',</p><p>The tenancy at <b>' + esc(c.p.address || '') +
        '</b> is now in place' + (c.rec.start ? ', starting ' + esc(dt(c.rec.start)) : '') +
        '. Below are the documents for your records, including the signed agreement.</p>';

    const dutyNote = (audience === 'landlord' &&
      (window.NexLetDeposit ? window.NexLetDeposit.holderOf(c.rec) : 'landlord') === 'landlord' &&
      parseFloat(c.rec.deposit))
      ? '<div style="background:#FAF6EE;border:1px solid #EADFC8;border-radius:7px;padding:13px 15px;' +
        'font-size:13.5px;line-height:1.65;color:#5C5348;margin:16px 0">' +
        '<b>The deposit is paid to you directly, so the statutory duty is yours.</b> It must be protected in a ' +
        'government-approved scheme within 30 days of you receiving it, and the prescribed information served in ' +
        'the same period. Failing to do so is a penalty of one to three times the deposit and prevents you ' +
        'regaining possession. Please send us the scheme certificate and reference for the file.</div>'
      : '';

    const linkBlock = links.length
      ? '<h3 style="font-size:16px;color:#1B2F4A;margin:22px 0 6px">Certificates</h3>' +
        '<ul style="font-size:13.5px;line-height:1.9;padding-left:20px;margin:0">' +
        links.map(x => '<li><a href="' + x.file.url + '">' + esc(x.label) + '</a>' +
          (x.file.on ? ' <span style="color:#8A7D6E">\u00b7 dated ' + esc(dt(x.file.on)) + '</span>' : '') +
          '</li>').join('') + '</ul>'
      : '';

    const manualNote = chosen.filter(x => x.kind === 'manual' || x.kind === 'note').length
      ? '<p style="font-size:12.5px;color:#8A7D6E;margin-top:18px">Also attached to this email: ' +
        esc(chosen.filter(x => x.kind === 'manual' || x.kind === 'note').map(x => x.label).join(', ')) + '.</p>'
      : '';

    const body = intro + dutyNote +
      (extra ? '<p>' + esc(extra).replace(/\n/g, '<br>') + '</p>' : '') +
      linkBlock + manualNote +
      inlines.map(x => '<div style="margin-top:26px;padding-top:20px;border-top:2px solid #1B2F4A">' +
        x.html(c) + '</div>').join('') +
      '<p style="font-size:12.5px;color:#8A7D6E;margin-top:24px">If anything here is missing or looks wrong, ' +
      'tell us straight away.</p>';

    const subject = (audience === 'tenant' ? 'Your tenancy documents \u2014 ' : 'Tenancy documents \u2014 ') +
      (c.p.address || '');
    const stamp = '<!--nexlet-served:' + chosen.map(x => x.key).join(',') + '-->';
    return { subject, html: window.letterWrap(subject, body) + stamp,
             to: audience === 'tenant' ? c.people.filter(x => x.email).map(x => x.email)
                                       : (c.l.email ? [c.l.email] : []),
             urls: links.map(x => x.file.url), chosen };
  }

  const pickedKeys = () => [...document.querySelectorAll('.srv-item')].filter(x => x.checked).map(x => x.value);

  /* ── recording service you carried out yourself ───────────────────────────
     The app could only ever know about documents it sent. Everything handed over
     at the property, posted, or emailed from your own mailbox stayed invisible,
     so the banner kept demanding documents the tenant already held — and being
     told you are non-compliant when you are not is how a compliance panel ends up
     ignored. This files the same kind of record a NexLet send files, so it flows
     into the service history and the deadline checks by the same route. */
  function recordManual(pid, audience) {
    const aud = audience || 'tenant';
    const c = ctx(pid);
    const srv = servedKeys(pid);
    const open = items(pid, aud).filter(x => !srv[x.key]);
    if (!open.length) { window.toast('Everything on the list is already recorded as served'); return; }
    const today = new Date().toISOString().slice(0, 10);
    window.modal('Record documents you served yourself \u2014 ' + esc(c.p.address || ''),
      '<p class="hint" style="margin:0 0 14px">For anything you handed over, posted, or emailed from your own mailbox. ' +
      'It is filed exactly like a send from here, so it counts towards the deadlines and appears in the service history.</p>' +
      '<div class="grid2" style="gap:10px">' +
        '<div class="fg"><label>Date you served them</label>' +
          '<input id="rm-date" type="date" max="' + today + '" value="' + today + '"></div>' +
        '<div class="fg"><label>How</label><select id="rm-route">' +
          ['Email from my own mailbox', 'Handed over in person', 'Post', 'Recorded delivery']
            .map(r => '<option>' + r + '</option>').join('') + '</select></div></div>' +
      '<div class="fg"><label>Which documents?</label>' +
        open.map(x => '<label style="display:flex;gap:9px;align-items:flex-start;padding:7px 0;' +
          'border-top:1px solid var(--border)">' +
          '<input type="checkbox" class="rm-item" value="' + x.key + '" checked style="margin-top:3px">' +
          '<span><span style="font-size:12.5px;font-weight:600;color:var(--navy)">' + esc(x.label) + '</span>' +
          (x.required ? '' : ' <span class="faint" style="font-size:11px">(not required)</span>') +
          '</span></label>').join('') + '</div>' +
      '<div class="fg"><label>Note <span class="faint">(optional \u2014 what you sent, to whom)</span></label>' +
        '<input id="rm-note" placeholder="e.g. emailed the key terms PDF to all three tenants"></div>' +
      '<div class="fg"><label>Attach the copy you sent <span class="faint">(strongly recommended)</span></label>' +
        '<input id="rm-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.eml,.msg">' +
        '<span class="hint">A scan, the PDF you attached, or a screenshot of the sent email. Without a copy this is ' +
        'your word alone \u2014 it will be recorded, but flagged as unevidenced, because in a deposit dispute or a ' +
        'possession claim a filed copy is what carries weight.</span></div>',
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn navy" onclick="NexLetServe.saveManual(\'' + pid + '\',\'' + aud + '\')">Record it</button>', true);
  }

  async function saveManual(pid, audience) {
    const keys = [...document.querySelectorAll('.rm-item')].filter(x => x.checked).map(x => x.value);
    if (!keys.length) { window.toast('Pick at least one document', 1); return; }
    const date = (document.getElementById('rm-date') || {}).value || '';
    if (!date) { window.toast('Set the date you served them', 1); return; }
    if (new Date(date) > new Date()) { window.toast('That date is in the future', 1); return; }
    const route = (document.getElementById('rm-route') || {}).value || '';
    const note = (document.getElementById('rm-note') || {}).value || '';
    const fEl = document.getElementById('rm-file');
    const file = fEl && fEl.files && fEl.files[0] ? fEl.files[0] : null;
    const c = ctx(pid);
    const iso = new Date(date + 'T12:00:00').toISOString();
    const named = items(pid, audience).filter(x => keys.indexOf(x.key) >= 0);

    /* A copy turns this from an assertion into evidence, so the two are recorded
       differently and shown differently. An upload that fails must not be allowed
       to pass silently as evidenced. */
    let url = '';
    if (file) {
      if (!window._storageUpload) { window.toast('Cannot upload while offline \u2014 connect and try again', 1); return; }
      const ext = (file.name.split('.').pop() || 'pdf');
      url = await window._storageUpload(file, pid + '/served-' + Date.now() + '.' + ext, 'tenant-documents') || '';
      if (!url) { window.toast('\u26a0 The copy did not upload \u2014 nothing recorded. Check your connection.', 1); return; }
    }

    const body = '<p>The following were served on the ' +
      (audience === 'tenant' ? 'tenant' : 'landlord') + ' by <b>' + esc(route.toLowerCase()) + '</b> on <b>' +
      esc(window.fmtDate ? window.fmtDate(iso) : date) + '</b>, outside NexLet.</p>' +
      '<ul>' + named.map(x => '<li>' + esc(x.label) + '</li>').join('') + '</ul>' +
      (note ? '<p><b>Note:</b> ' + esc(note) + '</p>' : '') +
      (url ? '<p><b>Copy on file:</b> <a href="' + esc(url) + '">' + esc(file.name) + '</a></p>'
           : '<p style="color:#B4543A"><b>No copy held.</b> This is a record of service without a copy of ' +
             'what was sent. Attach one if you can still retrieve it.</p>') +
      '<p style="font-size:12px;color:#6B6055">Recorded ' +
      (window.fmtDate ? window.fmtDate(new Date().toISOString()) : '') + '.</p>';
    const subject = (url ? 'Served \u2014 copy on file \u2014 ' : 'Recorded as served, no copy \u2014 ') + (c.p.address || '');

    await window.fileLetter({ propertyId: pid,
      landlordId: audience === 'landlord' ? c.p.landlordId : null,
      type: 'serve_' + audience, subject: subject,
      html: window.letterWrap(subject, body) +
        '<!--nexlet-served:' + keys.join(',') + '-->' +
        '<!--nexlet-served-on:' + iso + '-->' +
        '<!--nexlet-route:' + route + '-->' +
        '<!--nexlet-evidence:' + (url ? 'copy' : 'none') + '-->',
      to: [] });

    if (window.NexLetAudit) window.NexLetAudit.log({ action: 'doc.recorded', entity: 'tenancy',
      entityId: (c.rec || {}).id, entityLabel: (c.p.address || ''),
      detail: { documents: named.map(x => x.label).join(', '), route: route,
                servedOn: window.fmtDate ? window.fmtDate(iso) : date,
                evidence: url ? file.name : 'none held', note: note } });

    window.closeModal(); if (window.render) window.render();
    window.toast(url ? '\u2713 Recorded with a copy on file'
                     : '\u2713 Recorded \u2014 no copy held, so it shows as unevidenced');
  }

  /* Which served documents rest on nothing but a typed date. Anything NexLet sent
     itself has a copy by definition, so only hand-recorded entries can be weak. */
  function unevidenced(pid) {
    const out = {};
    (ST().letters || [])
      .filter(x => x.property_id === pid && /^serve_/.test(x.type || '') && x.body_html)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      .forEach(x => {
        const body = String(x.body_html);
        const m = body.match(/<!--nexlet-served:([^>]*)-->/);
        if (!m) return;
        const ev = (body.match(/<!--nexlet-evidence:([^>]*)-->/) || [])[1];
        m[1].split(',').filter(Boolean).forEach(k => {
          if (ev === 'none') out[k] = true; else delete out[k];
        });
      });
    return out;
  }

  window.NexLetServe = {
    open, items, sentAt, servedAt, servedKeys, recordManual, saveManual, unevidenced,

    preview(pid, audience) {
      const m = compose(pid, audience, pickedKeys(), (document.getElementById('srv-note') || {}).value || '');
      const w = window.open('', '_blank');
      if (!w) { window.toast('Allow pop-ups to preview', 1); return; }
      w.document.write(m.html); w.document.close();
    },

    async send(pid, audience) {
      const picked = pickedKeys();
      if (!picked.length) { window.toast('Pick at least one document', 1); return; }
      const m = compose(pid, audience, picked, (document.getElementById('srv-note') || {}).value || '');
      if (!m.to.length) { window.toast('No email address on file', 1); return; }

      const miss = unmet(items(pid, audience), picked);
      if (miss.length && !confirm('These required documents are not accounted for:\n\n' +
          miss.map(x => '  \u2022 ' + x.label).join('\n') +
          '\n\nEach carries a legal consequence if not served in time. Send anyway?')) return;

      const rec = window.tenantRecFor(pid), p = window.P(pid) || {};
      const sent = [], failed = [];
      for (const addr of m.to) {
        const r = await window.agencyEmail(addr, m.subject, m.html, m.urls);
        if (r && r.ok) sent.push(addr); else failed.push(addr + (r && r.error ? ' (' + r.error + ')' : ''));
      }
      if (!sent.length) {
        window.toast('\u26a0 Nothing sent \u2014 ' + (failed[0] || 'the mail service refused it') +
          '. Nothing has been filed.', 1);
        return;
      }
      // File and log only what actually went out — this is the record that
      // proves what was served and when.
      await window.fileLetter({ propertyId: pid, landlordId: audience === 'landlord' ? p.landlordId : null,
        type: 'serve_' + audience, subject: m.subject, html: m.html, to: sent });
      if (window.NexLetAudit) window.NexLetAudit.log({
        action: 'email.sent', entity: 'tenancy', entityId: rec ? rec.id : null,
        entityLabel: (rec ? rec.name : '') + ' \u2014 ' + (p.address || ''),
        detail: { document: (audience === 'tenant' ? 'Tenant' : 'Landlord') + ' document pack',
          served: m.chosen.map(x => x.label).join(', '), sentTo: sent.join(', '),
          failed: failed.length ? failed.join(', ') : undefined }
      });
      window.closeModal(); window.render();
      window.toast(failed.length
        ? '\u26a0 Sent to ' + sent.length + ' of ' + m.to.length + ' \u2014 failed: ' + failed.join(', ')
        : '\u2713 Served on ' + sent.length + ' recipient' + (sent.length === 1 ? '' : 's'), failed.length ? 1 : 0);
    }
  };
})();
