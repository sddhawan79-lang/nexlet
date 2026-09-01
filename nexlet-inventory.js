/* nexlet-inventory.js — tenant review and sign-off on an inventory.
 *
 * WHY
 *
 * The inventory is the document that decides deposit disputes, and an inventory
 * the tenant never saw carries very little weight. Adjudicators decide on the
 * evidence in front of them, and what they want to see is a check-in record the
 * tenant had a genuine opportunity to challenge. Best practice — and what the
 * schemes ask for — is: send it, allow seven to ten days for the tenant to
 * review and report anything missed, and take a signature.
 *
 * NexLet previously recorded a tenant name typed in by an agent. That proves
 * nothing about whether the tenant ever saw it.
 *
 * HOW THIS WORKS
 *
 * A report is sent for review. Every adult on the tenancy gets their own
 * unguessable link. They see the photographs and the wording, and can flag any
 * item in their own words. Three things are recorded server-side, where the
 * client cannot influence them: the first time each person OPENED the review,
 * every comment with its timestamp, and the signature with time, IP and device.
 *
 * DEEMED ACCEPTANCE hangs entirely on that open. After the deadline, an
 * inventory that was opened and not challenged is treated as agreed, and the
 * certificate says so in those words, with the date it was opened. One that was
 * never opened is never deemed — it stays outstanding, because "we emailed it"
 * is not an answer to "did they see it".
 *
 * A flagged item is not a dispute to be won. The agent can accept the tenant's
 * wording, which replaces the description on the report; the original wording
 * stays visible underneath, because an amended record that hides what it used to
 * say is worth less than one that shows its working.
 */
