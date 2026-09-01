/* nexlet-fees.js — the published fee display.
 *
 * WHY
 *
 * Section 83 of the Consumer Rights Act 2015 requires a letting agent to
 * publicise a list of its fees, charges and penalties — for landlords AND for
 * tenants — at every premises where it deals with people face to face, and on
 * its website. The list must describe each charge, give the amount, say whether
 * it is per dwelling or per tenant, and state whether it includes VAT. It must
 * also state which redress scheme the agent belongs to, and whether or not the
 * agent is a member of a client money protection scheme. Failure is a penalty of
 * £5,000, levied by trading standards, and it applies from the first advert.
 *
 * The landlord side is already in Settings, so this reads it rather than asking
 * for it again — a fee display that can disagree with the management agreement is
 * worse than none. The tenant side is the Tenant Fees Act 2019: everything not on
 * its permitted list is a prohibited payment, so the document is built from that
 * list and nothing else. Which of the permitted payments this agency actually
 * charges is ticked at publication, and the filed document is the record of that
 * choice — no separate setting to drift out of step with the published sheet.
 */
(function () {
  'use strict';

  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const A = () => ST().agency || {};
  const money = n => '\u00a3' + (Math.round(Number(n) || 0)).toLocaleString('en-GB');
  const dt = d => { try { return d && window.fmtDate ? window.fmtDate(d) : ''; } catch (e) { return ''; } };
  const num = (v, d) => (v === 0 || v) ? Number(v) : d;

  /* Sole and multiple agency are different products at different rates, and the
     display has to carry both — a landlord reading it must be able to find the
     rate they were quoted. */
  const RATES = () => ({
    fee: num(typeof DEF_FEE !== 'undefined' ? DEF_FEE : null, 7.5),
    multiFee: num(typeof MULTI_FEE !== 'undefined' ? MULTI_FEE : null, 12),
    weeks: num(typeof DEF_WEEKS !== 'undefined' ? DEF_WEEKS : null, 3),
    multiWeeks: num(typeof MULTI_WEEKS !== 'undefined' ? MULTI_WEEKS : null, 4.345)
  });

  const ANC = [
    ['renewalFee', 'Renewing a tenancy', 'Per tenancy'],
    ['noticeFee', 'Preparing and serving a notice', 'Per notice'],
    ['arrearsFee', 'Chasing rent arrears, after the first letter', 'Per tenancy'],
    ['keyFee', 'Lost key or lockout call-out', 'Per call-out'],
    ['insuranceFee', 'Handling an insurance claim', 'Per claim'],
    ['disputeFee', 'Handling a deposit dispute', 'Per dispute'],
    ['invMoveinFee', 'Move-in inventory and check-in report', 'Per property'],
    ['invMoveoutFee', 'Move-out and check-out report', 'Per property']
  ];

  /* The Tenant Fees Act permitted list. Nothing may be added to it: any payment
     not on this list is prohibited, whatever it is called. Rent, the holding
     deposit and the tenancy deposit are permitted for every tenancy and are
     stated unconditionally; the rest are charged only if this agency charges
     them, which is why they are ticked at publication. */
  const TENANT_OPT = [
    ['change', 'Changing, assigning or ending the tenancy at your request',
      'Capped at \u00a350, or our reasonable costs where they are higher and evidenced in writing', 'Per tenancy'],
    ['early', 'Ending the tenancy early at your request',
      'Our reasonable loss, evidenced \u2014 rent to the end of the fixed term or until a replacement tenancy begins, ' +
      'whichever is sooner, plus the landlord\u2019s reasonable re-letting costs', 'Per tenancy'],
    ['laterent', 'Interest on rent more than 14 days late',
      '3% above the Bank of England base rate, per day, running from the date the rent fell due', 'Per tenancy'],
    ['keys', 'Replacing a lost key or security device',
      'Our reasonable costs, evidenced in writing', 'Per tenant'],
    ['utilities', 'Utilities, council tax, TV licence and communication services',
      'Where your tenancy agreement makes them your responsibility. Paid to the supplier or the council, not to us',
      'Per dwelling']
  ];
  const TENANT_DEFAULT = ['utilities'];

  function ticked() {
    const boxes = [...document.querySelectorAll('.fd-opt')];
    if (!boxes.length) return TENANT_DEFAULT.slice();
    return boxes.filter(b => b.checked).map(b => b.value);
  }

  /* ── The document ───────────────────────────────────────────────────────── */
  function docHtml(keys) {
    const a = A(), r = RATES();
    const on = keys || TENANT_DEFAULT;
    const vat = !!a.vatRegistered;
    const cmpNone = !a.cmp || /not holding client money|^$/i.test(String(a.cmp).trim());

    const th = 'text-align:left;padding:9px 12px 9px 0;font-size:11px;letter-spacing:.06em;' +
      'text-transform:uppercase;color:#8A7D6E;border-bottom:1.5px solid #1B2F4A;font-weight:700';
    const td = 'padding:11px 12px 11px 0;font-size:13.5px;color:#332C24;border-bottom:1px solid #EFE7D8;' +
      'vertical-align:top;line-height:1.55';
    const row = (what, amount, basis) => '<tr><td style="' + td + '">' + what + '</td>' +
      '<td style="' + td + ';font-weight:600;color:#1B2F4A">' + amount + '</td>' +
      '<td style="' + td + ';color:#6B6355">' + basis + '</td></tr>';
    /* Fixed layout with declared widths. Without them the Amount column sized
       itself to the longest sentence in it — the statutory deposit caps run to a
       full line of prose — which pushed the table 180px past the A4 page box and
       clipped the per-dwelling/per-tenant basis off the sheet. That basis is one of
       the things s.83 actually requires, so it cannot be the column that falls off. */
    const cols = '<colgroup><col style="width:44%"><col style="width:36%"><col style="width:20%"></colgroup>';
    const head = '<tr><th style="' + th + '">What it is for</th><th style="' + th + '">Amount</th>' +
      '<th style="' + th + '">Charged</th></tr>';
    const h2 = t => '<h2 style="font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:#1B2F4A;' +
      'margin:34px 0 2px;padding-bottom:7px;border-bottom:2px solid #1B2F4A">' + t + '</h2>';

    const llRows =
      row('Full management, sole agency', r.fee + '% of the monthly rent', 'Per property, monthly') +
      row('Full management, multiple agency', r.multiFee + '% of the monthly rent', 'Per property, monthly') +
      row('Let-only, sole agency', r.weeks + ' weeks\u2019 rent', 'Per property, one-off') +
      row('Let-only, multiple agency', (Math.round(r.multiWeeks * 100) / 100) + ' weeks\u2019 rent',
        'Per property, one-off') +
      (Number(a.abortiveFee) > 0 ? row('Withdrawing the instruction after marketing has begun, ' +
        'but before a tenancy starts', money(a.abortiveFee), 'Per property, one-off') : '') +
      ANC.filter(x => Number(a[x[0]]) > 0).map(x => row(esc(x[1]), money(a[x[0]]), x[2])).join('') +
      (a.refPartner ? row('Tenant referencing, carried out by ' + esc(a.refPartner),
        'At cost, \u00a315\u2013\u00a325 per tenant', 'Per tenant') : '');

    const tnRows =
      row('Rent', 'As advertised and as set out in your tenancy agreement', 'Per dwelling') +
      row('Refundable holding deposit, to reserve a property',
        'No more than one week\u2019s rent', 'Per dwelling') +
      row('Refundable tenancy deposit',
        'No more than five weeks\u2019 rent where the annual rent is under \u00a350,000, ' +
        'or six weeks\u2019 rent at \u00a350,000 or above', 'Per dwelling') +
      TENANT_OPT.filter(x => on.indexOf(x[0]) >= 0)
        .map(x => row(esc(x[1]), esc(x[2]), x[3])).join('');

    return '<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8">' +
      '<title>Fees, charges and penalties \u2014 ' + esc(a.name || 'Agency') + '</title>' +
      '<style>@page{size:A4;margin:16mm 15mm}' +
      'body{margin:0;padding:34px 38px;font-family:Georgia,\'Times New Roman\',serif;color:#332C24;' +
      'background:#fff;max-width:820px}' +
      'table{width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed}' +
      '@media print{body{padding:0}}</style></head><body>' +

      '<div style="border-bottom:3px solid #1B2F4A;padding-bottom:14px">' +
      '<div style="font-size:24px;font-weight:700;color:#1B2F4A;letter-spacing:-.01em">' +
      esc(a.name || '') + '</div>' +
      (a.address ? '<div style="font-size:12.5px;color:#6B6355;margin-top:3px">' + esc(a.address) +
        (a.companyNo ? ' \u00b7 Company no. ' + esc(a.companyNo) : '') + '</div>' : '') +
      '</div>' +

      '<h1 style="font-size:27px;color:#1B2F4A;margin:24px 0 6px;letter-spacing:-.015em">' +
      'Fees, charges and penalties</h1>' +
      '<p style="font-size:13px;color:#6B6355;margin:0;line-height:1.6">Published under section 83 of the ' +
      'Consumer Rights Act 2015. Displayed at our premises and on our website. ' +
      'This version: ' + esc(dt(new Date().toISOString())) + '.</p>' +

      h2('What landlords pay') +
      '<table>' + cols + head + llRows + '</table>' +
      '<p style="font-size:12.5px;color:#6B6355;margin:12px 0 0;line-height:1.65">' +
      (vat ? 'All amounts shown are <b>exclusive of VAT</b>, which is charged in addition at 20%' +
        (a.vatNumber ? '. Our VAT number is ' + esc(a.vatNumber) : '') + '.'
        : 'We are not registered for VAT, so <b>no VAT is added</b> to any amount shown.') +
      ' The management fee is agreed per property and confirmed in writing in the management agreement; ' +
      'the rates above are our standard rates.</p>' +

      h2('What tenants pay') +
      '<table>' + cols + head + tnRows + '</table>' +
      '<div style="border:1px solid #EADFC8;background:#FAF6EE;border-radius:8px;padding:14px 16px;' +
      'margin-top:16px;font-size:13px;line-height:1.65;color:#5C5348">' +
      '<b>Nothing else is charged to a tenant.</b> Under the Tenant Fees Act 2019 any payment not listed ' +
      'above is a prohibited payment. We charge no fee for referencing, for an inventory, for renewing a ' +
      'tenancy, for administration, or for a guarantor. If you are asked for a payment that is not on this ' +
      'list, it is not payable \u2014 tell us and we will refund it.</div>' +

      h2('Redress and client money') +
      '<table>' + cols +
      row('Redress scheme', esc(a.redress || 'Registration in progress') +
        (a.redressNo ? '<div style="font-size:12px;color:#6B6355;font-weight:400;margin-top:3px">Membership no. ' +
          esc(a.redressNo) + '</div>' : ''), 'Membership') +
      row('Client money protection', cmpNone
        ? 'Not a member \u2014 not required'
        : esc(a.cmp) + (a.cmpNo ? '<div style="font-size:12px;color:#6B6355;font-weight:400;margin-top:3px">' +
          'Membership no. ' + esc(a.cmpNo) + '</div>' : ''), 'Membership') +
      (a.icoNo ? row('Information Commissioner\u2019s Office', esc(a.icoNo), 'Registration') : '') +
      '</table>' +
      (cmpNone ? '<p style="font-size:12.5px;color:#6B6355;margin:12px 0 0;line-height:1.65">' +
        'We do not hold client money. Rent is paid by the tenant to the landlord direct, and deposits are held ' +
        'by the landlord or by the deposit scheme, so membership of a client money protection scheme is not ' +
        'required of us. This statement is given because the law requires it either way.</p>' : '') +

      '<p style="font-size:11.5px;color:#8A7D6E;margin-top:30px;padding-top:12px;' +
      'border-top:1px solid #EFE7D8;line-height:1.6">A copy of this list is available on request. ' +
      'If anything here is unclear, ask us before you commit to anything.</p>' +
      '</body></html>';
  }

  /* ── Published state ────────────────────────────────────────────────────── */
  /* The duty is discharged by the sheet being up, so "published" means a copy is
     filed — not that the figures exist in Settings. */
  function published() {
    return ((A().bizDocs) || [])
      .filter(d => d && /fee display/i.test(d.label || ''))
      .sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')))[0] || null;
  }

  /* Settings change after publication, and the sheet does not follow. This says
     when the filed copy predates the figures it is supposed to state. */
  function stale() {
    const p = published();
    if (!p) return false;
    const doc = docHtml(TENANT_DEFAULT);
    return doc.length && p.digest && p.digest !== String(doc.length);
  }

  /* ── Modal ──────────────────────────────────────────────────────────────── */
  function open() {
    const a = A(), r = RATES(), pub = published();
    const anc = ANC.filter(x => Number(a[x[0]]) > 0);
    window.modal('Fee display \u2014 what has to be published',
      '<p class="hint" style="margin:0 0 14px">Section 83 of the Consumer Rights Act 2015: the list below has to ' +
      'be displayed where you meet people and on your website, before you advertise. It is built from your ' +
      'Settings, so it cannot disagree with your management agreement. \u00a35,000 penalty if it is not up.</p>' +

      (pub ? '<div class="note ok" style="margin-bottom:12px"><b>Filed ' + esc(dt(pub.addedAt)) + '.</b> ' +
        'Publishing again files a fresh copy \u2014 do that whenever a fee changes.</div>'
        : '<div class="note warn" style="margin-bottom:12px"><b>Not published yet.</b> The duty starts at the ' +
          'first advert, not the first tenancy.</div>') +

      '<div class="fg"><label>Landlord fees, read from Settings</label>' +
      '<div style="border:1px solid var(--border);border-radius:8px;padding:11px 13px;font-size:12.5px;' +
      'line-height:1.9;color:var(--navy)">' +
      'Full management <b>' + r.fee + '%</b> sole \u00b7 <b>' + r.multiFee + '%</b> multiple<br>' +
      'Let-only <b>' + r.weeks + '</b> weeks sole \u00b7 <b>' + (Math.round(r.multiWeeks * 100) / 100) +
      '</b> weeks multiple<br>' +
      (Number(a.abortiveFee) > 0 ? 'Withdrawal <b>' + money(a.abortiveFee) + '</b><br>' : '') +
      (anc.length ? anc.map(x => esc(x[1]) + ' <b>' + money(a[x[0]]) + '</b>').join(' \u00b7 ')
        : '<span class="faint">No ancillary fees set</span>') +
      '</div><span class="hint">Change any of these in Settings, then publish again.</span></div>' +

      '<div class="fg"><label>Which permitted tenant payments do you charge?</label>' +
      '<span class="hint" style="display:block;margin-bottom:6px">Rent, the holding deposit and the tenancy ' +
      'deposit are on the sheet for every tenancy. These five are the only others the Tenant Fees Act 2019 ' +
      'allows \u2014 anything you leave unticked is stated as not charged.</span>' +
      TENANT_OPT.map(x => '<label style="display:flex;gap:9px;align-items:flex-start;padding:8px 0;' +
        'border-top:1px solid var(--border)">' +
        '<input type="checkbox" class="fd-opt" value="' + x[0] + '"' +
        (TENANT_DEFAULT.indexOf(x[0]) >= 0 ? ' checked' : '') + ' style="margin-top:3px">' +
        '<span><span style="font-size:12.5px;font-weight:600;color:var(--navy)">' + esc(x[1]) + '</span>' +
        '<span class="faint" style="display:block;font-size:11.5px;line-height:1.5">' + esc(x[2]) + '</span>' +
        '</span></label>').join('') + '</div>' +

      (!a.redress ? '<div class="note warn" style="margin-top:6px">No redress scheme recorded in Settings. ' +
        'The sheet has to name one, and membership is a legal requirement in its own right.</div>' : ''),

      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn" onclick="NexLetFees.print()">Print for the window</button>' +
      '<button class="btn navy" onclick="NexLetFees.publish()">Publish \u2014 file the copy</button>', true);
  }

  function print() {
    const w = window.open('', '_blank');
    if (!w) { window.toast('Allow pop-ups to print', 1); return; }
    w.document.write(docHtml(ticked()));
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 400);
  }

  /* Filed as a Business document, because that is where every other published
     document lives and where the website copy is fetched from. */
  async function publish() {
    const keys = ticked();
    const html = docHtml(keys);
    const stampDay = new Date().toISOString().slice(0, 10);
    let url = '';
    if (window._storageUpload) {
      try {
        const f = new File([html], 'fee-display-' + stampDay + '.html', { type: 'text/html' });
        url = await window._storageUpload(f, 'agency/fee-display-' + Date.now() + '.html',
          'property-documents') || '';
      } catch (e) { console.error('fee display upload', e); }
    }
    if (!url) { window.toast('\u26a0 The copy did not upload \u2014 nothing filed. Check your connection.', 1); return; }

    const a = A();
    a.bizDocs = a.bizDocs || [];
    a.bizDocs.push({ id: (window.uid ? window.uid('bd') : 'bd' + Date.now()),
      label: 'Fee display (Consumer Rights Act s.83)',
      name: 'fee-display-' + stampDay + '.html', url: url, expiry: '', addedAt: stampDay,
      digest: String(html.length) });
    if (window.save) window.save();
    if (window.pushAgency) window.pushAgency();
    if (window.NexLetAudit) window.NexLetAudit.log({ action: 'doc.published', entity: 'agency',
      entityId: window._agencyId || '', entityLabel: a.name || '',
      detail: { document: 'Fee display', basis: 'Consumer Rights Act 2015 s.83',
        tenantPaymentsListed: TENANT_OPT.filter(x => keys.indexOf(x[0]) >= 0).map(x => x[1]).join(', ') || 'none',
        clientMoney: a.cmp || '', redress: a.redress || '' } });
    window.closeModal(); if (window.render) window.render();
    window.toast('\u2713 Fee display filed \u2014 put this copy on the website and in the window');
  }

  window.NexLetFees = { open, print, publish, docHtml, published, stale };
})();
