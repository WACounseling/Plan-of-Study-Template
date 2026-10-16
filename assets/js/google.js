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
    token = null; expiresAt = 0; G.user = null; G.onChange(null);
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

  function find(doc, token) {
    for (const el of (doc.body && doc.body.content) || []) {
      if (!el.paragraph) continue;
      for (const pe of el.paragraph.elements || []) {
        const c = pe.textRun && pe.textRun.content; const i = c ? c.indexOf(token) : -1;
        if (i >= 0) return pe.startIndex + i;
      }
    }
    return null;
  }
  const PT = n => ({ magnitude: n, unit: 'PT' });
  async function finishDoc(id, tok, logoUrl, warnings) {
    const doc = await api('https://docs.googleapis.com/v1/documents/' + id, {}, tok);
    const pb = find(doc, '[[PB]]'), logo = find(doc, '[[LOGO]]');
    const build = withImage => {
      const r = [{ updateDocumentStyle: { documentStyle: { marginTop: PT(36), marginBottom: PT(36), marginLeft: PT(36), marginRight: PT(36), pageSize: { width: PT(612), height: PT(792) } }, fields: 'marginTop,marginBottom,marginLeft,marginRight,pageSize' } }];
      if (pb != null) r.push({ deleteContentRange: { range: { startIndex: pb, endIndex: pb + 6 } } }, { insertPageBreak: { location: { index: pb } } });
      if (logo != null) {
        if (withImage && logoUrl) r.push({ deleteContentRange: { range: { startIndex: logo, endIndex: logo + 8 } } }, { insertInlineImage: { uri: logoUrl, location: { index: logo }, objectSize: { width: PT(150), height: PT(43) } } });
        else r.push({ replaceAllText: { containsText: { text: '[[LOGO]]', matchCase: true }, replaceText: 'WOODWARD ACADEMY' } });
      }
      return r;
    };
    const send = r => api('https://docs.googleapis.com/v1/documents/' + id + ':batchUpdate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: r }) }, tok);
    try { await send(build(true)); }
    catch (e) { warnings.push('The logo image could not be inserted, so a text wordmark was used.'); await send(build(false)); }
  }

  WA.google = G;
})();
