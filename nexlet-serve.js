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

  function ctx(pid) {
    const p = (window.P && window.P(pid)) || {};
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    const l = (window.L && window.L(p.landlordId)) || {};
    const people = (window._tnPeopleView ? window._tnPeopleView(rec) : []).filter(x => x && x.name);
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
    { key: 'infosheet', to: 'tenant', required: true, kind: 'manual',
      label: 'Renters\u2019 Rights Act Information Sheet 2026',
      why: 'Before the tenancy starts. Replaced the How to Rent guide on 1 May 2026. Penalty up to \u00a37,000 and it blocks possession.',
      has: c => !!c.certs.infosheet, note: 'GOV.UK PDF \u2014 attach it to the email yourself' },

    { key: 'keyterms', to: 'both', required: true, kind: 'inline',
      label: 'Written key terms',
      why: 'Before the tenancy starts, alongside the Information Sheet. Required for tenancies from 1 May 2026.',
      has: () => !!window.NexLetMoveIn,
      html: c => window.NexLetMoveIn ? window.NexLetMoveIn.keyTermsHtml(c.p.id) : '' },

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
  function piHtml(c) {
    const held = window.NexLetDeposit ? window.NexLetDeposit.holderOf(c.rec) : 'landlord';
    const dep = parseFloat(c.rec.deposit) || 0;
    const scheme = (ST().agency || {}).depScheme || '';
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
      row('Protection scheme', scheme ? esc(scheme) : blank) +
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
      const state = x.ready ? ['Ready', 'green']
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
    return { subject, html: window.letterWrap(subject, body),
             to: audience === 'tenant' ? c.people.filter(x => x.email).map(x => x.email)
                                       : (c.l.email ? [c.l.email] : []),
             urls: links.map(x => x.file.url), chosen };
  }

  const pickedKeys = () => [...document.querySelectorAll('.srv-item')].filter(x => x.checked).map(x => x.value);

  window.NexLetServe = {
    open, items, sentAt,

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
