/**
 * Woodward Academy — Four-Year Course Planner: Google Apps Script back end.
 *
 * Receives the plan from the GitHub Pages site (POST, JSON), then:
 *   1. builds a Google Doc (0.5" margins; page 1 = four-year plan, page 2 = graduation / scholarship / NCAA reference)
 *   2. makes the COUNSELOR the owner (so it lives in their Drive and is editable by them)
 *   3. shares it VIEW-ONLY with the student
 *   4. emails short link notices to the counselor and student (no PDF is sent)
 *
 * Configure under Project Settings > Script Properties (see README.md):
 *   ACCESS_CODE                (required)  shared code counselors type on the site
 *   ALLOWED_COUNSELOR_DOMAIN   (optional)  default "woodward.edu"
 *   LOGO_URL                   (optional)  https URL of assets/img/wordmark-red-600.png on your GitHub Pages site
 *   FOLDER_ID                  (optional)  Drive folder to hold new docs until ownership transfers
 *   SEND_EMAILS                (optional)  "false" to skip the link-notice emails (default "true")
 *   TRANSFER_OWNERSHIP         (optional)  "false" to keep the script account as owner and add the counselor as editor
 */

var C = {
  RED: '#9d2235', NAVY: '#002e53', SLATE: '#4c768e', CREAM: '#ebe6d2', MIST: '#f1f4f4', GRAY: '#ceced0', INK: '#242424', MUTED: '#636363',
  GREEN_BG: '#e3f3ea', GOLD_BG: '#fdf0d8', CORAL_BG: '#fbe4e3', GREEN: '#1f7a4a', GOLD: '#8a5a00', CORAL: '#a6302c',
  FONT: 'Montserrat'
};
var MARGIN = 36;               // 0.5 inch in points
var PAGE_W = 612, PAGE_H = 792;
var CONTENT_W = PAGE_W - 2 * MARGIN; // 540

/* -------------------- web app entry points -------------------- */

function doGet() {
  return json_({ ok: true, service: 'Woodward Academy Course Planner', configured: !!prop_('ACCESS_CODE') });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    var p = JSON.parse(e.postData.contents);
    validate_(p);
    var result = createPlan_(p);
    return json_({ ok: true, docUrl: result.url, warnings: result.warnings });
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) { /* not held */ }
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function prop_(k, d) { var v = PropertiesService.getScriptProperties().getProperty(k); return v == null || v === '' ? d : v; }

function validate_(p) {
  var code = prop_('ACCESS_CODE');
  if (!code) throw new Error('The back end has no ACCESS_CODE set. Ask your administrator to finish setup.');
  if (!p || String(p.accessCode || '') !== String(code)) throw new Error('Access code not recognized.');
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!p.student || !re.test(p.student.email || '') || !String(p.student.name || '').trim()) throw new Error('Student name and a valid student email are required.');
  if (!p.counselor || !re.test(p.counselor.email || '') || !String(p.counselor.name || '').trim()) throw new Error('Counselor name and a valid counselor email are required.');
  var dom = String(prop_('ALLOWED_COUNSELOR_DOMAIN', 'woodward.edu')).toLowerCase();
  if (dom && String(p.counselor.email).toLowerCase().slice(-(dom.length + 1)) !== '@' + dom) throw new Error('Counselor email must be an @' + dom + ' address.');
  if (!/^20\d\d$/.test(String(p.classOf || ''))) throw new Error('A projected graduation year is required.');
  if (!p.grades || p.grades.length !== 4) throw new Error('The plan is incomplete.');
}

/* -------------------- main workflow -------------------- */

