/* Woodward Academy Four-Year Course Planner — UI */
(function () {
  'use strict';
  const WA = window.WA, E = WA.engine, CAT = WA.catalog, COC = WA.cocurr, REF = WA.reference;
  const CFG = window.WA_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const SKEY = 'wa_planner_v1';

  function h(tag, attrs) {
    const el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      const v = attrs[k];
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    });
    for (let i = 2; i < arguments.length; i++) { const c = arguments[i]; if (c == null) continue; el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return el;
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------- state ---------------- */
  let state = E.emptyState();
  let prevMet = null;
  const selRefs = {};   // selRefs[g][slot][half] -> <select>
  const noteRefs = {};  // noteRefs[g][slot] -> <div>
  const chipRefs = {};

  function load() {
    try { const raw = sessionStorage.getItem(SKEY); if (raw) mergeState(JSON.parse(raw)); } catch (e) { /* ignore */ }
  }
  function mergeState(o) {
    const base = E.emptyState();
    state = {
      info: Object.assign(base.info, o.info || {}), prior: Object.assign(base.prior, o.prior || {}),
      plan: base.plan, summer: base.summer, cocurr: Array.isArray(o.cocurr) ? o.cocurr : [], override: Object.assign(base.override, o.override || {})
    };
    E.GRADES.forEach(g => {
      E.ALL_SLOTS.forEach(s => { const c = o.plan && o.plan[g] && o.plan[g][s.k]; if (c) state.plan[g][s.k] = { f: c.f || '', s: c.s || '' }; });
      E.SUMMER_SLOTS.forEach(s => { const c = o.summer && o.summer[g] && o.summer[g][s.k]; if (c) state.summer[g][s.k] = c; });
    });
    if (!Array.isArray(state.prior.transfers)) state.prior.transfers = [];
  }
  let saveT;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { const c = JSON.parse(JSON.stringify(state)); c.info.accessCode = ''; sessionStorage.setItem(SKEY, JSON.stringify(c)); } catch (e) { /* ignore */ } }, 250);
  }

  /* ---------------- simple bindings (Step 1 & 2) ---------------- */
  const getPath = p => p.split('.').reduce((o, k) => (o == null ? o : o[k]), state);
  function setPath(p, v) { const ks = p.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], state)[last] = v; }
  function initBindings() {
    const sel = $('select[data-bind="info.classOf"]');
    for (let y = 2026; y <= 2032; y++) sel.appendChild(h('option', { value: y, text: 'Spring ' + y + ' (Class of ' + y + ')' }));
    $$('[data-bind]').forEach(el => {
      const p = el.dataset.bind;
      const v = getPath(p);
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v == null ? '' : v;
      el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
        let val = el.type === 'checkbox' ? el.checked : el.value;
        if (p === 'prior.psCredit') val = +val;
        setPath(p, val);
        if (p === 'info.classOf') labelGrades();
        if (p.startsWith('prior.')) update(true); else { readiness(); save(); }
      });
    });
  }

  /* ---------------- grade cards ---------------- */
  const ORD = { 9: '9th', 10: '10th', 11: '11th', 12: '12th' };
  function yearLabel(g) { const c = +state.info.classOf; if (!c) return ''; const s = c - 13 + g; return s + '–' + String(s + 1).slice(2); }
  function gradText() { return state.info.classOf ? 'Projected graduation: Spring ' + state.info.classOf : ''; }
  function labelGrades() { ['gradBadge1', 'gradBadge2', 'sbGrad'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = id === 'sbGrad' ? (state.info.classOf ? 'Graduating Spring ' + state.info.classOf : '') : gradText(); });
    E.GRADES.forEach(g => { const y = chipRefs[g] && chipRefs[g].yr; if (y) y.textContent = yearLabel(g) ? '· ' + yearLabel(g) : ''; }); }

  function buildGrades() {
    const host = $('#grades'); host.innerHTML = '';
    E.GRADES.forEach(g => {
      selRefs[g] = {}; noteRefs[g] = {}; chipRefs[g] = {};
      const yr = h('span', { class: 'yr' }), chips = h('div', { class: 'chips' });
      chipRefs[g].yr = yr; chipRefs[g].chips = chips;
      const body = h('div', { class: 'grade-body' });
      const rowFor = (slot, label, summer) => {
        selRefs[g][slot.k] = {};
        const mk = half => {
          const sel = h('select', { 'aria-label': ORD[g] + ' grade ' + label + (summer ? '' : half ? ' spring' : ' fall or full year') });
          sel.addEventListener('change', () => onPick(g, slot.k, half, sel.value, !!summer));
          selRefs[g][slot.k][half] = sel; return sel;
        };
        const notes = h('div', { class: 'notes' }); noteRefs[g][slot.k] = notes;
        if (summer) return h('div', { class: 'row' }, h('div', { class: 'lab', text: label }), h('div', { class: 'col' }, h('label', { text: 'Summer semester course' }), mk(0)), h('div', {}), notes);
        return h('div', { class: 'row' }, h('div', { class: 'lab', text: label }),
          h('div', { class: 'col' }, h('label', { text: 'Fall / Full year' }), mk(0)),
          h('div', { class: 'col' }, h('label', { text: 'Spring' }), mk(1)), notes);
      };
      body.appendChild(h('div', { class: 'sec-title', text: 'Academic — core disciplines' }));
      E.CORE_SLOTS.forEach(s => body.appendChild(rowFor(s, s.label)));
      body.appendChild(h('div', { class: 'sec-title', text: 'Electives' }));
      E.ELEC_SLOTS.forEach(s => body.appendChild(rowFor(s, s.label)));
      if (g < 12) {
        body.appendChild(h('div', { class: 'sec-title', text: 'Summer after ' + ORD[g] + ' grade (optional forward credit)' }));
        E.SUMMER_SLOTS.forEach(s => body.appendChild(rowFor(s, s.label, true)));
      }
      const lm = h('div', { class: 'loadmsgs' }); chipRefs[g].msgs = lm; body.appendChild(lm);
      host.appendChild(h('article', { class: 'grade', id: 'grade-' + g }, h('div', { class: 'grade-head' }, h('h3', { text: ORD[g] + ' Grade' }), yr, chips), body));
    });
    labelGrades();
  }

  function onPick(g, slot, half, val, summer) {
    if (summer) { state.summer[g][slot] = val; }
    else {
      const cell = state.plan[g][slot];
      if (half === 0) {
        cell.f = val; const p = E.parseSel(val);
        if (p && p.c.t === 'Y') cell.s = '';
      } else cell.s = val;
    }
    update(true);
  }

  /* ---------------- select filling ---------------- */
  function fillSelect(sel, opts, value, placeholder, cls) {
    const items = opts.groups.flatMap(g => g.items);
    const have = new Set(items.map(i => i.value));
    const sig = placeholder + '|' + items.map(i => i.value + i.state).join(',') + '|' + opts.locked.map(i => i.value).join(',') + '|' + (value && !have.has(value) ? value : '');
    if (sel.dataset.sig !== sig) {
      sel.innerHTML = '';
      sel.appendChild(h('option', { value: '', text: placeholder }));
      if (value && !have.has(value)) {
        const p = E.parseSel(value);
        if (p) sel.appendChild(h('option', { value, text: '⚠ ' + E.courseLabel(p.c, p.lv) + ' — check prerequisites / availability' }));
      }
      opts.groups.forEach(g => {
        const og = h('optgroup', { label: g.group });
        g.items.forEach(i => og.appendChild(h('option', { value: i.value, text: i.label, class: i.state === 'approval' ? 'appr' : '' })));
        sel.appendChild(og);
      });
      if (opts.locked.length) {
        const og = h('optgroup', { label: 'Not yet available — prerequisite needed' });
        opts.locked.forEach(i => og.appendChild(h('option', { value: i.value, disabled: true, text: i.label + ' — ' + i.reason })));
        sel.appendChild(og);
      }
      sel.dataset.sig = sig;
    }
    sel.value = value || '';
    sel.classList.toggle('filled', !!value);
    ['err', 'warn'].forEach(c => sel.classList.toggle(c, cls === c));
  }

  /* ---------------- master update ---------------- */
  function update(userAction) {
    const val = E.validateSelections(state);
    E.GRADES.forEach(g => {
      const cellsFor = (slot, summer) => {
        const cell = summer ? { f: state.summer[g][slot.k], s: '' } : state.plan[g][slot.k];
        const f = E.parseSel(cell.f);
        const selF = selRefs[g][slot.k][0];
        fillSelect(selF, E.optionsFor(state, g, slot.k, 0), cell.f, summer ? '— none —' : slot.dept ? '— none —' : '— open period —',
          stClass(val[g + '|' + slot.k + '|f']));
        if (!summer) {
          const selS = selRefs[g][slot.k][1];
          if (f && f.c.t === 'Y') {
            selS.innerHTML = ''; selS.appendChild(h('option', { value: '', text: 'Year-long course' })); selS.dataset.sig = 'Y'; selS.disabled = true; selS.classList.remove('filled', 'err', 'warn');
          } else {
            selS.disabled = false;
            fillSelect(selS, E.optionsFor(state, g, slot.k, 1), cell.s, '— none —', stClass(val[g + '|' + slot.k + '|s']));
          }
        }
        // notes
        const box = noteRefs[g][slot.k]; box.innerHTML = '';
        ['f', 's'].forEach(w => {
          const v = val[g + '|' + slot.k + '|' + w]; if (!v) return;
          const pfx = summer ? '' : (w === 'f' ? (f && f.c.t === 'Y' ? '' : 'Fall: ') : 'Spring: ');
          if (v.state === 'blocked') box.appendChild(h('div', { class: 'e', text: '⛔ ' + pfx + v.course + ' — prerequisite not met. ' + v.blockedReason + '.' }));
          (v.approvals || []).forEach(a => box.appendChild(h('div', { class: 'w', text: '⚑ ' + pfx + v.course + ': ' + a })));
          (v.msgs || []).forEach(a => box.appendChild(h('div', { class: 'i', text: 'ⓘ ' + pfx + v.course + ': ' + a })));
        });
        box.style.display = box.children.length ? '' : 'none';
      };
      E.CORE_SLOTS.forEach(s => cellsFor(s, false));
      E.ELEC_SLOTS.forEach(s => cellsFor(Object.assign({ dept: '' }, s), false));
      if (g < 12) E.SUMMER_SLOTS.forEach(s => cellsFor(s, true));
    });
    const P = E.problems(state);
    renderChips(P);
    renderTracker(P.tracker);
    renderReadiness(P);
    if (userAction) celebrateDiff(P.tracker); else prevMet = metSet(P.tracker);
    save();
  }
  const stClass = v => (!v ? '' : v.state === 'blocked' ? 'err' : v.state === 'approval' ? 'warn' : '');
  const metSet = t => new Set(t.areas.filter(a => a.met).map(a => a.key));

  function renderChips(P) {
    E.GRADES.forEach(g => {
      const chips = chipRefs[g].chips; chips.innerHTML = '';
      const list = P.load[g]; const errs = list.filter(x => x.lvl === 'error').length, warns = list.filter(x => x.lvl === 'warn').length;
      const hasSel = E.ALL_SLOTS.some(s => state.plan[g][s.k].f || state.plan[g][s.k].s);
      const blocked = Object.values(P.validation).filter(v => v.grade === g && v.state === 'blocked').length;
      chips.appendChild(h('span', { class: 'chip', text: 'Cumulative ' + P.tracker.cum[g] + ' units' }));
      if (hasSel) {
        if (errs + blocked) chips.appendChild(h('span', { class: 'chip err', text: (errs + blocked) + ' to fix' }));
        else chips.appendChild(h('span', { class: 'chip ok', text: 'Load OK' }));
        if (warns) chips.appendChild(h('span', { class: 'chip warn', text: warns + ' approval note' + (warns > 1 ? 's' : '') }));
      }
      const lm = chipRefs[g].msgs; lm.innerHTML = '';
      list.forEach(x => lm.appendChild(h('div', { class: x.lvl, text: (x.lvl === 'error' ? '⛔ ' : '⚑ ') + x.text })));
    });
  }

  /* ---------------- tracker ---------------- */
  const STX = { done: 'Complete', part: 'In progress', none: 'Not started' };
  function renderTracker(t) {
    const host = $('#trackerAreas'); host.innerHTML = '';
    t.areas.forEach(a => {
      const el = h('div', { class: 'area ' + a.status + (a.key === 'total' ? ' total' : ''), id: 'area-' + a.key },
        h('div', { class: 'area-top' }, h('span', { class: 'nm', text: a.label }), h('span', { class: 'st', text: (a.status === 'done' ? '✓ ' : a.status === 'part' ? '◐ ' : '○ ') + STX[a.status] })),
        h('div', { class: 'num' }, fmt(a.have), h('span', { text: ' / ' + fmt(a.req) + ' units' })),
        h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': a.pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': a.label + ' credits' }, h('i', { style: 'width:' + a.pct + '%' })),
        h('div', { class: 'det', text: a.detail }));
      if (a.subs && a.subs.length) { const s = h('div', { class: 'subs' }); a.subs.forEach(([n, ok]) => s.appendChild(h('span', { class: 'sub ' + (ok ? 'y' : 'n'), text: (ok ? '✓ ' : '○ ') + n }))); el.appendChild(s); }
      host.appendChild(el);
    });
    const g = $('#trackerGrades'); g.innerHTML = '';
    t.ghsa.concat([{ grade: 12, need: 22, have: t.cum[12], met: t.cum[12] >= 22 }]).forEach(x => {
      const st = x.met ? 'done' : x.have > 0 ? 'part' : 'none';
      g.appendChild(h('div', { class: 'mini ' + st }, h('div', { html: 'By end of <b>' + ORD[x.grade] + ' grade</b>' }), h('div', { class: 'big', text: fmt(x.have) + ' / ' + x.need }), h('small', { text: x.met ? '✓ checkpoint met' : 'units needed: ' + fmt(Math.max(0, x.need - x.have)) })));
    });
    const s = $('#trackerSchol'); s.innerHTML = '';
    const r = t.rigor, n = t.ncaa;
    s.appendChild(h('div', { class: 'mini ' + (r.met ? 'done' : r.have ? 'part' : 'none') }, h('div', { html: '<b>HOPE / Zell Miller rigor courses</b>' }), h('div', { class: 'big', text: r.have + ' / ' + r.need }), h('small', { text: 'Rigor-list courses planned (4 needed). Also requires a 3.0 HOPE GPA (Zell: 3.7 + test score).' })));
    s.appendChild(h('div', { class: 'mini ' + (n.met ? 'done' : n.total ? 'part' : 'none') }, h('div', { html: '<b>NCAA Division I core courses</b>' }), h('div', { class: 'big', text: fmt(n.total) + ' / 16' }),
      h('small', { text: n.parts.map(p => p[0] + ' ' + fmt(p[1]) + '/' + p[2]).join(' · ') })));
    const sb = t.areas.find(a => a.key === 'total');
    $('#sbTotal').textContent = fmt(Math.min(22, sb.raw || 0)) + ' / 22'; $('#sbFill').style.width = Math.min(100, (sb.raw || 0) / 22 * 100) + '%';
    $('#sbFill').classList.toggle('full', (sb.raw || 0) >= 22);
    const doneN = t.areas.filter(a => a.met).length; $('#sbReq').textContent = doneN + ' of ' + t.areas.length;
  }
  const fmt = n => (Math.round(n * 100) / 100).toString();

  /* ---------------- celebration ---------------- */
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 1.5l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.2 5.7 20.9l1.5-7.1L1.8 8.9 9 8.1z" fill="%C" stroke="#fff" stroke-width="1"/></svg>';
  const CAP = '<svg class="cap" viewBox="0 0 96 76" aria-hidden="true"><polygon points="48,6 94,26 48,46 2,26" fill="#002e53"/><path d="M22 38v16c0 7 12 14 26 14s26-7 26-14V38L48 50z" fill="#4c768e"/><path d="M84 29v28" stroke="#f4a72a" stroke-width="3.5" stroke-linecap="round"/><circle cx="84" cy="61" r="5.5" fill="#f4a72a"/><polygon points="48,6 94,26 48,46 2,26" fill="none" stroke="#fff" stroke-width="1.2" opacity=".5"/></svg>';
  const celQueue = []; let celBusy = false;
  function celebrateDiff(t) {
    const now = metSet(t);
    if (prevMet) t.areas.forEach(a => { if (a.met && !prevMet.has(a.key)) celQueue.push(a); });
    prevMet = now; runCel();
  }
  function runCel() {
    if (celBusy || !celQueue.length) return;
    celBusy = true;
    const a = celQueue.shift();
    const host = $('#celebrate'); host.innerHTML = ''; host.classList.add('on');
    const colors = ['#f4a72a', '#9d2235', '#47a972', '#6fccdd', '#ffc513', '#df6460', '#002e53'];
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const card = h('div', { class: 'cel-card' }, h('div', { class: 'icons' }, h('img', { src: 'assets/img/wa-icon.png', alt: '' }), h('span', { html: CAP })),
      h('h4', { text: a.key === 'total' ? 'All 22 units planned!' : a.label + ' complete!' }), h('p', { text: a.key === 'total' ? 'Ready to graduate' : 'Graduation requirement met' }));
    host.appendChild(card);
    if (!reduce) for (let i = 0; i < 30; i++) {
      const ang = (i / 30) * Math.PI * 2 + Math.random() * 0.4, dist = 150 + Math.random() * 190;
      const st = h('span', { class: 'star', html: STAR.replace('%C', colors[i % colors.length]) });
      st.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px'); st.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
      st.style.setProperty('--r', Math.round(Math.random() * 360 - 180) + 'deg'); st.style.setProperty('--s', (0.7 + Math.random() * 1.1).toFixed(2));
      st.style.setProperty('--d', (Math.random() * 0.25).toFixed(2) + 's'); host.appendChild(st);
    }
    host.setAttribute('aria-hidden', 'false'); host.setAttribute('role', 'status');
    setTimeout(() => { host.classList.remove('on'); host.innerHTML = ''; host.setAttribute('aria-hidden', 'true'); celBusy = false; setTimeout(runCel, 120); }, reduce ? 1800 : 2700);
  }

  /* ---------------- transfer credit rows ---------------- */
  const AREAS = [['eng', 'English'], ['math', 'Mathematics'], ['ss', 'Social Studies'], ['sci', 'Science'], ['wl', 'World Language'], ['pe', 'Physical Education'], ['fa', 'Fine Arts'], ['elec', 'Elective']];
  const WHEN = [['9', 'Grade 9'], ['10', 'Grade 10'], ['11', 'Grade 11'], ['12', 'Grade 12'], ['s9', 'Summer after 9th'], ['s10', 'Summer after 10th'], ['s11', 'Summer after 11th']];
  let equivHTML = null;
  function equivOptions() {
    if (equivHTML) return equivHTML;
    let o = '<option value="">— No Woodward equivalent (enter subject area) —</option>';
    const order = ['eng', 'math', 'ss', 'sci', 'wl', 'cs', 'pa', 'va', 'pe', 'deb', 'jr'];
    order.forEach(d => {
      o += '<optgroup label="' + esc(CAT.DEPTS[d]) + '">';
      CAT.list.filter(c => c.dept === d).forEach(c => c.lv.forEach(lv => { o += '<option value="' + c.id + '|' + lv + '">' + esc(E.courseLabel(c, lv)) + '</option>'; }));
      o += '</optgroup>';
    });
    return (equivHTML = o);
  }
  function renderTransfers() {
    const host = $('#transferRows'); host.innerHTML = '';
    state.prior.transfers.forEach((t, i) => {
      const upd = () => update(true);
      const title = h('input', { type: 'text', value: t.title || '', placeholder: 'e.g., Biology — Lakeview HS' });
      title.addEventListener('input', () => { t.title = title.value; save(); });
      const eq = h('select', { html: equivOptions() }); eq.value = t.equiv || '';
      const area = h('select', { html: AREAS.map(a => '<option value="' + a[0] + '">' + a[1] + '</option>').join('') }); area.value = t.area || 'elec'; area.disabled = !!t.equiv;
      const lang = h('select', { html: Object.keys(CAT.LANGS).map(k => '<option value="' + k + '">' + CAT.LANGS[k] + '</option>').join('') }); lang.value = t.lang || 'fr';
      const cr = h('select', { html: [0.5, 1, 1.5, 2, 2.5, 3, 4].map(n => '<option value="' + n + '">' + n + '</option>').join('') }); cr.value = t.cr || 1;
      const when = h('select', { html: WHEN.map(a => '<option value="' + a[0] + '">' + a[1] + '</option>').join('') }); when.value = t.when || '9';
      eq.addEventListener('change', () => { t.equiv = eq.value; const p = E.parseSel(eq.value); if (p) { t.cr = p.c.cr; cr.value = p.c.cr; if (!t.title) { t.title = E.courseLabel(p.c, p.lv); title.value = t.title; } } area.disabled = !!eq.value; renderTransfers(); upd(); });
      area.addEventListener('change', () => { t.area = area.value; renderTransfers(); upd(); });
      lang.addEventListener('change', () => { t.lang = lang.value; upd(); });
      cr.addEventListener('change', () => { t.cr = +cr.value; upd(); });
      when.addEventListener('change', () => { t.when = when.value; upd(); });
      if (!t.area) t.area = 'elec'; if (!t.cr) t.cr = 1; if (!t.when) t.when = '9'; if (!t.lang) t.lang = 'fr';
      const showLang = !t.equiv && t.area === 'wl';
      host.appendChild(h('div', { class: 'tr-row' },
        h('label', { text: 'Course / school' }, title), h('label', { text: 'Woodward equivalent' }, eq),
        h('label', { text: t.equiv ? 'Subject area' : showLang ? 'Area · language' : 'Subject area' }, area, showLang ? lang : null),
        h('label', { text: 'Credits' }, cr), h('label', { text: 'Completed' }, when),
        h('button', { type: 'button', class: 'x', 'aria-label': 'Remove transfer credit', text: '×', onclick: () => { state.prior.transfers.splice(i, 1); renderTransfers(); update(true); } })));
    });
  }

  /* ---------------- cocurricular rows ---------------- */
  function cocOptions() {
    const cats = []; COC.list.forEach(a => { if (!cats.includes(a.cat)) cats.push(a.cat); });
    return '<option value="">— choose an activity —</option>' + cats.map(c => '<optgroup label="' + esc(c) + '">' + COC.list.filter(a => a.cat === c).map(a => '<option value="' + esc(a.name) + '">' + esc(a.name) + '</option>').join('') + '</optgroup>').join('') + '<option value="__other">Other (write in)…</option>';
  }
  function renderCoc() {
    const host = $('#cocRows'); host.innerHTML = '';
    if (!state.cocurr.length) state.cocurr.push({ name: '', status: 'active' });
    state.cocurr.forEach((c, i) => {
      const known = !c.name || COC.list.some(a => a.name === c.name);
      const act = h('select', { html: cocOptions(), 'aria-label': 'Activity' }); act.value = known ? c.name : '__other';
      const other = h('input', { type: 'text', placeholder: 'Activity name', value: known ? '' : c.name }); other.style.display = known ? 'none' : '';
      const stat = h('select', { html: COC.STATUS.map(s => '<option value="' + s.v + '">' + s.label + '</option>').join(''), 'aria-label': 'Participation' }); stat.value = c.status || 'active';
      const hint = h('small', { text: noteFor(c.name) });
      act.addEventListener('change', () => { if (act.value === '__other') { other.style.display = ''; c.name = other.value; } else { other.style.display = 'none'; c.name = act.value; } hint.textContent = noteFor(c.name); update(true); });
      other.addEventListener('input', () => { c.name = other.value; save(); });
      stat.addEventListener('change', () => { c.status = stat.value; update(true); });
      host.appendChild(h('div', { class: 'coc-row' }, h('div', {}, act, other, hint), stat,
        h('button', { type: 'button', class: 'x', 'aria-label': 'Remove activity', text: '×', onclick: () => { state.cocurr.splice(i, 1); renderCoc(); update(true); } })));
    });
  }
  const noteFor = n => { const a = COC.list.find(x => x.name === n); return a ? a.note : ''; };

  /* ---------------- reference panel ---------------- */
  function renderRef() {
    const host = $('#refBody'); host.innerHTML = '';
    REF.sections.forEach(s => {
      const d = h('div', { class: 'ref-sec' }, h('h4', { text: s.title }));
      if (s.rows) { const t = h('table'); s.rows.forEach(r => t.appendChild(h('tr', {}, h('td', { text: r[0] }), h('td', { text: r[1] })))); d.appendChild(t); }
      if (s.items) { const u = h('ul'); s.items.forEach(i => u.appendChild(h('li', { text: i }))); d.appendChild(u); }
      host.appendChild(d);
    });
    host.appendChild(h('p', { class: 'muted', text: 'Reference current as of ' + REF.updated + '.' }));
  }

  /* ---------------- readiness / validation ---------------- */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function infoProblems() {
    const i = state.info, p = [];
    if (!i.studentName.trim()) p.push('Student name'); if (!EMAIL.test(i.studentEmail.trim())) p.push('Valid student email');
    if (!i.classOf) p.push('Projected graduation year'); if (!i.counselorName.trim()) p.push('Counselor name');
    if (!EMAIL.test(i.counselorEmail.trim())) p.push('Valid counselor email');
    else if (CFG.COUNSELOR_EMAIL_DOMAIN && !i.counselorEmail.trim().toLowerCase().endsWith('@' + CFG.COUNSELOR_EMAIL_DOMAIN)) p.push('Counselor email must end in @' + CFG.COUNSELOR_EMAIL_DOMAIN);
    if (!i.date) p.push('Date'); if (!i.accessCode.trim()) p.push('Counselor access code');
    return p;
  }
  function renderReadiness(P) {
    const host = $('#readiness'); host.innerHTML = '';
    const ip = infoProblems();
    if (ip.length) { host.appendChild(h('h4', { text: 'Complete Step 1' })); ip.forEach(x => host.appendChild(h('div', { class: 'item', text: 'Needed: ' + x }))); }
    if (P.errs.length) { host.appendChild(h('h4', { text: 'Plan items to resolve (' + P.errs.length + ')' })); P.errs.forEach(x => host.appendChild(h('div', { class: 'item', text: x }))); }
    if (P.approvals.length) { host.appendChild(h('h4', { text: 'Approvals the plan depends on (' + P.approvals.length + ') — listed in the Google Doc' })); P.approvals.slice(0, 12).forEach(a => host.appendChild(h('div', { class: 'item w', text: ORD[a.grade] + ' · ' + a.course + ' — ' + a.note }))); if (P.approvals.length > 12) host.appendChild(h('div', { class: 'item w', text: '…and ' + (P.approvals.length - 12) + ' more' })); }
    if (!ip.length && !P.errs.length) host.insertBefore(h('div', { class: 'ok-line', text: '✓ All graduation requirements are met and the plan is ready to submit.' }), host.firstChild);
    $('#overrideBox').hidden = !P.errs.length;
    if (!P.errs.length) { state.override.on = false; $('#ovOn').checked = false; }
  }

  /* ---------------- submit ---------------- */
  function dialog(html, buttons) {
    return new Promise(res => {
      const d = $('#dlg'); $('#dlgBody').innerHTML = html; const a = $('#dlgActions'); a.innerHTML = '';
      buttons.forEach(b => a.appendChild(h('button', { type: 'button', class: 'btn ' + (b.primary ? 'primary' : 'ghost'), text: b.text, onclick: () => { d.close(); res(b.value); } })));
      d.addEventListener('cancel', () => res(false), { once: true }); d.showModal();
    });
  }
  function buildPayload(P) {
    const i = state.info; const t = P.tracker;
    const grades = E.GRADES.map(g => ({
      grade: g, label: ORD[g] + ' Grade', year: yearLabel(g),
      rows: E.CORE_SLOTS.map(s => ({ label: s.label, cells: E.cellText(state, g, s.k), kind: 'core' })).concat(E.ELEC_SLOTS.map(s => ({ label: s.label, cells: E.cellText(state, g, s.k), kind: 'elec' }))),
      summer: g < 12 ? E.summerText(state, g) : []
    }));
    const pr = state.prior, ms = [];
    if (+pr.psCredit > 0) ms.push('Physical Science (8th grade): ' + pr.psCredit + ' unit science credit');
    if (pr.civics8) ms.push('Government & Economics HP completed in 8th grade (Gov/Econ waived)');
    const mathTxt = { alg1: 'Algebra 1 (CP/EP)', alg1hp: 'Algebra 1 (HP)', geohp: 'Algebra 1 (HP) + Geometry (HP)' }[pr.msMath]; if (mathTxt) ms.push('Middle School math: ' + mathTxt + ' (no U.S. credit)');
    if (pr.msLang) { const [c, l] = pr.msLang.split(':'); ms.push('Middle School ' + CAT.LANGS[c] + ': Level ' + (l === '2' ? '1 & 2' : '1') + ' complete'); }
    if (pr.gat) ms.push('GAT HP completed'); if (pr.placement) ms.push('Language placement / heritage speaker');
    const tr = pr.transfers.filter(x => +x.cr > 0).map(x => {
      const p = E.parseSel(x.equiv); const w = WHEN.find(w => w[0] === String(x.when)); const a = AREAS.find(a => a[0] === x.area);
      return (x.title || (p ? E.courseLabel(p.c, p.lv) : 'Transfer credit')) + ' — ' + x.cr + ' unit' + (+x.cr === 1 ? '' : 's') + ' (' + (p ? 'equiv. ' + E.courseLabel(p.c, p.lv) : (a ? a[1] : '') + (x.area === 'wl' ? ': ' + CAT.LANGS[x.lang] : '')) + '), ' + (w ? w[1] : '');
    });
    return {
      version: 1, accessCode: i.accessCode.trim(),
      student: { name: i.studentName.trim(), email: i.studentEmail.trim() }, counselor: { name: i.counselorName.trim(), email: i.counselorEmail.trim() },
      date: i.date, dateText: new Date(i.date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      classOf: i.classOf, gradText: i.classOf ? 'Spring ' + i.classOf : '', notes: i.notes.trim(), grades, prior: { ms, transfers: tr },
      cocurr: state.cocurr.filter(c => c.name).map(c => { const a = COC.list.find(x => x.name === c.name); return { name: c.name, cat: a ? a.cat : 'Other', status: c.status === 'active' ? 'Currently participating' : 'Interested in exploring' }; }),
      tracker: {
        areas: t.areas.map(a => ({ key: a.key, label: a.label, have: a.have, req: a.req, status: a.status, detail: a.detail })),
        ghsa: t.ghsa.map(x => ({ grade: x.grade, need: x.need, have: x.have, met: x.met })).concat([{ grade: 12, need: 22, have: t.cum[12], met: t.cum[12] >= 22 }]),
        rigor: t.rigor, ncaa: { total: t.ncaa.total, met: t.ncaa.met }
      },
      approvals: P.approvals, override: { on: !!state.override.on, reason: state.override.reason || '', issues: state.override.on ? P.errs : [] },
      reference: REF
    };
  }
  async function submit() {
    const P = E.problems(state); const msg = $('#submitMsg'); msg.innerHTML = '';
    const ip = infoProblems();
    if (ip.length) { msg.innerHTML = '<div class="bad"><b>Please complete Step 1:</b> ' + esc(ip.join(', ')) + '.</div>'; $('#s-info').scrollIntoView({ behavior: 'smooth' }); markBad(); return; }
    if (P.errs.length) {
      if (!$('#ovOn').checked) { msg.innerHTML = '<div class="bad"><b>The plan has ' + P.errs.length + ' unresolved item(s).</b> Fix them above, or tick “Counselor override” and give a reason.</div>'; return; }
      if (!$('#ovReason').value.trim()) { msg.innerHTML = '<div class="bad">Please enter a reason for the override.</div>'; $('#ovReason').focus(); return; }
      state.override.on = true; state.override.reason = $('#ovReason').value.trim();
    }
    const i = state.info;
    const ok = await dialog('<h3>Create this course plan?</h3><ul><li>A Google Doc for <b>' + esc(i.studentName) + '</b> will be created.</li><li>It will be <b>owned and editable by ' + esc(i.counselorName) + '</b> (' + esc(i.counselorEmail) + ').</li><li>It will be shared <b>view-only</b> with ' + esc(i.studentEmail) + '.</li>' + (state.override.on ? '<li><b>Counselor override</b> will be recorded in the document.</li>' : '') + '</ul>', [{ text: 'Cancel', value: false }, { text: 'Create Google Doc', value: true, primary: true }]);
    if (!ok) return;
    const payload = buildPayload(P);
    const btn = $('#submitBtn'); btn.disabled = true; btn.textContent = 'Creating Google Doc…';
    try {
      if (!CFG.APPS_SCRIPT_URL) throw new Error('NOT_CONFIGURED');
      const resp = await fetch(CFG.APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'The server could not create the document.');
      msg.innerHTML = '<div class="ok"><b>✓ Course plan created.</b><br>The Google Doc is now owned by ' + esc(i.counselorName) + ' and shared view-only with ' + esc(i.studentEmail) + '.' + (data.docUrl ? '<br><a href="' + esc(data.docUrl) + '" target="_blank" rel="noopener">Open the Google Doc →</a>' : '') + (data.warnings && data.warnings.length ? '<br><small>Notes: ' + esc(data.warnings.join(' ')) + '</small>' : '') + '</div>';
    } catch (err) {
      if (err.message === 'NOT_CONFIGURED') msg.innerHTML = '<div class="bad"><b>The Google Apps Script back end is not connected yet.</b> Add the web-app URL to <code>assets/js/config.js</code> (see README). Your plan is safe — use “Save draft file” to keep it.</div>';
      else msg.innerHTML = '<div class="bad"><b>Could not submit.</b> ' + esc(err.message || String(err)) + ' Check your connection and access code, then try again. Use “Save draft file” to keep your work.</div>';
    } finally { btn.disabled = false; btn.textContent = 'Submit Course Plan'; }
  }
  function markBad() {
    const i = state.info; const set = (p, bad) => { const el = $('[data-bind="' + p + '"]'); if (el) el.classList.toggle('bad', bad); };
    set('info.studentName', !i.studentName.trim()); set('info.studentEmail', !EMAIL.test(i.studentEmail.trim())); set('info.counselorName', !i.counselorName.trim());
    set('info.counselorEmail', !EMAIL.test(i.counselorEmail.trim()) || (CFG.COUNSELOR_EMAIL_DOMAIN && !i.counselorEmail.trim().toLowerCase().endsWith('@' + CFG.COUNSELOR_EMAIL_DOMAIN)));
    set('info.classOf', !i.classOf); set('info.date', !i.date); set('info.accessCode', !i.accessCode.trim());
  }

  /* ---------------- drafts ---------------- */
  function saveDraft() {
    const c = JSON.parse(JSON.stringify(state)); c.info.accessCode = '';
    const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(c, null, 1)], { type: 'application/json' })), download: 'course-plan-draft-' + (state.info.studentName || 'student').replace(/\W+/g, '-').toLowerCase() + '.json' });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function loadDraft(file) {
    const r = new FileReader();
    r.onload = () => { try { mergeState(JSON.parse(r.result)); fullRender(); } catch (e) { $('#submitMsg').innerHTML = '<div class="bad">That file is not a valid draft.</div>'; } };
    r.readAsText(file);
  }
  async function reset() {
    const ok = await dialog('<h3>Start over?</h3><p>This clears the student information, prior credit, plan and cocurriculars.</p>', [{ text: 'Cancel', value: false }, { text: 'Clear everything', value: true, primary: true }]);
    if (!ok) return; state = E.emptyState(); try { sessionStorage.removeItem(SKEY); } catch (e) { /* */ } fullRender();
  }

  /* ---------------- boot ---------------- */
  function syncBound() { $$('[data-bind]').forEach(el => { const v = getPath(el.dataset.bind); if (el.type === 'checkbox') el.checked = !!v; else el.value = v == null ? '' : v; }); }
  function fullRender() {
    syncBound(); labelGrades(); renderTransfers(); renderCoc();
    $$('#grades select').forEach(s => { delete s.dataset.sig; });
    $('#ovOn').checked = !!state.override.on; $('#ovReason').value = state.override.reason || '';
    update(false);
  }
  function init() {
    load(); initBindings(); buildGrades(); renderRef();
    $('#addTransfer').addEventListener('click', () => { state.prior.transfers.push({ title: '', equiv: '', area: 'elec', cr: 1, when: '9', lang: 'fr' }); renderTransfers(); update(true); });
    $('#addCoc').addEventListener('click', () => { state.cocurr.push({ name: '', status: 'active' }); renderCoc(); });
    $('#submitBtn').addEventListener('click', submit);
    $('#saveDraft').addEventListener('click', saveDraft);
    $('#loadDraft').addEventListener('change', e => { if (e.target.files[0]) loadDraft(e.target.files[0]); e.target.value = ''; });
    $('#resetAll').addEventListener('click', reset);
    $('#ovOn').addEventListener('change', e => { state.override.on = e.target.checked; save(); });
    $('#ovReason').addEventListener('input', e => { state.override.reason = e.target.value; save(); });
    ['info.studentName', 'info.studentEmail', 'info.counselorName', 'info.counselorEmail', 'info.date', 'info.accessCode'].forEach(p => $('[data-bind="' + p + '"]').addEventListener('input', e => { e.target.classList.remove('bad'); renderReadiness(E.problems(state)); }));
    fullRender();
  }
  window.WA.app = { buildPayload: () => buildPayload(E.problems(state)), getState: () => state, setState: s => { mergeState(s); fullRender(); }, update };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
