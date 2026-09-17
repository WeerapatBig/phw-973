// Guide page: collapsible table of contents, one group shown at a time,
// and a scroll spy that highlights whichever section you are reading.
(function () {
  'use strict';

  var doc = null;
  var active = 0;       // index of the group being shown
  var spy = null;

  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- table of contents ---------- */

  function buildToc() {
    var root = $('pg-toc');
    root.innerHTML = '';

    doc.groups.forEach(function (g, gi) {
      var wrap = el('div', 'toc-group' + (gi === active ? ' open' : ''));

      var head = el('button', 'toc-group-head');
      head.type = 'button';
      head.setAttribute('aria-expanded', gi === active ? 'true' : 'false');
      head.appendChild(el('span', 'toc-caret', '›'));
      head.appendChild(el('span', null, g.title));
      head.addEventListener('click', function () {
        // Accordion: opening a group is also what shows its content.
        if (gi === active) { wrap.classList.toggle('open'); syncCaret(); return; }
        show(gi, (g.sections[0] || {}).id);
      });
      wrap.appendChild(head);

      var list = el('div', 'toc-links');
      g.sections.forEach(function (s) {
        var a = el('a', null, s.nav || s.title);
        a.href = '#' + s.id;
        a.dataset.section = s.id;
        list.appendChild(a);
      });
      wrap.appendChild(list);
      root.appendChild(wrap);
    });
  }

  function syncCaret() {
    [].forEach.call(document.querySelectorAll('.toc-group'), function (w) {
      var head = w.querySelector('.toc-group-head');
      if (head) head.setAttribute('aria-expanded', w.classList.contains('open') ? 'true' : 'false');
    });
  }

  /* ---------- scroll spy ---------- */

  function markCurrent(id) {
    [].forEach.call(document.querySelectorAll('#pg-toc a'), function (a) {
      if (a.dataset.section === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  var pickCurrent = PHW.pickCurrent;

  var HEADER = 90;   // sticky header height plus a little breathing room

  function startSpy() {
    if (spy) { window.removeEventListener('scroll', spy); window.removeEventListener('resize', spy); }

    var sections = [].slice.call(document.querySelectorAll('#pg-body section[id]'));
    if (!sections.length) { spy = null; return; }

    var queued = false;
    function update() {
      queued = false;
      var tops = sections.map(function (s) {
        return { id: s.id, top: s.getBoundingClientRect().top };
      });
      var id = pickCurrent(tops, HEADER);
      if (id) markCurrent(id);
    }

    spy = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('resize', spy);
    update();
  }


  /* ---------- showing a group ---------- */

  function show(groupIndex, scrollToId) {
    active = groupIndex;
    var g = doc.groups[active];

    $('pg-title').textContent = g.title || '';
    $('pg-intro').innerHTML = g.intro || '';
    $('pg-intro').hidden = !g.intro;

    PHW.renderGroup(g, $('pg-body'));
    buildToc();
    startSpy();

    if (scrollToId) {
      var t = document.getElementById(scrollToId);
      if (t) t.scrollIntoView();
      markCurrent(scrollToId);
      if (location.hash.slice(1) !== scrollToId) {
        history.replaceState(null, '', '#' + scrollToId);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }

  function showForHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    var gi = id ? PHW.groupOfSection(doc, id) : -1;
    if (gi < 0) return show(0);
    // a hash naming the group itself lands on its first section
    var g = doc.groups[gi];
    var isGroup = g.id === id;
    show(gi, isGroup ? (g.sections[0] || {}).id : id);
  }

  /* ---------- go ---------- */

  fetch('content/guide.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (d) {
      doc = PHW.normalize(d);
      if ($('pg-eyebrow') && doc.page && doc.page.eyebrow) {
        $('pg-eyebrow').textContent = doc.page.eyebrow;
      }
      showForHash();
      window.addEventListener('hashchange', function () {
        var id = decodeURIComponent(location.hash.slice(1));
        var gi = PHW.groupOfSection(doc, id);
        if (gi < 0) return;
        if (gi !== active) show(gi, id);
        else {
          var t = document.getElementById(id);
          if (t) t.scrollIntoView();
          markCurrent(id);
        }
      });
    })
    .catch(function (err) {
      $('pg-body').innerHTML =
        '<div class="tip warn"><p><strong>The guide could not be loaded.</strong> ' +
        'Please refresh the page, and tell an officer if it keeps happening. (' + err.message + ')</p></div>';
    });
})();
