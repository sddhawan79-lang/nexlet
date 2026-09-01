/* nexlet-capture.js — photograph provenance, room scanning, cleanliness.
 *
 * Four gaps this closes, all of them things that decide deposit disputes.
 *
 * 1  PROVENANCE. Adjudicators ask for date-stamped photographs. A file sitting
 *    in a bucket has an upload time and nothing else, and an upload time is not
 *    a capture time — a photograph taken three weeks before it was filed is a
 *    different evidential claim from one taken on the day. So the EXIF capture
 *    time is read from the original file, BEFORE resizing, because drawing a
 *    photo onto a canvas throws the EXIF away. Both times are kept, plus a
 *    SHA-256 of the bytes that were actually stored, so a photo can be shown to
 *    be the one that was filed and not a later substitute.
 *
 * 2  ROOM SCANNING. Typing sixty item rows into a prompt box is why inventories
 *    end up thin, and "insufficient inventory detail" is the named reason claims
 *    fail. Photograph a room, and one model call returns the items in it with a
 *    condition each. The agent edits; nobody types from nothing.
 *
 * 3  CLEANLINESS. Cleaning is the single largest category of deposit dispute,
 *    and it turns on the standard the property was handed over in — which is a
 *    fact about the whole room, not about any one item. It gets its own rating
 *    at check-in, against a named standard, so check-out has something to
 *    compare with rather than an argument about what "clean" meant.
 *
 * 4  MODEL TIERING. A move-in pass describes what is there. A check-out decides
 *    who pays. Those do not need the same model, and the cheaper one falls back
 *    to the stronger one if the proxy will not serve it.
 */
