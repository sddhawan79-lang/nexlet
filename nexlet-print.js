/* ============================================================================
   nexlet-print.js — open any generated document in a clean, printable window.
   Loaded by agent.html as a classic script.

   Prints from the ALREADY-RENDERED preview element rather than re-calling the
   generator, so what you print is exactly what the app produced — no risk of
   the printed copy and the sent copy drifting apart.
   ========================================================================== */
(function () {
  'use strict';

  const CSS = `
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Georgia, 'Times New Roman', serif; font-size: 11pt;
           line-height: 1.65; color:#2C2A26; }
    .om-wrap { max-width: 178mm; margin: 0 auto; }
    .om-bar { background:#F4F1EA; border:1px solid #E3D9C8; border-radius:8px;
              padding:10px 14px; font-family: system-ui, sans-serif; font-size:9.5pt;
              color:#6B6255; margin-bottom:18px; }
    h1,h2,h3,h4 { line-height:1.3; page-break-after: avoid; }
    p, li { orphans:3; widows:3; }
    table { border-collapse: collapse; width:100%; }
    tr, img { page-break-inside: avoid; }
    img { max-width:100%; }
    @media print { .om-bar { display:none; } }`;

  function open(html, title, subtitle) {
    const w = window.open('', '_blank');
    if (!w) { if (window.toast) window.toast('Allow pop-ups to print', 1); return; }
    const esc = s => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'
      + esc(title || 'Document') + '</title><style>' + CSS + '</style></head><body><div class="om-wrap">'
      + '<div class="om-bar"><b>' + esc(title || 'Document') + '</b>'
      + (subtitle ? ' \u2014 ' + esc(subtitle) : '')
      + ' &nbsp;\u00b7&nbsp; Use your browser\u2019s Print dialog and choose <b>Save as PDF</b>. This bar is not printed.</div>'
      + html + '</div></body></html>');
    w.document.close();
    // Give fonts and images a moment before the dialog steals focus.
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) { } }, 450);
  }

  window.NexLetPrint = {
    doc: open,
    fromEl(id, title, subtitle) {
      const el = document.getElementById(id);
      if (!el) { if (window.toast) window.toast('Nothing to print yet', 1); return; }
      open(el.innerHTML, title, subtitle);
    }
  };
})();
