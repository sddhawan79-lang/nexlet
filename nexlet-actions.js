/* nexlet-actions.js — the tenancy action row, told what stage it is in.
 *
 * WHY
 *
 * The row carried eleven buttons at all times, three of them styled as the
 * primary action simultaneously, one of which labelled itself "next step" while
 * sitting beside another that also claimed priority. A tenancy only ever has one
 * genuine next action, and the page already knew which stage it was in — it
 * computes the checklist to decide — but the buttons ignored that.
 *
 * So: one primary action per stage, the two or three that belong to that stage,
 * and an Actions menu holding EVERY action at every stage. Nothing is removed,
 * only demoted; a stage judged wrong costs one extra click, not a feature.
 *
 * The pre-keys stage is different, and deliberately so. It is not a set of
 * choices, it is an ordered run of seven, and the order is the part that must not
 * go wrong: keys before the money clears, or keys before the documents are
 * served, are the two expensive mistakes. So it renders as a numbered list you
 * work down, with the next step named and the keys gate stated.
 */
(function () {
  'use strict';

  const ST = () => { try { return (typeof S !== 'undefined' && S) ? S : {}; } catch (e) { return {}; } };
  const esc = s => (window.esc ? window.esc(s) : String(s == null ? '' : s));
  const escJs = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const day = d => { try { return d && window.fmtDate ? window.fmtDate(d) : ''; } catch (e) { return ''; } };
  const rec_ = pid => (window.tenantRecFor && window.tenantRecFor(pid)) || {};
  const ta_ = rec => (window.tenancyAgreementFor && rec.id) ? window.tenancyAgreementFor(rec.id) : null;
  const srvAt = (pid, aud) => (window.NexLetServe && window.NexLetServe.sentAt)
    ? window.NexLetServe.sentAt(pid, aud) : null;

  /* Every required tenant document actually accounted for, by any route — the
     history module owns that question, so this does not answer it a second way. */
  function tenantPackDone(pid) {
    if (!window.NexLetServe || !window.NexLetServe.items) return !!srvAt(pid, 'tenant');
    const srv = (window.NexLetHistory && window.NexLetHistory.servedOn)
      ? window.NexLetHistory.servedOn(pid)
      : (window.NexLetServe.servedKeys ? window.NexLetServe.servedKeys(pid) : {});
    const req = window.NexLetServe.items(pid, 'tenant').filter(x => x.required);
    return req.length > 0 && req.every(x => srv[x.key]);
  }

  /* When did the tenant actually get in? keysHandedAt is only written by the new
     handover flow, so every tenancy that predates it has the field empty — reading
     it alone would put occupied properties back into the pre-keys run. A start
     date already in the past is the strongest evidence available, and a key set
     marked as with the tenant is the explicit record. */
  function occupiedAt(pid) {
    const rec = rec_(pid);
    if (rec.keysHandedAt) return rec.keysHandedAt;
    const k = (ST().keys || []).find(x => x.propertyId === pid && x.status === 'tenant');
    if (k) return k.handedAt || rec.start || '';
    if (rec.start && new Date(rec.start) <= new Date()) return rec.start;
    return '';
  }

  function stageOf(pid) {
    const rec = rec_(pid);
    if (!rec.id) return null;
    const ta = ta_(rec);
    const signed = !!(ta && ta.status === 'signed');
    const out = !!(window.taOut && window.taOut(ta));
    if (occupiedAt(pid)) {
      const endSoon = rec.end && (new Date(rec.end) - Date.now()) / 86400000 < 60;
      const noticed = !!(rec.noticeServedAt || rec.noticeGivenAt);
      return (endSoon || noticed) ? 'ending' : 'running';
    }
    return (signed || out) ? 'prekeys' : 'presign';
  }

  /* ── the seven, in your order ─────────────────────────────────────────────
     Signing runs in parallel with the money, and serving comes after signing,
     because the pack carries the signed agreement. */
  function steps(pid) {
    const rec = rec_(pid);
    const ta = ta_(rec);
    const signed = !!(ta && ta.status === 'signed');
    const out = !!(window.taOut && window.taOut(ta));
    const unsigned = (window.taUnsigned && ta) ? window.taUnsigned(ta) : 0;
    const dep = parseFloat(rec.deposit) || 0;

    return [
      { t: 'Confirm the deposit received',
        d: dep ? 'Starts the 30-day protection clock.' : 'No deposit recorded on this tenancy.',
        done: !!rec.depositReceived, at: rec.depositReceived,
        go: "setTenant('" + escJs(pid) + "')", label: 'Record it', skip: !dep },

      { t: 'Send the monies letter',
        d: 'Shows the balance after the holding deposit, with the bank details and a cleared-by date.',
        done: !!rec.moniesSentAt, at: rec.moniesSentAt,
        go: "openMoveInMonies('" + escJs(pid) + "')", label: 'Open the letter' },

      { t: 'Agreement signed by everyone',
        d: out ? 'Out for signature — waiting on ' + unsigned + '.'
               : 'Runs alongside the money. Serving cannot happen until this is back.',
        done: signed, at: signed ? (ta.completed_at || ta.updated_at || ta.created_at) : '',
        go: "openTenancyAgreement('" + escJs(pid) + "')",
        label: out ? 'Chase signatures' : 'Generate and send' },

      { t: 'Fill in the property information',
        d: 'Stopcock, meters, bin days, parking, where the rent goes. Goes out with the pack and prints for handover.',
        done: !!(window.NexLetMoveIn && window.NexLetMoveIn.hasInfo && window.NexLetMoveIn.hasInfo(pid)),
        go: "NexLetMoveIn.editInfo('" + escJs(pid) + "')", label: 'Fill it in' },

      { t: 'Serve the documents on the tenant',
        d: 'Everything they are entitled to before they occupy, including the signed agreement.',
        done: tenantPackDone(pid), at: srvAt(pid, 'tenant'),
        go: "NexLetServe.open('" + escJs(pid) + "','tenant')", label: 'Open the pack', gate: true },

      { t: 'Send the landlord pack',
        d: 'Agreement, key terms, prescribed information, inventory, alarms, keys, receipt.',
        done: !!srvAt(pid, 'landlord'), at: srvAt(pid, 'landlord'),
        go: "NexLetServe.open('" + escJs(pid) + "','landlord')", label: 'Open the pack' },

      { t: 'Invite them to the tenant portal',
        d: 'Where they report repairs and see their documents.',
        done: !!rec.invited, at: rec.invitedAt,
        go: "inviteTenantToPortal('" + escJs(pid) + "')", label: 'Send the invite' }
    ].filter(s => !s.skip);
  }

  function runPanel(pid) {
    const all = steps(pid);
    const left = all.filter(s => !s.done);
    const next = left[0];
    const rec = rec_(pid);
    /* Keys are gated on money in and everyone signed and the pack served. Stated
       rather than enforced: you may have a reason, but you should not discover the
       gap afterwards. */
    const blockers = all.filter(s => !s.done && (s.gate || /deposit|monies|signed/i.test(s.t)));

    const rows = all.map((s, i) => {
      const isNext = next && s.t === next.t;
      const n = i + 1;
      return '<div style="display:flex;gap:12px;padding:10px 0;align-items:flex-start' +
        (i ? ';border-top:1px solid var(--border)' : '') + '">' +
        '<span style="flex:0 0 22px;height:22px;border-radius:50%;font-size:11px;font-weight:700;' +
          'display:flex;align-items:center;justify-content:center;margin-top:1px;' +
          (s.done ? 'background:var(--green-bg);color:var(--green)'
                  : isNext ? 'background:var(--navy);color:#fff'
                           : 'background:var(--off);color:var(--faint)') + '">' +
          (s.done ? '\u2713' : n) + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12.5px;font-weight:600;color:' +
            (s.done ? 'var(--faint)' : 'var(--navy)') + '">' + esc(s.t) +
            (s.done && s.at ? ' <span class="faint" style="font-weight:400">\u00b7 ' + esc(day(s.at)) + '</span>' : '') +
          '</div>' +
          (!s.done ? '<div class="faint" style="font-size:11.5px;line-height:1.55;margin-top:2px">' +
            esc(s.d) + '</div>' : '') +
        '</div>' +
        (s.done ? '' : '<button class="btn sm' + (isNext ? ' navy' : '') +
          '" style="flex:0 0 auto" onclick="' + s.go + '">' + esc(s.label) + '</button>') +
      '</div>';
    }).join('');

    return '<div style="border:1px solid var(--border);border-radius:10px;padding:14px 16px;background:var(--off)">' +
      '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px">' +
        '<span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--orange)">Before keys</span>' +
        '<span class="faint" style="font-size:11.5px">' +
          (left.length ? left.length + ' of ' + all.length + ' still to do' : 'all ' + all.length + ' done') + '</span>' +
        '<span style="margin-left:auto;display:flex;gap:7px">' + actionsBtn(pid) + '</span>' +
      '</div>' + rows +
      (occupiedAt(pid)
        ? '<div class="note ok" style="margin:10px 0 0">Keys handed over ' + esc(day(occupiedAt(pid))) + '.</div>'
        : blockers.length
          ? '<div class="note warn" style="margin:10px 0 0"><b>Not ready for keys.</b> ' +
            esc(blockers.map(b => b.t.replace(/^./, m => m.toLowerCase())).join(', ')) + '.</div>'
          : '<div class="note ok" style="margin:10px 0 0"><b>Ready for keys.</b> Money in, everyone signed, documents served. ' +
            '<button class="btn sm" onclick="openMoveIn(\'' + escJs(pid) + '\')">First-day checklist</button></div>') +
    '</div>';
  }

  /* ── the other three stages: one primary, a couple of stage actions ─────── */
  const STAGE = {
    presign: pid => ({
      tag: 'Before signing',
      primary: { t: '\u2728 Generate and send the agreement', go: "openTenancyAgreement('" + escJs(pid) + "')" },
      why: 'Nothing else can happen until this is signed.',
      /* The monies letter is not repeated here — the signing panel above owns it
         until the tenancy reaches the pre-keys run, where it becomes step 2. */
      rest: [['Edit tenancy', "setTenant('" + escJs(pid) + "')"]]
    }),
    /* Keys handed is what puts a tenancy here, and that says nothing about
       whether everything was served. Asserting "served" from a keys date is how
       this row would end up contradicting the countdown banner directly above
       it, so the claim is checked before it is made. */
    running: pid => {
      const rec = rec_(pid);
      const ta = ta_(rec);
      const signed = !!(ta && ta.status === 'signed');
      const packed = tenantPackDone(pid);
      const rest = [['Service history', "NexLetHistory.open('" + escJs(pid) + "')"],
                    ['Property information', "NexLetMoveIn.editInfo('" + escJs(pid) + "')"],
                    ['Edit tenancy', "setTenant('" + escJs(pid) + "')"]];
      if (signed && packed)
        return { tag: 'Running',
          calm: 'Signed, served and moved in' + (occupiedAt(pid) ? ' \u00b7 keys ' + day(occupiedAt(pid)) : ''),
          rest };
      const gaps = [!signed ? 'the agreement is not signed' : null,
                    !packed ? 'documents are still unserved' : null].filter(Boolean);
      return { tag: 'Running',
        primary: packed ? null : { t: '\u2709 Serve the outstanding documents',
                                   go: "NexLetServe.open('" + escJs(pid) + "','tenant')" },
        why: 'Occupied since ' + (day(occupiedAt(pid)) || 'move-in') + ', but ' + gaps.join(' and ') + '.',
        rest: (!signed ? [['Agreement', "openTenancyAgreement('" + escJs(pid) + "')"]] : []).concat(rest) };
    },
    ending: pid => ({
      tag: 'Ending',
      primary: { t: '\u{1F4E6} Send the checkout pack', go: "sendCheckoutPack('" + escJs(pid) + "')" },
      why: 'Sets the inventory comparison and the deposit return in motion.',
      rest: [['Prepare notice', "openNotice('" + escJs(pid) + "')"],
             ['Service history', "NexLetHistory.open('" + escJs(pid) + "')"]]
    })
  };

  function actionsBtn(pid) {
    return '<button class="btn sm" title="Every action on this tenancy" onclick="NexLetActions.menu(\'' +
      escJs(pid) + '\')">Actions \u25be</button>';
  }

  function panel(pid) {
    const st = stageOf(pid);
    if (!st) return '';
    if (st === 'prekeys') return runPanel(pid);
    const s = (STAGE[st] || STAGE.running)(pid);
    return '<div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center">' +
      '<span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--orange)">' +
        esc(s.tag) + '</span>' +
      (s.primary ? '<button class="btn sm navy" onclick="' + s.primary.go + '">' + esc(s.primary.t) + '</button>' +
        (s.why ? '<span class="faint" style="font-size:11.5px;max-width:340px">' + esc(s.why) + '</span>' : '') : '') +
      (s.calm ? '<span style="font-size:12.5px;font-weight:600;color:var(--green)">\u2713 ' + esc(s.calm) + '</span>' : '') +
      s.rest.map(r => '<button class="btn sm" onclick="' + r[1] + '">' + esc(r[0]) + '</button>').join('') +
      actionsBtn(pid) +
    '</div>';
  }

  /* ── the menu: everything, always, grouped, with the dangerous one last ──── */
  function menu(pid) {
    const p = (window.P && window.P(pid)) || {};
    const rec = rec_(pid);
    const hh = (window.householdDeclFor && rec.id) ? window.householdDeclFor(rec.id) : null;
    const G = [
      ['On the tenant', [
        ['Serve documents on the tenant', "NexLetServe.open('" + escJs(pid) + "','tenant')", srvAt(pid, 'tenant')],
        ['Move-in monies letter', "openMoveInMonies('" + escJs(pid) + "')", rec.moniesSentAt],
        ['Welcome letter', "sendTenantWelcomeLetter('" + escJs(pid) + "')", rec.welcomeSentAt],
        ['Property information', "NexLetMoveIn.editInfo('" + escJs(pid) + "')", null],
        ['Household composition declaration', "openHouseholdDecl('" + escJs(pid) + "')",
          hh && hh.status === 'signed' ? (hh.completed_at || hh.updated_at) : null],
        ['Invite to the tenant portal', "inviteTenantToPortal('" + escJs(pid) + "')", rec.invitedAt]
      ]],
      ['For the visit', [
        ['Print the sheets', "NexLetMoveIn.open('" + escJs(pid) + "')", null],
        ['First-day checklist', "openMoveIn('" + escJs(pid) + "')", rec.keysHandedAt]
      ]],
      ['On the landlord', [
        ['Send the landlord pack', "NexLetServe.open('" + escJs(pid) + "','landlord')", srvAt(pid, 'landlord')],
        ['Head lease disclosure', "openLeasehold('" + escJs(pid) + "')", null]
      ]],
      ['This tenancy', [
        ['Edit the tenancy', "setTenant('" + escJs(pid) + "')", null],
        ['Service history', "NexLetHistory.open('" + escJs(pid) + "')", null],
        ['Generate the agreement again', "openTenancyAgreement('" + escJs(pid) + "')", null]
      ]],
      ['Ending it', [
        ['Prepare a notice', "openNotice('" + escJs(pid) + "')", null],
        ['Send the checkout pack', "sendCheckoutPack('" + escJs(pid) + "')", rec.checkoutPackSentAt]
      ]]
    ];

    const body = G.map(([head, rows]) =>
      '<div style="margin-bottom:14px">' +
      '<div class="faint" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">' +
        esc(head) + '</div>' +
      rows.map(r =>
        '<button class="btn sm" style="display:flex;width:100%;justify-content:space-between;align-items:center;' +
        'gap:12px;margin-bottom:5px;text-align:left" onclick="closeModal();' + r[1] + '">' +
        '<span>' + esc(r[0]) + '</span>' +
        (r[2] ? '<span class="faint" style="font-size:11px;font-weight:400">' + esc(day(r[2])) + '</span>' : '') +
        '</button>').join('') +
      '</div>').join('') +
      '<div style="border-top:1px solid var(--border);padding-top:12px">' +
      '<button class="btn sm" style="width:100%;color:var(--red);border-color:var(--red)" ' +
      'onclick="closeModal();endTenancy(\'' + escJs(pid) + '\')">End this tenancy</button>' +
      '<div class="hint" style="margin-top:6px">Closes the tenancy and moves the property back to available. ' +
      'Do the checkout pack and the deposit return first.</div></div>';

    window.modal('Actions \u2014 ' + esc(p.address || ''), body,
      '<button class="btn" onclick="closeModal()">Close</button>', true);
  }

  window.NexLetActions = { panel, menu, stageOf, steps, occupiedAt };
})();
