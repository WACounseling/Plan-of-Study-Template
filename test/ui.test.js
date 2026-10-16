const { JSDOM } = require('jsdom'); const fs = require('fs');
const path = require('path');
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').replace(/<link[^>]*(googleapis|gstatic)[^>]*>/g, '').replace(/<script[^>]*accounts.google.com[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + path.join(__dirname, '../index.html') });
  const w = dom.window; await new Promise(r => w.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 200));
  const d = w.document; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const pick = (g, slot, half, val) => { const sel = w.WA.__sel ? null : null; const row = d.querySelectorAll('#grade-' + g + ' select'); };
  const grade = g => d.querySelector('#grade-' + g);
  ok(d.querySelectorAll('.grade').length === 4, '4 grade cards');
  ok(d.querySelectorAll('#grade-9 select').length === 8 * 2 + 2, 'grade 9 selects: ' + d.querySelectorAll('#grade-9 select').length);
  const sels9 = Array.from(grade(9).querySelectorAll('select'));
  const choose = (sel, val) => { sel.value = val; sel.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const find = (sel, val) => Array.from(sel.options).some(o => o.value === val && !o.disabled);
  // order in DOM: eng f,s ; math f,s ; ss ; sci ; wl ; e1 ; e2 ; e3 ; su1 su2
  ok(find(sels9[0], 'eng1|EP'), 'English 1 EP in 9th English dropdown');
  ok(!find(sels9[0], 'eng2|EP'), 'English 2 not offered in 9th');
  choose(sels9[0], 'eng1|EP'); ok(sels9[1].disabled, 'spring disabled after year-long pick');
  choose(sels9[2], 'geo|EP'); choose(sels9[4], 'govecon|EP'); choose(sels9[6], 'bio|EP'); choose(sels9[8], 'sp2|EP');
  const spLocked = Array.from(sels9[8].options).some(o => o.disabled && o.value.startsWith('sp2'));
  // without MS language, Spanish 2 should be locked; set via binding
  d.querySelector('[data-bind="prior.msLang"]').value = 'sp:1'; d.querySelector('[data-bind="prior.msLang"]').dispatchEvent(new w.Event('change', { bubbles: true }));
  const sels9b = Array.from(grade(9).querySelectorAll('select'));
  ok(find(sels9b[8], 'sp2|EP'), 'Spanish 2 available after MS Level 1 entered');
  // grade 10 chem should now be available
  const s10 = Array.from(grade(10).querySelectorAll('select'));
  ok(find(s10[6], 'chem|EP'), 'Chemistry available in 10th once Biology chosen');
  // remove biology -> chem locked
  const s9 = Array.from(grade(9).querySelectorAll('select')); choose(s9[6], '');
  ok(!find(Array.from(grade(10).querySelectorAll('select'))[6], 'chem|EP'), 'Chemistry disappears when Biology removed');
  // transfer credit
  d.getElementById('addTransfer').click(); ok(d.querySelectorAll('.tr-row').length === 1, 'transfer row added');
  // cocurricular
  ok(d.querySelectorAll('.coc-row').length === 1, 'cocurricular row present'); const cs = d.querySelector('.coc-row select'); ok(cs.querySelectorAll('optgroup').length >= 8, 'cocurricular categories: ' + cs.querySelectorAll('optgroup').length);
  // tracker
  ok(d.querySelectorAll('#trackerAreas .area').length === 10, '10 tracker areas');
  ok(d.querySelector('#area-eng').classList.contains('done') === false && d.querySelector('#area-eng').classList.contains('part'), 'English tracker in progress');
  // celebration fires when requirement completes (PE)
  const e1 = Array.from(grade(9).querySelectorAll('select')); // find elective1 selects
  const pe = d.querySelector('#area-pe'); ok(pe.classList.contains('none'), 'PE starts not started');
  // elective 1 = index 10 (after eng2 math2 ss2 sci2 wl2 = 10)
  choose(e1[10], 'dfcp|CP');
  ok(d.querySelector('#area-pe').classList.contains('done'), 'PE tracker turns complete');
  ok(d.querySelector('#celebrate').classList.contains('on'), 'celebration overlay appears');
  ok(d.querySelectorAll('#celebrate .star').length > 10 && d.querySelector('#celebrate img[src*="wa-icon"]') && d.querySelector('#celebrate svg.cap'), 'stars + WA logo + grad cap shown');
  const pl = w.WA.app.buildPayload(); ok(pl.grades.length === 4 && pl.tracker.areas.length === 10 && pl.reference.sections.length > 5, 'payload built'); console.log(JSON.stringify(pl.grades[0].rows.slice(0, 3)));
  console.log(fail ? 'FAILURES ' + fail : 'ALL PASS'); w.close();
})().catch(e => { console.error(e); process.exit(1); });