function createPlan_(p) {
  var warnings = [];
  var title = 'Four-Year Course Plan — ' + clean_(p.student.name) + ' (Graduating ' + p.classOf + ')' + ' — ' + (p.date || '');
  var doc = DocumentApp.create(title);
  var docId = doc.getId();
  buildDoc_(doc, p, warnings);
  doc.saveAndClose();

  var file = DriveApp.getFileById(docId);
  var folderId = prop_('FOLDER_ID');
  if (folderId) {
    try { DriveApp.getFolderById(folderId).addFile(file); DriveApp.getRootFolder().removeFile(file); }
    catch (e) { warnings.push('Could not move the document into the configured folder.'); }
  }

  var student = String(p.student.email).trim(), counselor = String(p.counselor.email).trim();
  // 1) student: VIEW-ONLY.  Editors (counselor) cannot be re-shared by editors; only the owner shares.
  file.addViewer(student);
  try { file.setShareableByEditors(false); } catch (e) { /* not critical */ }

  // 2) counselor: owner (editable, lives in their Drive)
  var transferred = false;
  if (prop_('TRANSFER_OWNERSHIP', 'true') !== 'false') {
    try { file.setOwner(counselor); transferred = true; }
    catch (e) { warnings.push('Ownership could not be transferred automatically (' + e.message + '); the counselor was given edit access instead.'); }
  }
  if (!transferred) file.addEditor(counselor);

  // the script's account keeps editor access after a transfer; remove it so the file is the counselor's alone
  if (transferred) {
    try { file.removeEditor(Session.getEffectiveUser().getEmail()); } catch (e) { /* may not be permitted; harmless */ }
  }

  var url = 'https://docs.google.com/document/d/' + docId + '/edit';
  if (prop_('SEND_EMAILS', 'true') !== 'false') sendNotices_(p, url, warnings);
  return { url: url, warnings: warnings };
}

function sendNotices_(p, url, warnings) {
  try {
    var first = clean_(p.student.name).split(' ')[0];
    MailApp.sendEmail({
      to: p.student.email, name: 'Woodward Academy Upper School Counseling', replyTo: p.counselor.email,
      subject: 'Your Four-Year Course Plan — Woodward Academy',
      htmlBody: '<div style="font-family:Arial,sans-serif;color:#242424;max-width:560px">' +
        '<p style="color:#9d2235;font-weight:700;letter-spacing:.08em;margin:0">WOODWARD ACADEMY · UPPER SCHOOL COUNSELING</p>' +
        '<p>Hi ' + esc_(first) + ',</p><p>' + esc_(clean_(p.counselor.name)) + ' has shared your four-year course plan with you. ' +
        'You have <b>view-only</b> access, so it always shows the latest version your counselor has saved.</p>' +
        '<p><a href="' + url + '" style="background:#9d2235;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:700">Open your course plan</a></p>' +
        '<p>Projected graduation: <b>Spring ' + esc_(String(p.classOf)) + '</b>. Page 2 lists graduation, scholarship and NCAA requirements. Please talk with ' + esc_(clean_(p.counselor.name)) + ' if you would like any changes.</p>' +
        '<p style="color:#636363;font-size:12px">Excellence. Character. Opportunity.</p></div>'
    });
  } catch (e) { warnings.push('The student notice email could not be sent.'); }
  try {
    MailApp.sendEmail({
      to: p.counselor.email, name: 'Course Planner', subject: 'Course plan created — ' + clean_(p.student.name),
      htmlBody: '<div style="font-family:Arial,sans-serif;color:#242424"><p>The four-year course plan for <b>' + esc_(clean_(p.student.name)) + '</b> was created. ' +
        'You are the owner and can edit it; ' + esc_(p.student.email) + ' has view-only access.</p><p><a href="' + url + '">Open the Google Doc</a></p></div>'
    });
  } catch (e) { /* counselor already sees the link on the site */ }
}

/* -------------------- document builder -------------------- */

