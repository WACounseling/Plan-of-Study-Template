/* Type-to-search dropdowns. Progressive enhancement of <select data-cb>:
 *  - On computers (hover + precise pointer) each marked <select> is replaced visually by a search box with a filtered list.
 *  - On phones and tablets the native picker is kept.
 * The original <select> stays in the page and remains the single source of truth (value, options, disabled state),
 * so every existing rule — prerequisites, locked courses, ⚑ / ⚠ labels — keeps working. No third-party code. */
(function (root) {
  const WA = root.WA = root.WA || {};
  (WA.versions = WA.versions || {})['combo.js'] = '1';
  if (typeof document === 'undefined') return;

  const mq = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
  const desktop = () => !mq || mq.matches;
  const LEVELS = { ap: '(ap)', hp: '(hp)', honors: '(hp)', honor: '(hp)', ep: '(ep)', enriched: '(ep)', cp: '(cp)' };
  const strip = t => String(t == null ? '' : t).replace(/\s{2}[\u26A0\u2691].*$/, '').trim();
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  let pop = null, cur = null, uid = 0;
  function popup() {
    if (pop) return pop;
    pop = el('ul', 'cb-pop'); pop.id = 'cb-pop-' + (++uid); pop.setAttribute('role', 'listbox');
    pop.addEventListener('mousedown', e => e.preventDefault()); // keep focus in the search box
    document.body.appendChild(pop); return pop;
  }
  function readItems(sel) {
    const out = [];
    Array.from(sel.children).forEach(ch => {
      if (ch.tagName === 'OPTGROUP') { Array.from(ch.children).forEach(o => out.push({ value: o.value, text: o.text, disabled: o.disabled, cls: o.className, group: ch.label })); }
      else if (ch.tagName === 'OPTION') out.push({ value: ch.value, text: ch.text, disabled: ch.disabled, cls: ch.className, group: '' });
    });
    return out;
  }
  function tokens(q) { return q.toLowerCase().split(/\s+/).filter(Boolean); }
  function matches(item, toks) {
    const hay = (item.text + ' ' + item.group).toLowerCase();
    return toks.every(t => hay.includes(LEVELS[t] || t));
  }
  function highlight(parent, text, toks) {
    const plain = toks.filter(t => !LEVELS[t]);
    if (!plain.length) { parent.appendChild(document.createTextNode(text)); return; }
    const re = new RegExp(plain.map(esc).join('|'), 'gi'); let last = 0;
    text.replace(re, (m, off) => { if (off > last) parent.appendChild(document.createTextNode(text.slice(last, off))); parent.appendChild(el('mark', null, m)); last = off + m.length; return m; });
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function render(inst) {
    const p = popup(), toks = tokens(inst.query); p.innerHTML = ''; inst.rows = [];
    const all = readItems(inst.sel); let lastGroup = null, any = false;
    all.forEach(it => {
      const isNone = it.value === '' && !it.group;
      if (toks.length && (isNone || !matches(it, toks))) return;
      if (it.group && it.group !== lastGroup) { const gh = el('li', 'cb-grp', it.group); gh.setAttribute('role', 'presentation'); p.appendChild(gh); lastGroup = it.group; }
      const li = el('li', 'cb-opt' + (isNone ? ' cb-none' : '') + (it.disabled ? ' dis' : '') + (/appr/.test(it.cls) ? ' appr' : '') + (/warnopt/.test(it.cls) ? ' warnopt' : '') + (it.value === inst.sel.value && !isNone ? ' sel' : ''));
      li.id = p.id + '-' + inst.rows.length; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(it.value === inst.sel.value)); if (it.disabled) li.setAttribute('aria-disabled', 'true');
      highlight(li, isNone ? strip(it.text) : it.text, toks);
      const row = { it, li }; inst.rows.push(row);
      li.addEventListener('mousedown', e => { e.preventDefault(); choose(inst, row); });
      p.appendChild(li); any = true;
    });
    if (!any) { const li = el('li', 'cb-empty', 'No courses match “' + inst.query.trim() + '”.'); li.setAttribute('role', 'presentation'); p.appendChild(li); }
    // active row: the current selection, or the first selectable match
    let a = inst.rows.findIndex(r => !r.it.disabled && r.it.value === inst.sel.value && r.it.value !== '');
    if (a < 0 || toks.length) a = inst.rows.findIndex(r => !r.it.disabled && r.it.value !== '');
    if (a < 0) a = inst.rows.findIndex(r => !r.it.disabled);
    setActive(inst, a, !toks.length);
  }
  function setActive(inst, i, scroll) {
    inst.rows.forEach((r, k) => r.li.classList.toggle('active', k === i));
    inst.active = i; const r = inst.rows[i];
    if (r) { inst.input.setAttribute('aria-activedescendant', r.li.id); if (scroll !== false && r.li.scrollIntoView) { try { r.li.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ } } }
    else inst.input.removeAttribute('aria-activedescendant');
  }
  function move(inst, d) {
    if (!inst.rows.length) return; let i = inst.active;
    for (let n = 0; n < inst.rows.length; n++) { i = (i + d + inst.rows.length) % inst.rows.length; if (!inst.rows[i].it.disabled) break; }
    setActive(inst, i, true);
  }
  function place(inst) {
    const p = popup(), r = inst.input.getBoundingClientRect(), vh = window.innerHeight || 800, vw = window.innerWidth || 1200;
    const below = vh - r.bottom - 10, above = r.top - 10, w = Math.max(r.width, 300);
    p.style.width = w + 'px'; p.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + 'px';
    if (below >= 220 || below >= above) { p.style.top = (r.bottom + 2) + 'px'; p.style.bottom = 'auto'; p.style.maxHeight = Math.max(140, Math.min(380, below)) + 'px'; }
    else { p.style.bottom = (vh - r.top + 2) + 'px'; p.style.top = 'auto'; p.style.maxHeight = Math.max(140, Math.min(380, above)) + 'px'; }
  }
  function open(inst) {
    if (inst.sel.disabled) return;
    if (cur && cur !== inst) close(cur, true);
    cur = inst; inst.open = true; inst.query = ''; inst.input.setAttribute('aria-expanded', 'true'); inst.input.setAttribute('aria-controls', popup().id);
    render(inst); popup().classList.add('open'); place(inst); try { inst.input.select(); } catch (e) { /* ignore */ }
  }
  function close(inst, restore) {
    if (!inst || !inst.open) return; inst.open = false; if (cur === inst) cur = null;
    inst.input.setAttribute('aria-expanded', 'false'); inst.input.removeAttribute('aria-activedescendant'); if (pop) pop.classList.remove('open');
    if (restore) refresh(inst);
  }
  function choose(inst, row) {
    if (!row || row.it.disabled) return;
    inst.sel.value = row.it.value; close(inst, false);
    inst.sel.dispatchEvent(new Event('change', { bubbles: true })); refresh(inst);
  }
  function refresh(inst) {
    const s = inst.sel, o = s.options[s.selectedIndex];
    inst.input.disabled = s.disabled;
    if (!inst.open) inst.input.value = s.disabled ? strip(o ? o.text : '') : (s.value && o ? strip(o.text) : '');
    inst.input.placeholder = s.options[0] ? strip(s.options[0].text) : '';
    ['filled', 'warn', 'err'].forEach(c => inst.input.classList.toggle(c, s.classList.contains(c)));
  }

  function enhance(sel) {
    if (sel.dataset.cbReady || !sel.parentNode) return;
    sel.dataset.cbReady = '1'; sel.classList.add('cb-native');
    const wrap = el('div', 'cb'), input = el('input', 'cb-input');
    input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false; input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-label', sel.getAttribute('aria-label') || 'Choose'); wrap.appendChild(input); sel.parentNode.insertBefore(wrap, sel.nextSibling);
    const inst = { sel, wrap, input, open: false, query: '', rows: [], active: -1 }; sel.__cb = inst;
    input.addEventListener('focus', () => open(inst));
    input.addEventListener('mousedown', () => { if (!inst.open) open(inst); });
    input.addEventListener('input', () => { if (!inst.open) open(inst); inst.query = input.value; render(inst); place(inst); });
    input.addEventListener('blur', () => close(inst, true));
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!inst.open) open(inst); else move(inst, 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (!inst.open) open(inst); else move(inst, -1); }
      else if (e.key === 'Enter') { if (inst.open) { e.preventDefault(); choose(inst, inst.rows[inst.active]); } }
      else if (e.key === 'Escape') { if (inst.open) { e.preventDefault(); close(inst, true); } }
      else if (e.key === 'Tab') close(inst, true);
    });
    refresh(inst);
  }
  function enhanceAll(rootEl) { Array.from((rootEl || document).querySelectorAll('select[data-cb]:not([data-cb-ready])')).forEach(enhance); }
  function refreshAll() { Array.from(document.querySelectorAll('select[data-cb-ready]')).forEach(s => { if (s.__cb) refresh(s.__cb); }); }
  function applyMode() { document.documentElement.classList.toggle('combo-on', desktop()); if (!desktop() && cur) close(cur, true); }
  window.addEventListener('resize', () => { if (cur) place(cur); });
  window.addEventListener('scroll', () => { if (cur) place(cur); }, true);
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', applyMode); else if (mq.addListener) mq.addListener(applyMode); }
  applyMode();

  WA.combo = { enhanceAll, refreshAll, desktop, applyMode };
})(typeof globalThis !== 'undefined' ? globalThis : this);
