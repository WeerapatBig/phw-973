// Turns guide.json into the same markup the page used to have hand-written.
// Shared by guide.html (live page) and admin.html (preview).
window.PHW = (function () {

  var el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  var blockRenderers = {
    heading: function (b) {
      var h = el('h3', null, b.text);
      if (b.small) h.classList.add('sub');
      return h;
    },

    text: function (b) { return el('p', null, b.html); },

    list: function (b) {
      var l = el(b.ordered ? 'ol' : 'ul');
      b.items.forEach(function (i) { l.appendChild(el('li', null, i)); });
      return l;
    },

    tip: function (b) {
      var d = el('div', 'tip' + (b.warn ? ' warn' : ''));
      d.appendChild(el('p', null, b.html));
      return d;
    },

    choices: function (b) {
      var d = el('div', 'choices');
      b.items.forEach(function (c) {
        var row = el('div', 'choice' + (c.good ? ' good' : ''));
        row.appendChild(el('b', null, c.label));
        row.appendChild(el('span', null, c.html));
        d.appendChild(row);
      });
      return d;
    },

    figures: function (b) {
      var layout = b.layout && b.layout !== 'grid' ? ' ' + b.layout : '';
      var d = el('div', 'figs' + layout);
      b.items.forEach(function (f) {
        var fig = el('figure');
        var a = el('a');
        a.href = f.src;
        var img = el('img');
        img.src = f.src;
        img.alt = f.alt || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        a.appendChild(img);
        fig.appendChild(a);
        fig.appendChild(el('figcaption', null, f.caption || ''));
        d.appendChild(fig);
      });
      return d;
    },

    table: function (b) {
      var t = el('table');
      if (b.head && b.head.length) {
        var thead = el('thead'), hr = el('tr');
        b.head.forEach(function (h) { hr.appendChild(el('th', null, h)); });
        thead.appendChild(hr);
        t.appendChild(thead);
      }
      var tbody = el('tbody');
      (b.rows || []).forEach(function (row) {
        var tr = el('tr');
        row.forEach(function (cell) { tr.appendChild(el('td', null, cell)); });
        tbody.appendChild(tr);
      });
      t.appendChild(tbody);
      return t;
    }
  };

  function renderBlock(b) {
    var fn = blockRenderers[b.type];
    // ponytail: unknown type = content written by a newer version of the editor.
    // Say so in place rather than rendering nothing and looking like data loss.
    if (!fn) return el('p', 'wip', 'Unsupported block type: ' + b.type);
    return fn(b);
  }

  function renderSection(s) {
    var sec = el('section');
    sec.id = s.id;
    sec.appendChild(el('h2', null, s.title));
    (s.blocks || []).forEach(function (b) { sec.appendChild(renderBlock(b)); });
    return sec;
  }

  function render(doc, targets) {
    if (targets.eyebrow) targets.eyebrow.textContent = doc.page.eyebrow || '';
    if (targets.title) targets.title.textContent = doc.page.title || '';
    if (targets.intro) targets.intro.innerHTML = doc.page.intro || '';

    if (targets.toc) {
      targets.toc.innerHTML = '';
      doc.sections.forEach(function (s) {
        var a = el('a', null, s.nav || s.title);
        a.href = '#' + s.id;
        targets.toc.appendChild(a);
      });
    }

    targets.body.innerHTML = '';
    doc.sections.forEach(function (s) { targets.body.appendChild(renderSection(s)); });

    // a #hash in the URL was useless before the content existed — honour it now
    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) t.scrollIntoView();
    }
  }

  return { render: render, renderBlock: renderBlock, blockTypes: Object.keys(blockRenderers) };
})();
