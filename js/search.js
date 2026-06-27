(function(){
  var SEL = 0, RESULTS = [];

  // Static feature/page index — always searchable, even with no data yet.
  function features(){
    return [
      {t:'Dashboard', h:'Home · portfolio overview', k:'home overview start', run:function(){nav('dashboard');}},
      {t:'Discover all features', h:'Everything NexLet can do', k:'features help explore what can do', run:function(){nav('discover');}},
      {t:'Properties', h:'View & manage properties', k:'property house flat home portfolio', run:function(){nav('properties');}},
      {t:'Add a property', h:'Create a new property', k:'new add create property', run:function(){window.moAddProp&&moAddProp();}},
      {t:'Tenants', h:'View & manage tenants', k:'tenant renter people occupant', run:function(){nav('tenants');}},
      {t:'Add a tenant', h:'Create a new tenant', k:'new add create tenant', run:function(){window.moTenant&&moTenant();}},
      {t:'Compliance', h:'Gas, electrical, EPC & more', k:'compliance gas electrical epc certificate cert safety legal', run:function(){nav('compliance');}},
      {t:'Insurance', h:'Policies across your portfolio', k:'insurance policy cover landlord', run:function(){nav('insurance');}},
      {t:'Inspections', h:'Property inspections', k:'inspection visit check property', run:function(){nav('inspections');}},
      {t:'Inventory reports', h:'AI check-in / check-out reports', k:'inventory report check-in check-out condition', run:function(){nav('inventory-reports');}},
      {t:'Calendar', h:'Reminders & key dates', k:'calendar date reminder event deadline', run:function(){nav('calendar');}},
      {t:'Maintenance', h:'Repair jobs & issues', k:'maintenance repair job issue fix contractor', run:function(){nav('maintenance');}},
      {t:'Report an issue', h:'Log a maintenance job', k:'new report issue log job repair', run:function(){window.moIssue&&moIssue();}},
      {t:'Rent & Finance', h:'Payments, arrears, P&L', k:'rent finance money payment arrears income profit', run:function(){nav('rent-finance');}},
      {t:'Record a payment', h:'Log a rent payment', k:'record payment rent money receive', run:function(){window.moAddPayment&&moAddPayment();}},
      {t:'MTD Tax', h:'Making Tax Digital tracker', k:'tax mtd hmrc submission quarterly return', run:function(){window._rfTab='mtd';nav('rent-finance');}},
      {t:'Documents & Notices', h:'Templates & signed documents', k:'document notice template letter form section 21 13 esign sign', run:function(){nav('documents');}},
      {t:'AI Assistant', h:'Ask about your portfolio or UK law', k:'ai assistant help chat ask question law advice', run:function(){window.showAssistant?showAssistant():nav('assistant');}},
      {t:'Replay guided tour', h:'Take the walkthrough again', k:'tour tutorial guide walkthrough help replay onboarding', run:function(){closeSearch();_beginTourSteps();}}
    ];
  }

  function propAddr(pid){ try{ var p=(D.properties||[]).find(function(x){return String(x.id)===String(pid);}); return p?(p.address||''):''; }catch(e){ return ''; } }

  function build(q){
    q = (q||'').trim().toLowerCase();
    var out = [];
    var terms = q.split(/\s+/).filter(Boolean);
    function hit(hay){ hay=(hay||'').toLowerCase(); return terms.every(function(t){return hay.indexOf(t)>-1;}); }

    if(q){
      // Tenants
      (D.tenants||[]).forEach(function(t){
        var hay=[t.name,t.email,propAddr(t.prop_id),t.status].join(' ');
        if(hit(hay)) out.push({ic:'person', t:t.name||'Tenant', h:(t.status||'')+(t.prop_id?(' · '+propAddr(t.prop_id)):''), grp:'Tenant', run:function(){nav('tenant-detail', t.id);}});
      });
      // Properties
      (D.properties||[]).forEach(function(p){
        var hay=[p.address,p.city,p.postcode].join(' ');
        if(hit(hay)) out.push({ic:'home', t:p.address||'Property', h:[p.city,p.postcode].filter(Boolean).join(' · '), grp:'Property', run:function(){nav('prop-detail', p.id);}});
      });
      // Maintenance jobs
      (D.maintenance||[]).forEach(function(m){
        var hay=[m.title,m.desc,m.description,propAddr(m.prop_id),m.status].join(' ');
        if(hit(hay)) out.push({ic:'wrench', t:(m.title||m.desc||m.description||'Maintenance job').slice(0,60), h:(m.status||'')+(m.prop_id?(' · '+propAddr(m.prop_id)):''), grp:'Maintenance', run:function(){nav('maintenance');}});
      });
    }

    // Features/pages (always shown; filtered when typing)
    features().forEach(function(f){
      if(!q || hit(f.t+' '+f.k+' '+f.h)) out.push({ic:'page', t:f.t, h:f.h, grp:'Go to', run:f.run});
    });

    return out.slice(0, 40);
  }

  var ICONS = {
    person:'<circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5"/>',
    home:'<path d="M2 14V7L8 2l6 5v7"/><path d="M6 14v-4h4v4"/>',
    wrench:'<path d="M10.5 2.5a3 3 0 00-4 4L2 11a1.5 1.5 0 002 2l4.5-4.5a3 3 0 004-4l-2 2-1.5-1.5 2-2z"/>',
    page:'<circle cx="8" cy="8" r="6.5"/><path d="M10.6 5.4 9.1 9.1 5.4 10.6 6.9 6.9z"/>'
  };

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function renderList(){
    var box = document.getElementById('nxl-search-list');
    if(!box) return;
    if(!RESULTS.length){ box.innerHTML='<div style="padding:26px 18px;text-align:center;color:#94A3B8;font-size:13px">No matches. Try a name, address, or feature.</div>'; return; }
    var lastGrp='';
    box.innerHTML = RESULTS.map(function(r,i){
      var head = (r.grp!==lastGrp) ? '<div style="padding:'+(i?'12px':'6px')+' 16px 4px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#9AA8BC">'+esc(r.grp)+'</div>' : '';
      lastGrp = r.grp;
      var on = i===SEL;
      return head + '<div class="nxl-sr" data-i="'+i+'" style="display:flex;align-items:center;gap:11px;padding:9px 16px;cursor:pointer;background:'+(on?'#F1F5FB':'transparent')+';border-left:3px solid '+(on?'#0B1E3D':'transparent')+'">'
        + '<span style="width:26px;height:26px;border-radius:7px;background:#EEF2F8;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#0B1E3D" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[r.ic]||ICONS.page)+'</svg></span>'
        + '<span style="flex:1;min-width:0"><span style="display:block;font-size:13.5px;font-weight:600;color:#1B2A41;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(r.t)+'</span>'
        + (r.h?'<span style="display:block;font-size:11.5px;color:#8595A8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(r.h)+'</span>':'')+'</span>'
        + (on?'<span style="font-size:11px;color:#9AA8BC;flex-shrink:0">\u21b5</span>':'')+'</div>';
    }).join('');
    var selEl = box.querySelector('.nxl-sr[data-i="'+SEL+'"]');
    if(selEl && selEl.scrollIntoViewIfNeeded) selEl.scrollIntoViewIfNeeded(); else if(selEl) { var p=box, t=selEl.offsetTop; if(t<p.scrollTop) p.scrollTop=t; else if(t+selEl.offsetHeight>p.scrollTop+p.clientHeight) p.scrollTop=t+selEl.offsetHeight-p.clientHeight; }
  }

  window.__nxlRun = function(i){ var r=RESULTS[i]; if(r){ closeSearch(); try{ r.run(); }catch(e){ console.error(e); } } };
  window.__nxlHover = function(i){ SEL=i; renderList(); };

  function onInput(){ var q=document.getElementById('nxl-search-input').value; RESULTS=build(q); SEL=0; renderList(); }

  window.openSearch = function(){
    var ov = document.getElementById('nxl-search-ov');
    if(!ov){
      ov = document.createElement('div');
      ov.id='nxl-search-ov';
      ov.style.cssText='position:fixed;inset:0;z-index:200000;background:rgba(11,30,61,.4);backdrop-filter:blur(2px);display:flex;align-items:flex-start;justify-content:center;padding:80px 20px 20px;font-family:var(--font),system-ui,sans-serif';
      ov.onclick=function(e){ if(e.target===ov) closeSearch(); };
      ov.innerHTML='<div style="background:#fff;width:100%;max-width:560px;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;max-height:70vh;display:flex;flex-direction:column">'
        + '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #EEF1F5">'
        + '<svg viewBox="0 0 16 16" width="17" height="17" fill="none" stroke="#8595A8" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="5"/><path d="M11 11l3.2 3.2"/></svg>'
        + '<input id="nxl-search-input" placeholder="Search tenants, properties, jobs or features…" autocomplete="off" style="flex:1;border:none;outline:none;font-size:15px;color:#1B2A41;font-family:inherit;background:transparent">'
        + '<span id="nxl-esc-btn" style="font-size:10px;font-weight:700;color:#9AA8BC;border:1px solid #E2E5EA;border-radius:5px;padding:2px 7px;cursor:pointer">ESC</span>'
        + '</div>'
        + '<div id="nxl-search-list" style="overflow-y:auto;flex:1"></div>'
        + '<div style="padding:8px 16px;border-top:1px solid #EEF1F5;font-size:11px;color:#9AA8BC;display:flex;gap:14px;align-items:center"><span>\u2191\u2193 navigate</span><span>\u21b5 open</span><span style="margin-left:auto">NexLet search</span></div>'
        + '</div>';
      document.body.appendChild(ov);
      var inp = document.getElementById('nxl-search-input');
      inp.addEventListener('input', onInput);
      // Event delegation (robust against inline-handler issues): wire row click + hover
      // and the ESC badge here, where addEventListener is known to work.
      var listBox = document.getElementById('nxl-search-list');
      if(listBox){
        listBox.addEventListener('click', function(e){ var row=e.target.closest('.nxl-sr'); if(row){ __nxlRun(parseInt(row.getAttribute('data-i'),10)); } });
        listBox.addEventListener('mouseover', function(e){ var row=e.target.closest('.nxl-sr'); if(row){ var i=parseInt(row.getAttribute('data-i'),10); if(i!==SEL){ SEL=i; renderList(); } } });
      }
      var escBtn = document.getElementById('nxl-esc-btn');
      if(escBtn){ escBtn.addEventListener('click', function(){ closeSearch(); }); }
    }
    ov.style.display='flex';
    var input = document.getElementById('nxl-search-input');
    input.value=''; RESULTS=build(''); SEL=0; renderList();
    setTimeout(function(){ input.focus(); }, 30);
  };

  window.closeSearch = function(){ var ov=document.getElementById('nxl-search-ov'); if(ov) ov.style.display='none'; };

  document.addEventListener('keydown', function(e){
    var open = document.getElementById('nxl-search-ov') && document.getElementById('nxl-search-ov').style.display!=='none';
    // ⌘K / Ctrl+K toggles
    if((e.metaKey||e.ctrlKey) && (e.key==='k'||e.key==='K')){ e.preventDefault(); if(open) closeSearch(); else openSearch(); return; }
    if(!open) return;
    if(e.key==='Escape'){ e.preventDefault(); closeSearch(); }
    else if(e.key==='ArrowDown'){ e.preventDefault(); SEL=Math.min(SEL+1, RESULTS.length-1); renderList(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); SEL=Math.max(SEL-1, 0); renderList(); }
    else if(e.key==='Enter'){ e.preventDefault(); __nxlRun(SEL); }
  });
})();
