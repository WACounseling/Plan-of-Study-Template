/* Plan file format shared by the Family Planner and the Counselor Planner.
 *   wa-path-plan      one plan  (what a family gives their counselor; the counselor tool can import it)
 *   wa-family-plans   up to three plans (what a family saves to reopen later)
 * Everything read from a file is re-validated: unknown courses, odd values and oversized text are dropped. */
(function (root) {
  const WA = root.WA = root.WA || {};
  (WA.versions = WA.versions || {})['planio.js'] = '4';
  const CAT = WA.catalog || require('./catalog.js');
  const DIST = WA.distinctions || require('./distinctions.js');
  const MKEYS = new Set(DIST.manualKeys());
  const GR = [9, 10, 11, 12], SLOTS = ['eng', 'math', 'ss', 'sci', 'wl', 'e1', 'e2', 'e3'], SUM = ['su1', 'su2'];
  const MATH = ['none', 'alg1', 'alg1hp', 'geohp'], LANGV = [''].concat(['fr', 'sp', 'de', 'ja', 'zh'].reduce((a, c) => a.concat([1, 2, 3, 4].map(n => c + ':' + n)), []));
  const AREAS = ['eng', 'math', 'ss', 'sci', 'wl', 'pe', 'fa', 'elec'], WHEN = ['8', '9', '10', '11', '12', 's9', 's10', 's11'];
  const MAXBYTES = 1000000;
  const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
  const course = v => { if (typeof v !== 'string' || !v) return null; const [id, lv] = v.split('|'); const c = CAT.by[id]; return c && c.lv.includes(lv || '') ? c : null; };
  const sel = v => (course(v) ? v : '');

  function sanitizeDist(d) {
    d = d && typeof d === 'object' ? d : {}; const interest = {}, checks = {};
    DIST.IDS.forEach(id => { if (d.interest && d.interest[id]) interest[id] = true; });
    Object.keys(d.checks && typeof d.checks === 'object' ? d.checks : {}).forEach(k => { if (MKEYS.has(k) && d.checks[k]) checks[k] = true; });
    return { interest, checks };
  }
  function sanitizePlan(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const out = { name: str(raw.name, 40) || 'My plan', classOf: /^20\d\d$/.test(String(raw.classOf)) ? String(raw.classOf) : '', plan: {}, summer: {}, prior: {}, cocurr: [], notes: str(raw.notes, 2000).replace(/\u0000/g, ''), colleges: str(raw.colleges, 240), major: str(raw.major, 240) };
    GR.forEach(g => {
      out.plan[g] = {}; out.summer[g] = {};
      SLOTS.forEach(k => {
        const c = (raw.plan && raw.plan[g] && raw.plan[g][k]) || {};
        let f = sel(c.f), s = sel(c.s);
        const fc = course(f), sc = course(s);
        if (!fc || !['Y', 'F', 'E'].includes(fc.t)) f = '';
        if (!sc || !['S', 'E'].includes(sc.t)) s = '';
        if (f && course(f).t === 'Y') s = '';
        out.plan[g][k] = { f, s };
      });
      SUM.forEach(k => { const v = sel(raw.summer && raw.summer[g] && raw.summer[g][k]); const c = course(v); out.summer[g][k] = c && c.t === 'SU' && g < 12 ? v : ''; });
    });
    const p = raw.prior && typeof raw.prior === 'object' ? raw.prior : {};
    out.prior = {
      psCredit: [0, 0.5, 1].includes(+p.psCredit) ? +p.psCredit : 0, civics8: !!p.civics8, msMath: MATH.includes(p.msMath) ? p.msMath : 'alg1',
      msLang: LANGV.includes(p.msLang) ? p.msLang : '', placement: !!p.placement,
      transfers: (Array.isArray(p.transfers) ? p.transfers : []).slice(0, 20).map(t => {
        t = t && typeof t === 'object' ? t : {}; const cr = Math.round(+t.cr * 2) / 2;
        return { title: str(t.title, 60), equiv: sel(t.equiv), area: AREAS.includes(t.area) ? t.area : 'elec', lang: CAT.LANGS[t.lang] ? t.lang : 'fr', cr: cr >= 0.5 && cr <= 8 ? cr : 1, when: WHEN.includes(String(t.when)) ? String(t.when) : '9' };
      })
    };
    out.dist = sanitizeDist(raw.dist);
    out.cocurr = (Array.isArray(raw.cocurr) ? raw.cocurr : []).slice(0, 40).map(c => ({ name: str(c && c.name, 100), status: c && c.status === 'interest' ? 'interest' : 'active' })).filter(c => c.name);
    return out;
  }
  const stamp = () => new Date().toISOString();
  function exportOne(plan, classOf) { return { format: 'wa-path-plan', v: 1, app: 'Woodward Academy Family Planner', savedAt: stamp(), plan: sanitizePlan(Object.assign({}, plan, { classOf })) }; }
  function exportAll(S) { return { format: 'wa-family-plans', v: 1, app: 'Woodward Academy Family Planner', savedAt: stamp(), classOf: /^20\d\d$/.test(String(S.classOf)) ? String(S.classOf) : '', cur: Math.min(2, Math.max(0, +S.cur || 0)), plans: S.plans.slice(0, 3).map(p => sanitizePlan(Object.assign({}, p, { classOf: S.classOf }))) }; }
  function parse(text) {
    if (typeof text !== 'string' || text.length > MAXBYTES) throw new Error('That file is too large to be a plan file.');
    let o; try { o = JSON.parse(text); } catch (e) { throw new Error('That file is not a Woodward Academy plan file.'); }
    if (o && o.format === 'wa-path-plan' && o.plan) return { kind: 'one', plan: sanitizePlan(o.plan) };
    if (o && o.format === 'wa-family-plans' && Array.isArray(o.plans)) {
      return { kind: 'all', classOf: /^20\d\d$/.test(String(o.classOf)) ? String(o.classOf) : '', cur: Math.min(2, Math.max(0, +o.cur || 0)), plans: o.plans.slice(0, 3).map(sanitizePlan) };
    }
    if (o && o.info && o.plan) throw new Error('This looks like a counselor draft file, which this planner cannot open.');
    throw new Error('That file is not a Woodward Academy plan file.');
  }
  WA.planio = { sanitizeDist, sanitizePlan, exportOne, exportAll, parse };
  if (typeof module !== 'undefined') module.exports = WA.planio;
})(typeof globalThis !== 'undefined' ? globalThis : this);
