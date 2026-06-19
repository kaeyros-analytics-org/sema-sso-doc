/* =============================================
   SEMA SSO Docs — script.js
   Translations live in i18n/en.js, i18n/fr.js, i18n/de.js
   Sections live in sections/*.html
   Local dev: run  npx serve .  (fetch needs HTTP, not file://)
   ============================================= */
(function () {
  'use strict';

  // ─── Section loading ───
  const SECTIONS = [
    'overview','keycloak','gateway','frontend',
    'backend','router','envvars','newapp','tokenflow'
  ];

  function loadSections() {
    const container = document.getElementById('app-sections');
    return Promise.all(
      SECTIONS.map(id =>
        fetch('sections/' + id + '.html')
          .then(function(r) { return r.text(); })
          .then(function(html) { return { id: id, html: html }; })
      )
    ).then(function(results) {
      results.forEach(function(s) {
        container.insertAdjacentHTML('beforeend', s.html);
      });
    });
  }

  // ─── Language state ───
  let currentLang = localStorage.getItem('sema-lang') || 'en';

  function t(key) {
    return window.T[currentLang][key] || window.T['en'][key] || key;
  }

  function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = val;
      } else {
        el.innerHTML = val;
      }
    });
    // update copy buttons (they may have been reset to "Copy")
    document.querySelectorAll('.copy-btn:not(.copied)').forEach(btn => {
      const span = btn.querySelector('span');
      if (span) span.textContent = t('copy');
    });
    // update back to top
    const bt = document.getElementById('back-top');
    if (bt) bt.title = t('back_to_top');
    // update lang toggle active state
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
    localStorage.setItem('sema-lang', currentLang);
  }

  // ─── Build language toggle ───
  function buildLangToggle() {
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'lang-toggle';
    wrapper.innerHTML = `
      <span class="lang-globe"><i data-lucide="globe"></i></span>
      <div class="lang-pills">
        <button class="lang-btn" data-lang="en">EN</button>
        <button class="lang-btn" data-lang="fr">FR</button>
        <button class="lang-btn" data-lang="de">DE</button>
      </div>
    `;

    // Insert before badge-version (after theme-toggle)
    const badgeVersion = topbarRight.querySelector('.badge-version');
    topbarRight.insertBefore(wrapper, badgeVersion);

    wrapper.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        applyLanguage();
        if (window.lucide) lucide.createIcons();
      });
    });
  }

  // ─── Dark Mode ───
  function applyTheme(isDark) {
    document.body.classList.toggle('dark', isDark);
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    // Swap the icon
    btn.innerHTML = isDark
      ? '<i data-lucide="sun"></i>'
      : '<i data-lucide="moon"></i>';
    if (window.lucide) lucide.createIcons();
  }

  function initTheme() {
    const saved = localStorage.getItem('sema-theme');
    const isDark = saved ? saved === 'dark' : false; // light default as spec'd
    applyTheme(isDark);
  }

  // ─── Init ───
  loadSections().then(function() {
    initTheme();
    buildLangToggle();
    applyLanguage();

    // ─── Navigation ───
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const sections = document.querySelectorAll('.section');

    function activateSection(id) {
      sections.forEach(s => s.classList.remove('active'));
      navItems.forEach(n => n.classList.remove('active'));
      const target = document.getElementById(id);
      if (target) target.classList.add('active');
      const navEl = document.querySelector(`.nav-item[data-section="${id}"]`);
      if (navEl) {
        navEl.classList.add('active');
        const label = navEl.querySelector('[data-i18n]');
        updateBreadcrumb(label ? label.innerHTML : '');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      history.replaceState(null, '', `#${id}`);

      // Close sidebar on mobile after navigation
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('visible');
    }

    navItems.forEach(item => {
      item.addEventListener('click', () => activateSection(item.dataset.section));
    });

    const initialHash = location.hash.replace('#', '');
    if (initialHash && document.getElementById(initialHash)) {
      activateSection(initialHash);
    } else {
      activateSection('overview');
    }

    function updateBreadcrumb(label) {
      const bc = document.querySelector('.breadcrumb .current');
      if (bc) bc.innerHTML = label;
    }

    // ─── Sub-tabs ───
    document.querySelectorAll('.sub-tabs').forEach(tabGroup => {
      tabGroup.querySelectorAll('.sub-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const parent = tab.closest('.sub-tabs').parentElement;
          tabGroup.querySelectorAll('.sub-tab').forEach(t2 => t2.classList.remove('active'));
          tab.classList.add('active');
          const target = tab.dataset.target;
          parent.querySelectorAll('.sub-content').forEach(c => {
            c.classList.toggle('active', c.dataset.id === target);
          });
        });
      });
      const first = tabGroup.querySelector('.sub-tab');
      if (first) first.click();
    });

    // ─── Copy buttons ───
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pre = btn.closest('.code-block')?.querySelector('pre');
        if (!pre) return;
        navigator.clipboard.writeText(pre.innerText).then(() => {
          const span = btn.querySelector('span');
          if (span) span.textContent = t('copied');
          btn.classList.add('copied');
          setTimeout(() => {
            if (span) span.textContent = t('copy');
            btn.classList.remove('copied');
          }, 2000);
        });
      });
    });

    // ─── Back to top ───
    const backTop = document.getElementById('back-top');
    window.addEventListener('scroll', () => {
      if (backTop) backTop.classList.toggle('visible', window.scrollY > 300);
      updateProgress();
    });
    if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    function updateProgress() {
      const bar = document.getElementById('progress');
      if (!bar) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0) + '%';
    }

    // ─── Mobile hamburger ───
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (hamburger && sidebar) {
      hamburger.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('visible', isOpen);
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
      });
    }

    // ─── App card navigation ───
    document.querySelectorAll('.app-card[data-section]').forEach(card => {
      card.addEventListener('click', () => {
        activateSection(card.dataset.section);
        const sub = card.dataset.sub;
        if (sub) {
          setTimeout(() => {
            const tab = document.querySelector(`.sub-tab[data-target="${sub}"]`);
            if (tab) tab.click();
          }, 50);
        }
      });
    });

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const isDark = !document.body.classList.contains('dark');
        localStorage.setItem('sema-theme', isDark ? 'dark' : 'light');
        applyTheme(isDark);
      });
    }

    // ─── Env copy-all button ───
    document.querySelectorAll('.env-copy-all').forEach(btn => {
      btn.addEventListener('click', () => {
        const service = btn.dataset.service;
        const list = document.querySelector(`.env-list[data-service="${service}"]`);
        if (!list) return;
        const text = Array.from(list.querySelectorAll('.env-item'))
          .map(item => `${item.dataset.key}=${item.dataset.val}`)
          .join('\n');
        navigator.clipboard.writeText(text).then(() => {
          const icon = btn.querySelector('i');
          const span = btn.querySelector('span');
          if (icon) icon.setAttribute('data-lucide', 'check');
          if (span) span.textContent = window.T[currentLang]?.['copied'] || 'Copied!';
          if (window.lucide) lucide.createIcons();
          setTimeout(() => {
            if (icon) icon.setAttribute('data-lucide', 'copy');
            if (span) span.setAttribute('data-i18n', 'env.copy.all');
            applyLanguage();
            if (window.lucide) lucide.createIcons();
          }, 2000);
        });
      });
    });

    // ─── Env per-variable copy button ───
    document.querySelectorAll('.env-var-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.env-item');
        if (!item) return;
        const text = `${item.dataset.key}=${item.dataset.val}`;
        navigator.clipboard.writeText(text).then(() => {
          const icon = btn.querySelector('i');
          if (icon) icon.setAttribute('data-lucide', 'check');
          if (window.lucide) lucide.createIcons();
          setTimeout(() => {
            if (icon) icon.setAttribute('data-lucide', 'copy');
            if (window.lucide) lucide.createIcons();
          }, 1500);
        });
      });
    });

    // ─── Image modal ───
    (function() {
      var modal    = document.getElementById('img-modal');
      var modalImg = document.getElementById('img-modal-img');
      var closeBtn = document.getElementById('img-modal-close');
      if (!modal || !modalImg) return;

      function openModal(src, alt) {
        modalImg.src = src;
        modalImg.alt = alt || '';
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
      function closeModal() {
        modal.classList.remove('open');
        document.body.style.overflow = '';
        setTimeout(function() { modalImg.src = ''; }, 200);
      }

      document.querySelectorAll('.screenshot-img').forEach(function(img) {
        img.addEventListener('click', function() { openModal(img.src, img.alt); });
      });
      modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
      });
      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
      });
    })();

    // ─── Search ───
    (function() {
      var searchInput  = document.getElementById('search-input');
      var searchPanel  = document.getElementById('search-panel');
      var searchClear  = document.getElementById('search-clear');
      var panelInner   = document.getElementById('search-panel-inner');
      if (!searchInput || !searchPanel || !panelInner) return;

      var debounceTimer = null;
      var resultsMap    = [];   // flat array indexed by result position in DOM

      /* ── helpers ── */
      function esc(str) {
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      }
      function sectionName(id) {
        var n = document.querySelector('.nav-item[data-section="' + id + '"] .nav-label');
        return n ? n.textContent.trim() : id;
      }
      function cardTitleOf(el) {
        var c = el.closest && el.closest('.card');
        if (!c) return '';
        var t = c.querySelector('.card-title');
        return t ? t.textContent.replace(/\s+/g,' ').trim() : '';
      }

      /* ── DOM search ── */
      function searchDOM(term) {
        if (!term || term.length < 2) return [];
        var re = new RegExp(esc(term), 'gi');
        var groups = [];
        var seenEls = new Set();

        document.querySelectorAll('.section').forEach(function(section) {
          var id = section.id;
          var items = [];

          section.querySelectorAll('p, td, pre, .step-desc, h2, h3, li').forEach(function(el) {
            // skip elements nested inside others already matched
            if (el.tagName === 'P' && el.closest('td')) return;
            var text = el.textContent || '';
            re.lastIndex = 0;
            if (!re.test(text)) return;
            if (seenEls.has(el)) return;
            seenEls.add(el);
            items.push({ sectionId: id, element: el, text: text.replace(/\s+/g,' ').trim() });
          });

          if (items.length) groups.push({ id: id, name: sectionName(id), items: items });
        });
        return groups;
      }

      /* ── snippet with inline highlights ── */
      function snippet(text, term) {
        var lc = text.toLowerCase(), tl = term.toLowerCase();
        var idx = lc.indexOf(tl);
        if (idx === -1) return escHtml(text.slice(0, 120)) + (text.length > 120 ? '…' : '');
        var start = Math.max(0, idx - 45);
        var end   = Math.min(text.length, idx + term.length + 70);
        var slice = text.slice(start, end);
        // Find ALL matches in the raw slice, HTML-encode each piece separately
        var re = new RegExp(esc(term), 'gi');
        var out = '', last = 0, m;
        while ((m = re.exec(slice)) !== null) {
          out += escHtml(slice.slice(last, m.index));
          out += '<span class="snippet-hl">' + escHtml(m[0]) + '</span>';
          last = m.index + m[0].length;
        }
        out += escHtml(slice.slice(last));
        return (start > 0 ? '…' : '') + out + (end < text.length ? '…' : '');
      }

      /* ── render results panel ── */
      function render(groups, term) {
        resultsMap = [];
        if (!groups.length) {
          panelInner.innerHTML =
            '<div class="search-no-results">No results for <strong>' + escHtml(term) + '</strong></div>';
          return;
        }
        var total = groups.reduce(function(n,g){ return n + g.items.length; }, 0);
        var html = '<div class="search-summary">'
          + '<span>' + total + ' result' + (total!==1?'s':'') + ' in '
          + groups.length + ' section' + (groups.length!==1?'s':'') + '</span>'
          + '<button class="search-summary-close" id="search-panel-close" aria-label="Close results">&#x2715;</button>'
          + '</div>';

        groups.forEach(function(g) {
          html += '<div class="search-section-group">'
            + '<div class="search-section-title">' + escHtml(g.name)
            + '<span class="search-section-badge">' + g.items.length + '</span></div>';

          g.items.slice(0, 7).forEach(function(item) {
            var ctx = cardTitleOf(item.element);
            html += '<div class="search-result-item" tabindex="0" data-ri="' + resultsMap.length + '">';
            if (ctx) html += '<div class="search-result-context">' + escHtml(ctx.slice(0, 65)) + '</div>';
            html += '<div class="search-result-snippet">' + snippet(item.text, term) + '</div></div>';
            resultsMap.push(item);
          });
          if (g.items.length > 7) {
            html += '<div class="search-more">+' + (g.items.length - 7) + ' more in this section</div>';
          }
          html += '</div>';
        });

        panelInner.innerHTML = html;

        panelInner.querySelectorAll('.search-result-item').forEach(function(el) {
          function go() { navigateTo(resultsMap[parseInt(el.dataset.ri, 10)]); }
          el.addEventListener('click', go);
          el.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') go(); });
        });

        var closeBtn = document.getElementById('search-panel-close');
        if (closeBtn) closeBtn.addEventListener('click', function() { closePanel(); });
      }

      /* ── DOM highlight / clear ── */
      function clearHL() {
        document.querySelectorAll('mark.search-hl').forEach(function(m) {
          m.parentNode.replaceChild(document.createTextNode(m.textContent), m);
        });
        document.querySelectorAll('.section').forEach(function(s) { s.normalize(); });
      }

      function highlightAll(term) {
        clearHL();
        if (!term || term.length < 2) return;
        var lc = term.toLowerCase();

        document.querySelectorAll('.section').forEach(function(section) {
          var walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, null, false);
          var nodes = [], node;
          while ((node = walker.nextNode())) {
            var p = node.parentNode;
            if (p && ['SCRIPT','STYLE','MARK'].indexOf(p.tagName) === -1 &&
                node.textContent.toLowerCase().indexOf(lc) !== -1) {
              nodes.push(node);
            }
          }
          nodes.forEach(function(tn) {
            var text = tn.textContent;
            var re2 = new RegExp(esc(term), 'gi');
            var parts = text.split(re2);
            re2.lastIndex = 0;
            if (parts.length <= 1) return;
            var matches = text.match(new RegExp(esc(term), 'gi')) || [];
            var frag = document.createDocumentFragment();
            parts.forEach(function(p, i) {
              frag.appendChild(document.createTextNode(p));
              if (i < matches.length) {
                var m = document.createElement('mark');
                m.className = 'search-hl';
                m.textContent = matches[i];
                frag.appendChild(m);
              }
            });
            tn.parentNode.replaceChild(frag, tn);
          });
        });
      }

      /* ── navigate to a result ── */
      function navigateTo(item) {
        searchPanel.classList.remove('open');

        var navItem = document.querySelector('.nav-item[data-section="' + item.sectionId + '"]');
        if (navItem) navItem.click();

        setTimeout(function() {
          item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          item.element.classList.add('search-target');
          setTimeout(function() { item.element.classList.remove('search-target'); }, 2500);
        }, 120);
      }

      function closePanel() {
        searchPanel.classList.remove('open');
      }
      function openPanel() {
        if (resultsMap.length > 0 || (searchInput.value.trim().length >= 2)) {
          searchPanel.classList.add('open');
        }
      }

      /* ── main search trigger ── */
      function doSearch(term) {
        if (!term || term.length < 2) {
          closePanel(); clearHL();
          if (searchClear) searchClear.classList.remove('visible');
          return;
        }
        if (searchClear) searchClear.classList.add('visible');
        var groups = searchDOM(term);
        render(groups, term);
        searchPanel.classList.add('open');
        highlightAll(term);
      }

      searchInput.addEventListener('input', function() {
        var term = searchInput.value.trim();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() { doSearch(term); }, 220);
      });

      searchInput.addEventListener('focus', function() {
        if (searchInput.value.trim().length >= 2) openPanel();
      });

      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') { closePanel(); searchInput.blur(); }
      });

      /* close on outside click */
      document.addEventListener('click', function(e) {
        if (!searchInput.closest('.search-wrap').contains(e.target) &&
            !searchPanel.contains(e.target)) {
          closePanel();
        }
      });

      /* clear button */
      if (searchClear) {
        searchClear.addEventListener('click', function() {
          searchInput.value = '';
          closePanel(); clearHL();
          searchClear.classList.remove('visible');
          searchInput.focus();
        });
      }
    })();

    // Render all Lucide icons after sections are in DOM
    if (window.lucide) lucide.createIcons();
  }).catch(function(err) {
    document.getElementById('app-sections').innerHTML =
      '<div style="padding:2rem;color:red"><strong>Could not load sections.</strong><br>' +
      'Run <code>npx serve .</code> in the project directory for local development.<br>' +
      'Error: ' + err.message + '</div>';
  });
})();