(function () {
  'use strict';

  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escJs = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const day = d => { try { return d && window.fmtDate ? window.fmtDate(d) : ''; } catch (e) { return ''; } };
  const dt = d => { try { return d ? new Date(d).toLocaleString('en-GB',
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''; } catch (e) { return ''; } };
  const REVIEW_DAYS = 7;
  const PAGE = 'inventory-review.html';

  const TITLES = { movein: 'Move-in inventory', midterm: 'Mid-tenancy inspection',
    precheckout: 'Pre-checkout inspection', moveout: 'Check-out report' };

  function reviews() { return ST().invReviews || []; }
  function forReport(rid) {
    return reviews().filter(r => r.report_id === rid)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null;
  }
  function forInventory(vid) {
    return reviews().filter(r => r.inventory_id === vid)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null;
  }

  const opened = r => (r.signatories || []).some(s => s.opened_at);
  const signedCount = r => (r.signatories || []).filter(s => s.signed_at).length;
  const flagged = r => (r.items || []).filter(i => i.tenantComment);
  const overdue = r => !!r.deadline_at && new Date(r.deadline_at) < new Date();

  /* The only place deemed acceptance is decided. Everything else asks this. */
  function deemed(r) {
    if (!r || r.status === 'signed' || r.status === 'void') return false;
    return overdue(r) && opened(r);
  }
  function state(r) {
    if (!r) return { k: 'none', label: 'Not sent to the tenant', tone: 'amber' };
    if (r.status === 'void') return { k: 'void', label: 'Withdrawn', tone: 'faint' };
    if (r.status === 'signed') return { k: 'signed', label: 'Signed by everyone', tone: 'green' };
    if (deemed(r)) return { k: 'deemed', label: 'Taken as agreed \u2014 opened, not challenged', tone: 'green' };
    if (overdue(r)) return { k: 'stale', label: 'Never opened \u2014 nothing can be deemed', tone: 'red' };
    if (signedCount(r)) return { k: 'partial', label: signedCount(r) + ' of ' + (r.signatories || []).length + ' signed', tone: 'amber' };
    return { k: 'sent', label: opened(r) ? 'Opened, not yet signed' : 'Sent, not yet opened', tone: 'amber' };
  }

  /* ── Sending ────────────────────────────────────────────────────────────── */
  /* Every adult signs, matching the household composition declaration. A person
     under 18 is part of the household but cannot give a binding confirmation. */
  function signers(rec) {
    const out = [{ role: 'tenant', name: rec.name || '', email: rec.email || '' }];
    (rec.occupants || []).forEach(o => {
      if (!o.name) return;
      const age = parseInt(o.age, 10);
      if (!isNaN(age) && age < 18) return;
      out.push({ role: 'occupant', name: o.name, email: o.email || '' });
    });
    return out;
  }
  const newToken = () => { const a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.from(a).map(x => x.toString(16).padStart(2, '0')).join(''); };

  function open(vid, rid) {
    const v = (ST().inventories2 || []).find(x => x.id === vid);
    if (!v) return;
    const rep = (v.reports || []).find(x => x.id === rid) || (v.reports || [])[0];
    if (!rep) { window.toast('Generate a report first \u2014 there is nothing to send', 1); return; }
    const rec = (ST().tenants || []).find(x => x.id === v.tenantId);
    if (!rec) { window.toast('No tenant on this inventory', 1); return; }
    const p = (window.P && window.P(v.propertyId)) || {};
    const prev = forReport(rep.id);
    const list = signers(rec);
    const noEmail = list.filter(s => !s.email);

    window.modal('Send for tenant review \u2014 ' + esc(p.address || ''),
      '<p class="hint" style="margin:0 0 14px">Each person gets their own link. They see the photographs and the wording, ' +
      'and can flag anything that is wrong in their own words. We record when each of them opens it, which is what makes ' +
      'the ' + REVIEW_DAYS + '-day deadline mean anything.</p>' +

      (prev ? '<div class="note ' + (prev.status === 'signed' ? 'ok' : 'warn') + '" style="margin-bottom:12px"><b>' +
        esc(state(prev).label) + '.</b> Sent ' + esc(day(prev.created_at)) + '. Sending again starts a new review and ' +
        'supersedes this one.</div>' : '') +

      '<div class="fg"><label>Who signs</label>' +
      list.map(s => '<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;' +
        'border-top:1px solid var(--border);font-size:12.5px">' +
        '<span style="font-weight:600;color:var(--navy)">' + esc(s.name) + '</span>' +
        (s.email ? '<span class="faint">' + esc(s.email) + '</span>'
                 : '<span style="color:var(--red);font-weight:600">No email \u2014 cannot be sent a link</span>') +
        '</div>').join('') + '</div>' +

      (noEmail.length ? '<div class="note warn" style="margin-bottom:12px"><b>' + noEmail.length +
        ' person' + (noEmail.length === 1 ? '' : 's') + ' has no email address.</b> Add one on the tenant record first, ' +
        'or they will be listed on the inventory without ever being able to see it \u2014 which is the situation this is ' +
        'meant to fix.</div>' : '') +

      '<div class="fg"><label for="ivr-days">Days to review</label>' +
      '<input type="number" id="ivr-days" value="' + REVIEW_DAYS + '" min="3" max="28" style="max-width:110px">' +
      '<span class="hint">Seven is the usual window. After it passes, an inventory that was opened and not challenged ' +
      'is taken as agreed.</span></div>' +

      '<div class="fg"><label for="ivr-note">Anything to add to the email</label>' +
      '<textarea id="ivr-note" rows="2" placeholder="Optional \u2014 e.g. the bathroom light is being replaced on Friday."></textarea></div>',

      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      (prev ? '<button class="btn" onclick="NexLetInventory.status(\'' + escJs(prev.id) + '\')">See the current review</button>' : '') +
      '<button class="btn navy" onclick="NexLetInventory.send(\'' + escJs(vid) + '\',\'' + escJs(rep.id) + '\')">' +
      (prev ? 'Send a new review' : 'Send for review') + '</button>', true);
  }

  async function send(vid, rid) {
    const v = (ST().inventories2 || []).find(x => x.id === vid);
    const rep = (v.reports || []).find(x => x.id === rid);
    const rec = (ST().tenants || []).find(x => x.id === v.tenantId) || {};
    const p = (window.P && window.P(v.propertyId)) || {};
    const days = Math.max(3, Math.min(28, parseInt((window.val && window.val('ivr-days')) || REVIEW_DAYS, 10) || REVIEW_DAYS));
    const note = (window.val && window.val('ivr-note')) || '';
    const list = signers(rec).filter(s => s.email);
    if (!list.length) { window.toast('Nobody on this tenancy has an email address', 1); return; }

    const items = (rep.results || []).map(x => ({
      room: x.room || '', item: x.item || '',
      condition: x.condition || '', summary: x.summary || '',
      classification: x.classification || '',
      photos: (x.checkinPhotos || []).concat(x.stagePhotos || []).slice(0, 4)
    }));
    const sigs = list.map(s => Object.assign({}, s, { token: newToken(), sig_png: null, signed_at: null, opened_at: null }));
    const deadline = new Date(Date.now() + days * 86400000).toISOString();
    const row = {
      id: (window.uid ? window.uid('ivr') : 'ivr' + Date.now()),
      agency_id: window._agencyId, inventory_id: vid, report_id: rid,
      property_id: v.propertyId || null, tenant_id: v.tenantId || null,
      address: p.address || '', report_type: rep.type || 'movein',
      document_html: await reportHtml(rep, p, rec, v),
      items: items, signatories: sigs, status: 'sent', deadline_at: deadline,
      agent_name: (ST().agency || {}).name || '', agent_email: window._agentEmail || ''
    };

    const { error } = await window.sb.from('agency_inventory_reviews').insert(row);
    if (error) { console.error(error); window.toast('\u26a0 Could not send \u2014 run nexlet-inventory-review.sql then retry', 1); return; }

    /* Supersede any earlier review of the same report, so two open reviews can
       never both be collecting comments on the same document. */
    const prev = forReport(rid);
    if (prev && prev.status !== 'signed') {
      await window.sb.from('agency_inventory_reviews').update({ status: 'void' }).eq('id', prev.id);
      prev.status = 'void';
    }

    ST().invReviews = ST().invReviews || [];
    ST().invReviews.unshift(row);

    const title = TITLES[row.report_type] || 'Inventory';
    const failed = [];
    for (const s of sigs) {
      const link = location.origin + location.pathname.replace(/[^/]*$/, '') + PAGE + '?t=' + s.token;
      const html = '<div style="font-family:Arial,sans-serif;max-width:600px;color:#1A2B45;line-height:1.7">' +
        '<p>Dear ' + esc(s.name.split(' ')[0] || s.name) + ',</p>' +
        '<p>Here is the <b>' + esc(title.toLowerCase()) + '</b> for <b>' + esc(p.address || '') + '</b> \u2014 the record of ' +
        'the condition of the property, room by room, with photographs.</p>' +
        '<p>Please read it. <b>If anything is wrong, or something is already marked or damaged and we have missed it, ' +
        'tell us using the link.</b> This is what protects you if there is ever a question about your deposit.</p>' +
        (note ? '<p>' + esc(note) + '</p>' : '') +
        '<p style="margin:26px 0"><a href="' + link + '" style="background:#009970;color:#fff;text-decoration:none;' +
        'padding:13px 26px;border-radius:8px;font-weight:600;display:inline-block">Read and sign the ' +
        esc(title.toLowerCase()) + '</a></p>' +
        '<p style="font-size:13px;color:#5A6B80">Please do this by <b>' + esc(day(deadline)) + '</b>. If we have not ' +
        'heard from you by then, and our records show you opened it, we will take the inventory as agreed. ' +
        'This link is personal to you \u2014 please do not forward it.</p>' +
        '<p style="font-size:13px;color:#5A6B80">' + esc((ST().agency || {}).name || '') + '</p></div>';
      try { await window.agencyEmail(s.email, title + ' for your new home \u2014 please check it', html); }
      catch (e) { failed.push(s.name); }
    }

    if (window.NexLetAudit) window.NexLetAudit.log({ action: 'email.sent', entity: 'tenancy',
      entityId: rec.id, entityLabel: (rec.name || '') + ' \u2014 ' + (p.address || ''),
      detail: { document: title + ' sent for tenant review', sentTo: sigs.map(s => s.email).join(', '),
        items: items.length, reviewDeadline: day(deadline) } });

    window.closeModal(); if (window.render) window.render();
    window.toast(failed.length ? '\u26a0 Sent, but these bounced: ' + failed.join(', ')
      : '\u2713 Sent to ' + sigs.length + ' for review \u2014 due back ' + day(deadline), failed.length ? 1 : 0);
  }

  /* ── Status and the agent's response to a flag ──────────────────────────── */
  function status(rvid) {
    const r = reviews().find(x => x.id === rvid);
    if (!r) return;
    const st = state(r), fl = flagged(r);
    const tone = { green: 'ok', amber: 'warn', red: 'warn', faint: '' }[st.tone] || '';

    window.modal((TITLES[r.report_type] || 'Inventory') + ' review \u2014 ' + esc(r.address || ''),
      '<div class="note ' + tone + '" style="margin-bottom:14px"><b>' + esc(st.label) + '.</b> ' +
      (st.k === 'deemed'
        ? 'The review period ended ' + esc(day(r.deadline_at)) + '. It was opened and nothing was challenged, so the ' +
          'inventory stands as written. The certificate records the date it was opened.'
        : st.k === 'stale'
        ? 'The deadline passed on ' + esc(day(r.deadline_at)) + ' but nobody opened the link, so nothing can be treated ' +
          'as agreed. Chase it, or hand a printed copy over and record that instead \u2014 an unopened email is not service.'
        : st.k === 'signed'
        ? 'Signed by everyone named. This is the strongest version of this document you can hold.'
        : 'Due back ' + esc(day(r.deadline_at)) + '.') + '</div>' +

      '<div class="fg"><label>Who has seen it</label>' +
      (r.signatories || []).map(s => '<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;' +
        'border-top:1px solid var(--border);font-size:12.5px;flex-wrap:wrap">' +
        '<span style="font-weight:600;color:var(--navy)">' + esc(s.name || '') + '</span>' +
        '<span class="faint" style="text-align:right">' +
        (s.signed_at ? '<span style="color:var(--green);font-weight:700">\u2713 Signed ' + esc(dt(s.signed_at)) + '</span>'
          : s.opened_at ? 'Opened ' + esc(dt(s.opened_at)) + ', not signed'
          : '<span style="color:var(--red)">Never opened</span>') +
        '</span></div>').join('') + '</div>' +

      (fl.length
        ? '<div class="fg"><label>' + fl.length + ' item' + (fl.length === 1 ? '' : 's') + ' the tenant flagged</label>' +
          '<span class="hint" style="display:block;margin-bottom:8px">Accepting replaces the description on the report ' +
          'with the tenant\u2019s words. What it said before stays on the record underneath.</span>' +
          fl.map(f => {
            const i = (r.items || []).indexOf(f);
            return '<div style="border:1px solid var(--amber);border-radius:9px;padding:12px 14px;margin-bottom:9px;' +
              'background:var(--amber-bg)">' +
              '<div style="font-size:12.5px;font-weight:700;color:var(--navy)">' + esc(f.room || '') + ' \u2014 ' + esc(f.item || '') + '</div>' +
              '<div style="font-size:12px;color:var(--muted);margin-top:5px;line-height:1.6"><b>We wrote:</b> ' + esc(f.summary || '') + '</div>' +
              '<div style="font-size:12.5px;margin-top:7px;line-height:1.65"><b>' + esc(f.commentedBy || 'The tenant') +
              ' said:</b> ' + esc(f.tenantComment) + '</div>' +
              (f.commentedAt ? '<div class="faint" style="font-size:11px;margin-top:4px">Recorded ' + esc(dt(f.commentedAt)) + '</div>' : '') +
              (f.agentAcceptedAt
                ? '<div style="font-size:12px;color:var(--green);font-weight:700;margin-top:8px">\u2713 Accepted ' + esc(day(f.agentAcceptedAt)) + ' \u2014 now the description on the report</div>'
                : '<div style="margin-top:9px"><button class="btn sm navy" onclick="NexLetInventory.accept(\'' +
                  escJs(r.id) + '\',' + i + ')">Accept their wording</button></div>') +
              '</div>';
          }).join('') + '</div>'
        : '<div class="note" style="margin-bottom:6px">Nothing flagged. Every item was accepted as written.</div>'),

      '<button class="btn" onclick="closeModal()">Close</button>' +
      (st.k === 'stale' || st.k === 'sent' || st.k === 'partial'
        ? '<button class="btn" onclick="NexLetInventory.chase(\'' + escJs(r.id) + '\')">Remind those outstanding</button>' : '') +
      '<button class="btn" onclick="NexLetInventory.certificate(\'' + escJs(r.id) + '\')">Certificate</button>', true);
  }

  /* The tenant's wording becomes the description, on the report and on the room
     itself, so a later check-out compares against what was actually agreed. */
  async function accept(rvid, idx) {
    const r = reviews().find(x => x.id === rvid);
    if (!r) return;
    const it = (r.items || [])[idx];
    if (!it || !it.tenantComment) return;
    const stamp = new Date().toISOString();
    it.agentOriginal = it.agentOriginal || it.summary || '';
    it.summary = it.tenantComment;
    it.agentAcceptedAt = stamp;

    const { error } = await window.sb.from('agency_inventory_reviews').update({ items: r.items }).eq('id', r.id);
    if (error) { console.error(error); window.toast('Could not save \u2014 check your connection', 1); return; }

    const v = (ST().inventories2 || []).find(x => x.id === r.inventory_id);
    if (v) {
      const rep = (v.reports || []).find(x => x.id === r.report_id);
      const res = rep && (rep.results || [])[idx];
      if (res) {
        res.tenantAmended = { was: it.agentOriginal, by: it.commentedBy || '', at: it.commentedAt || stamp };
        res.summary = it.tenantComment;
      }
      const room = (v.rooms || []).find(x => x.room === it.room && x.item === it.item);
      if (room) { room.checkin = room.checkin || { photos: [], note: '' };
        room.checkin.note = (room.checkin.note ? room.checkin.note + ' \u2014 ' : '') + it.tenantComment; }
      if (window.pushInv2) window.pushInv2(v);
    }
    if (window.NexLetAudit) window.NexLetAudit.log({ action: 'doc.amended', entity: 'tenancy',
      entityId: r.tenant_id || '', entityLabel: r.address || '',
      detail: { document: (TITLES[r.report_type] || 'Inventory'), item: (it.room || '') + ' \u2014 ' + (it.item || ''),
        was: it.agentOriginal, now: it.tenantComment, source: 'Tenant review, accepted by the agent' } });
    status(rvid);
    if (window.render) window.render();
    window.toast('\u2713 The tenant\u2019s wording is now the description');
  }

  async function chase(rvid) {
    const r = reviews().find(x => x.id === rvid);
    if (!r) return;
    const out = (r.signatories || []).filter(s => !s.signed_at && s.email);
    if (!out.length) { window.toast('Everyone has signed'); return; }
    const title = TITLES[r.report_type] || 'Inventory';
    const late = overdue(r);
    for (const s of out) {
      const link = location.origin + location.pathname.replace(/[^/]*$/, '') + PAGE + '?t=' + s.token;
      await window.agencyEmail(s.email, 'Reminder \u2014 please check your ' + title.toLowerCase(),
        '<div style="font-family:Arial,sans-serif;max-width:600px;color:#1A2B45;line-height:1.7">' +
        '<p>Dear ' + esc(s.name.split(' ')[0] || s.name) + ',</p>' +
        '<p>We sent you the ' + esc(title.toLowerCase()) + ' for <b>' + esc(r.address || '') + '</b> on ' +
        esc(day(r.created_at)) + (s.opened_at ? ', and our records show you opened it on ' + esc(day(s.opened_at)) : '') + '.</p>' +
        '<p>' + (late ? 'The review period has now passed, but you can still read it, flag anything that is wrong, and sign.'
                      : 'Please read it and sign by <b>' + esc(day(r.deadline_at)) + '</b>.') + '</p>' +
        '<p style="margin:26px 0"><a href="' + link + '" style="background:#009970;color:#fff;text-decoration:none;' +
        'padding:13px 26px;border-radius:8px;font-weight:600;display:inline-block">Read and sign</a></p>' +
        '<p style="font-size:13px;color:#5A6B80">' + esc((ST().agency || {}).name || '') + '</p></div>');
    }
    if (window.NexLetAudit) window.NexLetAudit.log({ action: 'email.sent', entity: 'tenancy',
      entityId: r.tenant_id || '', entityLabel: r.address || '',
      detail: { document: title + ' review reminder', sentTo: out.map(s => s.email).join(', ') } });
    window.toast('\u2713 Reminded ' + out.length);
  }

  /* ── The certificate ────────────────────────────────────────────────────── */
  /* What an adjudicator is handed: who saw it, when they opened it, what they
     said, what was done about it. Deemed acceptance states its own basis rather
     than asserting agreement. */
  function certificateHtml(r) {
    const st = state(r), fl = flagged(r);
    const cell = (nm, png, at, ip, ua, op) =>
      '<div style="border:1px solid #E3D9C8;border-radius:8px;padding:12px 14px;background:#fff">' +
      '<div style="font-size:13.5px;font-weight:700;color:#1B2F4A;margin-bottom:8px">' + esc(nm || '\u2014') + '</div>' +
      (png ? '<img src="' + png + '" alt="Signature of ' + esc(nm || '') + '" style="display:block;max-width:220px;' +
        'max-height:66px;border-bottom:1px solid #1B2F4A;padding-bottom:4px">'
           : '<div style="height:48px;display:flex;align-items:flex-end;color:#B4863A;font-size:12px;' +
             'border-bottom:1px dashed #C9BCA6">Not signed</div>') +
      '<div style="font-size:11px;color:#8A7D6E;margin-top:7px;line-height:1.6">' +
      (at ? 'Signed ' + esc(dt(at)) : 'No signature') +
      (op ? '<br>Opened the review ' + esc(dt(op)) : '<br>Never opened the review') +
      (ip ? '<br>IP ' + esc(ip) : '') + (ua ? '<br>' + esc(String(ua).slice(0, 58)) : '') + '</div></div>';

    return '<div style="font-family:Georgia,\'Times New Roman\',serif;color:#2C2418;line-height:1.62;max-width:780px">' +
      '<h2 style="font-size:17px;color:#1B2F4A;margin:0 0 3px">Tenant review and sign-off</h2>' +
      '<p style="font-size:12px;color:#8A7D6E;margin:0 0 14px">' + esc(TITLES[r.report_type] || 'Inventory') + ' \u00b7 ' +
      esc(r.address || '') + ' \u00b7 sent ' + esc(day(r.created_at)) + ', review period ' +
      esc(day(r.deadline_at)) + '</p>' +

      '<div style="border:1px solid ' + (st.tone === 'green' ? '#BFD8C4' : st.tone === 'red' ? '#E2C4BC' : '#EADFC8') +
      ';background:' + (st.tone === 'green' ? '#F3F8F4' : st.tone === 'red' ? '#FBF3F1' : '#FAF6EE') +
      ';border-radius:9px;padding:13px 16px;font-size:13px;line-height:1.7">' +
      '<b>' + esc(st.label) + '.</b> ' +
      (st.k === 'deemed'
        ? 'The tenant was sent this document on ' + esc(day(r.created_at)) + ', opened it on ' +
          esc(dt((r.signatories || []).map(s => s.opened_at).filter(Boolean).sort()[0])) +
          ', and raised nothing before the review period closed on ' + esc(day(r.deadline_at)) +
          '. It is therefore relied on as agreed.'
        : st.k === 'stale'
        ? 'The document was sent on ' + esc(day(r.created_at)) + ' but no recipient opened it. Nothing is treated as ' +
          'agreed on that basis.'
        : st.k === 'signed'
        ? 'Every person named signed after having the opportunity to inspect the document and to challenge any part of it.'
        : 'The review period is still open.') + '</div>' +

      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin-top:14px">' +
      (r.signatories || []).map(s => cell(s.name, s.sig_png, s.signed_at, s.ip, s.ua, s.opened_at)).join('') + '</div>' +

      (fl.length
        ? '<h3 style="font-size:14px;color:#1B2F4A;margin:20px 0 6px">Items the tenant challenged</h3>' +
          fl.map(f => '<div style="border-left:3px solid #B4863A;padding:8px 0 8px 13px;margin-bottom:11px">' +
            '<div style="font-size:13px;font-weight:700;color:#1B2F4A">' + esc(f.room || '') + ' \u2014 ' + esc(f.item || '') + '</div>' +
            '<div style="font-size:12.5px;margin-top:4px"><b>' + esc(f.commentedBy || 'Tenant') + ':</b> \u201c' +
            esc(f.tenantComment) + '\u201d' + (f.commentedAt ? ' <span style="color:#8A7D6E">(' + esc(dt(f.commentedAt)) + ')</span>' : '') + '</div>' +
            (f.agentAcceptedAt
              ? '<div style="font-size:12.5px;margin-top:4px;color:#1B7A4B"><b>Accepted ' + esc(day(f.agentAcceptedAt)) +
                '.</b> This wording replaced the original, which read: \u201c' + esc(f.agentOriginal || '') + '\u201d</div>'
              : '<div style="font-size:12.5px;margin-top:4px;color:#8A7D6E">Recorded, not accepted. The original ' +
                'description stands: \u201c' + esc(f.summary || '') + '\u201d</div>') +
            '</div>').join('')
        : '<p style="font-size:12.5px;color:#8A7D6E;margin-top:16px">No item was challenged.</p>') +

      '<p style="font-size:11px;color:#8A7D6E;margin-top:18px;padding-top:10px;border-top:1px solid #E8DFCF;line-height:1.6">' +
      'Each person was sent a link personal to them. The time the document was first opened, the time of every comment, ' +
      'and the time, IP address and device of every signature were recorded by the server and cannot be altered by ' +
      'either party.</p></div>';
  }

  function certificate(rvid) {
    const r = reviews().find(x => x.id === rvid);
    if (!r) return;
    if (window._openLetter) window._openLetter({ subject: 'Tenant review \u2014 ' + (r.address || ''),
      body_html: certificateHtml(r) });
  }

  /* ── The report the tenant is shown ─────────────────────────────────────── */
  /* The agency charges the landlord for this document, so it has to read like
     something worth paying for. Reuses the report renderer already in agent.html
     where it exists, and falls back to a plain rendering if it does not. */
  async function reportHtml(rep, p, rec, v) {
    let src = rep;
    /* Photos sit in a private bucket. The review page signs them itself as it
       renders, but this snapshot is what gets printed and emailed, so it needs
       its own signed copies rather than bucket paths that resolve to nothing. */
    try { if (window._signReportPhotos) src = await window._signReportPhotos(rep); } catch (e) { console.error(e); }
    try { if (window._invReportHtml) return window._invReportHtml(src, p, rec, v); } catch (e) { console.error(e); }
    rep = src;
    return '<div style="font-family:Georgia,serif;color:#2C2418"><h2>' + esc(TITLES[rep.type] || 'Inventory') + '</h2>' +
      '<p>' + esc(p.address || '') + '</p>' +
      (rep.results || []).map(x => '<div style="border-top:1px solid #E8DFCF;padding:9px 0">' +
        '<b>' + esc(x.room || '') + ' \u2014 ' + esc(x.item || '') + '</b>' +
        (x.condition ? ' <span style="color:#8A7D6E">(' + esc(x.condition) + ')</span>' : '') +
        '<div style="font-size:13px;margin-top:3px">' + esc(x.summary || '') + '</div></div>').join('') + '</div>';
  }

  /* ── The row the agent sees on the inventory ────────────────────────────── */
  function panel(v) {
    const rep = (v.reports || [])[0];
    if (!rep) return '';
    const r = forReport(rep.id);
    const st = state(r);
    const col = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', faint: 'var(--faint)' }[st.tone];
    const bg = { green: 'var(--green-bg)', amber: 'var(--amber-bg)', red: 'var(--red-bg)', faint: 'var(--off)' }[st.tone];
    const fl = r ? flagged(r).length : 0;
    return '<div style="border:1px solid ' + col + ';border-left-width:5px;border-radius:10px;padding:13px 16px;' +
      'margin:0 0 14px;background:' + bg + ';display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:240px">' +
      '<div style="font-size:13.5px;font-weight:700;color:' + col + '">' + esc(st.label) + '</div>' +
      '<div class="faint" style="font-size:11.5px;margin-top:3px;line-height:1.55">' +
      (r ? 'Sent ' + esc(day(r.created_at)) + ' to ' + (r.signatories || []).length + ' \u00b7 due back ' +
           esc(day(r.deadline_at)) + (fl ? ' \u00b7 <b style="color:var(--amber)">' + fl + ' flagged</b>' : '')
         : 'An inventory the tenant has never seen carries very little weight at adjudication. Send it, give them ' +
           REVIEW_DAYS + ' days, take a signature.') +
      '</div></div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap">' +
      (r ? '<button class="btn sm" onclick="NexLetInventory.status(\'' + escJs(r.id) + '\')">Review status' +
           (fl ? ' \u00b7 ' + fl : '') + '</button>' : '') +
      '<button class="btn sm' + (r ? '' : ' navy') + '" onclick="NexLetInventory.open(\'' + escJs(v.id) + '\',\'' +
      escJs(rep.id) + '\')">' + (r ? 'Send again' : 'Send for review') + '</button>' +
      '</div></div>';
  }

  window.NexLetInventory = { open, send, status, accept, chase, certificate, certificateHtml,
    panel, forReport, forInventory, state, deemed, reviews };
})();
