const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path');
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').replace(/<link[^>]*(googleapis|gstatic)[^>]*>/g, '').replace(/<script[^>]*accounts.google.com[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + path.join(__dirname, '../index.html') });
  const w = dom.window; await new Promise(r => w.addEventListener('load', r)); await new Promise(r => setTimeout(r, 200));
  let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  w.WA_CONFIG.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
  // ---- mock Google Identity Services ----
  let account = { email: 'jane.counselor@woodward.edu', name: 'Jane Counselor', email_verified: true };
  w.google = { accounts: { oauth2: { initTokenClient: cfg => ({ requestAccessToken: () => setTimeout(() => cfg.callback({ access_token: 'tok123', expires_in: 3600 }), 5) }), hasGrantedAllScopes: () => true, revoke: (t, cb) => cb && cb() } } };
  const calls = [];
  w.fetch = async (url, opts) => {
    opts = opts || {}; calls.push({ url, opts });
    const J = (o, ok = true) => ({ ok, status: ok ? 200 : 403, statusText: 'x', text: async () => JSON.stringify(o) });
    if (url.includes('oauth2/v3/userinfo')) return J(account);
    if (url.includes('/upload/drive/v3/files')) return J({ id: 'DOC123' });
    if (url.includes('docs.googleapis.com/v1/documents/DOC123:batchUpdate')) return J({});
    if (url.includes('docs.googleapis.com/v1/documents/DOC123')) return J({ body: { content: [{ paragraph: { elements: [{ startIndex: 1, textRun: { content: '[[LOGO]]\n' } }] } }, { paragraph: { elements: [{ startIndex: 500, textRun: { content: 'x[[PB]]\n' } }] } }] } });
    if (url.includes('/permissions')) return J({ id: 'perm' });
    return J({}, false);
  };
  const d = w.document, WA = w.WA;
  // sign-in with wrong domain is rejected
  account = { email: 'someone@gmail.com', name: 'X', email_verified: true };
  let err = null; try { await WA.google.signIn(); } catch (e) { err = e; } ok(err && /@woodward\.edu/.test(err.message) && !WA.google.user, 'non-woodward account rejected');
  account = { email: 'Jane.Counselor@woodward.edu', name: 'Jane Counselor', email_verified: true };
  await WA.google.signIn(); ok(WA.google.user.email === 'jane.counselor@woodward.edu', 'woodward account signs in');
  ok(!d.getElementById('signinIn').hidden && d.querySelector('[data-bind="info.counselorEmail"]').value === 'jane.counselor@woodward.edu', 'UI shows signed-in counselor + locked email');
  ok(d.querySelector('[data-bind="info.counselorName"]').value === 'Jane Counselor', 'counselor name prefilled');
  // fill the form and a minimal plan, then call createPlanDoc via payload
  const set = (p, v) => { const el = d.querySelector('[data-bind="' + p + '"]'); el.value = v; el.dispatchEvent(new w.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
  set('info.studentName', 'Sam Student'); set('info.studentEmail', 'sam@woodward.edu'); set('info.classOf', '2030');
  ok(d.getElementById('gradBadge1').textContent === 'Projected graduation: Spring 2030', 'graduation badge shown');
  ok(/2026–27/.test(d.querySelector('#grade-9 .yr').textContent), 'grade 9 labeled 2026–27 for class of 2030: ' + d.querySelector('#grade-9 .yr').textContent);
  const payload = WA.app.buildPayload();
  ok(payload.counselor.email === 'jane.counselor@woodward.edu' && payload.classOf === '2030', 'payload uses signed-in counselor + grad year');
  const res = await WA.google.createPlanDoc(payload, { logoUrl: 'https://org.github.io/planner/assets/img/wordmark-red.png' });
  ok(res.id === 'DOC123' && res.shared === true && res.warnings.length === 0, 'doc created + shared, no warnings');
  const up = calls.find(c => c.url.includes('/upload/drive/v3/files')); ok(/mimeType":"application\/vnd.google-apps.document/.test(up.opts.body) && up.opts.headers.Authorization === 'Bearer tok123', 'upload converts HTML to Google Doc with bearer token');
  ok(/Projected graduation: Spring 2030/.test(up.opts.body) && /PROJECTED GRADUATION/.test(up.opts.body) && /\[\[PB\]\]/.test(up.opts.body), 'HTML includes projected graduation + page break token');
  const bu = JSON.parse(calls.find(c => c.url.endsWith(':batchUpdate')).opts.body).requests;
  const st = bu[0].updateDocumentStyle.documentStyle; ok(st.marginTop.magnitude === 36 && st.marginLeft.magnitude === 36 && st.marginRight.magnitude === 36 && st.marginBottom.magnitude === 36, '0.5 inch margins (36pt) applied');
  ok(bu.some(r => r.insertPageBreak && r.insertPageBreak.location.index === 501) && bu.some(r => r.insertInlineImage), 'page break + logo inserted at token positions');
  const pm = calls.find(c => c.url.includes('/permissions')); ok(JSON.parse(pm.opts.body).role === 'reader' && JSON.parse(pm.opts.body).emailAddress === 'sam@woodward.edu', 'student shared as reader (view-only)');
  ok(!calls.some(c => /role":"(writer|owner)/.test(c.opts.body || '')), 'no editor/owner grants to anyone');
  // sign out
  WA.google.signOut(); ok(!WA.google.user && d.getElementById('signinOut').hidden === false, 'sign out returns to sign-in prompt');
  console.log(fail ? 'FAILURES ' + fail : 'ALL PASS'); w.close();
})().catch(e => { console.error(e); process.exit(1); });