(function () {
  'use strict';

  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escJs = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  /* Sonnet for anything that produces a number someone pays. Haiku is enough to
     describe a photograph, which is most of the calls a move-in makes. */
  const MODEL_FULL  = 'claude-sonnet-4-5';
  const MODEL_CHEAP = 'claude-haiku-4-5';
  /* Everything that writes a description runs on the full model. The cheap tier
     was worth about 25p a report and cost format discipline: smaller models drift
     back into narrative prose under a strict entry format, and the wording IS the
     product here — it is what the landlord is charged for and what an adjudicator
     reads. The tier and its fallback stay in place for any future call where the
     output is not the deliverable. */
  function modelFor(type) { return MODEL_FULL; }

  /* ── House style ───────────────────────────────────────────────────────── */
  /* What separates a professional schedule of condition from a list of photo
     captions is the shape of each entry: what the thing IS, then its condition,
     then the specific defects and where they are. A clerk writes "Brown carpet,
     chrome threshold bar. Fair condition: slightly worn at doorway, heavy
     stained patch under window." Not a sentence about the carpet.

     Shared by the room scan and the move-in report so both read as one document
     written by one hand, which is the other half of looking professional. */
  const BASE_STYLE =
    'You are a UK inventory clerk compiling a schedule of condition for a letting agent.\n\n' +
    'HOUSE STYLE, which you must follow exactly. Write the description first — material, colour, finish, ' +
    'fittings — then a full stop, then the condition, then a colon and the specific defects with their ' +
    'locations. For example:\n' +
    '  "Brown carpet, chrome threshold bar. Fair condition: slightly worn at doorway, heavy stained patch under window."\n' +
    '  "White painted plaster walls, white coved ceiling. Good condition: two small scuffs to wall behind door."\n' +
    '  "Stainless steel electric oven, four-ring ceramic hob. Good working order: light scorching to hob surround."\n' +
    'Never write a narrative sentence. Never write "appears to be", "looks like" or "seems". Never write "good ' +
    'condition" with no detail — an adjudicator cannot compare against that. Where there is genuinely no defect, ' +
    'stop at the condition term.\n\n' +
    'Record every existing mark, chip, stain, scuff or damage explicitly, with its location, so the tenant cannot ' +
    'later be charged for it. Ignore hairline settlement cracking to walls and ceilings unless significant. Rate ' +
    'condition using ONLY one of: New, Good, Fair wear and tear, Worn, Damaged.\n\n';

  /* There is no training and no fine-tuning here, and there should not be. What
     there is instead is cheaper and works from the first correction: every time
     an agent rewrites a line before saving it, the pair is kept, and the most
     recent few are put in front of the model as worked examples. The model is
     not learning in any technical sense — it is being shown how this agency
     writes, which is the thing that actually needs to carry across reports.

     Only genuine rewrites are kept. A typo fix teaches nothing and would crowd
     out an example that does. */
  function learned() {
    return (((ST().agency || {}).invStyle) || []).slice(-6);
  }
  function houseStyle() {
    const ex = learned();
    if (!ex.length) return BASE_STYLE;
    return BASE_STYLE +
      'HOW THIS AGENCY WRITES. These are entries this agency has rewritten. Match this voice — the level of ' +
      'detail, the vocabulary, the length:\n' +
      ex.map(x => '  Instead of: "' + x.was + '"\n  They write: "' + x.now + '"').join('\n') + '\n\n';
  }

  /* Called when a scanned room is committed, with what the model wrote and what
     the agent saved. */
  function learn(pairs) {
    const a = ST().agency; if (!a) return;
    const keep = (pairs || []).filter(p => {
      if (!p.was || !p.now || p.was === p.now) return false;
      if (p.now.length < 25) return false;
      /* Below roughly a third changed it is a correction, not a rewrite, and a
         correction is not a house style. */
      return diff(p.was, p.now) > 0.33;
    });
    if (!keep.length) return;
    a.invStyle = (a.invStyle || []).concat(keep.map(p => ({ was: p.was, now: p.now, at: new Date().toISOString() }))).slice(-12);
    if (window.pushAgency) window.pushAgency();
    if (window.save) window.save();
  }
  function diff(a, b) {
    const wa = String(a).toLowerCase().split(/\W+/).filter(Boolean);
    const wb = new Set(String(b).toLowerCase().split(/\W+/).filter(Boolean));
    if (!wa.length) return 1;
    return wa.filter(w => !wb.has(w)).length / wa.length;
  }

  /* ── EXIF ──────────────────────────────────────────────────────────────── */
  /* Only DateTimeOriginal, read straight out of the APP1 block. A full EXIF
     parser is a dependency and a liability; this needs one tag. */
  function exifTaken(file) {
    return new Promise(resolve => {
      const fr = new FileReader();
      fr.onerror = () => resolve(null);
      fr.onload = () => {
        try {
          const v = new DataView(fr.result);
          if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return resolve(null);
          let off = 2;
          while (off + 4 < v.byteLength) {
            if (v.getUint16(off) !== 0xFFE1) {
              if ((v.getUint16(off) & 0xFF00) !== 0xFF00) return resolve(null);
              off += 2 + v.getUint16(off + 2); continue;
            }
            const app1 = off + 4;
            if (v.getUint32(app1) !== 0x45786966) return resolve(null);
            const tiff = app1 + 6;
            const le = v.getUint16(tiff) === 0x4949;
            const ifd0 = tiff + v.getUint32(tiff + 4, le);
            const readDir = (dir, want) => {
              const n = v.getUint16(dir, le);
              for (let i = 0; i < n; i++) {
                const e = dir + 2 + i * 12;
                if (v.getUint16(e, le) === want) return { e: e, val: v.getUint32(e + 8, le) };
              }
              return null;
            };
            const str = (ptr, len) => {
              let s = '';
              for (let i = 0; i < len - 1; i++) s += String.fromCharCode(v.getUint8(ptr + i));
              return s;
            };
            let hit = readDir(ifd0, 0x9003);
            if (!hit) {
              const sub = readDir(ifd0, 0x8769);
              if (sub) hit = readDir(tiff + sub.val, 0x9003);
            }
            if (!hit) return resolve(null);
            const raw = str(tiff + hit.val, 20);
            const m = raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
            if (!m) return resolve(null);
            const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
            return resolve(isNaN(d) ? null : d.toISOString());
          }
          resolve(null);
        } catch (e) { resolve(null); }
      };
      fr.readAsArrayBuffer(file.slice(0, 131072));
    });
  }

  async function sha256(blob) {
    try {
      const buf = await blob.arrayBuffer();
      const h = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { return null; }
  }

  /* Stored beside the photo list rather than inside it, so every existing
     reader of room.checkin.photos keeps working unchanged.

     Keyed on bucket/path rather than the whole URL. The same photograph appears
     as a public URL in the room, and as a short-lived signed URL once a report
     has been prepared for sending — keying on the raw string would lose the
     provenance at exactly the point the report needs to state it. */
  function keyFor(url) {
    const m = String(url || '').match(/\/object\/(?:public|sign)\/([^?]+)/);
    return m ? decodeURIComponent(m[1]) : String(url || '');
  }
  function meta(v, url) {
    const store = (v && v.photoMeta) || {};
    if (store[url]) return store[url];
    const k = keyFor(url);
    if (store[k]) return store[k];
    for (const kk in store) if (keyFor(kk) === k) return store[kk];
    return null;
  }
  function setMeta(v, url, m) { v.photoMeta = v.photoMeta || {}; v.photoMeta[keyFor(url)] = m; }

  const HOUR = 3600000;
  /* A capture time far from the upload time is not wrong, but it is a different
     claim, and the person relying on it should know before an adjudicator does. */
  function provenance(v, url) {
    const m = meta(v, url);
    if (!m) return { k: 'none', label: 'No capture time held', tone: 'amber' };
    if (!m.takenAt) return { k: 'upload', label: 'Filed ' + fmt(m.uploadedAt) + ' \u00b7 no capture time in the file', tone: 'amber' };
    const gap = Math.abs(new Date(m.uploadedAt) - new Date(m.takenAt));
    if (gap > 72 * HOUR) return { k: 'old', label: 'Taken ' + fmt(m.takenAt) + ', filed ' + fmt(m.uploadedAt), tone: 'amber' };
    return { k: 'ok', label: 'Taken ' + fmt(m.takenAt), tone: 'green' };
  }
  function fmt(d) { try { return d ? new Date(d).toLocaleString('en-GB',
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014'; } catch (e) { return '\u2014'; } }

  /* Called by addRoomPhotos with the ORIGINAL file and the resized blob. */
  async function record(v, url, file, blob) {
    setMeta(v, url, {
      takenAt: await exifTaken(file),
      uploadedAt: new Date().toISOString(),
      hash: await sha256(blob),
      name: file.name || '',
      bytes: blob.size || 0
    });
  }

  /* ── Cleanliness ───────────────────────────────────────────────────────── */
  /* Named standards rather than a number, because "7 out of 10 clean" means
     nothing at check-out and "professionally cleaned throughout" means a great
     deal. The tenant has to return it to the standard it was given in, so the
     standard has to be stated. */
  const CLEAN = [
    ['professional', 'Professionally cleaned throughout', 'Receipt held. The tenant must return it to this standard.'],
    ['domestic', 'Cleaned to a good domestic standard', 'Clean and ready to live in, not professionally done.'],
    ['acceptable', 'Acceptable, light marks in places', 'Usable, with visible wear. Noted so it is not charged for later.'],
    ['poor', 'Below standard in places', 'Recorded because the tenant cannot be asked to improve on what they were given.']
  ];
  function cleanLabel(k) { const x = CLEAN.find(c => c[0] === k); return x ? x[1] : ''; }

  function setClean(vid, room, k) {
    const v = (ST().inventories2 || []).find(x => x.id === vid);
    if (!v) return;
    v.cleanliness = v.cleanliness || {};
    if (k) v.cleanliness[room] = { standard: k, at: new Date().toISOString() };
    else delete v.cleanliness[room];
    if (window.pushInv2) window.pushInv2(v);
    if (window.render) window.render();
  }
  function cleanFor(v, room) { return ((v && v.cleanliness) || {})[room] || null; }

  function cleanPanel(v, room) {
    const c = cleanFor(v, room);
    return '<div style="border:1px solid ' + (c ? 'var(--border)' : 'var(--amber)') + ';border-radius:9px;' +
      'padding:11px 13px;margin-bottom:10px;background:' + (c ? 'var(--off)' : 'var(--amber-bg)') + '">' +
      '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);font-weight:700;' +
      'margin-bottom:6px">Cleanliness at check-in \u2014 ' + esc(room || '') + '</div>' +
      '<select onchange="NexLetCapture.setClean(\'' + escJs(v.id) + '\',\'' + escJs(room) + '\',this.value)" ' +
      'style="width:100%;max-width:420px">' +
      '<option value=""' + (c ? '' : ' selected') + '>\u2014 not recorded \u2014</option>' +
      CLEAN.map(x => '<option value="' + x[0] + '"' + (c && c.standard === x[0] ? ' selected' : '') + '>' +
        esc(x[1]) + '</option>').join('') + '</select>' +
      '<div class="faint" style="font-size:11px;margin-top:5px;line-height:1.5">' +
      (c ? esc((CLEAN.find(x => x[0] === c.standard) || [])[2] || '')
         : 'Cleaning is the largest single cause of deposit disputes, and it turns on the standard the property was ' +
           'handed over in. Record it now and check-out has something to compare against.') + '</div></div>';
  }

  /* ── Room scan ─────────────────────────────────────────────────────────── */
  /* Photograph a room; one call returns the items in it. The agent still owns
     the result — nothing is written until they have seen the list. */
  async function scan(vid, input) {
    const files = [...((input && input.files) || [])];
    if (!files.length) return;
    const v = (ST().inventories2 || []).find(x => x.id === vid);
    if (!v) return;
    if (!window._sessionToken) { window.toast('Scanning needs a live login', 1); return; }
    const room = (window.prompt('Which room are these of? (e.g. Kitchen)') || '').trim();
    if (!room) return;

    window.toast('\u2726 Uploading ' + files.length + ' photo' + (files.length === 1 ? '' : 's') + '\u2026');
    const urls = [];
    for (const f of files) {
      const blob = await window._resizeImg(f, 700);
      const url = await window._storageUpload(blob,
        vid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg', 'property-documents');
      if (url) { await record(v, url, f, blob); urls.push(url); }
    }
    if (!urls.length) { window.toast('Nothing uploaded \u2014 check your connection', 1); return; }
    if (window.pushInv2) window.pushInv2(v);

    window.toast('\u2726 Reading the room\u2026');
    const prompt = houseStyle() +
      'These are photographs of the ' + room + ' at check-in. List every item, surface and fitting a clerk records ' +
      'separately: floor, walls and ceiling, woodwork, door, window and dressings, switches and sockets, light ' +
      'fittings, radiator, and each appliance or piece of furniture. Do not merge unrelated things onto one line, ' +
      'and do not invent anything you cannot see.\\n\\nReturn ONLY JSON: {"items":[{"item":"short name, e.g. ' +
      'Flooring","condition":"one of the terms","summary":"the entry, in house style"}]}';

    let parsed = null;
    try {
      const parts = await Promise.all(urls.map(window._imgPart));
      parsed = await callModel('scan', [...parts, { type: 'text', text: prompt }], 1400);
    } catch (e) { console.error('room scan', e); }
    if (!parsed || !Array.isArray(parsed.items) || !parsed.items.length) {
      window.toast('Could not read the room \u2014 the photos are filed, add the items by hand', 1);
      if (window.render) window.render();
      return;
    }
    confirmScan(vid, room, urls, parsed.items);
  }

  function confirmScan(vid, room, urls, items) {
    window._scanDraft = { vid: vid, room: room, urls: urls, items: items };
    window.modal('Found ' + items.length + ' item' + (items.length === 1 ? '' : 's') + ' in the ' + esc(room),
      '<p class="hint" style="margin:0 0 12px">Every photograph is attached to every item, because they were taken of ' +
      'the room as a whole. Untick anything that is not there, and edit anything that is wrong \u2014 this wording is ' +
      'what a check-out gets compared against.</p>' +
      items.map((it, i) => '<div style="border-top:1px solid var(--border);padding:9px 0">' +
        '<label style="display:flex;gap:9px;align-items:flex-start">' +
        '<input type="checkbox" class="sc-on" data-i="' + i + '" checked style="margin-top:9px">' +
        '<span style="flex:1">' +
        '<input class="sc-item" data-i="' + i + '" value="' + esc(it.item || '') + '" ' +
        'style="width:100%;font-weight:600;margin-bottom:5px">' +
        '<textarea class="sc-sum" data-i="' + i + '" rows="2" style="width:100%;font-size:12.5px">' +
        esc(it.summary || '') + '</textarea>' +
        '<span class="faint" style="font-size:11px">' + esc(it.condition || '') + '</span>' +
        '</span></label></div>').join(''),
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn navy" onclick="NexLetCapture.commitScan()">Add to the inventory</button>', true);
  }

  function commitScan() {
    const d = window._scanDraft; if (!d) return;
    const v = (ST().inventories2 || []).find(x => x.id === d.vid); if (!v) return;
    const on = [...document.querySelectorAll('.sc-on')].filter(x => x.checked).map(x => +x.getAttribute('data-i'));
    if (!on.length) { window.toast('Nothing ticked', 1); return; }
    const get = (cls, i) => { const el = document.querySelector('.' + cls + '[data-i="' + i + '"]'); return el ? el.value.trim() : ''; };
    on.forEach(i => {
      const src = d.items[i];
      v.rooms.push({
        room: d.room, item: get('sc-item', i) || src.item || 'Item',
        checkin: { photos: d.urls.slice(), note: get('sc-sum', i) || src.summary || '', condition: src.condition || '' },
        checkout: { photos: [], note: '' }, visits: [],
        classification: '', charge: 0, reasoning: '', breakdown: '', estCost: 0, ageAtCheckin: 0,
        lifeYears: window._usefulLife ? window._usefulLife(get('sc-item', i) || src.item) : 6
      });
    });
    learn(on.map(i => ({ was: (d.items[i] || {}).summary || '', now: get('sc-sum', i) })));
    window._invTabs = window._invTabs || {};
    window._invTabs[d.vid] = v.rooms.length - 1;
    window._scanDraft = null;
    if (window.pushInv2) window.pushInv2(v);
    if (window.NexLetAudit) window.NexLetAudit.log({ action: 'inventory.scanned', entity: 'tenancy',
      entityId: v.tenantId || '', entityLabel: ((window.P && window.P(v.propertyId)) || {}).address || '',
      detail: { room: d.room, itemsAdded: on.length, photos: d.urls.length, model: MODEL_CHEAP } });
    window.closeModal(); if (window.render) window.render();
    window.toast('\u2713 Added ' + on.length + ' item' + (on.length === 1 ? '' : 's') + ' to ' + d.room);
  }

  /* ── Model call with fallback ──────────────────────────────────────────── */
  /* The cheap model is a preference, not a requirement. If the proxy will not
     serve it the call is retried on the full one rather than failing, because an
     inventory that does not get written is more expensive than any model. */
  async function callModel(type, content, maxTokens) {
    const AG = window.AG_EDGE || 'https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/ai-proxy';
    const tryOne = async model => {
      const res = await fetch(AG, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window._sessionToken },
        body: JSON.stringify({ model: model, max_tokens: maxTokens || 900, messages: [{ role: 'user', content: content }] }) });
      const data = await res.json().catch(() => ({}));
      return { res: res, data: data };
    };
    let first = modelFor(type);
    let out = await tryOne(first);
    if (!out.res.ok && out.res.status !== 402 && first !== MODEL_FULL) {
      console.warn('cheap model unavailable, retrying on ' + MODEL_FULL, out.data);
      out = await tryOne(MODEL_FULL);
    }
    if (out.res.status === 402) { window.toast(await window.aiFailMsg(out.res, 'try again next month'), 1); return null; }
    if (!out.res.ok) { console.error('callModel', out.res.status, out.data); return null; }
    const txt = ((out.data.content && out.data.content[0] && out.data.content[0].text) || '')
      .replace(/```json|```/g, '').trim();
    try { return JSON.parse(txt); } catch (e) { console.error('callModel: bad JSON', txt); return null; }
  }

  /* ── Report fragments ──────────────────────────────────────────────────── */
  /* What a report says about where its photographs came from. An adjudicator
     asked to rely on a photograph is entitled to know when it was taken. */
  function provenanceBlock(v, urls) {
    const list = (urls || []).map(u => ({ u: u, m: meta(v, u) })).filter(x => x.m);
    if (!list.length) return '';
    const taken = list.map(x => x.m.takenAt).filter(Boolean).sort();
    const none = list.filter(x => !x.m.takenAt).length;
    return '<div style="font-size:11px;color:#8A7D6E;margin-top:5px;line-height:1.55">' +
      (taken.length
        ? 'Photograph' + (taken.length === 1 ? '' : 's') + ' taken ' +
          (taken[0] === taken[taken.length - 1] ? fmt(taken[0]) : fmt(taken[0]) + ' to ' + fmt(taken[taken.length - 1]))
        : 'No capture time recorded') +
      (none ? ' \u00b7 ' + none + ' without a capture time in the file' : '') + '</div>';
  }

  function thumbStamp(v, url) {
    const p = provenance(v, url);
    if (p.k === 'ok') return '';
    return '<div title="' + esc(p.label) + '" style="position:absolute;bottom:-3px;left:-3px;width:13px;height:13px;' +
      'border-radius:50%;background:var(--amber);color:#fff;font-size:9px;line-height:13px;text-align:center;' +
      'font-weight:700">!</div>';
  }

  /* The cleanliness standards, as the report states them. Cleaning is the
     largest category of dispute, and the whole question is what standard the
     property was handed over in. */
  function cleanReportBlock(v) {
    const map = (v && v.cleanliness) || {};
    const rooms = Object.keys(map);
    if (!rooms.length) return '';
    return '<div style="padding:14px 24px;border-bottom:1px solid #EEF1F5">' +
      '<div style="font-size:10px;font-weight:700;letter-spacing:.5px;color:#94A3B8;text-transform:uppercase;' +
      'margin-bottom:7px">Cleanliness at check-in</div>' +
      rooms.map(rm => '<div style="display:flex;justify-content:space-between;gap:12px;font-size:11.5px;' +
        'color:#5B6473;padding:2px 0"><span>' + esc(rm) + '</span>' +
        '<b style="color:#1B2F4A">' + esc(cleanLabel(map[rm].standard)) + '</b></div>').join('') +
      '<div style="font-size:10.5px;color:#94A3B8;margin-top:6px;line-height:1.5">The tenant is required to return ' +
      'the property to the standard recorded above, allowing for fair wear and tear.</div></div>';
  }

  /* The conventions page every professional report opens with. Its job is to say
     what the document does and does not claim, before anyone reads a single
     item — which is most of what makes a report read as an instrument rather
     than a list of photographs. The wording follows standard trade practice. */
  function preamble(agencyName) {
    const li = t => '<li style="margin-bottom:5px">' + t + '</li>';
    return '<div style="padding:16px 24px;border-bottom:1px solid #EEF1F5;background:#FBFCFD">' +
      '<div style="font-size:10px;font-weight:700;letter-spacing:.5px;color:#94A3B8;text-transform:uppercase;' +
      'margin-bottom:8px">How to read this report</div>' +
      '<ul style="margin:0;padding-left:17px;font-size:11px;color:#5B6473;line-height:1.6">' +
      li('Every item is listed with its description first, then its condition, then any defect and where it is.') +
      li('<b>All items are in good clean condition unless otherwise stated.</b> Where a mark, chip, stain or ' +
         'damage is recorded, it was present at check-in and is not chargeable to the tenant.') +
      li('Hairline settlement cracking to walls and ceilings is accepted and is not recorded unless significant.') +
      li('Condition is rated on a fixed scale: New, Good, Fair wear and tear, Worn, Damaged.') +
      li('This report covers the landlord\u2019s fixtures, fittings, furnishings and contents. It is not a survey, ' +
         'and it is not prepared by an expert in buildings, decoration or the valuation of contents.') +
      li('Photographs are dated where the file carried a capture time. Where it did not, the report says so ' +
         'rather than implying otherwise.') +
      li('The tenant should record anything they disagree with during the review period. Anything not raised in ' +
         'that period is taken as agreed.') +
      '</ul></div>';
  }

  window.NexLetCapture = { exifTaken, sha256, record, meta, provenance, provenanceBlock, thumbStamp,
    scan, commitScan, setClean, cleanFor, cleanLabel, cleanPanel, CLEAN, callModel, modelFor,
    MODEL_FULL, MODEL_CHEAP, fmt, keyFor, cleanReportBlock, houseStyle, learn, learned, preamble };
})();
