/* Planner engine: timeline, prerequisite evaluation, dynamic dropdown options,
 * course-load rules, and graduation / credit tracking. Pure logic — no DOM. */
(function (root) {
  const WA = root.WA = root.WA || {};
  (WA.versions = WA.versions || {})['engine.js'] = '2';
  const CAT = WA.catalog || require('./catalog.js');
  const COC = WA.cocurr || (typeof require !== 'undefined' ? require('./cocurriculars.js') : null);
  const { by: BY, list: LIST, CORE, LEVEL_RANK, LANGS } = CAT;

  /* ---------- structure ---------- */
  const GRADES = [9, 10, 11, 12];
  const CORE_SLOTS = [
    { k: 'eng', label: 'English', dept: 'eng' }, { k: 'math', label: 'Mathematics', dept: 'math' },
    { k: 'ss', label: 'Social Studies', dept: 'ss' }, { k: 'sci', label: 'Science', dept: 'sci' },
    { k: 'wl', label: 'World Language', dept: 'wl' }
  ];
  const ELEC_SLOTS = [{ k: 'e1', label: 'Elective 1' }, { k: 'e2', label: 'Elective 2' }, { k: 'e3', label: 'Elective 3' }];
  const SUMMER_SLOTS = [{ k: 'su1', label: 'Summer course 1' }, { k: 'su2', label: 'Summer course 2' }];
  const ALL_SLOTS = CORE_SLOTS.concat(ELEC_SLOTS);

  const T = (g, h) => 2 * (g - 9) + h;          // fall = 0, spring = 1 within each grade
  const TSUM = g => 2 * (g - 9) + 1.5;          // summer after grade g

  function emptyState() {
    const plan = {}, summer = {};
    GRADES.forEach(g => {
      plan[g] = {}; ALL_SLOTS.forEach(s => { plan[g][s.k] = { f: '', s: '' }; });
      summer[g] = { su1: '', su2: '' };
    });
    const d = new Date();
    return {
      info: { studentName: '', studentEmail: '', counselorName: '', counselorEmail: '', date: d.toISOString().slice(0, 10), classOf: '', notes: '' },
      prior: { psCredit: 0, civics8: false, msMath: 'alg1', msLang: '', placement: false, transfers: [] },
      plan, summer, cocurr: [], override: { on: false, reason: '' }
    };
  }

  /* ---------- helpers ---------- */
  function parseSel(v) {
    if (!v) return null;
    const [id, lv] = v.split('|'); const c = BY[id];
    return c ? { c, lv: lv || '', id } : null;
  }
  const levelLabel = lv => (lv ? ' (' + lv + ')' : '');
  const courseLabel = (c, lv) => c.name + levelLabel(lv);
  function famName(fam, lvSpec) {
    const c = LIST.find(x => x.fam === fam) || BY[fam];
    let n = c ? c.name.replace(/ \((Summer|Costa Rica, Summer)\)$/, '') : fam;
    if (fam === 'band') n = 'a band course';
    if (lvSpec) n += ' (' + lvSpec + ')';
    return n;
  }
  function occupy(c, g, half) {
    if (c.t === 'SU') { const x = TSUM(g); return { start: x, end: x }; }
    if (c.t === 'Y') { const s = T(g, 0); return { start: s, end: s + 1 }; }
    const s = T(g, half); return { start: s, end: s };
  }
  const needsApproval = txt => /permission|audition|approv|application|recommend|placement/i.test(txt || '');

  /* ---------- profile flags & pseudo-taken from prior credit ---------- */
  function profileFlags(prior) {
    return {
      civics8: !!prior.civics8, placement: !!prior.placement,
      msAlg1HP: prior.msMath === 'alg1hp' || prior.msMath === 'geohp'
    };
  }
  function priorRecords(prior) {
    const out = [];
    const ms = (id, fam, lv, extra) => out.push(Object.assign({ id, fam, lv, start: -1, end: -1, cr: 0, src: 'ms' }, extra || {}));
    if (prior.msMath === 'alg1' || prior.msMath === 'alg1hp' || prior.msMath === 'geohp') ms('ms_alg1', 'alg1', prior.msMath === 'alg1' ? 'EP' : 'HP', { dept: 'math' });
    if (prior.msMath === 'geohp') ms('ms_geo', 'geo', 'HP', { dept: 'math' });
    if (prior.msLang) {  // Middle School or Upper School language classes completed before grade 9: levels 1..N (no credit)
      const [code, lvn] = prior.msLang.split(':'), N = Math.min(4, Math.max(1, +lvn || 1));
      for (let i = 1; i <= N; i++) ms('ms_' + code + i, code + i, N === 1 ? 'EP' : 'HP', { dept: 'wl', lang: code });
    }
    if (+prior.psCredit > 0) out.push({ id: 'ms_ps', fam: 'ms_ps', lv: '', start: -1, end: -1, cr: +prior.psCredit, dept: 'sci', src: 'ms', grade: 9, label: 'Physical Science (WA 8th grade)' });
    (prior.transfers || []).forEach((t, i) => {
      if (!t || !(+t.cr > 0)) return;
      const when = String(t.when || '9'); const summer = when[0] === 's'; const g = +(summer ? when.slice(1) : when);
      const start = summer ? TSUM(g) : T(g, 0), end = summer ? TSUM(g) : T(g, 1);
      const sel = parseSel(t.equiv);
      if (sel) {
        out.push({ id: 'tr' + i, fam: sel.c.fam, lv: sel.lv, start, end, cr: +t.cr, dept: sel.c.dept, lang: sel.c.lang, lvn: sel.c.lvn, c: sel.c, src: 'tr', grade: summer ? g + 1 : g, label: t.title || courseLabel(sel.c, sel.lv) + ' (transfer)', area: sel.c.dept });
      } else {
        const a = t.area || 'elec';
        out.push({ id: 'tr' + i, fam: 'tr_' + a, lv: '', start, end, cr: +t.cr, dept: a === 'elec' ? 'x' : a, lang: a === 'wl' ? t.lang : undefined, src: 'tr', grade: summer ? g + 1 : g, label: (t.title || 'Transfer credit') + ' (transfer)', area: a, pe: a === 'pe', fa: a === 'fa' });
      }
    });
    return out;
  }

  /* ---------- gather everything selected in the plan ---------- */
  function planRecords(state, exclude) {
    const out = [];
    GRADES.forEach(g => {
      ALL_SLOTS.forEach(s => {
        const ex = exclude && exclude.g === g && exclude.k === s.k ? (exclude.w || 'both') : '';
        const cell = state.plan[g][s.k];
        const f = parseSel(cell.f), sp = parseSel(cell.s);
        if (f && ex !== 'f' && ex !== 'both') out.push(rec(f, g, 0, s.k, 'f'));
        if (sp && !(f && f.c.t === 'Y') && ex !== 's' && ex !== 'both') out.push(rec(sp, g, 1, s.k, 's'));
      });
      if (g < 12) SUMMER_SLOTS.forEach(s => {
        if (exclude && exclude.g === g && exclude.k === s.k) return;
        const x = parseSel(state.summer[g][s.k]);
        if (x) out.push(rec(x, g, 0, s.k, 'f'));
      });
    });
    return out;
  }
  function rec(sel, g, half, slot, which) {
    const o = occupy(sel.c, g, half);
    return {
      id: sel.id, fam: sel.c.fam, lv: sel.lv, c: sel.c, dept: sel.c.dept, lang: sel.c.lang, lvn: sel.c.lvn,
      start: o.start, end: o.end, cr: sel.c.nocr ? 0 : sel.c.cr, grade: sel.c.t === 'SU' ? g + 1 : g, slot, which, src: 'wa', sumAfter: sel.c.t === 'SU' ? g : 0
    };
  }
  function allTaken(state, exclude) { return priorRecords(state.prior).concat(planRecords(state, exclude)); }

  /* ---------- prerequisite evaluation ---------- */
  function matchLevel(lv, spec) {
    if (!spec) return true;
    const plus = spec.endsWith('+'); const want = spec.replace('+', '');
    return plus ? LEVEL_RANK[lv] >= LEVEL_RANK[want] : lv === want;
  }
  function evalExpr(expr, ctx) {
    if (expr == null) return { ok: true, why: [] };
    if (typeof expr === 'string') {
      if (expr.startsWith('prof:')) {
        const k = expr.slice(5);
        return ctx.prof[k] ? { ok: true, why: [] } : { ok: false, why: [profText(k)] };
      }
      const conc = expr[0] === '~'; const e = conc ? expr.slice(1) : expr;
      const [fam, lvSpec] = e.split(':');
      const hit = ctx.taken.some(t => t.fam === fam && matchLevel(t.lv, lvSpec) &&
        (t.end < ctx.start || (conc && t.start <= ctx.start && t.end >= ctx.start)));
      return hit ? { ok: true, why: [] } : { ok: false, why: [famName(fam, lvSpec) + (conc ? ' (before or at the same time)' : '')] };
    }
    if (expr.all) {
      const r = expr.all.map(x => evalExpr(x, ctx));
      return { ok: r.every(x => x.ok), why: [].concat(...r.filter(x => !x.ok).map(x => x.why)) };
    }
    if (expr.any) {
      const r = expr.any.map(x => evalExpr(x, ctx));
      if (r.some(x => x.ok)) return { ok: true, why: [] };
      return { ok: false, why: [r.map(x => x.why.join(' + ')).filter(Boolean).join(' or ')] };
    }
    return { ok: true, why: [] };
  }
  function profText(k) {
    return { civics8: 'HP Government & Economics in 8th grade', placement: 'language placement test',
      msAlg1HP: 'Algebra 1 HP in 8th grade' }[k] || k;
  }

  /* ---------- PE / Fine Arts completion before a given time (for R period) ---------- */
  function athleticsPE(state) {
    return (state.cocurr || []).some(x => x.status === 'active' && cocurrPE(x.name));
  }
  function cocurrPE(name) { const a = COC.list.find(x => x.name === name); return !!(a && a.pe); }
  function peFaDone(taken, start, state) {
    const pe = athleticsPE(state) || taken.some(t => (t.c ? t.c.pe : t.pe) && t.end < start);
    const fa = taken.some(t => (t.c ? t.c.fa : t.fa) && t.end < start);
    return pe && fa;
  }

  /* ---------- status of one course option in one place ---------- */
  function optionStatus(state, c, lv, grade, half, slotKey, taken, flagsOn) {
    const msgs = [], approvals = [];
    const out = (st, why) => ({ state: st, blockedReason: why, msgs, approvals });
    if (c.t === 'SU') { if (!(c.sg || []).includes(grade)) return out('na'); }
    else {
      if (half === 0 && !(c.t === 'Y' || c.t === 'F' || c.t === 'E')) return out('na');
      if (half === 1 && !(c.t === 'S' || c.t === 'E')) return out('na');
      if (c.g.includes(grade)) { /* ok */ }
      else if ((c.ga || []).includes(grade)) approvals.push('Grade ' + grade + ' placement needs approval');
      else return out('na');
    }
    const start = occupy(c, grade, half).start;
    if (!c.rep && taken.some(t => t.id === c.id || (t.src === 'tr' && t.c && t.c.id === c.id)))
      return out('blocked', 'Already in this plan');
    if (c.excl && c.excl.some(f => taken.some(t => t.fam === f))) return out('blocked', 'Not available after ' + famName(c.excl[0]));
    if (c.needs === 'peFa' && !peFaDone(taken, start, state)) return out('blocked', 'Requires PE and Fine Arts to be completed first');
    const ctx = { taken, start, prof: profileFlags(state.prior) };
    const pre = (c.prl && c.prl[lv]) || c.pre;
    if (pre) { const r = evalExpr(pre, ctx); if (!r.ok) return out('blocked', 'Needs ' + r.why.join('; ')); }
    if (c.soft) { const r = evalExpr(c.soft, ctx); if (!r.ok) approvals.push('Dept Chair approval — usual prerequisite: ' + r.why.join('; ')); }
    const ap = (c.apl && c.apl[lv]) || c.ap;
    if (ap && needsApproval(ap)) approvals.push(ap); else if (ap) msgs.push(ap);
    // moving up a level in the same discipline needs chair approval
    if (CORE.includes(c.dept) && lv) {
      const prev = taken.filter(t => t.src === 'wa' && t.dept === c.dept && t.end < start && t.lv && (c.dept !== 'wl' || t.lang === c.lang))
        .sort((a, b) => b.end - a.end)[0];
      if (prev && LEVEL_RANK[lv] > LEVEL_RANK[prev.lv]) approvals.push('Level change (' + prev.lv + ' → ' + lv + ') needs Dept Chair approval');
    }
    return out(approvals.length ? 'approval' : 'ok');
  }

  /* ---------- dropdown options ---------- */
  function slotDepts(slotKey) { const s = CORE_SLOTS.find(x => x.k === slotKey); return s ? [s.dept] : null; }
  function optionsFor(state, grade, slotKey, half) {
    const taken = allTaken(state, { g: grade, k: slotKey, w: half === 0 ? 'f' : 's' });
    const depts = slotDepts(slotKey);
    const isSummer = /^su/.test(slotKey);
    const groups = {}, locked = [];
    LIST.forEach(c => {
      if (depts && !depts.includes(c.dept)) return;
      if (!isSummer && c.t === 'SU') return;
      if (isSummer && c.t !== 'SU') return;
      c.lv.forEach(lv => {
        const st = optionStatus(state, c, lv, grade, half, slotKey, taken);
        if (st.state === 'na') return;
        const val = c.id + '|' + lv;
        const suffix = (c.t === 'Y' && !isSummer ? ' — full year' : '') + (c.t === 'F' && half === 0 ? '' : '');
        const item = { value: val, label: courseLabel(c, lv) + suffix, state: st.state, approvals: st.approvals, msgs: st.msgs, dept: c.dept };
        if (st.state === 'blocked') { if (st.blockedReason && !/^Already/.test(st.blockedReason)) locked.push(Object.assign(item, { reason: st.blockedReason })); return; }
        if (st.state === 'approval') item.label += '  ⚑ approval';
        (groups[c.dept] = groups[c.dept] || []).push(item);
      });
    });
    const order = ['eng', 'math', 'ss', 'sci', 'wl', 'cs', 'pa', 'va', 'pe', 'deb', 'jr', 'ls', 'ss_x'];
    const out = order.filter(d => groups[d]).map(d => ({ group: CAT.DEPTS[d], items: groups[d] }));
    return { groups: out, locked };
  }

  /* ---------- validation of every selection ---------- */
  function validateSelections(state) {
    const res = {}; // key: g|slot|f/s -> {state, msgs, approvals, reason}
    GRADES.forEach(g => {
      ALL_SLOTS.concat(g < 12 ? SUMMER_SLOTS : []).forEach(s => {
        const isSum = /^su/.test(s.k);
        const cell = isSum ? { f: state.summer[g][s.k], s: '' } : state.plan[g][s.k];
        [['f', 0], ['s', 1]].forEach(([w, h]) => {
          const sel = parseSel(cell[w]); if (!sel) return;
          if (w === 's' && parseSel(cell.f) && parseSel(cell.f).c.t === 'Y') return;
          const taken = allTaken(state, { g, k: s.k, w });
          const st = optionStatus(state, sel.c, sel.lv, g, h, s.k, taken);
          res[g + '|' + s.k + '|' + w] = Object.assign({ course: courseLabel(sel.c, sel.lv), grade: g, slot: s.k }, st);
        });
      });
    });
    return res;
  }

  /* ---------- course-load rules per grade ---------- */
  function loadChecks(state) {
    const checks = {};
    GRADES.forEach(g => {
      const list = [];
      const has = ALL_SLOTS.some(s => state.plan[g][s.k].f || state.plan[g][s.k].s);
      checks[g] = list;
      if (!has) return;
      const sems = [0, 1].map(h => {
        const rows = [];
        ALL_SLOTS.forEach(s => {
          const cell = state.plan[g][s.k]; const f = parseSel(cell.f), sp = parseSel(cell.s);
          const x = h === 0 ? f : (f && f.c.t === 'Y' ? f : sp);
          if (x) rows.push(x);
        });
        return rows;
      });
      sems.forEach((rows, h) => {
        const nm = h ? 'Spring' : 'Fall';
        const graded = rows.filter(x => !x.c.nocr);
        const core = rows.filter(x => CORE.includes(x.c.dept));
        const ap = rows.filter(x => x.lv === 'AP').length;
        const hpCore = rows.filter(x => CORE.includes(x.c.dept) && x.lv === 'HP').length;
        const supp = rows.filter(x => x.c.supp).length, hall = rows.filter(x => x.c.hall).length;
        if (rows.length > 7) list.push({ lvl: 'error', text: nm + ': ' + rows.length + ' periods selected — the schedule has 7.' });
        if (graded.length < 6) list.push({ lvl: 'error', text: nm + ': ' + graded.length + ' graded subjects — a minimum of 6 is required each semester.' });
        if (core.length < 4) list.push({ lvl: 'error', text: nm + ': ' + core.length + ' core-discipline subjects — a minimum of 4 is required.' });
        if (core.length >= 7) list.push({ lvl: 'error', text: nm + ': 7 core classes are never permitted.' });
        else if (core.length === 6 || (g === 9 && core.length > 5)) list.push({ lvl: g === 9 ? 'error' : 'warn', text: nm + ': ' + core.length + ' core classes ' + (g === 9 ? '— grade 9 allows no more than 5.' : '— more than 5 needs Academic Dean approval.') });
        if (g === 9 && ap > 0) list.push({ lvl: 'error', text: nm + ': No AP courses are allowed in grade 9.' });
        if (g === 10 && ap > 2) list.push({ lvl: 'error', text: nm + ': No more than 2 AP courses in grade 10.' });
        if (g >= 11 && ap >= 6) list.push({ lvl: 'error', text: nm + ': 6 or more AP courses are never permitted.' });
        else if (g >= 11 && ap === 5) list.push({ lvl: 'warn', text: nm + ': 5 AP courses need permission of all department chairs and the Academic Dean.' });
        if (g === 9 && hpCore > 5) list.push({ lvl: 'error', text: nm + ': Grade 9 allows no more than 5 HP core courses.' });
        if (g >= 10 && ap + hpCore >= 6) list.push({ lvl: 'warn', text: nm + ': A mix of 6 HP/AP core courses needs Academic Dean approval.' });
        if (supp > 1 || (supp && hall)) list.push({ lvl: 'error', text: nm + ': Only one study-support class (and no study hall/R period alongside it) per semester.' });
        if (g < 11 && rows.some(x => x.c.id === 'rper')) list.push({ lvl: 'error', text: nm + ': R period is for grades 11–12 only.' });
      });
      const artSems = [0, 1].map(h => sems[h].filter(x => x.c.art).length);
      if (artSems.some(n => n > 1) || (artSems[0] + artSems[1]) > 2) list.push({ lvl: 'warn', text: 'No more than 2 semesters of visual art may be requested in a year.' });
      ['eng', 'math'].forEach(d => { if (!sems[0].concat(sems[1]).some(x => x.c.dept === d)) list.push({ lvl: 'warn', text: CAT.DEPTS[d] + ' is required each year (4 consecutive units).' }); });
    });
    return checks;
  }

  /* ---------- records that count for credit ---------- */
  function creditRecords(state) {
    const recs = [];
    planRecords(state, null).forEach(r => { if (r.cr > 0) recs.push(r); });
    priorRecords(state.prior).forEach(r => { if (r.cr > 0) recs.push(r); });
    return recs;
  }
  const recPE = r => (r.c ? r.c.pe : r.pe), recFA = r => (r.c ? r.c.fa : r.fa);

  /* ---------- graduation tracker ---------- */
  function tracker(state) {
    const recs = creditRecords(state);
    const sum = f => recs.filter(f).reduce((a, r) => a + r.cr, 0);
    const civ = state.prior.civics8;
    const A = [];
    const add = (key, label, req, have, met, detail, extra) => A.push(Object.assign({ key, label, req, have: Math.round(have * 100) / 100, met, detail: detail || '' }, extra || {}));

    // English
    const eng = sum(r => (r.c && r.c.req === 'eng') || (r.src === 'tr' && r.area === 'eng' && !r.c));
    add('eng', 'English', 4, Math.min(eng, 4), eng >= 4, 'English 1, 2, 3, 4 (or AP)');
    // Math
    const math = sum(r => r.dept === 'math');
    add('math', 'Mathematics', 4, Math.min(math, 4), math >= 4, 'Four consecutive units, grades 9–12');
    // Social studies
    const ssAll = sum(r => r.dept === 'ss');
    const has = (fam, eq) => recs.some(r => r.fam === fam || (eq && r.fam === eq));
    const sGov = has('govecon'), sMwh = has('mwh'), sUs = has('ushist');
    let ssHave, ssMet, ssDetail;
    if (civ) { ssHave = Math.min(ssAll, 3); ssMet = ssAll >= 3; ssDetail = 'Civics (8th) completed — Gov/Econ waived; 3 SS units still required'; }
    else { ssHave = (sGov ? 1 : 0) + (sMwh ? 1 : 0) + (sUs ? 1 : 0); ssMet = ssHave >= 3; ssDetail = 'U.S. Gov/Econ, Modern World History, U.S. History'; }
    add('ss', 'Social Studies', 3, ssHave, ssMet, ssDetail, { subs: civ ? [] : [['Gov/Econ', sGov], ['Modern World', sMwh], ['U.S. History', sUs]] });
    // Science
    const sci = sum(r => r.dept === 'sci' && !(r.c && r.c.nsci));
    const hasBio = has('bio'), hasChem = has('chem');
    add('sci', 'Science', 4, Math.min(sci, 4), sci >= 4 && hasBio && hasChem, 'Biology (9th) and Chemistry (10th) + 2 more',
      { subs: [['Biology', hasBio], ['Chemistry', hasChem]] });
    // World language: 2 consecutive years of the same language
    const langs = {}; recs.filter(r => r.dept === 'wl' && r.lang && r.src !== 'ms').forEach(r => { (langs[r.lang] = langs[r.lang] || []).push(r); });
    let best = { code: '', cr: 0, ok: false };
    Object.keys(langs).forEach(code => {
      const cr = langs[code].reduce((a, r) => a + r.cr, 0);
      const yrs = [...new Set(langs[code].map(r => r.grade))];
      const consec = yrs.some(y => yrs.includes(y + 1));
      const ok = cr >= 2 && consec;
      if (ok || cr > best.cr) if (!best.ok || ok) best = { code, cr, ok, consec };
    });
    add('wl', 'World Language', 2, Math.min(best.cr, 2), best.ok, best.code ? LANGS[best.code] + (best.cr >= 2 && !best.consec ? ' — years must be consecutive' : '') : 'Two consecutive years of the same language');
    // PE (athletic season may count)
    const peCourse = recs.some(r => recPE(r));
    const peAth = !peCourse && athleticsPE(state);
    const peLate = recs.some(r => recPE(r) && r.grade === 12) && !recs.some(r => recPE(r) && r.grade <= 11);
    add('pe', 'Physical Education', 0.5, (peCourse || peAth) ? 0.5 : 0, peCourse || peAth,
      peCourse ? (peLate ? 'Must be completed by end of semester 6 (grade 11)' : 'PE course, dance, Freshman Foundations or Study Strategies') : peAth ? 'Counts via a full WA athletic or Marching Band season (verify with Registrar)' : 'PE course, dance, Freshman Foundations, Study Strategies, Marching Band or a full sports season');
    // Fine arts, capstone
    const capRecs = recs.filter(r => r.c && r.c.cap);
    const edPair = recs.some(r => r.id === 'ed1') && recs.some(r => r.id === 'ed2');
    const capMet = capRecs.some(r => r.c.cap === 'S' || r.c.cap === 'Y') || edPair;
    const faRecs = recs.filter(r => recFA(r));
    const faMet = faRecs.length > 0;
    add('fa', 'Fine Arts', 0.5, faMet ? 0.5 : 0, faMet, 'Visual or performing art');
    add('cap', 'Compassion Capstone', 0.5, capMet ? 0.5 : 0, capMet, 'Senior requirement (see capstone course list)');
    // Totals & electives
    let total = recs.reduce((a, r) => a + r.cr, 0);
    if (peAth) total += 0.5;
    const used = Math.min(eng, 4) + Math.min(math, 4) + (civ ? Math.min(ssAll, 3) : ssHave) + Math.min(sci, 4) +
      (best.ok ? 2 : Math.min(best.cr, 2)) + ((peCourse || peAth) ? 0.5 : 0) + (faMet ? 0.5 : 0) + (capMet ? 0.5 : 0);
    const elec = Math.max(0, total - used);
    add('elec', 'Electives', 3.5, Math.min(elec, 3.5), elec >= 3.5, 'Core or non-core electives');
    add('total', 'Total Credits', 22, Math.min(total, 22), total >= 22, '22 units minimum', { raw: total });
    const trackerAreas = A.map(a => Object.assign(a, { status: a.met ? 'done' : a.have > 0 ? 'part' : 'none', pct: Math.min(100, Math.round(100 * a.have / a.req)) }));

    // GHSA checkpoints (credits earned by end of each grade)
    const cum = {}; let run = 0;
    const msPs = recs.filter(r => r.id === 'ms_ps').reduce((a, r) => a + r.cr, 0);
    GRADES.forEach(g => { run += recs.filter(r => r.id !== 'ms_ps' && r.grade === g).reduce((a, r) => a + r.cr, 0) + (g === 9 ? msPs + recs.filter(r => r.id !== 'ms_ps' && r.grade === 8).reduce((a, r) => a + r.cr, 0) : 0); cum[g] = Math.round(run * 100) / 100; });
    const ghsa = [[9, 5], [10, 11], [11, 17]].map(([g, need]) => ({ grade: g, need, have: cum[g], met: cum[g] >= need }));

    // HOPE rigor and NCAA core
    const rigor = recs.filter(r => r.c && isRigor(r.c, r.lv)).length;
    const ncaa = ncaaCore(recs);
    return { areas: trackerAreas, cum, ghsa, rigor: { have: rigor, need: 4, met: rigor >= 4 }, ncaa, total };
  }
  function isRigor(c, lv) {
    if (c.r === true) return true; if (c.r === false || c.r === undefined) return c.lv.includes('AP') && lv === 'AP' && c.dept !== 'x';
    if (Array.isArray(c.r)) return c.r.includes(lv); return c.r === lv;
  }
  function ncaaCredit(r) {
    const c = r.c; if (!c || !['eng', 'math', 'ss', 'sci', 'wl'].includes(c.dept) && c.n === undefined) return 0;
    if (c.n === undefined) return 0; if (c.nl && c.nl[r.lv] !== undefined) return c.nl[r.lv]; return c.n === true ? c.cr : c.n;
  }
  function ncaaCore(recs) {
    const b = { eng: 0, math: 0, sci: 0, ss: 0, wl: 0, other: 0 };
    recs.forEach(r => { const n = ncaaCredit(r); if (!n) return; if (b[r.c.dept] !== undefined) b[r.c.dept] += n; else b.other += n; });
    const e = Math.min(b.eng, 4), m = Math.min(b.math, 3), s = Math.min(b.sci, 2), ss = Math.min(b.ss, 2);
    const lo = (b.eng - e) + (b.math - m) + (b.sci - s);
    const addl1 = Math.min(1, lo);
    const addl4 = Math.min(4, (lo - addl1) + (b.ss - ss) + b.wl + b.other);
    const total = e + m + s + ss + addl1 + addl4;
    const r2 = x => Math.round(x * 100) / 100;
    return { total: r2(total), parts: [['English', r2(e), 4], ['Math', r2(m), 3], ['Science', r2(s), 2], ['Add’l Eng/Math/Sci', r2(addl1), 1], ['Social Science', r2(ss), 2], ['Add’l (incl. language)', r2(addl4), 4]], met: total >= 16 };
  }

  /* ---------- assemble hard problems & approvals for submit ---------- */
  function problems(state) {
    const errs = [], approvals = [];
    const v = validateSelections(state);
    Object.values(v).forEach(x => {
      if (x.state === 'blocked') errs.push(x.course + ' (grade ' + x.grade + ') — ' + x.blockedReason);
      (x.approvals || []).forEach(a => approvals.push({ grade: x.grade, course: x.course, note: a }));
    });
    const lc = loadChecks(state);
    GRADES.forEach(g => lc[g].forEach(c => { if (c.lvl === 'error') errs.push('Grade ' + g + ': ' + c.text); }));
    const tr = tracker(state);
    tr.areas.forEach(a => { if (!a.met) errs.push(a.label + ' requirement not met (' + a.have + ' of ' + a.req + ')'); });
    return { errs, approvals: dedupe(approvals), tracker: tr, validation: v, load: lc };
  }
  function dedupe(arr) { const seen = new Set(); return arr.filter(a => { const k = a.grade + a.course + a.note; if (seen.has(k)) return false; seen.add(k); return true; }); }

  /* ---------- display helpers used by UI and the Google Doc payload ---------- */
  function cellText(state, g, slotKey) {
    const cell = state.plan[g][slotKey]; const f = parseSel(cell.f), s = parseSel(cell.s);
    if (f && f.c.t === 'Y') return [courseLabel(f.c, f.lv)];
    const out = [];
    if (f) out.push('Fall: ' + courseLabel(f.c, f.lv));
    if (s) out.push('Spring: ' + courseLabel(s.c, s.lv));
    return out;
  }
  function summerText(state, g) {
    return SUMMER_SLOTS.map(s => parseSel(state.summer[g][s.k])).filter(Boolean).map(x => courseLabel(x.c, x.lv));
  }

  WA.engine = { GRADES, CORE_SLOTS, ELEC_SLOTS, SUMMER_SLOTS, ALL_SLOTS, emptyState, parseSel, courseLabel, optionsFor, optionStatus,
    validateSelections, loadChecks, tracker, problems, cellText, summerText, allTaken, priorRecords, T };
  if (typeof module !== 'undefined') module.exports = WA.engine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
