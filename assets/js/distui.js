/* Graduation Distinctions screen. Each distinction has an "I'm interested" checkbox; when ticked, its required COURSES are listed
 * beneath it. They start gray and turn bold with a check mark as they are chosen in the four-year plan.
 * (Every other requirement - applications, hours, capstones, portfolios, averages - is a checklist in the Google Doc / printout.) */
(function (root) {
  const WA = root.WA = root.WA || {};
  (WA.versions = WA.versions || {})['distui.js'] = '2';
  if (typeof document === 'undefined') return;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const BLURB = {
    global: 'World language, global courses and global experiences.',
    service: 'Service learning courses, 160 hours of service and a capstone project.',
    sustain: 'Environmental science and responsible decisions about our natural, human and economic environments.',
    media: 'Film, journalism, photography, writing and broadcast, with a certification and a web portfolio.'
  };
  const STATUS = { done: 'Courses planned', part: 'In progress', none: 'Not started' };

  function render(host, results, onInterest, opts) {
    opts = opts || {};
    const focusId = document.activeElement && host.contains(document.activeElement) ? document.activeElement.id : null;
    host.innerHTML = '';
    results.forEach(r => {
      const on = r.interested, card = el('article', 'dist-card ' + (on ? (r.met ? 'met' : r.status) : 'off')); card.id = 'dist-' + r.id;
      const head = el('label', 'dist-head'), cb = el('input'); cb.type = 'checkbox'; cb.id = 'dint-' + r.id; cb.dataset.dist = r.id; cb.checked = on;
      cb.addEventListener('change', () => onInterest(r.id, cb.checked));
      const txt = el('span', 'dist-title'); txt.appendChild(el('b', null, 'I’m interested in the Distinction in ' + r.name)); txt.appendChild(el('small', null, BLURB[r.id] || ''));
      head.appendChild(cb); head.appendChild(txt);
      if (on) head.appendChild(el('span', 'dstat ' + (r.met ? 'done' : r.status), r.met ? '✓ ' + STATUS.done : STATUS[r.status]));
      card.appendChild(head);
      if (on) {
        const body = el('div', 'dist-body');
        const meta = el('p', 'dmeta'); meta.appendChild(document.createTextNode('Monitored by the ' + r.coordinator + '. ')); meta.appendChild(el('b', null, r.apply)); body.appendChild(meta);
        const done = r.groups.filter(g => g.met).length;
        body.appendChild(el('p', 'dprog', 'Course requirements: ' + done + ' of ' + r.groups.length + ' planned — courses turn bold with a ✓ as you choose them in your four-year plan'));
        r.groups.forEach(g => {
          const box = el('div', 'dgroup' + (g.met ? ' met' : '')), h = el('div', 'dgh');
          h.appendChild(el('b', null, (g.met ? '✓ ' : '') + g.title));
          h.appendChild(el('span', 'cnt', g.kind === 'langyears' ? g.have + ' of ' + g.need + ' years' : g.kind === 'count' ? (g.have >= g.need ? 'planned' : 'need ' + g.need) : g.have + ' of ' + g.need + ' ' + g.unit));
          box.appendChild(h);
          if (g.detail) box.appendChild(el('p', 'note', g.detail));
          if (g.items.length) {
            const ul = el('ul', 'dlist');
            g.items.forEach(i => {
              const li = el('li', i.hit ? 'hit' : 'miss'); li.appendChild(el('span', 'dmark', i.hit ? '✓' : '○')); li.appendChild(el('span', 'dname', i.label));
              if (i.hit && i.sem > 1) li.appendChild(el('small', null, ' (' + i.sem + ' semesters)')); ul.appendChild(li);
            });
            box.appendChild(ul);
          }
          if (g.note) box.appendChild(el('p', 'note', g.note));
          body.appendChild(box);
        });
        body.appendChild(el('p', 'dother', opts.otherNote || 'The other requirements (application, hours, capstone project, portfolio, averages and options) are on the checklist in the Google Doc.'));
        card.appendChild(body);
      }
      host.appendChild(card);
    });
    if (focusId) { const f = document.getElementById(focusId); if (f) f.focus(); }
  }
  WA.distui = { render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
