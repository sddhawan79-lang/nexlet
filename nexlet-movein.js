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

  /* ── 1b. Property information — how the place works ─────────────────────
     The welcome letter in NexLet is a takeover-of-management letter: right for a
     tenancy inherited, wrong for a new let, where what a tenant actually needs on
     day one is where the stopcock is and which day the bins go.

     One function, two routes, deliberately: this exact document is emailed with
     the serve pack before keys AND printed for handover, because a tenant who
     lost the email still has the sheet on the fridge. Facts the record does not
     hold print as a blank rule — the landlord fills what they know at onboarding
     and the rest gets completed on the visit, so a half-filled sheet is still
     worth handing over.

     Stored on the property under certs._info, following the pattern _leasehold
     already established, so no migration is needed. */
  const INFO_FIELDS = [
    ['boiler',   'Boiler',                'Where it is, and how to operate it'],
    ['stopcock', 'Stopcock',              'The tenant needs this before they need it'],
    ['fusebox',  'Fuse box / consumer unit', 'Where to reset a tripped breaker'],
    ['gasMeter', 'Gas meter',             'Location, and where the key or card is if prepay'],
    ['elecMeter','Electricity meter',     'Location'],
    ['waterMeter','Water meter',          'Location, or note that the supply is unmetered'],
    ['bins',     'Bins and collection days', 'Which day, and where the bins are kept'],
    ['parking',  'Parking',               'Bay, permit, or none'],
    ['ooh',      'Out of hours',          'What to do about an emergency outside office hours'],
    ['other',    'Anything else',         'Alarm codes, quirks, the window that sticks']
  ];
  const infoOf = pid => { const p = (window.P && window.P(pid)) || {};
    return (p.info || (p.certs && p.certs._info) || {}); };

  function propInfoHtml(pid) {
    const c = ctx(pid);
    const inf = infoOf(pid);
    const rent = parseFloat(c.rec.rent || c.p.rent) || 0;
    const pay = (() => { try { return JSON.parse(c.rec.payDetails || '{}'); } catch (e) { return {}; } })();
    const v = k => inf[k] ? esc(inf[k]) : rule(200);

    const living = INFO_FIELDS.map(f => [esc(f[1]), v(f[0])]);

    const rentRows = [
      ['Rent', rent ? money(rent) + ' per month' : rule(120)],
      ['Due on', esc(ord(String(c.p.rentDueDay || '1st').replace(/\D/g, '') || 1)) + ' of each month'],
      ['Paid to', c.agentMoney ? esc(c.brand.name) : (esc(c.llName) || rule(160))],
      pay.acc ? ['Account name', esc(pay.acc)] : null,
      pay.sort ? ['Sort code', esc(pay.sort)] : null,
      pay.no ? ['Account number', esc(pay.no)] : null,
      pay.ref ? ['Reference', esc(pay.ref)] : null
    ].filter(Boolean);

    const contactRows = [
      ['Managed by', esc(c.brand.name)],
      c.brand.agent ? ['Your contact', esc(c.brand.agent)] : null,
      c.brand.email ? ['Email', esc(c.brand.email)] : null,
      c.brand.phone ? ['Phone', esc(c.brand.phone)] : null,
      ['Repairs', 'Report through your tenant portal, or email us. We will acknowledge it and keep you updated.'],
      ['Out of hours', inf.ooh ? esc(inf.ooh) : rule(220)]
    ].filter(Boolean);

    return sect('Your property information',
      'How this home works, and who to contact. Keep it somewhere handy \u2014 it is not part of the tenancy agreement, ' +
      'and nothing in it changes your tenancy terms.',
      '<div style="font-size:13px;color:#1B2F4A;font-weight:600;margin:0 0 6px">' + esc(c.p.address || '') + '</div>' +
      '<div style="font-size:11.5px;color:#6B6055;margin:0 0 16px">' +
      (c.rec.start ? 'Tenancy from ' + esc(dt(c.rec.start)) : '') + '</div>' +
      '<div style="font-size:12px;font-weight:700;color:#1B2F4A;margin:0 0 6px;letter-spacing:.03em">FINDING THINGS</div>' +
      tbl(living) +
      '<div style="font-size:12px;font-weight:700;color:#1B2F4A;margin:20px 0 6px;letter-spacing:.03em">RENT</div>' +
      tbl(rentRows) +
      '<div style="font-size:12px;font-weight:700;color:#1B2F4A;margin:20px 0 6px;letter-spacing:.03em">GETTING HOLD OF US</div>' +
      tbl(contactRows) +
      '<p style="font-size:11.5px;color:#6B6055;margin:18px 0 0;line-height:1.65">' +
      'Council tax and the utility accounts are yours from the start of the tenancy. Please contact the council and ' +
      'each supplier to put the accounts in your name, using the opening meter readings recorded at check-in.</p>');
  }

  /* Enough filled in to be worth sending. */
  function hasInfo(pid) { const inf = infoOf(pid);
    return INFO_FIELDS.filter(f => (inf[f[0]] || '').trim()).length >= 3; }

  function editInfo(pid) {
    const inf = infoOf(pid), p = (window.P && window.P(pid)) || {};
    const filled = INFO_FIELDS.filter(f => (inf[f[0]] || '').trim()).length;
    window.modal('Property information \u2014 ' + esc(p.address || ''),
      '<p class="hint" style="margin:0 0 14px">What a tenant needs on day one. The landlord fills what they know; ' +
      'complete the rest on the check-in visit. Anything left blank prints as a line to write on, so a ' +
      'half-filled sheet is still worth handing over. ' + filled + ' of ' + INFO_FIELDS.length + ' filled in.</p>' +
      INFO_FIELDS.map(f =>
        '<div class="fg"><label>' + esc(f[1]) + ' <span class="faint" style="font-weight:400">\u2014 ' + esc(f[2]) + '</span></label>' +
        '<input id="pi-' + f[0] + '" value="' + esc(inf[f[0]] || '') + '"></div>').join(''),
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn" onclick="NexLetMoveIn.previewInfo(\'' + pid + '\')">Preview the sheet</button>' +
      '<button class="btn navy" onclick="NexLetMoveIn.saveInfo(\'' + pid + '\')">Save</button>', true);
  }

  async function saveInfo(pid) {
    const p = (window.P && window.P(pid)); if (!p) return;
    const out = {};
    INFO_FIELDS.forEach(f => { const el = document.getElementById('pi-' + f[0]);
      if (el && el.value.trim()) out[f[0]] = el.value.trim(); });
    p.info = out;
    p.certs = Object.assign({}, p.certs || {}, { _info: out });
    if (window.save) window.save();
    /* Reported, not guarded silently: in LIVE mode save() is a no-op, so this
       write is the only thing standing between a filled-in sheet and a blank one
       after reload. Claiming success before knowing it landed is how fields go
       missing. */
    if (window.LIVE && !(window.pushProperty && await window.pushProperty(p))) {
      window.toast('\u26a0 Could not save the property information \u2014 nothing has been stored. Retry.', 1);
      return;
    }
    if (window.NexLetAudit) window.NexLetAudit.log({ action: 'property.updated', entity: 'property',
      entityId: pid, entityLabel: p.address || '',
      detail: { document: 'Property information', filled: Object.keys(out).length + ' of ' + INFO_FIELDS.length } });
    window.closeModal(); if (window.render) window.render();
    window.toast('\u2713 Property information saved');
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
      ['Property information', 'Meters, stopcock, bins, rent and contacts', true],
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
    const order = { keyterms: keyTermsHtml, propinfo: propInfoHtml, receipt: receiptHtml,
                    alarms: alarmHtml, meters: metersKeysHtml };
    const body = (parts && parts.length ? parts : ['receipt', 'keyterms', 'propinfo', 'alarms', 'meters'])
      .map(k => order[k] ? order[k](pid) : '').join('');
    return head + body;
  }

  function pack(pid, parts) {
    const rec = window.tenantRecFor && window.tenantRecFor(pid);
    if (!rec || !rec.id) { if (window.toast) window.toast('Set up the tenancy first', 1); return false; }
    if (!window.NexLetPrint) { if (window.toast) window.toast('Print module not loaded', 1); return false; }
    const p = (window.P && window.P(pid)) || {};
    /* Only true if the window actually opened — pop-up blocking is common and is
       the case where a "printed" record would be a lie. */
    if (!window.NexLetPrint.doc(packHtml(pid, parts), 'Move-in pack', p.address || '')) return false;
    if (window.NexLetAudit) window.NexLetAudit.log({
      action: 'doc.printed', entity: 'tenancy', entityId: rec.id,
      entityLabel: (rec.name || '') + ' — ' + (p.address || ''),
      detail: { document: 'Move-in pack', sections: (parts || ['receipt','keyterms','alarms','meters']).join(', ') }
    });
    return true;
  }

  /* Chooser, so a single sheet can be reprinted without the whole pack. */
  /* The printable sheets, declared once. nexlet-signed.js reads this to build
     its shelf, so the list of what can be signed and the list of what can be
     scanned back cannot drift apart — they were already drifting: the shelf had
     separate rows for meters and keys, which are one sheet here.

     signed:1 marks a sheet that comes back with a signature on it. The property
     information sheet is the tenant's to keep and is not signed. */
  const SHEETS = [
    ['receipt',  'Receipt of documents',      'What the tenant signs to confirm everything was handed over', 1],
    ['keyterms', 'Written key terms',         'Required for tenancies from 1 May 2026, alongside the Information Sheet', 1],
    ['propinfo', 'Property information',      'Stopcock, bins, meters, rent, who to call — the same sheet that goes out with the document pack', 0],
    ['alarms',   'Alarm test record',         'Smoke and CO alarms, tested on the first day, tenant present', 1],
    ['meters',   'Meter readings and keys',   'Readings and key count, signed', 1]
  ];

  /* When each sheet was last printed, so the shelf can tell "never printed" from
     "printed and not yet scanned back" — the second is a job half done and the
     one worth chasing. Stored in the signed-docs bag under a reserved key rather
     than in a column of its own. */
  function printedMap(pid) {
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    return ((rec.signedDocs || {})._printed) || {};
  }
  function notePrinted(pid, parts) {
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)); if (!rec) return;
    const now = new Date().toISOString();
    const before = rec.signedDocs;
    rec.signedDocs = Object.assign({}, rec.signedDocs || {});
    const pr = Object.assign({}, rec.signedDocs._printed || {});
    parts.forEach(k => { pr[k] = now; });
    rec.signedDocs._printed = pr;
    if (window.save) window.save();
    /* Rolled back if the write fails, so the shelf cannot show "printed, not
       scanned back" for a note the database never took. */
    if (window.pushTenantRec) Promise.resolve(window.pushTenantRec(rec))
      .then(ok => { if (ok === false) { rec.signedDocs = before; if (window.render) window.render(); } });
  }

  function open(pid) {
    const rec = window.tenantRecFor && window.tenantRecFor(pid);
    if (!rec || !rec.id) { if (window.toast) window.toast('Set up the tenancy first', 1); return; }
    const p = (window.P && window.P(pid)) || {};
    const pr = printedMap(pid);
    const S = window.NexLetSigned;
    /* Each sheet carries its own state and its own upload, so the loop — print,
       sign, scan back — closes in one place instead of sending the agent off to
       find a different panel afterwards. */
    const row = (k, label, why, signable) => {
      const h = (S && signable) ? S.held(pid, k) : null;
      const printedAt = pr[k];
      const state = h ? '<span style="color:var(--green)">\u2713 Signed copy on file \u00b7 ' +
            esc(window.fmtDate ? window.fmtDate(h.signedAt) : h.signedAt) + '</span>'
        : (signable && printedAt) ? '<span style="color:var(--amber)">Printed ' +
            esc(window.fmtDate ? window.fmtDate(printedAt) : printedAt) + ' \u00b7 not scanned back</span>'
        : signable ? '<span class="faint">Signed on paper, scanned back here</span>'
        : '<span class="faint">For the tenant to keep \u2014 not signed</span>';
      return '<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border)">' +
        '<input type="checkbox" class="mip-part" value="' + k + '" checked style="width:auto;margin:3px 0 0">' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-size:12.5px;font-weight:600;color:var(--navy)">' + label + '</div>' +
        '<div class="faint" style="font-size:11px">' + why + '</div>' +
        '<div style="font-size:11px;margin-top:2px">' + state + '</div></div>' +
        (signable ? '<div style="display:flex;gap:5px;flex-shrink:0">' +
          (h ? '<button class="btn sm" onclick="viewDoc(\'' + esc(h.url) + '\',\'' + esc(label) + '\')">View</button>' : '') +
          '<button class="btn sm" onclick="NexLetSigned.add(\'' + pid + '\',\'' + k + '\')">' +
          (h ? 'Replace' : '\u2191 Upload signed') + '</button></div>' : '') +
        '</div>';
    };
    window.modal('Move-in pack — ' + esc(p.address || ''),
      '<div class="note" style="margin-bottom:12px">Prints as one job, one sheet per page, ready to sign by hand. ' +
      'Upload each signed sheet against its own line when it comes back — or use ' +
      '<b>one scan of the whole stack</b> at the bottom.</div>' +
      SHEETS.map(s => row(s[0], s[1], s[2], s[3])).join('') +
      '<div class="hint" style="margin-top:10px">The Information Sheet itself is a GOV.UK PDF — download and print ' +
      'it separately, then tick it on the receipt.</div>',
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn navy" onclick="NexLetMoveIn.printSelected(\'' + pid + '\')">\u2318 Print pack</button>', true);
  }

  window.NexLetMoveIn = {
    open, pack, packHtml, keyTermsHtml, propInfoHtml, editInfo, saveInfo, hasInfo,
    SHEETS, printedMap, notePrinted,
    previewInfo(pid) {
      const w = window.open('', '_blank');
      if (!w) { window.toast('Allow pop-ups to preview', 1); return; }
      w.document.write(packHtml(pid, ['propinfo'])); w.document.close();
    },
    printSelected(pid) {
      const parts = [...document.querySelectorAll('.mip-part')].filter(x => x.checked).map(x => x.value);
      if (!parts.length) { if (window.toast) window.toast('Pick at least one sheet', 1); return; }
      window.closeModal();
      /* Recorded only if the paper actually went to a printer. */
      if (pack(pid, parts)) notePrinted(pid, parts);
    }
  };
})();
