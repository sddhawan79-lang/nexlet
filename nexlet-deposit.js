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


  /* Scheme administrator details, transcribed from each scheme's OWN published
     Prescribed Information template. Not typed from memory: prescribed content
     that does not match what the scheme publishes makes the document defective.
     A scheme with no entry falls back to Agency Settings and is flagged. */
  const SCHEMES = {
    tds: {
      match: /tds|tenancy deposit scheme|dispute service/i,
      name: 'Tenancy Deposit Scheme',
      admin: 'THE DISPUTE SERVICE LIMITED',
      address: '200 Maylands Avenue, Hemel Hempstead, HP2 7TG',
      phone: '0300 037 1000/1',
      email: 'info@tenancydepositscheme.com',
      web: 'tenancydepositscheme.com',
      leaflet: 'What is the Tenancy Deposit Scheme?',
      version: 'Updated September 2024'
    }
  };
  function schemeInfo(name) {
    const n = String(name || '');
    for (const k in SCHEMES) if (SCHEMES[k].match.test(n)) return SCHEMES[k];
    return null;
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
    const si = schemeInfo(scheme);
    // With the scheme's own template to hand these are known, so the old
    // "complete it in Settings" blocker only applies to a scheme we have no
    // published details for.
    const admin = si || { admin: '', address: sch.schemeAdminAddress || '', phone: sch.schemeAdminPhone || '',
                          email: sch.schemeAdminEmail || '', web: '', leaflet: 'the scheme\u2019s information leaflet', version: '' };
    const missing = !admin.address || !admin.phone || !admin.email;

    const joint = (l.jointOwners || (l.joint ? [{ name: l.joint, email: l.jointEmail || '', phone: '' }] : []))
      .filter(x => x && (x.name || x.email));

    /* A rule to complete by hand: NexLet does not hold this, and inventing it
       would put wrong prescribed content on a statutory document. */
    const gap = (w) => '<span style="display:inline-block;min-width:' + (w || 150) + 'px;border-bottom:1px solid #1B2F4A">&nbsp;</span>';
    const Row = (k, v) => `<tr><td style="padding:7px 14px 7px 0;vertical-align:top;width:34%;font-weight:700;color:#1B2F4A;font-size:11.5px">${k}</td><td style="padding:7px 0;vertical-align:top;font-size:12.5px;line-height:1.6">${v}</td></tr>`;
    const Sec = (t) => `<h3 style="font-size:12px;font-weight:700;color:#1B2F4A;margin:22px 0 6px;border-top:1px solid #E2E5EA;padding-top:13px;text-transform:uppercase;letter-spacing:.7px">${t}</h3>`;
    const T = rows => `<table style="width:100%;border-collapse:collapse">${rows}</table>`;

    return `<div style="border:1px solid #E2E5EA;border-radius:8px;padding:13px 15px;margin-bottom:18px;background:#F8FAFC">
      <div style="font-size:12.5px;line-height:1.7">Under the Housing Act 2004, the landlord is required to give the following information to the tenant and anyone who paid the deposit on the tenant\u2019s behalf (a Relevant Person) within 30 days of receiving the deposit.</div>
      <div style="font-family:Georgia,serif;font-size:15px;color:#1B2F4A;margin:12px 0 6px">PRESCRIBED INFORMATION</div>
      <div style="font-size:12px;line-height:1.7;color:#5A6B82">The scheme administrator is:<br>
        <b style="color:#1B2F4A">${esc2(admin.admin || scheme || '')}</b><br>
        ${esc2(admin.address || '')}<br>${esc2(admin.web || '')}<br>${esc2(admin.phone || '')}<br>${esc2(admin.email || '')}</div>
    </div>

    ${missing ? `<div style="border:1.5px solid #B4543A;background:#FBEEEA;border-radius:8px;padding:12px 14px;margin-bottom:18px;font-size:12px;line-height:1.6;color:#8A3A26">
      <b>Not ready to serve.</b> We hold no published details for \u201c${esc2(scheme || 'this scheme')}\u201d. Add the scheme administrator\u2019s address, telephone and email in Agency Settings, taken from the scheme\u2019s own prescribed information template.</div>` : ''}

    ${Sec('Information about the scheme')}
    <ol style="padding-left:20px;font-size:12.5px;line-height:1.75;margin:4px 0" type="a">
      <li>The scheme administrator of the ${esc2(admin.name || scheme || 'scheme')} is ${esc2(admin.admin || '')}. Contact details are at the top of the form.</li>
      <li>The leaflet entitled \u2018${esc2(admin.leaflet || '')}\u2019, which explains the operation of the provisions contained in sections 212 to 215 of, and Schedule 10 to, Housing Act 2004, must accompany this document when given to the tenant and any relevant person.</li>
    </ol>
    <p style="font-size:12.5px;line-height:1.7;margin:4px 0">The following procedures are set out in the scheme leaflet:</p>
    <ol style="padding-left:20px;font-size:12.5px;line-height:1.75;margin:4px 0" type="a" start="3">
      <li>The procedures that apply under the scheme by which an amount in respect of a deposit may be paid or repaid to the tenant at the end of the tenancy;</li>
      <li>The procedures that apply under the scheme where either the landlord or the tenant is not contactable at the end of the tenancy;</li>
      <li>The procedures that apply where the landlord and the tenant dispute the amount of the deposit to be paid or repaid; and</li>
      <li>The facilities available under the scheme for enabling a dispute relating to the deposit to be resolved without recourse to litigation.</li>
    </ol>
    ${admin.web ? `<p style="font-size:12.5px;line-height:1.7;margin:4px 0">More detailed information is available at ${esc2(admin.web)}</p>` : ''}

    ${Sec('Deposit and property details')}
    ${T(
      Row('Property address', esc2(prop)) +
      Row('Deposit paid', '<strong>' + money(dep) + '</strong>') +
      Row('Date deposit received by the landlord (or their representative)', rec.depositReceived ? esc2(dt(rec.depositReceived)) : gap(170)) +
      Row('Date deposit / deposit protection fee paid to ' + esc2(admin.name || scheme || 'the scheme'), rec.depositFeePaid ? esc2(dt(rec.depositFeePaid)) : gap(170)) +
      Row('Scheme deposit reference', rec.schemeRef ? '<strong>' + esc2(rec.schemeRef) + '</strong>' : gap(150)) +
      Row('Protection deadline', rec.depositReceived ? esc2(dt(plus(rec.depositReceived, 30))) + ' <span style="color:#5A6B82">(30 days from receipt)</span>' : '<span style="color:#5A6B82">30 days from receipt</span>') +
      Row('Tenancy start date', rec.start ? esc2(dt(rec.start)) : gap(150))
    )}

    ${Sec('Primary landlord details')}
    ${T(
      Row('Name', esc2(ln) || gap(200)) +
      Row('Email', esc2(l.email || '') || gap(180)) +
      Row('Phone number', esc2(l.phone || '') || gap(150)) +
      Row('Address', esc2(l.address || '') || gap(260)) +
      Row('Correspondence address', esc2(l.corrAddress || l.address || '') || gap(260))
    )}

    ${joint.length ? Sec('Joint landlord(s)') + T(joint.map((x, n) =>
        Row((n + 1) + '. Name', esc2(x.name || '') || gap(200)) +
        Row('&nbsp;&nbsp;&nbsp;Email', esc2(x.email || '') || gap(180)) +
        Row('&nbsp;&nbsp;&nbsp;Phone number', esc2(x.phone || '') || gap(150))
      ).join('')) : ''}

    ${Sec('Agent details')}
    ${T(
      Row('Name', esc2(b.name || '')) +
      Row('Email', esc2(b.email || '') || gap(180)) +
      Row('Phone number', esc2(b.phone || '') || gap(150)) +
      Row('Address', esc2(b.address || '') || gap(260))
    )}
    ${h === 'landlord'
      ? '<p style="font-size:12px;color:#5A6B82;margin:8px 0 0">The deposit is held by the landlord. This document is given by the agent on the landlord\u2019s behalf.</p>'
      : '<p style="font-size:12px;color:#5A6B82;margin:8px 0 0">The agent named above received the deposit and is authorised to act for the landlord in relation to it. Notices about the deposit may be served on the agent at the address given.</p>'}

    ${Sec('Tenants')}
    ${tenants.map((t, n) => T(
      Row('Tenant ' + (n + 1) + ' \u2014 name', esc2(t.n)) +
      Row('Email', esc2(t.e || '') || gap(180)) +
      Row('Phone number', esc2(t.p || '') || gap(150)) +
      Row('Address to be used at the end of the tenancy', gap(280))
    ) + (n < tenants.length - 1 ? '<div style="height:10px"></div>' : '')).join('')}

    ${Sec('Relevant person\u2019s contact details')}
    <p style="font-size:12px;color:#5A6B82;margin:0 0 6px">If there is a relevant person (i.e., anyone who has arranged to pay the deposit on the tenant\u2019s behalf), as part of the Prescribed Information, please provide the details for them below.</p>
    ${rec.depositPaidBy
      ? T(Row('Name', esc2(rec.depositPaidBy)) + Row('Email', gap(180)) + Row('Phone number', gap(150)) + Row('Address to be used at the end of the tenancy', gap(280)))
      : T(Row('Name', gap(200)) + Row('Email', gap(180)) + Row('Phone number', gap(150)) + Row('Address to be used at the end of the tenancy', gap(280)))}

    ${Sec('Circumstances when the deposit may be retained by the landlord')}
    <p style="font-size:12.5px;line-height:1.7;margin:4px 0">The circumstances when all or part of the deposit may be retained by the landlord/s by reference to the terms of the tenancy are set out in clause(s) ${rec.deductionClause ? '<b>' + esc2(rec.deductionClause) + '</b>' : gap(90)} of the tenancy agreement. No deduction can be paid from the deposit until the parties to the tenancy agreement have agreed the deduction, or an award has been made by ${esc2(admin.name || scheme || 'the scheme')} or by the court.</p>

    ${Sec('Confirmation')}
    <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:12px;line-height:1.7">
      <div style="flex:1;min-width:240px;border:1px solid #E2E5EA;border-radius:7px;padding:11px 13px">
        <b style="color:#1B2F4A">The landlord certifies and confirms that:</b>
        <ul style="padding-left:18px;margin:6px 0 0">
          <li>the information provided is accurate to the best of my/our knowledge and belief and</li>
          <li>I/we have given the tenant the opportunity to sign this document by way of confirmation that the information is accurate to the best of the tenant\u2019s knowledge and belief.</li>
        </ul>
      </div>
      <div style="flex:1;min-width:240px;border:1px solid #E2E5EA;border-radius:7px;padding:11px 13px">
        <b style="color:#1B2F4A">The tenant confirms that:</b>
        <ul style="padding-left:18px;margin:6px 0 0">
          <li>I/we have been given the opportunity to read the information provided and</li>
          <li>I/we sign this document to confirm that the information is accurate to the best of my/our knowledge and belief.</li>
        </ul>
      </div>
    </div>

    <div style="display:flex;gap:26px;margin-top:22px;flex-wrap:wrap">
      <div style="flex:1;min-width:210px"><div style="border-bottom:1px solid #1B2F4A;height:44px"></div>
        <div style="font-size:11px;color:#5A6B82;margin-top:5px">Signed by or on behalf of the landlord${h === 'landlord' && b.name ? ' \u2014 ' + esc2(b.name) + ', agent' : ''}</div></div>
      <div style="width:150px"><div style="border-bottom:1px solid #1B2F4A;height:44px"></div>
        <div style="font-size:11px;color:#5A6B82;margin-top:5px">Date</div></div>
    </div>
    ${tenants.map(t => `<div style="display:flex;gap:26px;margin-top:18px;flex-wrap:wrap">
      <div style="flex:1;min-width:210px"><div style="border-bottom:1px solid #1B2F4A;height:44px"></div>
        <div style="font-size:11px;color:#5A6B82;margin-top:5px">Signed by the tenant \u2014 ${esc2(t.n)}</div></div>
      <div style="width:150px"><div style="border-bottom:1px solid #1B2F4A;height:44px"></div>
        <div style="font-size:11px;color:#5A6B82;margin-top:5px">Date</div></div>
    </div>`).join('')}

    <p style="font-size:11px;color:#5A6B82;border:1px solid #E2E5EA;border-radius:6px;padding:9px 11px;background:#F8FAFC;margin-top:20px">Responsibility for serving complete and correct Prescribed Information on each tenant and relevant person is the responsibility of the member and the landlord. ${esc2(admin.admin || 'The scheme administrator')} does not accept any liability for a member\u2019s or landlord\u2019s failure to comply with The Housing Act 2004 and/or The Housing (Tenancy Deposits) (Prescribed Information) Order 2007.${admin.version ? ' &nbsp;\u00b7&nbsp; ' + esc2(admin.version) : ''}</p>`;
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
    const tpl = piTemplateDoc(), lf = leafletDoc(), filled = rec.piDocUrl ? { url: rec.piDocUrl, name: rec.piDocName } : null;
    const crib = piCrib(p, rec, l);
    const sch = ST().agency || {};
    const _si = schemeInfo(rec.scheme || (window.agencyBrand ? agencyBrand().depScheme : ''));
    const _sch = ST().agency || {};
    const ready = rec.scheme && rec.schemeRef &&
      (_si || (_sch.schemeAdminAddress && _sch.schemeAdminPhone && _sch.schemeAdminEmail));

    const body = `<div class="note${h === 'landlord' ? ' warn' : ''}" style="margin-bottom:12px">
        <b>Deposit held by: ${esc2((HOLDERS[h] || {}).short || h)}</b><br>${esc2((HOLDERS[h] || {}).note || '')}</div>
      ${!ready ? `<div class="note warn" style="margin-bottom:12px"><b>Not ready to serve.</b>
        ${!rec.scheme ? 'Choose the deposit scheme on the Tenancy tab \u2014 it names the scheme on this document and pulls in its published contact details. ' : ''}
        ${!rec.schemeRef ? 'Add the scheme deposit reference on the Tenancy tab. ' : ''}
        ${rec.scheme && rec.schemeRef && !_si ? 'We hold no published contact details for \u201c' + esc2(rec.scheme) + '\u201d \u2014 add the scheme administrator\u2019s address, telephone and email in Agency Settings, copied from that scheme\u2019s own prescribed information template.' : ''}</div>` : ''}
      <div style="border:1px solid var(--border);border-radius:9px;padding:13px 15px;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <b style="font-size:12.5px;color:var(--navy)">Serve the scheme\u2019s own form \u2014 recommended</b>
          ${filled ? '<span class="pill" style="background:var(--green-bg);color:var(--green)">Completed form on file</span>' : ''}</div>
        <p class="hint" style="margin:0 0 10px">The scheme\u2019s template is guaranteed to satisfy the 2007 Order and the scheme stands behind it. Fill their editable PDF using the values below, then upload it here and send that.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:11px">
          ${tpl ? `<a class="btn sm navy" href="${esc2(tpl.url)}" target="_blank" rel="noopener">1 \u00b7 Open the blank form</a>`
                 : `<span class="pill" style="background:var(--amber-bg);color:var(--amber)">Blank form not filed \u2014 add the scheme\u2019s \u201cPrescribed Information template\u201d under Business documents</span>`}
          <label class="btn sm" style="cursor:pointer;margin:0">2 \u00b7 ${filled ? 'Replace completed form' : 'Upload completed form'}
            <input type="file" accept="application/pdf,image/*" style="display:none" onchange="NexLetDeposit.uploadFilled('${pid}',this)"></label>
          ${filled ? `<a class="btn sm" href="${esc2(filled.url)}" target="_blank" rel="noopener">View ${esc2(filled.name || 'completed form')}</a>` : ''}
        </div>
        <details>
          <summary style="font-size:11.5px;color:var(--navy);cursor:pointer">Values to type into their form (${crib.length})</summary>
          <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-top:7px">
            ${crib.map(r => `<tr><td style="padding:4px 10px 4px 0;color:var(--faint);vertical-align:top;width:46%">${esc2(r[0])}</td>
              <td style="padding:4px 0;color:var(--navy);font-weight:600">${esc2(r[1])}</td></tr>`).join('')}
          </table>
          <p class="hint" style="margin:7px 0 0">A dash means NexLet does not hold it \u2014 find it before you serve, rather than leaving the box empty.</p>
        </details>
        ${lf ? '' : '<p class="hint" style="margin:9px 0 0;color:var(--amber)">The scheme\u2019s tenant leaflet is not filed either. It must accompany the form.</p>'}
      </div>
      <div class="fg"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><label style="margin:0">NexLet\u2019s version \u2014 use if you cannot fill theirs</label>
        <button type="button" class="btn sm" onclick="NexLetPrint.fromEl('pi-preview','Prescribed Information','Deposit \u2014 ${esc2(p.address || '')}')">\u2399 Print / save as PDF</button></div>
        <div id="pi-preview" style="max-height:340px;overflow-y:auto;border:1px solid #E3D9C8;border-radius:8px;padding:16px;font-size:12.5px;line-height:1.7;background:var(--off)">${html}</div></div>
      <p class="hint"><b>The scheme\u2019s leaflet must accompany this document.</b>${_si && _si.leaflet ? ' For ' + esc2(_si.name) + ' that is \u201c' + esc2(_si.leaflet) + '\u201d \u2014 download it from ' + esc2(_si.web || 'the scheme') + ' and file it under Business documents so it attaches automatically.' : ''} Keep evidence of the date and method \u2014 that is what a court looks at.</p>`;

    window.modal('Prescribed information \u2014 ' + esc2(p.address || ''), body,
      `<button class="btn" onclick="closeModal()">Close</button>
       <button class="btn navy" onclick="NexLetDeposit.email('${pid}')">Email to tenant${h === 'landlord' ? ' &amp; landlord' : ''}</button>`, true);
  }

  /* The scheme's own blank PI template, filed once under Business documents.
     Distinguished from the leaflet, which is the tenant-facing explainer. */
  function piTemplateDoc() {
    return ((ST().agency || {}).bizDocs || [])
      .filter(x => {
        if (!x || !x.url) return false;
        const s = String(x.label || '') + ' ' + String(x.name || '');
        if (/leaflet|what\s*is/i.test(s)) return false;
        if (/certificate|\bcert\b|invoice|receipt|membership/i.test(s)) return false;
        return /prescribed/i.test(s) || /\bPI\b/i.test(s)
          || (/template|\bform\b|blank/i.test(s) && /deposit|tds|dps|scheme/i.test(s));
      })
      .sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')))[0] || null;
  }

  /* Everything the scheme's form asks for, ready to copy across. Values only —
     no invention: anything not held shows as a dash so it is obviously missing. */
  function piCrib(p, rec, l) {
    const dash = '\u2014';
    const isPerm = o => window.isPermittedOccupier ? window.isPermittedOccupier(o) : (o.personType || 'joint') === 'permitted';
    const b = window.agencyBrand ? agencyBrand() : {};
    const ten = [{ n: rec.name, e: rec.email, ph: rec.phone }]
      .concat((rec.occupants || []).filter(o => o.name && !isPerm(o)).map(o => ({ n: o.name, e: o.email, ph: o.phone })));
    const rows = [
      ['Property address', [p.address, p.city, p.postcode].filter(Boolean).join(', ') || dash],
      ['Deposit paid', rec.deposit ? money(rec.deposit) : dash],
      ['Date deposit received by the landlord', rec.depositReceived ? dt(rec.depositReceived) : dash],
      ['Date fee paid to the scheme', rec.depositFeePaid ? dt(rec.depositFeePaid) : dash],
      ['Scheme deposit reference', rec.schemeRef || dash],
      ['Primary landlord', (window.landlordName ? landlordName(l) : l.name) || dash],
      ['Landlord email', l.email || dash],
      ['Landlord phone', l.phone || dash],
      ['Landlord address', l.address || dash],
      ['Agent', b.name || dash],
      ['Agent email', b.email || dash],
      ['Agent phone', b.phone || dash],
      ['Agent address', b.address || dash]
    ];
    ten.forEach((t, i) => {
      rows.push(['Tenant ' + (i + 1), t.n || dash]);
      rows.push(['\u2003email / phone', (t.e || dash) + ' \u00b7 ' + (t.ph || dash)]);
    });
    rows.push(['Deduction clause(s)', rec.deductionClause || dash]);
    rows.push(['Relevant person', rec.depositPaidBy || 'none']);
    return rows;
  }

  /* The scheme's leaflet, filed once under Business documents. */
  function leafletDoc() {
    return ((ST().agency || {}).bizDocs || [])
      .filter(x => {
        if (!x || !x.url) return false;
        const s = String(x.label || '') + ' ' + String(x.name || '');
        // The certificate and the fee invoice are different documents.
        if (/certificate|cert\b|invoice|receipt|membership/i.test(s)) return false;
        return /leaflet/i.test(s) || /what\s*is.*deposit/i.test(s) || /deposit\s*scheme/i.test(s);
      })
      .sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')))[0] || null;
  }

  async function uploadFilled(pid, input) {
    const f = input && input.files && input.files[0];
    if (!f) return;
    const rec = window.tenantRecFor(pid);
    if (!rec) { window.toast('No tenancy record', 1); return; }
    const ext = (f.name.split('.').pop() || 'pdf').toLowerCase();
    const url = await window._storageUpload(f, pid + '/pi-completed-' + Date.now() + '.' + ext, 'property-documents');
    if (!url) { window.toast('\u26a0 Upload failed \u2014 retry', 1); return; }
    rec.piDocName = f.name; rec.piDocUrl = url;
    if (!await window.pushTenantRec(rec)) { window.toast('\u26a0 Uploaded, but the tenancy could not be saved \u2014 retry', 1); return; }
    if (window.NexLetAudit) window.NexLetAudit.log({ action: 'doc.uploaded', entity: 'tenancy', entityId: rec.id,
      entityLabel: (rec.name || ''), detail: { document: 'Prescribed information (scheme form, completed)', fileName: f.name } });
    window.render(); open(pid);
    window.toast('\u2713 Completed form on file \u2014 this is what will be emailed');
  }

  async function email(pid) {
    const p = window.P(pid), rec = window.tenantRecFor(pid), l = window.L(p.landlordId);
    const lf = leafletDoc();
    if (!lf && !window.confirm('The scheme\u2019s information leaflet is not filed under Business documents.\n\nThe scheme requires it to accompany the prescribed information \u2014 without it the information is incomplete and counts as not served.\n\nSend anyway?')) return;
    // The scheme's own completed form takes precedence: it is the document the
    // scheme stands behind, and a generated lookalike alongside it would only
    // create doubt about which was served.
    const useTheirs = !!rec.piDocUrl;
    if (!useTheirs && !window.confirm('No completed scheme form is on file, so NexLet\u2019s own version will be sent.\n\nIt follows the scheme\u2019s template but is not their document. Filling and uploading their editable PDF is the safer route.\n\nSend NexLet\u2019s version?')) return;
    const html = (useTheirs
      ? '<p style="font-size:12.5px;line-height:1.7">Please find your prescribed information below, together with the deposit scheme\u2019s information leaflet. Both form part of the information we are required to give you within 30 days of your deposit being received.</p>'
        + '<div style="border:1px solid #E2E5EA;border-radius:7px;padding:12px 14px;margin-top:14px;background:#F8FAFC;font-size:12.5px;line-height:1.7">'
        + '<b style="color:#1B2F4A">Prescribed information</b><br><a href="' + esc2(rec.piDocUrl) + '">Open the prescribed information</a></div>'
      : buildPI(p, rec, l))
      + (lf ? '<div style="border:1px solid #E2E5EA;border-radius:7px;padding:12px 14px;margin-top:18px;background:#F8FAFC;font-size:12.5px;line-height:1.7">'
        + '<b style="color:#1B2F4A">' + esc2(lf.label || 'Deposit scheme information leaflet') + '</b><br>'
        + 'This leaflet forms part of the prescribed information and must be read with it. '
        + '<a href="' + esc2(lf.url) + '">Open the leaflet</a></div>' : '');
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
      detail: { heldBy: holderOf(rec), scheme: rec.scheme || '', ref: rec.schemeRef || '',
        sentTo: to.join(', '), leaflet: lf ? (lf.label || 'included') : 'NOT INCLUDED',
        form: useTheirs ? 'scheme\u2019s own completed form' : 'NexLet generated version' } });
    window.closeModal(); window.render();
    window.toast(failed.length ? '\u26a0 Sent, but failed for: ' + failed.join(', ') : '\u2713 Prescribed information sent and logged');
  }

  window.NexLetDeposit = {
    uploadFilled, HOLDERS, holderOf, clauseFor, buildPI, open, email };
})();
