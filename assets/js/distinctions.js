/* NOTE: only the course requirements are tracked on the sites; every other requirement is printed as a checklist in the Google Doc / printout.
 * Woodward Academy Graduation Distinctions (2026-2027 Scheduling & Curriculum Guide, pp. 22-29):
 * Global Studies, Service Learning, Sustainability, Media.
 * Course requirements are tracked automatically from the four-year plan; everything else (applications, hours, capstones,
 * portfolios, certifications, B averages) is a manual checkbox. Courses on the guide's lists that are not in the planner
 * (Ethical Global Engagement, Helping Hands Maymester, Global Integrated Science, Dilemmas in Science & Technology,
 * Introduction to Engineering 101, Physical Fitness for Life) are intentionally left out. */
(function (root) {
  const WA = root.WA = root.WA || {};
  (WA.versions = WA.versions || {})['distinctions.js'] = '3';

  const it = (label, ids, o) => Object.assign({ label, ids }, o || {});
  const man = (id, label) => ({ id, label });

  const DEFS = [
    {
      id: 'global', name: 'Global Studies', coordinator: 'Director of Global Connections',
      apply: 'Application and approval due by February 1 of 10th grade (new 11th graders: meet with the Director immediately).',
      groups: [
        { id: 'lang', title: 'World language: three years of one language, or the highest level offered', kind: 'langyears', need: 3, unit: 'years' },
        { id: 'sem', title: 'Seven semester courses from the approved list', kind: 'semesters', need: 7, unit: 'semesters', note: 'Year-long courses count as two semesters. A B or better average in these courses is required (tracked by the school).',
          items: [
            it('History of East Asia', ['gs_ea']), it('History of the Middle East', ['gs_me']), it('U.S. Political Economy & its Critical Choices', ['uspe']), it('World Religions', ['wr']),
            it('Multicultural Literature', ['mcl']), it('Ethical Dilemmas & Decision Making (semester 1 and/or 2)', ['ed1', 'ed2']), it('African Studies', ['gs_af']),
            it('Costa Rica Tropical Ecology Field Course (summer; max 1 semester)', ['trop'], { cap: 1 }),
            it('AP European History', ['apeuro']), it('Modern World History', ['mwh']), it('AP Macroeconomics', ['apmacro']), it('Environmental Science', ['env_cp', 'env_ep']), it('AP Environmental Science', ['apes']),
            it('World Language Capstone (French or Spanish)', ['fr4cap', 'fr5cap', 'sp5cap']),
            it('Study of a second world language (max 2 semesters)', [], { special: 'secondlang', cap: 2 })
          ] }
      ],
      manual: [
        man('A', 'Apply and receive approval by Feb 1 of 10th grade; meet with the Director of Global Connections at the start of each semester'),
        man('B', 'Self-reflection form on global citizenship (submitted with the application)'),
        man('Blang', 'B or better cumulative average in the language courses'),
        man('Bsem', 'B or better average in the selected semester courses'),
        man('art', 'Visual or performing art with a global element, if approved (counts as 2 of the 7 semester courses)'),
        man('F', 'Final-semester self-reflection form and exit interview with the Director')
      ],
      manualGroups: [
        { id: 'D', title: 'Complete four of these options by February 1 of senior year', need: 4, items: [
          man('1', 'Volunteer 40 hours with a non-profit with a global impact (approved)'), man('2', 'Host a long-term F-1 visa international student for an academic year'),
          man('3', 'Host a short-term partner-school student for their exchange'), man('4', 'Mentor a long-term international student monthly for two years'),
          man('5', 'Qualify for the Global Seal of Biliteracy (STAMP 5+, DELE/DELF/Goethe/HSK/JLPT, or AP exam 3+)'), man('6', 'Participate in a WA-sponsored international program'),
          man('7', 'Participate in a WA partner-school exchange (host family)'), man('8', 'Study abroad for a semester or summer (approved program)'),
          man('9', 'Complete a global research project and present it to a panel by Spring Break of senior year'), man('10', 'Active in WA Global (2 years) or Model UN (2 years, 2 off-campus conferences)')] }
      ]
    },
    {
      id: 'service', name: 'Service Learning', coordinator: 'Service Learning Coordinator',
      apply: 'Apply by February 1 of 10th grade (new 11th graders: apply immediately).',
      groups: [
        { id: 'svc', title: 'One service learning course or approved internship', kind: 'count', need: 1, unit: 'requirement', note: 'An approved internship can be used instead of a course; it is on the checklist in the Google Doc. A B or higher average is required in the course.',
          items: [it('Service Learning: Horizons (summer)', ['hz'])] },
        { id: 'c4', title: 'Four semester credits from the approved list', kind: 'semesters', need: 4, unit: 'semesters', note: 'Full-year courses count as two. A B or higher average in these courses is required (tracked by the school).',
          items: [
            it('Personal Finance', ['pf']), it('Debate / Intermediate Debate / Advanced Debate (max 2 semesters)', ['debate', 'idebate', 'adebate'], { cap: 2 }), it('Cybersecurity', ['cyber']),
            it('Artificial Intelligence', ['ai']), it('Environmental Science', ['env_cp', 'env_ep'], { cg: 'env' }), it('AP Environmental Science', ['apes'], { cg: 'env' }),
            it('Ethical Dilemmas & Decision Making 1', ['ed1']), it('Ethical Dilemmas & Decision Making 2', ['ed2']), it('Journalism 1 (Introduction to Journalism)', ['intro_j'])
          ], caps: { env: 2 } }
      ],
      manual: [
        man('A', 'Apply to the program by Feb 1 of 10th grade'),
        man('int', 'Approved internship in place of the service learning course: Youth Leadership Summit with the Atlanta Community Food Bank, or a four-week / 40-hour placement with a partner organization'),
        man('Bavg', 'B or higher average in the service learning course and the four courses'),
        man('D1', '160 service learning hours through WA Serves and the Service Learning program by Spring Break of senior year (max 60 with any one organization)'),
        man('D2', 'Engage with at least six of the ten listed organizations in junior and senior years'),
        man('E', 'Capstone project: reflection paper and presentation to a panel by Spring Break of senior year')
      ],
      manualGroups: []
    },
    {
      id: 'sustain', name: 'Sustainability', coordinator: 'Sustainability Coordinator',
      apply: 'Apply by November 1 of 10th grade (core GPA of at least 3.3 and a teacher recommendation with your transcript).',
      groups: [
        { id: 'req', title: 'Environmental Science or AP Environmental Science (required)', kind: 'count', need: 1, unit: 'course',
          items: [it('Environmental Science', ['env_cp', 'env_ep']), it('AP Environmental Science', ['apes'])] },
        { id: 'ten', title: 'Ten semesters from the approved list', kind: 'semesters', need: 10, unit: 'semesters', note: 'Full-year courses count as two semesters. A B average or higher is required (tracked by the school).',
          items: [
            it('Multicultural Literature', ['mcl']), it('Statistics EP', ['stat_ep']), it('U.S. Political Economy & Critical Choices', ['uspe']), it('Meteorology', ['meteo']), it('Astronomy (EP)', ['astro_ep']),
            it('Tropical Ecology Field Study (summer; max 1 semester)', ['trop'], { cap: 1 }), it('Ethical Dilemmas & Decision Making 1 or 2 (max 2 semesters)', ['ed1', 'ed2'], { cap: 2 }),
            it('Physical Conditioning for Sports or Dance Fitness (max 1 semester)', ['pcs', 'dfcp', 'dfep'], { cap: 1 }), it('Debate (max 1 semester)', ['debate', 'idebate', 'adebate'], { cap: 1 }),
            it('Advanced Robotics (max 1 semester)', ['advrob'], { cap: 1 }), it('Horizons Service Learning (summer; max 1 semester)', ['hz'], { cap: 1 }), it('Journalism 1 (Introduction to Journalism)', ['intro_j']),
            it('Environmental Science', ['env_cp', 'env_ep']), it('AP Environmental Science', ['apes']), it('Human Anatomy & Physiology EP', ['anat']), it('Statistics CP', ['stat_cp']),
            it('U.S. Government / Economics', ['govecon']), it('AP U.S. Government & Politics', ['apgov']), it('AP Microeconomics', ['apmicro']), it('AP Macroeconomics', ['apmacro']),
            it('AP Biology', ['apbio']), it('Independent Science Research', ['isr']), it('Astronomy (CP)', ['astro_cp']), it('World language (max 2 semesters)', [], { special: 'anylang', cap: 2 }),
            it('AP Computer Science Principles', ['apcsp']), it('AP Computer Science A', ['apcsa']), it('Any performing or visual art (max 2 semesters)', [], { depts: ['pa', 'va'], cap: 2 })
          ] }
      ],
      manual: [
        man('A', 'Apply by Nov 1 of 10th grade (core GPA 3.3+, teacher recommendation with transcript)'),
        man('Bavg', 'B average or higher in the ten semester courses'),
        man('B1', 'Outside reading: three approved current-event sustainability articles each semester (Jan of 10th through May of 11th) with reflection journals'),
        man('B2', 'Capstone project completed by the 2nd week of January of senior year and defended before a panel by Spring Break')
      ],
      manualGroups: [
        { id: 'C', title: 'Complete three of these five options', need: 3, items: [
          man('1', 'Four approved field trips by December of senior year, with reflection journals'), man('2', 'Twenty service-learning hours per year for at least two years, with journals'),
          man('3', 'Attend or participate in two conferences or special events, serve on a committee or organize events, with journals'),
          man('4', 'Active for two years in Environmental Awareness Club, Outdoors Club, WA Serves/SLB, STEM Club or 5 Points'), man('5', 'One approved immersive trip with a sustainability focus')] }
      ]
    },
    {
      id: 'media', name: 'Media', coordinator: 'Media Distinction Coordinator (Journalism Department)',
      apply: 'Apply by February 1 of 10th grade (new 11th graders: apply immediately).',
      groups: [
        { id: 'six', title: 'Six semester credits from the approved list', kind: 'semesters', need: 6, unit: 'semesters', note: 'Full-year courses count as two. A B or higher in each class is required (tracked by the school).',
          items: [
            it('Film Studies EP', ['film1']), it('Introduction to Film EP', ['film2']), it('Advanced Film HP', ['film3']), it('Independent Performing Arts HP with Film', ['indpa']),
            it('Journalism 1 (Introduction to Journalism)', ['intro_j']), it('Journalism 2 (Intro to Photojournalism & Graphic Design)', ['photoj']), it('Blade / butterknife EP or HP', ['pubs']),
            it('Blade / butterknife HP Capstone', ['capj']), it('Yearbook EP or HP', ['yb']), it('Yearbook HP Capstone', ['capyb']), it('Introduction to Broadcast & Video Production EP', ['bcast1']),
            it('Advanced Broadcast HP', ['bcast2']), it('Creative Writing 1 or 2 EP', ['cw1', 'cw2']), it('Creative Writing 3 or 4 HP', ['cw3', 'cw4']), it('Photography 1 EP', ['ph1']),
            it('Photography 2 EP', ['ph2']), it('Advanced Photography 1 HP', ['advph']), it('Advanced Photography 2 HP', ['advph2'])
          ] }
      ],
      manual: [
        man('A', 'Apply by Feb 1 of 10th grade'),
        man('B', 'Certification: Final Cut Pro, an Adobe certification (InDesign, Photoshop, Illustrator or Premiere Pro), or an Upper School media exam with a B or better'),
        man('Bavg', 'B or higher average in each of the six semester courses'),
        man('C1', 'Web portfolio: proposal of its elements by Oct 1 of senior year'), man('C2', 'Web portfolio: “About Me” and “Resume” sections by Nov 1'),
        man('C3', 'Web portfolio: advisor check-in by Feb 1'), man('C4', 'Web portfolio: at least three projects in each of two disciplines'), man('C5', 'Present the portfolio to the class and advisors after spring break')
      ],
      manualGroups: [
        { id: 'E', title: 'Complete three of these options by Spring Break of senior year', need: 3, items: [
          man('a', 'Internship, work or participation with GSPA Student Ambassador, Georgia Film Academy, Atlanta Film Society, GPB, MARCOM, Rough Draft or another local media organization'),
          man('b', 'Volunteer at least 10 hours with one service organization and complete the assignment (documentary, article or photo journal)'),
          man('c', 'Attend two approved events (Atlanta film festival screening, JEA/NSPA, GSPA, CSPA, Jostens workshop, Washington Journalism and Media Conference)'),
          man('d', 'Help organize, facilitate or participate in Woodward’s Film Festival'),
          man('e', 'Two years in Coffee House, Film Club, Creative Writing Collective, Silent Voices or Quill and Scroll')] }
      ]
    }
  ];
  const BY = {}; DEFS.forEach(d => { BY[d.id] = d; });
  const HIGHEST = { fr: ['apfr', 'fr5', 'fr5cap'], sp: ['apsp', 'apspl', 'sp5', 'sp5cap'], de: ['apde', 'de5'], ja: ['apja', 'ja4'], zh: ['apzh', 'zh4'] };
  const LANGNAME = { fr: 'French', sp: 'Spanish', de: 'German', ja: 'Japanese', zh: 'Mandarin Chinese' };

  const key = (d, ...p) => [d.id].concat(p).join('.');
  function manualKeys() {
    const out = [];
    DEFS.forEach(d => {
      d.manual.forEach(m => out.push(key(d, m.id)));
      d.manualGroups.forEach(g => g.items.forEach(m => out.push(key(d, g.id, m.id))));
      d.groups.forEach(g => (g.items || []).forEach(i => { if (i.manual) out.push(key(d, i.manual)); }));
    });
    return out;
  }
  const emptyDist = () => ({ interest: {}, checks: {} });
  const sem = r => Math.max(1, Math.round((+r.cr || 0.5) * 2));

  function evaluate(recs, dist) {
    dist = dist || emptyDist(); const interest = dist.interest || {}, checks = dist.checks || {};
    const cr = (recs || []).filter(r => r && r.cr > 0 && (r.src === 'wa' || r.src === 'tr'));
    const sumOf = f => cr.filter(f).reduce((a, r) => a + sem(r), 0);
    // language usage (used by "years of one language" and "second world language")
    const lang = {}; cr.forEach(r => { if (r.dept === 'wl' && r.lang) { const l = lang[r.lang] = lang[r.lang] || { years: new Set(), sem: 0, ids: new Set() }; l.years.add(r.grade); l.sem += sem(r); if (r.c) l.ids.add(r.c.id); } });
    const langs = Object.keys(lang);
    const primary = langs.slice().sort((a, b) => lang[b].sem - lang[a].sem)[0];

    return DEFS.map(d => {
      const groups = d.groups.map(g => {
        let have = 0, items = [], detail = '';
        if (g.kind === 'langyears') {
          let best = { code: '', years: 0, top: false };
          langs.forEach(c => { const yrs = lang[c].years.size, top = HIGHEST[c] && HIGHEST[c].some(id => lang[c].ids.has(id)); if (yrs > best.years || (top && !best.top)) best = { code: c, years: yrs, top }; });
          have = best.top ? g.need : Math.min(best.years, g.need);
          detail = best.code ? LANGNAME[best.code] + ': ' + best.years + ' year' + (best.years === 1 ? '' : 's') + (best.top ? ' (highest level included)' : '') : 'no language planned yet';
        } else {
          const capTot = {};
          items = g.items.map(i => {
            let s = 0;
            if (i.manual) s = checks[key(d, i.manual)] ? (i.sem || 1) : 0;
            else if (i.special === 'secondlang') s = langs.filter(c => c !== primary).reduce((a, c) => a + lang[c].sem, 0);
            else if (i.special === 'anylang') s = langs.reduce((a, c) => a + lang[c].sem, 0);
            else if (i.depts) s = sumOf(r => i.depts.includes(r.dept));
            else s = sumOf(r => r.c && i.ids.includes(r.c.id));
            if (i.cap) s = Math.min(s, i.cap);
            if (i.cg) capTot[i.cg] = (capTot[i.cg] || 0) + s;
            return { label: i.label, hit: s > 0, sem: s, manualKey: i.manual ? key(d, i.manual) : '', checked: i.manual ? !!checks[key(d, i.manual)] : false };
          });
          if (g.kind === 'count') have = items.filter(x => x.hit).length;
          else {
            have = items.reduce((a, x, n) => a + (g.items[n].cg ? 0 : x.sem), 0);
            Object.keys(capTot).forEach(cg => { have += Math.min(capTot[cg], (g.caps || {})[cg] || capTot[cg]); });
          }
        }
        return { id: g.id, title: g.title, kind: g.kind, need: g.need, unit: g.unit, note: g.note || '', have, met: have >= g.need, items, detail };
      });
      const manual = d.manual.map(m => ({ key: key(d, m.id), label: m.label, checked: !!checks[key(d, m.id)] }));
      const manualGroups = d.manualGroups.map(g => {
        const its = g.items.map(m => ({ key: key(d, g.id, m.id), label: m.label, checked: !!checks[key(d, g.id, m.id)] })), have = its.filter(x => x.checked).length;
        return { id: g.id, title: g.title, need: g.need, have, met: have >= g.need, items: its };
      });
      const courseMet = groups.every(g => g.met), anyCourse = groups.some(g => g.have > 0);
      const otherTotal = manual.length + manualGroups.reduce((a, g) => a + g.need, 0), otherHave = manual.filter(m => m.checked).length + manualGroups.reduce((a, g) => a + Math.min(g.have, g.need), 0);
      const otherMet = manual.every(m => m.checked) && manualGroups.every(g => g.met);
      return { id: d.id, name: d.name, coordinator: d.coordinator, apply: d.apply, interested: !!interest[d.id], groups, manual, manualGroups,
        courseMet, otherMet, otherHave, otherTotal, met: courseMet, status: courseMet ? 'done' : anyCourse ? 'part' : 'none' };
    });
  }
  const STATUS_TEXT = { done: '✓ Projected to be completed', part: '◐ Projected: in progress', none: '○ Projected: not yet planned' };
  /** One line summarising a course group: title, projected progress, and the planned courses that count. */
  function groupText(g) {
    const prog = g.kind === 'langyears' ? g.have + ' of ' + g.need + ' years' + (g.detail ? ' (' + g.detail + ')' : '') : g.kind === 'count' ? (g.have >= g.need ? 'planned' : 'not yet planned') : g.have + ' of ' + g.need + ' ' + g.unit;
    const hits = (g.items || []).filter(i => i.hit).map(i => i.label.replace(/\s*\((tick when approved|summer;[^)]*|max [^)]*)\)/, '')), shown = hits.slice(0, 7);
    return g.title + ' — Projected: ' + prog + (shown.length ? ' — ' + shown.join(' · ') + (hits.length > 7 ? ' · …' : '') : '') + (g.met ? '  ✓' : '');
  }
  WA.distinctions = { STATUS_TEXT, groupText, DEFS, BY, IDS: DEFS.map(d => d.id), manualKeys, emptyDist, evaluate, LANGNAME };
  if (typeof module !== 'undefined') module.exports = WA.distinctions;
})(typeof globalThis !== 'undefined' ? globalThis : this);
