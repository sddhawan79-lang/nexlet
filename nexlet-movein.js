/* nexlet-movein.js — move-in day pack.
 *
 * Two things this owns:
 *
 *  1. WRITTEN KEY TERMS. From 1 May 2026 the Renters' Rights Act withdrew the
 *     How to Rent guide and replaced it with the Information Sheet PLUS a
 *     requirement to give new tenants the key terms of the tenancy in writing.
 *     The app had no such document.
 *
 *  2. THE MOVE-IN PACK. Everything that must be served or signed on the first
 *     day, as one print job: a receipt of documents the tenant signs, the key
 *     terms, the alarm test record, meter readings and key handover.
 *
 * Sheets that need a wet signature are laid out to be signed on paper and
 * scanned back in. Nothing here invents data: any field the record does not
 * hold is printed as a blank rule for completion by hand.
 */
(function () {
  'use strict';

  /* agent.html's `S` is a top-level lexical binding, not a window property. */
  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const money = n => '£' + (Number(n) || 0).toFixed(2);
  const dt = d => { try { return window.fmtDate ? window.fmtDate(d) : (d || ''); } catch (e) { return d || ''; } };
  const ord = n => { const x = parseInt(n, 10); if (!x) return '1st';
    const s = ['th','st','nd','rd'][(x % 100 - 20) % 10] || ['th','st','nd','rd'][x % 100] || 'th';
    return x + (['th','st','nd','rd'].indexOf(s) >= 0 ? s : 'th'); };

  /* A blank rule for anything to be completed by hand on the day. */
  const rule = (w) => '<span style="display:inline-block;min-width:' + (w || 140) +
    'px;border-bottom:1px solid #1B2F4A">&nbsp;</span>';

  function ctx(pid) {
    const P = window.P, L = window.L;
    const p = (P && P(pid)) || {};
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    const l = (L && L(p.landlordId)) || {};
    const people = (window._tnPeopleView ? window._tnPeopleView(rec) : []).filter(x => x && x.name);
    const brand = window.agencyBrand ? window.agencyBrand() : { name: 'Agency' };
    const held = window.NexLetDeposit ? window.NexLetDeposit.holderOf(rec) : 'landlord';
    const agentMoney = window.holdsClientMoney ? window.holdsClientMoney() : false;
    return { p, rec, l, people, brand, held, agentMoney,
             llName: (window.landlordName && window.landlordName(l)) || l.name || '' };
  }

  /* ── Section shell ──────────────────────────────────────────────────────── */
  const sect = (title, sub, body) =>
    '<section style="page-break-after:always;padding-bottom:8px">' +
    '<div style="border-bottom:2px solid #1B2F4A;padding-bottom:6px;margin-bottom:14px">' +
    '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:22px;font-weight:600;color:#1B2F4A">' + esc(title) + '</div>' +
    (sub ? '<div style="font-size:11.5px;color:#8A7D6E;margin-top:2px">' + sub + '</div>' : '') +
    '</div>' + body + '</section>';

  const sigLine = (role, name) =>
    '<div style="margin-top:14px">' +
    '<div style="display:flex;gap:26px;align-items:flex-end">' +
    '<div style="flex:1"><div style="border-bottom:1px solid #1B2F4A;height:38px"></div>' +
    '<div style="font-size:10.5px;color:#8A7D6E;margin-top:3px">Signature — ' + esc(role) +
    (name ? ' (' + esc(name) + ')' : '') + '</div></div>' +
    '<div style="width:150px"><div style="border-bottom:1px solid #1B2F4A;height:38px"></div>' +
    '<div style="font-size:10.5px;color:#8A7D6E;margin-top:3px">Date</div></div>' +
    '</div></div>';

  const tbl = rows => '<table style="width:100%;border-collapse:collapse;font-size:12.5px">' +
    rows.map(r => r === '-' ? '<tr><td colspan="2" style="padding:5px 0"></td></tr>' :
      '<tr><td style="padding:6px 10px 6px 0;color:#6B6055;vertical-align:top;width:38%">' + r[0] +
      '</td><td style="padding:6px 0;color:#1B2F4A;font-weight:600;vertical-align:top">' + r[1] + '</td></tr>').join('') +
    '</table>';

  /* ── 1. Written key terms ───────────────────────────────────────────────── */
  function keyTermsHtml(pid) {
    const c = ctx(pid);
    const rent = parseFloat(c.rec.rent || c.p.rent) || 0;
    const dep = parseFloat(c.rec.deposit) || 0;
    const cap = window.depositCap ? window.depositCap(rent) : null;
    const payee = c.agentMoney ? c.brand.name : (c.llName || 'the landlord');
    /* Never print a placeholder setting, and where the landlord holds the deposit
       the scheme is theirs — the agency setting says nothing about it. */
    const _a = ((ST().agency || {}).depScheme || '').trim();
    const scheme = (c.held === 'landlord' ||
      /^(not yet a member|not applicable|n\/a|none|not holding client money|tbc)$/i.test(_a)) ? '' : _a;

    const rows = [
      ['Landlord', esc(c.llName) || rule(200)],
      ['Agent', esc(c.brand.name)],
      ['Property', esc(c.p.address || '') + (c.p.postcode ? ', ' + esc(c.p.postcode) : '')],
      ['Tenant(s)', c.people.length ? esc(c.people.map(x => x.name).join(', ')) : rule(220)],
      '-',
      ['Type of tenancy', 'Assured tenancy, periodic (rolling month to month). Under the Renters\u2019 Rights Act 2025 fixed terms are no longer used, and section 21 no-fault eviction has been abolished.'],
      ['Tenancy begins', c.rec.start ? esc(dt(c.rec.start)) : rule(140)],
      '-',
      ['Rent', rent ? '<b>' + money(rent) + '</b> per month' : rule(120) + ' per month'],
      ['Rent due', 'The ' + esc(ord(c.p.rentDueDay || 1)) + ' of each month'],
      ['Rent payable to', '<b>' + esc(payee) + '</b>' +
        (c.agentMoney ? '' : ' — paid direct to the landlord. Rent is not paid to the agent.')],
      ['Rent increases', 'Not more than once in any 12-month period, by at least two months\u2019 written notice on the prescribed form. You may challenge an increase at the First-tier Tribunal.'],
      '-',
      ['Deposit', dep ? '<b>' + money(dep) + '</b>' +
        (cap ? ' (' + cap.weeks + ' weeks\u2019 rent — the statutory maximum is ' + money(cap.cap) + ')' : '') : rule(120)],
      ['Deposit held by', c.held === 'landlord' ? esc(c.llName || 'The landlord') + ' — paid to them direct'
        : c.held === 'scheme' ? 'A government-approved custodial scheme' : esc(c.brand.name)],
      ['Protection scheme' + (c.held === 'landlord' ? ' (the landlord\u2019s)' : ''),
        scheme ? esc(scheme) : rule(180)],
      ['Scheme reference', c.rec.schemeRef ? esc(c.rec.schemeRef) : rule(180)],
      ['Deposit deductions', 'Only for unpaid rent, damage beyond fair wear and tear, cleaning to the standard at check-in, or unreturned keys. Evidenced against the signed inventory. Disputes are decided free of charge by the scheme\u2019s adjudicator.'],
      '-',
      ['Ending the tenancy — you', 'Two months\u2019 written notice, at any time.'],
      ['Ending the tenancy — landlord', 'Only on a ground set out in the Act, with the notice period that ground requires. There is no no-fault route.'],
      '-',
      ['Repairs', 'The landlord is responsible for the structure, exterior, installations for water, gas, electricity, sanitation, heating and hot water. Report faults promptly. Damp and mould hazards must be investigated and put right within the timescales set by Awaab\u2019s Law.'],
      ['Pets', 'You may request to keep a pet. Consent cannot be unreasonably refused, and a decision must be given within 28 days.'],
      ['Permitted occupiers', c.people.length > 1
        ? esc(c.people.map(x => x.name).join(', ')) + ' only'
        : 'As named above only'],
      ['Complaints', 'Raise it with us first. If unresolved after eight weeks, or if we issue a final response, you may refer the matter to our redress scheme' +
        ((ST().agency || {}).redressScheme ? ' (' + esc((ST().agency || {}).redressScheme) + ')' : '') + ' free of charge.']
    ];

    return sect('Key terms of your tenancy',
      'Given in writing under the Renters\u2019 Rights Act 2026, alongside the Renters\u2019 Rights Act Information Sheet 2026. This is a plain-English summary — the tenancy agreement is the full contract and prevails if the two differ.',
      tbl(rows) +
      '<p style="font-size:11.5px;color:#6B6055;margin:16px 0 0;line-height:1.65">I have been given these key terms in writing, together with the Renters\u2019 Rights Act Information Sheet 2026, on or before the day my tenancy began.</p>' +
      c.people.map(x => sigLine('Tenant', x.name)).join('') +
      (c.people.length ? '' : sigLine('Tenant', '')));
  }

  /* ── 2. Receipt of documents ────────────────────────────────────────────── */
  function receiptHtml(pid) {
    const c = ctx(pid);
    const cert = c.p.certs || {};
    const items = [
      ['Tenancy agreement', 'Signed copy', true],
      ['Renters\u2019 Rights Act Information Sheet 2026', 'Replaced the How to Rent guide on 1 May 2026', true],
      ['Written key terms', 'Required for tenancies from 1 May 2026', true],
      ['Prescribed information', 'Deposit scheme, how to get the deposit back', !!parseFloat(c.rec.deposit)],
      ['Deposit protection certificate', c.rec.schemeRef ? 'Ref ' + esc(c.rec.schemeRef) : '', !!parseFloat(c.rec.deposit)],
      ['Deposit scheme information leaflet', 'Must accompany the prescribed information', !!parseFloat(c.rec.deposit)],
      ['Gas safety record', cert.gas ? 'Dated ' + esc(dt(cert.gas)) : 'Where there is a gas appliance', true],
      ['Electrical installation report (EICR)', cert.eicr ? 'Dated ' + esc(dt(cert.eicr)) : '', true],
      ['Energy performance certificate (EPC)', cert.epcRating ? 'Rating ' + esc(cert.epcRating) : '', true],
      ['Condensation and mould guidance', 'Acknowledgement signed separately', true],
      ['Household composition declaration', 'Signed by each adult occupier', c.people.length > 1],
      ['Inventory and schedule of condition', 'Signed at check-in', true],
      ['Keys and fobs', 'Counted and signed for', true]
    ].filter(x => x[2]);

    return sect('Receipt of documents',
      esc(c.p.address || '') + ' &nbsp;·&nbsp; ' + esc(c.people.map(x => x.name).join(', ')),
      '<p style="font-size:12px;color:#6B6055;margin:0 0 12px;line-height:1.65">Tick each item as it is handed over. Signing confirms receipt on the date shown, not agreement with the contents.</p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12.5px">' +
      '<tr><th style="text-align:left;padding:6px 0;border-bottom:1px solid #1B2F4A;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#8A7D6E">Received</th>' +
      '<th style="text-align:left;padding:6px 0;border-bottom:1px solid #1B2F4A;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#8A7D6E">Document</th></tr>' +
      items.map(i =>
        '<tr><td style="padding:8px 0;border-bottom:1px solid #EFE7DA;width:64px">' +
        '<span style="display:inline-block;width:15px;height:15px;border:1.5px solid #1B2F4A;border-radius:3px"></span></td>' +
        '<td style="padding:8px 0;border-bottom:1px solid #EFE7DA">' +
        '<div style="font-weight:600;color:#1B2F4A">' + esc(i[0]) + '</div>' +
        (i[1] ? '<div style="font-size:11px;color:#8A7D6E">' + i[1] + '</div>' : '') +
        '</td></tr>').join('') +
      '</table>' +
      (c.people.length ? c.people.map(x => sigLine('Tenant', x.name)).join('') : sigLine('Tenant', '')) +
      sigLine('For ' + c.brand.name, ''));
  }

  /* ── 3. Alarm test record ───────────────────────────────────────────────── */
  function alarmHtml(pid) {
    const c = ctx(pid);
    const cert = c.p.certs || {};
    const blk = (label, key, hint) =>
      '<div style="border:1px solid #E3D9C8;border-radius:8px;padding:12px 14px;margin-bottom:10px">' +
      '<div style="font-size:13px;font-weight:700;color:#1B2F4A;margin-bottom:2px">' + label + '</div>' +
      '<div style="font-size:11px;color:#8A7D6E;margin-bottom:9px">' + hint + '</div>' +
      tbl([
        ['How many fitted', cert[key + 'Count'] ? esc(cert[key + 'Count']) : rule(70)],
        ['Where', cert[key + 'Where'] ? esc(cert[key + 'Where']) : rule(300)],
        ['Test button pressed, alarm sounded',
          '<span style="display:inline-block;width:14px;height:14px;border:1.5px solid #1B2F4A;border-radius:3px;vertical-align:-2px"></span> Yes'],
        ['Tested by', cert[key + 'By'] ? esc(cert[key + 'By']) : rule(180)]
      ]) + '</div>';

    return sect('Alarm test record',
      'Smoke and Carbon Monoxide Alarm (England) Regulations 2015, as amended 1 October 2022. Alarms must be tested on the first day of the tenancy. There is no certificate for this — a dated, witnessed record is the evidence. Penalty up to £5,000 per breach.',
      '<div style="font-size:12.5px;color:#1B2F4A;margin-bottom:12px"><b>' + esc(c.p.address || '') +
      '</b> &nbsp;·&nbsp; Date of test ' + (c.rec.start ? esc(dt(c.rec.start)) : rule(120)) + '</div>' +
      blk('Smoke alarms', 'smoke', 'One on every storey used as living accommodation.') +
      blk('Carbon monoxide alarms', 'co', 'One in every room with a fixed combustion appliance — boiler, gas fire, log burner. Gas cookers are excluded.') +
      '<p style="font-size:11.5px;color:#6B6055;margin:4px 0 0;line-height:1.65">I was present when each alarm was tested and I heard it sound. I understand I should test the alarms regularly and tell the agent at once if one stops working.</p>' +
      (c.people.length ? c.people.map(x => sigLine('Tenant', x.name)).join('') : sigLine('Tenant', '')) +
      sigLine('Tested by, for ' + c.brand.name, ''));
  }

  /* ── 4. Meters and keys ─────────────────────────────────────────────────── */
  function metersKeysHtml(pid) {
    const c = ctx(pid);
    const meterRow = (name) =>
      '<tr><td style="padding:9px 0;border-bottom:1px solid #EFE7DA;color:#1B2F4A;font-weight:600;width:26%">' + name + '</td>' +
      '<td style="padding:9px 0;border-bottom:1px solid #EFE7DA">' + rule(150) + '</td>' +
      '<td style="padding:9px 0;border-bottom:1px solid #EFE7DA">' + rule(170) + '</td></tr>';
    const keyRow = (name) =>
      '<tr><td style="padding:9px 0;border-bottom:1px solid #EFE7DA;color:#1B2F4A;font-weight:600;width:46%">' + name + '</td>' +
      '<td style="padding:9px 0;border-bottom:1px solid #EFE7DA">' + rule(60) + '</td>' +
      '<td style="padding:9px 0;border-bottom:1px solid #EFE7DA">' + rule(200) + '</td></tr>';

    return sect('Meter readings and keys',
      esc(c.p.address || '') + ' &nbsp;·&nbsp; ' + (c.rec.start ? esc(dt(c.rec.start)) : rule(110)) +
      ' &nbsp;·&nbsp; photograph every meter and every key set',
      '<div style="font-size:13px;font-weight:700;color:#1B2F4A;margin:0 0 6px">Meter readings at check-in</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12.5px">' +
      '<tr><th style="text-align:left;padding:5px 0;border-bottom:1px solid #1B2F4A;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#8A7D6E">Supply</th>' +
      '<th style="text-align:left;padding:5px 0;border-bottom:1px solid #1B2F4A;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#8A7D6E">Reading</th>' +
      '<th style="text-align:left;padding:5px 0;border-bottom:1px solid #1B2F4A;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#8A7D6E">Serial / location</th></tr>' +
      meterRow('Electricity') + meterRow('Electricity (night)') + meterRow('Gas') + meterRow('Water') +
      '</table>' +
      '<div style="font-size:13px;font-weight:700;color:#1B2F4A;margin:20px 0 6px">Keys, fobs and devices handed over</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12.5px">' +
      '<tr><th style="text-align:left;padding:5px 0;border-bottom:1px solid #1B2F4A;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#8A7D6E">Item</th>' +
      '<th style="text-align:left;padding:5px 0;border-bottom:1px solid #1B2F4A;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#8A7D6E">Qty</th>' +
      '<th style="text-align:left;padding:5px 0;border-bottom:1px solid #1B2F4A;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#8A7D6E">Notes</th></tr>' +
      keyRow('Front door key') + keyRow('Communal / building entry key') + keyRow('Window keys') +
      keyRow('Door fob / entry device') + keyRow('Meter cupboard key') + keyRow('Other') +
      '</table>' +
      '<p style="font-size:11.5px;color:#6B6055;margin:14px 0 0;line-height:1.65">I confirm the readings above and that I received the keys listed. I will not change any lock without written consent, and I will return every key at the end of the tenancy. Unreturned keys may be charged against the deposit.</p>' +
      (c.people.length ? sigLine('Tenant', c.people[0].name) : sigLine('Tenant', '')) +
      sigLine('For ' + c.brand.name, ''));
  }

  /* ── The pack ───────────────────────────────────────────────────────────── */
  function packHtml(pid, parts) {
    const c = ctx(pid);
    const stamp = new Date();
    const ref = 'BRL-MIP-' + stamp.getFullYear() + String(stamp.getMonth() + 1).padStart(2, '0') + '-' +
      String(pid).slice(-4).toUpperCase();
    const head =
      '<div style="border-bottom:3px solid #1B2F4A;padding-bottom:10px;margin-bottom:16px">' +
      '<div style="font-family:Cormorant Garamond,Georgia,serif;font-size:26px;color:#1B2F4A;font-weight:600">' +
      esc(c.brand.name) + '</div>' +
      (c.brand.tagline ? '<div style="font-style:italic;font-size:12px;color:#8A7D6E">' + esc(c.brand.tagline) + '</div>' : '') +
      '<div style="font-size:11px;color:#8A7D6E;margin-top:6px">Move-in pack &nbsp;·&nbsp; ' + esc(ref) +
      ' &nbsp;·&nbsp; printed ' + stamp.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) +
      '</div></div>';
    const order = { keyterms: keyTermsHtml, receipt: receiptHtml, alarms: alarmHtml, meters: metersKeysHtml };
    const body = (parts && parts.length ? parts : ['receipt', 'keyterms', 'alarms', 'meters'])
      .map(k => order[k] ? order[k](pid) : '').join('');
    return head + body;
  }

  function pack(pid, parts) {
    const rec = window.tenantRecFor && window.tenantRecFor(pid);
    if (!rec || !rec.id) { if (window.toast) window.toast('Set up the tenancy first', 1); return; }
    if (!window.NexLetPrint) { if (window.toast) window.toast('Print module not loaded', 1); return; }
    const p = (window.P && window.P(pid)) || {};
    window.NexLetPrint.doc(packHtml(pid, parts), 'Move-in pack', p.address || '');
    if (window.NexLetAudit) window.NexLetAudit.log({
      action: 'doc.printed', entity: 'tenancy', entityId: rec.id,
      entityLabel: (rec.name || '') + ' — ' + (p.address || ''),
      detail: { document: 'Move-in pack', sections: (parts || ['receipt','keyterms','alarms','meters']).join(', ') }
    });
  }

  /* Chooser, so a single sheet can be reprinted without the whole pack. */
  function open(pid) {
    const rec = window.tenantRecFor && window.tenantRecFor(pid);
    if (!rec || !rec.id) { if (window.toast) window.toast('Set up the tenancy first', 1); return; }
    const p = (window.P && window.P(pid)) || {};
    const row = (k, label, why) =>
      '<label style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer">' +
      '<input type="checkbox" class="mip-part" value="' + k + '" checked style="width:auto;margin:2px 0 0">' +
      '<span><span style="font-size:12.5px;font-weight:600;color:var(--navy)">' + label + '</span>' +
      '<span class="faint" style="display:block;font-size:11px">' + why + '</span></span></label>';
    window.modal('Move-in pack — ' + esc(p.address || ''),
      '<div class="note" style="margin-bottom:12px">Prints as one job, one sheet per page, ready to sign by hand. Scan the signed sheets back in afterwards.</div>' +
      row('receipt', 'Receipt of documents', 'What the tenant signs to confirm everything was handed over') +
      row('keyterms', 'Written key terms', 'Required for tenancies from 1 May 2026, alongside the Information Sheet') +
      row('alarms', 'Alarm test record', 'Smoke and CO alarms, tested on the first day, tenant present') +
      row('meters', 'Meter readings and keys', 'Readings and key count, signed') +
      '<div class="hint" style="margin-top:10px">The Information Sheet itself is a GOV.UK PDF — download and print it separately, then tick it on the receipt.</div>',
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn navy" onclick="NexLetMoveIn.printSelected(\'' + pid + '\')">\u2318 Print pack</button>', true);
  }

  window.NexLetMoveIn = {
    open, pack, packHtml, keyTermsHtml,
    printSelected(pid) {
      const parts = [...document.querySelectorAll('.mip-part')].filter(x => x.checked).map(x => x.value);
      if (!parts.length) { if (window.toast) window.toast('Pick at least one sheet', 1); return; }
      window.closeModal();
      pack(pid, parts);
    }
  };
})();
