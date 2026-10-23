/* Woodward Academy Upper School course catalog — 2026-2027 Scheduling & Curriculum Guide.
 *
 * Field key
 *  id/name/dept   dept: eng math ss sci wl cs pa va pe deb jr ls
 *  lv             levels offered (CP EP HP AP) — each becomes its own dropdown option
 *  t              Y year-long | F fall only | S spring only | E either semester | SU summer
 *  g / ga         grades offered / grades offered only with approval ; sg = summer follows these grades
 *  pre            HARD prerequisite (course is locked until met)
 *  soft           prerequisite the guide lets a chair waive -> course stays available, flagged "approval"
 *  ap / apl       permission/audition note (all levels / per level)   prl = per-level override of pre
 *  rep            repeatable     nocr = no credit       nsci = not counted toward science requirement
 *  req            counts toward a named requirement (eng, ss:govecon, ss:mwh, ss:ushist)
 *  fa / pe / cap  fine-arts / PE / capstone ('S' semester satisfies, 'Y' year-long satisfies, 'ED' needs pair)
 *  n / r          NCAA-approved credit (number) / HOPE rigor (true | [levels])
 * Prerequisite expressions:  'fam'  completed earlier   'fam:HP' exact level   'fam:EP+' at/above level
 *                            '~fam' completed earlier OR taken at the same time
 *                            'prof:flag' student-background flag   {all:[..]} {any:[..]}
 */
