/* nexlet-register.js — one document register per tenancy.
 *
 * WHY
 *
 * The same documents were being asked about in six places: the serve checklist,
 * the tenant send modal, the landlord pack, the "already served — record it"
 * modal, the service history, and the signed-paperwork shelf. Six lists, six
 * vocabularies, and — the actual complaint — they could disagree with each
 * other. One said served 31 August, another wanted the same sheet ticked again,
 * a third asked for it to be attached when it was already on file.
 *
 * They disagreed because each was built to answer a different question, and none
 * of them held the whole truth about a document. But there are only ever three
 * facts about one:
 *
 *     Is it required?      Did it go out — when, how, is there a copy?
 *     Did it come back signed?
 *
 * So: one row per document, those three facts on it, and the actions where the
 * facts are. Everything else becomes a VIEW of these rows rather than another
 * list — the service history is this data sorted by date, the landlord pack is
 * these rows filtered by audience, and there is nowhere left for two lists to
 * drift apart.
 *
 * TWO THINGS THE ROWS MAKE VISIBLE that the old panels hid.
 *
 * The earliest date wins. A document handed over on the 28th and emailed by
 * NexLet on the 31st was served on the 28th — deadlines run from first service,
 * not last. The row shows the earliest and says where the later copy came from,
 * instead of quietly showing whichever the panel happened to read.
 *
 * Sent is not the same as received. A green tick against "emailed" proves it
 * went; the signed sheet coming back proves it arrived. Those are two columns,
 * because in a dispute they are two different arguments.
 */
