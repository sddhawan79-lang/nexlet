/* ============================================================================
   nexlet-deposit.js — deposit holding, protection and prescribed information.
   Loaded by agent.html as a classic script; shares its globals.

   Why this exists: prescribed information is a statutory document (Housing Act
   2004 s213(5) and the Housing (Tenancy Deposits) (Prescribed Information)
   Order 2007). Its contents are specified, it must reach the tenant within 30
   days of the deposit being received, and getting it wrong is what triggers a
   claim of one to three times the deposit. NexLet could record that it had been
   served but had no way to produce one.

   The generator deliberately does NOT invent scheme administrator contact
   details. Those are prescribed content and must match what the scheme itself
   publishes, so they are entered once in Settings and flagged until they are.
   ========================================================================== */
(function () {
  'use strict';

  /* agent.html's `S` is a top-level lexical binding, not a window property, so
     window.S is always undefined. Read it bare. */
  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };


  const esc2 = s => (window.esc ? window.esc(s) : String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  const money = n => (window.gbp ? window.gbp(n) : '£' + (Number(n) || 0).toFixed(2));
  const dt = d => (window.fmtDate ? window.fmtDate(d) : String(d || ''));
  const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

  /* Who holds the money. Drives the agreement wording, the prescribed
     information, and who gets chased for the certificate. */
  const HOLDERS = {
    landlord: {
      label: 'The landlord — direct from the tenant',
      short: 'Landlord',
      note: 'The tenant pays the landlord direct and the landlord protects it. The statutory duty is the landlord\u2019s, because the duty falls on whoever receives the deposit. You never touch the money, so no client account or CMP is needed \u2014 but you must still obtain the certificate and prescribed information for your file.'
    },
    scheme: {
      label: 'The scheme — custodial',
      short: 'Scheme (custodial)',
      note: 'The deposit is transferred to the scheme, which holds it for the whole tenancy. Nobody else holds it, so no client money arises once it has been transferred.'
    },
    agency: {
      label: 'This agency — insured',
      short: 'Agency (insured)',
      note: 'You hold the money and pay a protection fee. This IS client money: Client Money Protection membership becomes a legal requirement and the deposit must sit in a designated client account.'
    }
  };
  const holderOf = rec => (rec && rec.depositHolder) ||
    ((ST().agency && ST().agency.depHolderDefault) || 'landlord');

  /* ── contract wording, so the document matches who actually holds it ────── */
  function clauseFor(rec, l, schemeText) {
    const h = holderOf(rec);
    const ln = (window.landlordName ? landlordName(l) : (l && l.name) || 'the Landlord');
    if (h === 'landlord') return {
      pays: 'The Tenant pays the Deposit direct to the Landlord. The Agent does not receive or hold the Deposit at any time.',
      holds: 'The Deposit is received and held by the Landlord, ' + esc2(ln) + '. The Landlord is responsible for protecting it in ' + schemeText +
             ' within 30 days of receipt and for giving the Tenant the prescribed information within the same period.',
      pi: 'The prescribed information is given by the Landlord as the person who received the Deposit.'
    };
    if (h === 'agency') return {
      pays: 'The Tenant pays the Deposit to the Agent, who receives it on behalf of the Landlord and holds it in a designated client account.',
      holds: 'The Deposit is held by the Agent and protected in ' + schemeText + ' within 30 days of receipt.',
      pi: 'The prescribed information is given by the Agent as the person who received the Deposit.'
    };
    return {
      pays: 'The Tenant pays the Deposit as directed for transfer to the Deposit Scheme.',
      holds: 'The Deposit is transferred to and held by ' + schemeText + ' for the duration of the Tenancy. Neither the Landlord nor the Agent holds the Deposit.',
      pi: 'The prescribed information is given within 30 days of the Deposit being received.'
    };
  }

  /* ── prescribed information ──────────────────────────────────────────────
     Each numbered section maps to a paragraph of the 2007 Order, so it can be
     checked against the legislation rather than taken on trust. */
  function buildPI(p, rec, l) {
    const b = window.agencyBrand ? agencyBrand() : {};
    const h = holderOf(rec);
    const dep = parseFloat(rec.deposit) || 0;
    const prop = [p.address, p.city, p.postcode].filter(Boolean).join(', ');
    const ln = window.landlordName ? landlordName(l) : (l && l.name) || '';
    const scheme = rec.scheme || b.depScheme || '';
    const isPerm = o => window.isPermittedOccupier ? window.isPermittedOccupier(o) : (o.personType || 'joint') === 'permitted';
    const tenants = [{ n: rec.name, e: rec.email }]
      .concat((rec.occupants || []).filter(o => o.name && !isPerm(o)).map(o => ({ n: o.name, e: o.email || '' })))
      .filter(x => x.n);
    const sch = ST().agency || {};
    const missing = !sch.schemeAdminAddress || !sch.schemeAdminPhone || !sch.schemeAdminEmail;

    // Who holds it, and therefore whose details go in the "given by" block.
    const giver = h === 'landlord'
      ? { role: 'Landlord', name: ln, addr: l.address || '', phone: l.phone || '', email: l.email || '' }
      : { role: 'Agent (on behalf of the Landlord)', name: b.name || '', addr: b.address || '', phone: b.phone || '', email: b.email || '' };

    const Row = (k, v) => `<tr><td style="padding:7px 14px 7px 0;vertical-align:top;width:34%;font-weight:700;color:#1B2F4A;font-size:11.5px">${k}</td><td style="padding:7px 0;vertical-align:top;font-size:12.5px;line-height:1.6">${v}</td></tr>`;
    const Sec = (n, t) => `<h3 style="font-size:13px;font-weight:700;color:#1B2F4A;margin:22px 0 6px;border-top:1px solid #E2E5EA;padding-top:13px">${n}. ${t}</h3>`;

    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:2px solid #1B2F4A;padding-bottom:13px;margin-bottom:20px">
      <div><div style="font-family:Georgia,serif;font-size:21px;color:#1B2F4A">${esc2(b.name || '')}</div>
        <div style="font-size:11.5px;color:#5A6B82;margin-top:3px;white-space:pre-line">${esc2(b.address || '')}</div></div>
      <div style="text-align:right"><div style="font-family:Georgia,serif;font-size:15px;color:#1B2F4A">PRESCRIBED INFORMATION</div>
        <div style="font-size:11px;color:#5A6B82;margin-top:2px">${esc2(dt(window.today ? today() : new Date().toISOString().slice(0,10)))}</div></div></div>

    <p style="font-size:12.5px;line-height:1.7;margin:0 0 4px">Given under section 213(5) of the Housing Act 2004 and the Housing (Tenancy Deposits) (Prescribed Information) Order 2007.</p>
    <p style="font-size:12.5px;line-height:1.7;margin:0 0 16px">This document must be given to the Tenant, and to any person who paid the Deposit on the Tenant\u2019s behalf, within 30 days of the Deposit being received. It must be read together with the Deposit Scheme\u2019s own information leaflet, which accompanies it.</p>

    ${missing ? `<div style="border:1.5px solid #B4543A;background:#FBEEEA;border-radius:8px;padding:12px 14px;margin-bottom:18px;font-size:12px;line-height:1.6;color:#8A3A26">
      <b>Not ready to serve.</b> The Deposit Scheme administrator\u2019s address, telephone number and email are prescribed content and must match what the scheme publishes. Add them in Agency Settings before serving this document.</div>` : ''}

    ${Sec(1, 'The Deposit and the Property')}
    <table style="width:100%;border-collapse:collapse">
      ${Row('Amount of the Deposit', '<strong>' + money(dep) + '</strong>')}
      ${Row('Property to which it relates', esc2(prop))}
      ${Row('Date the Deposit was received', rec.depositReceived ? esc2(dt(rec.depositReceived)) : '<span style="color:#B4543A">to be completed</span>')}
      ${Row('Protection deadline', rec.depositReceived ? esc2(dt(plus(rec.depositReceived, 30))) + ' <span style="color:#5A6B82">(30 days from receipt)</span>' : '<span style="color:#B4543A">30 days from receipt</span>')}
      ${Row('Tenancy start date', esc2(dt(rec.start)))}
    </table>

    ${Sec(2, 'Who holds the Deposit')}
    <table style="width:100%;border-collapse:collapse">
      ${Row('Held by', '<strong>' + esc2((HOLDERS[h] || {}).short || h) + '</strong>')}
      ${Row('Deposit Scheme', scheme ? '<strong>' + esc2(scheme) + '</strong>' : '<span style="color:#B4543A">to be completed</span>')}
      ${Row('Scheme deposit reference', rec.schemeRef ? '<strong>' + esc2(rec.schemeRef) + '</strong>' : '<span style="color:#B4543A">to be completed</span>')}
      ${h === 'landlord' && rec.landlordSchemeNo ? Row('Landlord\u2019s scheme membership no.', esc2(rec.landlordSchemeNo)) : ''}
    </table>

    ${Sec(3, 'The Landlord')}
    <table style="width:100%;border-collapse:collapse">
      ${Row('Name', esc2(ln))}
      ${Row('Address', esc2(l.address || '') || '<span style="color:#B4543A">to be completed</span>')}
      ${Row('Telephone', esc2(l.phone || '\u2014'))}
      ${Row('Email', esc2(l.email || '\u2014'))}
    </table>
    ${h !== 'landlord' ? `<p style="font-size:12px;color:#5A6B82;margin:8px 0 0">The Agent named above is authorised to act for the Landlord in relation to the Deposit, and notices about the Deposit may be served on the Agent at the address given.</p>` : ''}

    ${Sec(4, 'The Tenant' + (tenants.length > 1 ? 's' : ''))}
    <table style="width:100%;border-collapse:collapse">
      ${tenants.map(t => Row(esc2(t.n), esc2(t.e || '\u2014') + '<br><span style="color:#5A6B82">at ' + esc2(prop) + '</span>')).join('')}
    </table>
    ${rec.depositPaidBy ? `<p style="font-size:12px;color:#5A6B82;margin:8px 0 0">The Deposit was paid by <b>${esc2(rec.depositPaidBy)}</b> on the Tenant\u2019s behalf. A copy of this document has been given to that person as a relevant person under section 213(10) of the Housing Act 2004.</p>` : ''}

    ${Sec(5, 'The Deposit Scheme administrator')}
    <table style="width:100%;border-collapse:collapse">
      ${Row('Scheme', scheme ? esc2(scheme) : '<span style="color:#B4543A">to be completed</span>')}
      ${Row('Address', sch.schemeAdminAddress ? esc2(sch.schemeAdminAddress) : '<span style="color:#B4543A">to be completed in Agency Settings</span>')}
      ${Row('Telephone', sch.schemeAdminPhone ? esc2(sch.schemeAdminPhone) : '<span style="color:#B4543A">to be completed in Agency Settings</span>')}
      ${Row('Email', sch.schemeAdminEmail ? esc2(sch.schemeAdminEmail) : '<span style="color:#B4543A">to be completed in Agency Settings</span>')}
    </table>

    ${Sec(6, 'Getting the Deposit back at the end of the tenancy')}
    <ol style="padding-left:20px;font-size:12.5px;line-height:1.75;margin:4px 0">
      <li>At the end of the Tenancy the Property is inspected against the inventory and schedule of condition, and any proposed deductions are set out in writing within 14 days.</li>
      <li>Where the amount to be returned is agreed, the Deposit is repaid within 10 days of that agreement.</li>
      <li>The Tenant may apply to the Deposit Scheme for the return of the Deposit using the scheme\u2019s own procedure, details of which are in the scheme leaflet.</li>
      <li>Any part of the Deposit that is not in dispute is released without waiting for the disputed part to be resolved.</li>
    </ol>

    ${Sec(7, 'When part of the Deposit may be kept')}
    <p style="font-size:12.5px;line-height:1.7;margin:4px 0">A deduction may be proposed, in a reasonable and evidenced amount, for: unpaid rent; unpaid council tax or utility charges arising during the Tenancy; damage to the Property, its fixtures, fittings or contents beyond fair wear and tear; cleaning needed to return the Property to the condition recorded at check-in; damage, soiling or infestation caused by a pet; keys, fobs or security devices not returned, including any resulting lock change; removal of belongings or rubbish left behind; and any other breach of the tenancy agreement. Deductions for wear items are apportioned by remaining useful life rather than charged at full replacement cost.</p>

    ${Sec(8, 'If there is a dispute')}
    <p style="font-size:12.5px;line-height:1.7;margin:4px 0">Where the amount to be returned cannot be agreed, either party may refer the disputed amount to the Deposit Scheme\u2019s free alternative dispute resolution service, or may apply to the county court. Using the scheme\u2019s service is free and does not require a solicitor. Both parties must supply their evidence within the scheme\u2019s time limits, and the scheme\u2019s decision on the disputed sum is binding where both parties have agreed to use it.</p>

    ${Sec(9, 'If a party cannot be contacted')}
    <p style="font-size:12.5px;line-height:1.7;margin:4px 0">Each party must notify the other in writing within 14 days of any change of address, email address or telephone number. The Tenant should give a forwarding address at the end of the Tenancy. Where a party cannot be contacted at the last address notified, the Deposit Scheme\u2019s single-claim or statutory-declaration procedure applies, as described in the scheme leaflet.</p>

    ${Sec(10, 'Certificate')}
    <p style="font-size:12.5px;line-height:1.7;margin:4px 0">The ${esc2(giver.role)} certifies that the information in this document is accurate to the best of their knowledge and belief, and that the Tenant has been given the opportunity to sign this document by way of confirmation that the information is accurate.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:6px">
      ${Row('Given by', esc2(giver.name) + '<br><span style="color:#5A6B82">' + esc2(giver.role) + '</span>')}
      ${Row('Address', esc2(giver.addr || '') || '<span style="color:#B4543A">to be completed</span>')}
      ${Row('Telephone / email', esc2([giver.phone, giver.email].filter(Boolean).join(' \u00b7 ') || '\u2014'))}
    </table>
    <div style="display:flex;gap:26px;margin-top:22px;flex-wrap:wrap">
      <div style="flex:1;min-width:210px"><div style="border-bottom:1px solid #1B2F4A;height:44px"></div>
        <div style="font-size:11px;color:#5A6B82;margin-top:5px">Signed \u2014 ${esc2(giver.role)}</div></div>
      <div style="flex:1;min-width:210px"><div style="border-bottom:1px solid #1B2F4A;height:44px"></div>
        <div style="font-size:11px;color:#5A6B82;margin-top:5px">Date</div></div>
    </div>
    ${tenants.map(t => `<div style="display:flex;gap:26px;margin-top:18px;flex-wrap:wrap">
      <div style="flex:1;min-width:210px"><div style="border-bottom:1px solid #1B2F4A;height:44px"></div>
        <div style="font-size:11px;color:#5A6B82;margin-top:5px">Signed \u2014 ${esc2(t.n)}</div></div>
      <div style="flex:1;min-width:210px"><div style="border-bottom:1px solid #1B2F4A;height:44px"></div>
        <div style="font-size:11px;color:#5A6B82;margin-top:5px">Date</div></div>
    </div>`).join('')}

    <p style="font-size:11px;color:#5A6B82;border:1px solid #E2E5EA;border-radius:6px;padding:9px 11px;background:#F8FAFC;margin-top:20px">The Tenant\u2019s signature confirms receipt and the accuracy of the information above. A refusal to sign does not affect the validity of service, provided the document was given within 30 days of the Deposit being received \u2014 keep evidence of when and how it was sent.</p>`;
  }

  /* ── modal: preview, print, email ────────────────────────────────────────── */
  function open(pid) {
    const p = window.P(pid);
    const rec = window.tenantRecFor(pid);
    if (!rec) { window.toast('Set up the tenant record first', 1); return; }
    if (!rec.deposit) { window.toast('No deposit recorded on this tenancy', 1); return; }
    const l = window.L(p.landlordId);
    const h = holderOf(rec);
    const html = buildPI(p, rec, l);
    const sch = ST().agency || {};
    const ready = sch.schemeAdminAddress && sch.schemeAdminPhone && sch.schemeAdminEmail && rec.scheme && rec.schemeRef;

    const body = `<div class="note${h === 'landlord' ? ' warn' : ''}" style="margin-bottom:12px">
        <b>Deposit held by: ${esc2((HOLDERS[h] || {}).short || h)}</b><br>${esc2((HOLDERS[h] || {}).note || '')}</div>
      ${!ready ? `<div class="note warn" style="margin-bottom:12px"><b>Not ready to serve.</b> Complete the scheme name and deposit reference on the tenancy, and the scheme administrator\u2019s contact details in Agency Settings. Those details are prescribed content \u2014 they must match what the scheme publishes.</div>` : ''}
      <div class="fg"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><label style="margin:0">Prescribed information</label>
        <button type="button" class="btn sm" onclick="NexLetPrint.fromEl('pi-preview','Prescribed Information','Deposit \u2014 ${esc2(p.address || '')}')">\u2399 Print / save as PDF</button></div>
        <div id="pi-preview" style="max-height:340px;overflow-y:auto;border:1px solid #E3D9C8;border-radius:8px;padding:16px;font-size:12.5px;line-height:1.7;background:var(--off)">${html}</div></div>
      <p class="hint">Serve this with the scheme\u2019s own information leaflet. Keep evidence of the date and method \u2014 that is what a court looks at.</p>`;

    window.modal('Prescribed information \u2014 ' + esc2(p.address || ''), body,
      `<button class="btn" onclick="closeModal()">Close</button>
       <button class="btn navy" onclick="NexLetDeposit.email('${pid}')">Email to tenant${h === 'landlord' ? ' &amp; landlord' : ''}</button>`, true);
  }

  async function email(pid) {
    const p = window.P(pid), rec = window.tenantRecFor(pid), l = window.L(p.landlordId);
    const html = buildPI(p, rec, l);
    const isPerm = o => window.isPermittedOccupier ? window.isPermittedOccupier(o) : (o.personType || 'joint') === 'permitted';
    const to = [rec.email].concat((rec.occupants || []).filter(o => o.email && !isPerm(o)).map(o => o.email)).filter(Boolean);
    if (!to.length) { window.toast('No tenant email on file', 1); return; }
    const subj = 'Prescribed information \u2014 your tenancy deposit \u2014 ' + (p.address || '');
    const failed = [];
    for (const e of to) { const r = await window.agencyEmail(e, subj, html); if (!r || !r.ok) failed.push(e); }
    if (holderOf(rec) === 'landlord' && l.email) await window.agencyEmail(l.email, 'Copy \u2014 ' + subj, html);
    rec.piServedAt = new Date().toISOString().slice(0, 10);
    window.pushTenantRec(rec); window.save();
    if (window.NexLetAudit) NexLetAudit.log({ action: 'deposit.pi_served', entity: 'tenancy', entityId: rec.id,
      entityLabel: (rec.name || '') + ' \u2014 ' + (p.address || ''),
      detail: { heldBy: holderOf(rec), scheme: rec.scheme || '', ref: rec.schemeRef || '', sentTo: to.join(', ') } });
    window.closeModal(); window.render();
    window.toast(failed.length ? '\u26a0 Sent, but failed for: ' + failed.join(', ') : '\u2713 Prescribed information sent and logged');
  }

  window.NexLetDeposit = { HOLDERS, holderOf, clauseFor, buildPI, open, email };
})();