(function (root) {
  const D = [];
  const A = (...x) => ({ all: x }), O = (...x) => ({ any: x });
  function C(id, name, dept, lv, t, g, o) {
    const c = Object.assign({ id, name, dept, lv: lv ? lv.split('/') : [''], t, g: g || [], fam: id }, o || {});
    if (c.cr === undefined) c.cr = t === 'Y' ? 1 : 0.5;
    D.push(c);
  }
  const ALL = [9, 10, 11, 12], UP = [10, 11, 12], SR = [11, 12];

  /* ---------------- ENGLISH ---------------- */
  C('eng1', 'English 1', 'eng', 'CP/EP/HP', 'Y', [9], { req: 'eng', n: 1, r: false });
  C('eng2', 'English 2', 'eng', 'CP/EP/HP', 'Y', [10], { pre: 'eng1', req: 'eng', n: 1 });
  C('eng3', 'English 3', 'eng', 'CP/EP/HP', 'Y', [11], { pre: 'eng2', req: 'eng', n: 1 });
  C('aplang11', 'AP English Language & Composition', 'eng', 'AP', 'Y', [11], { fam: 'aplang', pre: 'eng2', soft: 'eng2:HP', ap: 'Dept Chair permission or superior completion of English 2 HP', req: 'eng', n: 1, r: true });
  C('eng4', 'English 4 — Literary Types', 'eng', 'CP/EP', 'Y', [12], { fam: 'eng4', pre: O('eng3', 'aplang'), req: 'eng', n: 1 });
  C('eng4hp', 'English 4 — Contemporary Drama', 'eng', 'HP', 'Y', [12], { fam: 'eng4', pre: O('eng3', 'aplang'), soft: O('eng3:HP', 'aplang'), ap: 'Eng 3 HP or AP Lang, or Chair permission + 3EP teacher recommendation', req: 'eng', n: 1 });
  C('aplang12', 'AP English Language & Composition', 'eng', 'AP', 'Y', [12], { fam: 'aplang', pre: 'eng3', soft: 'eng3:HP', ap: 'English 3 HP or Dept Chair permission', req: 'eng', n: 1, r: true });
  C('aplit', 'AP English Literature & Composition', 'eng', 'AP', 'Y', [12], { pre: O('eng3', 'aplang'), soft: 'aplang', ap: 'AP Lang (11th) or Dept Chair permission', req: 'eng', n: 1, r: true });
  C('contlit', 'Contemporary Literature', 'eng', 'EP', 'Y', [9], { ga: [10, 11], ap: 'Placement by Reading Specialist, Chair & teacher', n: 1 });
  C('mcl', 'Multicultural Literature', 'eng', 'EP', 'E', [9], { ga: [10, 11], ap: 'Placement by Reading Specialist, Chair & teacher', n: 0.5 });
  C('ww', 'Writers Workshop', 'eng', 'CP/EP', 'Y', [11], { ap: 'Required for juniors who have not shown satisfactory writing; taken in addition to English 3', n: 0 });
  C('cw1', 'Creative Writing 1', 'eng', 'EP/HP', 'F', UP, { ap: 'Permission of Creative Writing teacher & Dept Chair', n: 0.5 });
  C('cw2', 'Creative Writing 2', 'eng', 'EP/HP', 'S', UP, { ap: 'Permission of Creative Writing teacher & Dept Chair', n: 0.5 });
  C('cw3', 'Creative Writing 3', 'eng', 'HP', 'F', SR, { pre: O('cw1', 'cw2'), ap: 'Permission of teacher & Chair; may not be offered every year', n: 0.5 });
  C('cw4', 'Creative Writing 4', 'eng', 'HP', 'S', SR, { pre: O('cw2', 'cw3'), ap: 'Permission of teacher & Chair; may not be offered every year', n: 0.5 });

  /* ---------------- MATHEMATICS ---------------- */
  C('alg1', 'Algebra 1', 'math', 'CP/EP', 'Y', [9], { n: 1 });
  C('geo', 'Geometry', 'math', 'CP/EP', 'Y', [9, 10], { pre: 'alg1', n: 1 });
  C('geohp', 'Geometry', 'math', 'HP', 'Y', [9, 10], { fam: 'geo', pre: 'alg1', n: 1 });
  C('alg2', 'Algebra 2', 'math', 'CP/EP', 'Y', [9, 10, 11], { pre: 'geo', n: 1, nl: { CP: 0.5 }, r: true });
  C('alg2hp', 'Algebra 2', 'math', 'HP', 'Y', [9, 10, 11], { fam: 'alg2', pre: O('geo', 'prof:msAlg1HP'), n: 1, r: true });
  C('analysis', 'Analysis', 'math', 'HP', 'Y', [9, 10], { ap: 'Department Chair placement (the GAT HP pathway is no longer offered)', n: 1, r: true });
  C('stat_cp', 'Statistics', 'math', 'CP', 'Y', SR, { fam: 'stat', pre: 'alg2', n: 1, r: true });
  C('cat_cp', 'College Algebra & Trigonometry', 'math', 'CP', 'Y', [12], { pre: 'alg2', n: 0.5, r: true });
  C('pcalg', 'Pre-Calculus with Algebra', 'math', 'EP', 'Y', SR, { pre: 'alg2', soft: 'alg2:EP+', ap: 'Alg 2 CP needs Dept Chair approval', n: 0.68, r: true });
  C('pctrig', 'Pre-Calculus with Trigonometry', 'math', 'EP', 'F', [12], { pre: 'pcalg', n: 0.34, r: true });
  C('pctrig_su', 'Pre-Calculus with Trigonometry (Summer)', 'math', 'EP', 'SU', [], { fam: 'pctrig', sg: [11], cr: 0.5, pre: 'pcalg', ap: 'Rising seniors; Summer Semester forward credit', n: 0.34, r: true });
  C('pcalc', 'Pre-Calculus', 'math', 'EP/HP', 'Y', [10, 11, 12], { pre: 'alg2:EP+', n: 1, r: true });
  C('calc_ep', 'Calculus', 'math', 'EP', 'E', [12], { pre: O('pcalc', 'pctrig'), ap: 'Pre-Calc with Algebra alone does NOT meet the prerequisite', n: 0.5, r: true });
  C('stat_ep', 'Statistics', 'math', 'EP', 'E', [12], { fam: 'stat', pre: O('pcalc', 'pcalg'), excl: ['apstat'], n: 0.5, r: true });
  C('discrete', 'Discrete Mathematics 2', 'math', 'EP', 'S', [12], { pre: O('pcalc', 'pctrig'), n: 0.5, r: true });
  C('apstat', 'AP Statistics', 'math', 'AP', 'Y', UP, { pre: O('~analysis', '~pcalc:HP+', '~apcalcab', '~apcalcbc', 'pcalc:EP'), soft: O('~analysis', '~pcalc:HP+', '~apcalcab'), ap: 'EP students: Pre-Calc EP + Dept Chair permission', n: 1, r: true });
  C('apcalcab', 'AP Calculus AB', 'math', 'AP', 'Y', UP, { pre: O('pcalc', 'analysis'), soft: O('pcalc:HP+', 'analysis'), ap: 'Pre-Calc HP, or superior Pre-Calc EP + Chair permission', n: 1, r: true });
  C('apcalcbc', 'AP Calculus BC', 'math', 'AP', 'Y', SR, { pre: 'apcalcab', ap: 'AP Calculus AB + Dept Chair permission', n: 1, r: true });
  C('geo_su', 'Geometry (Summer)', 'math', 'CP/EP', 'SU', [], { fam: 'geo', sg: [9], cr: 1, pre: 'alg1', ap: 'Algebra 1 taken in the Upper School; Summer Semester forward credit', n: 1 });

  /* ---------------- SOCIAL STUDIES ---------------- */
  C('govecon', 'U.S. Government / Economics', 'ss', 'CP/EP', 'Y', [9], { req: 'ss:govecon', n: 1 });
  C('mwh', 'Modern World History', 'ss', 'CP/EP/HP', 'Y', [10], { ga: [9], pre: O('govecon', 'prof:civics8'), req: 'ss:mwh', n: 1, ap: 'Grade 9 only if HP Civics was taken in 8th grade' });
  C('ushist', 'United States History', 'ss', 'CP/EP/HP', 'Y', [10, 11], { pre: A(O('govecon', 'prof:civics8'), 'mwh'), req: 'ss:ushist', n: 1 });
  C('apush', 'AP United States History', 'ss', 'AP', 'Y', UP, { fam: 'ushist', pre: A(O('govecon', 'prof:civics8'), 'mwh'), req: 'ss:ushist', n: 1, r: true });
  const SSE = { pre: '~ushist', n: 0.5 };
  C('gs_me', 'Global Studies: History of the Middle East', 'ss', 'EP/HP', 'F', SR, Object.assign({ cap: 'S' }, SSE, { ap: 'Seniors have precedence' }));
  C('gs_ea', 'Global Studies: History of East Asia', 'ss', 'EP/HP', 'S', SR, Object.assign({ cap: 'S' }, SSE, { ap: 'Seniors have precedence' }));
  C('gs_af', 'Global Studies: African Studies', 'ss', 'EP/HP', 'E', [12], Object.assign({ ga: [11], cap: 'S' }, SSE));
  C('uspe', 'U.S. Political Economy', 'ss', 'EP/HP', 'E', [12], Object.assign({ ga: [11], cap: 'S' }, SSE));
  C('wr', 'World Religions', 'ss', 'EP/HP', 'E', [12], Object.assign({ ga: [11], cap: 'S' }, SSE));
  C('lsc', 'Landmark Supreme Court Cases: Civil Liberties', 'ss', 'EP/HP', 'E', [12], Object.assign({ ga: [11], cap: 'S' }, SSE));
  C('dij', 'Dilemmas in Justice', 'ss', 'EP/HP', 'F', [12], Object.assign({ ga: [11], cap: 'S' }, SSE));
  C('pf', 'Personal Finance', 'ss', 'EP', 'E', SR, SSE);
  const APS = { pre: A(O('govecon', 'prof:civics8'), 'mwh', '~ushist:HP+'), ap: 'Prereq per guide: HP US History; corequisite AP US History — confirm with Social Studies Chair', n: 1, r: true };
  C('apeuro', 'AP European History', 'ss', 'AP', 'Y', SR, APS);
  C('apgov', 'AP U.S. Government & Politics', 'ss', 'AP', 'Y', SR, APS);
  C('apmicro', 'AP Microeconomics', 'ss', 'AP', 'Y', SR, APS);
  C('apmacro', 'AP Macroeconomics', 'ss', 'AP', 'Y', SR, APS);

  /* ---------------- SCIENCE ---------------- */
  C('bio', 'Biology', 'sci', 'CP/EP', 'Y', [9], { n: 1 });
  C('biohp', 'Biology', 'sci', 'HP', 'Y', [9], { fam: 'bio', ap: 'Dept Chair permission', n: 1, r: true });
  C('chem', 'Chemistry', 'sci', 'CP/EP/HP', 'Y', [10, 11], { pre: 'bio', n: 1, r: true, apl: { HP: 'Dept Chair permission' } });
  C('chem_su', 'Chemistry (Summer)', 'sci', 'CP', 'SU', [], { fam: 'chem', sg: [9], cr: 1, pre: 'bio', ap: 'Dept Chair approval; intended for CP Algebra 1 + CP Biology students — no science in 10th grade', n: 1, r: true });
  C('physcp', 'Physics', 'sci', 'CP', 'Y', SR, { fam: 'phys', pre: A('bio', 'chem'), n: 1, r: true });
  C('physep', 'Physics', 'sci', 'EP', 'Y', SR, { fam: 'phys', pre: A('bio', 'chem', '~alg2'), n: 1, r: true });
  C('ap1', 'AP Physics 1', 'sci', 'AP', 'Y', SR, { fam: 'phys', pre: A('bio', 'chem', '~alg2'), ap: 'Dept Chair permission', n: 1, r: true });
  C('apc', 'AP Physics C', 'sci', 'AP', 'Y', [12], { pre: A('bio', 'chem', 'phys', O('~apcalcab', '~apcalcbc')), ap: 'Dept Chair permission', n: 1, r: true });
  C('anat', 'Anatomy & Physiology', 'sci', 'EP', 'Y', SR, { pre: A('bio', 'chem'), n: 1, r: true });
  C('forensics', 'Criminal Investigation, Forensics & Biotechnology', 'sci', 'EP', 'Y', SR, { pre: A('bio', 'chem'), ap: 'Dept Chair approval', n: 1, r: true });
  C('astro_cp', 'Astronomy', 'sci', 'CP', 'Y', SR, { pre: A('bio', 'chem', '~phys'), n: 1, r: true });
  C('astro_ep', 'Astronomy', 'sci', 'EP', 'F', SR, { pre: A('bio', 'chem', '~phys'), n: 0.5, r: true });
  C('meteo', 'Meteorology', 'sci', 'EP', 'S', SR, { pre: A('bio', 'chem', '~phys'), n: 0.5, r: true });
  C('env_cp', 'Environmental Science', 'sci', 'CP', 'Y', SR, { fam: 'env', pre: A('bio', 'chem'), n: 1 });
  C('env_ep', 'Environmental Science', 'sci', 'EP', 'Y', SR, { fam: 'env', pre: A('bio', 'chem'), n: 1 });
  C('apes', 'AP Environmental Science', 'sci', 'AP', 'Y', UP, { fam: 'env', pre: A('bio', 'chem'), ap: 'Dept Chair permission; summer assignment', n: 1, r: true });
  C('apbio', 'AP Biology', 'sci', 'AP', 'Y', UP, { pre: A('bio', 'chem'), ap: 'Dept Chair permission', n: 1, r: true });
  C('apchem', 'AP Chemistry', 'sci', 'AP', 'Y', UP, { pre: A('bio', 'chem'), ap: 'Dept Chair permission', n: 1, r: true });
  C('isr', 'Independent Science Research', 'sci', 'HP', 'Y', [12], { pre: A('bio', 'chem', '~phys'), ap: 'Chair permission; lab research position secured by end of junior year', cap: 'Y', n: 1, r: true });
  C('trop', 'Tropical Ecology Field Study (Costa Rica, Summer)', 'sci', 'EP/HP', 'SU', [], { sg: [10, 11], cr: 0.5, pre: A('bio', 'chem'), ap: 'Dept Chair approval; additional cost', n: 0.5 });

  /* ---------------- WORLD LANGUAGES ---------------- */
  const L1 = [9, 10], LN = ALL;
  const lvlPre = (lang, n) => O(lang + (n - 1), 'prof:placement');
  function lang(code, name, spec) {
    spec.forEach(s => {
      const [lvn, lvls, extra] = s;
      const fam = code + lvn;
      const base = Object.assign({ fam, lang: code, lvn, n: 1, r: lvn > 1 }, extra || {});
      if (lvn === 1) { base.ga = [11, 12]; base.ap = 'Seniors/juniors placed only if space permits'; }
      if (lvn > 1 && lvn <= 4) base.pre = lvlPre(code, lvn);
      C(extra && extra.id ? extra.id : fam + (lvls === 'CP' ? 'cp' : ''), name + ' ' + lvn, 'wl', lvls, 'Y', lvn === 1 ? L1 : LN, base);
    });
  }
  lang('fr', 'French', [[1, 'EP/HP'], [2, 'EP/HP'], [3, 'EP/HP'], [4, 'EP/HP']]);
  C('fr4cap', 'Capstone French 4', 'wl', 'HP', 'Y', [12], { fam: 'fr4cap', lang: 'fr', lvn: 4, pre: 'fr3', ap: 'Prereq 3HP with Dept Chair permission', cap: 'Y', n: 1, r: true });
  C('fr5', 'French 5', 'wl', 'HP', 'Y', SR, { ga: [9, 10], lang: 'fr', lvn: 5, pre: O('fr4', 'fr4cap', 'apfr'), n: 1, r: true });
  C('fr5cap', 'Capstone French 5', 'wl', 'HP', 'Y', [12], { fam: 'fr5cap', lang: 'fr', lvn: 5, pre: O('fr4', 'fr4cap', 'apfr'), ap: 'Dept Chair permission', cap: 'Y', n: 1, r: true });
  C('apfr', 'AP French Language & Culture', 'wl', 'AP', 'Y', SR, { ga: [10], lang: 'fr', lvn: 5, pre: 'fr3', soft: O('fr3:HP+', 'fr4:EP+'), ap: '3HP, 4EP/4HP or department approval', n: 1, r: true });
  C('sp1cp', 'Spanish 1', 'wl', 'CP', 'Y', L1, { fam: 'sp1', lang: 'sp', lvn: 1, ga: [11, 12], ap: 'Seniors/juniors placed only if space permits', n: 1 });
  C('sp1', 'Spanish 1', 'wl', 'EP/HP', 'Y', L1, { lang: 'sp', lvn: 1, ga: [11, 12], ap: 'Seniors/juniors placed only if space permits', n: 1 });
  C('sp2cp', 'Spanish 2', 'wl', 'CP', 'Y', [10, 11, 12], { fam: 'sp2', lang: 'sp', lvn: 2, pre: lvlPre('sp', 2), n: 1, r: true });
  C('sp2', 'Spanish 2', 'wl', 'EP/HP', 'Y', LN, { lang: 'sp', lvn: 2, pre: lvlPre('sp', 2), n: 1, r: true });
  C('sp3cp', 'Spanish 3', 'wl', 'CP', 'Y', [10, 11, 12], { fam: 'sp3', lang: 'sp', lvn: 3, pre: lvlPre('sp', 3), n: 1, r: true });
  C('sp3', 'Spanish 3', 'wl', 'EP/HP', 'Y', ALL, { lang: 'sp', lvn: 3, pre: lvlPre('sp', 3), n: 1, r: true });
  C('sp4', 'Spanish 4', 'wl', 'EP/HP', 'Y', UP, { ga: [9], lang: 'sp', lvn: 4, pre: lvlPre('sp', 4), n: 1, r: true });
  C('sp5', 'Spanish 5', 'wl', 'HP', 'Y', SR, { ga: [9, 10], lang: 'sp', lvn: 5, pre: O('sp4', 'apsp'), n: 1, r: true });
  C('sp5cap', 'Capstone Spanish 5', 'wl', 'HP', 'Y', [12], { fam: 'sp5cap', lang: 'sp', lvn: 5, pre: O('sp4', 'apsp'), ap: 'Dept Chair permission', cap: 'Y', n: 1, r: true });
  C('apsp', 'AP Spanish Language & Culture', 'wl', 'AP', 'Y', SR, { ga: [10], lang: 'sp', lvn: 5, pre: 'sp3', soft: O('sp3:HP+', 'sp4:HP+'), ap: '3HP, 4HP or department approval', n: 1, r: true });
  C('apspl', 'AP Spanish Literature & Culture', 'wl', 'AP', 'Y', SR, { ga: [10], lang: 'sp', lvn: 6, pre: 'sp4', soft: 'apsp', ap: 'AP Spanish Language or department approval', n: 1, r: true });
  lang('de', 'German', [[1, 'EP/HP'], [2, 'EP/HP'], [3, 'EP/HP'], [4, 'EP/HP']]);
  C('de5', 'German 5', 'wl', 'EP/HP', 'Y', SR, { ga: [9, 10], lang: 'de', lvn: 5, pre: 'de4', n: 0, r: true, ap: 'NCAA approval pending at time of guide publication' });
  C('apde', 'AP German', 'wl', 'AP', 'Y', SR, { ga: [10], lang: 'de', lvn: 5, pre: 'de3', soft: O('de3:HP+', 'de4:HP+'), ap: '3HP or 4HP and/or department approval', n: 1, r: true });
  lang('ja', 'Japanese', [[1, 'EP/HP'], [2, 'EP/HP'], [3, 'EP/HP']]);
  C('ja4', 'Japanese 4', 'wl', 'HP', 'Y', SR, { ga: [9, 10], lang: 'ja', lvn: 4, pre: 'ja3', n: 1, r: true });
  C('apja', 'AP Japanese', 'wl', 'AP', 'Y', SR, { ga: [10], lang: 'ja', lvn: 5, pre: 'ja3', ap: 'Dept Chair approval required', n: 1, r: true });
  lang('zh', 'Mandarin Chinese', [[1, 'EP/HP'], [2, 'EP/HP'], [3, 'EP/HP'], [4, 'EP/HP']]);
  C('apzh', 'AP Mandarin Chinese', 'wl', 'AP', 'Y', SR, { ga: [10], lang: 'zh', lvn: 5, pre: 'zh3', ap: 'Approval of Chinese teacher & Dept Chair', n: 1, r: true });

  /* ---------------- COMPUTER SCIENCE (only AP counts in Core GPA; none NCAA) ---------------- */
  C('idt', 'Introduction to Digital Technology', 'cs', 'EP/HP', 'E', ALL, { n: 0 });
  C('apcsp', 'AP Computer Science Principles', 'cs', 'AP', 'Y', UP, { soft: O('idt', 'alg2:HP', 'pcalc:HP+', 'analysis'), ap: 'HP Math, Intro to Digital Technology, or Chair permission', r: true });
  C('apcsa', 'AP Computer Science A', 'cs', 'AP', 'Y', UP, { soft: 'apcsp', ap: 'AP CS Principles or Chair permission', r: true });
  C('advrob', 'Advanced Robotics', 'cs', 'HP', 'S', ALL, { rep: 1, ap: 'Prior robotics experience preferred or Chair permission' });
  C('python', 'Python Programming at Tech', 'cs', 'HP', 'F', [12], { ap: 'Dept Chair permission' });
  C('cyber', 'Cybersecurity', 'cs', 'EP/HP', 'F', ALL, {});
  C('indcs', 'Independent Study in Computer Science', 'cs', 'HP', 'E', [12], { rep: 1, ap: 'Dept Chair permission' });
  C('ai', 'Artificial Intelligence', 'cs', 'EP/HP', 'S', ALL, {});
  C('intro_eng', 'Introduction to Applied Science & Engineering', 'cs', 'EP/HP', 'Y', ALL, { pre: O('~geo:EP+', '~alg2', '~pcalc', '~analysis'), ap: 'Corequisite: EP Geometry or more advanced math. Not in Core GPA.' });

  /* ---------------- PERFORMING ARTS (fine arts) ---------------- */
  const PA = { fa: true };
  C('bnd1', 'Concert Fundamentals Winds', 'pa', 'EP', 'Y', ALL, Object.assign({ rep: 1, fam: 'band', ap: 'Audition with Director of Bands' }, PA));
  C('bnd2', 'Concert Winds', 'pa', 'EP/HP', 'Y', ALL, Object.assign({ rep: 1, fam: 'band', ap: 'Audition (HP credit with instructor permission)' }, PA));
  C('bnd3', 'Symphonic Winds', 'pa', 'HP', 'Y', ALL, Object.assign({ rep: 1, fam: 'band', ap: 'Audition with Director of Bands' }, PA));
  C('bndcap', 'Capstone Winds', 'pa', 'HP', 'Y', [12], Object.assign({ soft: 'bnd3', ap: 'Audition; accepted to Symphonic Winds; Administration approval', cap: 'Y' }, PA));
  C('mprod1', 'Introduction to Music Production', 'pa', 'EP', 'F', ALL, PA);
  C('mprod2', 'Advanced Music Production', 'pa', 'HP', 'S', ALL, Object.assign({ pre: 'mprod1', ap: 'Instructor permission' }, PA));
  C('gtr1', 'Beginning/Intermediate Guitar', 'pa', 'EP', 'E', ALL, Object.assign({ rep: 1, fam: 'gtr1', ap: 'Class size limited; priority to older grades' }, PA));
  C('gtr2', 'Intermediate/Advanced Guitar', 'pa', 'HP', 'E', ALL, Object.assign({ rep: 1, pre: 'gtr1', ap: 'Instructor permission' }, PA));
  C('orch1', 'Chamber Orchestra', 'pa', 'EP/HP', 'Y', ALL, Object.assign({ rep: 1, ap: 'Audition & instructor permission' }, PA));
  C('phil', 'Philharmonia', 'pa', 'HP', 'Y', ALL, Object.assign({ rep: 1, ap: 'Audition & instructor permission' }, PA));
  C('strm', 'String Machine', 'pa', 'HP', 'Y', ALL, Object.assign({ rep: 1, ap: 'Audition & instructor permission' }, PA));
  C('orchcap', 'Capstone Orchestra', 'pa', 'HP', 'Y', [12], Object.assign({ soft: O('phil', 'strm'), ap: 'Audition; Administration approval', cap: 'Y' }, PA));
  C('chor', 'Choraliers', 'pa', 'EP/HP', 'Y', [9, 10], Object.assign({ rep: 1, ap: 'Audition' }, PA));
  C('fest', 'Festival Singers', 'pa', 'EP/HP', 'Y', SR, Object.assign({ rep: 1, ap: 'Audition' }, PA));
  C('chorcap', 'Capstone Choir', 'pa', 'EP/HP', 'Y', [12], Object.assign({ soft: 'fest', ap: 'Audition into Festival Singers; Administration approval', cap: 'Y' }, PA));
  C('apmt', 'AP Music Theory', 'pa', 'AP', 'Y', SR, Object.assign({ ap: 'Music faculty recommendation; concurrent chorus/band/strings', r: true }, PA));
  C('dn1', 'Beginning Dance', 'pa', 'EP', 'Y', ALL, Object.assign({ rep: 1, pe: true, ap: 'Instructor permission' }, PA));
  C('dn2', 'Intermediate Dance', 'pa', 'EP', 'Y', ALL, Object.assign({ rep: 1, pe: true, ap: 'Instructor permission' }, PA));
  C('dn3', 'Advanced Dance', 'pa', 'HP', 'Y', ALL, Object.assign({ rep: 1, pe: true, ap: 'Audition & instructor permission' }, PA));
  C('dncap', 'Capstone Dance', 'pa', 'EP/HP', 'Y', [12], Object.assign({ soft: O('dn2', 'dn3'), ap: 'Audition; Administration approval', cap: 'Y' }, PA));
  C('dfep', 'Dance Fitness (Fine Arts)', 'pa', 'EP', 'E', ALL, Object.assign({ rep: 1 }, PA));
  C('act1', 'Beginning Acting', 'pa', 'EP', 'E', ALL, PA);
  C('act2', 'Advanced Acting', 'pa', 'EP/HP', 'Y', UP, Object.assign({ pre: 'act1', prl: { HP: A('act1', O('ens', '~ens')) }, ap: 'HP: Performance Ensemble + permission' }, PA));
  C('ttp', 'Topics in Theatre: Performance', 'pa', 'HP', 'E', ALL, Object.assign({ rep: 1, rep: 1 }, PA));
  C('ens', 'Performance Ensemble', 'pa', 'HP', 'Y', SR, Object.assign({ rep: 1, pre: 'act2', ap: 'Audition and/or permission' }, PA));
  C('enscap', 'Capstone Theatre: Performance Ensemble', 'pa', 'HP', 'Y', [12], Object.assign({ soft: 'ens', ap: 'Audition; Administration approval', cap: 'Y' }, PA));
  C('ttt', 'Topics in Theatre: Tech', 'pa', 'HP', 'E', ALL, Object.assign({ rep: 1, rep: 1 }, PA));
  C('stage', 'Introduction to Stagecraft', 'pa', 'EP', 'E', ALL, PA);
  C('ptd', 'Principles of Theatrical Design', 'pa', 'HP', 'Y', SR, Object.assign({ rep: 1, pre: 'stage' }, PA));
  C('ptdcap', 'Capstone Technical Theatre: Principles of Theatrical Design', 'pa', 'HP', 'Y', [12], Object.assign({ soft: 'ptd', ap: 'Audition; Administration approval', cap: 'Y' }, PA));
  C('bcast1', 'Intro to Broadcast & Video Production', 'pa', 'EP', 'E', ALL, PA);
  C('bcast2', 'Advanced Broadcast', 'pa', 'HP', 'E', UP, Object.assign({ pre: 'bcast1', rep: 1 }, PA));
  C('film1', 'Film Studies', 'pa', 'EP', 'E', ALL, Object.assign({ ap: 'Instructor permission' }, PA));
  C('film2', 'Introduction to Film', 'pa', 'EP', 'E', ALL, Object.assign({ ap: 'Instructor permission' }, PA));
  C('film3', 'Advanced Film', 'pa', 'HP', 'Y', UP, Object.assign({ pre: A('film1', 'film2') }, PA));
  C('indpa', 'Independent Study in Performing Art', 'pa', 'HP', 'Y', [12], Object.assign({ ap: 'Instructor & Dept Chair permission' }, PA));

  /* ---------------- VISUAL ARTS (fine arts; max 2 semesters of visual art per year) ---------------- */
  const VA = { fa: true, art: true };
  const va = (id, name, lv, t, g, o) => C(id, name, 'va', lv, t, g, Object.assign({}, VA, o || {}));
  va('ds1', 'Design Studio 1', 'EP', 'F', ALL); va('ds2', 'Design Studio 2', 'EP', 'S', ALL, { pre: 'ds1' });
  va('dr1', 'Drawing 1', 'EP', 'F', ALL); va('dr2', 'Drawing 2', 'EP', 'S', ALL, { pre: 'dr1' });
  va('sc1', 'Sculpture 1', 'EP', 'F', ALL); va('sc2', 'Sculpture 2', 'EP', 'S', ALL, { pre: 'sc1' });
  va('fib1', 'Fiber Arts 1', 'EP', 'F', ALL); va('fib2', 'Fiber Arts 2', 'EP', 'S', ALL, { pre: 'fib1' });
  va('pn1', 'Painting 1', 'EP', 'F', UP, { pre: A('dr1', 'dr2') }); va('pn2', 'Painting 2', 'EP', 'S', UP, { pre: 'pn1' });
  va('ph1', 'Photography 1 (35mm film camera required)', 'EP', 'F', UP); va('ph2', 'Photography 2', 'EP', 'S', UP, { pre: 'ph1', ap: 'Instructor & Dept Chair permission' });
  va('jw1', 'Jewelry Design 1', 'EP', 'F', UP); va('jw2', 'Jewelry Design 2', 'EP', 'S', UP, { pre: 'jw1' });
  va('cer1', 'Ceramics 1', 'EP', 'F', ALL); va('cer2', 'Ceramics 2', 'EP', 'S', ALL, { pre: 'cer1' });
  va('advsc', 'Advanced Sculpture', 'HP', 'Y', SR, { pre: A('sc1', 'sc2', 'cer1', 'cer2'), ap: 'Instructor & Dept Chair permission' });
  va('advsc2', 'Advanced Sculpture 2', 'HP', 'Y', [12], { pre: 'advsc', ap: 'Instructor & Dept Chair permission' });
  va('advpn', 'Advanced Painting', 'HP', 'Y', SR, { pre: A('pn1', 'pn2'), ap: 'Written permission of instructor & Chair' });
  va('advpn2', 'Advanced Painting 2', 'HP', 'Y', [12], { pre: 'advpn', ap: 'Written permission of instructor & Chair' });
  va('advph', 'Advanced Photography', 'HP', 'Y', SR, { pre: A('ph1', 'ph2'), ap: 'Instructor & Dept Chair permission' });
  va('advph2', 'Advanced Photography 2', 'HP', 'Y', [12], { pre: 'advph', ap: 'Instructor & Dept Chair permission' });
  va('advjw', 'Advanced Jewelry Design', 'HP', 'Y', SR, { pre: A('jw1', 'jw2'), ap: 'Instructor & Dept Chair permission' });
  va('advjw2', 'Advanced Jewelry Design 2', 'HP', 'Y', [12], { pre: 'advjw', ap: 'Instructor & Dept Chair permission' });
  va('advcer', 'Advanced Ceramics', 'HP', 'Y', SR, { pre: A('cer1', 'cer2'), ap: 'Also 1 semester of another visual art; instructor & Chair permission' });
  va('advcer2', 'Advanced Ceramics 2', 'HP', 'Y', SR, { pre: 'advcer', ap: 'Written permission of instructor & Chair' });
  va('indva', 'Independent Study in Visual Art', 'HP', 'E', [12], { rep: 1, ap: 'Instructor & Dept Chair permission' });
  C('ed1', 'Ethical Dilemmas & Decision Making 1', 'va', 'EP', 'F', [12], { fa: true, ga: [11], cap: 'ED', ap: 'Capstone when taken with Ethical Dilemmas 2' });
  C('ed2', 'Ethical Dilemmas & Decision Making 2', 'va', 'EP', 'S', [12], { fa: true, ga: [11], cap: 'ED', pre: 'ed1', ap: 'Capstone when taken with Ethical Dilemmas 1' });

  /* ---------------- PHYSICAL EDUCATION ---------------- */
  C('pcs', 'Physical Conditioning for Sports', 'pe', 'CP', 'E', ALL, { pe: true, rep: 1 });
  C('dfcp', 'Dance Fitness (PE)', 'pe', 'CP', 'E', ALL, { pe: true, rep: 1 });

  /* ---------------- DEBATE ---------------- */
  C('debate', 'Debate', 'deb', 'EP/HP', 'F', [9], { ga: UP, ap: 'Grade 9 has priority; 10–12 if space permits' });
  C('idebate', 'Intermediate Debate', 'deb', 'HP', 'S', [9], { ga: UP, pre: 'debate', ap: 'Must be taken the same year as Debate' });
  C('adebate', 'Advanced Debate', 'deb', 'HP', 'Y', ALL, { pre: 'idebate', rep: 1, ap: 'Instructor permission' });
  C('capdebate', 'Capstone Debate', 'deb', 'HP', 'Y', [12], { ga: [11], pre: 'idebate', cap: 'Y', ap: 'Instructor permission' });

  /* ---------------- JOURNALISM & PUBLICATIONS ---------------- */
  C('intro_j', 'Introduction to Journalism', 'jr', 'EP/HP', 'F', [9], { ga: UP, n: 0.5, ap: 'Grade 9 has priority' });
  C('photoj', 'Intro to Photojournalism & Graphic Design', 'jr', 'EP/HP', 'S', [9], { ga: UP, ap: 'Grade 9 has priority' });
  C('pubs', 'Student Publications / Journalism (The Blade/butterknife)', 'jr', 'EP/HP', 'Y', ALL, { rep: 1, ap: 'Application required' });
  C('yb', 'Student Publications / Yearbook (The Phoenix)', 'jr', 'EP/HP', 'Y', ALL, { rep: 1, fa: true, ap: 'Application, recommendation & portfolio' });
  C('capj', 'Capstone Student Publications: Journalism', 'jr', 'HP', 'Y', [12], { pre: A('intro_j', 'pubs'), cap: 'Y', ap: 'Application; Administration approval' });
  C('capyb', 'Capstone Student Publications: Yearbook', 'jr', 'HP', 'Y', [12], { pre: O('photoj', 'yb'), cap: 'Y', ap: 'Application; Administration approval' });

  /* ---------------- LEARNING SUPPORT ---------------- */
  C('ff', 'Freshman Foundations', 'ls', 'CP', 'E', [9], { supp: true, rep: 1, pe: true });
  C('ss_', 'Study Strategies', 'ls', 'CP', 'E', ALL, { supp: true, rep: 1, pe: true, ap: 'Diagnosed learning differences or Chair permission' });
  C('esol', 'English Speakers of Other Languages (ESOL)', 'ls', 'CP', 'E', [9, 10], { supp: true, rep: 1, ap: 'Director of Global Connections' });
  C('sh', 'Study Hall (no credit)', 'ls', '', 'E', ALL, { nocr: true, rep: 1, hall: true });
  C('rper', 'R Period (no credit)', 'ls', '', 'E', SR, { nocr: true, rep: 1, hall: true, needs: 'peFa', ap: 'Privilege: PE and Fine Arts requirements must be complete' });

  /* ---------------- SUMMER (service learning) ---------------- */
  C('hz', 'Service Learning: Horizons (Summer)', 'ss_x', 'EP/HP', 'SU', [], { sg: [9, 10, 11], cr: 0.5, ap: 'Horizons volunteer + Director approval' });

  /* ------------- Lookups ------------- */
  const BY = {};
  D.forEach(c => { BY[c.id] = c; });
  const DEPTS = {
    eng: 'English', math: 'Mathematics', ss: 'Social Studies', sci: 'Science', wl: 'World Languages',
    cs: 'Computer Science', pa: 'Performing Arts', va: 'Visual Arts', pe: 'Physical Education',
    deb: 'Debate', jr: 'Journalism & Publications', ls: 'Learning Support', ss_x: 'Service Learning'
  };
  const LANGS = { fr: 'French', sp: 'Spanish', de: 'German', ja: 'Japanese', zh: 'Mandarin Chinese' };
  const CORE = ['eng', 'math', 'ss', 'sci', 'wl'];
  const LEVEL_RANK = { '': 0, CP: 1, EP: 2, HP: 3, AP: 4 };

  const WA = root.WA = root.WA || {};
  (WA.versions = WA.versions || {})['catalog.js'] = '4';
  WA.catalog = { list: D, by: BY, DEPTS, LANGS, CORE, LEVEL_RANK };
  if (typeof module !== 'undefined') module.exports = WA.catalog;
})(typeof globalThis !== 'undefined' ? globalThis : this);
