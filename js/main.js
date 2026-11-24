/* Jaku – Dekoracje balonowe | main.js (bez bibliotek, ~9 KB) */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nagłówek i menu mobilne ---------- */
  var header = $('.site-header');
  var toggle = $('.nav-toggle');
  var nav = $('#menu');

  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function closeMenu() {
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); toggle.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 960) closeMenu(); });
  }

  /* Podświetlanie aktywnej sekcji w menu */
  var navLinks = $$('.nav__link');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) {
      var t = $(a.getAttribute('href'));
      if (t) spy.observe(t);
    });
  }

  /* ---------- Animacje wejścia (tylko elementy poniżej pierwszego ekranu) ---------- */
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealTargets = $$('.section__head, .occasion, .price, .step, .about__media, .about__text, .faq details, .cta__box, .form-card, .quote__intro');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealTargets.forEach(function (el, i) {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add('will-reveal');
      el.style.setProperty('--d', ((i % 4) * 0.07).toFixed(2) + 's');
      io.observe(el);
    });
  }

  /* ---------- Galeria: filtry, „pokaż więcej”, lightbox ---------- */
  var gallery = $('#gallery');
  if (gallery) {
    var items = $$('.gallery__item', gallery);
    var filterBtns = $$('.filter');
    var moreBtn = $('#gallery-more');
    var countEl = $('#gallery-count');
    var PAGE = 12;
    var limit = PAGE;
    var current = 'all';

    var matching = function () {
      return items.filter(function (li) { return current === 'all' || li.dataset.cat === current; });
    };

    var render = function () {
      var list = matching();
      items.forEach(function (li) { li.hidden = true; });
      list.slice(0, limit).forEach(function (li) { li.hidden = false; });
      var shown = Math.min(limit, list.length);
      countEl.textContent = 'Wyświetlono ' + shown + ' z ' + list.length + ' realizacji';
      moreBtn.hidden = list.length <= limit;
    };

    var setFilter = function (f) {
      current = f;
      limit = PAGE;
      filterBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.filter === f)); });
      render();
    };

    filterBtns.forEach(function (b) { b.addEventListener('click', function () { setFilter(b.dataset.filter); }); });
    moreBtn.addEventListener('click', function () {
      var firstNew = matching()[limit];
      limit += PAGE;
      render();
      var btn = firstNew && $('.gallery__btn', firstNew);
      if (btn) btn.focus({ preventScroll: true });
    });
    $$('[data-filter-link]').forEach(function (a) {
      a.addEventListener('click', function () { setFilter(a.dataset.filterLink); });
    });
    render();

    /* Lightbox */
    var box = $('#lightbox');
    var boxImg = $('#lightbox-img');
    var boxCap = $('#lightbox-cap');
    var idx = 0;
    var visible = [];

    var show = function (i) {
      idx = (i + visible.length) % visible.length;
      var img = $('img', visible[idx]);
      boxImg.src = img.getAttribute('src').replace('-sm.', '-lg.');
      boxImg.alt = img.alt;
      boxCap.textContent = img.alt;
      var nxt = new Image();
      nxt.src = $('img', visible[(idx + 1) % visible.length]).getAttribute('src').replace('-sm.', '-lg.');
    };

    gallery.addEventListener('click', function (e) {
      var btn = e.target.closest('.gallery__btn');
      if (!btn || typeof box.showModal !== 'function') return;
      visible = items.filter(function (li) { return !li.hidden; });
      show(visible.indexOf(btn.parentNode));
      box.showModal();
      document.body.style.overflow = 'hidden';
    });
    box.addEventListener('close', function () { document.body.style.overflow = ''; });
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.classList.contains('lightbox__stage') || e.target.closest('.lightbox__close')) box.close();
      else if (e.target.closest('.lightbox__prev')) show(idx - 1);
      else if (e.target.closest('.lightbox__next')) show(idx + 1);
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---------- Formularz wyceny ---------- */
  var form = $('#quote-form');
  if (form) {
    form.noValidate = true;
    var statusEl = $('#form-status');
    var submitBtn = $('#submit-btn');
    var fileInput = $('#f-plik');
    var dz = $('#dropzone');
    var dzIcon = $('#dz-icon');
    var dzTitle = $('#dz-title');
    var dzSub = $('#dz-sub');
    var dateInput = $('#f-data');
    var unknownDate = $('#f-data-nieznana');
    var MAX_FILE = 15 * 1024 * 1024;
    var FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    var dzIconHTML = dzIcon.innerHTML;
    var dzSubText = dzSub.textContent;
    var previewURL = null;

    $('#f-ts').value = String(Date.now());

    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    var d = new Date();
    dateInput.min = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

    unknownDate.addEventListener('change', function () {
      dateInput.disabled = unknownDate.checked;
      dateInput.required = !unknownDate.checked;
      if (unknownDate.checked) { dateInput.value = ''; setError(dateInput, false); }
    });

    var setError = function (field, bad, msg) {
      var err = $('#err-' + field.id.replace(/^f-/, ''));
      field.setAttribute('aria-invalid', String(bad));
      if (err) {
        if (msg) err.textContent = msg;
        err.classList.toggle('is-visible', bad);
      }
      return !bad;
    };

    var validators = {
      'f-imie': function (f) { return f.value.trim().length >= 2; },
      'f-telefon': function (f) { var n = f.value.replace(/\D/g, ''); return /^[\d\s()+-]+$/.test(f.value.trim()) && n.length >= 9 && n.length <= 15; },
      'f-email': function (f) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim()); },
      'f-okazja': function (f) { return f.value !== ''; },
      'f-data': function (f) { return f.disabled || (f.value !== '' && (!f.min || f.value >= f.min)); },
      'f-lokalizacja': function (f) { return f.value.trim().length >= 2; },
      'f-link': function (f) { return f.value.trim() === '' || /^https?:\/\/\S+\.\S+/i.test(f.value.trim()); },
      'f-plik': function (f) { return !f.files.length || (FILE_TYPES.indexOf(f.files[0].type) > -1 && f.files[0].size <= MAX_FILE); },
      'f-zgoda': function (f) { return f.checked; }
    };

    var validateField = function (f) {
      var fn = validators[f.id];
      return fn ? setError(f, !fn(f)) : true;
    };

    Object.keys(validators).forEach(function (id) {
      var f = document.getElementById(id);
      var evt = (f.tagName === 'SELECT' || f.type === 'checkbox' || f.type === 'file' || f.type === 'date') ? 'change' : 'blur';
      f.addEventListener(evt, function () { validateField(f); });
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true') validateField(f); });
    });

    /* Zdjęcie inspiracji: podgląd, usuwanie, drag & drop */
    var resetFile = function () {
      fileInput.value = '';
      if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
      dz.classList.remove('has-file');
      dzIcon.innerHTML = dzIconHTML;
      dzTitle.textContent = 'Dodaj zdjęcie lub przeciągnij je tutaj';
      dzSub.textContent = dzSubText;
      setError(fileInput, false);
    };
    fileInput.addEventListener('change', function () {
      if (!fileInput.files.length) { resetFile(); return; }
      var file = fileInput.files[0];
      if (!validateField(fileInput)) { fileInput.value = ''; if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; } dz.classList.remove('has-file'); return; }
      if (previewURL) URL.revokeObjectURL(previewURL);
      previewURL = URL.createObjectURL(file);
      dzIcon.textContent = '';
      var im = new Image();
      im.alt = '';
      im.src = previewURL;
      dzIcon.appendChild(im);
      dzTitle.textContent = file.name;
      dzSub.textContent = (file.size / 1048576).toFixed(1).replace('.', ',') + ' MB – gotowe do wysłania';
      dz.classList.add('has-file');
    });
    $('#dz-clear').addEventListener('click', function (e) { e.preventDefault(); resetFile(); fileInput.focus(); });
    ['dragenter', 'dragover'].forEach(function (t) { dz.addEventListener(t, function () { dz.classList.add('is-drag'); }); });
    ['dragleave', 'drop'].forEach(function (t) { dz.addEventListener(t, function () { dz.classList.remove('is-drag'); }); });

    /* Zmniejszenie dużych zdjęć przed wysyłką (zdjęcia z telefonu bywają bardzo ciężkie) */
    var shrinkImage = function (file) {
      if (file.size < 1.5 * 1048576 || !window.createImageBitmap) return Promise.resolve(file);
      return createImageBitmap(file).then(function (bmp) {
        var max = 1800;
        var scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
        var c = document.createElement('canvas');
        c.width = Math.round(bmp.width * scale);
        c.height = Math.round(bmp.height * scale);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(bmp, 0, 0, c.width, c.height);
        return new Promise(function (res) {
          c.toBlob(function (blob) { res(blob && blob.size < file.size ? blob : file); }, 'image/jpeg', 0.85);
        });
      }).catch(function () { return file; });
    };

    var showStatus = function (type, text) {
      statusEl.className = 'status is-visible status--' + type;
      statusEl.textContent = text;
      statusEl.focus();
    };

    var setBusy = function (busy) {
      submitBtn.disabled = busy;
      submitBtn.firstElementChild.textContent = busy ? 'Wysyłanie…' : 'Wyślij zapytanie';
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      statusEl.className = 'status';
      var firstBad = null;
      Object.keys(validators).forEach(function (id) {
        var f = document.getElementById(id);
        if (!validateField(f) && !firstBad) firstBad = f;
      });
      if (firstBad) { firstBad.focus(); return; }

      setBusy(true);
      var fd = new FormData(form);
      var file = fileInput.files[0];
      var prepare = file ? shrinkImage(file).then(function (blob) {
        if (blob.size > 8 * 1048576) throw new Error('size');
        fd.set('inspiracja_plik', blob, blob === file ? file.name : 'inspiracja.jpg');
      }) : Promise.resolve();

      prepare.then(function () {
        return fetch(form.action, { method: 'POST', body: fd, headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' } });
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.ok, msg: j.message }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.msg || 'fail');
          form.reset();
          resetFile();
          unknownDate.dispatchEvent(new Event('change'));
          $('#f-ts').value = String(Date.now());
          showStatus('ok', 'Dziękuję! Zapytanie zostało wysłane. Odpowiem w ciągu 24 godzin na podany e-mail lub telefon.');
        })
        .catch(function (err) {
          var m = err && err.message === 'size' ? 'Zdjęcie jest zbyt duże. Wybierz mniejszy plik albo wyślij je w odpowiedzi na maila.' : (err && err.message && err.message !== 'fail' && err.message !== 'Failed to fetch' ? err.message : 'Nie udało się wysłać formularza. Spróbuj ponownie lub zadzwoń: 667 285 016.');
          showStatus('err', m);
        })
        .then(function () { setBusy(false); });
    });

    /* Powrót z wysyłki bez JS (przekierowanie z send.php) */
    var qs = window.location.search;
    if (/[?&]wyslano=1/.test(qs)) showStatus('ok', 'Dziękuję! Zapytanie zostało wysłane. Odpowiem w ciągu 24 godzin.');
    else if (/[?&]blad=1/.test(qs)) showStatus('err', 'Nie udało się wysłać formularza. Spróbuj ponownie lub zadzwoń: 667 285 016.');

    /* Przyciski cennika podpowiadają rodzaj dekoracji w formularzu */
    $$('[data-deco]').forEach(function (a) {
      a.addEventListener('click', function () {
        var cb = $$('input[name="dekoracje[]"]', form).filter(function (i) { return i.value === a.dataset.deco; })[0];
        if (cb) cb.checked = true;
      });
    });
  }

  /* ---------- Zgoda na cookies ---------- */
  var KEY = 'jaku_cookie_consent';
  var banner = null;

  var readConsent = function () {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  };
  var writeConsent = function (c) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* tryb prywatny */ }
  };

  /* Skrypty zewnętrzne (np. statystyki) dodawaj jako:
     <script type="text/plain" data-consent="analytics" src="..."></script>
     – uruchomią się dopiero po zgodzie użytkownika. */
  var activateScripts = function (c) {
    $$('script[type="text/plain"][data-consent]').forEach(function (s) {
      if (!c[s.dataset.consent] || s.dataset.active) return;
      var n = document.createElement('script');
      if (s.src) n.src = s.src; else n.textContent = s.textContent;
      s.dataset.active = '1';
      document.head.appendChild(n);
    });
  };

  var buildBanner = function () {
    var el = document.createElement('div');
    el.className = 'cookie';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'cookie-title');
    el.setAttribute('aria-describedby', 'cookie-desc');
    el.innerHTML =
      '<h2 class="cookie__title" id="cookie-title"><svg class="icon" aria-hidden="true" focusable="false"><use href="' + ICONS + '#i-cookie"/></svg>Szanuję Twoją prywatność</h2>' +
      '<p id="cookie-desc">Ta strona korzysta z niezbędnych technologii (np. zapamiętanie wyboru cookies). Za Twoją zgodą mogę też używać plików analitycznych i marketingowych. Szczegóły w <a href="' + BASE + 'polityka-prywatnosci.html#cookies">Polityce prywatności</a>.</p>' +
      '<div class="cookie__prefs" id="cookie-prefs" hidden>' +
        '<div class="cookie__row"><div><strong>Niezbędne</strong><span>Zapewniają działanie strony. Zawsze włączone.</span></div><label class="switch"><input type="checkbox" checked disabled aria-label="Niezbędne – zawsze włączone"><i></i></label></div>' +
        '<div class="cookie__row"><div><strong>Analityczne</strong><span>Anonimowe statystyki odwiedzin, dzięki którym ulepszam stronę.</span></div><label class="switch"><input type="checkbox" id="ck-analytics" aria-label="Analityczne"><i></i></label></div>' +
        '<div class="cookie__row"><div><strong>Marketingowe</strong><span>Dopasowanie treści i reklam do Twoich zainteresowań.</span></div><label class="switch"><input type="checkbox" id="ck-marketing" aria-label="Marketingowe"><i></i></label></div>' +
      '</div>' +
      '<div class="cookie__actions">' +
        '<button type="button" class="btn btn--primary btn--sm" data-ck="all">Akceptuję wszystkie</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-ck="necessary">Tylko niezbędne</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-ck="custom" aria-expanded="false" aria-controls="cookie-prefs">Dostosuj</button>' +
      '</div>';
    return el;
  };

  var ICONS = 'img/icons.svg';
  var BASE = '';
  (function detectBase() {
    var link = $('link[rel="stylesheet"][href$="css/style.css"]');
    if (link) {
      var h = link.getAttribute('href');
      var prefix = h.slice(0, h.length - 'css/style.css'.length);
      ICONS = prefix + 'img/icons.svg';
      BASE = prefix;
    }
  })();

  var closeBanner = function () {
    if (banner) { banner.remove(); banner = null; }
  };

  var save = function (c) {
    var prev = readConsent();
    c.necessary = true;
    c.ts = new Date().toISOString();
    writeConsent(c);
    closeBanner();
    activateScripts(c);
    if (prev && ((prev.analytics && !c.analytics) || (prev.marketing && !c.marketing))) window.location.reload();
  };

  var openBanner = function (expanded) {
    if (banner) return;
    banner = buildBanner();
    document.body.appendChild(banner);
    var prefs = $('#cookie-prefs', banner);
    var customBtn = $('[data-ck="custom"]', banner);
    var cur = readConsent() || {};
    $('#ck-analytics', banner).checked = !!cur.analytics;
    $('#ck-marketing', banner).checked = !!cur.marketing;

    var setExpanded = function (on) {
      prefs.hidden = !on;
      customBtn.setAttribute('aria-expanded', String(on));
      customBtn.textContent = on ? 'Zapisz wybór' : 'Dostosuj';
    };
    if (expanded) setExpanded(true);

    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ck]');
      if (!b) return;
      var type = b.dataset.ck;
      if (type === 'all') save({ analytics: true, marketing: true });
      else if (type === 'necessary') save({ analytics: false, marketing: false });
      else if (prefs.hidden) setExpanded(true);
      else save({ analytics: $('#ck-analytics', banner).checked, marketing: $('#ck-marketing', banner).checked });
    });
    banner.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && readConsent()) closeBanner();
    });
    if (expanded) $('#ck-analytics', banner).focus();
  };

  var stored = readConsent();
  if (stored) activateScripts(stored); else openBanner(false);
  $$('[data-cookie-settings]').forEach(function (b) {
    b.addEventListener('click', function () { openBanner(true); });
  });
})();
