/* Google sign-in (Google Identity Services) + Drive / Docs API calls.
 * The counselor signs in with their own account; the Doc is created in THEIR Drive (they are the owner),
 * then shared with the student as a view-only reader. Nothing passes through any other server.
 * Scope: drive.file only (the app can touch only files it creates). */
(function () {
  'use strict';
  const WA = window.WA = window.WA || {};
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
        token = r.access_token; expiresAt = Date.now() + (Number(r.expires_in || 3600) - 90) * 1000; p.res(token);
      },
      error_callback: e => { if (pending) { const p = pending; pending = null; p.rej(new Error(e && e.type === 'popup_closed' ? 'The Google sign-in window was closed.' : (e && e.message) || 'Google sign-in was blocked. Allow pop-ups for this site and try again.')); } }
    });
    return true;
  }
  function request(prompt) {
    return new Promise((res, rej) => {
      if (!configured()) return rej(new Error('Google sign-in is not configured yet. An administrator must add GOOGLE_CLIENT_ID in assets/js/config.js.'));
      if (!init()) return rej(new Error('Google sign-in is still loading. Wait a moment and try again (or check your connection).'));
      pending = { res, rej }; tokenClient.requestAccessToken({ prompt });
    });
  }

  async function api(url, opts, tok) {
    const r = await fetch(url, Object.assign({}, opts, { headers: Object.assign({ Authorization: 'Bearer ' + (tok || token) }, (opts && opts.headers) || {}) }));
    let data = null; const text = await r.text(); try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
    if (!r.ok) { const m = (data && data.error && (data.error.message || data.error)) || r.statusText; const err = new Error(String(m)); err.status = r.status; throw err; }
    return data;
  }

  G.signIn = async function () {
    const t = await request('select_account');
    const u = await api('https://www.googleapis.com/oauth2/v3/userinfo', {}, t);
    const email = String(u.email || '').toLowerCase(), dom = String(CFG.COUNSELOR_EMAIL_DOMAIN || '').toLowerCase();
    if (u.email_verified === false) throw new Error('That Google account\u2019s email is not verified.');
    if (dom && !email.endsWith('@' + dom)) {
      try { window.google.accounts.oauth2.revoke(t, () => {}); } catch (e) { /* ignore */ }
      token = null; throw new Error('Please sign in with your @' + dom + ' account (you used ' + email + ').');
    }
    G.user = { email, name: u.name || email, picture: u.picture || '' };
    G.onChange(G.user); return G.user;
  };
  G.signOut = function () {
    try { if (token && gisReady()) window.google.accounts.oauth2.revoke(token, () => {}); } catch (e) { /* ignore */ }
    token = null; expiresAt = 0; G.user = null; G.draftId = null; G.onChange(null);
  };
  async function validToken() {
    if (token && Date.now() < expiresAt) return token;
    const t = await request(''); // refresh (may show a brief pop-up)
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
    try { await finishDoc(id, tok, opts && opts.logoUrl, warnings); }
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
    (content || []).forEach(el => {
      if (el.paragraph) visit({ type: 'p', el, inTable: !!inTable });
      else if (el.table) {
        const tb = el.table, info = { type: 't', el, rows: tb.rows, cols: tb.columns, start: el.startIndex };
        visit(info);
        (tb.tableRows || []).forEach(r => (r.tableCells || []).forEach(c => walk(c.content, visit, true)));
      }
    });
  }
  function scan(doc) {
    const out = { tables: [], paras: [], tokens: {} };
    walk(doc.body && doc.body.content, n => {
      if (n.type === 't') { out.tables.push(n); return; }
      out.paras.push(n);
      (n.el.paragraph.elements || []).forEach(pe => {
        const c = pe.textRun && pe.textRun.content; if (!c) return;
        ['[[LOGO]]', '[[PB]]'].forEach(tk => { const i = c.indexOf(tk); if (i >= 0 && out.tokens[tk] == null) out.tokens[tk] = pe.startIndex + i; });
      });
    });
    return out;
  }
  const PT = n => ({ magnitude: n, unit: 'PT' });
  // expected tables in document order: [columns, column widths in points]
  const TABLE_SPECS = [
    [2, [230, 310]],                       // header: logo | title
    [1, [540]],                            // red rule
    [4, [78, 150, 112, 200]],              // student / counselor info
    [5, [66, 118.5, 118.5, 118.5, 118.5]], // four-year grid
    [5, [108, 108, 108, 108, 108]],        // requirement tracker
    [2, [270, 270]],                       // cocurriculars
    [1, [540]],                            // red rule (page 2)
    [2, [270, 270]]                        // reference columns
  ];
  function layoutRequests(sc) {
    const r = [], used = [];
    let si = 0;
    sc.tables.forEach(t => {
      // match the next unused spec with the same column count
      let k = si; while (k < TABLE_SPECS.length && TABLE_SPECS[k][0] !== t.cols) k++;
      if (k >= TABLE_SPECS.length) return; si = k + 1;
      const widths = TABLE_SPECS[k][1], isRule = t.cols === 1;
      const loc = { index: t.start };
      widths.forEach((w, ci) => r.push({ updateTableColumnProperties: { tableStartLocation: loc, columnIndices: [ci], tableColumnProperties: { widthType: 'FIXED_WIDTH', width: PT(w) }, fields: 'widthType,width' } }));
      r.push({ updateTableCellStyle: { tableRange: { tableCellLocation: { tableStartLocation: loc, rowIndex: 0, columnIndex: 0 }, rowSpan: t.rows, columnSpan: t.cols },
        tableCellStyle: isRule ? { paddingTop: PT(0), paddingBottom: PT(0), paddingLeft: PT(0), paddingRight: PT(0) } : { paddingTop: PT(3), paddingBottom: PT(3), paddingLeft: PT(4), paddingRight: PT(4) },
        fields: 'paddingTop,paddingBottom,paddingLeft,paddingRight' } });
      if (isRule) r.push({ updateTableRowStyle: { tableStartLocation: loc, rowIndices: [0], tableRowStyle: { minRowHeight: PT(3) }, fields: 'minRowHeight' } });
      used.push({ t, rule: isRule });
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
    });
    return r;
  }
  async function finishDoc(id, tok, logoUrl, warnings) {
    const doc = await api('https://docs.googleapis.com/v1/documents/' + id, {}, tok);
    const sc = scan(doc); const pb = sc.tokens['[[PB]]'], logo = sc.tokens['[[LOGO]]'];
    const margins = { updateDocumentStyle: { documentStyle: { marginTop: PT(36), marginBottom: PT(36), marginLeft: PT(36), marginRight: PT(36), pageSize: { width: PT(612), height: PT(792) } }, fields: 'marginTop,marginBottom,marginLeft,marginRight,pageSize' } };
    // style requests do not move any indices, so they go first; token edits go last, later-in-document first
    const tokenOps = (withImage) => {
      const r = [];
      if (pb != null) r.push({ deleteContentRange: { range: { startIndex: pb, endIndex: pb + 6 } } }, { insertPageBreak: { location: { index: pb } } });
      if (logo != null) {
        if (withImage && logoUrl) r.push({ deleteContentRange: { range: { startIndex: logo, endIndex: logo + 8 } } }, { insertInlineImage: { uri: logoUrl, location: { index: logo }, objectSize: { width: PT(150), height: PT(43) } } });
        else r.push({ replaceAllText: { containsText: { text: '[[LOGO]]', matchCase: true }, replaceText: 'WOODWARD ACADEMY' } });
      }
      return r;
    };
    const send = r => api('https://docs.googleapis.com/v1/documents/' + id + ':batchUpdate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: r }) }, tok);
    let layout = []; try { layout = layoutRequests(sc); } catch (e) { warnings.push('Layout clean-up was skipped (' + e.message + ').'); }
    const attempts = [
      () => send([margins].concat(layout, tokenOps(true))),
      () => { warnings.push('The logo image could not be inserted, so a text wordmark was used.'); return send([margins].concat(layout, tokenOps(false))); },
      () => { warnings.push('Table layout clean-up could not be applied; margins, page break and logo were set.'); return send([margins].concat(tokenOps(false))); }
    ];
    let lastErr;
    for (const a of attempts) { try { await a(); return; } catch (e) { lastErr = e; } }
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

  WA.google = G;
})();
