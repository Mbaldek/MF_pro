/* Maison Félicien · Shared UI utilities
   Theme toggle · Command palette · Toast · Motion helpers
   Charge ce fichier APRÈS _tokens.css et AVANT ton script de page. */

(function (global) {
  'use strict';

  // ========== Theme (light / dark) ==========
  const THEME_KEY = 'mf-theme';
  const systemDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || (systemDark() ? 'dark' : 'light');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    // Update toggle icons everywhere
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.textContent = theme === 'dark' ? '☀' : '☾';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Passer en mode jour' : 'Passer en mode nuit');
    });
  }

  function toggleTheme() {
    const next = (document.documentElement.getAttribute('data-theme') || getTheme()) === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  // Init au plus tôt (évite flash)
  applyTheme(getTheme());

  // ========== Toast ==========
  let toastEl = null;
  let toastTimer = null;

  function ensureToast() {
    if (toastEl) return toastEl;
    toastEl = document.querySelector('.mf-toast');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'mf-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    return toastEl;
  }

  function toast(msg, opts) {
    opts = opts || {};
    const t = ensureToast();
    t.classList.toggle('is-danger', !!opts.danger);
    t.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = msg;
    t.appendChild(span);
    if (typeof opts.undo === 'function') {
      const btn = document.createElement('button');
      btn.className = 'mf-btn is-sm';
      btn.style.background = 'color-mix(in oklab, var(--mf-paper) 20%, transparent)';
      btn.style.color = 'var(--mf-paper)';
      btn.style.borderColor = 'color-mix(in oklab, var(--mf-paper) 30%, transparent)';
      btn.textContent = 'Annuler';
      btn.onclick = () => {
        clearTimeout(toastTimer);
        t.classList.remove('show');
        opts.undo();
      };
      t.appendChild(btn);
    }
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), opts.undo ? 5000 : 2600);
  }

  // ========== Dialog (custom confirm/alert) ==========
  let dialogEl = null;

  function ensureDialog() {
    if (dialogEl) return dialogEl;
    dialogEl = document.createElement('dialog');
    dialogEl.className = 'mf-dialog';
    dialogEl.innerHTML = `
      <div style="padding:22px 24px 12px;font-family:var(--font-serif);font-style:italic;font-size:22px;color:var(--mf-rose);" data-title>—</div>
      <div style="padding:0 24px 18px;font-size:14px;line-height:1.55;color:var(--mf-ink);" data-body>—</div>
      <div style="padding:14px 20px;background:var(--mf-paper-soft);border-top:1px solid var(--mf-hairline);display:flex;justify-content:flex-end;gap:8px;" data-foot></div>
    `;
    document.body.appendChild(dialogEl);
    return dialogEl;
  }

  function mfDialog(opts) {
    return new Promise((resolve) => {
      const dlg = ensureDialog();
      dlg.querySelector('[data-title]').textContent = opts.title || 'Confirmer';
      dlg.querySelector('[data-body]').innerHTML = opts.body || '';
      const foot = dlg.querySelector('[data-foot]');
      foot.innerHTML = '';
      (opts.actions || [{ label: 'OK', value: true, primary: true }]).forEach(a => {
        const b = document.createElement('button');
        b.className = 'mf-btn' + (a.primary ? ' is-primary' : '') + (a.danger ? ' is-danger' : '');
        b.textContent = a.label;
        b.onclick = () => { dlg.close(); resolve(a.value); };
        foot.appendChild(b);
      });
      dlg.addEventListener('cancel', function onCancel() {
        dlg.removeEventListener('cancel', onCancel);
        resolve(false);
      }, { once: true });
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    });
  }

  function confirm(body, opts) {
    opts = opts || {};
    return mfDialog({
      title: opts.title || 'Confirmer',
      body,
      actions: [
        { label: opts.cancelLabel || 'Annuler', value: false },
        { label: opts.okLabel || 'Confirmer', value: true, primary: !opts.danger, danger: !!opts.danger }
      ]
    });
  }

  // ========== Command palette (⌘K / Ctrl+K) ==========
  let paletteEl = null;
  let paletteItems = [];
  let paletteFiltered = [];
  let paletteActiveIdx = 0;

  function buildPalette() {
    if (paletteEl) return paletteEl;
    paletteEl = document.createElement('div');
    paletteEl.className = 'mf-palette-backdrop';
    paletteEl.innerHTML = `
      <div class="mf-palette" role="dialog" aria-label="Command palette">
        <input class="mf-palette-input" placeholder="Rechercher une action, une page, un produit…" autocomplete="off" spellcheck="false" data-palette-input>
        <div class="mf-palette-list" data-palette-list></div>
      </div>
    `;
    paletteEl.addEventListener('click', (e) => {
      if (e.target === paletteEl) closePalette();
    });
    const input = paletteEl.querySelector('[data-palette-input]');
    input.addEventListener('input', renderPaletteList);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); paletteActiveIdx = Math.min(paletteFiltered.length - 1, paletteActiveIdx + 1); renderPaletteList(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); paletteActiveIdx = Math.max(0, paletteActiveIdx - 1); renderPaletteList(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = paletteFiltered[paletteActiveIdx];
        if (sel) { closePalette(); sel.run(); }
      } else if (e.key === 'Escape') { closePalette(); }
    });
    document.body.appendChild(paletteEl);
    return paletteEl;
  }

  function registerPaletteItems(items) {
    paletteItems = items.slice();
  }

  function openPalette() {
    const el = buildPalette();
    paletteActiveIdx = 0;
    el.querySelector('[data-palette-input]').value = '';
    renderPaletteList();
    el.classList.add('open');
    setTimeout(() => el.querySelector('[data-palette-input]').focus(), 20);
  }

  function closePalette() {
    if (paletteEl) paletteEl.classList.remove('open');
  }

  function normalizeSearch(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  }

  function renderPaletteList() {
    const el = paletteEl;
    if (!el) return;
    const input = el.querySelector('[data-palette-input]');
    const list = el.querySelector('[data-palette-list]');
    const q = normalizeSearch(input.value);
    paletteFiltered = !q ? paletteItems.slice() : paletteItems.filter(it => {
      const hay = normalizeSearch((it.label || '') + ' ' + (it.group || '') + ' ' + (it.keywords || ''));
      return hay.includes(q);
    });
    if (paletteActiveIdx >= paletteFiltered.length) paletteActiveIdx = Math.max(0, paletteFiltered.length - 1);
    if (!paletteFiltered.length) {
      list.innerHTML = `<div class="mf-palette-group">Aucun résultat</div>`;
      return;
    }
    // Regroupement par section
    const bySection = {};
    paletteFiltered.forEach((it, idx) => {
      const g = it.group || 'Actions';
      bySection[g] = bySection[g] || [];
      bySection[g].push({ it, idx });
    });
    list.innerHTML = Object.entries(bySection).map(([g, items]) =>
      `<div class="mf-palette-group">${g}</div>` +
      items.map(({ it, idx }) => `
        <div class="mf-palette-item${idx === paletteActiveIdx ? ' active' : ''}" data-idx="${idx}">
          <span class="mark">${it.mark || '›'}</span>
          <span class="label">${it.label}</span>
          ${it.hint ? `<span class="kbd">${it.hint}</span>` : ''}
        </div>
      `).join('')
    ).join('');
    list.querySelectorAll('[data-idx]').forEach(el => {
      el.onclick = () => {
        const i = Number(el.dataset.idx);
        const sel = paletteFiltered[i];
        if (sel) { closePalette(); sel.run(); }
      };
      el.onmouseenter = () => {
        paletteActiveIdx = Number(el.dataset.idx);
        list.querySelectorAll('.mf-palette-item').forEach(x => x.classList.toggle('active', Number(x.dataset.idx) === paletteActiveIdx));
      };
    });
  }

  // ========== Binding global ==========
  document.addEventListener('keydown', (e) => {
    // Cmd+K / Ctrl+K pour palette
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !e.shiftKey) {
      e.preventDefault();
      if (paletteEl && paletteEl.classList.contains('open')) closePalette();
      else openPalette();
    }
    // Cmd+J / Ctrl+J pour toggle theme
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
      e.preventDefault();
      toggleTheme();
    }
    // Cmd+Shift+D pour toggle dark (alternative)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      toggleTheme();
    }
  });

  // Bind theme toggle buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (btn) { e.preventDefault(); toggleTheme(); }
  });

  // Page stagger animation (classes .mf-stagger > * se voient setter animation-delay)
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mf-stagger').forEach(wrap => {
      Array.from(wrap.children).forEach((child, i) => {
        child.style.animationDelay = (i * 30) + 'ms';
      });
    });
  });

  // Expose API
  global.MF = {
    theme: { get: getTheme, set: applyTheme, toggle: toggleTheme },
    toast,
    confirm,
    dialog: mfDialog,
    palette: { open: openPalette, close: closePalette, register: registerPaletteItems }
  };

})(window);