function buildDoc_(doc, p, warnings) {
  var body = doc.getBody();
  body.setPageWidth(PAGE_W); body.setPageHeight(PAGE_H);
  body.setMarginTop(MARGIN); body.setMarginBottom(MARGIN); body.setMarginLeft(MARGIN); body.setMarginRight(MARGIN);
  body.setAttributes(style_({ size: 8, color: C.INK }));

  /* ---- header: wordmark + title ---- */
  var head = body.insertTable(0, [['', '']]);
  noBorder_(head); head.setColumnWidth(0, 230); head.setColumnWidth(1, CONTENT_W - 230);
  var lc = head.getCell(0, 0), rc = head.getCell(0, 1);
  [lc, rc].forEach(function (c) { c.setPaddingTop(0); c.setPaddingBottom(2); c.setPaddingLeft(0); c.setPaddingRight(0); c.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER); });
  var lp = lc.getChild(0).asParagraph();
  var logoOk = false;
  var logoUrl = prop_('LOGO_URL');
  if (logoUrl) {
    try {
      var img = lp.appendInlineImage(UrlFetchApp.fetch(logoUrl).getBlob());
      var w = img.getWidth(), h = img.getHeight(); img.setWidth(150).setHeight(Math.round(150 * h / w)); logoOk = true;
    } catch (e) { warnings.push('Logo image could not be loaded; a text wordmark was used.'); }
  }
  if (!logoOk) { lp.setText('WOODWARD\nACADEMY').setAttributes(style_({ font: 'Georgia', size: 17, bold: false, color: C.RED })); lp.setLineSpacing(1); }
  var rp = rc.getChild(0).asParagraph();
  rp.setText('FOUR-YEAR COURSE PLAN').setAlignment(DocumentApp.HorizontalAlignment.RIGHT).setAttributes(style_({ size: 17, bold: true, color: C.NAVY }));
  var rp2 = rc.appendParagraph('Upper School Counseling  ·  Projected Graduation: Spring ' + p.classOf);
  rp2.setAlignment(DocumentApp.HorizontalAlignment.RIGHT).setAttributes(style_({ size: 7.5, color: C.SLATE })); rp2.setSpacingBefore(1);
  rule_(body, C.RED, 3);

  /* ---- student / counselor info ---- */
  var info = body.appendTable([
    ['STUDENT', clean_(p.student.name), 'STUDENT EMAIL', p.student.email],
    ['COUNSELOR', clean_(p.counselor.name), 'COUNSELOR EMAIL', p.counselor.email],
    ['DATE', p.dateText || p.date, 'PROJECTED GRADUATION', 'Spring ' + p.classOf + '  (Class of ' + p.classOf + ')']
  ]);
  borders_(info, C.GRAY, 0.5);
  [78, 150, 112, 200].forEach(function (w, i) { info.setColumnWidth(i, w); });
  for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) {
    var cell = info.getCell(r, c); pad_(cell, 3, 3, 5, 5);
    if (c % 2 === 0) { cell.setBackgroundColor(C.CREAM); cell.editAsText().setFontSize(6.5).setBold(true).setForegroundColor(C.NAVY).setFontFamily(C.FONT); }
    else { cell.editAsText().setFontSize(8.5).setBold(true).setForegroundColor(C.INK).setFontFamily(C.FONT); }
  }
  spacer_(body, 5);

  /* ---- four-year grid ---- */
  var labels = p.grades[0].rows.map(function (r) { return r.label; });
  var grid = [['']];
  p.grades.forEach(function (g) { grid[0].push(g.label.toUpperCase() + (g.year ? '\n' + g.year : '')); });
  var rowKinds = ['hdr'];
  p.grades[0].rows.forEach(function (row, i) {
    var line = [row.label];
    p.grades.forEach(function (g) { line.push(g.rows[i].cells); });
    grid.push(line); rowKinds.push(row.kind);
  });
  var summerLine = ['Summer'];
  p.grades.forEach(function (g) { summerLine.push(g.summer && g.summer.length ? g.summer : []); });
  grid.push(summerLine); rowKinds.push('summer');
  var gt = body.appendTable(grid.map(function (row) { return row.map(function () { return ''; }); }));
  borders_(gt, C.GRAY, 0.5);
  gt.setColumnWidth(0, 66); for (var gc = 1; gc <= 4; gc++) gt.setColumnWidth(gc, (CONTENT_W - 66) / 4);
  grid.forEach(function (row, ri) {
    row.forEach(function (val, ci) {
      var cell = gt.getCell(ri, ci); pad_(cell, ri === 0 ? 4 : 3, ri === 0 ? 4 : 3, 4, 4);
      var lines = Array.isArray(val) ? val : String(val).split('\n');
      if (ri === 0) {
        cell.setBackgroundColor(ci === 0 ? '#ffffff' : C.NAVY);
        setLines_(cell, lines, { size: 8, bold: true, color: '#ffffff', align: 'center' });
        if (lines.length > 1) { var t2 = cell.getChild(1).asParagraph(); t2.setAttributes(style_({ size: 6.5, bold: false, color: '#ffffff' })); }
        return;
      }
      if (ci === 0) {
        cell.setBackgroundColor(rowKinds[ri] === 'core' ? C.CREAM : rowKinds[ri] === 'elec' ? C.MIST : '#ffffff');
        setLines_(cell, lines, { size: 7, bold: true, color: C.NAVY });
      } else {
        var empty = lines.length === 0;
        setLines_(cell, empty ? ['—'] : lines, { size: 7.5, bold: false, color: empty ? '#a0a0a0' : C.INK });
        if (!empty) boldCourse_(cell);
      }
    });
  });
  spacer_(body, 6);

  /* ---- graduation requirement tracker (color coded) ---- */
  sectionTitle_(body, 'GRADUATION REQUIREMENT TRACKER');
  var areas = p.tracker.areas;
  var tg = body.appendTable([areas.slice(0, 5).map(function () { return ''; }), areas.slice(5, 10).map(function () { return ''; })]);
  borders_(tg, '#ffffff', 2);
  for (var tc = 0; tc < 5; tc++) tg.setColumnWidth(tc, CONTENT_W / 5);
  areas.forEach(function (a, i) {
    var cell = tg.getCell(Math.floor(i / 5), i % 5); pad_(cell, 4, 4, 5, 5);
    var bg = a.status === 'done' ? C.GREEN_BG : a.status === 'part' ? C.GOLD_BG : C.CORAL_BG;
    var fg = a.status === 'done' ? C.GREEN : a.status === 'part' ? C.GOLD : C.CORAL;
    cell.setBackgroundColor(bg);
    var stText = a.status === 'done' ? '✓ Complete' : a.status === 'part' ? '◐ In progress' : '○ Not started';
    setLines_(cell, [a.label.toUpperCase(), fmt_(a.have) + ' / ' + fmt_(a.req) + ' units', stText], { size: 7, bold: false, color: C.INK });
    cell.getChild(0).asParagraph().setAttributes(style_({ size: 6.5, bold: true, color: C.NAVY }));
    cell.getChild(1).asParagraph().setAttributes(style_({ size: 10, bold: true, color: C.NAVY }));
    cell.getChild(2).asParagraph().setAttributes(style_({ size: 6.5, bold: true, color: fg }));
  });
  var gh = p.tracker.ghsa.map(function (x) { return ordinal_(x.grade) + ' grade ' + fmt_(x.have) + '/' + x.need + (x.met ? ' ✓' : ''); }).join('   ·   ');
  var extra = body.appendParagraph('Credits by end of year (GHSA checkpoints):  ' + gh + '\nHOPE / Zell Miller rigor courses planned: ' + p.tracker.rigor.have + ' of 4 needed   ·   NCAA Division I core credits planned: ' + fmt_(p.tracker.ncaa.total) + ' of 16');
  extra.setAttributes(style_({ size: 6.8, color: C.MUTED })); extra.setSpacingBefore(3); extra.setSpacingAfter(2); extra.setLineSpacing(1.05);

  /* ---- cocurriculars ---- */
  sectionTitle_(body, 'COCURRICULAR ACTIVITIES');
  var act = p.cocurr.filter(function (c) { return /^Currently/.test(c.status); }).map(function (c) { return c.name; });
  var intr = p.cocurr.filter(function (c) { return /^Interested/.test(c.status); }).map(function (c) { return c.name; });
  var ct = body.appendTable([['CURRENTLY PARTICIPATING', 'INTERESTED IN EXPLORING'], ['', '']]);
  borders_(ct, C.GRAY, 0.5); ct.setColumnWidth(0, CONTENT_W / 2); ct.setColumnWidth(1, CONTENT_W / 2);
  [0, 1].forEach(function (c) { var h = ct.getCell(0, c); pad_(h, 3, 3, 5, 5); h.setBackgroundColor(C.CREAM); h.editAsText().setFontSize(6.5).setBold(true).setForegroundColor(C.NAVY).setFontFamily(C.FONT); });
  [act, intr].forEach(function (list, c) { var cell = ct.getCell(1, c); pad_(cell, 3, 3, 5, 5); setLines_(cell, list.length ? list : ['—'], { size: 7.5, color: list.length ? C.INK : '#a0a0a0' }); });
  spacer_(body, 3);

  /* ---- prior credit, approvals, override, notes ---- */
  var notes = [];
  if (p.prior && (p.prior.ms.length || p.prior.transfers.length)) {
    notes.push(['Prior credit & placement', p.prior.ms.concat(p.prior.transfers.map(function (t) { return 'Transfer: ' + t; })).join('  ·  ')]);
  }
  if (p.approvals && p.approvals.length) {
    var ap = p.approvals.slice(0, 8).map(function (a) { return ordinal_(a.grade) + ': ' + a.course + ' — ' + a.note; });
    if (p.approvals.length > 8) ap.push('…and ' + (p.approvals.length - 8) + ' more');
    notes.push(['Approvals this plan depends on', ap.join('  ·  ')]);
  }
  if (p.override && p.override.on) notes.push(['Counselor override', (p.override.reason || '') + (p.override.issues && p.override.issues.length ? '  (Open items: ' + p.override.issues.slice(0, 6).join('; ') + ')' : '')]);
  if (p.notes) notes.push(['Counselor notes', p.notes]);
  notes.forEach(function (n) {
    var para = body.appendParagraph(n[0] + ':  ' + clean_(n[1]));
    para.setAttributes(style_({ size: 6.8, color: C.INK })); para.setSpacingBefore(1); para.setSpacingAfter(1); para.setLineSpacing(1.05);
    para.editAsText().setBold(0, n[0].length, true).setForegroundColor(0, n[0].length, C.NAVY);
  });

  /* ---- page 2: reference ---- */
  var br = body.appendPageBreak();
  var ref = p.reference || { sections: [] };
  var t2 = body.appendParagraph('GRADUATION, SCHOLARSHIP & ELIGIBILITY REFERENCE');
  t2.setAttributes(style_({ size: 12, bold: true, color: C.NAVY })); t2.setSpacingAfter(1);
  var sub = body.appendParagraph(clean_(p.student.name) + '  ·  Projected graduation: Spring ' + p.classOf + '  ·  Woodward Academy requirements, State of Georgia requirements, HOPE & Zell Miller, NCAA  ·  current as of ' + (ref.updated || ''));
  sub.setAttributes(style_({ size: 6.8, color: C.MUTED })); sub.setSpacingAfter(2);
  rule_(body, C.RED, 2);
  var rt = body.appendTable([['', '']]);
  noBorder_(rt); rt.setColumnWidth(0, CONTENT_W / 2); rt.setColumnWidth(1, CONTENT_W / 2);
  [0, 1].forEach(function (col) {
    var cell = rt.getCell(0, col); pad_(cell, 4, 0, col === 0 ? 0 : 8, col === 0 ? 8 : 0);
    var first = true;
    ref.sections.filter(function (s) { return s.col === col; }).forEach(function (s) {
      var tp = first ? cell.getChild(0).asParagraph() : cell.appendParagraph(''); first = false;
      tp.setText(s.title.toUpperCase()).setAttributes(style_({ size: 7.5, bold: true, color: C.RED })); tp.setSpacingBefore(first ? 0 : 6); tp.setSpacingAfter(1);
      (s.rows || []).forEach(function (r) {
        var rp = cell.appendParagraph(r[0] + ':  ' + r[1]); rp.setAttributes(style_({ size: 6.8, color: C.INK })); rp.setSpacingAfter(0.5); rp.setSpacingBefore(0); rp.setLineSpacing(1.05);
        rp.editAsText().setBold(0, r[0].length, true).setForegroundColor(0, r[0].length, C.NAVY);
      });
      (s.items || []).forEach(function (it) {
        var li = cell.appendListItem(it); li.setGlyphType(DocumentApp.GlyphType.BULLET);
        li.setAttributes(style_({ size: 6.8, color: C.INK })); li.setSpacingAfter(0.5); li.setSpacingBefore(0); li.setLineSpacing(1.05);
        li.setIndentStart(10).setIndentFirstLine(2);
      });
    });
  });
  // remove the empty trailing paragraph Docs leaves after the last table if present
  try { var last = body.getChild(body.getNumChildren() - 1); if (last.getType() === DocumentApp.ElementType.PARAGRAPH && last.asParagraph().getText() === '' && body.getNumChildren() > 1) last.asParagraph().setFontSize(1); } catch (e) { /* ignore */ }
}

