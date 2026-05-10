/**
 * js/esign-content.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone e-sign module. Handles the tenant signing flow — token validation,
 * consent, signature pad, PDF generation, and email confirmations.
 *
 * Requires: supabase-client.js, signature_pad@4.1.7 UMD, jspdf@2.5.1 UMD
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  const sb = window.RSA?.sb;
  const EDGE_URL = 'https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/ai-proxy';

  // ── STATE ────────────────────────────────────────────────────────────────────

  let _esignRequest = null;
  let _esignTenant  = null;
  let _signaturePad  = null;
  let _toastTimer    = null;

  // ── TOAST ────────────────────────────────────────────────────────────────────

  function _toast(msg, err) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { el.className = 'toast'; }, 3200);
  }

  // ── INIT ─────────────────────────────────────────────────────────────────────

  function init() {
    if (!sb) {
      _toast('System error — Supabase client not loaded', true);
      return;
    }
    var params = new URLSearchParams(window.location.search);
    var esignToken = params.get('esign');
    if (esignToken) {
      window.history.replaceState({}, '', window.location.pathname);
      handleEsignToken(esignToken);
    } else {
      showError('Invalid link', 'This signing link is missing a token. Please use the link your landlord sent you.');
    }
  }

  function showError(title, msg) {
    document.getElementById('esign-consent').style.display = 'none';
    document.getElementById('esign-body').style.display = 'block';
    document.getElementById('esign-sign-flow').style.display = 'none';
    document.getElementById('esign-status').style.display = 'block';
    document.getElementById('esign-status-content').innerHTML =
      '<div style="font-size:40px;margin-bottom:16px">⚠️</div>' +
      '<div style="font-size:16px;font-weight:600;margin-bottom:8px">' + title + '</div>' +
      '<div style="font-size:13px;color:var(--muted)">' + msg + '</div>';
  }

  // ── TOKEN HANDLER ────────────────────────────────────────────────────────────

  async function handleEsignToken(token) {
    var _a = await sb
      .from('esign_requests')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    var req = _a.data, error = _a.error;

    if (error || !req) {
      showError('Invalid signing link', 'This signing link is invalid or does not exist. Please contact your landlord.');
      return;
    }

    _esignRequest = req;

    if (sessionStorage.getItem('esign_consent') === '1') {
      document.getElementById('esign-consent').style.display = 'none';
      document.getElementById('esign-body').style.display = 'block';
      showEsignSigningFlow(req);
    } else {
      document.getElementById('esign-consent').style.display = 'flex';
      document.getElementById('esign-body').style.display = 'none';
    }
  }

  // ── CONSENT ──────────────────────────────────────────────────────────────────

  function acceptEsignConsent() {
    sessionStorage.setItem('esign_consent', '1');
    document.getElementById('esign-consent').style.display = 'none';
    document.getElementById('esign-body').style.display = 'block';
    showEsignSigningFlow(_esignRequest);
  }

  // ── SIGNING FLOW ─────────────────────────────────────────────────────────────

  async function showEsignSigningFlow(req) {
    var _a = await Promise.all([
      sb.from('tenants').select('name,email,landlord_email').eq('id', req.tenant_id).maybeSingle(),
      sb.from('properties').select('address,city').eq('id', req.property_id).maybeSingle()
    ]);
    var tenant = _a[0].data, prop = _a[1].data;
    _esignTenant = tenant;

    var tenantName = tenant?.name || 'Tenant';
    var propAddr = prop ? prop.address + (prop.city ? ', ' + prop.city : '') : '';

    document.getElementById('esign-tenant-display').textContent = tenantName;
    document.getElementById('esign-sig-name').textContent = tenantName;
    document.getElementById('esign-sig-date').textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('esign-doc-title').textContent = req.document_type === 'written_statement' ? 'Written Statement of Tenancy Terms' : 'Tenancy Document';
    var signedByLabel = req.landlord_signed_at
      ? ' · ✍ Signed by landlord on ' + new Date(req.landlord_signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    document.getElementById('esign-doc-meta').textContent = propAddr + ' · Please read the full document before signing' + signedByLabel;

    if (req.status === 'signed') {
      document.getElementById('esign-sign-flow').style.display = 'none';
      document.getElementById('esign-status').style.display = 'block';
      document.getElementById('esign-status-content').innerHTML =
        '<div style="font-size:40px;margin-bottom:16px">✅</div>' +
        '<div style="font-size:16px;font-weight:600;margin-bottom:8px">Already signed</div>' +
        '<div style="font-size:13px;color:var(--muted)">You have already signed this document. A copy was emailed to you.</div>';
      return;
    }
    if (req.status === 'expired' || new Date(req.expires_at) < new Date()) {
      document.getElementById('esign-sign-flow').style.display = 'none';
      document.getElementById('esign-status').style.display = 'block';
      document.getElementById('esign-status-content').innerHTML =
        '<div style="font-size:40px;margin-bottom:16px">⏰</div>' +
        '<div style="font-size:16px;font-weight:600;margin-bottom:8px">Link expired</div>' +
        '<div style="font-size:13px;color:var(--muted)">This signing link has expired. Please contact your landlord for a new link.</div>';
      return;
    }

    var docContent = document.getElementById('esign-doc-content');
    if (req.document_html) {
      docContent.innerHTML = '<div style="padding:20px">' + req.document_html + '</div>';
    } else if (req.document_pdf_url) {
      docContent.innerHTML = '<iframe src="' + req.document_pdf_url + '" style="width:100%;height:60vh;border:none;display:block"></iframe>';
    }

    initSignaturePad();
  }

  // ── SIGNATURE PAD ────────────────────────────────────────────────────────────

  function initSignaturePad() {
    var canvas = document.getElementById('signature-canvas');
    if (!canvas || !window.SignaturePad) return;

    var ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width  = canvas.offsetWidth  * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);

    _signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(26,43,69)'
    });

    _signaturePad.addEventListener('endStroke', function () {
      var btn = document.getElementById('esign-sign-btn');
      if (btn) {
        var empty = _signaturePad.isEmpty();
        btn.disabled = empty;
        btn.style.opacity = empty ? '.45' : '1';
        btn.style.cursor = empty ? 'not-allowed' : 'pointer';
      }
    });

    window.addEventListener('resize', function () {
      if (!_signaturePad) return;
      var saved = _signaturePad.toData();
      var r = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width  = canvas.offsetWidth  * r;
      canvas.height = canvas.offsetHeight * r;
      canvas.getContext('2d').scale(r, r);
      _signaturePad.clear();
      if (saved.length) _signaturePad.fromData(saved);
    }, { passive: true });
  }

  function clearSignature() {
    if (_signaturePad) {
      _signaturePad.clear();
      var btn = document.getElementById('esign-sign-btn');
      if (btn) { btn.disabled = true; btn.style.opacity = '.45'; btn.style.cursor = 'not-allowed'; }
    }
  }

  // ── SIGN DOCUMENT ────────────────────────────────────────────────────────────

  async function signDocument() {
    if (!_signaturePad || _signaturePad.isEmpty()) { _toast('Please draw your signature first', true); return; }

    var req = _esignRequest;
    var btn = document.getElementById('esign-sign-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Processing…';

    var sigDataUrl = _signaturePad.toDataURL('image/png');
    var signedAt = new Date();

    try {
      var ipAddress = 'Unknown';
      try {
        var ipRes = await fetch('https://api.ipify.org?format=json');
        ipAddress = (await ipRes.json()).ip || 'Unknown';
      } catch (e) {}

      var tenant = _esignTenant;
      var tenantName = tenant?.name || 'Tenant';
      var _a = await Promise.all([
        sb.from('properties').select('address,city').eq('id', req.property_id).maybeSingle()
      ]);
      var prop = _a[0].data;
      var propAddr = prop ? prop.address + (prop.city ? ', ' + prop.city : '') : '';

      _toast('Generating signed document…');
      var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });

      doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
      doc.setTextColor(11, 30, 61);
      doc.text('RentSafe AI', 105, 28, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text('Electronically Signed Tenancy Document', 105, 38, { align: 'center' });
      doc.setDrawColor(0, 200, 150);
      doc.setLineWidth(0.8);
      doc.line(20, 44, 190, 44);

      doc.setTextColor(11, 30, 61);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      var docLabel = req.document_type === 'written_statement'
        ? 'Written Statement of Tenancy Terms'
        : 'Tenancy Document';
      doc.text(docLabel, 20, 58);

      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      var coverLines = [
        'Property: ' + propAddr,
        'Tenant: ' + tenantName,
        'Document type: ' + docLabel,
        '',
        'This PDF contains the full signed document.',
        'The signature confirmation is on the final page.'
      ];
      coverLines.forEach(function (l, i) { doc.text(l, 20, 70 + i * 8); });

      // ── Embed full document content ──
      if (req.document_html) {
        doc.addPage();
        // Strip HTML tags to plain text for jsPDF rendering
        var text = req.document_html
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<\/h[1-6]>/gi, '\n\n')
          .replace(/<\/li>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&nbsp;/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        var lines = doc.splitTextToSize(text, 170);
        var y = 20;
        var pageH = 277;
        for (var i = 0; i < lines.length; i++) {
          if (y > pageH) { doc.addPage(); y = 20; }
          doc.text(lines[i], 20, y);
          y += 5;
        }
      } else if (req.document_pdf_url) {
        // For uploaded PDFs, note the reference and provide the URL
        doc.addPage();
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text('The original uploaded document is available at:', 20, 30);
        doc.setTextColor(59, 111, 232);
        doc.setFontSize(9);
        var docUrlLines = doc.splitTextToSize(req.document_pdf_url, 170);
        docUrlLines.forEach(function (l, i) { doc.text(l, 20, 42 + i * 6); });
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text('The landlord uploaded this document as a PDF. It is stored securely and available for download separately. This signature page confirms the tenant electronically signed the referenced document.', 20, 60, { maxWidth: 170 });
      }

      // ── Landlord signature (pre-existing, from send time) ──
      if (req.landlord_sig_png && req.landlord_signed_at) {
        doc.addPage();
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
        doc.setTextColor(11, 30, 61);
        doc.text('Landlord Signature', 20, 20);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
        var landlordDate = new Date(req.landlord_signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        var lLines = [
          'Signed by (landlord): ' + (req.landlord_name || 'Landlord'),
          'Date: ' + landlordDate,
          '',
          'The landlord electronically signed this document before sending it to the tenant.',
          'This signature was applied on ' + landlordDate + ' under the Electronic Communications Act 2000.'
        ];
        lLines.forEach(function (l, i) { doc.text(l, 20, 36 + i * 8); });
        try { doc.addImage(req.landlord_sig_png, 'PNG', 20, 95, 80, 28); } catch (e) {}
      }

      // ── Tenant signature confirmation page ──
      doc.addPage();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text('Electronic Signature Confirmation', 20, 20);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      var lines = [
        'Electronically signed by: ' + tenantName,
        'Date: ' + signedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        'Time: ' + signedAt.toLocaleTimeString('en-GB'),
        'Document: ' + (req.document_type === 'written_statement' ? 'Written Statement of Terms' : 'Tenancy Document'),
        'IP Address: ' + ipAddress,
        '',
        'This document was electronically signed under the Electronic Communications Act 2000.'
      ];
      lines.forEach(function (l, i) { doc.text(l, 20, 36 + i * 8); });
      try { doc.addImage(sigDataUrl, 'PNG', 20, 104, 80, 28); } catch (e) {}

      _toast('Uploading signed document…');
      var pdfBlob = doc.output('blob');
      var filename = 'signed_' + req.token + '_' + Date.now() + '.pdf';
      var _b = await sb.storage.from('signed-documents').upload(filename, pdfBlob, { contentType: 'application/pdf' });
      if (_b.error) throw new Error('Upload failed: ' + _b.error.message);
      var _c = sb.storage.from('signed-documents').getPublicUrl(filename);
      var signedPdfUrl = _c.data.publicUrl;

      await sb.from('esign_requests').update({
        status: 'signed',
        signed_at: signedAt.toISOString(),
        signed_pdf_url: signedPdfUrl,
        ip_address: ipAddress
      }).eq('id', req.id);

      try {
        await sb.from('audit_log').insert({
          action: 'document_signed',
          table_name: 'esign_requests',
          record_id: String(req.id),
          details: 'Signed via tenant portal. IP: ' + ipAddress,
          user_id: null
        });
      } catch (e) {}

      _toast('Sending confirmation emails…');
      var signedTimeStr = signedAt.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      var tenantEmailHtml = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:28px 24px;color:#1A2B45">' +
        '<div style="border-bottom:2px solid #0B1E3D;padding-bottom:12px;margin-bottom:20px"><span style="font-size:17px;font-weight:700;color:#0B1E3D">Rent<span style="color:#00C896">Safe AI</span></span></div>' +
        '<h2 style="font-size:16px;font-weight:600;margin-bottom:8px">Your signed document — ' + propAddr + '</h2>' +
        '<p style="font-size:13px;color:#7A8FA6;margin-bottom:20px">Hi ' + tenantName + ', thank you for signing your tenancy document.</p>' +
        '<div style="background:#F6F8FB;border-radius:8px;padding:16px;margin-bottom:24px">' +
        '<div style="font-size:12px;color:#7A8FA6;margin-bottom:2px">Signed at</div><div style="font-size:13px;font-weight:600">' + signedTimeStr + '</div></div>' +
        '<div style="text-align:center;margin:24px 0"><a href="' + signedPdfUrl + '" style="background:#0B1E3D;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">⬇ Download signed document</a></div>' +
        '<div style="margin-top:20px;padding-top:14px;border-top:1px solid #eee;font-size:11px;color:#999">Sent via RentSafe AI · documents@rentsafeai.co.uk</div></div>';

      var landlordEmailHtml = '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:28px 24px;color:#1A2B45">' +
        '<div style="border-bottom:2px solid #0B1E3D;padding-bottom:12px;margin-bottom:20px"><span style="font-size:17px;font-weight:700;color:#0B1E3D">Rent<span style="color:#00C896">Safe AI</span></span></div>' +
        '<h2 style="font-size:16px;font-weight:600;margin-bottom:8px">Tenant has signed — ' + tenantName + ', ' + propAddr + '</h2>' +
        '<div style="background:#F6F8FB;border-radius:8px;padding:16px;margin-bottom:20px">' +
        '<div style="font-size:12px;color:#7A8FA6;margin-bottom:2px">Tenant</div><div style="font-size:13px;font-weight:600;margin-bottom:10px">' + tenantName + '</div>' +
        '<div style="font-size:12px;color:#7A8FA6;margin-bottom:2px">Property</div><div style="font-size:13px;font-weight:600;margin-bottom:10px">' + propAddr + '</div>' +
        '<div style="font-size:12px;color:#7A8FA6;margin-bottom:2px">Signed at</div><div style="font-size:13px;font-weight:600;margin-bottom:10px">' + signedTimeStr + '</div>' +
        '<div style="font-size:12px;color:#7A8FA6;margin-bottom:2px">IP address</div><div style="font-size:13px;font-weight:600">' + ipAddress + '</div></div>' +
        '<div style="text-align:center;margin:24px 0"><a href="' + signedPdfUrl + '" style="background:#0B1E3D;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">⬇ Download signed document</a></div>' +
        '<div style="margin-top:20px;padding-top:14px;border-top:1px solid #eee;font-size:11px;color:#999">Sent via RentSafe AI · documents@rentsafeai.co.uk</div></div>';

      if (tenant?.email) {
        await fetch(EDGE_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'send_email', to: tenant.email, subject: 'Your signed document — ' + propAddr, html: tenantEmailHtml })
        }).catch(function () {});
      }
      if (tenant?.landlord_email) {
        await fetch(EDGE_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'send_email', to: tenant.landlord_email, subject: 'Tenant has signed — ' + tenantName + ', ' + propAddr, html: landlordEmailHtml })
        }).catch(function () {});
      }

      document.getElementById('esign-sign-flow').style.display = 'none';
      document.getElementById('esign-success').style.display = 'block';
      document.getElementById('esign-download-link').href = signedPdfUrl;

    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = 'Sign Document';
      btn.style.opacity = '1';
      _toast('Error signing document: ' + e.message, true);
    }
  }

  // ── PUBLIC API ───────────────────────────────────────────────────────────────

  window.acceptEsignConsent = acceptEsignConsent;
  window.clearSignature     = clearSignature;
  window.signDocument       = signDocument;

  // ── BOOT ──────────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', init);

})();
