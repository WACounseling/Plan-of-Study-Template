/* Builds the HTML that Google Drive converts into the course-plan Google Doc.
 * Page 1: header, student info (incl. projected graduation), four-year grid, tracker, cocurriculars, notes.
 * Page 2: graduation / scholarship / NCAA reference.  Tokens [[LOGO]] and [[PB]] are replaced via the Docs API
 * (logo image, page break); margins (0.5") are applied via the Docs API as well. Widths below assume 540pt (720px). */
(function (root) {
  const C = { RED: '#9d2235', NAVY: '#002e53', SLATE: '#4c768e', CREAM: '#ebe6d2', MIST: '#f1f4f4', GRAY: '#ceced0', INK: '#242424', MUTED: '#636363',
    GREEN_BG: '#e3f3ea', GOLD_BG: '#fdf0d8', CORAL_BG: '#fbe4e3', GREEN: '#1f7a4a', GOLD: '#8a5a00', CORAL: '#a6302c' };
  const F = 'font-family:Montserrat,Arial,sans-serif;';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => String(Math.round(Number(n) * 100) / 100);
  const ord = g => ({ 9: '9th', 10: '10th', 11: '11th', 12: '12th' }[g] || String(g));
  const px = pt => Math.round(pt * 4 / 3);

  const p = (html, st) => '<p style="' + F + 'margin:0;' + (st || '') + '">' + html + '</p>';
  const cell = (inner, o) => {
    o = o || {};
    return '<td width="' + (o.w ? px(o.w) : '') + '" valign="' + (o.v || 'top') + '" style="' + F + (o.w ? 'width:' + px(o.w) + 'px;' : '') +
      (o.bg ? 'background-color:' + o.bg + ';' : '') + 'border:' + (o.b === 0 ? 'none' : '0.5pt solid ' + (o.bc || C.GRAY)) + ';padding:' + (o.pad || '3pt 4pt') + ';' + (o.st || '') + '">' + inner + '</td>';
  };
  const table = (rows, o) => '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:' + px(540) + 'px;' + ((o && o.st) || '') + '">' + rows.map(r => '<tr>' + r.join('') + '</tr>').join('') + '</table>';
  const gap = pt => p('&nbsp;', 'font-size:' + pt + 'pt;line-height:' + pt + 'pt;');
  const rule = (color, h) => table([[cell('&nbsp;', { w: 540, bg: color, b: 0, pad: '0', st: 'font-size:' + h + 'pt;line-height:' + h + 'pt;height:' + h + 'pt;' })]]);
  const sectionTitle = t => p(esc(t), 'font-size:7.5pt;font-weight:bold;color:' + C.RED + ';margin-top:2pt;margin-bottom:2pt;');

  function courseLine(line) {
    const m = String(line).match(/^(Fall|Spring): /);
    let rest = String(line), pre = '';
    if (m) { pre = '<span style="color:' + C.SLATE + ';font-weight:bold;">' + m[1] + ': </span>'; rest = rest.slice(m[0].length); }
    const lv = rest.match(/ \((CP|EP|HP|AP|EP\/HP)\)$/);
    const name = lv ? rest.slice(0, rest.length - lv[0].length) : rest;
    return p(pre + '<b>' + esc(name) + '</b>' + (lv ? esc(lv[0]) : ''), 'font-size:7.5pt;margin-bottom:1pt;');
  }

  function buildHtml(d) {
    const out = [];
    /* header */
    out.push(table([[
      cell(p('[[LOGO]]', 'font-size:11pt;color:' + C.RED + ';'), { w: 230, b: 0, pad: '0 0 2pt 0', v: 'middle' }),
      cell(p('FOUR-YEAR COURSE PLAN', 'font-size:17pt;font-weight:bold;color:' + C.NAVY + ';text-align:right;') +
        p('Upper School Counseling  ·  Projected graduation: Spring ' + esc(d.classOf), 'font-size:7.5pt;color:' + C.SLATE + ';text-align:right;'), { w: 310, b: 0, pad: '0 0 2pt 0', v: 'middle' })
    ]]));
    out.push(rule(C.RED, 3)); out.push(gap(3));

    /* student / counselor info */
    const lab = (t, w) => cell(p(t, 'font-size:6.5pt;font-weight:bold;color:' + C.NAVY + ';'), { w, bg: C.CREAM, pad: '3pt 5pt' });
    const val = (t, w) => cell(p(esc(t), 'font-size:8.5pt;font-weight:bold;'), { w, pad: '3pt 5pt' });
    const W = [78, 150, 112, 200];
    const row = (a, b, c, e) => [lab(a, W[0]), val(b, W[1]), lab(c, W[2]), val(e, W[3])];
    out.push(table([
      row('STUDENT', d.student.name, 'STUDENT EMAIL', d.student.email),
      row('COUNSELOR', d.counselor.name, 'COUNSELOR EMAIL', d.counselor.email),
      row('DATE', d.dateText || d.date, 'PROJECTED GRADUATION', 'Spring ' + d.classOf + '  (Class of ' + d.classOf + ')')
    ]));
    out.push(gap(5));

    /* four-year grid */
    const labW = 66, colW = (540 - labW) / 4;
    const head = [cell('&nbsp;', { w: labW, b: 0 })].concat(d.grades.map(g => cell(p(esc(g.label.toUpperCase()), 'font-size:8pt;font-weight:bold;color:#fff;text-align:center;') + (g.year ? p(esc(g.year), 'font-size:6.5pt;color:#fff;text-align:center;') : ''), { w: colW, bg: C.NAVY, pad: '4pt', bc: C.NAVY })));
    const rows = [head];
    d.grades[0].rows.forEach((r, i) => {
      rows.push([cell(p(esc(r.label), 'font-size:7pt;font-weight:bold;color:' + C.NAVY + ';'), { w: labW, bg: r.kind === 'core' ? C.CREAM : C.MIST })]
        .concat(d.grades.map(g => { const lines = g.rows[i].cells; return cell(lines.length ? lines.map(courseLine).join('') : p('—', 'font-size:7.5pt;color:#a0a0a0;'), { w: colW }); })));
    });
    rows.push([cell(p('Summer', 'font-size:7pt;font-weight:bold;color:' + C.NAVY + ';'), { w: labW, bg: C.MIST })]
      .concat(d.grades.map(g => cell(g.summer && g.summer.length ? g.summer.map(courseLine).join('') : p('—', 'font-size:7.5pt;color:#a0a0a0;'), { w: colW }))));
    out.push(table(rows)); out.push(gap(6));

    /* tracker */
    out.push(sectionTitle('GRADUATION REQUIREMENT TRACKER'));
    const tcell = a => {
      const bg = a.status === 'done' ? C.GREEN_BG : a.status === 'part' ? C.GOLD_BG : C.CORAL_BG;
      const fg = a.status === 'done' ? C.GREEN : a.status === 'part' ? C.GOLD : C.CORAL;
      const st = a.status === 'done' ? '✓ Complete' : a.status === 'part' ? '◐ In progress' : '○ Not started';
      return cell(p(esc(a.label.toUpperCase()), 'font-size:6.5pt;font-weight:bold;color:' + C.NAVY + ';') + p(fmt(a.have) + ' / ' + fmt(a.req) + ' units', 'font-size:10pt;font-weight:bold;color:' + C.NAVY + ';') + p(st, 'font-size:6.5pt;font-weight:bold;color:' + fg + ';'), { w: 108, bg, bc: '#ffffff', pad: '4pt 5pt' });
    };
    const A = d.tracker.areas;
    out.push(table([A.slice(0, 5).map(tcell), A.slice(5, 10).map(tcell)]));
    const gh = d.tracker.ghsa.map(x => ord(x.grade) + ' grade ' + fmt(x.have) + '/' + x.need + (x.met ? ' ✓' : '')).join('   ·   ');
    out.push(p('Credits by end of year (GHSA checkpoints):  ' + esc(gh), 'font-size:6.8pt;color:' + C.MUTED + ';margin-top:3pt;'));
    out.push(p('HOPE / Zell Miller rigor courses planned: ' + d.tracker.rigor.have + ' of 4 needed   ·   NCAA Division I core credits planned: ' + fmt(d.tracker.ncaa.total) + ' of 16', 'font-size:6.8pt;color:' + C.MUTED + ';margin-bottom:2pt;'));

    /* cocurriculars */
    out.push(sectionTitle('COCURRICULAR ACTIVITIES'));
    const act = d.cocurr.filter(c => /^Currently/.test(c.status)).map(c => c.name), intr = d.cocurr.filter(c => /^Interested/.test(c.status)).map(c => c.name);
    const list = l => l.length ? l.map(n => p(esc(n), 'font-size:7.5pt;')).join('') : p('—', 'font-size:7.5pt;color:#a0a0a0;');
    out.push(table([
      [cell(p('CURRENTLY PARTICIPATING', 'font-size:6.5pt;font-weight:bold;color:' + C.NAVY + ';'), { w: 270, bg: C.CREAM, pad: '3pt 5pt' }), cell(p('INTERESTED IN EXPLORING', 'font-size:6.5pt;font-weight:bold;color:' + C.NAVY + ';'), { w: 270, bg: C.CREAM, pad: '3pt 5pt' })],
      [cell(list(act), { w: 270, pad: '3pt 5pt' }), cell(list(intr), { w: 270, pad: '3pt 5pt' })]
    ]));
    out.push(gap(3));

    /* notes */
    const notes = [];
    if (d.prior && (d.prior.ms.length || d.prior.transfers.length)) notes.push(['Prior credit & placement', d.prior.ms.concat(d.prior.transfers.map(t => 'Transfer: ' + t)).join('  ·  ')]);
    if (d.approvals && d.approvals.length) {
      const ap = d.approvals.slice(0, 8).map(a => ord(a.grade) + ': ' + a.course + ' — ' + a.note); if (d.approvals.length > 8) ap.push('…and ' + (d.approvals.length - 8) + ' more');
      notes.push(['Approvals this plan depends on', ap.join('  ·  ')]);
    }
    if (d.override && d.override.on) notes.push(['Counselor override', (d.override.reason || '') + (d.override.issues && d.override.issues.length ? '  (Open items: ' + d.override.issues.slice(0, 6).join('; ') + ')' : '')]);
    if (d.notes) notes.push(['Counselor notes', d.notes]);
    notes.forEach(n => out.push(p('<b style="color:' + C.NAVY + ';">' + esc(n[0]) + ':</b>  ' + esc(n[1]), 'font-size:6.8pt;margin-top:1pt;margin-bottom:1pt;')));

    /* page 2 */
    out.push(p('[[PB]]', 'font-size:2pt;'));
    const ref = d.reference || { sections: [] };
    out.push(p('GRADUATION, SCHOLARSHIP &amp; ELIGIBILITY REFERENCE', 'font-size:12pt;font-weight:bold;color:' + C.NAVY + ';margin-bottom:1pt;'));
    out.push(p(esc(d.student.name) + '  ·  Projected graduation: Spring ' + esc(d.classOf) + '  ·  Woodward Academy requirements, State of Georgia requirements, HOPE &amp; Zell Miller, NCAA  ·  current as of ' + esc(ref.updated || ''), 'font-size:6.8pt;color:' + C.MUTED + ';margin-bottom:2pt;'));
    out.push(rule(C.RED, 2)); out.push(gap(3));
    const col = n => ref.sections.filter(s => s.col === n).map(s =>
      p(esc(s.title.toUpperCase()), 'font-size:7.5pt;font-weight:bold;color:' + C.RED + ';margin-top:6pt;margin-bottom:1pt;') +
      (s.rows || []).map(r => p('<b style="color:' + C.NAVY + ';">' + esc(r[0]) + ':</b>  ' + esc(r[1]), 'font-size:6.8pt;margin-bottom:1pt;')).join('') +
      ((s.items || []).length ? '<ul style="margin-top:1pt;margin-bottom:0;">' + s.items.map(i => '<li style="' + F + 'font-size:6.8pt;margin-bottom:1pt;">' + esc(i) + '</li>').join('') + '</ul>' : '')).join('');
    out.push(table([[cell(col(0), { w: 270, b: 0, pad: '0 8pt 0 0' }), cell(col(1), { w: 270, b: 0, pad: '0 0 0 8pt' })]]));

    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Course Plan</title></head><body style="' + F + 'font-size:8pt;color:' + C.INK + ';">' + out.join('') + '</body></html>';
  }

  const WA = root.WA = root.WA || {};
  WA.docbuilder = { buildHtml };
  if (typeof module !== 'undefined') module.exports = WA.docbuilder;
})(typeof globalThis !== 'undefined' ? globalThis : this);
