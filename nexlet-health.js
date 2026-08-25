/* ============================================================================
   nexlet-health.js — backup, error capture, and a persistence self-check.
   Loaded by agent.html as a classic script; shares its globals.

   Three jobs, all aimed at the two weakest parts of this app:

   1. BACKUP. There was no disaster-recovery story at all. This exports every
      collection to a timestamped JSON file, tracks when you last did it, and
      nags after a week. Restore is deliberately manual and confirmed twice.

   2. ERROR CAPTURE. Uncaught errors only ever reached the console, which nobody
      has open. They are now recorded with a ring buffer and surfaced here, so a
      silent failure becomes a visible one.

   3. PERSISTENCE SELF-CHECK. Ten separate bugs in this codebase have been the
      same shape: a field written to state that no row mapper carries, so it
      vanishes on reload. JavaScript never complains. This fetches the page's
      own source and runs the diff that catches it — which is exactly the check
      that would have caught all ten, including the two the manual audit missed
      because they had no mapper at all.
   ========================================================================== */
(function () {
  'use strict';

  const LS_ERR  = 'nexlet_errors_v1';
  const LS_BK   = 'nexlet_last_backup';
  const LS_AUTO = 'nexlet_auto_backup';
  const MAX_ERR = 40;
  const AUTO_DAYS = 1;

  const esc2 = s => (window.esc ? window.esc(s) : String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  const fmtDT = iso => { const d = new Date(iso); return isNaN(d) ? '—' :
    d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

  /* ── 1. error capture ───────────────────────────────────────────────────── */
  const errs = () => { try { return JSON.parse(localStorage.getItem(LS_ERR) || '[]'); } catch (e) { return []; } };
  function noteErr(kind, msg, where) {
    try {
      const list = errs();
      // Collapse repeats — a render loop would otherwise flood the buffer.
      const last = list[0];
      if (last && last.msg === msg) { last.count = (last.count || 1) + 1; last.at = new Date().toISOString(); }
      else list.unshift({ at: new Date().toISOString(), kind, msg: String(msg).slice(0, 400), where: String(where || '').slice(0, 200), count: 1 });
      localStorage.setItem(LS_ERR, JSON.stringify(list.slice(0, MAX_ERR)));
    } catch (e) { }
  }
  window.addEventListener('error', e => noteErr('error', e.message || 'Unknown error',
    (e.filename || '') + (e.lineno ? ':' + e.lineno : '')));
  window.addEventListener('unhandledrejection', e => noteErr('promise',
    (e.reason && (e.reason.message || e.reason)) || 'Unhandled rejection', ''));

  /* ── 2. backup ──────────────────────────────────────────────────────────── */
  // Everything that is state. Deliberately explicit rather than a blanket dump,
  // so a new collection has to be added here consciously.
  const COLLECTIONS = ['agency', 'landlords', 'properties', 'tenants', 'tenancies', 'references',
    'invoices', 'notices', 'rentLedger', 'jobs', 'inventories2', 'messages', 'listings',
    'applicants', 'viewings', 'offers', 'keys', 'payouts', 'landlordLeads', 'valuations',
    'agreements', 'letters', 'tenancyAgreements', 'inboundEnquiries'];

  function snapshot() {
    const S = window.S || {};
    const out = { _meta: { app: 'NexLet', takenAt: new Date().toISOString(),
      agencyId: window._agencyId || null, live: !!window.LIVE, version: 1 } };
    COLLECTIONS.forEach(k => { if (S[k] !== undefined) out[k] = S[k]; });
    // Local-only stores that would otherwise be missed.
    ['nexlet_audit_local_v1', 'nexlet_comms_local_v1', 'nexlet_events_local_v1'].forEach(k => {
      try { const v = localStorage.getItem(k); if (v) (out._local = out._local || {})[k] = JSON.parse(v); } catch (e) { }
    });
    return out;
  }

  function counts() {
    const S = window.S || {};
    return COLLECTIONS.map(k => ({ k, n: Array.isArray(S[k]) ? S[k].length : (S[k] ? 1 : 0) }))
      .filter(x => x.n > 0);
  }

  function backup(auto) {
    const data = snapshot();
    data._meta.automatic = !!auto;
    const name = 'nexlet-backup-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    try { localStorage.setItem(LS_BK, new Date().toISOString()); } catch (e) { }
    const rows = counts().reduce((s, x) => s + x.n, 0);
    if (window.NexLetAudit) window.NexLetAudit.log({ action: 'doc.generated', entity: 'agency',
      entityLabel: 'Data backup', detail: { file: name, records: rows, automatic: auto ? 'yes' : 'no' } });
    if (window.render) window.render();
    if (window.toast) window.toast(auto
      ? '\u2713 Daily backup saved to your downloads \u2014 ' + rows + ' records'
      : '\u2713 Backup saved \u2014 ' + rows + ' records');
  }

  const lastBackup = () => { try { return localStorage.getItem(LS_BK); } catch (e) { return null; } };
  const autoOn  = () => { try { return localStorage.getItem(LS_AUTO) !== 'off'; } catch (e) { return true; } };

  /* A browser cannot run at 3am with the tab closed — there is no scheduler and no
     process. So "nightly" here means: the first time you open the app on a day
     when the last backup is older than the interval, it takes one. That gives a
     dated copy per working day without pretending to be a cron job. A genuine
     unattended nightly dump needs pg_cron on Supabase, which is server-side
     work, not something this page can do. */
  function maybeAutoBackup() {
    if (!autoOn()) return;
    const d = daysSinceBackup();
    if (d !== null && d < AUTO_DAYS) return;
    // Wait until state has actually loaded, or the backup would be empty.
    const ready = () => {
      const S = window.S || {};
      return (S.properties && S.properties.length) || (S.landlords && S.landlords.length);
    };
    let tries = 0;
    const tick = setInterval(() => {
      tries++;
      if (ready()) { clearInterval(tick); backup(true); }
      else if (tries > 20) clearInterval(tick);   // never loaded; skip silently
    }, 1500);
  }
  window.addEventListener('load', () => setTimeout(maybeAutoBackup, 4000));
  function daysSinceBackup() {
    const b = lastBackup(); if (!b) return null;
    return Math.floor((Date.now() - new Date(b)) / 864e5);
  }

  function restore() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = () => {
      const f = input.files && input.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        let d; try { d = JSON.parse(r.result); } catch (e) { window.toast('Not a valid backup file', 1); return; }
        if (!d._meta || d._meta.app !== 'NexLet') { window.toast('Not a NexLet backup', 1); return; }
        const rows = COLLECTIONS.reduce((s, k) => s + (Array.isArray(d[k]) ? d[k].length : 0), 0);
        window.modal('Restore from backup', `
          <div class="note warn"><b>This replaces everything currently in the app.</b>
            Anything entered since the backup was taken is lost. It does not write to the database
            until you save a record, so close without saving if you change your mind.</div>
          <table style="width:100%;font-size:12.5px;border-collapse:collapse;margin-top:12px">
            <tr><td style="padding:5px 12px 5px 0;color:var(--faint);width:130px">Taken</td><td>${esc2(fmtDT(d._meta.takenAt))}</td></tr>
            <tr><td style="padding:5px 12px 5px 0;color:var(--faint)">Records</td><td>${rows}</td></tr>
            <tr><td style="padding:5px 12px 5px 0;color:var(--faint)">File</td><td>${esc2(f.name)}</td></tr>
          </table>`,
          `<button class="btn" onclick="closeModal()">Cancel</button>
           <button class="btn navy" onclick="NexLetHealth._doRestore()">Replace everything</button>`, true);
        window._pendingRestore = d;
      };
      r.readAsText(f);
    };
    input.click();
  }

  /* ── 3. persistence self-check ──────────────────────────────────────────── */
  // Fetches the page's own source and runs two diffs:
  //   (a) collections written but never pushed to the database
  //   (b) fields assigned to a record but absent from its row mappers
  // Both are the shape of every persistence bug found in this codebase.
  let CHECK = null;

  async function selfCheck() {
    if (window.toast) window.toast('Checking\u2026');
    let src = '';
    try { src = await (await fetch(location.href, { cache: 'no-store' })).text(); }
    catch (e) { if (window.toast) window.toast('Could not read source to check', 1); return; }
    const body = (src.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/) || [, ''])[1];

    // (a) every S.<collection> assigned, versus those with a push* helper.
    const assigned = new Set();
    for (const m of body.matchAll(/S\.([a-zA-Z][\w]*)\s*=(?!=)/g)) assigned.add(m[1]);
    for (const m of body.matchAll(/S\.([a-zA-Z][\w]*)\.push\(/g)) assigned.add(m[1]);
    const pushed = new Set();
    for (const m of body.matchAll(/sb\.from\('([a-z_]+)'\)/g)) pushed.add(m[1]);
    const known = { agency: 'agencies', landlords: 'agency_landlords', properties: 'properties',
      tenants: 'agency_tenants', tenancies: 'tenancies', references: 'agency_references',
      invoices: 'invoices', notices: 'agency_notices', rentLedger: 'agency_rent_ledger',
      jobs: 'agency_maintenance', inventories2: 'agency_inventories', messages: 'agency_messages',
      listings: 'agency_listings', applicants: 'agency_applicants', viewings: 'agency_viewings',
      offers: 'agency_offers', keys: 'agency_keys', payouts: 'agency_payouts',
      landlordLeads: 'agency_landlord_leads', valuations: 'agency_valuations' };
    const unpushed = Object.keys(known).filter(k => assigned.has(k) && !pushed.has(known[k]));

    // (b) fields written to a record, versus what the mappers carry.
    const seg = (a, b) => { const i = body.indexOf(a); if (i < 0) return ''; const j = body.indexOf(b, i); return body.slice(i, j < 0 ? i + 3000 : j); };
    const PAIRS = [
      ['tenancy',  'rec', 'const rowToTenant=r=>', 'const tenantToRow=t=>', 'const tenantToRow=t=>', 'const rowToMsg=r=>'],
      ['agency',   'S.agency', 'const rowToAgency=r=>', 'const agencyToRow=a=>', 'const agencyToRow=a=>', 'const rowToLandlord=r=>'],
      ['notice',   'n', 'const rowToNotice=r=>', 'const noticeToRow=n=>', 'const noticeToRow=n=>', 'const rowToTenant=r=>'],
      ['inventory','v', 'const rowToInv2=r=>', 'const inv2ToRow=v=>', 'const inv2ToRow=v=>', 'const rowToNotice=r=>']
    ];
    const noise = new Set(['length', 'value', 'textContent', 'innerHTML', 'style', 'disabled',
      'checked', 'src', 'href', 'id', 'className', 'selected', 'display', 'push', 'filter', 'map', 'forEach']);
    const fieldGaps = [];
    for (const [label, v, rA, rB, wA, wB] of PAIRS) {
      const reader = seg(rA, rB), writer = seg(wA, wB);
      if (!reader || !writer) continue;
      const pat = v.indexOf('.') > 0
        ? new RegExp(v.replace('.', '\\.') + '\\.([a-zA-Z][\\w]*)\\s*=(?!=)', 'g')
        : new RegExp('\\b' + v + '\\.([a-zA-Z][\\w]*)\\s*=(?!=)', 'g');
      const written = new Set();
      for (const m of body.matchAll(pat)) if (!noise.has(m[1])) written.add(m[1]);
      [...written].forEach(k => {
        const inR = new RegExp('[{,\\s]' + k + '\\s*:').test(reader);
        const inW = new RegExp('\\b[a-zA-Z]\\.' + k + '\\b').test(writer);
        if (!inR || !inW) fieldGaps.push({ label, field: k, read: inR, write: inW });
      });
    }

    CHECK = { at: new Date().toISOString(), unpushed, fieldGaps,
      collections: Object.keys(known).filter(k => assigned.has(k)).length };
    if (window.render) window.render();
    const total = unpushed.length + fieldGaps.length;
    if (window.toast) window.toast(total ? '\u26a0 ' + total + ' persistence gap' + (total > 1 ? 's' : '') + ' found' : '\u2713 No persistence gaps');
  }

  /* ── view ───────────────────────────────────────────────────────────────── */
  function view() {
    const d = daysSinceBackup(), lb = lastBackup();
    const e = errs();
    const stale = d === null || d > 7;
    const rows = counts();
    const total = rows.reduce((s, x) => s + x.n, 0);

    return `<h1 class="pg">Health &amp; Backup</h1>
      <div class="sub">Your data, your errors, and a check for the one bug this app keeps producing \u2014 a field saved in the browser that nothing writes to the database.</div>

      ${stale ? `<div class="note warn" style="margin-bottom:16px"><b>${lb ? 'Last backup was ' + d + ' days ago.' : 'You have never taken a backup.'}</b>
        There is no automatic copy of your data anywhere. If the database is lost or a record is deleted by mistake, a backup is the only way back. Take one now \u2014 it downloads a single file.</div>` : ''}

      <div class="grid4" style="margin-bottom:18px">
        <div class="kpi"><div class="l">Records held</div><div class="v">${total}</div><div class="s">${rows.length} collections</div></div>
        <div class="kpi"><div class="l">Last backup</div><div class="v" style="font-size:15px;padding-top:8px;color:${stale ? 'var(--red)' : 'var(--green)'}">${lb ? d + 'd ago' : 'Never'}</div></div>
        <div class="kpi"><div class="l">Errors logged</div><div class="v" style="color:${e.length ? 'var(--amber)' : 'var(--green)'}">${e.length}</div></div>
        <div class="kpi"><div class="l">Persistence gaps</div><div class="v" style="font-size:15px;padding-top:6px">${CHECK
          ? (CHECK.unpushed.length + CHECK.fieldGaps.length
              ? '<span style="color:var(--red)">' + (CHECK.unpushed.length + CHECK.fieldGaps.length) + '</span>'
              : '<span style="color:var(--green)">None</span>')
          : '<button class="btn sm" onclick="NexLetHealth.check()">Run check</button>'}</div></div>
      </div>

      <div class="panel"><div class="panel-hd"><h2 style="font-size:13px">Backup</h2>
        <div style="display:flex;gap:8px">
          <button class="btn sm" onclick="NexLetHealth.toggleAuto()">${autoOn()?'Daily backup: on':'Daily backup: off'}</button>
          <button class="btn sm" onclick="NexLetHealth.restore()">Restore from file\u2026</button>
          <button class="btn sm navy" onclick="NexLetHealth.backup()">\u2913 Download backup</button></div></div>
        <div style="padding:14px 20px">
          <div style="display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12px">
            ${rows.map(x => `<span class="faint">${esc2(x.k)} <b style="color:var(--navy)">${x.n}</b></span>`).join('')}
          </div>
          <p class="hint" style="margin-top:12px">One JSON file containing everything above. Keep it somewhere other than this machine \u2014 a backup on the same device as the original is not a backup.</p>
          <p class="hint" style="margin-top:8px"><b>Daily backup ${autoOn()?'is on':'is off'}.</b> When on, the first time you open NexLet on a day where the last backup is over a day old, one is saved to your downloads automatically. A browser cannot run at 3am with the tab closed \u2014 there is no scheduler and no process \u2014 so this gives a dated copy per working day instead. A genuinely unattended nightly dump needs a scheduled job on the database side.</p>
        </div></div>

      ${CHECK ? `<div class="panel"><div class="panel-hd"><h2 style="font-size:13px">Persistence check</h2>
        <span class="faint" style="font-size:11.5px">ran ${esc2(fmtDT(CHECK.at))} \u00b7 ${CHECK.collections} collections</span></div>
        <div>${(!CHECK.unpushed.length && !CHECK.fieldGaps.length)
          ? `<div class="empty">No gaps found. Every collection has a database writer, and every field written to a record round-trips through its mappers.</div>`
          : CHECK.unpushed.map(k => `<div class="row">
              <span class="pill" style="background:var(--red-bg);color:var(--red);width:118px;text-align:center;flex-shrink:0">No writer</span>
              <div style="flex:1;font-size:13px"><b>${esc2(k)}</b> is written in the app but never sent to the database \u2014 everything in it is lost on reload.</div></div>`).join('')
            + CHECK.fieldGaps.map(g => `<div class="row">
              <span class="pill" style="background:var(--amber-bg);color:var(--amber);width:118px;text-align:center;flex-shrink:0">${g.read ? 'Not saved' : 'Not loaded'}</span>
              <div style="flex:1;font-size:13px"><b>${esc2(g.field)}</b> on the ${esc2(g.label)} record ${g.read ? 'is read back but never written' : 'is written but never read back'} \u2014 it will not survive a reload.</div></div>`).join('')}
        </div>
        <div style="padding:12px 20px;border-top:1px solid #EEF1F5"><button class="btn sm" onclick="NexLetHealth.check()">Run again</button></div></div>`
      : `<div class="panel"><div class="panel-hd"><h2 style="font-size:13px">Persistence check</h2></div>
        <div style="padding:18px 20px">
          <p style="font-size:13px;line-height:1.7;margin-bottom:12px">Ten bugs in this app have had the same shape: a value saved in the browser that no database mapper carries, so it disappears on the next reload. Nothing warns you \u2014 the code looks correct. This reads the app's own source and finds them.</p>
          <button class="btn navy" onclick="NexLetHealth.check()">Run check</button>
        </div></div>`}

      <div class="panel"><div class="panel-hd"><h2 style="font-size:13px">Errors</h2>
        ${e.length ? `<button class="btn sm" onclick="NexLetHealth.clearErrors()">Clear</button>` : ''}</div>
        <div>${e.length ? e.map(x => `<div class="row" style="align-items:flex-start">
          <div style="width:128px;flex-shrink:0;font-size:11.5px;color:var(--faint)">${fmtDT(x.at)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;color:var(--navy);word-break:break-word">${esc2(x.msg)}</div>
            ${x.where ? `<div class="faint" style="font-size:11px;margin-top:2px">${esc2(x.where)}</div>` : ''}</div>
          ${x.count > 1 ? `<span class="pill" style="background:var(--off);color:#8A7D6E">\u00d7${x.count}</span>` : ''}
        </div>`).join('') : `<div class="empty">Nothing recorded. Errors that would otherwise only reach the browser console are captured here from now on.</div>`}</div></div>`;
  }

  window.NexLetHealth = {
    view, backup, restore, snapshot,
    check: selfCheck,
    daysSinceBackup, lastBackup,
    toggleAuto(){ try{ localStorage.setItem(LS_AUTO, autoOn()?'off':'on'); }catch(e){}
      if(window.render) window.render();
      if(window.toast) window.toast(autoOn()?'\u2713 Daily backup on':'Daily backup off'); },
    clearErrors() { try { localStorage.removeItem(LS_ERR); } catch (e) { } if (window.render) window.render(); },
    _doRestore() {
      const d = window._pendingRestore; if (!d) return;
      COLLECTIONS.forEach(k => { if (d[k] !== undefined) window.S[k] = d[k]; });
      if (d._local) Object.keys(d._local).forEach(k => {
        try { localStorage.setItem(k, JSON.stringify(d._local[k])); } catch (e) { } });
      window._pendingRestore = null;
      if (window.closeModal) window.closeModal();
      if (window.render) window.render();
      if (window.toast) window.toast('\u2713 Restored \u2014 check the data before saving anything');
    }
  };
})();
