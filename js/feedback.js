/**
 * js/feedback.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Feedback & Suggestions page logic.
 *
 * Responsibilities:
 *   1. Require authenticated session (redirect to login.html if none)
 *   2. Handle type toggle (Bug / Feature)
 *   3. Validate form fields before submission
 *   4. Upload attachments to Supabase Storage (documents bucket)
 *   5. Insert feedback row into the feedback table
 *   6. Show success state on completion
 *
 * Depends on: js/lib/supabase-client.js, js/lib/auth.js, js/lib/ui.js
 * Exposed globals: none (fully self-contained IIFE)
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ── PRIVATE STATE ────────────────────────────────────────────────────────────
  var _userId    = null;
  var _userEmail = null;
  var _type      = 'bug';
  var _files     = [];  // File objects selected by user

  var MAX_FILES     = 5;
  var MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5 MB

  // ── INIT ─────────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async function () {

    var session = await window.RSA.Auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    _userId    = session.user.id;
    _userEmail = session.user.email;

    _wireEvents();
  });

  // ── EVENT WIRING ─────────────────────────────────────────────────────────────

  function _wireEvents() {

    // Type toggle cards
    var cards = document.querySelectorAll('.type-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        _type = card.dataset.type;
        cards.forEach(function (c) { c.classList.remove('type-active'); });
        card.classList.add('type-active');
      });
    });

    // Title char count
    var titleEl = document.getElementById('fb-title');
    if (titleEl) {
      titleEl.addEventListener('input', function () {
        var count = document.getElementById('fb-title-count');
        if (count) count.textContent = titleEl.value.length + ' / 120';
      });
    }

    // Description char count
    var descEl = document.getElementById('fb-description');
    if (descEl) {
      descEl.addEventListener('input', function () {
        var count = document.getElementById('fb-desc-count');
        if (count) count.textContent = descEl.value.length + ' / 2000';
      });
    }

    // File upload area click
    var uploadArea = document.getElementById('file-upload-area');
    if (uploadArea) {
      uploadArea.addEventListener('click', function () {
        var input = document.getElementById('fb-files');
        if (input) input.click();
      });
    }

    // File input change
    var fileInput = document.getElementById('fb-files');
    if (fileInput) {
      fileInput.addEventListener('change', function () { _onFilesSelected(fileInput); });
    }

    // Drag and drop
    if (uploadArea) {
      uploadArea.addEventListener('dragover', function (e) { e.preventDefault(); uploadArea.style.borderColor = 'var(--navy)'; });
      uploadArea.addEventListener('dragleave', function () { uploadArea.style.borderColor = ''; });
      uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        if (e.dataTransfer && e.dataTransfer.files.length) {
          _addFiles(e.dataTransfer.files);
        }
      });
    }

    // Submit button
    var submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', _submitFeedback);
    }
  }

  // ── FILE HANDLING ────────────────────────────────────────────────────────────

  function _onFilesSelected(input) {
    if (input.files.length) _addFiles(input.files);
    input.value = '';
  }

  function _addFiles(fileList) {
    var errEl = document.getElementById('feedback-error');

    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        window.RSA.UI.showError(errEl, '"' + file.name + '" exceeds the 5 MB limit.');
        return;
      }

      // Validate type
      var ext = file.name.split('.').pop().toLowerCase();
      if (['png','jpg','jpeg','pdf'].indexOf(ext) === -1) {
        window.RSA.UI.showError(errEl, '"' + file.name + '" is not an accepted file type (PNG, JPG, PDF).');
        return;
      }

      // Validate count
      if (_files.length >= MAX_FILES) {
        window.RSA.UI.showError(errEl, 'Maximum ' + MAX_FILES + ' files allowed.');
        return;
      }

      _files.push(file);
    }

    _renderFileList();
  }

  function _removeFile(index) {
    _files.splice(index, 1);
    _renderFileList();
  }

  function _renderFileList() {
    var listEl     = document.getElementById('file-list');
    var hintEl     = document.getElementById('upload-hint');
    var uploadArea = document.getElementById('file-upload-area');

    if (!listEl) return;

    if (_files.length === 0) {
      listEl.innerHTML = '';
      if (hintEl) hintEl.style.display = '';
      if (uploadArea) uploadArea.classList.remove('has-files');
      return;
    }

    if (uploadArea) uploadArea.classList.add('has-files');
    if (hintEl) hintEl.style.display = _files.length >= MAX_FILES ? 'none' : '';

    var html = '';
    for (var i = 0; i < _files.length; i++) {
      var f = _files[i];
      var sizeKB = Math.round(f.size / 1024);
      html += '<div class="file-thumb">' +
        '<span>' + (f.type === 'application/pdf' ? '📄' : '🖼') + '</span>' +
        '<span class="file-thumb-name" title="' + _escAttr(f.name) + '">' + _escHtml(f.name) + '</span>' +
        '<span style="font-size:10px;color:var(--muted);flex-shrink:0">' + sizeKB + ' KB</span>' +
        '<button class="file-thumb-remove" data-index="' + i + '">✕</button>' +
      '</div>';
    }
    listEl.innerHTML = html;

    // Wire remove buttons
    var removes = listEl.querySelectorAll('.file-thumb-remove');
    removes.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        _removeFile(parseInt(btn.dataset.index));
      });
    });
  }

  // ── SUBMISSION ───────────────────────────────────────────────────────────────

  async function _submitFeedback() {
    var btn   = document.getElementById('submit-btn');
    var errEl = document.getElementById('feedback-error');

    window.RSA.UI.hideMessage(errEl);

    // Validate
    var title = document.getElementById('fb-title').value.trim();
    if (!title) {
      window.RSA.UI.showError(errEl, 'Please enter a brief description.');
      return;
    }

    var desc = document.getElementById('fb-description').value.trim();
    if (!desc) {
      window.RSA.UI.showError(errEl, 'Please enter a full description.');
      return;
    }

    var urgency = document.getElementById('fb-urgency').value;

    window.RSA.UI.setLoading(btn, true, 'Submitting…');

    try {
      var sb = window.RSA.sb;

      // Upload files first, collect paths
      var filePaths = [];
      for (var i = 0; i < _files.length; i++) {
        var f     = _files[i];
        var ext   = f.name.split('.').pop();
        var path  = 'feedback/' + _userId + '/' + Date.now() + '_' + i + '.' + ext;

        var upResult = await sb.storage.from('documents').upload(path, f, {
          contentType: f.type,
          upsert: false,
        });

        if (upResult.error) {
          // Log but continue — file upload failure shouldn't block feedback
          console.error('[feedback:upload]', upResult.error);
        } else {
          filePaths.push(path);
        }
      }

      // Insert feedback row
      var payload = {
        user_id:     _userId,
        type:        _type,
        title:       title,
        description: desc,
        urgency:     urgency,
        files:       filePaths,
        created_at:  new Date().toISOString(),
      };

      var result = await sb.from('feedback').insert(payload).select().single();

      if (result.error) {
        console.error('[feedback:insert]', result.error);
        window.RSA.UI.showError(errEl, 'Failed to submit: ' + result.error.message);
        return;
      }

      // Show success state
      var mainEl = document.getElementById('feedback-main');
      var successEl = document.getElementById('feedback-success');
      if (mainEl) mainEl.style.display = 'none';
      if (successEl) successEl.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('[feedback:_submitFeedback]', err);
      window.RSA.UI.showError(errEl, 'Unexpected error. Please try again.');
    } finally {
      window.RSA.UI.setLoading(btn, false, 'Submit Feedback');
    }
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────────

  function _escHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function _escAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

})();