(function () {
  'use strict';

  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escJs = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const dOnly = d => { try { return d && window.fmtDate ? window.fmtDate(d) : ''; } catch (e) { return ''; } };

  /* A serve-registry key and a signed-shelf key are not always the same word for
     the same document. Declared once, here, rather than assumed anywhere. */
  const SIGNED_KEY = { pi: 'deposit', keyterms: 'keyterms', receipt: 'receipt',
    alarms: 'alarms', meters: 'meters', inventory: 'inventory' };

  /* Service dates per audience, read from the filed copies. NexLetServe.servedKeys
     merges both audiences, which is right for a deadline and wrong for a row that
     has to say who has had it. */
  function servedFor(pid, audience) {
    const out = {};
    (ST().letters || [])
      .filter(x => x.property_id === pid && x.type === 'serve_' + audience && x.body_html)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      .forEach(x => {
        const body = String(x.body_html);
        const on = (body.match(/<!--nexlet-served-on:([^>]*)-->/) || [])[1] || x.created_at;
        const m = body.match(/<!--nexlet-served:([^>]*)-->/);
        const keys = m ? m[1].split(',').filter(Boolean) : [];
        keys.forEach(k => {
          /* Earliest wins: a pack re-sent later must not make the first send look
             late, and the deadline is measured from the first. */
          /* Must match the ref NexLetHistory.events() mints, or copy() looks up a
             bare id against a prefixed one and always misses. */
          if (!out[k] || new Date(on) < new Date(out[k].at)) out[k] = { at: on, ref: 'lt:' + x.id, hasCopy: true };
        });
      });
    return out;
  }

  function rows(pid) {
    if (!window.NexLetServe) return [];
    const tItems = window.NexLetServe.items(pid, 'tenant') || [];
    const lItems = window.NexLetServe.items(pid, 'landlord') || [];
    const tServed = servedFor(pid, 'tenant'), lServed = servedFor(pid, 'landlord');
    const seen = {}, out = [];
    const add = (it, aud) => {
      let r = seen[it.key];
      if (!r) {
        r = seen[it.key] = { key: it.key, label: it.label, why: it.why, required: false,
          kind: it.kind, ready: it.ready, tenant: null, landlord: null, audiences: [] };
        out.push(r);
      }
      r.required = r.required || !!it.required;
      r.audiences.push(aud);
      r[aud] = (aud === 'tenant' ? tServed : lServed)[it.key] || null;
    };
    tItems.forEach(i => add(i, 'tenant'));
    lItems.forEach(i => add(i, 'landlord'));
    out.forEach(r => {
      const sk = SIGNED_KEY[r.key];
      r.signed = (sk && window.NexLetSigned) ? window.NexLetSigned.held(pid, sk) : null;
      r.signedKey = sk || '';
      const dates = [r.tenant && r.tenant.at, r.landlord && r.landlord.at].filter(Boolean);
      r.firstAt = dates.length ? dates.sort((a, b) => new Date(a) - new Date(b))[0] : null;
      r.outstanding = r.required && !r.firstAt;
    });
    return out;
  }

  function summary(pid) {
    const rs = rows(pid);
    return { total: rs.length, outstanding: rs.filter(r => r.outstanding).length,
      signed: rs.filter(r => r.signed).length,
      signable: rs.filter(r => r.signedKey).length };
  }

  /* ── Row ───────────────────────────────────────────────────────────────── */
  function outCell(pid, r) {
    const bit = (aud, s) => {
      const who = aud === 'tenant' ? 'Tenant' : 'Landlord';
      if (!s) return '<span style="color:var(--' + (r.required ? 'red' : 'faint') + ')">' + who + ': not sent</span>';
      return '<span>' + who + ': <b>' + esc(dOnly(s.at)) + '</b>' +
        (s.ref ? ' <a href="#" onclick="event.preventDefault();NexLetHistory.copy(\'' + escJs(pid) + '\',\'' +
          escJs(s.ref) + '\')" style="font-size:11px">copy</a>' : '') + '</span>';
    };
    return '<div style="display:flex;flex-direction:column;gap:2px;font-size:11.5px">' +
      r.audiences.map(a => bit(a, r[a])).join('') + '</div>';
  }

  function backCell(pid, r) {
    if (!r.signedKey) return '<span class="faint" style="font-size:11.5px">\u2014</span>';
    const h = r.signed;
    if (!h) return '<button class="btn sm" onclick="NexLetSigned.add(\'' + escJs(pid) + '\',\'' +
      escJs(r.signedKey) + '\')">\u2191 Attach signed</button>';
    return '<div style="font-size:11.5px"><span style="color:var(--green)">\u2713 Signed ' +
      esc(dOnly(h.signedAt)) + '</span>' + (h.pages ? ' <span class="faint">p' + esc(h.pages) + '</span>' : '') +
      '<br><a href="#" onclick="event.preventDefault();viewDoc(\'' + escJs(h.url) + '\',\'' + escJs(r.label) +
      '\')" style="font-size:11px">view</a> \u00b7 <a href="#" onclick="event.preventDefault();NexLetSigned.add(\'' +
      escJs(pid) + '\',\'' + escJs(r.signedKey) + '\')" style="font-size:11px">replace</a></div>';
  }

  function row(pid, r) {
    const tone = r.outstanding ? 'var(--red)' : r.firstAt ? 'var(--green)' : 'var(--faint)';
    return '<div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr);' +
      'gap:12px;padding:10px 0;border-bottom:1px solid var(--border);align-items:start">' +
      '<div style="min-width:0">' +
      '<div style="font-size:13px;font-weight:600;color:var(--navy)">' +
      '<span style="color:' + tone + ';margin-right:6px">' + (r.firstAt ? '\u2713' : '\u25cb') + '</span>' +
      esc(r.label) + (r.required ? ' <span style="font-size:10px;color:var(--red);font-weight:700">REQUIRED</span>' : '') +
      '</div>' +
      '<div class="faint" style="font-size:11px;margin-top:2px;line-height:1.45">' + esc(r.why || '') + '</div>' +
      (r.firstAt ? '<a href="#" onclick="event.preventDefault();NexLetRegister.fixDate(\'' + escJs(pid) + '\',\'' +
        escJs(r.key) + '\')" style="font-size:11px">Served earlier than this?</a>' : '') +
      '</div>' +
      '<div>' + outCell(pid, r) + '</div>' +
      '<div>' + backCell(pid, r) + '</div></div>';
  }

  /* Signed paper with no matching row \u2014 a pet agreement, a standing order
     mandate. Without this the ad-hoc upload files into somewhere nobody can see,
     which is worse than not offering it. */
  function extraSigned(pid) {
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    const known = Object.keys(SIGNED_KEY).map(k => SIGNED_KEY[k]);
    const bag = Object.assign({}, rec.signedDocs || {});
    delete bag._printed;
    const extra = Object.keys(bag).filter(k => known.indexOf(k) < 0);
    if (!extra.length) return '';
    return extra.map(k => {
      const h = bag[k];
      return '<div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr);' +
        'gap:12px;padding:10px 0;border-bottom:1px solid var(--border);align-items:start">' +
        '<div style="min-width:0"><div style="font-size:13px;font-weight:600;color:var(--navy)">' +
        '<span style="color:var(--green);margin-right:6px">\u2713</span>' +
        esc(h.label || (k === 'standing' ? 'Standing order mandate' : 'Other signed paperwork')) + '</div>' +
        '<div class="faint" style="font-size:11px;margin-top:2px">Not a document we serve \u2014 held as evidence only.</div></div>' +
        '<div><span class="faint" style="font-size:11.5px">\u2014</span></div>' +
        '<div style="font-size:11.5px"><span style="color:var(--green)">\u2713 Signed ' + esc(dOnly(h.signedAt)) + '</span>' +
        (h.pages ? ' <span class="faint">p' + esc(h.pages) + '</span>' : '') +
        '<br><a href="#" onclick="event.preventDefault();viewDoc(\'' + escJs(h.url) + '\',\'signed\')" ' +
        'style="font-size:11px">view</a> \u00b7 <a href="#" onclick="event.preventDefault();NexLetSigned.add(\'' +
        escJs(pid) + '\',\'' + escJs(k) + '\')" style="font-size:11px">replace</a></div></div>';
    }).join('');
  }

  /* ── Panel ─────────────────────────────────────────────────────────────── */
  function panel(pid) {
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    if (!rec.id) return '';
    const rs = rows(pid), s = summary(pid);
    const H = t => '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);' +
      'font-weight:700">' + t + '</div>';
    return '<div class="panel" style="margin-bottom:14px"><div class="panel-hd"><h2>Documents</h2>' +
      '<span class="faint" style="font-size:12px">' +
      (s.outstanding ? s.outstanding + ' required and not sent' : 'All required documents sent') +
      (s.signable ? ' \u00b7 ' + s.signed + ' of ' + s.signable + ' signed back' : '') + '</span></div>' +
      '<div class="panel-bd">' +
      /* The retrospective breach triage the old service-history panel showed. A
         faint "1 required and not sent" in the header does not convey a £7,000
         penalty, and burying it behind a button is how it gets missed. */
      ((window.NexLetHistory && window.NexLetHistory.warnings && window.NexLetHistory.warnBlock)
        ? window.NexLetHistory.warnings(pid).map(w => window.NexLetHistory.warnBlock(w)).join('') : '') +
      '<div class="hint" style="margin:0 0 10px">One row per document. <b>Sent</b> is what went out and when. ' +
      '<b>Signed back</b> is the paper the tenant returned \u2014 sending proves it went, a signature proves it ' +
      'arrived, and in a dispute those are two different arguments.</div>' +
      '<div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr);gap:12px;' +
      'padding-bottom:6px;border-bottom:1.5px solid var(--navy)">' +
      H('Document') + H('Sent') + H('Signed back') + '</div>' +
      rs.map(r => row(pid, r)).join('') +
      extraSigned(pid) +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
      '<button class="btn sm navy" onclick="NexLetServe.open(\'' + escJs(pid) + '\',\'tenant\')">Send to the tenant</button>' +
      '<button class="btn sm" onclick="NexLetRegister.landlordPack(\'' + escJs(pid) + '\')">Send the landlord pack</button>' +
      '<button class="btn sm" onclick="NexLetSigned.addBundle(\'' + escJs(pid) + '\')">\u2191 Upload a signed stack</button>' +
      '<button class="btn sm" onclick="NexLetSigned.add(\'' + escJs(pid) + '\',\'other\')">\u2191 Other signed paperwork</button>' +
      '<button class="btn sm" onclick="NexLetServe.recordManual(\'' + escJs(pid) + '\',\'tenant\')">Record a batch you sent yourself</button>' +
      '<button class="btn sm" onclick="NexLetHistory.open(\'' + escJs(pid) + '\')">Service history</button>' +
      '</div></div></div>';
  }

  /* ── Correct one date ──────────────────────────────────────────────────── */
  /* The commonest correction there is, and previously only reachable through a
     batch modal that listed every document. A document handed over on the 28th
     and emailed on the 31st was served on the 28th. */
  function fixDate(pid, key) {
    const r = rows(pid).find(x => x.key === key); if (!r) return;
    const today = new Date().toISOString().slice(0, 10);
    const cur = r.firstAt ? String(r.firstAt).slice(0, 10) : today;
    window.modal('Correct the service date \u2014 ' + esc(r.label),
      '<p class="hint" style="margin:0 0 12px">Recorded as served <b>' + esc(dOnly(r.firstAt)) + '</b>. If it ' +
      'actually went out earlier \u2014 handed over, posted, or emailed from your own mailbox \u2014 enter that date. ' +
      'Deadlines run from the first service, so the earlier date is the one that counts.</p>' +
      '<div class="grid2" style="gap:10px">' +
      '<div class="fg"><label>It actually went out on</label>' +
      '<input id="fx-date" type="date" max="' + today + '" value="' + esc(cur) + '"></div>' +
      '<div class="fg"><label>How</label><select id="fx-route">' +
      ['Handed over in person', 'Email from my own mailbox', 'Post', 'Recorded delivery']
        .map(x => '<option>' + x + '</option>').join('') + '</select></div></div>' +
      '<div class="fg"><label>Note <span class="faint">(optional)</span></label>' +
      '<input id="fx-note" placeholder="e.g. handed to both tenants at the property"></div>' +
      '<div class="fg"><label>The copy you served <span class="faint">(strongly recommended)</span></label>' +
      '<input id="fx-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.eml,.msg">' +
      '<span class="hint">Without a copy this rests on your word. It will be recorded, and flagged as ' +
      'unevidenced.</span></div>',
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn navy" id="fx-save" onclick="NexLetRegister.saveDate(\'' + escJs(pid) + '\',\'' +
      escJs(key) + '\')">Record it</button>', true);
  }

  async function saveDate(pid, key) {
    const el = id => document.getElementById(id);
    const date = (el('fx-date') || {}).value || '';
    if (!date) { window.toast('Set the date', 1); return; }
    if (new Date(date) > new Date()) { window.toast('That date is in the future', 1); return; }
    const btn = el('fx-save'); if (btn) { btn.disabled = true; btn.textContent = 'Recording\u2026'; }
    /* Filed by the same route as a batch record, so it lands in the service
       history and the deadline checks identically — one code path, one meaning. */
    const ok = window.NexLetServe && window.NexLetServe.recordOne
      ? await window.NexLetServe.recordOne(pid, key, {
          date: date, route: (el('fx-route') || {}).value || '',
          note: (el('fx-note') || {}).value || '',
          file: (el('fx-file') && el('fx-file').files && el('fx-file').files[0]) || null })
      : false;
    if (!ok) { if (btn) { btn.disabled = false; btn.textContent = 'Record it'; } return; }
    window.closeModal(); if (window.render) window.render();
    window.toast('\u2713 Recorded as served ' + dOnly(date));
  }

  /* ── Landlord pack, one click ──────────────────────────────────────────── */
  /* It used to say "Attach when ready" against four documents the app already
     held, because the landlord list was built before the signed shelf existed and
     never learned about it. Now it reads the shelf and attaches what is there. */
  function landlordPack(pid) {
    if (!window.NexLetServe) return;
    const rs = rows(pid).filter(r => r.audiences.indexOf('landlord') >= 0);
    const attach = rs.filter(r => r.signed);
    const missing = rs.filter(r => r.signedKey && !r.signed);
    const sendable = rs.filter(r => r.ready);
    const going = sendable.concat(attach.filter(r => sendable.indexOf(r) < 0));
    window.modal('Landlord pack \u2014 ' + esc(((window.P && window.P(pid)) || {}).address || ''),
      '<p class="hint" style="margin:0 0 12px">Everything on file for the landlord, in one email. Nothing to tick ' +
      '\u2014 what is held is attached.</p>' +
      '<div style="border:1px solid var(--border);border-radius:9px;padding:11px 13px;margin-bottom:10px">' +
      '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);font-weight:700;' +
      'margin-bottom:6px">Going in this email</div>' +
      /* A signed landlord document is "ready" precisely because it is signed, so
         it appears in both lists. One line each. */
      (going.length
        ? going.map(r => '<div style="font-size:12.5px;padding:2px 0">\u2713 ' + esc(r.label) +
            (r.signed ? ' <span class="faint">\u2014 signed copy</span>' : '') + '</div>').join('')
        : '<div class="faint" style="font-size:12px">Nothing on file yet.</div>') + '</div>' +
      (missing.length ? '<div class="note" style="margin-bottom:10px"><b>Not yet on file:</b> ' +
        esc(missing.map(r => r.label).join(', ')) + '. The pack will go without them \u2014 upload the signed ' +
        'sheets and send again when they arrive.</div>' : ''),
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      (going.length ? '<button class="btn navy" id="lp-send" onclick="NexLetRegister.sendLandlord(\'' + escJs(pid) +
        '\')">Confirm and send</button>' : ''), true);
  }

  /* Sends directly. The preview used to hand off to the serve modal, which meant
     "one click" was three and landed the agent back in the ticking list the
     register exists to replace. */
  async function sendLandlord(pid) {
    const rs = rows(pid).filter(r => r.audiences.indexOf('landlord') >= 0);
    const attach = rs.filter(r => r.signed);
    const sendable = rs.filter(r => r.ready);
    const keys = sendable.concat(attach.filter(r => sendable.indexOf(r) < 0)).map(r => r.key);
    if (!keys.length) { window.toast('Nothing on file to send', 1); return; }
    const btn = document.getElementById('lp-send');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }
    await window.NexLetServe.send(pid, 'landlord', keys, '');
    window.closeModal(); if (window.render) window.render();
  }

  window.NexLetRegister = { panel, rows, summary, fixDate, saveDate, landlordPack, sendLandlord, servedFor, SIGNED_KEY };
})();
