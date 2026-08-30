// ── END-OF-TENANCY: formal close-out, archive, and tenant checkout comms ──
// Plain globals — shares scope with agent.html's main script (S, P, L, esc, fmtDate, gbp,
// modal, closeModal, toast, render, val, uid, today, save, pushProperty, pushTenantRec,
// agencyEmail, viewDoc, tenantRecFor are all already defined there).

function pastTenanciesPanel(p){
  const list=(S.tenants||[]).filter(t=>t.propertyId===p.id && t.status==='ended').sort((a,b)=>new Date(b.end||0)-new Date(a.end||0));
  if(!list.length) return '';
  const rows=list.map(t=>`<div class="doc"><div class="di" style="background:var(--off);color:#94A3B8">\ud83d\udce6</div>
    <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--navy)">${esc(t.name)}</div>
      <div class="faint" style="font-size:11.5px">${fmtDate(t.start)} \u2192 ${fmtDate(t.end)}${t.forwardingAddress?' \u00b7 Forwarding: '+esc(t.forwardingAddress):''}</div></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${t.depositCertUrl?`<button class="btn sm" onclick="viewDoc('${t.depositCertUrl}','Deposit certificate')">Deposit cert</button>`:''}
      ${t.refDocUrl?`<button class="btn sm" onclick="viewDoc('${t.refDocUrl}','Reference report')">Reference</button>`:''}
      ${t.origContractUrl?`<button class="btn sm" onclick="viewDoc('${t.origContractUrl}','Original tenancy agreement')">Contract</button>`:''}
    </div></div>`).join('');
  return `<div class="panel"><div class="panel-hd"><h2>Past tenancies (${list.length})</h2></div><div class="panel-bd">${rows}</div></div>`;
}

function endTenancy(pid){
  const rec=tenantRecFor(pid);
  if(!rec){ toast('No active tenant to end',1); return; }
  const body=`<div class="fg"><label>Tenancy end date</label><input id="et-end" type="date" value="${today()}"></div>
    <div class="fg"><label>Forwarding address (for deposit correspondence)</label><textarea id="et-fwd" rows="2" placeholder="Where the tenant can be reached after leaving"></textarea></div>
    <div class="grid2" style="gap:10px">
      <div class="fg"><label>Final electricity reading</label><input id="et-elec" placeholder="e.g. 4821"></div>
      <div class="fg"><label>Final gas reading</label><input id="et-gas" placeholder="e.g. 1123"></div>
      <div class="fg"><label>Final water reading</label><input id="et-water" placeholder="e.g. 302"></div>
      <div class="fg"><label>Notes</label><input id="et-notes" placeholder="Optional"></div>
    </div>
    <div class="note">This closes out <b>${esc(rec.name)}</b>'s record \u2014 their deposit certificate, reference report and original contract move to Past Tenancies (still viewable, never deleted) \u2014 and marks the property vacant, ready to re-market. Compliance certificates, invoices already issued, and notices already served are unaffected.</div>`;
  modal('End tenancy \u2014 archive & reset',body,`<button class="btn" onclick="closeModal()">Cancel</button><button class="btn navy" onclick="_doEndTenancy('${pid}')">End tenancy &amp; archive</button>`,true);
}
function _doEndTenancy(pid){
  const p=P(pid); const rec=tenantRecFor(pid); if(!rec) return;
  rec.status='ended'; rec.end=val('et-end')||today(); rec.forwardingAddress=val('et-fwd')||'';
  rec.finalMeters={elec:val('et-elec')||'',gas:val('et-gas')||'',water:val('et-water')||''};
  rec.endNotes=val('et-notes')||'';
  p.tenant=null;
  /* Per-tenant service evidence that happens to live on the property record. It
     belonged to the tenancy just ended, so leaving it behind would vouch for a
     document the next tenant never received. */
  if(p.certs&&p.certs.infosheet) p.certs.infosheet='';
  save(); pushProperty(p); pushTenantRec(rec); closeModal(); render();
  toast('\u2713 Tenancy ended \u2014 '+rec.name+' archived, property marked vacant');
}

function sendCheckoutPack(pid){
  const p=P(pid); const rec=tenantRecFor(pid);
  if(!rec||!rec.email){ toast('No tenant email on file',1); return; }
  const a=S.agency;
  const html=`<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1A2B45">
    <h2 style="margin:0 0 4px">${esc(a.name||'Your Lettings')}</h2>
    <p style="color:#7A8FA6;font-size:13px;margin:0 0 20px">Checking out \u2014 ${esc(p.address)}</p>
    <p>Dear ${esc(rec.name)},</p>
    <p>As your tenancy comes to an end, please arrange the following before you hand back the keys:</p>
    <ul style="font-size:13.5px;line-height:1.8">
      <li>Leave the property clean and in the condition noted at check-in, allowing for fair wear and tear</li>
      <li>Remove all personal belongings and rubbish</li>
      <li>Take final electricity, gas and water meter readings on your last day and send them to us</li>
      <li>Return all keys and any fobs/parking permits to us on or before the end date</li>
      <li>Let us know your forwarding address so we can send any deposit correspondence</li>
    </ul>
    <p>We'll carry out a check-out inspection against the original inventory and let you know the outcome, including any proposed deposit deductions, as soon as it's complete.</p>
    <p style="font-size:12px;color:#7A8FA6;margin-top:24px">${esc(a.name||'Your agency')}${a.address?' \u00b7 '+esc(a.address):''}</p>
  </div>`;
  agencyEmail(rec.email,'Checking out \u2014 '+p.address,html).then(r=>{
    if(r.ok){ rec.checkoutPackSentAt=new Date().toISOString(); save(); pushTenantRec(rec); render(); toast('\u2713 Checkout pack emailed to '+rec.email); }
    else toast('\u26a0 Could not send \u2014 '+(r.error||'retry'),1);
  });
}
