/* ============================================================================
   nexlet-search.js — finding things

   Two surfaces, one index:

   1. Command palette (⌘K / Ctrl-K, or the topbar box). Searches every record
      type at once and jumps straight to it. This is the one that scales: at 200
      properties you don't want to scroll a list, you want to type "wilbraham"
      and land on it. Ranked so exact prefix matches beat mid-string ones,
      keyboard-driven throughout.

   2. Inline filter on list pages. A single row above the list, no chrome.

   Both read live from S, so there is no index to invalidate. Deliberately no
   fuzzy matching — a lettings agent typing a postcode wants that postcode, and
   fuzzy scoring on 25 properties returns noise.
   ============================================================================ */
(function () {
  'use strict';

  const esc2 = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* agent.html declares `let S` / `const NAV` at the top level of a classic
     script. Those live in the global lexical environment, NOT on window, so
     window.S is permanently undefined. A bare reference resolves correctly
     across scripts — the same way nexlet-calendar.js and nexlet-comms.js read
     state. Guarded so the module cannot throw if it ever loads first. */
  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };
  const NAVS = () => { try { return (typeof NAV !== 'undefined' && NAV) ? NAV : []; } catch (e) { return []; } };
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();

  /* ---- the index ---------------------------------------------------------- */
  /* Each source yields {t: type label, ic: glyph, title, sub, terms, go}.
     `terms` is everything searchable joined — address, postcode, names, emails,
     phone, reference numbers. Postcode without the space matters: people type
     "m139pl" as often as "M13 9PL". */
  function collect() {
    const s = ST(), out = [];
    const L = id => (s.landlords || []).find(x => x.id === id) || {};
    const P = id => (s.properties || []).find(x => x.id === id) || {};
    const nm = l => l.name || [l.firstName, l.lastName].filter(Boolean).join(' ') || '—';

    (s.properties || []).forEach(p => {
      const l = L(p.landlordId);
      out.push({
        t: 'Property', ic: '⌂',
        title: p.address || '—',
        sub: [p.city, p.postcode, p.beds && p.beds + ' bed', nm(l)].filter(Boolean).join(' · '),
        terms: [p.address, p.city, p.postcode, (p.postcode || '').replace(/\s/g, ''), nm(l), p.ptype],
        go: () => window.go('property', p.id)
      });
    });

    (s.landlords || []).forEach(l => out.push({
      t: 'Landlord', ic: '👤',
      title: nm(l),
      sub: [l.email, l.phone, (s.properties || []).filter(p => p.landlordId === l.id).length + ' propert' +
        ((s.properties || []).filter(p => p.landlordId === l.id).length === 1 ? 'y' : 'ies')].filter(Boolean).join(' · '),
      terms: [nm(l), l.email, l.phone, l.company, l.addr1, l.postcode],
      go: () => window.go('landlord', l.id)
    }));

    /* Tenants are the most-searched thing in a lettings office and had no list
       page at all, so the palette is the only way to reach one by name. */
    (s.tenants || []).forEach(t => {
      const p = P(t.propertyId);
      const people = [t.name, ...(t.people || []).map(x => x.name), ...(t.occupiers || []).map(x => x.name)].filter(Boolean);
      out.push({
        t: 'Tenant', ic: '🔑',
        title: people[0] || '—',
        sub: [p.address, people.length > 1 ? '+' + (people.length - 1) + ' more' : '', t.email].filter(Boolean).join(' · '),
        terms: [...people, t.email, t.phone, p.address, p.postcode],
        go: () => p.id ? window.go('property', p.id) : window.go('dashboard')
      });
    });

    (s.invoices || []).forEach(i => {
      const l = L(i.landlordId);
      out.push({
        t: 'Invoice', ic: '£',
        title: (i.number || i.id) + ' — ' + nm(l),
        sub: [i.status, i.date && window.fmtDate ? window.fmtDate(i.date) : i.date].filter(Boolean).join(' · '),
        terms: [i.number, i.id, nm(l), i.status, i.ref],
        go: () => window.go('invoice', i.id)
      });
    });

    (s.notices || []).forEach(n => {
      const p = P(n.propertyId);
      out.push({
        t: 'Notice', ic: '§',
        title: (n.type || 'Notice') + ' — ' + (p.address || '—'),
        sub: [n.status, n.servedAt && window.fmtDate ? window.fmtDate(n.servedAt) : ''].filter(Boolean).join(' · '),
        terms: [n.type, p.address, p.postcode, n.status, n.grounds],
        go: () => window.go('notice', n.id)
      });
    });

    (s.jobs || []).forEach(j => {
      const p = P(j.propertyId);
      out.push({
        t: 'Repair', ic: '⚒',
        title: j.title || j.desc || 'Repair',
        sub: [p.address, j.status, j.contractor].filter(Boolean).join(' · '),
        terms: [j.title, j.desc, p.address, p.postcode, j.contractor, j.status],
        go: () => window.go('maintenance')
      });
    });

    (s.inventories2 || []).forEach(v => {
      const p = P(v.propertyId);
      out.push({
        t: 'Inventory', ic: '📋',
        title: p.address || '—',
        sub: [v.status, (v.rooms || []).length + ' items'].filter(Boolean).join(' · '),
        terms: [p.address, p.postcode, v.status],
        go: () => window.go('inventorydetail', v.id)
      });
    });

    /* Pages themselves, so ⌘K doubles as navigation — "compliance" should take
       you to Compliance without hunting the sidebar. */
    NAVS().forEach(n => out.push({
      t: 'Page', ic: n.ic || '›', title: n.t, sub: n.grp || '',
      terms: [n.t, n.grp], go: () => window.go(n.k)
    }));

    return out;
  }

  /* ---- ranking ----------------------------------------------------------- */
  /* Prefix match on the title outranks everything, then title-contains, then a
      hit anywhere in the terms. Keeps "mill" from putting a repair note above
      21 Mill Lane. */
  function rank(items, q) {
    const nq = norm(q);
    if (!nq) return [];
    const words = nq.split(' ').filter(Boolean);
    return items.map(it => {
      const title = norm(it.title);
      const hay = norm([it.title, it.sub, ...(it.terms || [])].filter(Boolean).join(' '));
      if (!words.every(w => hay.includes(w))) return null;
      let score = 0;
      if (title.startsWith(nq)) score = 100;
      else if (title.includes(nq)) score = 70;
      else if (hay.includes(nq)) score = 40;
      else score = 20;
      if (it.t === 'Page') score -= 5;
      return { it, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.it.title.localeCompare(b.it.title))
      .slice(0, 40).map(x => x.it);
  }

  /* ---- palette ----------------------------------------------------------- */
  let open = false, results = [], cursor = 0;

  function shell() {
    let el = document.getElementById('nx-pal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'nx-pal';
    el.style.cssText = 'position:fixed;inset:0;z-index:9000;display:none;background:rgba(15,31,50,.34);' +
      'backdrop-filter:blur(2px);align-items:flex-start;justify-content:center;padding-top:11vh';
    el.innerHTML =
      '<div style="width:min(660px,92vw);background:#fff;border:1px solid var(--border);border-radius:14px;' +
      'box-shadow:0 24px 64px rgba(11,30,61,.28);overflow:hidden" onclick="event.stopPropagation()">' +
      '<div style="display:flex;align-items:center;gap:11px;padding:15px 18px;border-bottom:1px solid var(--border)">' +
      '<span style="font-size:15px;color:var(--faint)">⌕</span>' +
      '<input id="nx-pal-q" placeholder="Search properties, landlords, tenants, invoices\u2026" autocomplete="off" ' +
      'style="flex:1;border:none;padding:0;font-size:15px;background:none;color:var(--navy);font-family:inherit">' +
      '<span style="font-size:10px;font-weight:700;color:var(--faint);border:1px solid var(--border);' +
      'border-radius:5px;padding:2px 6px">ESC</span></div>' +
      '<div id="nx-pal-r" style="max-height:min(56vh,460px);overflow:auto"></div></div>';
    el.onclick = close;
    document.body.appendChild(el);
    const q = el.querySelector('#nx-pal-q');
    q.addEventListener('input', () => { cursor = 0; paint(q.value); });
    q.addEventListener('keydown', key);
    return el;
  }

  function paint(q) {
    results = rank(collect(), q);
    const box = document.getElementById('nx-pal-r');
    if (!q.trim()) {
      box.innerHTML = '<div style="padding:26px 20px;text-align:center;font-size:12.5px;color:var(--faint)">' +
        'Type an address, postcode, name, or invoice number.</div>';
      return;
    }
    if (!results.length) {
      box.innerHTML = '<div style="padding:26px 20px;text-align:center;font-size:12.5px;color:var(--faint)">' +
        'Nothing matches \u201c' + esc2(q) + '\u201d.</div>';
      return;
    }
    let last = null;
    box.innerHTML = results.map((it, i) => {
      let hdr = '';
      if (it.t !== last) {
        hdr = '<div style="padding:9px 18px 5px;font-size:10px;font-weight:700;letter-spacing:.08em;' +
          'text-transform:uppercase;color:var(--faint);background:var(--off)">' + esc2(it.t) + '</div>';
        last = it.t;
      }
      return hdr + '<div class="nx-pal-row" data-i="' + i + '" onmouseenter="NexLetSearch._hover(' + i + ')" ' +
        'onclick="NexLetSearch._pick(' + i + ')" style="display:flex;align-items:center;gap:12px;padding:10px 18px;' +
        'cursor:pointer;border-bottom:1px solid #F6F0E4;background:' + (i === cursor ? 'var(--off)' : '#fff') + '">' +
        '<span style="width:22px;text-align:center;font-size:13px;color:var(--faint)">' + esc2(it.ic) + '</span>' +
        '<span style="flex:1;min-width:0"><span style="display:block;font-size:13.5px;font-weight:600;' +
        'color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc2(it.title) + '</span>' +
        (it.sub ? '<span style="display:block;font-size:11.5px;color:var(--muted);white-space:nowrap;' +
          'overflow:hidden;text-overflow:ellipsis">' + esc2(it.sub) + '</span>' : '') + '</span>' +
        (i === cursor ? '<span style="font-size:11px;color:var(--faint)">\u21b5</span>' : '') + '</div>';
    }).join('');
  }

  function key(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!results.length) return;
      cursor = (cursor + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      paint(document.getElementById('nx-pal-q').value);
      const row = document.querySelector('.nx-pal-row[data-i="' + cursor + '"]');
      if (row) { const b = row.parentElement, r = row.offsetTop; if (r < b.scrollTop || r > b.scrollTop + b.clientHeight - 60) b.scrollTop = r - 60; }
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); pick(cursor); }
  }

  function pick(i) {
    const it = results[i];
    if (!it) return;
    close();
    try { it.go(); } catch (err) { if (window.toast) window.toast('Could not open that record', 1); }
  }

  function show() {
    const el = shell();
    el.style.display = 'flex';
    open = true; cursor = 0;
    const q = el.querySelector('#nx-pal-q');
    q.value = ''; paint('');
    setTimeout(() => q.focus(), 30);
  }
  function close() {
    const el = document.getElementById('nx-pal');
    if (el) el.style.display = 'none';
    open = false;
  }

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open ? close() : show(); }
  });

  /* ---- inline list filter ------------------------------------------------ */
  /* State lives on window, not in S, so filters never persist into a save and
     never sync to another device. Cleared when you leave the page. */
  const F = () => (window._nxFilter = window._nxFilter || {});

  function bar(key, placeholder, count, total) {
    const v = F()[key] || '';
    const showing = v && count !== total;
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
      '<div style="position:relative;flex:1;max-width:340px">' +
      '<span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:13px;' +
      'color:var(--faint);pointer-events:none">⌕</span>' +
      '<input id="nxf-' + esc2(key) + '" value="' + esc2(v) + '" placeholder="' + esc2(placeholder || 'Filter\u2026') + '" ' +
      'autocomplete="off" oninput="NexLetSearch._set(\'' + esc2(key) + '\',this.value)" ' +
      'style="padding-left:31px' + (v ? ';padding-right:30px;border-color:var(--navy)' : '') + '">' +
      (v ? '<span onclick="NexLetSearch._set(\'' + esc2(key) + '\',\'\')" title="Clear" ' +
        'style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:13px;color:var(--faint);' +
        'cursor:pointer">\u00d7</span>' : '') + '</div>' +
      (showing ? '<span style="font-size:12px;color:var(--muted)">' + count + ' of ' + total + '</span>' : '') +
      '<span style="margin-left:auto;font-size:11px;color:var(--faint)">' +
      '<b style="font-weight:700">' + (navigator.platform.indexOf('Mac') >= 0 ? '\u2318K' : 'Ctrl K') +
      '</b> to search everything</span></div>';
  }

  /* Filter a list by any number of accessor functions. Multi-word: every word
     must appear somewhere, so "mill vacant" narrows rather than widens. */
  function filter(key, list, fields) {
    const q = norm(F()[key] || '');
    if (!q) return list;
    const words = q.split(' ').filter(Boolean);
    return (list || []).filter(item => {
      const hay = norm(fields.map(f => { try { return f(item); } catch (e) { return ''; } }).join(' '));
      return words.every(w => hay.includes(w));
    });
  }

  function set(key, val) {
    F()[key] = val;
    if (window.render) window.render();
    /* Re-focus and restore the caret: render() rebuilds the DOM, so without this
       the field loses focus after the first keystroke. */
    setTimeout(() => {
      const el = document.getElementById('nxf-' + key);
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 0);
  }

  function empty(key, label) {
    const v = F()[key];
    if (!v) return '';
    return '<div class="empty" style="padding:26px 20px;text-align:center">' +
      '<span style="font-size:12.5px;color:var(--muted)">No ' + esc2(label) + ' match \u201c' + esc2(v) + '\u201d. ' +
      '<a href="#" onclick="event.preventDefault();NexLetSearch._set(\'' + esc2(key) + '\',\'\')" ' +
      'style="color:var(--navy);font-weight:600">Clear filter</a></span></div>';
  }

  window.NexLetSearch = {
    open: show, close, bar, filter, empty,
    _set: set, _pick: pick, _hover(i) { cursor = i; paint(document.getElementById('nx-pal-q').value); },
    active: key => !!F()[key]
  };
})();
