/* nexlet-complaints.js — the in-house complaints procedure, and the register.
 *
 * WHY
 *
 * Both approved redress schemes require a member to operate a documented
 * in-house complaints procedure, and to exhaust it before a complaint reaches
 * the scheme. An agency without one is in breach from the day it joins, which is
 * why this has to exist before the membership application rather than after it.
 *
 * The procedure is not the hard part. The clock is. The whole process must take
 * no longer than EIGHT WEEKS from the date a complaint is received in writing,
 * and if it runs over, the scheme will accept the complaint without the agency's
 * final view — the agent loses the chance to answer before an adjudicator reads
 * it. So the register here is built around the deadline rather than the status:
 * every complaint shows the working days left, and the eight-week date is fixed
 * at the moment the complaint arrives and never recalculated.
 *
 * The final viewpoint letter is the other thing agents get wrong. It ends the
 * in-house procedure, and it must signpost the complainant to the scheme, give
 * the scheme's contact details, and state that they have twelve months from that
 * letter to refer. A final response that omits the signpost does not close the
 * procedure.
 *
 * One honest note carried into the document: for a one-person agency the second
 * review cannot be done by someone else. The schemes accept that, provided it is
 * said rather than implied.
 */
(function () {
  'use strict';

  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };
  const A = () => ST().agency || {};
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escJs = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const dt = d => { try { return d && window.fmtDate ? window.fmtDate(d) : ''; } catch (e) { return ''; } };
  const iso = d => new Date(d).toISOString().slice(0, 10);

  /* Working days, because every timescale in both schemes' codes is expressed in
     them. Bank holidays are not handled: getting them right needs a calendar
     that has to be maintained, and being a day pessimistic is the safe error. */
  function addWorkingDays(from, n) {
    const d = new Date(from); let left = n;
    while (left > 0) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) left--; }
    return iso(d);
  }
  function workingDaysBetween(a, b) {
    let d = new Date(a), end = new Date(b), n = 0;
    while (d < end) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) n++; }
    return n;
  }
  const ACK_DAYS = 3, RESP_DAYS = 15, REVIEW_DAYS = 15, FINAL_WEEKS = 8;

  const STAGES = [
    ['received', 'Received', 'Acknowledge in writing'],
    ['acknowledged', 'Acknowledged', 'Investigate and respond'],
    ['responded', 'Responded', 'Awaiting their reply'],
    ['escalated', 'Escalated for review', 'Second review, then final viewpoint'],
    ['final', 'Final viewpoint issued', 'In-house procedure complete'],
    ['closed', 'Closed', '']
  ];
  const stageLabel = k => (STAGES.find(s => s[0] === k) || [])[1] || k;

  const list = () => (A().complaints || []).slice().sort((a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0));

  /* Fixed at the moment the complaint arrives. Recalculating it from the current
     stage would let the deadline drift every time someone touched the record —
     which is precisely the failure the eight-week rule exists to catch. */
  function deadline(c) { const d = new Date(c.receivedAt); d.setDate(d.getDate() + FINAL_WEEKS * 7); return iso(d); }

  function due(c) {
    if (c.stage === 'final' || c.stage === 'closed') return null;
    const end = deadline(c), today = iso(new Date());
    const days = Math.round((new Date(end) - new Date(today)) / 86400000);
    const next = c.stage === 'received' ? { what: 'Acknowledge', by: addWorkingDays(c.receivedAt, ACK_DAYS) }
      : c.stage === 'acknowledged' ? { what: 'Respond', by: addWorkingDays(c.acknowledgedAt || c.receivedAt, RESP_DAYS) }
      : c.stage === 'escalated' ? { what: 'Final viewpoint', by: addWorkingDays(c.escalatedAt || c.receivedAt, REVIEW_DAYS) }
      : null;
    return { end, days, overdue: days < 0, next,
      nextLate: !!(next && new Date(next.by) < new Date(today)) };
  }

  /* ── The published procedure ───────────────────────────────────────────── */
  function docHtml() {
    const a = A(), b = (window.agencyBrand ? window.agencyBrand() : a) || {};
    const scheme = a.redress || '';
    const email = a.replyTo || '';
    const H = t => '<h2 style="font-size:14px;color:#1B2F4A;margin:22px 0 7px;padding-bottom:5px;' +
      'border-bottom:1px solid #E8DFCF">' + t + '</h2>';
    const gap = '<span style="color:#B3261E">[not set in Settings]</span>';
    const stage = (n, title, body) => '<div style="display:flex;gap:12px;margin-bottom:14px">' +
      '<div style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:#1B2F4A;color:#fff;' +
      'font-size:12.5px;font-weight:700;text-align:center;line-height:26px">' + n + '</div>' +
      '<div style="flex:1"><div style="font-weight:700;color:#1B2F4A;margin-bottom:2px">' + title + '</div>' +
      '<div style="font-size:12.5px">' + body + '</div></div></div>';
    return '<div data-doc-label="Complaints procedure" style="font-family:Georgia,\'Times New Roman\',serif;' +
      'max-width:780px;margin:0 auto;color:#2C2418;line-height:1.62">' +
      '<div style="border-bottom:2px solid #1B2F4A;padding-bottom:12px;margin-bottom:10px">' +
      '<div style="font-size:21px;font-weight:700;color:#1B2F4A">' + (esc(b.name) || gap) + '</div>' +
      (b.tagline ? '<div style="font-style:italic;color:#8A7D6E;font-size:12.5px">' + esc(b.tagline) + '</div>' : '') +
      '</div>' +
      '<h1 style="font-size:19px;color:#1B2F4A;margin:16px 0 3px">Complaints procedure</h1>' +
      '<p style="color:#8A7D6E;font-size:12.5px;margin:0 0 14px">How to complain, what we will do, and what to ' +
      'do if you are still not satisfied</p>' +

      '<p style="margin:0 0 10px">We aim to give every landlord, tenant and applicant a professional service. ' +
      'When something goes wrong we would rather hear about it, because it is the only way we can put it right ' +
      'and the only way we improve. Nothing in this procedure costs you anything.</p>' +

      H('How to complain') +
      '<p style="margin:0 0 8px">Put your complaint in writing, by letter or email, and send it to:</p>' +
      '<div style="background:#FAF6EE;border:1px solid #E8DFCF;border-radius:8px;padding:12px 14px;margin-bottom:6px">' +
      '<div style="font-size:12.5px;line-height:1.7">' +
      '<b>' + (esc(b.name) || gap) + '</b><br>' +
      (a.address ? esc(a.address) + '<br>' : gap + '<br>') +
      (email ? esc(email) : gap) + '</div></div>' +
      '<p style="font-size:12px;color:#8A7D6E;margin:0">Please set out what went wrong and what you would like us ' +
      'to do about it. If we have spoken on the telephone, please follow it up in writing so the dates are clear ' +
      'for both of us \u2014 the timescales below run from the day we receive your complaint in writing.</p>' +

      H('What happens next') +
      stage(1, 'We acknowledge it \u2014 within ' + ACK_DAYS + ' working days',
        'We write to confirm we have received your complaint, tell you who is dealing with it, and enclose a copy ' +
        'of this procedure.') +
      stage(2, 'We investigate and respond \u2014 within ' + RESP_DAYS + ' working days',
        'We review the file and speak to whoever dealt with you, then write to you with our findings and what, if ' +
        'anything, we propose to do. If we need longer, we will tell you why and give you a new date.') +
      stage(3, 'You can ask for a review \u2014 within ' + REVIEW_DAYS + ' working days of asking',
        'If our response does not resolve matters, write and tell us why and we will look at it again. ' +
        '<b>We are a small business,</b> so it may not be possible for the review to be carried out by a different ' +
        'person; where it is, it will be. We then write to you with our <b>final viewpoint</b>, which completes ' +
        'this procedure.') +
      '<p style="margin:0 0 10px;padding:10px 12px;background:#FAF6EE;border-left:3px solid #1B2F4A;font-size:12.5px">' +
      'The whole process takes no longer than <b>eight weeks</b> from the day we receive your written complaint.</p>' +

      H('If you are still not satisfied') +
      '<p style="margin:0 0 9px">Once we have given you our final viewpoint \u2014 or if eight weeks have passed ' +
      'since you first complained to us in writing \u2014 you can refer your complaint to our redress scheme, free ' +
      'of charge, for an independent review:</p>' +
      '<div style="background:#FAF6EE;border:1px solid #E8DFCF;border-radius:8px;padding:12px 14px;margin-bottom:9px">' +
      '<div style="font-size:12.5px;line-height:1.7">' + (scheme ? '<b>' + esc(scheme) + '</b>' : gap) +
      (a.redressNo ? '<br>Our membership number: ' + esc(a.redressNo) : '') +
      (/ombudsman/i.test(scheme)
        ? '<br>Milford House, 43\u201355 Milford Street, Salisbury, Wiltshire SP1 2BP<br>01722 333 306 \u00b7 admin@tpos.co.uk \u00b7 www.tpos.co.uk'
        : /redress/i.test(scheme)
          ? '<br>info@theprs.co.uk \u00b7 www.theprs.co.uk'
          : '') +
      '</div></div>' +
      '<p style="margin:0 0 9px">You must refer your complaint to them <b>within twelve months</b> of the date of ' +
      'our final viewpoint letter, and include the evidence you want them to consider. The scheme requires that you ' +
      'give us the chance to resolve the matter first, which is what this procedure is for.</p>' +

      '<p style="font-size:11px;color:#8A7D6E;margin:18px 0 0;padding-top:10px;border-top:1px solid #E8DFCF">' +
      'This procedure applies to complaints about our own service. Complaints about a landlord, or about matters ' +
      'we do not manage, fall outside it, although we will always tell you where else to go. ' +
      (a.companyNo ? 'Company number ' + esc(a.companyNo) + '. ' : '') +
      'Last updated ' + esc(dt(A().complaintsPublishedAt || new Date())) + '.</p></div>';
  }

  function missing() {
    const a = A(), out = [];
    if (!a.name) out.push('Agency name');
    if (!a.address) out.push('Postal address');
    if (!a.replyTo) out.push('Business email');
    if (!a.redress) out.push('Redress scheme');
    return out;
  }

  function preview() {
    const w = window.open('', '_blank');
    if (!w) { window.toast('Allow pop-ups to open the procedure', 1); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>Complaints procedure</title>' +
      '<body style="margin:0;padding:34px 38px;background:#fff">' + docHtml() + '</body>');
    w.document.close();
  }
  function print() {
    const w = window.open('', '_blank');
    if (!w) { window.toast('Allow pop-ups to print', 1); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><body style="margin:0;padding:34px 38px">' +
      docHtml() + '</body>');
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 400);
  }

  async function publish() {
    const gaps = missing();
    if (gaps.length) { window.toast('Set ' + gaps.join(', ') + ' in Settings first', 1); return; }
    const html = docHtml(), day = iso(new Date());
    let url = '';
    if (window._storageUpload) {
      try {
        const f = new File([html], 'complaints-procedure-' + day + '.html', { type: 'text/html' });
        url = await window._storageUpload(f, 'agency/complaints-procedure-' + Date.now() + '.html',
          'property-documents') || '';
      } catch (e) { console.error('complaints upload', e); }
    }
    if (!url) { window.toast('\u26a0 The copy did not upload \u2014 nothing filed. Check your connection.', 1); return; }
    const a = A();
    a.bizDocs = a.bizDocs || [];
    a.bizDocs.push({ id: (window.uid ? window.uid('bd') : 'bd' + Date.now()),
      label: 'Complaints procedure', name: 'complaints-procedure-' + day + '.html',
      url: url, expiry: '', addedAt: day, digest: String(html.length) });
    a.complaintsPublishedAt = day;
    if (window.save) window.save();
    if (window.pushAgency) window.pushAgency();
    if (window.NexLetAudit) window.NexLetAudit.log({ action: 'doc.published', entity: 'agency',
      entityId: window._agencyId || '', entityLabel: a.name || '',
      detail: { document: 'Complaints procedure', redress: a.redress || '' } });
    window.closeModal(); if (window.render) window.render();
    window.toast('\u2713 Complaints procedure filed \u2014 put this copy on the website');
  }

  const published = () => !!A().complaintsPublishedAt;

  /* ── The register ──────────────────────────────────────────────────────── */
  function open(id) {
    const c = id ? (A().complaints || []).find(x => x.id === id) : null;
    const isNew = !c;
    const d = c || { id: '', from: '', role: 'Tenant', about: '', receivedAt: iso(new Date()), stage: 'received' };
    const dd = c ? due(c) : null;
    window.modal(isNew ? 'Log a complaint' : 'Complaint \u2014 ' + esc(d.from),
      (dd ? '<div class="note ' + (dd.overdue ? 'warn' : '') + '" style="margin-bottom:12px">' +
        (dd.overdue ? '<b>Past the eight-week deadline.</b> ' + esc(d.from) + ' can now go to the scheme without ' +
          'our final view.' : '<b>' + dd.days + ' days left</b> of the eight weeks \u2014 final viewpoint due by ' +
          esc(dt(dd.end)) + '.') +
        (dd.next ? ' Next: ' + esc(dd.next.what.toLowerCase()) + ' by ' + esc(dt(dd.next.by)) +
          (dd.nextLate ? ' <b style="color:var(--red)">(late)</b>' : '') : '') + '</div>' : '') +
      '<div class="grid2" style="gap:10px">' +
      '<div class="fg"><label>Who is complaining</label><input id="cp-from" value="' + esc(d.from) + '" placeholder="Full name"></div>' +
      '<div class="fg"><label>They are our</label><select id="cp-role">' +
      ['Tenant', 'Landlord', 'Applicant', 'Other'].map(r => '<option' + (d.role === r ? ' selected' : '') + '>' + r + '</option>').join('') +
      '</select></div></div>' +
      '<div class="fg"><label>Received in writing on <span class="faint">(the eight weeks run from this date)</span></label>' +
      '<input id="cp-received" type="date" value="' + esc(d.receivedAt) + '"' + (isNew ? '' : ' disabled') + '></div>' +
      (isNew ? '' : '<div class="hint" style="margin:-8px 0 10px">Fixed once logged. The deadline cannot move.</div>') +
      '<div class="fg"><label>What they say went wrong</label><textarea id="cp-about" rows="3">' + esc(d.about || '') + '</textarea></div>' +
      (isNew ? '' :
        '<div class="fg"><label>Stage</label><select id="cp-stage">' +
        STAGES.map(s => '<option value="' + s[0] + '"' + (d.stage === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('') +
        '</select></div>' +
        '<div class="fg"><label>What we have done</label><textarea id="cp-notes" rows="3">' + esc(d.notes || '') + '</textarea></div>' +
        '<div class="fg"><label>Outcome, once decided</label><textarea id="cp-outcome" rows="2" placeholder="What we concluded and what we offered, if anything">' + esc(d.outcome || '') + '</textarea></div>'),
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      (isNew ? '' : '<button class="btn" onclick="NexLetComplaints.finalLetter(\'' + escJs(d.id) + '\')">Final viewpoint letter</button>') +
      '<button class="btn navy" onclick="NexLetComplaints.save(\'' + escJs(d.id) + '\')">Save</button>', true);
  }

  function save(id) {
    const a = A(); a.complaints = a.complaints || [];
    const v = k => { const e = document.getElementById(k); return e ? e.value.trim() : ''; };
    let c = id ? a.complaints.find(x => x.id === id) : null;
    if (!v('cp-from')) { window.toast('Who is complaining?', 1); return; }
    if (!c) {
      c = { id: (window.uid ? window.uid('cp') : 'cp' + Date.now()), receivedAt: v('cp-received') || iso(new Date()),
        stage: 'received', loggedAt: new Date().toISOString() };
      a.complaints.push(c);
    }
    c.from = v('cp-from'); c.role = v('cp-role') || c.role; c.about = v('cp-about');
    if (id) {
      const was = c.stage;
      c.stage = v('cp-stage') || c.stage; c.notes = v('cp-notes'); c.outcome = v('cp-outcome');
      const now = iso(new Date());
      if (was !== c.stage) {
        if (c.stage === 'acknowledged' && !c.acknowledgedAt) c.acknowledgedAt = now;
        if (c.stage === 'responded' && !c.respondedAt) c.respondedAt = now;
        if (c.stage === 'escalated' && !c.escalatedAt) c.escalatedAt = now;
        if (c.stage === 'final' && !c.finalAt) c.finalAt = now;
        if (c.stage === 'closed' && !c.closedAt) c.closedAt = now;
      }
    }
    if (window.save) window.save();
    if (window.pushAgency) window.pushAgency();
    if (window.NexLetAudit) window.NexLetAudit.log({ action: id ? 'complaint.updated' : 'complaint.logged',
      entity: 'agency', entityId: window._agencyId || '', entityLabel: a.name || '',
      detail: { from: c.from, stage: c.stage, receivedAt: c.receivedAt } });
    window.closeModal(); if (window.render) window.render();
    window.toast(id ? '\u2713 Complaint updated' : '\u2713 Complaint logged \u2014 acknowledge within ' + ACK_DAYS + ' working days');
  }

  /* The letter that ends the in-house procedure. It only does that if it
     signposts the scheme, gives its details and states the twelve months — so
     those are written in rather than left to whoever drafts it. */
  function finalLetter(id) {
    const c = (A().complaints || []).find(x => x.id === id); if (!c) return;
    const a = A(), b = (window.agencyBrand ? window.agencyBrand() : a) || {};
    const scheme = a.redress || '[redress scheme not set]';
    const contact = /ombudsman/i.test(scheme)
      ? 'The Property Ombudsman, Milford House, 43\u201355 Milford Street, Salisbury, Wiltshire SP1 2BP<br>01722 333 306 \u00b7 admin@tpos.co.uk \u00b7 www.tpos.co.uk'
      : /redress/i.test(scheme) ? 'Property Redress Scheme \u00b7 info@theprs.co.uk \u00b7 www.theprs.co.uk' : esc(scheme);
    const html = '<div data-doc-label="Final viewpoint letter" style="font-family:Georgia,serif;max-width:760px;' +
      'margin:0 auto;color:#2C2418;line-height:1.65">' +
      '<div style="border-bottom:2px solid #1B2F4A;padding-bottom:10px;margin-bottom:16px">' +
      '<div style="font-size:20px;font-weight:700;color:#1B2F4A">' + esc(b.name || '') + '</div>' +
      (a.address ? '<div style="font-size:11.5px;color:#8A7D6E">' + esc(a.address) + '</div>' : '') + '</div>' +
      '<p style="margin:0 0 14px;font-size:12px;color:#8A7D6E">' + esc(dt(new Date())) + '</p>' +
      '<p style="margin:0 0 12px">Dear ' + esc(c.from) + ',</p>' +
      '<p style="margin:0 0 12px"><b>Final viewpoint \u2014 your complaint of ' + esc(dt(c.receivedAt)) + '</b></p>' +
      '<p style="margin:0 0 12px">Thank you for giving us the opportunity to look at this again. This letter sets ' +
      'out our final view and completes our in-house complaints procedure.</p>' +
      '<p style="margin:0 0 6px"><b>What you told us</b></p>' +
      '<p style="margin:0 0 12px">' + esc(c.about || '') + '</p>' +
      '<p style="margin:0 0 6px"><b>What we found</b></p>' +
      '<p style="margin:0 0 12px">' + esc(c.notes || '[what the investigation found]') + '</p>' +
      '<p style="margin:0 0 6px"><b>Our conclusion</b></p>' +
      '<p style="margin:0 0 12px">' + esc(c.outcome || '[the conclusion, and anything offered]') + '</p>' +
      '<p style="margin:0 0 12px">If you remain dissatisfied, you may refer your complaint to ' + esc(scheme) +
      ' for an independent review at no cost to you:</p>' +
      '<div style="background:#FAF6EE;border:1px solid #E8DFCF;border-radius:8px;padding:12px 14px;margin-bottom:12px;' +
      'font-size:12.5px;line-height:1.7">' + contact +
      (a.redressNo ? '<br>Our membership number: ' + esc(a.redressNo) : '') + '</div>' +
      '<p style="margin:0 0 12px">You must refer the matter to them <b>within twelve months of the date of this ' +
      'letter</b>, enclosing any evidence you wish them to consider.</p>' +
      '<p style="margin:0 0 4px">Yours sincerely,</p>' +
      '<p style="margin:0">' + esc(b.name || '') + '</p></div>';
    const w = window.open('', '_blank');
    if (!w) { window.toast('Allow pop-ups to open the letter', 1); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>Final viewpoint</title>' +
      '<body style="margin:0;padding:34px 38px;background:#fff">' + html + '</body>');
    w.document.close();
  }

  /* ── Panel for the Business page ───────────────────────────────────────── */
  function panel() {
    const gaps = missing(), cs = list();
    const live = cs.filter(c => c.stage !== 'closed');
    const late = live.filter(c => { const d = due(c); return d && (d.overdue || d.nextLate); });
    const row = c => { const d = due(c);
      return '<div class="row" style="cursor:pointer" onclick="NexLetComplaints.open(\'' + escJs(c.id) + '\')">' +
        '<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:600;color:var(--navy)">' +
        esc(c.from) + ' <span class="faint" style="font-weight:400">\u00b7 ' + esc(c.role || '') + '</span></div>' +
        '<div class="faint" style="font-size:11.5px;margin-top:2px">Received ' + esc(dt(c.receivedAt)) +
        (d ? ' \u00b7 ' + (d.overdue ? '<b style="color:var(--red)">past eight weeks</b>'
          : d.days + ' days left' + (d.next ? ' \u00b7 ' + esc(d.next.what.toLowerCase()) + ' by ' + esc(dt(d.next.by)) +
            (d.nextLate ? ' <b style="color:var(--red)">(late)</b>' : '') : '')) : '') + '</div></div>' +
        '<span class="pill" style="background:var(--off);color:#8A7D6E">' + esc(stageLabel(c.stage)) + '</span></div>'; };
    return '<div class="panel" style="margin-bottom:14px"><div class="panel-hd"><h2>Complaints</h2>' +
      '<span class="faint" style="font-size:12px">Required by your redress scheme</span></div><div class="panel-bd">' +
      (published()
        ? '<div class="kv"><span class="k">Published procedure</span><span class="v">Filed ' +
          esc(dt(A().complaintsPublishedAt)) + ' \u00b7 <a href="#" onclick="event.preventDefault();NexLetComplaints.preview()">read it</a></span></div>'
        : '<div class="note warn" style="margin-bottom:10px"><b>No complaints procedure published.</b> Both redress ' +
          'schemes require one, and an agency without it is in breach from the day it joins.' +
          (gaps.length ? ' Set ' + esc(gaps.join(', ')) + ' in Settings first.' : '') + '</div>') +
      (late.length ? '<div class="note warn" style="margin:10px 0"><b>' + late.length + ' complaint' +
        (late.length === 1 ? ' is' : 's are') + ' late.</b> Once eight weeks pass, the scheme will take the ' +
        'complaint without our final view.</div>' : '') +
      (cs.length ? '<div style="margin-top:8px">' + cs.map(row).join('') + '</div>'
        : '<div class="faint" style="font-size:12px;padding:8px 0">No complaints logged.</div>') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
      '<button class="btn sm navy" onclick="NexLetComplaints.open()">\uff0b Log a complaint</button>' +
      '<button class="btn sm" onclick="NexLetComplaints.preview()">' + (published() ? 'Preview' : 'Draft the procedure') + '</button>' +
      '<button class="btn sm" onclick="NexLetComplaints.print()">Print</button>' +
      '<button class="btn sm" onclick="NexLetComplaints.publish()">Publish \u2014 file the copy</button>' +
      '</div></div></div>';
  }

  window.NexLetComplaints = { panel, open, save, publish, preview, print, docHtml, finalLetter,
    list, due, deadline, missing, published, addWorkingDays, workingDaysBetween, STAGES };
})();
