/* PHW guide editor.
   The password is never checked here — it is sent with each write and verified
   server-side in /api/*. Anything in this file is public, so treat it as public. */
(function () {
  'use strict';

  var pw = '';            // in memory only, for this tab, until sign-out
  var doc = null;         // the guide document being edited
  var sha = null;         // git sha of content/guide.json when we loaded it
  var current = 0;        // index of the section being edited
  var dirty = false;

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- helpers ---------------- */

  function markDirty() {
    dirty = true;
    $('state').textContent = 'Unsaved changes';
    $('state').classList.add('dirty');
    $('btn-save').disabled = false;
  }

  function markClean(msg) {
    dirty = false;
    $('state').textContent = msg || 'Saved';
    $('state').classList.remove('dirty');
    $('btn-save').disabled = true;
  }

  function slug(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  }

  function move(arr, i, delta) {
    var j = i + delta;
    if (j < 0 || j >= arr.length) return false;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    return true;
  }

  function api(path, payload) {
    return fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.assign({ password: pw }, payload))
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
        return data;
      }, function () { throw new Error('HTTP ' + r.status); });
    });
  }

  function showErr(msg) {
    $('err').textContent = msg || '';
  }

  /* ---------------- small field builders ---------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function labelled(text, control) {
    var row = el('div', 'adm-row');
    row.appendChild(el('span', 'adm-label', text));
    row.appendChild(control);
    control.style.flex = '1';
    return row;
  }

  function input(value, onChange, placeholder) {
    var i = el('input', 'adm-field');
    i.type = 'text';
    i.value = value || '';
    if (placeholder) i.placeholder = placeholder;
    i.addEventListener('input', function () { onChange(i.value); markDirty(); });
    return i;
  }

  function checkbox(text, checked, onChange) {
    var l = el('label', 'adm-check');
    var c = document.createElement('input');
    c.type = 'checkbox';
    c.checked = !!checked;
    c.addEventListener('change', function () { onChange(c.checked); markDirty(); });
    l.appendChild(c);
    l.appendChild(el('span', null, text));
    return l;
  }

  function select(options, value, onChange) {
    var s = el('select', 'adm-field');
    options.forEach(function (o) {
      var op = document.createElement('option');
      op.value = o[0];
      op.textContent = o[1];
      s.appendChild(op);
    });
    s.value = value;
    s.addEventListener('change', function () { onChange(s.value); markDirty(); });
    return s;
  }

  // textarea with a tiny Bold/Italic toolbar so officers never type a tag
  function richText(value, onChange, rows) {
    var wrap = el('div');
    var bar = el('div', 'adm-fmt');
    var ta = el('textarea', 'adm-field');
    ta.value = value || '';
    if (rows) ta.rows = rows;
    ta.addEventListener('input', function () { onChange(ta.value); markDirty(); });

    [['B', 'strong'], ['I', 'em']].forEach(function (p) {
      var b = el('button', null, p[0]);
      b.type = 'button';
      if (p[1] === 'em') b.style.fontStyle = 'italic';
      b.addEventListener('click', function () {
        var s = ta.selectionStart, e = ta.selectionEnd;
        if (s === e) { ta.focus(); return; }
        var sel = ta.value.slice(s, e);
        ta.value = ta.value.slice(0, s) + '<' + p[1] + '>' + sel + '</' + p[1] + '>' + ta.value.slice(e);
        onChange(ta.value);
        markDirty();
        ta.focus();
        ta.selectionStart = s;
        ta.selectionEnd = e + p[1].length * 2 + 5;
      });
      bar.appendChild(b);
    });
    bar.appendChild(el('em', null, 'select text, then B or I'));

    wrap.appendChild(bar);
    wrap.appendChild(ta);
    return wrap;
  }

  /* ---------------- image upload ---------------- */

  function uploadFile(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error('That file is not an image.'));
      if (file.size > 4 * 1024 * 1024) return reject(new Error('Image is larger than 4 MB — please shrink it first.'));
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('Could not read the file.')); };
      fr.onload = function () {
        var base64 = String(fr.result).split(',')[1];
        api('/api/upload', { filename: file.name, base64: base64 })
          .then(function (r) { resolve(r.path); }, reject);
      };
      fr.readAsDataURL(file);
    });
  }

  function dropZone(onPath) {
    var z = el('div', 'adm-drop', 'Drop an image here, or click to choose one');
    var picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.hidden = true;

    function take(file) {
      if (!file) return;
      z.textContent = 'Uploading ' + file.name + '…';
      uploadFile(file).then(function (path) {
        z.textContent = 'Drop an image here, or click to choose one';
        onPath(path);
        markDirty();
      }, function (e) {
        z.textContent = 'Drop an image here, or click to choose one';
        showErr(e.message);
      });
    }

    z.addEventListener('click', function () { picker.click(); });
    picker.addEventListener('change', function () { take(picker.files[0]); picker.value = ''; });
    z.addEventListener('dragover', function (e) { e.preventDefault(); z.classList.add('over'); });
    z.addEventListener('dragleave', function () { z.classList.remove('over'); });
    z.addEventListener('drop', function (e) {
      e.preventDefault();
      z.classList.remove('over');
      take(e.dataTransfer.files[0]);
    });

    z.appendChild(picker);
    return z;
  }

  /* ---------------- per-type editors ---------------- */

  var EDITORS = {
    heading: function (b) {
      var box = el('div');
      box.appendChild(labelled('Text', input(b.text, function (v) { b.text = v; })));
      box.appendChild(checkbox('Small note-style heading', b.small, function (v) { b.small = v; }));
      return box;
    },

    text: function (b) {
      return richText(b.html, function (v) { b.html = v; }, 4);
    },

    list: function (b) {
      var box = el('div');
      box.appendChild(checkbox('Numbered list', b.ordered, function (v) { b.ordered = v; }));
      var ta = el('textarea', 'adm-field');
      ta.rows = Math.max(3, b.items.length + 1);
      ta.value = b.items.join('\n');
      ta.placeholder = 'One item per line';
      ta.addEventListener('input', function () {
        b.items = ta.value.split('\n').filter(function (x) { return x.trim(); });
        markDirty();
      });
      box.appendChild(el('div', 'adm-label', 'One item per line'));
      box.appendChild(ta);
      return box;
    },

    tip: function (b) {
      var box = el('div');
      box.appendChild(checkbox('Red warning style (for "do not do this")', b.warn, function (v) { b.warn = v; }));
      box.appendChild(richText(b.html, function (v) { b.html = v; }, 3));
      return box;
    },

    choices: function (b) {
      var box = el('div');
      function draw() {
        box.innerHTML = '';
        b.items.forEach(function (c, i) {
          var sub = el('div', 'adm-sub');
          var head = el('div', 'adm-row');
          head.appendChild(input(c.label, function (v) { c.label = v; }, 'Label, e.g. Option 1'));
          head.lastChild.style.flex = '1';
          [['▲', -1], ['▼', 1]].forEach(function (p) {
            var btn = el('button', 'adm-icon', p[0]);
            btn.disabled = (p[1] < 0 && i === 0) || (p[1] > 0 && i === b.items.length - 1);
            btn.addEventListener('click', function () { if (move(b.items, i, p[1])) { markDirty(); draw(); } });
            head.appendChild(btn);
          });
          var del = el('button', 'adm-icon danger', '×');
          del.addEventListener('click', function () { b.items.splice(i, 1); markDirty(); draw(); });
          head.appendChild(del);
          sub.appendChild(head);
          sub.appendChild(richText(c.html, function (v) { c.html = v; }, 2));
          sub.appendChild(checkbox('Highlight as the recommended choice', c.good, function (v) { c.good = v; }));
          box.appendChild(sub);
        });
        var add = el('button', 'btn-sm', '+ Add choice');
        add.addEventListener('click', function () {
          b.items.push({ label: 'Option ' + (b.items.length + 1), html: '', good: false });
          markDirty(); draw();
        });
        box.appendChild(add);
      }
      draw();
      return box;
    },

    figures: function (b) {
      var box = el('div');
      function draw() {
        box.innerHTML = '';
        box.appendChild(labelled('Layout', select([
          ['grid', 'Side by side (2-3 per row)'],
          ['one', 'Single, medium width'],
          ['full', 'Single, full width — best for detailed screenshots'],
          ['narrow', 'Narrow — best for tall portrait images']
        ], b.layout || 'grid', function (v) { b.layout = v; })));

        b.items.forEach(function (f, i) {
          var sub = el('div', 'adm-sub');
          if (f.src) {
            var img = el('img', 'adm-thumb');
            img.src = f.src;
            img.alt = '';
            sub.appendChild(img);
          }
          var head = el('div', 'adm-row');
          head.appendChild(el('span', 'adm-label', 'Image ' + (i + 1)));
          head.appendChild(el('span', null, ''));
          head.lastChild.style.flex = '1';
          [['▲', -1], ['▼', 1]].forEach(function (p) {
            var btn = el('button', 'adm-icon', p[0]);
            btn.disabled = (p[1] < 0 && i === 0) || (p[1] > 0 && i === b.items.length - 1);
            btn.addEventListener('click', function () { if (move(b.items, i, p[1])) { markDirty(); draw(); } });
            head.appendChild(btn);
          });
          var del = el('button', 'adm-icon danger', '×');
          del.addEventListener('click', function () { b.items.splice(i, 1); markDirty(); draw(); });
          head.appendChild(del);
          sub.appendChild(head);
          sub.appendChild(labelled('Caption', input(f.caption, function (v) { f.caption = v; })));
          sub.appendChild(labelled('Alt text', input(f.alt, function (v) { f.alt = v; },
            'Describes the image for screen readers')));
          sub.appendChild(dropZone(function (path) { f.src = path; draw(); }));
          box.appendChild(sub);
        });

        box.appendChild(dropZone(function (path) {
          b.items.push({ src: path, alt: '', caption: '' });
          draw();
        }));
      }
      draw();
      return box;
    },

    table: function (b) {
      var box = el('div');
      var head = el('textarea', 'adm-field');
      head.rows = 2;
      head.value = (b.head || []).join(' | ');
      head.placeholder = 'Column 1 | Column 2 | Column 3';
      head.addEventListener('input', function () {
        b.head = head.value.split('|').map(function (s) { return s.trim(); });
        markDirty();
      });
      box.appendChild(el('div', 'adm-label', 'Header row — separate columns with |'));
      box.appendChild(head);

      var rows = el('textarea', 'adm-field');
      rows.rows = Math.max(4, (b.rows || []).length + 1);
      rows.value = (b.rows || []).map(function (r) { return r.join(' | '); }).join('\n');
      rows.placeholder = 'One row per line, columns separated with |';
      rows.addEventListener('input', function () {
        b.rows = rows.value.split('\n').filter(function (l) { return l.trim(); })
          .map(function (l) { return l.split('|').map(function (c) { return c.trim(); }); });
        markDirty();
      });
      box.appendChild(el('div', 'adm-label', 'Rows — one per line, columns separated with |'));
      box.appendChild(rows);
      return box;
    }
  };

  var BLANK = {
    heading: function () { return { type: 'heading', text: 'New heading', small: false }; },
    text:    function () { return { type: 'text', html: '' }; },
    list:    function () { return { type: 'list', ordered: false, items: [] }; },
    tip:     function () { return { type: 'tip', warn: false, html: '' }; },
    choices: function () { return { type: 'choices', items: [{ label: 'Option 1', html: '', good: false }] }; },
    figures: function () { return { type: 'figures', layout: 'grid', items: [] }; },
    table:   function () { return { type: 'table', head: [], rows: [] }; }
  };

  var LABELS = {
    heading: 'Heading', text: 'Paragraph', list: 'List', tip: 'Callout box',
    choices: 'Choice cards', figures: 'Images', table: 'Table'
  };

  /* ---------------- section + block panes ---------------- */

  function drawSections() {
    var list = $('sec-list');
    list.innerHTML = '';
    doc.sections.forEach(function (s, i) {
      var b = el('button', 'adm-sec-btn' + (i === current ? ' on' : ''));
      b.appendChild(el('span', null, s.title || '(untitled)'));
      b.addEventListener('click', function () { current = i; drawSections(); drawPane(); });
      list.appendChild(b);
    });
  }

  function drawPane() {
    var pane = $('pane');
    pane.innerHTML = '';
    var s = doc.sections[current];
    if (!s) { pane.appendChild(el('p', 'adm-empty', 'No section selected.')); return; }

    // section header controls
    var head = el('div', 'adm-block');
    var hrow = el('div', 'adm-block-head');
    hrow.appendChild(el('span', 'adm-kind', 'Section'));
    [['▲', -1], ['▼', 1]].forEach(function (p) {
      var btn = el('button', 'adm-icon', p[0]);
      btn.disabled = (p[1] < 0 && current === 0) || (p[1] > 0 && current === doc.sections.length - 1);
      btn.addEventListener('click', function () {
        if (move(doc.sections, current, p[1])) { current += p[1]; markDirty(); drawSections(); drawPane(); }
      });
      hrow.appendChild(btn);
    });
    var delSec = el('button', 'adm-icon danger', '×');
    delSec.title = 'Delete this whole section';
    delSec.addEventListener('click', function () {
      if (!confirm('Delete the section "' + s.title + '" and everything in it?')) return;
      doc.sections.splice(current, 1);
      current = Math.max(0, current - 1);
      markDirty(); drawSections(); drawPane();
    });
    hrow.appendChild(delSec);
    head.appendChild(hrow);
    head.appendChild(labelled('Title', input(s.title, function (v) {
      s.title = v;
      drawSections();
    })));
    head.appendChild(labelled('Menu label', input(s.nav, function (v) { s.nav = v; },
      'Shown in the Contents list')));
    pane.appendChild(head);

    // blocks
    (s.blocks || []).forEach(function (b, i) {
      var card = el('div', 'adm-block');
      var row = el('div', 'adm-block-head');
      row.appendChild(el('span', 'adm-kind', LABELS[b.type] || b.type));
      [['▲', -1], ['▼', 1]].forEach(function (p) {
        var btn = el('button', 'adm-icon', p[0]);
        btn.disabled = (p[1] < 0 && i === 0) || (p[1] > 0 && i === s.blocks.length - 1);
        btn.addEventListener('click', function () { if (move(s.blocks, i, p[1])) { markDirty(); drawPane(); } });
        row.appendChild(btn);
      });
      var del = el('button', 'adm-icon danger', '×');
      del.addEventListener('click', function () {
        if (!confirm('Delete this ' + (LABELS[b.type] || b.type) + '?')) return;
        s.blocks.splice(i, 1); markDirty(); drawPane();
      });
      row.appendChild(del);
      card.appendChild(row);
      var ed = EDITORS[b.type];
      card.appendChild(ed ? ed(b) : el('p', 'adm-empty', 'This block type cannot be edited here.'));
      pane.appendChild(card);
    });

    // add-block buttons
    var add = el('div', 'adm-add');
    Object.keys(BLANK).forEach(function (t) {
      var b = el('button', 'btn-sm', '+ ' + LABELS[t]);
      b.addEventListener('click', function () {
        s.blocks.push(BLANK[t]());
        markDirty();
        drawPane();
        window.scrollTo(0, document.body.scrollHeight);
      });
      add.appendChild(b);
    });
    pane.appendChild(add);
  }

  /* ---------------- load / save ---------------- */

  function load() {
    return api('/api/load', {}).then(function (r) {
      doc = r.doc;
      sha = r.sha;
      current = 0;
      markClean('Loaded');
      drawSections();
      drawPane();
    });
  }

  function save() {
    showErr('');
    $('btn-save').disabled = true;
    $('state').textContent = 'Saving…';
    doc.sections.forEach(function (s) { if (!s.id) s.id = slug(s.title); });

    api('/api/save', { doc: doc, sha: sha }).then(function (r) {
      sha = r.sha;
      markClean('Published — the site updates in about a minute');
    }, function (e) {
      $('btn-save').disabled = false;
      $('state').textContent = 'Not saved';
      $('state').classList.add('dirty');
      if (/conflict/i.test(e.message)) {
        showErr('Someone else saved changes while you were editing. ' +
                'Copy anything you need, then reload this page to get their version.');
      } else {
        showErr('Could not save: ' + e.message);
      }
    });
  }

  /* ---------------- wiring ---------------- */

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('login-btn');
    btn.disabled = true;
    $('login-err').textContent = '';
    pw = $('pw').value;
    load().then(function () {
      $('login').hidden = true;
      $('editor').hidden = false;
    }, function (err) {
      pw = '';
      btn.disabled = false;
      $('login-err').textContent = /401|password/i.test(err.message)
        ? 'Wrong password.' : err.message;
    });
  });

  $('btn-save').addEventListener('click', save);

  $('btn-out').addEventListener('click', function () {
    if (dirty && !confirm('You have unsaved changes. Sign out anyway?')) return;
    location.reload();
  });

  $('btn-add-sec').addEventListener('click', function () {
    var title = prompt('Name of the new section:');
    if (!title) return;
    doc.sections.push({ id: slug(title), nav: title, title: title, blocks: [] });
    current = doc.sections.length - 1;
    markDirty();
    drawSections();
    drawPane();
  });

  $('btn-preview').addEventListener('click', function () {
    PHW.render(doc, { body: $('preview-body') });
    $('preview-dlg').showModal();
  });
  $('preview-close').addEventListener('click', function () { $('preview-dlg').close(); });

  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });
})();
