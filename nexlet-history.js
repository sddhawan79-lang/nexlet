/* nexlet-history.js — the service history for a tenancy.
 *
 * WHY
 *
 * "Was this served, when, on whom, and by what route" was answerable only by
 * reading four different panels and trusting that each flag matched reality.
 * Twice that cost us: a document was served with a stale date on it, and nobody
 * could see it, because the page showed only "✓ served" with no date beside the
 * date of the thing that had been served.
 *
 * So this is one timestamped list per tenancy, assembled from the records that
 * already exist — filed letter copies, the served-stamp inside each copy,
 * e-signature rows, and the hand-recorded stamps on the tenancy. Nothing new is
 * written, which means the history cannot drift from what actually happened: if
 * a copy was filed, it is here; if it was not, it is not.
 *
 * The second half is the part that earns its keep: the same data, read the other
 * way round, tells you when a served copy has since gone out of date — a
 * certificate renewed after it was sent, a deposit certificate filed after the
 * prescribed information went out, an agreement superseded after the signed copy
 * was issued. Each of those is a document the tenant holds that no longer
 * matches the file, and each was previously invisible.
 *
 * Everything asking "was this served" goes through servedOn(), which unions the
 * three routes service can take — a filed copy's served-stamp, a hand-recorded
 * stamp on the tenancy, and an e-signature completion. Consulting those
 * separately is what let the list and the warnings contradict each other.
 */
