/* nexlet-material.js — material information for a listing.
 *
 * WHY
 *
 * An advert that leaves out something a tenant would want to know before
 * deciding is an unfair commercial practice. That duty used to sit in the
 * Consumer Protection from Unfair Trading Regulations, with National Trading
 * Standards publishing guidance on what counts; since the Digital Markets,
 * Competition and Consumers Act 2024 it is enforced by the Competition and
 * Markets Authority instead, and the NTSELAT guidance has been withdrawn. The
 * A/B/C structure it set out has not changed and the portals are still built
 * around it, so it remains the sensible way to organise the answers — but it is
 * guidance, not a statutory checklist, and completing it is not a defence in
 * itself. What is material is decided on the facts.
 *
 * Three things follow from that, and they are what this module is for.
 *
 * FIRST, Part A belongs on the first page of the listing. Parts B and C have to
 * be available and easy to find, but not necessarily up front. So the sheet is
 * ordered that way and the readiness check treats a missing Part A answer as
 * blocking and a missing Part B answer as a warning.
 *
 * SECOND, "not known" is an answer and blank is not. A portal flags an empty
 * field, and a tenant reading a gap cannot tell whether the answer is bad or
 * nobody asked. Every field here therefore takes a positive "not known", which
 * publishes as a stated position with a reason.
 *
 * THIRD, agents are expected to verify, not to repeat. Every answer carries
 * where it came from — checked by the agency, stated by the landlord, or not
 * known — and the sheet prints that alongside the answer. An answer the landlord
 * gave and nobody checked is still publishable; passing it off as verified is
 * what causes the problem.
 */
