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

  // Guide documents used to be a flat list of sections. Anything still in that
  // shape is folded into one group so old files keep working untouched.
  function normalize(doc) {
    if (!doc.groups) {
      doc.groups = [{
        id: 'season-3',
        title: 'Guide Season 3',
        intro: (doc.page && doc.page.intro) || '',
        sections: doc.sections || []
      }];
    }
    delete doc.sections;
    if (doc.page) delete doc.page.intro;
    doc.groups.forEach(function (g) { g.sections = g.sections || []; });
    return doc;
  }

  function groupOfSection(doc, sectionId) {
    for (var i = 0; i < doc.groups.length; i++) {
      var g = doc.groups[i];
      if (g.id === sectionId) return i;
      for (var j = 0; j < g.sections.length; j++) {
        if (g.sections[j].id === sectionId) return i;
      }
    }
    return -1;
  }

  // Renders one group's sections into `target`.
  function renderGroup(group, target) {
    target.innerHTML = '';
    (group.sections || []).forEach(function (s) { target.appendChild(renderSection(s)); });
    if (!group.sections || !group.sections.length) {
      target.appendChild(el('p', 'wip', 'Nothing has been written here yet.'));
    }
  }

  // Which section are you reading? Given each section's top edge in viewport
  // coordinates (document order), it is the last one that has passed under the
  // sticky header. Kept pure so check.js can exercise it without a browser.
  function pickCurrent(tops, offset) {
    if (!tops.length) return null;
    var cur = tops[0].id;
    for (var i = 0; i < tops.length; i++) {
      if (tops[i].top <= offset) cur = tops[i].id;
    }
    return cur;
  }

  return {
    normalize: normalize,
    pickCurrent: pickCurrent,
    groupOfSection: groupOfSection,
    renderGroup: renderGroup,
    renderSection: renderSection,
    renderBlock: renderBlock,
    blockTypes: Object.keys(blockRenderers)
  };
})();
