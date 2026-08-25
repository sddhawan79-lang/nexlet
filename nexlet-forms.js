/* ============================================================================
   nexlet-forms.js — standalone tenancy forms for tenancies already running.

   New tenancies do not need this: the condensation acknowledgement is Schedule 2
   of the tenancy agreement, so signing the agreement signs the acknowledgement.
   No second signing flow, nothing extra to chase.

   Existing tenancies never saw that schedule, so this issues the same content as
   a standalone acknowledgement. It goes out as INFORMATION plus a reporting
   duty, not as a variation of their terms — a signed tenancy cannot be altered
   by sending someone a form.

   Why bother: Awaab's Law timers only start when a hazard is reported. Evidence
   that the tenant was told how to report, and agreed to, is what stops "the
   landlord ignored mould" becoming the version of events on the record.
   ========================================================================== */
(function () {
  'use strict';

  const esc2 = s => (window.esc ? window.esc(s) : String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  const dt = d => (window.fmtDate ? window.fmtDate(d) : String(d || ''));

  const STEPS = [
    ['Ventilate', 'Open windows where it is safe to do so, particularly when cooking, bathing or drying clothes. Use extractor fans where fitted, and leave them running for a while afterwards.'],
    ['Heat', 'Keep reasonable, steady heating during colder months. Condensation forms on cold surfaces, so intermittent heating causes more of it than steady low heating.'],
    ['Keep vents clear', 'Do not block air bricks, trickle vents or extractor ducts. Keep fan grilles clean, and report any fan that is not working.'],
    ['Drying clothes', 'Avoid drying clothes on radiators. Where clothes must be dried indoors, ventilate the room and close the door to it.'],
    ['Wipe condensation', 'Wipe moisture from windows, sills, shower screens and cold surfaces before it sits.'],
    ['Let air circulate', 'Leave a gap between large furniture and cold external walls where possible.'],
    ['Treat small patches', 'Clean minor surface mould promptly with an appropriate anti-fungal cleaner. This does not replace the duty to report it.'],
    ['Report within 3 working days', 'Tell us within 3 working days of damp, mould or persistent condensation becoming apparent. Never paint over or conceal it.']
  ];

  function build(p, rec) {
    const b = window.agencyBrand ? agencyBrand() : {};
    const isPerm = o => (o.personType || 'joint') === 'permitted' || (o.age !== '' && o.age != null && +o.age < 18);
    const names = [rec.name].concat((rec.occupants || []).filter(o => o.name && !isPerm(o)).map(o => o.name)).filter(Boolean);
    const prop = [p.address, p.city, p.postcode].filter(Boolean).join(', ');
    const contact = [b.email, b.phone].filter(Boolean).join(' \u00b7 ');

    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:2px solid #1B2F4A;padding-bottom:13px;margin-bottom:18px">
      <div><div style="font-family:Georgia,serif;font-size:21px;color:#1B2F4A">${esc2(b.name || '')}</div>
        ${b.tagline ? `<div style="font-size:11.5px;font-style:italic;color:#8A7D6E;margin-top:2px">${esc2(b.tagline)}</div>` : ''}</div>
      <div style="text-align:right"><div style="font-family:Georgia,serif;font-size:15px;color:#1B2F4A">CONDENSATION &amp; MOULD</div>
        <div style="font-size:11px;color:#5A6B82;margin-top:2px">Prevention and reporting</div></div></div>

    <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:16px">
      <tr><td style="padding:5px 12px 5px 0;color:#5A6B82;width:34%;font-weight:700">Property</td><td>${esc2(prop)}</td></tr>
      <tr><td style="padding:5px 12px 5px 0;color:#5A6B82;font-weight:700">Tenant${names.length > 1 ? 's' : ''}</td><td>${esc2(names.join(', '))}</td></tr>
      ${rec.start ? `<tr><td style="padding:5px 12px 5px 0;color:#5A6B82;font-weight:700">Tenancy started</td><td>${esc2(dt(rec.start))}</td></tr>` : ''}
      <tr><td style="padding:5px 12px 5px 0;color:#5A6B82;font-weight:700">Report damp or mould to</td><td><strong>${esc2(contact || b.name || '')}</strong></td></tr>
    </table>

    <p style="font-size:12.5px;line-height:1.7;margin:0 0 10px">Condensation occurs in every kind of property, including new and well-maintained ones. It comes from moisture produced by ordinary activities \u2014 cooking, washing, bathing, drying clothes \u2014 and turns to mould where that moisture is not ventilated away.</p>
    <p style="font-size:12.5px;line-height:1.7;margin:0 0 14px">We are responsible for the structure, the installations, and for investigating and remedying damp and mould. Your part is managing everyday moisture and telling us early if a problem appears. This is not a change to your tenancy \u2014 it explains what the existing repairing and reporting terms mean in practice.</p>

    <h3 style="font-size:13px;font-weight:700;color:#1B2F4A;margin:18px 0 8px;border-top:1px solid #E2E5EA;padding-top:12px">What we ask you to do</h3>
    <table style="width:100%;border-collapse:collapse">
      ${STEPS.map(([t, d]) => `<tr>
        <td style="width:26px;vertical-align:top;padding:7px 0"><div style="width:15px;height:15px;border:1.5px solid #1B2F4A;border-radius:3px"></div></td>
        <td style="padding:7px 0;font-size:12.5px;line-height:1.65"><strong>${esc2(t)}.</strong> ${esc2(d)}</td>
        <td style="width:56px;vertical-align:bottom;padding:7px 0 7px 12px"><div style="border-bottom:1px solid #C9CFD8;height:17px"></div>
          <div style="font-size:8.5px;color:#8A7D6E;text-align:center;margin-top:2px">initial</div></td>
      </tr>`).join('')}
    </table>

    <h3 style="font-size:13px;font-weight:700;color:#1B2F4A;margin:18px 0 8px;border-top:1px solid #E2E5EA;padding-top:12px">What we will do</h3>
    <ul style="margin:4px 0 0;padding-left:20px;font-size:12.5px;line-height:1.7">
      <li style="margin-bottom:5px">Investigate a report of damp or mould, and carry out any repair we are responsible for, within the timescales required by law \u2014 including those under Awaab\u2019s Law where they apply.</li>
      <li style="margin-bottom:5px">Where the cause is unclear, arrange an inspection by a suitably qualified person and share the findings with you.</li>
      <li style="margin-bottom:5px">Meet the cost of remedying damp or mould arising from the condition of the property, its structure or its installations.</li>
    </ul>
    <p style="font-size:12px;line-height:1.7;margin:12px 0 0;background:#F8FAFC;border:1px solid #E2E5EA;border-radius:7px;padding:11px 13px">
      <strong>Reporting a problem never costs you anything.</strong> Tell us whatever the cause and whoever you think is responsible \u2014 we would far rather look at something early than deal with it once it has spread. A cost only ever arises where an independent inspection shows mould resulted from a breach of your tenancy terms, or from refusing access or concealing it after being asked to report it.</p>

    <h3 style="font-size:13px;font-weight:700;color:#1B2F4A;margin:20px 0 8px;border-top:1px solid #E2E5EA;padding-top:12px">Acknowledgement</h3>
    <p style="font-size:12.5px;line-height:1.7;margin:0 0 14px">I confirm I have read this document, will take reasonable steps to prevent condensation and mould, will report any damp or mould within 3 working days, and will pass this information to anyone else living at or visiting the property.</p>
    ${names.map(nm => `<div style="display:flex;gap:26px;margin-top:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px"><div style="border-bottom:1px solid #1B2F4A;height:40px"></div>
        <div style="font-size:11px;color:#5A6B82;margin-top:4px">Signed \u2014 ${esc2(nm)}</div></div>
      <div style="width:150px"><div style="border-bottom:1px solid #1B2F4A;height:40px"></div>
        <div style="font-size:11px;color:#5A6B82;margin-top:4px">Date</div></div>
    </div>`).join('')}`;
  }

  function open(pid) {
    const p = window.P(pid), rec = window.tenantRecFor(pid);
    if (!rec) { window.toast('No tenant record on this property', 1); return; }
    const html = build(p, rec);
    const ack = rec.condensationAckAt;
    const body = `
      <div class="note" style="margin-bottom:12px">New tenancies do not need this \u2014 it is Schedule 2 of the tenancy agreement, signed with the agreement. Use this for tenancies that were already running.</div>
      ${ack ? `<div class="note" style="margin-bottom:12px;border-color:var(--green);background:var(--green-bg)"><b>\u2713 Acknowledged ${esc2(dt(ack))}</b></div>` : ''}
      <div class="fg"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <label style="margin:0">Condensation &amp; mould acknowledgement</label>
        <button type="button" class="btn sm" onclick="NexLetForms.print()">\u2399 Print / save as PDF</button></div>
        <div id="cond-preview" style="max-height:330px;overflow-y:auto;border:1px solid #E3D9C8;border-radius:8px;padding:16px;background:var(--off)">${html}</div></div>
      <p class="hint">Emailing it records that the information was given. Mark it acknowledged once the tenant replies or returns a signed copy \u2014 that is the evidence worth having.</p>`;
    window._condPid = pid;
    window.modal('Condensation &amp; mould \u2014 ' + esc2(p.address || ''), body,
      `<button class="btn" onclick="closeModal()">Close</button>
       ${ack ? '' : `<button class="btn" onclick="NexLetForms.markAck('${pid}')">Mark acknowledged</button>`}
       <button class="btn navy" onclick="NexLetForms.email('${pid}')">Email to tenant</button>`, true);
  }

  async function email(pid) {
    const p = window.P(pid), rec = window.tenantRecFor(pid);
    const isPerm = o => (o.personType || 'joint') === 'permitted' || (o.age !== '' && o.age != null && +o.age < 18);
    const to = [rec.email].concat((rec.occupants || []).filter(o => o.email && !isPerm(o)).map(o => o.email)).filter(Boolean);
    if (!to.length) { window.toast('No tenant email on file', 1); return; }
    const intro = `<p>Hello,</p><p>We are sending this to every tenancy we look after. It explains how to prevent condensation and mould, and how to report it to us. It is not a change to your tenancy.</p>
      <p>Please read it and reply to confirm. If you can see damp or mould now, tell us and we will arrange a look \u2014 reporting it never costs you anything.</p>`;
    const html = intro + build(p, rec);
    const failed = [];
    for (const e of to) { const r = await window.agencyEmail(e, 'Condensation and mould \u2014 how to prevent and report it', html); if (!r || !r.ok) failed.push(e); }
    rec.condensationSentAt = new Date().toISOString().slice(0, 10);
    window.pushTenantRec(rec); window.save();
    if (window.NexLetAudit) NexLetAudit.log({ action: 'doc.generated', entity: 'tenancy', entityId: rec.id,
      entityLabel: (rec.name || '') + ' \u2014 ' + (p.address || ''),
      detail: { document: 'Condensation and mould acknowledgement', sentTo: to.join(', ') } });
    window.closeModal(); window.render();
    window.toast(failed.length ? '\u26a0 Failed for: ' + failed.join(', ') : '\u2713 Sent and logged');
  }

  function markAck(pid) {
    const rec = window.tenantRecFor(pid);
    rec.condensationAckAt = new Date().toISOString().slice(0, 10);
    window.pushTenantRec(rec); window.save();
    if (window.NexLetAudit) NexLetAudit.log({ action: 'doc.generated', entity: 'tenancy', entityId: rec.id,
      entityLabel: rec.name || '', detail: { document: 'Condensation acknowledgement', acknowledged: rec.condensationAckAt } });
    window.closeModal(); window.render();
    window.toast('\u2713 Recorded as acknowledged');
  }

  window.NexLetForms = {
    condensation: open, email, markAck, buildCondensation: build,
    print() { window.NexLetPrint.fromEl('cond-preview', 'Condensation and mould', 'Acknowledgement'); }
  };
})();
