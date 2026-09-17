// Click a figure -> open it in an in-page zoomable viewer. No library.
(function () {
  var MIN = 1, MAX = 8;
  var dlg, stage, img, cap, zLabel;
  var scale = 1, tx = 0, ty = 0;
  var pointers = new Map(), pinchDist = 0, panFrom = null;
  var downTarget = null, downAt = null, moved = false;
  var MOVE_SLOP = 6; // px of jitter still counted as a tap, not a drag

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'lb';
    dlg.innerHTML =
      '<div class="lb-bar">' +
        '<button class="lb-btn" data-act="out" title="Zoom out (-)" aria-label="Zoom out">&minus;</button>' +
        '<span class="lb-zoom">100%</span>' +
        '<button class="lb-btn" data-act="in" title="Zoom in (+)" aria-label="Zoom in">+</button>' +
        '<button class="lb-btn" data-act="reset" title="Reset (0)" aria-label="Reset zoom">Reset</button>' +
        '<button class="lb-btn lb-close" data-act="close" title="Close (Esc)" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="lb-stage"><img alt=""></div>' +
      '<p class="lb-cap"></p>';
    document.body.appendChild(dlg);
    stage = dlg.querySelector('.lb-stage');
    img = dlg.querySelector('img');
    cap = dlg.querySelector('.lb-cap');
    zLabel = dlg.querySelector('.lb-zoom');

    dlg.querySelector('.lb-bar').addEventListener('click', function (e) {
      var act = e.target.dataset.act;
      if (act === 'in') zoomAt(1.4);
      else if (act === 'out') zoomAt(1 / 1.4);
      else if (act === 'reset') reset();
      else if (act === 'close') dlg.close();
    });

    // Click the empty area around the image to close. Two traps here:
    // pointer capture retargets the click to the stage, so e.target is useless —
    // use where the press STARTED; and a drag/pinch also ends in a click, so
    // only a press that never moved counts as a click.
    stage.addEventListener('click', function () {
      if (downTarget === stage && !moved) dlg.close();
    });
    stage.addEventListener('dblclick', function (e) {
      scale > 1 ? reset() : zoomAt(2.5, e.clientX, e.clientY);
    });
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    }, { passive: false });

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
      stage.addEventListener(t, onUp);
    });

    dlg.addEventListener('keydown', function (e) {
      if (e.key === '+' || e.key === '=') zoomAt(1.4);
      else if (e.key === '-') zoomAt(1 / 1.4);
      else if (e.key === '0') reset();
    });
    // drop the decoded image on close; src='' would re-request the page URL
    dlg.addEventListener('close', function () { img.removeAttribute('src'); });
  }

  function apply() {
    img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    zLabel.textContent = Math.round(scale * 100) + '%';
    stage.classList.toggle('is-zoomed', scale > 1);
  }

  function clamp() {
    if (scale <= 1) { tx = ty = 0; return; }
    var r = img.getBoundingClientRect(), s = stage.getBoundingClientRect();
    var mx = Math.max(0, (r.width - s.width) / 2), my = Math.max(0, (r.height - s.height) / 2);
    tx = Math.min(mx, Math.max(-mx, tx));
    ty = Math.min(my, Math.max(-my, ty));
  }

  // cx,cy in viewport px; omit to zoom on the stage centre
  function zoomAt(factor, cx, cy) {
    var next = Math.min(MAX, Math.max(MIN, scale * factor));
    if (next === scale) return;
    var s = stage.getBoundingClientRect();
    var px = (cx == null ? s.left + s.width / 2 : cx) - (s.left + s.width / 2);
    var py = (cy == null ? s.top + s.height / 2 : cy) - (s.top + s.height / 2);
    var ratio = next / scale;
    tx = px - (px - tx) * ratio;
    ty = py - (py - ty) * ratio;
    scale = next;
    clamp();
    apply();
  }

  function reset() { scale = 1; tx = ty = 0; apply(); }

  function mid() {
    var p = Array.from(pointers.values());
    return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
  }
  function dist() {
    var p = Array.from(pointers.values());
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  function onDown(e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // capture is a nicety: never let it break the gesture if it throws
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    if (pointers.size === 1) {
      downTarget = e.target;
      downAt = { x: e.clientX, y: e.clientY };
      moved = false;
    }
    if (pointers.size === 2) { pinchDist = dist(); panFrom = null; moved = true; }
    else if (scale > 1) panFrom = { x: e.clientX - tx, y: e.clientY - ty };
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!moved && downAt &&
        Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > MOVE_SLOP) {
      moved = true;
    }
    if (pointers.size === 2) {
      var d = dist();
      if (pinchDist > 0) { var m = mid(); zoomAt(d / pinchDist, m.x, m.y); }
      pinchDist = d;
    } else if (panFrom) {
      tx = e.clientX - panFrom.x;
      ty = e.clientY - panFrom.y;
      clamp();
      apply();
    }
  }

  function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0) panFrom = null;
  }

  function open(src, caption) {
    if (!dlg) build();
    img.src = src;
    cap.textContent = caption || '';
    reset();
    dlg.showModal();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('.figs a');
    if (!a) return;
    e.preventDefault();
    var fig = a.closest('figure'), fc = fig && fig.querySelector('figcaption');
    open(a.getAttribute('href'), fc ? fc.textContent.trim() : '');
  });
})();
