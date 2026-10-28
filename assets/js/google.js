/* Google sign-in (Google Identity Services) + Drive / Docs API calls.
 * The counselor signs in with their own account; the Doc is created in THEIR Drive (they are the owner),
 * then shared with the student as a view-only reader. Nothing passes through any other server.
 * Scope: drive.file only (the app can touch only files it creates). */
(function () {
  'use strict';
  const WA = window.WA = window.WA || {};
  (WA.versions = WA.versions || {})['google.js'] = '16';
  const CFG = window.WA_CONFIG || {};
  const DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';
  const SCOPE = 'openid email profile ' + DRIVE_FILE;

  let tokenClient = null, pending = null, token = null, expiresAt = 0;
  const G = { user: null, onChange: () => {} };

  const configured = () => !!CFG.GOOGLE_CLIENT_ID;
  const gisReady = () => !!(window.google && window.google.accounts && window.google.accounts.oauth2);
  G.configured = configured;

  function init() {
    if (tokenClient) return true;
    if (!configured() || !gisReady()) return false;
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CFG.GOOGLE_CLIENT_ID, scope: SCOPE, hd: CFG.COUNSELOR_EMAIL_DOMAIN || undefined,
      callback: r => {
        if (!pending) return; const p = pending; pending = null;
        if (r.error) return p.rej(new Error(r.error_description || r.error));
        const o = window.google.accounts.oauth2;
        if (o.hasGrantedAllScopes && !o.hasGrantedAllScopes(r, DRIVE_FILE)) return p.rej(new Error('Please allow access to create Google Docs in your Drive, then sign in again.'));
        if (!r.access_token) return p.rej(new Error('Google did not return a sign-in token. Please click “Sign in with Google” again.'));
        token = r.access_token; expiresAt = Date.now() + (Number(r.expires_in || 3600) - 90) * 1000; p.res(token);
      },
      error_callback: e => { if (pending) { const p = pending; pending = null; p.rej(new Error(e && e.type === 'popup_closed' ? 'The Google sign-in window was closed.' : (e && e.message) || 'Google sign-in was blocked. Allow pop-ups for this site and try again.')); } }
    });
    return true;
  }
  const HKEY = 'wa_signin_hint';
  let memHint = '';
  const getHint = () => { try { return sessionStorage.getItem(HKEY) || memHint; } catch (e) { return memHint; } };
  const setHint = v => { memHint = v || ''; try { if (v) sessionStorage.setItem(HKEY, v); else sessionStorage.removeItem(HKEY); } catch (e) { /* storage blocked: memory only */ } };
  function request(prompt, hint) {
    return new Promise((res, rej) => {
      if (!configured()) return rej(new Error('Google sign-in is not configured yet. An administrator must add GOOGLE_CLIENT_ID in assets/js/config.js.'));
      if (!init()) return rej(new Error(window.__waBoot && (window.__waBoot.failed || []).some(f => /Google sign-in library/.test(f)) ? 'Google’s sign-in library did not load: accounts.google.com looks blocked on this network or browser (an extension or school filter). Try another network or browser, or ask IT to allow accounts.google.com.' : 'Google sign-in is still loading. Wait a moment and try again (or check your connection).'));
      pending = { res, rej }; tokenClient.requestAccessToken(hint ? { prompt, hint } : { prompt });
    });
  }

  const EXPIRED = 'Your Google sign-in has expired or was not accepted (this happens after about an hour). Please click “Sign in with Google” again in Step 1, then retry. Your plan is still here.';
  async function api(url, opts, tok) {
    const r = await fetch(url, Object.assign({}, opts, { headers: Object.assign({ Authorization: 'Bearer ' + (tok || token) }, (opts && opts.headers) || {}) }));
    let data = null; const text = await r.text(); try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
    if (!r.ok) {
      if (r.status === 401) { const err = new Error(EXPIRED); err.status = 401; err.auth = true; G.expire(); throw err; }
      const m = (data && data.error && (data.error.message || data.error)) || r.statusText; const err = new Error(String(m)); err.status = r.status; throw err;
    }
    return data;
  }
  // forget the (expired) token and show the signed-out state, without revoking anything
  G.expire = function () { token = null; expiresAt = 0; const had = !!G.user; G.user = null; G.draftId = null; if (had) G.onChange(null); };
  // call at the start of a button click so a needed refresh pop-up is allowed by the browser
  G.ensureToken = async function () { if (!G.user) throw new Error('Please sign in with Google first.'); await validToken(); };

  G.signIn = async function () {
    const hint = getHint();
    const t = await request(hint ? '' : 'select_account', hint); // after the first sign-in, skip the account chooser
    const u = await api('https://www.googleapis.com/oauth2/v3/userinfo', {}, t);
    const email = String(u.email || '').toLowerCase(), dom = String(CFG.COUNSELOR_EMAIL_DOMAIN || '').toLowerCase();
    if (u.email_verified === false) throw new Error('That Google account\u2019s email is not verified.');
    if (dom && !email.endsWith('@' + dom)) {
      try { window.google.accounts.oauth2.revoke(t, () => {}); } catch (e) { /* ignore */ }
      token = null; throw new Error('Please sign in with your @' + dom + ' account (you used ' + email + ').');
    }
    G.user = { email, name: u.name || email, picture: u.picture || '' }; setHint(email);
    G.onChange(G.user); return G.user;
  };
  G.signOut = function () {
    try { if (token && gisReady()) window.google.accounts.oauth2.revoke(token, () => {}); } catch (e) { /* ignore */ }
    token = null; expiresAt = 0; G.user = null; G.draftId = null; setHint(''); G.onChange(null);
  };
  async function validToken() {
    if (token && Date.now() < expiresAt) return token;
    const t = await request('', G.user && G.user.email); // refresh quietly for the same account (may flash a pop-up)
    return t;
  }

  /* ---------- create the Doc in the signed-in counselor's Drive, fix margins, share view-only ---------- */
  G.createPlanDoc = async function (payload, opts) {
    if (!G.user) throw new Error('Please sign in with Google first.');
    const tok = await validToken();
    const warnings = [];
    const title = 'Four-Year Course Plan \u2014 ' + payload.student.name + ' (Graduating ' + payload.classOf + ')';
    const html = WA.docbuilder.buildHtml(payload);

    // 1) upload HTML and let Drive convert it to a Google Doc (owned by the signed-in counselor)
    const b = 'wa' + Math.random().toString(36).slice(2);
    const body = '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify({ name: title, mimeType: 'application/vnd.google-apps.document' }) +
      '\r\n--' + b + '\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n' + html + '\r\n--' + b + '--';
    const file = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body }, tok);
    const id = file.id;
    const url = 'https://docs.google.com/document/d/' + id + '/edit';
    const result = { id, url, warnings };

    // 2) 0.5" margins, page-break and logo
    try { await finishDoc(id, tok, opts && opts.logoUrl, warnings, payload.chipDefs); }
    catch (e) { warnings.push('The document was created, but margins/page break could not be applied automatically (' + e.message + '). Set Page setup to 0.5" margins and add a page break before the reference section.'); }

    // 3) share with the student, view only
    try {
      const msg = payload.counselor.name + ' has shared your four-year course plan with you (projected graduation: Spring ' + payload.classOf + '). You have view-only access.';
      await api('https://www.googleapis.com/drive/v3/files/' + id + '/permissions?sendNotificationEmail=true&emailMessage=' + encodeURIComponent(msg),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'reader', type: 'user', emailAddress: payload.student.email }) }, tok);
      result.shared = true;
    } catch (e) { result.shared = false; warnings.push('The document was created in your Drive but could not be shared with ' + payload.student.email + ' (' + e.message + '). Share it manually as Viewer.'); }
    return result;
  };

  /* ---- walk the real document structure (including tables) so every index comes from Google, not guesses ---- */
  function walk(content, visit, inTable) {
    let first = true;
    (content || []).forEach(el => {
      if (el.paragraph) { visit({ type: 'p', el, inTable: !!inTable, firstInCell: !!inTable && first }); first = false; }
      else if (el.table) {
        first = false;
        const tb = el.table, info = { type: 't', el, rows: tb.rows, cols: tb.columns, start: el.startIndex };
        visit(info);
        (tb.tableRows || []).forEach(r => (r.tableCells || []).forEach(c => walk(c.content, visit, true)));
      }
    });
  }
  function scan(doc) {
    const out = { tables: [], paras: [], tokens: {}, pbs: [], dd: [], ss: [], se: [], cb: [] };
    walk(doc.body && doc.body.content, n => {
      if (n.type === 't') { out.tables.push(n); return; }
      out.paras.push(n);
      (n.el.paragraph.elements || []).forEach(pe => {
        const c = pe.textRun && pe.textRun.content; if (!c) return;
        ['[[LOGO]]'].forEach(tk => { const i = c.indexOf(tk); if (i >= 0 && out.tokens[tk] == null) out.tokens[tk] = pe.startIndex + i; });
        const pbi = c.indexOf('[[PB]]'); if (pbi >= 0) out.pbs.push(pe.startIndex + pbi);
        const re = /\[\[DD:([a-z0-9]+)\]\]/g; let m; while ((m = re.exec(c))) out.dd.push({ key: m[1], idx: pe.startIndex + m.index, len: m[0].length });
        const rs = /\[\[S:([a-z0-9-]+)\]\]/g; let q; while ((q = rs.exec(c))) out.ss.push({ name: q[1], idx: pe.startIndex + q.index, len: q[0].length });
        const rend = /\[\[\/S\]\]/g; while ((q = rend.exec(c))) out.se.push({ idx: pe.startIndex + q.index, len: q[0].length });
        const ci = c.indexOf('[[CB]]'); if (ci >= 0) out.cb.push({ idx: pe.startIndex + ci, len: 6, pStart: n.el.startIndex, pEnd: n.el.endIndex });
      });
    });
    return out;
  }
  const PT = n => ({ magnitude: n, unit: 'PT' });
  // expected tables in document order: [columns, column widths in points]
  // page 1 tables, then (when distinctions were chosen) the page-2 rule + distinctions grid; the last rule + 2-column table are always the eligibility reference
  const FRONT_SPECS = [
    [2, [230, 310], 'MIDDLE'],             // header: logo | title (centered vertically)
    [1, [540]],                            // red rule
    [4, [78, 150, 112, 200]],              // student / counselor info
    [5, [54, 121.5, 121.5, 121.5, 121.5]], // four-year grid
    [5, [108, 108, 108, 108, 108]],        // requirement tracker
    [2, [270, 270]],                       // cocurriculars
    [1, [540]],                            // red rule (page 2: college & career interests)
    [2, [150, 390]],                       // college & career interests: question | response
    [1, [540]],                            // red rule (distinctions)
    [2, [270, 270], 'TOP', { dist: true }] // distinctions: two columns, spacer rows between
  ];
  const REAR_SPECS = [[1, [540]], [2, [270, 270], 'TOP', { ref: true }]];   // red rule + eligibility reference columns (last page)
  function assignSpecs(tables) {
    const n = tables.length, rear = n >= 2 && tables[n - 1].cols === 2 && tables[n - 2].cols === 1 ? 2 : 0, map = new Map(); let si = 0;
    tables.slice(0, n - rear).forEach(t => { let k = si; while (k < FRONT_SPECS.length && FRONT_SPECS[k][0] !== t.cols) k++; if (k >= FRONT_SPECS.length) return; si = k + 1; map.set(t, FRONT_SPECS[k]); });
    if (rear) { map.set(tables[n - 2], REAR_SPECS[0]); map.set(tables[n - 1], REAR_SPECS[1]); }
    return map;
  }
  function layoutRequests(sc) {
    const r = [], used = [], specs = assignSpecs(sc.tables);
    let refRange = null;
    sc.tables.forEach(t => {
      const spec = specs.get(t); if (!spec) return;
      const widths = spec[1], isRule = t.cols === 1, align = spec[2] || 'TOP', flags = spec[3] || {};
      const loc = { index: t.start };
      widths.forEach((w, ci) => r.push({ updateTableColumnProperties: { tableStartLocation: loc, columnIndices: [ci], tableColumnProperties: { widthType: 'FIXED_WIDTH', width: PT(w) }, fields: 'widthType,width' } }));
      r.push({ updateTableCellStyle: { tableRange: { tableCellLocation: { tableStartLocation: loc, rowIndex: 0, columnIndex: 0 }, rowSpan: t.rows, columnSpan: t.cols },
        tableCellStyle: isRule ? { paddingTop: PT(0), paddingBottom: PT(0), paddingLeft: PT(0), paddingRight: PT(0), contentAlignment: 'TOP' } : { paddingTop: PT(3), paddingBottom: PT(3), paddingLeft: PT(4), paddingRight: PT(4), contentAlignment: align },
        fields: 'paddingTop,paddingBottom,paddingLeft,paddingRight,contentAlignment' } });
      if (isRule) r.push({ updateTableRowStyle: { tableStartLocation: loc, rowIndices: [0], tableRowStyle: { minRowHeight: PT(3) }, fields: 'minRowHeight' } });
      if (flags.dist) {   // clear gutter between the two columns, and generous spacer rows between distinctions
        [0, 1].forEach(ci => r.push({ updateTableCellStyle: { tableRange: { tableCellLocation: { tableStartLocation: loc, rowIndex: 0, columnIndex: ci }, rowSpan: t.rows, columnSpan: 1 },
          tableCellStyle: { paddingTop: PT(0), paddingBottom: PT(0), paddingLeft: PT(ci ? 10 : 0), paddingRight: PT(ci ? 0 : 10), contentAlignment: 'TOP' }, fields: 'paddingTop,paddingBottom,paddingLeft,paddingRight,contentAlignment' } }));
        for (let ri = 1; ri < t.rows; ri += 2) r.push({ updateTableRowStyle: { tableStartLocation: loc, rowIndices: [ri], tableRowStyle: { minRowHeight: PT(16) }, fields: 'minRowHeight' } });
      }
      used.push({ t, rule: isRule });
      if (flags.ref) refRange = { start: t.el.startIndex, end: t.el.endIndex };
    });

    // tight, uniform paragraph spacing (Docs' default 1.15 spacing otherwise pushes page 1 onto a second page)
    const last = sc.paras.length ? sc.paras[sc.paras.length - 1].el.endIndex : 2;
    r.push({ updateParagraphStyle: { range: { startIndex: 1, endIndex: Math.max(2, last - 1) }, paragraphStyle: { lineSpacing: 100, spaceAbove: PT(0), spaceBelow: PT(0) }, fields: 'lineSpacing,spaceAbove,spaceBelow' } });
    // keep course lines from touching inside grid cells
    sc.paras.forEach(n => {
      const pe = n.el.paragraph.elements || [];
      const text = pe.map(e => (e.textRun && e.textRun.content) || '').join('').replace(/[\s\u00a0]/g, '');
      const ruleCell = used.some(u => u.rule && n.el.startIndex >= u.t.start && n.el.endIndex <= u.t.el.endIndex);
      if (ruleCell) r.push({ updateTextStyle: { range: { startIndex: n.el.startIndex, endIndex: n.el.endIndex }, textStyle: { fontSize: PT(1) }, fields: 'fontSize' } });
      else if (!text && !n.inTable) r.push({ updateTextStyle: { range: { startIndex: n.el.startIndex, endIndex: n.el.endIndex }, textStyle: { fontSize: PT(3) }, fields: 'fontSize' } });
      else if (n.inTable && text && !ruleCell) r.push({ updateParagraphStyle: { range: { startIndex: n.el.startIndex, endIndex: n.el.endIndex }, paragraphStyle: { spaceBelow: PT(1) }, fields: 'spaceBelow' } });
      // page 2: a clear gap above every section title (all-caps heading) except the first in each column
      const raw = pe.map(e => (e.textRun && e.textRun.content) || '').join('').replace(/\n$/, '').trim();
      const isTitle = raw.length > 3 && /[A-Z]/.test(raw) && raw === raw.toUpperCase();
      if (refRange && isTitle && !n.firstInCell && n.el.startIndex >= refRange.start && n.el.endIndex <= refRange.end)
        r.push({ updateParagraphStyle: { range: { startIndex: n.el.startIndex, endIndex: n.el.endIndex }, paragraphStyle: { spaceAbove: PT(10), spaceBelow: PT(2) }, fields: 'spaceAbove,spaceBelow' } });
    });
    return r;
  }
  /* ---- dropdown chips for course cells (Google Docs API: 2-50 options per dropdown) ---- */
  const hexRgb = h => ({ red: parseInt(h.slice(1, 3), 16) / 255, green: parseInt(h.slice(3, 5), 16) / 255, blue: parseInt(h.slice(5, 7), 16) / 255 });
  const OPT_COLORS = { none: ['#f1f4f4', '#6b6b6b'], appr: ['#fdf0d8', '#8a5a00'], norm: ['#e6eef4', '#002e53'] };
  const optStyle = k => ({ backgroundColor: { color: { rgbColor: hexRgb(OPT_COLORS[k][0]) } }, foregroundColor: { color: { rgbColor: hexRgb(OPT_COLORS[k][1]) } } });
  const plainLabel = l => (!l || /^— none —$/.test(l)) ? '—' : String(l).replace(/\s*⚑$/, '');
  function chipPlan(defs, dd) {
    const creates = [], edits = [], labels = {}, made = {}; let n = 0;
    dd.forEach(t => {
      const d = defs && defs[t.key];
      if (!labels[t.key]) labels[t.key] = d ? plainLabel((function (o) { return o.full || o.label; })(d.options.find(o => o.value === d.selected) || d.options[0] || {})) : '—';
      if (!d || !Array.isArray(d.options) || d.options.length < 2) return;
      if (!made[t.key]) {
        let selectedId = null;
        const options = d.options.slice(0, 50).map(o => {
          const id = 'dropdownItem.o' + (n++).toString(36); if (o.value === d.selected) selectedId = id;
          return { optionId: id, displayValue: String(o.label || o.full || '—').slice(0, 200), textStyle: optStyle(o.value === '' ? 'none' : o.appr ? 'appr' : 'norm') };
        });
        made[t.key] = { defId: 'kix.' + t.key, selectedId: selectedId || options[0].optionId };
        creates.push({ createDropdownDefinition: { dropdownDefinition: { dropdownDefinitionId: made[t.key].defId, dropdownDefinitionProperties: { title: String(d.title || 'Course').slice(0, 200), options } } } });
      }
      edits.push({ idx: t.idx, reqs: [{ deleteContentRange: { range: { startIndex: t.idx, endIndex: t.idx + t.len } } }, { insertDropdown: { location: { index: t.idx }, dropdownDefinitionId: made[t.key].defId, selectedOptionId: made[t.key].selectedId } }] });
    });
    const keys = Object.keys(labels);
    return { creates, edits, textFallback: keys.map(k => ({ replaceAllText: { containsText: { text: '[[DD:' + k + ']]', matchCase: true }, replaceText: labels[k] } })), count: edits.length };
  }
  /* ---- refreshable text (named ranges) and real checklist boxes ---- */
  function slotPlan(sc) {
    const seq = sc.ss.map(x => ({ t: 's', x })).concat(sc.se.map(x => ({ t: 'e', x }))).sort((a, b) => a.x.idx - b.x.idx), pairs = []; let cur = null;
    seq.forEach(q => { if (q.t === 's') cur = q.x; else if (cur) { pairs.push({ name: cur.name, s: cur, e: q.x }); cur = null; } });
    const edits = [], names = Array.from(new Set(pairs.map(p => p.name)));
    pairs.forEach(p => {
      edits.push({ idx: p.e.idx, reqs: [{ deleteContentRange: { range: { startIndex: p.e.idx, endIndex: p.e.idx + p.e.len } } }] });
      edits.push({ idx: p.s.idx, reqs: [{ deleteContentRange: { range: { startIndex: p.s.idx, endIndex: p.s.idx + p.s.len } } }, { createNamedRange: { name: p.name, range: { startIndex: p.s.idx, endIndex: p.e.idx - p.s.len } } }] });
    });
    sc.cb.forEach(c => edits.push({ idx: c.idx, reqs: [{ deleteContentRange: { range: { startIndex: c.idx, endIndex: c.idx + c.len } } }, { createParagraphBullets: { range: { startIndex: c.pStart, endIndex: c.pEnd - c.len }, bulletPreset: 'BULLET_CHECKBOX' } }] }));
    const fallback = names.map(n => ({ replaceAllText: { containsText: { text: '[[S:' + n + ']]', matchCase: true }, replaceText: '' } }));
    if (names.length) fallback.push({ replaceAllText: { containsText: { text: '[[/S]]', matchCase: true }, replaceText: '' } });
    if (sc.cb.length) fallback.push({ replaceAllText: { containsText: { text: '[[CB]]', matchCase: true }, replaceText: '\u2610 ' } });
    return { edits, fallback, count: pairs.length + sc.cb.length };
  }
  async function finishDoc(id, tok, logoUrl, warnings, chipDefs) {
    const doc = await api('https://docs.googleapis.com/v1/documents/' + id, {}, tok);
    const sc = scan(doc); const logo = sc.tokens['[[LOGO]]'];
    const margins = { updateDocumentStyle: { documentStyle: { marginTop: PT(36), marginBottom: PT(36), marginLeft: PT(36), marginRight: PT(36), pageSize: { width: PT(612), height: PT(792) } }, fields: 'marginTop,marginBottom,marginLeft,marginRight,pageSize' } };
    let layout = []; try { layout = layoutRequests(sc); } catch (e) { warnings.push('Layout clean-up was skipped (' + e.message + ').'); }
    const cp = chipPlan(chipDefs, sc.dd), sp = slotPlan(sc);
    // style requests move no indices, so they go first; edits that change text go last, later-in-document first
    const build = o => {
      const edits = [], tail = [];
      sc.pbs.forEach(pb => edits.push({ idx: pb, reqs: [{ deleteContentRange: { range: { startIndex: pb, endIndex: pb + 6 } } }, { insertPageBreak: { location: { index: pb } } }] }));
      if (logo != null) {
        if (o.img && logoUrl) edits.push({ idx: logo, reqs: [{ deleteContentRange: { range: { startIndex: logo, endIndex: logo + 8 } } }, { insertInlineImage: { uri: logoUrl, location: { index: logo }, objectSize: { width: PT(150), height: PT(43) } } }] });
        else tail.push({ replaceAllText: { containsText: { text: '[[LOGO]]', matchCase: true }, replaceText: 'WOODWARD ACADEMY' } });
      }
      if (o.chips) edits.push.apply(edits, cp.edits); else tail.push.apply(tail, cp.textFallback);
      if (o.nr) edits.push.apply(edits, sp.edits); else tail.push.apply(tail, sp.fallback);
      edits.sort((a, b) => b.idx - a.idx);
      const r = [margins];
      if (o.layout) r.push.apply(r, layout);
      if (o.chips) r.push.apply(r, cp.creates);
      edits.forEach(e => r.push.apply(r, e.reqs));
      return r.concat(tail);
    };
    const send = r => api('https://docs.googleapis.com/v1/documents/' + id + ':batchUpdate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: r }) }, tok);
    const W = { logo: 'The logo image could not be inserted, so a text wordmark was used.', chips: 'Course dropdowns could not be added, so courses appear as plain text.',
      nr: 'The “Completed” checkboxes and the Refresh feature could not be added, so tracker items appear as plain text.', layout: 'Table layout clean-up could not be applied; margins, page break and logo were set.' };
    const combos = [
      { o: { img: 1, chips: 1, nr: 1, layout: 1 }, w: [] }, { o: { img: 0, chips: 1, nr: 1, layout: 1 }, w: ['logo'] }, { o: { img: 1, chips: 0, nr: 1, layout: 1 }, w: ['chips'] },
      { o: { img: 1, chips: 1, nr: 0, layout: 1 }, w: ['nr'] }, { o: { img: 1, chips: 0, nr: 0, layout: 1 }, w: ['chips', 'nr'] }, { o: { img: 0, chips: 0, nr: 0, layout: 1 }, w: ['logo', 'chips', 'nr'] },
      { o: { img: 0, chips: 0, nr: 0, layout: 0 }, w: ['logo', 'chips', 'nr', 'layout'] }
    ];
    const seen = new Set(), attempts = [];
    combos.forEach(c => { const o = { img: !!c.o.img, chips: cp.count ? !!c.o.chips : true, nr: sp.count ? !!c.o.nr : true, layout: !!c.o.layout }, sig = JSON.stringify(o); if (seen.has(sig)) return; seen.add(sig); attempts.push({ o, w: c.w.filter(k => (k === 'chips' ? cp.count : k === 'nr' ? sp.count : true)) }); });
    let lastErr;
    for (const a of attempts) {
      try { await send(build(a.o)); a.w.forEach(k => warnings.push(W[k])); return; } catch (e) { lastErr = e; }
    }
    throw lastErr;
  }

  /* ---------- private drafts in the counselor's own Drive (never shared, never downloaded to the computer) ---------- */
  const FOLDER_NAME = 'WA Course Planner Drafts';
  G.draftId = null;
  async function draftFolder(tok) {
    const q = "mimeType='application/vnd.google-apps.folder' and name='" + FOLDER_NAME + "' and trashed=false";
    const r = await api('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id)&pageSize=1', {}, tok);
    if (r && r.files && r.files[0]) return r.files[0].id;
    const f = await api('https://www.googleapis.com/drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }) }, tok);
    return f.id;
  }
  function multipart(meta, content, type) {
    const b = 'wa' + Math.random().toString(36).slice(2);
    return { b, body: '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + b + '\r\nContent-Type: ' + (type || 'application/json') + '; charset=UTF-8\r\n\r\n' + content + '\r\n--' + b + '--' };
  }

  G.saveDraft = async function (state, name) {
    if (!G.user) throw new Error('Please sign in with Google first.');
    const tok = await validToken(); const json = JSON.stringify(state);
    if (G.draftId) {
      try {
        const m = multipart({ name }, json);
        const f = await api('https://www.googleapis.com/upload/drive/v3/files/' + G.draftId + '?uploadType=multipart&fields=id,name', { method: 'PATCH', headers: { 'Content-Type': 'multipart/related; boundary=' + m.b }, body: m.body }, tok);
        return { id: f.id, name: f.name || name, updated: true };
      } catch (e) { if (e.status !== 404 && e.status !== 403) throw e; G.draftId = null; /* file was deleted — save a new one */ }
    }
    const folder = await draftFolder(tok);
    const m = multipart({ name, parents: [folder], mimeType: 'application/json', appProperties: { waDraft: '1' } }, json);
    const f = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + m.b }, body: m.body }, tok);
    G.draftId = f.id; return { id: f.id, name: f.name || name, updated: false };
  };
  G.listDrafts = async function () {
    if (!G.user) throw new Error('Please sign in with Google first.');
    const tok = await validToken();
    const q = "appProperties has { key='waDraft' and value='1' } and trashed=false";
    const r = await api('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&orderBy=modifiedTime%20desc&pageSize=50&fields=files(id,name,modifiedTime)', {}, tok);
    return (r && r.files) || [];
  };
  G.loadDraft = async function (id) {
    const tok = await validToken();
    const data = await api('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media', {}, tok);
    if (data && data.format === 'wa-placement') throw new Error('This is an older encrypted .placement file from a test version and can no longer be opened. Please delete it from the WA Course Planner Drafts folder.');
    G.draftId = id; return data;
  };
  G.trashDraft = async function (id) {
    const tok = await validToken();
    await api('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?fields=id', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) }, tok);
    if (G.draftId === id) G.draftId = null;
  };

  /* ---------- plan copy + "Refresh tracker from Doc" ---------- */
  const DOCS = 'https://docs.googleapis.com/v1/documents/', DRIVE = 'https://www.googleapis.com/drive/v3/files/';
  /** Saves a private copy of the submitted plan in the counselor's drafts folder and links it to the Doc. */
  G.savePlanCopy = async function (docId, copy, name) {
    if (!G.user) throw new Error('Please sign in with Google first.');
    const tok = await validToken(), folder = await draftFolder(tok);
    const m = multipart({ name: 'PLAN COPY \u2014 ' + name, parents: [folder], mimeType: 'application/json', appProperties: { waPlanCopy: '1', waDoc: docId } }, JSON.stringify(copy));
    const f = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + m.b }, body: m.body }, tok);
    await api(DRIVE + encodeURIComponent(docId) + '?fields=id', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appProperties: { waDoc: '1', waCopy: f.id } }) }, tok);
    return f.id;
  };
  G.listPlanDocs = async function () {
    if (!G.user) throw new Error('Please sign in with Google first.');
    const tok = await validToken();
    const q = "appProperties has { key='waDoc' and value='1' } and mimeType='application/vnd.google-apps.document' and trashed=false";
    const r = await api('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&orderBy=modifiedTime%20desc&pageSize=50&fields=files(id,name,modifiedTime)', {}, tok);
    return (r && r.files) || [];
  };
  const tabOf = doc => (doc.tabs && doc.tabs[0] && doc.tabs[0].documentTab) || doc;
  const getTabDoc = (id, tok) => api(DOCS + encodeURIComponent(id) + '?includeTabsContent=true', {}, tok);
  // Google's response nests things in more than one possible way, so look for a field by name instead of assuming one shape
  function deepFind(o, name, depth) {
    if (!o || typeof o !== 'object' || (depth || 0) > 5) return undefined;
    if (o[name] != null && typeof o[name] !== 'object') return o[name];
    for (const k of Object.keys(o)) { const v = deepFind(o[k], name, (depth || 0) + 1); if (v !== undefined) return v; }
    return undefined;
  }
  function findOptions(def) {
    if (!def || typeof def !== 'object') return [];
    const props = def.dropdownDefinitionProperties || def; if (Array.isArray(props.options)) return props.options;
    for (const k of Object.keys(def)) { const v = def[k]; if (Array.isArray(v) && v.length && v[0] && typeof v[0] === 'object' && (v[0].optionId || v[0].id || v[0].displayValue)) return v; if (v && typeof v === 'object' && !Array.isArray(v)) { const r = findOptions(v); if (r.length) return r; } }
    return [];
  }
  function readChips(tab) {
    const defs = tab.dropdownDefinitions || {}, chips = [], kinds = new Set(), optMap = {};
    Object.keys(defs).forEach(id => findOptions(defs[id]).forEach((o, i) => { const oid = o.optionId || o.id; if (oid) optMap[oid] = { label: o.displayValue || o.text || o.label || null, index: i }; }));
    walk(tab.body && tab.body.content, n => {
      if (n.type === 't') return;
      (n.el.paragraph.elements || []).forEach(pe => {
        Object.keys(pe).forEach(k => { if (!/^(startIndex|endIndex|textRun)$/.test(k)) kinds.add(k); });
        const dd = pe.dropdown || Object.keys(pe).map(k => (/dropdown/i.test(k) ? pe[k] : null)).find(x => x && typeof x === 'object');
        if (!dd) return;
        const id = deepFind(dd, 'dropdownDefinitionId') || deepFind(dd, 'definitionId'), sel = deepFind(dd, 'selectedOptionId') || deepFind(dd, 'optionId'), hit = (sel && optMap[sel]) || null;
        chips.push({ key: String(id || '').replace(/^kix\./, ''), label: hit ? hit.label : null, index: hit ? hit.index : null, selectedId: sel || null, defId: id || null });
      });
    });
    return { chips, kinds: Array.from(kinds), options: Object.keys(optMap).length };
  }
  function textBetween(tab, s, e) {
    let out = '';
    walk(tab.body && tab.body.content, n => { if (n.type === 't') return; (n.el.paragraph.elements || []).forEach(pe => { const c = pe.textRun && pe.textRun.content; if (c == null) return; const a = Math.max(s, pe.startIndex), b = Math.min(e, pe.endIndex); if (b > a) out += c.slice(a - pe.startIndex, b - pe.startIndex); }); });
    return out;
  }
  function cellAt(tab, idx) {
    let hit = null;
    ((tab.body && tab.body.content) || []).forEach(el => { if (!el.table) return; (el.table.tableRows || []).forEach((row, ri) => (row.tableCells || []).forEach((cell, ci) => { if (idx >= cell.startIndex && idx < cell.endIndex) hit = { start: el.startIndex, r: ri, c: ci }; })); });
    return hit;
  }
  /** Reads the dropdown choices from the Doc, lets compute() recalculate, then rewrites the tracker text in place. */
  G.refreshFromDoc = async function (docId, compute) {
    if (!G.user) throw new Error('Please sign in with Google first.');
    const tok = await validToken();
    const meta = await api(DRIVE + encodeURIComponent(docId) + '?fields=id,name,appProperties', {}, tok);
    const copyId = meta.appProperties && meta.appProperties.waCopy;
    if (!copyId) { const e = new Error('This Doc was created before the Refresh feature, so there is no saved plan to refresh from.'); e.nocopy = true; throw e; }
    const copy = await api(DRIVE + encodeURIComponent(copyId) + '?alt=media', {}, tok);
    let doc = await getTabDoc(docId, tok), tab = tabOf(doc);
    const ranges = tab.namedRanges || {};
    if (!Object.keys(ranges).some(k => k.indexOf('wa-t-') === 0)) { const e = new Error('The tracker areas could not be found in this Doc (they may have been deleted), so it can’t be refreshed.'); e.nocopy = true; throw e; }
    const rc = readChips(tab);
    if (!rc.chips.length) { const e = new Error('No dropdown choices could be read from this Doc, so nothing was changed. (Element types found in the Doc: ' + (rc.kinds.join(', ') || 'text only') + '.)'); e.nochips = true; throw e; }
    const out = compute(copy, rc.chips), slots = out.slots || {};
    if (out.summary && out.summary.matched === 0) { const f = rc.chips[0] || {}; const e = new Error('The planner read ' + rc.chips.length + ' dropdowns from the Doc but could not match any of them to the saved plan, so nothing was changed. (First dropdown: id “' + (f.defId || '?') + '”, selected option “' + (f.selectedId || '?') + '”, text “' + (f.label == null ? 'not found' : f.label) + '”; options known to the Doc: ' + rc.options + '.)'); e.nochips = true; throw e; }
    // 1) rewrite each tracker text (latest position first so earlier positions stay valid)
    const ops = [];
    Object.keys(slots).forEach(name => { const e = ranges[name]; if (e) (e.namedRanges || []).forEach(nr => { const r = (nr.ranges || [])[0]; if (r) ops.push({ name, s: r.startIndex, e: r.endIndex, text: slots[name].text }); }); });
    ops.sort((a, b) => b.s - a.s);
    const diffs = ops.map(o => ({ name: o.name, before: textBetween(tab, o.s, o.e), after: o.text })).filter(x => x.before !== x.after);
    const reqs = Array.from(new Set(ops.map(o => o.name))).map(name => ({ deleteNamedRange: { name } }));
    ops.forEach(o => { reqs.push({ deleteContentRange: { range: { startIndex: o.s, endIndex: o.e } } }, { insertText: { location: { index: o.s }, text: o.text } }, { createNamedRange: { name: o.name, range: { startIndex: o.s, endIndex: o.s + o.text.length } } }); });
    if (reqs.length) await api(DOCS + encodeURIComponent(docId) + ':batchUpdate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: reqs, writeControl: { requiredRevisionId: doc.revisionId } }) }, tok);
    // 2) colors: text color for each item, and the shaded background of each tracker box
    doc = await getTabDoc(docId, tok); tab = tabOf(doc); const style = [], rgb = h => ({ red: parseInt(h.slice(1, 3), 16) / 255, green: parseInt(h.slice(3, 5), 16) / 255, blue: parseInt(h.slice(5, 7), 16) / 255 });
    Object.keys(slots).forEach(name => { const sl = slots[name], e = (tab.namedRanges || {})[name]; if (!e) return;
      (e.namedRanges || []).forEach(nr => (nr.ranges || []).forEach(r => {
        if (sl.fg) style.push({ updateTextStyle: { range: { startIndex: r.startIndex, endIndex: r.endIndex }, textStyle: { foregroundColor: { color: { rgbColor: rgb(sl.fg) } } }, fields: 'foregroundColor' } });
        if (sl.cell && sl.bg) { const c = cellAt(tab, r.startIndex); if (c) style.push({ updateTableCellStyle: { tableRange: { tableCellLocation: { tableStartLocation: { index: c.start }, rowIndex: c.r, columnIndex: c.c }, rowSpan: 1, columnSpan: 1 }, tableCellStyle: { backgroundColor: { color: { rgbColor: rgb(sl.bg) } } }, fields: 'backgroundColor' } }); }
      })); });
    if (style.length) await api(DOCS + encodeURIComponent(docId) + ':batchUpdate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: style }) }, tok);
    // 3) keep the saved plan copy in step with the Doc
    if (out.copy) await api('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(copyId) + '?uploadType=media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(out.copy) }, tok);
    return { name: meta.name, url: 'https://docs.google.com/document/d/' + docId + '/edit', updated: ops.length, summary: out.summary || {}, diffs, chipsRead: rc.chips.length, kinds: rc.kinds };
  };

  WA.google = G;
})();