/* -------------------- helpers -------------------- */

function style_(o) {
  var s = {};
  s[DocumentApp.Attribute.FONT_FAMILY] = o.font || C.FONT;
  if (o.size) s[DocumentApp.Attribute.FONT_SIZE] = o.size;
  if (o.bold !== undefined) s[DocumentApp.Attribute.BOLD] = o.bold;
  if (o.color) s[DocumentApp.Attribute.FOREGROUND_COLOR] = o.color;
  return s;
}
function pad_(cell, t, b, l, r) { cell.setPaddingTop(t); cell.setPaddingBottom(b); cell.setPaddingLeft(l); cell.setPaddingRight(r); }
function borders_(table, color, w) { table.setBorderColor(color); table.setBorderWidth(w); }
function noBorder_(table) { table.setBorderWidth(0); table.setBorderColor('#ffffff'); }
function spacer_(body, size) { var p = body.appendParagraph(''); p.setAttributes(style_({ size: size })); p.setSpacingBefore(0); p.setSpacingAfter(0); p.setLineSpacing(1); return p; }
function rule_(body, color, h) {
  var t = body.appendTable([['']]); noBorder_(t); t.setColumnWidth(0, CONTENT_W);
  var c = t.getCell(0, 0); c.setBackgroundColor(color); pad_(c, 0, 0, 0, 0);
  var p = c.getChild(0).asParagraph(); p.setText(''); p.setAttributes(style_({ size: h })); p.setLineSpacing(1); p.setSpacingBefore(0); p.setSpacingAfter(0);
  spacer_(body, 3);
}
function sectionTitle_(body, text) {
  var p = body.appendParagraph(text); p.setAttributes(style_({ size: 7.5, bold: true, color: C.RED })); p.setSpacingBefore(2); p.setSpacingAfter(2); return p;
}
/** Put an array of text lines into a table cell (first line replaces the cell's initial paragraph). */
function setLines_(cell, lines, st) {
  var align = st.align === 'center' ? DocumentApp.HorizontalAlignment.CENTER : DocumentApp.HorizontalAlignment.LEFT;
  lines.forEach(function (ln, i) {
    var p = i === 0 ? cell.getChild(0).asParagraph().setText(ln) : cell.appendParagraph(ln);
    p.setAttributes(style_(st)); p.setAlignment(align); p.setSpacingBefore(0); p.setSpacingAfter(i === lines.length - 1 ? 0 : 1); p.setLineSpacing(1.05);
  });
}
/** Course name bold, trailing "(EP)" level regular, "Fall:/Spring:" prefix muted. */
function boldCourse_(cell) {
  for (var i = 0; i < cell.getNumChildren(); i++) {
    var p = cell.getChild(i).asParagraph(), txt = p.getText(); if (!txt) continue;
    var t = p.editAsText(); var start = 0;
    var m = txt.match(/^(Fall|Spring): /); if (m) { t.setForegroundColor(0, m[0].length - 1, C.SLATE); t.setBold(0, m[0].length - 1, true); start = m[0].length; }
    var lv = txt.match(/ \((CP|EP|HP|AP|EP\/HP)\)$/);
    var end = lv ? txt.length - lv[0].length - 1 : txt.length - 1;
    if (end >= start) t.setBold(start, end, true);
  }
}
function ordinal_(g) { return { 9: '9th', 10: '10th', 11: '11th', 12: '12th' }[g] || String(g); }
function fmt_(n) { return String(Math.round(Number(n) * 100) / 100); }
function clean_(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 1500); }
function esc_(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* -------------------- admin utilities (run once from the editor) -------------------- */

/** Run this once to grant permissions, then deploy. It also confirms your settings. */
function authorizeAndCheck() {
  DriveApp.getRootFolder(); DocumentApp.create('tmp').getId(); // prompts for Drive + Docs scopes
  var tmp = DriveApp.getFilesByName('tmp'); while (tmp.hasNext()) { var f = tmp.next(); if (f.getName() === 'tmp') f.setTrashed(true); }
  MailApp.getRemainingDailyQuota();
  if (prop_('LOGO_URL')) UrlFetchApp.fetch(prop_('LOGO_URL'));
  Logger.log('ACCESS_CODE set: ' + !!prop_('ACCESS_CODE') + ' | domain: ' + prop_('ALLOWED_COUNSELOR_DOMAIN', 'woodward.edu') + ' | mail quota left: ' + MailApp.getRemainingDailyQuota());
}

/** Optional: builds a sample document with fake data so you can inspect the layout without using the website. */
function buildSampleDoc() {
  var areas = [['eng', 'English', 4, 4, 'done'], ['math', 'Mathematics', 4, 3, 'part'], ['ss', 'Social Studies', 3, 3, 'done'], ['sci', 'Science', 4, 2, 'part'], ['wl', 'World Language', 2, 0, 'none'],
    ['pe', 'Physical Education', 0.5, 0.5, 'done'], ['fa', 'Fine Arts', 0.5, 0, 'none'], ['cap', 'Compassion Capstone', 0.5, 0, 'none'], ['elec', 'Electives', 3.5, 1, 'part'], ['total', 'Total Credits', 22, 14.5, 'part']]
    .map(function (a) { return { key: a[0], label: a[1], req: a[2], have: a[3], status: a[4], detail: '' }; });
  var rows = function (g) { return ['English', 'Mathematics', 'Social Studies', 'Science', 'World Language', 'Elective 1', 'Elective 2', 'Elective 3'].map(function (l, i) { return { label: l, kind: i < 5 ? 'core' : 'elec', cells: i === 4 ? ['Fall: Spanish 2 (EP)', 'Spring: Spanish 2 (EP)'] : i === 7 ? [] : ['Sample Course ' + (i + 1) + ' (EP)'] }; }); };
  var sample = {
    student: { name: 'Sample Student', email: 'student@example.com' }, counselor: { name: 'Sample Counselor', email: 'counselor@woodward.edu' }, date: '2026-10-16', dateText: 'October 16, 2026', classOf: 2030,
    grades: [9, 10, 11, 12].map(function (g) { return { grade: g, label: ordinal_(g) + ' Grade', year: (2017 + g) + '–' + String(2018 + g).slice(2), rows: rows(g), summer: g < 12 ? ['Geometry (Summer) (EP)'] : [] }; }),
    tracker: { areas: areas, ghsa: [{ grade: 9, need: 5, have: 6, met: true }, { grade: 10, need: 11, have: 12, met: true }, { grade: 11, need: 17, have: 14.5, met: false }, { grade: 12, need: 22, have: 14.5, met: false }], rigor: { have: 3 }, ncaa: { total: 11 } },
    cocurr: [{ name: 'Debate Team', status: 'Currently participating' }, { name: 'Robotics Club', status: 'Interested in exploring' }],
    prior: { ms: ['Physical Science (8th grade): 1 unit science credit'], transfers: [] }, approvals: [], override: { on: false }, notes: 'Sample notes.',
    reference: { updated: 'October 2026', sections: [{ title: 'Sample section', col: 0, rows: [['Label', 'Value']], items: ['Sample bullet'] }, { title: 'Sample right column', col: 1, items: ['Another bullet'] }] }
  };
  var doc = DocumentApp.create('SAMPLE — Four-Year Course Plan'); var w = []; buildDoc_(doc, sample, w); doc.saveAndClose();
  Logger.log(doc.getUrl() + ' warnings: ' + w.join(' | '));
}
