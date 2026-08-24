/* ============================================================================
   nexlet-calendar.js — one calendar for everything NexLet knows about,
   plus the appointments and tasks you add by hand.
   Loaded by agent.html as a classic script; shares its globals.

   Two kinds of entry, deliberately different:
     • DERIVED (certificate expiries, deposit clocks, Awaab timers, tenancy
       dates, notices, invoices). Computed from records every render, never
       stored. They move when the record moves, so there is no stale copy.
     • MANUAL (appointments, tasks). Stored in agency_events. This is the only
       part that needs a table.

   This is meant to be THE calendar, not a feed into another one. Keeping one
   place beats keeping two places in sync.
   ========================================================================== */
(function () {
  'use strict';

  const DAY = 864e5;
  const LS_EV = 'nexlet_events_local_v1';
  let cursor = new Date(); cursor.setDate(1);
  let hidden = {};
  let mode = 'month';
  let manual = [];
  let evLoaded = false, evPainted = false;

  const TYPES = {
    deposit:  { label: 'Deposit deadline',  color: 'var(--red)',    bg: 'var(--red-bg)',    to: 'compliance' },
    awaab:    { label: "Awaab's Law",       color: 'var(--red)',    bg: 'var(--red-bg)',    to: 'maintenance' },
    cert:     { label: 'Certificate',       color: 'var(--amber)',  bg: 'var(--amber-bg)',  to: 'compliance' },
    rtr:      { label: 'Right to Rent',     color: 'var(--purple)', bg: 'var(--purple-bg)', to: 'compliance' },
    tenancy:  { label: 'Tenancy',           color: 'var(--navy)',   bg: 'var(--off)',       to: 'properties' },
    viewing:  { label: 'Viewing',           color: 'var(--blue)',   bg: 'var(--blue-bg)',   to: 'applicants' },
    notice:   { label: 'Notice',            color: 'var(--purple)', bg: 'var(--purple-bg)', to: 'notices' },
    invoice:  { label: 'Invoice due',       color: 'var(--green)',  bg: 'var(--green-bg)',  to: 'invoices' },
    business: { label: 'Business document', color: '#8A7D6E',       bg: 'var(--off)',       to: 'business' },
    appt:     { label: 'Appointment',       color: '#0E7490',       bg: '#E0F2F5',          manual: true },
    task:     { label: 'Task',              color: '#475569',       bg: '#EEF2F6',          manual: true }
  };

  /* ── helpers ─────────────────────────────────────────────────────────── */
  const esc2 = s => (window.esc ? window.esc(s) : String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  const escJs = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
  const iso = d => { const x = new Date(d); return isNaN(x) ? null : new Date(x.getTime() - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const todayIso = () => iso(new Date());
  const plusDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fmtD = d => window.fmtDate ? window.fmtDate(d) : String(d);
  const addr = pid => { try { const p = window.P && window.P(pid); return (p && p.address) || ''; } catch (e) { return ''; } };
  const uid2 = () => 'ev' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ── manual entries: load / save / delete ────────────────────────────── */
  async function ensureEvents() {
    if (evLoaded) return;
    evLoaded = true;
    if (window.LIVE && window.sb && window._agencyId) {
      try {
        const { data } = await window.sb.from('agency_events').select('*').eq('agency_id', window._agencyId);
        manual = (data || []).map(r => r.data);
      } catch (e) { console.warn('events load failed', e); manual = []; }
    } else {
      try { manual = JSON.parse(localStorage.getItem(LS_EV) || '[]'); } catch (e) { manual = []; }
    }
  }
  function persist(e) {
    if (window.LIVE && window.sb) {
      window.sb.from('agency_events').upsert({ id: e.id, agency_id: window._agencyId, data: e, updated_at: new Date().toISOString() })
        .then(r => { if (r && r.error) console.warn(r.error); });
    } else {
      try { localStorage.setItem(LS_EV, JSON.stringify(manual)); } catch (err) { }
    }
  }
  function forget(id) {
    if (window.LIVE && window.sb) window.sb.from('agency_events').delete().eq('id', id).then(() => { });
    else { try { localStorage.setItem(LS_EV, JSON.stringify(manual)); } catch (e) { } }
  }

  /* ── build the event list ────────────────────────────────────────────── */
  function events() {
    const S = window.S || {};
    const out = [];
    const push = (date, type, title, sub, extra) => {
      const d = iso(date); if (!d) return;
      out.push(Object.assign({ date: d, type, title, sub: sub || '' }, extra || {}));
    };

    // Certificate expiries read through the Compliance page's own item list, so
    // the calendar can never disagree with it.
    (S.properties || []).forEach(p => {
      try {
        (window._fullCertItems ? window._fullCertItems(p) : []).forEach(it => {
          if (it[3] === 'exp' && it[2]) push(it[2], 'cert', it[1] + ' expires', p.address);
        });
      } catch (e) { }
    });

    (S.tenants || []).forEach(rec => {
      if (!rec) return;
      const a = addr(rec.propertyId) || rec.name || '';
      if (rec.start) push(rec.start, 'tenancy', 'Tenancy starts', a);
      if (rec.end) push(rec.end, 'tenancy', 'Tenancy ends', a);
      if (rec.deposit && !rec.schemeRef && rec.start)
        push(plusDays(rec.start, 30), 'deposit', 'Deposit protection deadline', a);
      if (rec.rtrExpiry) push(rec.rtrExpiry, 'rtr', 'Right to Rent recheck — ' + (rec.name || 'tenant'), a);
      (rec.occupants || []).forEach(o => {
        if (o && o.rtrExpiry) push(o.rtrExpiry, 'rtr', 'Right to Rent recheck — ' + (o.name || 'occupant'), a);
      });
    });

    (S.jobs || []).forEach(j => {
      if (!j || j.status === 'completed') return;
      try {
        const aw = window.awaabDeadline && window.awaabDeadline(j);
        if (aw && aw.date) push(aw.date, 'awaab', aw.label + ' — ' + (j.category || 'hazard'), addr(j.propertyId));
      } catch (e) { }
    });

    (S.viewings || []).forEach(v => {
      if (!v || !v.when || v.status === 'cancelled') return;
      const t = new Date(v.when);
      const time = isNaN(t) ? '' : t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      push(v.when, 'viewing', (time ? time + ' ' : '') + 'Viewing', addr(v.propertyId) || v.applicantName || '');
    });

    (S.notices || []).forEach(n => {
      if (!n) return;
      const a = addr(n.propertyId);
      const kind = n.kind === 'section13' ? 'Section 13 rent increase' : 'Section 8 possession';
      if (n.served) push(n.served, 'notice', kind + ' served', a);
      if (n.effective) push(n.effective, 'notice', kind + ' takes effect', a);
      if (n.expires) push(n.expires, 'notice', kind + ' expires', a);
    });

    (S.invoices || []).forEach(i => {
      if (!i || i.status === 'paid' || !i.issued) return;
      const terms = ((S.agency || {}).paymentTerms) || 14;
      push(plusDays(i.issued, terms), 'invoice', 'Invoice ' + (i.no || '') + ' due', '');
    });

    (((S.agency || {}).bizDocs) || []).forEach(d => {
      if (d && d.expiry) push(d.expiry, 'business', (d.name || 'Business document') + ' expires', '');
    });

    // Manual entries last so they sort after derived ones on the same day.
    manual.forEach(e => push(e.date, e.kind === 'task' ? 'task' : 'appt',
      (e.time ? e.time + ' ' : '') + (e.title || 'Untitled'),
      [addr(e.propertyId), e.notes].filter(Boolean).join(' · '),
      { evId: e.id, done: !!e.done }));

    return out.filter(e => !hidden[e.type]).sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : (a.type === 'task' || a.type === 'appt' ? 1 : -1));
  }

  /* ── add / edit modal ────────────────────────────────────────────────── */
  function openEvent(id, presetDate) {
    const e = manual.find(x => x.id === id) || { date: presetDate || todayIso(), kind: 'appt', title: '', time: '', propertyId: '', notes: '' };
    const props = ((window.S || {}).properties) || [];
    const body = `
      <div class="grid2" style="gap:10px">
        <div class="fg"><label>Type</label><select id="ce-kind">
          <option value="appt" ${e.kind !== 'task' ? 'selected' : ''}>Appointment</option>
          <option value="task" ${e.kind === 'task' ? 'selected' : ''}>Task</option></select></div>
        <div class="fg"><label>Date</label><input id="ce-date" type="date" value="${esc2(e.date)}"></div>
      </div>
      <div class="fg"><label>What is it?</label>
        <input id="ce-title" type="text" value="${esc2(e.title)}" placeholder="e.g. Gas engineer at 14 Alma Road"></div>
      <div class="grid2" style="gap:10px">
        <div class="fg"><label>Time <span class="faint">(optional)</span></label>
          <input id="ce-time" type="time" value="${esc2(e.time || '')}"><div class="hint">Leave blank for an all-day item.</div></div>
        <div class="fg"><label>Property <span class="faint">(optional)</span></label><select id="ce-prop">
          <option value="">— none —</option>
          ${props.map(p => `<option value="${esc2(p.id)}" ${p.id === e.propertyId ? 'selected' : ''}>${esc2(p.address)}</option>`).join('')}
        </select></div>
      </div>
      <div class="fg"><label>Notes <span class="faint">(optional)</span></label><textarea id="ce-notes" rows="2">${esc2(e.notes || '')}</textarea></div>`;

    const foot = `${id ? `<button class="btn" style="margin-right:auto;color:var(--red)" onclick="NexLetCalendar.del('${escJs(id)}')">Delete</button>` : ''}
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn navy" onclick="NexLetCalendar.save('${escJs(id || '')}')">${id ? 'Save' : 'Add to calendar'}</button>`;
    window.modal(id ? 'Edit calendar entry' : 'Add to calendar', body, foot, true);
  }

  function saveEvt(id) {
    const v = i => (document.getElementById(i) || {}).value || '';
    const title = v('ce-title').trim();
    if (!title) { if (window.toast) window.toast('Give it a name first', 1); return; }
    let e = manual.find(x => x.id === id);
    if (!e) { e = { id: uid2(), done: false }; manual.push(e); }
    e.kind = v('ce-kind'); e.date = v('ce-date') || todayIso(); e.title = title;
    e.time = v('ce-time'); e.propertyId = v('ce-prop'); e.notes = v('ce-notes');
    persist(e);
    if (window.closeModal) window.closeModal();
    if (window.render) window.render();
    if (window.toast) window.toast('✓ Added to calendar');
  }

  function delEvt(id) {
    manual = manual.filter(x => x.id !== id);
    forget(id);
    if (window.closeModal) window.closeModal();
    if (window.render) window.render();
    if (window.toast) window.toast('Removed');
  }

  function toggleDone(id) {
    const e = manual.find(x => x.id === id); if (!e) return;
    e.done = !e.done; persist(e);
    if (window.render) window.render();
  }

  /* ── month grid ──────────────────────────────────────────────────────── */
  function monthGrid(evs) {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const start = plusDays(first, -((first.getDay() + 6) % 7));   // Monday-first
    const byDate = {};
    evs.forEach(e => { (byDate[e.date] = byDate[e.date] || []).push(e); });
    const t = todayIso();

    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = plusDays(start, i), key = iso(d);
      const inMonth = d.getMonth() === m;
      const list = byDate[key] || [];
      const shown = list.slice(0, 3);
      cells += `<div style="min-height:96px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);padding:6px 7px;background:${key === t ? 'var(--blue-bg)' : inMonth ? '#fff' : '#FAFBFC'}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:11px;font-weight:${key === t ? '700' : '600'};color:${key === t ? 'var(--blue)' : inMonth ? 'var(--navy)' : '#C3CBD6'}">${d.getDate()}</span>
          <span onclick="NexLetCalendar.add('${key}')" title="Add on this day"
            style="cursor:pointer;color:var(--faint);font-size:13px;line-height:1;padding:0 2px">＋</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px">
          ${shown.map(e => { const T = TYPES[e.type] || {};
            return `<div onclick="NexLetCalendar.click('${e.type}','${escJs(e.evId || '')}')" title="${esc2(e.title + (e.sub ? ' — ' + e.sub : ''))}"
              style="background:${T.bg};color:${T.color};border-radius:5px;padding:2px 5px;font-size:10px;font-weight:600;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${e.done ? 'opacity:.5;text-decoration:line-through' : ''}">${esc2(e.title)}</div>`;
          }).join('')}
          ${list.length > 3 ? `<div class="faint" style="font-size:10px">+${list.length - 3} more</div>` : ''}
        </div></div>`;
    }

    return `<div class="panel" style="overflow:hidden">
      <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));background:var(--off);border-bottom:1px solid var(--border)">
        ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d =>
          `<div style="padding:8px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--faint);text-align:center">${d}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid var(--border)">${cells}</div>
    </div>`;
  }

  /* ── agenda ──────────────────────────────────────────────────────────── */
  function rowFor(e) {
    const T = TYPES[e.type] || {};
    const isManual = !!T.manual;
    return `<div class="row">
      ${isManual ? `<span onclick="NexLetCalendar.done('${escJs(e.evId)}')" title="Mark done"
          style="cursor:pointer;width:19px;height:19px;border-radius:5px;border:1.5px solid ${e.done ? 'var(--green)' : 'var(--border)'};background:${e.done ? 'var(--green)' : '#fff'};color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${e.done ? '✓' : ''}</span>`
        : `<span style="width:19px;flex-shrink:0"></span>`}
      <span class="pill" style="background:${T.bg};color:${T.color};width:118px;text-align:center;flex-shrink:0">${esc2(T.label || e.type)}</span>
      <div style="flex:1;min-width:0;cursor:pointer" onclick="NexLetCalendar.click('${e.type}','${escJs(e.evId || '')}')">
        <div style="font-size:13px;font-weight:600;color:var(--navy);${e.done ? 'opacity:.5;text-decoration:line-through' : ''}">${esc2(e.title)}</div>
        ${e.sub ? `<div class="faint" style="font-size:11.5px;margin-top:2px">${esc2(e.sub)}</div>` : ''}
      </div></div>`;
  }

  function agenda(evs) {
    const t = todayIso(), horizon = iso(plusDays(new Date(), 90));
    const list = evs.filter(e => e.date >= t && e.date <= horizon);
    const overdue = evs.filter(e => e.date < t &&
      (['deposit', 'awaab', 'cert'].indexOf(e.type) >= 0 || ((TYPES[e.type] || {}).manual && !e.done)));
    const groups = {};
    list.forEach(e => { (groups[e.date] = groups[e.date] || []).push(e); });

    return `${overdue.length ? `<div class="panel"><div class="panel-hd"><h2 style="font-size:13px;color:var(--red)">Overdue (${overdue.length})</h2></div>
      <div>${overdue.map(e => `<div class="row">
        <span class="pill" style="background:var(--red-bg);color:var(--red);width:118px;text-align:center;flex-shrink:0">${esc2(fmtD(e.date))}</span>
        <div style="flex:1;min-width:0;cursor:pointer" onclick="NexLetCalendar.click('${e.type}','${escJs(e.evId || '')}')">
          <div style="font-size:13px;font-weight:600;color:var(--navy)">${esc2(e.title)}</div>
          ${e.sub ? `<div class="faint" style="font-size:11.5px;margin-top:2px">${esc2(e.sub)}</div>` : ''}</div></div>`).join('')}</div></div>` : ''}
      ${Object.keys(groups).length ? Object.keys(groups).sort().map(d => {
        const days = Math.round((new Date(d) - new Date(t)) / DAY);
        return `<div class="panel"><div class="panel-hd" style="padding:11px 20px">
          <h2 style="font-size:12.5px">${esc2(fmtD(d))}</h2>
          <span class="faint" style="font-size:11.5px">${days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : 'in ' + days + ' days'}</span></div>
          <div>${groups[d].map(rowFor).join('')}</div></div>`;
      }).join('') : `<div class="panel"><div class="empty">Nothing in the next 90 days.</div></div>`}`;
  }

  /* ── view ────────────────────────────────────────────────────────────── */
  function view() {
    ensureEvents().then(() => { if (!evPainted) { evPainted = true; if (window.render) window.render(); } });
    const evs = events();
    const t = todayIso();
    const todayList = evs.filter(e => e.date === t);
    const late = evs.filter(e => e.date < t && (['deposit', 'awaab', 'cert'].indexOf(e.type) >= 0 || ((TYPES[e.type] || {}).manual && !e.done))).length;
    const stat = evs.filter(e => e.date >= t && (e.type === 'deposit' || e.type === 'awaab')).length;
    const next30 = evs.filter(e => e.date >= t && e.date <= iso(plusDays(new Date(), 30))).length;

    return `<h1 class="pg">Calendar</h1>
      <div class="sub">Appointments, tasks and every deadline NexLet already knows about, in one place. Expiries and statutory clocks are worked out from your records, so they update themselves — add appointments and tasks by hand on top.</div>

      <div class="grid4" style="margin-bottom:18px">
        <div class="kpi"><div class="l">Today</div><div class="v">${todayList.length}</div>
          <div class="s">${todayList.length ? esc2(todayList[0].title).slice(0, 30) : 'nothing scheduled'}</div></div>
        <div class="kpi"><div class="l">Next 30 days</div><div class="v">${next30}</div></div>
        <div class="kpi"><div class="l">Statutory clocks</div><div class="v" style="color:${stat ? 'var(--amber)' : 'var(--green)'}">${stat}</div><div class="s">deposit &amp; Awaab's Law</div></div>
        <div class="kpi"><div class="l">Overdue</div><div class="v" style="color:${late ? 'var(--red)' : 'var(--green)'}">${late}</div></div>
      </div>

      ${todayList.length ? `<div class="panel"><div class="panel-hd"><h2 style="font-size:13px">Today — ${esc2(fmtD(t))}</h2>
        <button class="btn sm navy" onclick="NexLetCalendar.add('${t}')">＋ Add</button></div>
        <div>${todayList.map(rowFor).join('')}</div></div>` : ''}

      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:14px 0">
        <button class="btn sm" onclick="NexLetCalendar.step(-1)">←</button>
        <div style="font-family:var(--disp);font-size:17px;color:var(--navy);min-width:180px;text-align:center">
          ${cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
        <button class="btn sm" onclick="NexLetCalendar.step(1)">→</button>
        <button class="btn sm" onclick="NexLetCalendar.today()">Today</button>
        <div style="flex:1"></div>
        <button class="btn sm ${mode === 'month' ? 'navy' : ''}" onclick="NexLetCalendar.mode('month')">Month</button>
        <button class="btn sm ${mode === 'agenda' ? 'navy' : ''}" onclick="NexLetCalendar.mode('agenda')">Agenda</button>
        <button class="btn sm" onclick="NexLetCalendar.ics()">Export .ics</button>
        <button class="btn sm navy" onclick="NexLetCalendar.add('')">＋ Add</button>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
        ${Object.entries(TYPES).map(([k, T]) => `<div onclick="NexLetCalendar.toggle('${k}')" style="cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:6px;border:1px solid ${hidden[k] ? 'var(--border)' : T.color};background:${hidden[k] ? '#fff' : T.bg};color:${hidden[k] ? 'var(--faint)' : T.color};border-radius:100px;padding:4px 11px;font-size:11.5px;font-weight:600">
          <span style="width:7px;height:7px;border-radius:50%;background:${hidden[k] ? 'var(--border)' : T.color}"></span>${esc2(T.label)}</div>`).join('')}
      </div>

      ${mode === 'month' ? monthGrid(evs) : agenda(evs)}`;
  }

  /* ── .ics snapshot ───────────────────────────────────────────────────── */
  function ics() {
    const evs = events().filter(e => e.date >= todayIso());
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const fold = s => String(s).replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NexLet//Agency Calendar//EN',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:NexLet — key dates'];
    evs.forEach((e, i) => {
      const d = e.date.replace(/-/g, '');
      const T = TYPES[e.type] || {};
      lines.push('BEGIN:VEVENT',
        'UID:nexlet-' + e.type + '-' + i + '-' + d + '@beaconresidentials',
        'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + d,
        'DTEND;VALUE=DATE:' + iso(plusDays(e.date, 1)).replace(/-/g, ''),
        'SUMMARY:' + fold((T.label ? T.label + ': ' : '') + e.title),
        e.sub ? 'LOCATION:' + fold(e.sub) : 'X-NEXLET-NOSUB:1',
        'DESCRIPTION:' + fold('From NexLet. Snapshot exported ' + new Date().toLocaleString('en-GB') + '.'),
        'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
    a.download = 'nexlet-calendar-' + todayIso() + '.ics';
    a.click();
    if (window.toast) window.toast('✓ ' + evs.length + ' dates exported');
  }

  window.NexLetCalendar = {
    view, ics, events,
    add(date) { openEvent(null, date || todayIso()); },
    save: saveEvt,
    del: delEvt,
    done: toggleDone,
    click(type, evId) {
      if (evId) return openEvent(evId);
      const T = TYPES[type]; if (T && T.to && window.go) window.go(T.to);
    },
    step(n) { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + n, 1); if (window.render) window.render(); },
    today() { cursor = new Date(); cursor.setDate(1); mode = 'month'; if (window.render) window.render(); },
    mode(m) { mode = m; if (window.render) window.render(); },
    toggle(k) { hidden[k] = !hidden[k]; if (window.render) window.render(); }
  };
})();