(function () {
  'use strict';

  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };
  const esc = s => (window.esc ? window.esc(s) : String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  const escJs = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const day = d => { try { return d && window.fmtDate ? window.fmtDate(d) : ''; } catch (e) { return ''; } };
  const stamp = iso => { const d = new Date(iso); return isNaN(d) ? '—'
    : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const dOnly = iso => { const d = new Date(iso); return isNaN(d) ? '—'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
  const after = (a, b) => !!(a && b) && new Date(a) > new Date(b);
  const days = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000);

  /* Letter type → what it is called on the page. Falls through to the template
     registry so a custom template does not read as its key. */
  const TYPE = {
    serve_tenant: 'Tenant document pack', serve_landlord: 'Landlord document pack',
    move_in_monies: 'Move-in monies request', condensation: 'Condensation and mould annexe',
    notice: 'Notice', household: 'Household composition declaration',
    signed_copy: 'Signed tenancy agreement', pi: 'Prescribed information',
    welcome: 'Welcome letter', fee_change: 'Fee change notice',
    rent_statement: 'Rent statement', statement: 'Landlord statement',
    invoice: 'Invoice', valuation: 'Valuation report',
    movein_pack: 'Move-in document pack', keyterms: 'Written key terms',
    inventory: 'Inventory and schedule of condition', checkout: 'End-of-tenancy pack'
  };
  const typeLabel = t => TYPE[t] ||
    (window.tplByKey && (window.tplByKey(t) || {}).name) || t || 'Document';

  /* Registry keys, as they appear inside the served-stamp on a filed copy. */
  const KEY = {
    infosheet: 'Renters\u2019 Rights Act Information Sheet 2026', keyterms: 'Written key terms',
    gas: 'Gas safety record', eicr: 'Electrical installation report (EICR)',
    epc: 'Energy performance certificate', pi: 'Prescribed information',
    depcert: 'Deposit protection certificate', agreement: 'Signed tenancy agreement',
    leaflet: 'Deposit scheme information leaflet',
    receipt: 'Receipt of documents', inventory: 'Inventory and schedule of condition',
    alarms: 'Alarm test record', meters: 'Meter readings at check-in',
    propinfo: 'Property information',
    household: 'Household composition declaration'
  };

  const agreementsFor = tid => (ST().tenancyAgreements || []).filter(a => a.tenant_id === tid);
  const DOCT = { tenancy: 'Tenancy agreement', household: 'Household composition declaration',
                 condensation: 'Condensation and mould annexe', management: 'Management agreement' };

  /* ── One resolver: was this document served, by ANY route? ───────────────
     Three things can evidence service and they were being consulted separately,
     which let the list and the warnings contradict each other: a document served
     inside the pack is enumerated in that copy's served-stamp and never files a
     letter of its own type, so a check that looked only at letter types reported
     it missing while the list showed it sent.

     Precedence follows what agent.html already does by hand in serveDocsPanel and
     _tenancyChecklist — the LATER of the two records wins, so a re-send is never
     masked by an older date held elsewhere. Deliberately not a third rule. */
  const later = (a, b) => !a ? (b || null) : !b ? a : (new Date(a) >= new Date(b) ? a : b);
  const sameDay = (a, b) => {
    if (!a || !b) return false;
    const x = new Date(a), y = new Date(b);
    return !isNaN(x) && !isNaN(y) && x.toDateString() === y.toDateString();
  };

  /* Hand-recorded stamps, and the registry key each one evidences where the serve
     pack carries the same document. A stamp with no registry key is deduped on
     its letter type alone, which already works. */
  const HAND = [
    ['welcomeSentAt', 'Welcome letter', 'welcome', null],
    ['moniesSentAt', 'Move-in monies request', 'move_in_monies', null],
    ['moveInPackSentAt', 'Move-in document pack', 'movein_pack', null],
    ['piServedAt', 'Prescribed information', 'pi', 'pi'],
    ['condensationSentAt', 'Condensation and mould annexe', 'condensation', null],
    ['checkoutPackSentAt', 'End-of-tenancy pack', 'checkout', null],
    ['invitedAt', 'Tenant portal invitation', '__portal', null],
    ['keysHandedAt', 'Keys handed over', '__keys', null],
    ['landlordDepositConfirmedAt', 'Landlord confirmed the deposit is protected', '__dep', null]
  ];

  function servedOn(pid) {
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    const out = Object.assign({}, (window.NexLetServe && window.NexLetServe.servedKeys)
      ? window.NexLetServe.servedKeys(pid) : {});
    const put = (k, v) => { if (k && v) out[k] = later(out[k], v); };
    HAND.forEach(([f, , , key]) => put(key, rec[f]));
    /* A signed agreement or declaration IS service of that document — the tenant
       has it, by definition, because they signed it. */
    agreementsFor(rec.id).forEach(a => {
      if (a.status !== 'signed') return;
      put({ tenancy: 'agreement', household: 'household' }[a.doc_type || 'tenancy'],
        a.completed_at || a.updated_at || a.created_at);
    });
    return out;
  }

  /* ── Events ──────────────────────────────────────────────────────────────
     Every source is read-only. A hand-recorded stamp is dropped where a filed
     copy already evidences the same service — as a letter of that type, or
     enumerated inside a pack's served-stamp on the same day — so a single send
     is never listed twice under two different times. */
  function events(pid) {
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    const ev = [];

    const letters = (ST().letters || []).filter(x => x.property_id === pid);
    const seenTypes = {};
    letters.forEach(x => {
      seenTypes[x.type] = true;
      /* fileLetter appends the recipients to the subject. Split them back out so
         the list can show who it went to rather than a subject line with an
         email address glued on the end. */
      const subj = String(x.subject || '');
      const cut = subj.lastIndexOf(' \u2014 ');
      const tail = cut > -1 ? subj.slice(cut + 3) : '';
      const to = /@/.test(tail) ? tail.split(/,\s*/) : [];
      const m = String(x.body_html || '').match(/<!--nexlet-served:([^>]*)-->/);
      const carried = m ? m[1].split(',').filter(Boolean).map(k => KEY[k] || k) : [];
      ev.push({ at: x.created_at, ref: 'lt:' + (x.id || x.created_at), doc: typeLabel(x.type), to: to, route: 'Email',
        status: x.status === 'sent' ? 'Sent' : (x.status || 'Filed'), carried: carried,
        html: x.body_html || '', subject: subj.slice(0, cut > -1 ? cut : undefined) });
    });

    agreementsFor(rec.id).forEach(a => {
      const what = DOCT[a.doc_type || 'tenancy'] || 'Agreement';
      const sigs = a.signatories || [];
      ev.push({ at: a.created_at, ref: 'ag:' + a.id, doc: what + ' \u2014 sent for signature',
        to: sigs.map(s => s.email || s.name).filter(Boolean), route: 'E-signature',
        status: 'Sent', html: a.document_html || '' });
      sigs.filter(s => s.signed_at).forEach((s, n) => {
        ev.push({ at: s.signed_at, ref: 'sg:' + a.id + ':' + (s.email || s.name || n),
          doc: what + ' \u2014 signed by ' + (s.name || s.email || 'signatory'),
          to: [], route: 'E-signature', status: 'Signed', html: a.document_html || '' });
      });
    });

    /* Hand-recorded stamps. Each is a document the agent confirmed went out by a
       route NexLet did not carry, so the route reads honestly. Skipped where a
       filed copy already evidences the same service — either as a letter of that
       type, or enumerated inside a pack's served-stamp on the same day. */
    const srvKeys = (window.NexLetServe && window.NexLetServe.servedKeys)
      ? window.NexLetServe.servedKeys(pid) : {};
    HAND.forEach(([f, lab, type, key]) => {
      if (!rec[f] || seenTypes[type]) return;
      if (key && srvKeys[key] && sameDay(srvKeys[key], rec[f])) return;
      ev.push({ at: rec[f], doc: lab, to: [], route: 'Recorded', status: 'Recorded' });
    });

    /* Failed sends are the ones worth surfacing loudest: the flag on the page
       says served, and nothing arrived. */
    if (window.NexLetComms && window.NexLetComms.rows) {
      window.NexLetComms.rows()
        .filter(r => r.delivery === 'failed' && r.entity === 'tenancy' && String(r.entity_id) === String(rec.id))
        .forEach(r => ev.push({ at: r.at, doc: r.subject || 'Email', to: [r.party], route: 'Email',
          status: 'Failed', error: r.error || '' }));
    }

    return ev.filter(e => e.at).sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  /* ── What has gone out of date since it was served ───────────────────── */
  function warnings(pid) {
    const p = (window.P && window.P(pid)) || {};
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    const c = p.certs || {};
    const srv = servedOn(pid);
    const out = [];

    /* Declared up here because the gaps check below excludes these two keys: the
       deadline check reports them by name and by date, and one fact must not
       produce three red blocks. */
    const START_DUE = { infosheet: 'Renters’ Rights Act Information Sheet 2026', keyterms: 'Written key terms' };
    const dayMs = iso => { const d = new Date(iso); return isNaN(d) ? NaN
      : new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

    [['gas', 'Gas safety record', c.gas], ['eicr', 'Electrical installation report', c.eicr],
     ['epc', 'Energy performance certificate', c.epc]].forEach(([k, lab, on]) => {
      if (srv[k] && after(on, srv[k])) out.push({ sev: 'amber',
        t: lab + ' has been renewed since it was served',
        d: 'Served ' + day(srv[k]) + '. The record on file is now dated ' + day(on) +
           ', so the tenant holds the superseded one. Serve the current version.' });
    });

    if (srv.pi && rec.depositCertUrl && !srv.depcert)
      out.push({ sev: 'amber', t: 'The deposit protection certificate has not gone out with the prescribed information',
        d: 'The certificate is on file but no filed copy shows it reaching the tenant. It should be given with the prescribed information.' });

    const piAt = srv.pi;
    if (rec.depositReceived && piAt && after(rec.depositReceived, piAt))
      out.push({ sev: 'red', t: 'Prescribed information was served before the deposit was received',
        d: 'Served ' + day(piAt) + ', deposit received ' + day(rec.depositReceived) +
           '. The date-received field on the copy the tenant holds is therefore wrong or blank. Serve it again.' });
    if (rec.depositReceived && piAt && days(piAt, rec.depositReceived) > 30)
      out.push({ sev: 'red', t: 'Prescribed information was served outside the 30-day window',
        d: 'Deposit received ' + day(rec.depositReceived) + ', served ' + day(piAt) + ' \u2014 ' +
           days(piAt, rec.depositReceived) + ' days. The penalty is one to three times the deposit and it blocks possession.' });
    if (rec.depositReceived && !piAt && days(new Date().toISOString(), rec.depositReceived) > 23)
      out.push({ sev: 'red', t: 'Prescribed information still not served',
        d: 'Deposit received ' + day(rec.depositReceived) + '. ' +
           Math.max(0, 30 - days(new Date().toISOString(), rec.depositReceived)) + ' days left of the 30.' });

    /* A newer agreement created after the signed copy was issued means the copy
       the tenant holds is not the agreement on file. */
    const ags = agreementsFor(rec.id).filter(a => (a.doc_type || 'tenancy') === 'tenancy')
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (srv.agreement && ags[0] && after(ags[0].created_at, srv.agreement))
      out.push({ sev: 'amber', t: 'The tenancy agreement was replaced after the signed copy was served',
        d: 'Copy served ' + day(srv.agreement) + '; the current agreement was raised ' + day(ags[0].created_at) +
           '. Issue the signed copy of the current one.' });

    /* Excludes anything the countdown banner already names on the same page. The
       banner is strictly the better report — it carries the deadline and the
       action — so one fact must not appear in both. */
    const onBanner = (dueBeforeStart(pid) || {}).keys || [];
    if (window.NexLetServe && window.NexLetServe.items) {
      const gaps = window.NexLetServe.items(pid, 'tenant')
        .filter(x => x.required && !srv[x.key] && onBanner.indexOf(x.key) < 0
          && !(rec.start && START_DUE[x.key]));
      if (gaps.length) out.push({ sev: 'red',
        t: gaps.length + ' required document' + (gaps.length === 1 ? '' : 's') + ' with no record of service',
        d: gaps.map(x => x.label).join(', ') + '. Nothing in the history shows these reaching the tenant.' });
    }
    /* The Information Sheet and the written key terms are due before the tenancy
       STARTS — not before the tenant occupies. Those differ whenever the start
       date lands before the handover appointment, which is common, and serving at
       handover is then already late. Penalty up to £7,000 and it blocks
       possession, so this is the one deadline worth checking on its own.

       Compared by DATE, not by instant: serving at 09:00 on the start date is not
       reported as late, because with money-then-signing-then-handover the serve
       date and the start date land on the same day on most tenancies. Same-day is
       amber instead — legal if it precedes occupation, but with no margin. */
    if (rec.start) {
      const started = dayMs(rec.start) <= dayMs(new Date().toISOString());
      Object.keys(START_DUE).forEach(k => {
        if (srv[k] && dayMs(srv[k]) > dayMs(rec.start))
          out.push({ sev: 'red', t: START_DUE[k] + ' was served after the tenancy had started',
            d: 'Tenancy started ' + day(rec.start) + ', served ' + day(srv[k]) +
               '. It was due before the start date, not before handover. Penalty up to £7,000 and it blocks possession.' });
        else if (srv[k] && dayMs(srv[k]) === dayMs(rec.start))
          out.push({ sev: 'amber', t: START_DUE[k] + ' was served on the start date itself',
            d: 'Served ' + day(srv[k]) + ', the day the tenancy began. Compliant only if it reached them before they ' +
               'occupied, and there is no margin if that is ever questioned. Serve it before the start date next time.' });
        else if (started)
          out.push({ sev: 'red', t: START_DUE[k] + ' not served, and the tenancy has started',
            d: 'Due before ' + day(rec.start) + '. Serve it now — late service is better than none — and record the date.' });
      });
    }

    return out.sort((a, b) => (a.sev === 'red' ? 0 : 1) - (b.sev === 'red' ? 0 : 1));
  }

  /* ── Due before the tenancy starts ──────────────────────────────────────
     The warnings above are retrospective — they tell you a deadline was missed.
     These four have a deadline you can still meet, and missing them is the most
     expensive thing on the whole page: up to £7,000 and possession blocked for
     the Information Sheet, one to three times the deposit for the prescribed
     information. So they get counted down to, not reported after.

     Deliberately forward-looking: it escalates as the start date approaches and
     stays on the page until every one of them has gone. */
  function dueBeforeStart(pid) {
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    if (!rec.id || !rec.start) return null;
    const srv = servedOn(pid);
    const dep = parseFloat(rec.deposit) || 0;
    const dayMs = iso => { const d = new Date(iso); return isNaN(d) ? NaN
      : new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
    const left = Math.round((dayMs(rec.start) - dayMs(new Date().toISOString())) / 86400000);

    const want = [
      ['infosheet', 'Renters\u2019 Rights Act Information Sheet 2026', 'up to \u00a37,000 and possession blocked', true],
      ['keyterms', 'Written key terms', 'required for tenancies from 1 May 2026', true],
      ['pi', 'Prescribed information', 'one to three times the deposit, and possession blocked', dep > 0],
      ['leaflet', 'Deposit scheme information leaflet', 'must accompany the prescribed information', dep > 0]
    ].filter(x => x[3] && !srv[x[0]]);

    if (!want.length) return null;
    /* Real bands, so the banner earns attention by changing as the date closes.
       Beyond three weeks it says nothing at all — a banner that looks identical
       and equally alarming for two months is one you learn to skim past. */
    if (left > 21) return null;
    const sev = left < 0 ? 'red' : left <= 2 ? 'red' : left <= 7 ? 'amber' : 'quiet';
    return { items: want, keys: want.map(x => x[0]), left, start: rec.start, sev,
             urgent: left <= 2 };
  }

  function dueBanner(pid) {
    const d = dueBeforeStart(pid);
    if (!d) return '';
    const quiet = d.sev === 'quiet';
    const red = d.sev === 'red';
    const tone = quiet ? 'border' : red ? 'red' : 'amber';
    const ink = quiet ? 'navy' : red ? 'red' : 'amber';
    const when = d.left < 0
      ? 'The tenancy started ' + Math.abs(d.left) + ' day' + (Math.abs(d.left) === 1 ? '' : 's') + ' ago'
      : d.left === 0 ? 'The tenancy starts today'
      : d.left === 1 ? 'The tenancy starts tomorrow'
      : 'The tenancy starts in ' + d.left + ' days';
    return '<div style="margin-bottom:14px;border:1px solid var(--' + tone + ');' +
      'border-left-width:5px;border-radius:10px;padding:15px 18px;background:var(--' +
      (quiet ? 'off' : ink + '-bg') + ')' +
      (d.urgent ? ';animation:nlPulse 1.6s ease-in-out infinite' : '') + '">' +
      '<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:260px">' +
        '<div style="font-size:13.5px;font-weight:700;color:var(--' + ink + ')">' +
          (red ? '\u26a0 ' : '') + when + ' \u00b7 ' + d.items.length + ' document' +
          (d.items.length === 1 ? '' : 's') + ' must reach the tenant ' +
          (d.left < 0 ? 'and had to be served before it began' : 'before it begins') + '</div>' +
        (quiet ? '<div class="faint" style="font-size:11.5px;margin-top:2px">' +
          'Nothing urgent yet — this turns amber a week before the start date.</div>' : '') +
        '<div style="margin-top:9px">' +
          d.items.map(x => '<div style="display:flex;gap:8px;align-items:baseline;padding:3px 0">' +
            '<span style="color:var(--' + ink + ');font-weight:700;font-size:12px">\u2022</span>' +
            '<span style="font-size:12.5px;color:var(--navy)"><b>' + esc(x[1]) + '</b> ' +
            '<span class="faint">\u2014 ' + esc(x[2]) + '</span></span></div>').join('') +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;align-items:flex-start">' +
        '<button class="btn sm' + (quiet ? '' : ' navy') + '" onclick="NexLetServe.open(\'' + escJs(pid) + '\',\'tenant\')">Serve them now</button>' +
        '<button class="btn sm" onclick="NexLetHistory.open(\'' + escJs(pid) + '\')">Service history</button>' +
      '</div></div></div>';
  }

  /* ── Views ──────────────────────────────────────────────────────────────── */
  const ROUTE = { Email: '\u2709', 'E-signature': '\u270e', Recorded: '\u25cb', 'In person': '\u2302' };
  const SEV = { Sent: 'green', Signed: 'green', Recorded: 'amber', Failed: 'red', Filed: 'green' };

  function row(e, i, pid) {
    const col = SEV[e.status] || 'amber';
    return '<div style="display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--border)">' +
      '<div style="width:132px;flex:0 0 auto;font-size:11.5px;color:var(--faint);line-height:1.5">' + stamp(e.at) + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:12.5px;font-weight:600;color:var(--navy)">' +
          (ROUTE[e.route] || '') + ' ' + esc(e.doc) + '</div>' +
        (e.to && e.to.length ? '<div class="faint" style="font-size:11px;margin-top:2px;word-break:break-word">to ' +
          esc(e.to.join(', ')) + '</div>' : '') +
        (e.carried && e.carried.length ? '<div class="faint" style="font-size:11px;margin-top:3px;line-height:1.6">' +
          'Carried: ' + esc(e.carried.join(' \u00b7 ')) + '</div>' : '') +
        (e.error ? '<div style="font-size:11px;color:var(--red);margin-top:2px">' + esc(e.error) + '</div>' : '') +
      '</div>' +
      '<div style="flex:0 0 auto;display:flex;gap:7px;align-items:center">' +
        '<span class="pill" style="background:var(--' + col + '-bg);color:var(--' + col + ')">' + esc(e.status) + '</span>' +
        (e.html && e.ref ? '<button class="btn sm" onclick="NexLetHistory.copy(\'' + escJs(pid) + '\',\'' + escJs(e.ref) + '\')">Open copy</button>' : '') +
      '</div></div>';
  }

  /* Red is a statutory breach with a penalty attached; amber is a document that
     needs reissuing. They must not read alike — triage is the point of the list. */
  function warnBlock(w) {
    const red = w.sev === 'red';
    return '<div style="border:1px solid var(--' + (red ? 'red' : 'amber') + ');' +
      'border-left-width:4px;border-radius:7px;padding:11px 14px;margin-bottom:9px;' +
      'background:var(--' + (red ? 'red' : 'amber') + '-bg)">' +
      '<b style="font-size:12.5px;color:var(--' + (red ? 'red' : 'amber') + ')">' +
      (red ? '\u26a0 ' : '') + esc(w.t) + '</b>' +
      '<div style="font-size:12px;line-height:1.6;color:var(--navy);margin-top:3px">' + esc(w.d) + '</div></div>';
  }

  /* Compact strip for the property page. */
  function panel(pid) {
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    if (!rec.id) return '';
    const ev = events(pid), w = warnings(pid);
    const shown = ev.slice(0, 5);
    return '<div class="panel" style="margin-bottom:14px"><div class="panel-hd">' +
      '<h2 style="font-size:13px">Service history</h2>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<span class="faint" style="font-size:11.5px">' + ev.length + ' recorded' +
          (ev.length ? ' \u00b7 last ' + dOnly(ev[0].at) : '') + '</span>' +
        '<button class="btn sm" onclick="NexLetHistory.open(\'' + escJs(pid) + '\')">See all \u2192</button>' +
      '</div></div>' +
      '<div style="padding:12px 20px 14px">' +
        (w.length ? w.map(warnBlock).join('') : '') +
        (shown.length ? shown.map((e, i) => row(e, i, pid)).join('')
          : '<div class="empty">Nothing has been sent on this tenancy yet.</div>') +
      '</div></div>';
  }

  function open(pid) {
    const p = (window.P && window.P(pid)) || {};
    const ev = events(pid), w = warnings(pid);
    window.modal('Service history \u2014 ' + esc(p.address || ''),
      '<p class="hint" style="margin:0 0 14px">Every document this tenancy has sent or received, in the order it happened, ' +
      'read back from the filed copies rather than from a flag. Where a copy was filed you can open exactly what was sent.</p>' +
      (w.length ? w.map(warnBlock).join('') : '<div class="note ok" style="margin-bottom:12px">' +
        '<b>Nothing served has since gone out of date.</b></div>') +
      '<div style="max-height:52vh;overflow-y:auto;margin-top:4px">' +
        (ev.length ? ev.map((e, i) => row(e, i, pid)).join('') : '<div class="empty">Nothing recorded yet.</div>') +
      '</div>',
      '<button class="btn" onclick="closeModal()">Close</button>' +
      '<button class="btn" onclick="NexLetHistory.print(\'' + escJs(pid) + '\')">Print the history</button>', true);
  }

  function copy(pid, ref) {
    const e = events(pid).find(x => x.ref === ref);
    if (!e || !e.html) { window.toast('No stored copy on file for that entry', 1); return; }
    const w = window.open('', '_blank');
    if (!w) { window.toast('Allow pop-ups to open it', 1); return; }
    w.document.write(e.html); w.document.close();
  }

  /* One sheet, for a deposit dispute or a possession claim: what was served,
     when, on whom, by what route. */
  function print(pid) {
    const p = (window.P && window.P(pid)) || {};
    const rec = (window.tenantRecFor && window.tenantRecFor(pid)) || {};
    const brand = window.agencyBrand ? window.agencyBrand() : { name: 'Agency' };
    const ev = events(pid);
    const cells = ev.map(e =>
      '<tr><td>' + stamp(e.at) + '</td><td><b>' + esc(e.doc) + '</b>' +
      (e.carried && e.carried.length ? '<div style="font-size:10.5px;color:#6B6055;margin-top:2px">' +
        esc(e.carried.join(' \u00b7 ')) + '</div>' : '') + '</td>' +
      '<td>' + esc((e.to || []).join(', ') || '\u2014') + '</td><td>' + esc(e.route) + '</td>' +
      '<td>' + esc(e.status) + '</td></tr>').join('');
    const html = '<!doctype html><meta charset="utf-8"><title>Service history \u2014 ' + esc(p.address || '') + '</title>' +
      '<style>@page{size:A4;margin:18mm 15mm}body{font:12px/1.6 Georgia,serif;color:#2B2620;max-width:190mm;margin:0 auto}' +
      'h1{font-size:19px;margin:0 0 2px;color:#1B2F4A}.sub{color:#6B6055;font-size:12px;margin:0 0 18px}' +
      'table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;font-size:10px;letter-spacing:.06em;' +
      'text-transform:uppercase;color:#6B6055;border-bottom:1.5px solid #1B2F4A;padding:0 8px 5px 0}' +
      'td{padding:7px 8px 7px 0;border-bottom:1px solid #E8E2D8;vertical-align:top}' +
      'td:first-child{white-space:nowrap;color:#6B6055}.f{margin-top:22px;font-size:10.5px;color:#6B6055;line-height:1.7}</style>' +
      '<h1>Service history</h1><p class="sub">' + esc(p.address || '') +
      (rec.name ? ' \u00b7 ' + esc(rec.name) : '') +
      (rec.start ? ' \u00b7 tenancy from ' + esc(day(rec.start)) : '') + '</p>' +
      '<table><thead><tr><th>When</th><th>Document</th><th>Recipient</th><th>Route</th><th>Status</th></tr></thead>' +
      '<tbody>' + (cells || '<tr><td colspan="5">Nothing recorded.</td></tr>') + '</tbody></table>' +
      '<p class="f">Prepared ' + stamp(new Date().toISOString()) + ' by ' + esc(brand.name) +
      '. Compiled from the filed copies held on the tenancy record. Each entry marked Sent has a stored copy of the ' +
      'document exactly as it was sent; entries marked Recorded were confirmed by hand where the document was ' +
      'delivered outside NexLet.</p>';
    const w = window.open('', '_blank');
    if (!w) { window.toast('Allow pop-ups to print', 1); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
  }

  window.NexLetHistory = { panel, open, copy, print, events, warnings, servedOn, dueBanner, dueBeforeStart };
})();
