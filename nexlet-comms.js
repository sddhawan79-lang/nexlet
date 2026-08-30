/* ============================================================================
   nexlet-comms.js — one communications record, and somewhere for replies to go.

   Two problems this solves:

   1. REPLIES VANISHED. Every outbound email went out as
      documents@nexlet.co.uk with no reply-to, so anything a tenant or landlord
      sent back landed in a mailbox nobody reads. Reply-to is now a setting,
      pointed at whatever mailbox you actually read today.

   2. THE TRAIL WAS HAND-WRITTEN. 30 notes across 25 send sites, all on the
      LANDLORD record, so an email to a tenant left a trace only if that
      particular code path happened to write one. Logging now happens inside
      agencyEmail itself, so every email is recorded whether or not anyone
      remembered — and attribution is worked out from the recipient address,
      which means no call site had to change.

   Division of labour, deliberately: NexLet sends documents (agreements,
   notices, prescribed information, statements). Your mail client handles
   conversation. Reply-to and the archive BCC are what join the two, so Gmail
   search and the NexLet record cover the same ground.
   ========================================================================== */
(function () {
  'use strict';

  /* agent.html's `S` is a top-level lexical binding, not a window property, so
     window.S is always undefined. Read it bare. */
  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };


  const LS = 'nexlet_comms_local_v1';
  const MAX = 600;
  let rows = [], loaded = false;
  let filters = { q: '', dir: '', channel: '' };

  const esc2 = s => (window.esc ? window.esc(s) : String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  const escJs = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
  const nowISO = () => new Date().toISOString();
  const fmtDT = iso => { const d = new Date(iso); return isNaN(d) ? '—' :
    d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

  const CHANNELS = {
    email:    { label: 'Email',        icon: '✉' },
    phone:    { label: 'Phone call',   icon: '☎' },
    letter:   { label: 'Letter',       icon: '✉' },
    inperson: { label: 'In person',    icon: '⌂' },
    sms:      { label: 'Text message', icon: '▭' }
  };

  /* ── who is this address? ────────────────────────────────────────────────
     Attribution from the recipient address, so the 25 existing send sites did
     not have to be touched. Checks tenants (including occupants and
     guarantors), landlords, applicants and contractors. */
  function whois(addr) {
    const e = String(addr || '').trim().toLowerCase();
    if (!e) return null;
    const S = ST();
    const hit = (entity, id, label, who) => ({ entity, id, label, who });

    for (const t of (S.tenants || [])) {
      const p = (window.P && window.P(t.propertyId)) || {};
      const at = p.address ? ' — ' + p.address : '';
      if ((t.email || '').toLowerCase() === e) return hit('tenancy', t.id, (t.name || 'Tenant') + at, 'Tenant');
      for (const o of (t.occupants || [])) {
        if ((o.email || '').toLowerCase() === e) return hit('tenancy', t.id, (o.name || 'Occupant') + at, 'Tenant');
        if (o.guarantor && (o.guarantor.email || '').toLowerCase() === e)
          return hit('tenancy', t.id, (o.guarantor.name || 'Guarantor') + at, 'Guarantor');
      }
      if (t.guarantor && (t.guarantor.email || '').toLowerCase() === e)
        return hit('tenancy', t.id, (t.guarantor.name || 'Guarantor') + at, 'Guarantor');
    }
    for (const l of (S.landlords || [])) {
      const nm = window.landlordName ? window.landlordName(l) : (l.name || 'Landlord');
      if ((l.email || '').toLowerCase() === e) return hit('landlord', l.id, nm, 'Landlord');
      if ((l.jointEmail || '').toLowerCase() === e) return hit('landlord', l.id, nm, 'Landlord (joint)');
    }
    for (const a of (S.applicants || []))
      if ((a.email || '').toLowerCase() === e) return hit('applicant', a.id, a.name || 'Applicant', 'Applicant');
    for (const c of (S.contractors || []))
      if ((c.email || '').toLowerCase() === e) return hit('contractor', c.id, c.name || 'Contractor', 'Contractor');
    return null;
  }

  /* ── storage ─────────────────────────────────────────────────────────── */
  async function ensure() {
    if (loaded) return;
    loaded = true;
    if (window.LIVE && window.sb && window._agencyId) {
      try {
        const { data } = await window.sb.from('agency_comms').select('*')
          .eq('agency_id', window._agencyId).order('at', { ascending: false }).limit(MAX);
        rows = data || [];
      } catch (e) { console.warn('comms load', e); rows = []; }
    } else {
      try { rows = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { rows = []; }
    }
  }
  function stash(r) {
    rows.unshift(r);
    if (rows.length > MAX) rows.length = MAX;
    if (window.LIVE && window.sb) {
      window.sb.from('agency_comms').insert(r).then(x => { if (x && x.error) console.warn('comms insert', x.error); });
    } else {
      try { localStorage.setItem(LS, JSON.stringify(rows)); } catch (e) { }
    }
  }

  /* ── log ─────────────────────────────────────────────────────────────── */
  async function log(o) {
    await ensure();
    const w = o.entity ? null : whois(o.direction === 'in' ? o.from : o.to);
    const r = {
      id: (crypto.randomUUID ? crypto.randomUUID() : 'c' + Date.now() + Math.random().toString(36).slice(2)),
      agency_id: window._agencyId || null,
      at: o.at || nowISO(),
      direction: o.direction || 'out',
      channel: o.channel || 'email',
      party: o.direction === 'in' ? (o.from || '') : (o.to || ''),
      party_role: o.role || (w && w.who) || '',
      subject: o.subject || '',
      body: (o.body || '').slice(0, 4000),
      entity: o.entity || (w && w.entity) || null,
      entity_id: o.entityId || (w && w.id) || null,
      entity_label: o.entityLabel || (w && w.label) || '',
      delivery: o.delivery || 'sent',
      error: o.error || ''
    };
    stash(r);
    return r;
  }

  /* Letter HTML → readable plain text: block boundaries become real paragraph
     breaks, table rows keep label and value on one line, and the entities a
     letter actually uses are decoded rather than shown raw. */
  function toReadable(html) {
    let t = String(html || '');
    t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
    t = t.replace(/<\/t[dh]>\s*/gi, '  ').replace(/<\/tr>/gi, '\n');
    t = t.replace(/<br\s*\/?>/gi, '\n');
    t = t.replace(/<\/(p|div|li|h[1-6]|tr|table|blockquote)>/gi, '\n\n');
    t = t.replace(/<li[^>]*>/gi, '\u2022 ');
    t = t.replace(/<hr[^>]*>/gi, '\n\u2014\u2014\u2014\n');
    t = t.replace(/<[^>]+>/g, '');
    const ENT = { nbsp: ' ', pound: '\u00a3', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
      minus: '\u2212', ndash: '\u2013', mdash: '\u2014', rsquo: '\u2019', lsquo: '\u2018',
      ldquo: '\u201c', rdquo: '\u201d', hellip: '\u2026', deg: '\u00b0' };
    t = t.replace(/&([a-z]+);/gi, (m, e) => ENT[e.toLowerCase()] !== undefined ? ENT[e.toLowerCase()] : m);
    t = t.replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d));
    t = t.replace(/&#x([0-9a-f]+);/gi, (m, x) => String.fromCharCode(parseInt(x, 16)));
    t = t.replace(/[ \t]*\n[ \t]*/g, '\n').replace(/[ ]{3,}/g, '  ');
    t = t.replace(/\n{3,}/g, '\n\n');
    return t.trim();
  }

  /* A stored copy exists when a letter with that subject was filed. Matched on
     the persisted subject, which fileLetter writes with recipients appended. */
  function _sentCopy(r) {
    if (!r || r.direction === 'in') return null;
    const subj = String(r.subject || '').trim();
    if (!subj) return null;
    return (ST().letters || []).find(x => x.body_html && String(x.subject || '').indexOf(subj) === 0) || null;
  }
  function openSent(subject) {
    const row = (ST().letters || []).find(x => x.body_html && String(x.subject || '').indexOf(String(subject || '').trim()) === 0);
    if (!row) { window.toast('No stored copy on file \u2014 letters sent before this was added were not retained', 1); return; }
    const w = window.open('', '_blank');
    if (!w) { window.toast('Allow pop-ups to open it', 1); return; }
    w.document.write(row.body_html); w.document.close();
  }

  /* Called from inside agencyEmail — one entry per recipient, per send. */
  function noteEmail(to, subject, html, result) {
    const list = Array.isArray(to) ? to : String(to || '').split(/[;,]/);
    // Strip the [Brand] prefix agencyEmail adds, so the log reads like the subject.
    const subj = String(subject || '').replace(/^\[[^\]]+\]\s*/, '');
    const text = toReadable(html);
    list.map(s => s.trim()).filter(Boolean).forEach(addr => {
      log({ direction: 'out', channel: 'email', to: addr, subject: subj, body: text,
        delivery: (result && result.ok) ? 'sent' : 'failed',
        error: (result && result.error) || '' });
    });
  }

  /* ── record something that happened outside NexLet ───────────────────── */
  let D = {};
  function openLog(preset) {
    D = Object.assign({ direction: 'in', channel: 'email', party: '', subject: '', body: '', entity: '', entityId: '' }, preset || {});
    renderLog();
  }
  function renderLog() {
    const S = ST();
    const opts = [];
    (S.tenants || []).forEach(t => { const p = (window.P && window.P(t.propertyId)) || {};
      opts.push({ v: 'tenancy:' + t.id, l: (t.name || 'Tenant') + (p.address ? ' — ' + p.address : '') }); });
    (S.landlords || []).forEach(l => opts.push({ v: 'landlord:' + l.id,
      l: (window.landlordName ? window.landlordName(l) : l.name) + ' (landlord)' }));
    (S.applicants || []).forEach(a => opts.push({ v: 'applicant:' + a.id, l: (a.name || 'Applicant') + ' (applicant)' }));
    const key = D.entity ? D.entity + ':' + D.entityId : '';

    const body = `
      <div class="grid2" style="gap:10px">
        <div class="fg"><label>Direction</label><select onchange="NexLetComms._s('direction',this.value)">
          <option value="in" ${D.direction === 'in' ? 'selected' : ''}>Received \u2014 they contacted us</option>
          <option value="out" ${D.direction === 'out' ? 'selected' : ''}>Sent \u2014 we contacted them</option></select></div>
        <div class="fg"><label>How</label><select onchange="NexLetComms._s('channel',this.value)">
          ${Object.entries(CHANNELS).map(([k, v]) => `<option value="${k}" ${D.channel === k ? 'selected' : ''}>${esc2(v.label)}</option>`).join('')}
        </select></div>
      </div>
      <div class="fg"><label>Who</label><input value="${esc2(D.party)}" oninput="NexLetComms._s('party',this.value)" placeholder="Name, email address or phone number"></div>
      <div class="fg"><label>Relates to <span class="faint">(optional \u2014 files it against the record)</span></label>
        <select onchange="NexLetComms._sEnt(this.value)"><option value="">\u2014 not linked \u2014</option>
          ${opts.map(o => `<option value="${esc2(o.v)}" ${key === o.v ? 'selected' : ''}>${esc2(o.l)}</option>`).join('')}
        </select></div>
      <div class="fg"><label>Subject or summary</label><input value="${esc2(D.subject)}" oninput="NexLetComms._s('subject',this.value)" placeholder="e.g. Reported a leak under the kitchen sink"></div>
      <div class="fg"><label>What was said</label><textarea rows="5" oninput="NexLetComms._s('body',this.value)" placeholder="Paste the email, or write down what was agreed. Detail here is what makes the record worth having in a dispute.">${esc2(D.body)}</textarea></div>
      <p class="hint">Anything that could matter later \u2014 a repair reported, an arrears conversation, permission given \u2014 is worth thirty seconds here. Under the Renters\u2019 Rights Act the communication trail is often the evidence.</p>`;

    window.modal('Log correspondence', body,
      `<button class="btn" onclick="closeModal()">Cancel</button>
       <button class="btn navy" onclick="NexLetComms._save()">Add to the record</button>`, true);
  }

  /* ── views ───────────────────────────────────────────────────────────── */
  function filtered() {
    const q = filters.q.toLowerCase();
    return rows.filter(r => {
      if (filters.dir && r.direction !== filters.dir) return false;
      if (filters.channel && r.channel !== filters.channel) return false;
      if (!q) return true;
      return [r.party, r.subject, r.body, r.entity_label, r.party_role].join(' ').toLowerCase().indexOf(q) > -1;
    });
  }

  function entry(r) {
    const inbound = r.direction === 'in';
    const ch = CHANNELS[r.channel] || CHANNELS.email;
    return `<div class="row" style="align-items:flex-start;cursor:pointer" onclick="NexLetComms.show('${escJs(r.id)}')">
      <div style="width:128px;flex-shrink:0;font-size:11.5px;color:var(--faint)">${fmtDT(r.at)}</div>
      <span class="pill" style="flex-shrink:0;background:${inbound ? 'var(--blue-bg)' : 'var(--off)'};color:${inbound ? 'var(--blue)' : '#8A7D6E'};width:74px;text-align:center">${inbound ? '\u2190 In' : 'Out \u2192'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--navy);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc2(ch.icon)} ${esc2(r.subject || '(no subject)')}</div>
        <div class="faint" style="font-size:11.5px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc2(r.party || '')}${r.party_role ? ' \u00b7 ' + esc2(r.party_role) : ''}${r.entity_label ? ' \u00b7 ' + esc2(r.entity_label) : ''}</div>
      </div>
      ${r.delivery === 'failed' ? `<span class="pill" style="flex-shrink:0;background:var(--red-bg);color:var(--red)">Failed</span>` : ''}
    </div>`;
  }

  function view() {
    ensure().then(() => { if (!rows.__p) { rows.__p = 1; if (window.render) window.render(); } });
    const list = filtered();
    const failed = rows.filter(r => r.delivery === 'failed').length;
    const inbound = rows.filter(r => r.direction === 'in').length;
    const replyTo = (ST().agency && ST().agency.replyTo) || '';

    return `<h1 class="pg">Communications</h1>
      <div class="sub">Every email NexLet sends, logged automatically, plus anything you record by hand. NexLet sends the documents; your mail client handles the conversation \u2014 the reply-to address below is what keeps the two joined up.</div>

      ${!replyTo ? `<div class="note warn" style="margin-bottom:16px"><b>No reply-to address set.</b>
        Outbound email is sent from <code>documents@nexlet.co.uk</code>, so replies go to a mailbox nobody reads.
        Set a reply-to in <a href="#" onclick="event.preventDefault();go('settings')">Agency Settings</a> \u2014 any mailbox
        you actually read will do for now, and you can change it when your business email is sorted.</div>` : ''}

      <div class="grid4" style="margin-bottom:18px">
        <div class="kpi"><div class="l">Logged</div><div class="v">${rows.length}</div></div>
        <div class="kpi"><div class="l">Received</div><div class="v">${inbound}</div><div class="s">recorded by hand</div></div>
        <div class="kpi"><div class="l">Failed to send</div><div class="v" style="color:${failed ? 'var(--red)' : 'var(--green)'}">${failed}</div></div>
        <div class="kpi"><div class="l">Replies go to</div><div class="v" style="font-size:12.5px;padding-top:9px;word-break:break-all">${replyTo ? esc2(replyTo) : '<span style="color:var(--red)">not set</span>'}</div></div>
      </div>

      <div class="panel"><div class="panel-hd">
        <h2 style="font-size:13px">Log</h2>
        <button class="btn sm navy" onclick="NexLetComms.add()">\uff0b Log correspondence</button></div>
        <div style="padding:12px 20px;border-bottom:1px solid #EEF1F5;display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
          <div class="fg" style="margin:0;flex:1;min-width:180px"><label style="font-size:11px">Search</label>
            <input value="${esc2(filters.q)}" oninput="NexLetComms._f('q',this.value)" placeholder="Name, subject, anything said\u2026"></div>
          <div class="fg" style="margin:0;width:150px"><label style="font-size:11px">Direction</label>
            <select onchange="NexLetComms._f('dir',this.value)"><option value="">All</option>
              <option value="in" ${filters.dir === 'in' ? 'selected' : ''}>Received</option>
              <option value="out" ${filters.dir === 'out' ? 'selected' : ''}>Sent</option></select></div>
          <div class="fg" style="margin:0;width:150px"><label style="font-size:11px">Channel</label>
            <select onchange="NexLetComms._f('channel',this.value)"><option value="">All</option>
              ${Object.entries(CHANNELS).map(([k, v]) => `<option value="${k}" ${filters.channel === k ? 'selected' : ''}>${esc2(v.label)}</option>`).join('')}</select></div>
        </div>
        <div>${list.length ? list.map(entry).join('')
          : `<div class="empty">${rows.length ? 'Nothing matches those filters.' : 'Nothing logged yet. Emails are recorded from now on.'}</div>`}</div>
      </div>`;
  }

  /* Embeddable strip for a tenancy / landlord / applicant page. */
  function strip(entity, id, limit) {
    const list = rows.filter(r => r.entity === entity && String(r.entity_id) === String(id)).slice(0, limit || 6);
    return `<div class="panel"><div class="panel-hd"><h2 style="font-size:13px">Correspondence</h2>
      <div style="display:flex;gap:7px">
        <button class="btn sm" onclick="NexLetComms.add({entity:'${escJs(entity)}',entityId:'${escJs(id)}'})">\uff0b Log</button>
        ${list.length ? `<button class="btn sm ghost" onclick="go('comms')">See all \u2192</button>` : ''}</div></div>
      <div>${list.length ? list.map(entry).join('') : '<div class="empty">Nothing logged against this record yet.</div>'}</div></div>`;
  }

  function show(id) {
    const r = rows.find(x => x.id === id);
    if (!r) return;
    const ch = CHANNELS[r.channel] || CHANNELS.email;
    window.modal(r.subject || 'Correspondence', `
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:14px">
        <tr><td style="padding:5px 12px 5px 0;color:var(--faint);width:120px">When</td><td>${fmtDT(r.at)}</td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:var(--faint)">Direction</td><td>${r.direction === 'in' ? 'Received' : 'Sent'} \u00b7 ${esc2(ch.label)}</td></tr>
        <tr><td style="padding:5px 12px 5px 0;color:var(--faint)">Party</td><td>${esc2(r.party || '\u2014')}${r.party_role ? ' <span class="faint">(' + esc2(r.party_role) + ')</span>' : ''}</td></tr>
        ${r.entity_label ? `<tr><td style="padding:5px 12px 5px 0;color:var(--faint)">Relates to</td><td>${esc2(r.entity_label)}</td></tr>` : ''}
        <tr><td style="padding:5px 12px 5px 0;color:var(--faint)">Delivery</td><td>${r.delivery === 'failed' ? '<span style="color:var(--red)">Failed \u2014 ' + esc2(r.error || 'unknown') + '</span>' : 'Sent'}</td></tr>
      </table>
      <div style="border:1px solid var(--border);border-radius:8px;padding:16px 18px;background:#fff;font-size:13px;line-height:1.75;max-height:360px;overflow-y:auto;white-space:pre-line;color:var(--navy)">${esc2(r.body || '(no content recorded)')}</div>
      ${_sentCopy(r) ? '<p class="hint" style="margin:9px 0 0">Plain-text transcript. <a href="#" onclick="event.preventDefault();NexLetComms.openSent(\'' + escJs(r.subject || '') + '\')">Open the letter exactly as it was sent →</a></p>' : ''}`,
      `<button class="btn" onclick="closeModal()">Close</button>`, true);
  }

  window.NexLetComms = {
    view, strip, log, noteEmail, whois, show, openSent, toReadable,
    /* Read-only, for the service history: failed deliveries belong on the
       tenancy's record, not only in the communications list. */
    rows: () => rows.slice(),
    add: openLog,
    _f(k, v) { filters[k] = v; if (window.render) window.render(); },
    _s(k, v) { D[k] = v; },
    _sEnt(v) { const [e, i] = (v || '').split(':'); D.entity = e || ''; D.entityId = i || ''; },
    async _save() {
      if (!D.subject && !D.body) { window.toast('Add a subject or a summary first', 1); return; }
      const r = await log({ direction: D.direction, channel: D.channel,
        to: D.direction === 'out' ? D.party : '', from: D.direction === 'in' ? D.party : '',
        subject: D.subject, body: D.body, entity: D.entity || null, entityId: D.entityId || null,
        delivery: 'logged' });
      if (window.NexLetAudit) window.NexLetAudit.log({ action: 'email.sent', entity: r.entity, entityId: r.entity_id,
        entityLabel: r.entity_label, detail: { channel: r.channel, direction: r.direction, subject: r.subject, party: r.party } });
      window.closeModal(); window.render();
      window.toast('\u2713 Added to the communications record');
    }
  };
})();