(function () {
  'use strict';

  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escJs = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const PROP = id => (window.P ? window.P(id) : null) || (ST().properties || []).find(p => String(p.id) === String(id));

  /* Where an answer came from. The distinction is the point of the exercise:
     an agent is expected to check, and a listing that presents the landlord's
     word as the agency's own finding is the failure mode. */
  const SRC = [
    ['agency', 'Checked by us', '#1E7B4F'],
    ['landlord', 'Stated by the landlord', '#8A6D1F'],
    ['unknown', 'Not known', '#8A7D6E']
  ];
  const srcLabel = k => (SRC.find(s => s[0] === k) || [])[1] || 'Not answered';
  const srcColour = k => (SRC.find(s => s[0] === k) || [])[2] || '#B3261E';

  /* Part A — the answers that must appear on the first page of the listing.
     Rent, council tax band and property type are already held on the property
     record and are read from there rather than asked for twice; a listing that
     can disagree with the property it describes is worse than no listing. */
  const A_FIELDS = [
    ['deposit', 'Security deposit', 'select', ['Five weeks\u2019 rent (the cap for rents under \u00a350,000 a year)',
      'Six weeks\u2019 rent (rents of \u00a350,000 a year or more)', 'Less than the cap', 'No deposit \u2014 replacement product offered']],
    ['tenancyLength', 'Minimum tenancy length offered', 'select',
      ['6 months', '12 months', '12 months, then rolling monthly', '24 months', 'Negotiable']],
    ['billsIncluded', 'Bills included in the rent', 'select',
      ['None \u2014 the tenant pays all utilities and council tax', 'Water only', 'All utilities', 'All utilities and council tax', 'Some \u2014 stated in the listing']]
  ];

  /* Part B — asked for every property, wherever the answer lands. */
  const B_FIELDS = [
    ['construction', 'How the property is built', 'select',
      ['Standard \u2014 brick or stone walls, tiled or slate roof', 'Cavity wall, insulated', 'Timber frame',
       'System-built or prefabricated concrete', 'Steel frame', 'Other non-standard construction', 'Not known']],
    ['rooms', 'Rooms, beyond the bedroom and bathroom count', 'text',
      'e.g. one reception room, separate kitchen, utility cupboard'],
    ['electricity', 'Electricity supply', 'select', ['Mains', 'Mains with solar panels', 'Off-grid', 'Not known']],
    ['water', 'Water supply', 'select', ['Mains', 'Private supply \u2014 well or borehole', 'Not known']],
    ['drainage', 'Drainage', 'select', ['Mains sewer', 'Septic tank', 'Sewage treatment plant', 'Cesspit', 'Not known']],
    ['heating', 'Heating and its fuel', 'select',
      ['Gas central heating', 'Electric central heating', 'Electric storage heaters', 'Oil central heating',
       'LPG central heating', 'Heat pump', 'Communal or district heating', 'Solid fuel', 'No fixed heating', 'Not known']],
    ['broadband', 'Broadband available at the property', 'select',
      ['Full fibre to the premises', 'Part fibre \u2014 fibre to the cabinet', 'Cable', 'ADSL only',
       'Mobile broadband only', 'None available', 'Not known']],
    ['mobile', 'Mobile signal indoors', 'select',
      ['Good on all major networks', 'Variable by network', 'Poor \u2014 wifi calling advised', 'Not known']],
    ['parking', 'Parking', 'select',
      ['Allocated off-street space', 'Garage', 'Driveway', 'Residents\u2019 permit \u2014 charged by the council',
       'On-street, unrestricted', 'On-street, restricted hours', 'None']]
  ];

  /* Part C — only answered where it applies, and the honest answer to most of
     these on most properties is "no". Asking anyway is the point: an unasked
     question and a question answered "no" look identical on a listing, and only
     one of them was checked. */
  const C_FIELDS = [
    ['buildingSafety', 'Building safety \u2014 cladding, remediation, or a known structural issue'],
    ['restrictions', 'Restrictions \u2014 listed building, conservation area, restrictive covenant, or a pet or smoking prohibition in the head lease'],
    ['rights', 'Rights and easements \u2014 shared drive or access, a public right of way, a neighbour\u2019s right to cross'],
    ['flood', 'Flooding \u2014 flood risk designation, or the property has flooded'],
    ['erosion', 'Coastal erosion risk'],
    ['planning', 'Planning \u2014 permission granted at the property, or a development nearby that would affect a tenant'],
    ['accessibility', 'Accessibility \u2014 step-free access, a wet room, a stairlift, or adaptations in place'],
    ['mining', 'Mining or coalfield area'],
    ['hazards', 'Other \u2014 anything else a tenant would want to know before viewing']
  ];

  const mi = p => (p && p.certs && p.certs._mi) || {};
  const get = (p, k) => mi(p)[k] || { v: '', src: '' };

  /* Value and source are two separate controls sitting side by side, so setting
     one and forgetting the other is an ordinary slip. A source with no value is
     not an answer: publishing it would print an empty field over the words
     "checked by us", which asserts we checked something and then says nothing.
     "Not known" is the one case where an empty value IS the answer. */
  function answeredA(a) { return !!(a && a.src && (a.src === 'unknown' || a.v)); }
  function answeredC(a) { return !!(a && a.src && (a.src === 'unknown' || !a.applies || a.v)); }

  /* Part A is blocking, because it belongs on the first page of the advert.
     Part B is a warning: the listing can run while an answer is chased, but it
     is running incomplete and the agent should know that. Part C is counted
     separately again — an unanswered Part C question is not a gap in the
     listing, it is a question nobody has asked yet. */
  function ready(p) {
    const d = mi(p);
    const aBase = [];
    if (!p.rent) aBase.push('Rent');
    if (!p.councilTaxBand) aBase.push('Council tax band');
    if (!p.ptype) aBase.push('Property type');
    const aMiss = aBase.concat(A_FIELDS.filter(f => !answeredA(d[f[0]])).map(f => f[1]));
    const bMiss = B_FIELDS.filter(f => !answeredA(d[f[0]])).map(f => f[1]);
    /* Never asked and answered-yes-but-blank are different problems and get
       different words. Calling an answered question "not asked" sends the agent
       looking for a question they already dealt with. */
    const cMiss = C_FIELDS.filter(f => !(d[f[0]] || {}).src).map(f => f[1]);
    const cPartial = C_FIELDS.filter(f => { const a = d[f[0]]; return a && a.src && !answeredC(a); }).map(f => f[1]);
    const unverified = A_FIELDS.concat(B_FIELDS).filter(f => (d[f[0]] || {}).src === 'landlord').length;
    return { aMiss, bMiss, cMiss, cPartial, unverified, canAdvertise: !aMiss.length,
      complete: !aMiss.length && !bMiss.length && !cMiss.length && !cPartial.length };
  }

  /* ── The card on the property page ─────────────────────────────────────── */
  function panel(p) {
    if (!p) return '';
    const r = ready(p);
    const tone = r.canAdvertise ? (r.complete ? 'green' : 'amber') : 'red';
    const bg = { green: 'var(--green-bg)', amber: 'var(--amber-bg)', red: 'var(--red-bg)' }[tone];
    const bd = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)' }[tone];
    const line = r.canAdvertise
      ? (r.complete ? 'Complete. Every question answered.'
         : [r.bMiss.length ? r.bMiss.length + ' Part B answer' + (r.bMiss.length === 1 ? '' : 's') + ' still missing' : '',
            r.cMiss.length ? r.cMiss.length + ' Part C question' + (r.cMiss.length === 1 ? '' : 's') + ' not asked' : '',
            r.cPartial.length ? r.cPartial.length + ' answered yes with no detail' : ''
           ].filter(Boolean).join(' \u00b7 '))
      : r.aMiss.length + ' Part A answer' + (r.aMiss.length === 1 ? '' : 's') + ' missing \u2014 ' + esc(r.aMiss.join(', '));
    return '<div style="border:1px solid ' + bd + ';background:' + bg + ';border-radius:10px;padding:12px 15px;' +
      'margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:260px">' +
      '<div style="font-size:13px;font-weight:700;color:var(--navy)">Material information' +
      (r.canAdvertise ? '' : ' \u2014 not ready to advertise') + '</div>' +
      '<div style="font-size:11.5px;color:var(--muted);margin-top:2px;line-height:1.5">' + line +
      (r.unverified ? ' \u00b7 <b>' + r.unverified + '</b> answer' + (r.unverified === 1 ? '' : 's') +
        ' taken from the landlord and not checked' : '') + '</div></div>' +
      '<button class="btn sm navy" onclick="NexLetMaterial.open(\'' + escJs(p.id) + '\')">' +
      (r.canAdvertise ? 'Review' : 'Complete it') + '</button>' +
      (r.canAdvertise ? '<button class="btn sm" onclick="NexLetMaterial.view(\'' + escJs(p.id) + '\')">See the sheet</button>' : '') +
      '</div>';
  }

  /* ── Editor ────────────────────────────────────────────────────────────── */
  function srcPicker(k, cur) {
    return '<select id="mi-src-' + k + '" style="width:150px;font-size:11.5px">' +
      '<option value=""' + (cur ? '' : ' selected') + '>\u2014 source \u2014</option>' +
      SRC.map(s => '<option value="' + s[0] + '"' + (cur === s[0] ? ' selected' : '') + '>' + esc(s[1]) + '</option>').join('') +
      '</select>';
  }
  function fieldRow(p, f) {
    const cur = get(p, f[0]);
    const input = f[2] === 'select'
      ? '<select id="mi-v-' + f[0] + '" style="flex:1;min-width:200px">' +
        '<option value=""' + (cur.v ? '' : ' selected') + '>\u2014 select \u2014</option>' +
        f[3].map(o => '<option' + (cur.v === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>'
      : '<input id="mi-v-' + f[0] + '" value="' + esc(cur.v) + '" placeholder="' + esc(f[3] || '') + '" style="flex:1;min-width:200px">';
    return '<div style="padding:9px 0;border-bottom:1px solid var(--border)">' +
      '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px">' + esc(f[1]) + '</label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + input + srcPicker(f[0], cur.src) + '</div></div>';
  }
  function cRow(p, f) {
    const cur = get(p, f[0]);
    /* From the stored flag, never from whether detail text happens to be there.
       Deriving it from the text turned a "yes" with an empty detail box into a
       "no" on reopen, while the sheet still printed "Yes" — the editor and the
       document disagreeing about flood risk. */
    const applies = (!cur.src || cur.src === 'unknown') ? '' : (cur.applies ? 'yes' : 'no');
    return '<div style="padding:9px 0;border-bottom:1px solid var(--border)">' +
      '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:5px">' + esc(f[1]) + '</label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<select id="mi-c-' + f[0] + '" onchange="NexLetMaterial.toggleC(\'' + f[0] + '\')" style="width:170px">' +
      '<option value=""' + (applies ? '' : ' selected') + '>\u2014 not asked \u2014</option>' +
      '<option value="no"' + (applies === 'no' ? ' selected' : '') + '>No, does not apply</option>' +
      '<option value="yes"' + (applies === 'yes' ? ' selected' : '') + '>Yes \u2014 details below</option>' +
      '<option value="unknown"' + (cur.src === 'unknown' ? ' selected' : '') + '>Not known</option>' +
      '</select>' +
      '<input id="mi-v-' + f[0] + '" value="' + esc(cur.v) + '" placeholder="What a tenant needs to know" ' +
      'style="flex:1;min-width:200px;display:' + (applies === 'yes' ? '' : 'none') + '">' +
      '<select id="mi-src-' + f[0] + '" style="width:150px;font-size:11.5px;display:' + (applies ? '' : 'none') + '">' +
      SRC.slice(0, 2).map(s => '<option value="' + s[0] + '"' + (cur.src === s[0] ? ' selected' : '') + '>' + esc(s[1]) + '</option>').join('') +
      '</select></div></div>';
  }
  function toggleC(k) {
    const sel = document.getElementById('mi-c-' + k);
    const v = document.getElementById('mi-v-' + k), s = document.getElementById('mi-src-' + k);
    if (!sel) return;
    if (v) v.style.display = sel.value === 'yes' ? '' : 'none';
    if (s) s.style.display = (sel.value === 'no' || sel.value === 'yes') ? '' : 'none';
  }

  function open(pid) {
    const p = PROP(pid);
    if (!p) { window.toast('Property not found', 1); return; }
    const r = ready(p);
    const H = t => '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);' +
      'font-weight:700;margin:16px 0 2px">' + t + '</div>';
    window.modal('Material information \u2014 ' + esc(p.address || ''),
      '<div class="note" style="margin-bottom:12px">Part A goes on the first page of the advert. Parts B and C ' +
      'have to be easy to find but can sit behind a link. <b>Say "not known" rather than leaving a gap</b> \u2014 a ' +
      'blank field is flagged by the portals and tells a tenant nothing.</div>' +
      (r.aMiss.length ? '<div class="note warn" style="margin-bottom:12px"><b>Not ready to advertise.</b> ' +
        esc(r.aMiss.join(', ')) + ' still to answer.</div>' : '') +
      H('Part A \u2014 on the first page of the listing') +
      '<div style="font-size:11.5px;color:var(--muted);margin-bottom:4px">Rent ' +
      (p.rent ? '\u00a3' + p.rent + ' pcm' : '<b style="color:var(--red)">not set</b>') +
      ' \u00b7 Council tax band ' + (p.councilTaxBand ? esc(p.councilTaxBand) : '<b style="color:var(--red)">not set</b>') +
      ' \u00b7 ' + (p.ptype ? esc(p.ptype) : '<b style="color:var(--red)">type not set</b>') +
      ' \u2014 edit these on the property itself.</div>' +
      A_FIELDS.map(f => fieldRow(p, f)).join('') +
      H('Part B \u2014 asked for every property') +
      B_FIELDS.map(f => fieldRow(p, f)).join('') +
      H('Part C \u2014 only where it applies') +
      '<div style="font-size:11.5px;color:var(--muted);margin-bottom:4px">Most of these are "no" on most ' +
      'properties. Answer them anyway: a question nobody asked and a question answered "no" look the same on a ' +
      'listing, and only one of them was checked.</div>' +
      C_FIELDS.map(f => cRow(p, f)).join(''),
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn" onclick="NexLetMaterial.save(\'' + escJs(pid) + '\',1)">Save and see the sheet</button>' +
      '<button class="btn navy" onclick="NexLetMaterial.save(\'' + escJs(pid) + '\')">Save</button>', true);
  }

  function save(pid, thenView) {
    const p = PROP(pid);
    if (!p) return;
    p.certs = p.certs || {};
    const d = Object.assign({}, p.certs._mi || {});
    const vOf = k => { const e = document.getElementById('mi-v-' + k); return e ? e.value.trim() : ''; };
    const sOf = k => { const e = document.getElementById('mi-src-' + k); return e ? e.value : ''; };
    A_FIELDS.concat(B_FIELDS).forEach(f => {
      const v = vOf(f[0]), s = sOf(f[0]);
      if (!s && !v) { delete d[f[0]]; return; }
      /* An answer of "Not known" and a source of "Not known" are the same
         statement, so picking either sets both. Otherwise the sheet can print
         "Not known / checked by us", which reads as nonsense. */
      d[f[0]] = (v === 'Not known' || s === 'unknown') ? { v: '', src: 'unknown' } : { v: v, src: s || 'landlord' };
    });
    C_FIELDS.forEach(f => {
      const sel = document.getElementById('mi-c-' + f[0]);
      const mode = sel ? sel.value : '';
      if (!mode) { delete d[f[0]]; return; }
      if (mode === 'unknown') { d[f[0]] = { v: '', src: 'unknown' }; return; }
      d[f[0]] = { v: mode === 'yes' ? vOf(f[0]) : '', src: sOf(f[0]) || 'landlord', applies: mode === 'yes' };
    });
    d._updatedAt = new Date().toISOString();
    p.certs._mi = d;
    if (window.pushProperty) window.pushProperty(p);
    if (window.NexLetAudit) window.NexLetAudit.log({ action: 'material.saved', entity: 'property',
      entityId: String(p.id), entityLabel: p.address || '', detail: { ready: ready(p).canAdvertise } });
    window.closeModal();
    if (window.render) window.render();
    const r = ready(p);
    window.toast(r.canAdvertise ? '\u2713 Material information saved' : 'Saved \u2014 Part A still incomplete', r.canAdvertise ? 0 : 1);
    if (thenView) view(pid);
  }

  /* ── The sheet ─────────────────────────────────────────────────────────── */
  function sheetHtml(p) {
    const d = mi(p), b = (window.agencyBrand ? window.agencyBrand() : {}) || {};
    const dt = x => { try { return x && window.fmtDate ? window.fmtDate(x) : ''; } catch (e) { return ''; } };
    const H = t => '<h2 style="font-size:14px;color:#1B2F4A;margin:22px 0 6px;padding-bottom:5px;' +
      'border-bottom:1px solid #E8DFCF">' + t + '</h2>';
    const tag = src => '<span style="font-size:10.5px;color:' + srcColour(src) + '">' + esc(srcLabel(src)) + '</span>';
    const line = (label, value, src) => '<tr>' +
      '<td style="padding:7px 12px 7px 0;font-size:12.5px;color:#8A7D6E;vertical-align:top;width:42%">' + esc(label) + '</td>' +
      '<td style="padding:7px 0;font-size:12.5px;vertical-align:top">' + value +
      (src ? '<br>' + tag(src) : '') + '</td></tr>';
    const fixed = (label, v) => line(label, v ? '<b>' + esc(v) + '</b>' : '<span style="color:#B3261E">Not stated</span>', '');
    const answered = f => {
      const a = d[f[0]];
      if (!answeredA(a)) return line(f[1], '<span style="color:#B3261E">Not answered</span>', '');
      if (a.src === 'unknown') return line(f[1], '<b>Not known</b><br><span style="font-size:11px;color:#8A7D6E">' +
        'We asked and could not establish this.</span>', '');
      return line(f[1], '<b>' + esc(a.v) + '</b>', a.src);
    };
    const cAnswered = f => {
      const a = d[f[0]];
      if (!a || !a.src) return line(f[1], '<span style="color:#B3261E">Not asked</span>', '');
      if (a.src === 'unknown') return line(f[1], '<b>Not known</b>', '');
      if (!a.applies) return line(f[1], 'No', a.src);
      /* Answered yes and left blank. Printing a bare "Yes" would be worse than
         the gap: it tells a tenant something applies and nothing about what. */
      if (!a.v) return line(f[1], '<b>Yes</b> \u2014 <span style="color:#B3261E">details still to be added</span>', a.src);
      return line(f[1], '<b>Yes.</b> ' + esc(a.v), a.src);
    };
    const T = rows => '<table style="width:100%;border-collapse:collapse;table-layout:fixed">' + rows + '</table>';
    return '<div data-doc-label="Material information" style="font-family:Georgia,\'Times New Roman\',serif;' +
      'max-width:780px;margin:0 auto;color:#2C2418;line-height:1.6">' +
      '<div style="border-bottom:2px solid #1B2F4A;padding-bottom:12px;margin-bottom:10px;display:flex;' +
      'justify-content:space-between;align-items:flex-end;gap:16px">' +
      '<div><div style="font-size:21px;font-weight:700;color:#1B2F4A">' + esc(b.name || '') + '</div>' +
      (b.tagline ? '<div style="font-style:italic;color:#8A7D6E;font-size:12.5px">' + esc(b.tagline) + '</div>' : '') + '</div>' +
      '<div style="text-align:right;font-size:10.5px;color:#8A7D6E">' +
      (d._updatedAt ? 'Last updated ' + esc(dt(d._updatedAt)) : '') + '</div></div>' +
      '<h1 style="font-size:19px;color:#1B2F4A;margin:16px 0 3px">Material information</h1>' +
      '<p style="color:#8A7D6E;font-size:12.5px;margin:0 0 6px">' + esc(p.address || '') +
      (p.postcode ? ', ' + esc(p.postcode) : '') + '</p>' +
      '<p style="font-size:12px;margin:0 0 4px">Each answer below says where it came from. Where it says <b>' +
      'stated by the landlord</b>, that is the landlord\u2019s account and we have not independently checked it.</p>' +
      H('Part A') +
      T(fixed('Rent', p.rent ? '\u00a3' + Number(p.rent).toLocaleString('en-GB') + ' per calendar month' : '') +
        fixed('Council tax band', p.councilTaxBand) +
        fixed('Property type', p.ptype) +
        fixed('Bedrooms', p.beds) + fixed('Bathrooms', p.baths) +
        (p.epc ? fixed('EPC rating', p.epc) : '') +
        A_FIELDS.map(answered).join('')) +
      H('Part B') + T(B_FIELDS.map(answered).join('')) +
      H('Part C') + T(C_FIELDS.map(cAnswered).join('')) +
      '<p style="font-size:11px;color:#8A7D6E;margin:18px 0 0;padding-top:10px;border-top:1px solid #E8DFCF">' +
      'This sheet is given so a tenant can decide whether to view the property. It is not a survey and it is not ' +
      'advice. Where an answer is marked as not known, we asked and could not establish it. If anything here ' +
      'matters to your decision, ask us and we will try to find out.</p></div>';
  }

  function view(pid) {
    const p = PROP(pid); if (!p) return;
    const w = window.open('', '_blank');
    if (!w) { window.toast('Allow pop-ups to open the sheet', 1); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>Material information</title>' +
      '<body style="margin:0;padding:34px 38px;background:#fff">' + sheetHtml(p) + '</body>');
    w.document.close();
  }

  window.NexLetMaterial = { panel, open, save, view, ready, sheetHtml, toggleC, A_FIELDS, B_FIELDS, C_FIELDS };
})();
