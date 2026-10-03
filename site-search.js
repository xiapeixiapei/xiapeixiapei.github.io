// Site search for the public pages (homepage, publications, academic footprint, travel).
// A search button is added next to the theme toggle; "/" or Ctrl/⌘+K opens it too.
// Searches: publications (title, authors, journal, year, abstract), research interests, education, awards
// (content.json); conference places and their sights (academic/academic.json). On travel.html, once the
// visitor has unlocked it with the travel password, the private places and sights are searched as well;
// they are read from the page's own decrypted data and never leave the page.
// Results link to publications.html#pub=<id>, academic.html#place=<id>, index.html#<section>.
(function () {
  const zh = () => /^zh/i.test(document.documentElement.lang || '');
  const L = (en, z) => (zh() ? z : en);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const strip = s => String(s ?? '').replace(/<[^>]*>/g, '');
  const norm = s => strip(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'");
  const T = v => (v && typeof v === 'object' ? (zh() ? (v.zh || v.en) : (v.en || v.zh)) || '' : v || '');
  const B = v => (v && typeof v === 'object' ? { en: v.en || v.zh || '', zh: v.zh || v.en || '' } : { en: String(v || ''), zh: String(v || '') });
  const J = (parts, sep = ' · ') => ({ en: parts.map(x => B(x).en).filter(Boolean).join(sep), zh: parts.map(x => B(x).zh).filter(Boolean).join(sep) });
  const LB = (en, z) => ({ en, zh: z });
  let SHOW_ZH = false; const pick = v => (v && typeof v === 'object' ? (SHOW_ZH ? v.zh : v.en) || v.en || v.zh || '' : v || '');
  const both = v => (v && typeof v === 'object' ? [v.en, v.zh].filter(Boolean).join(' ') : v || '');
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const onTravel = page === 'travel.html', onAcademic = page === 'academic.html';

  // ── Index ──
  let INDEX = null, LOADING = null;
  async function getJson(u) { try { const r = await fetch(u, { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch (e) { return null; } }
  function placeItems(d, priv) {
    const out = [];
    for (const p of (d?.places || [])) {
      const when = String(p.when || '');
      const sub = J([p.country, when, p.academic ? p.event : '']);
      out.push({ g: priv ? 'trip' : 'place', id: p.id, title: B(p.city), sub, text: [both(p.city), both(p.country), when, both(p.event), p.talk, both(p.note), priv ? both(p.pnote) : ''].join(' '), url: (priv ? 'travel.html' : 'academic.html') + '#place=' + encodeURIComponent(p.id) });
      for (const g of (p.sights || [])) {
        const WHL = LB('World Heritage', '世界遗产');
        const tags = [...new Set((g.tags || []).map(t => ({ '5a': '5A', 'wh-cultural': 'wh', 'wh-natural': 'wh', 'wh-mixed': 'wh', wh: 'wh', 'national-park': 'np' }[t])).filter(Boolean))].map(k => k === 'wh' ? WHL : k === 'np' ? LB('National park', '国家公园') : B(k));
        out.push({ g: 'sight', id: p.id, title: B(g.name), sub: J([p.city, ...tags]), text: [both(g.name), both(p.city), both(p.country), g.whsite ? both(g.whsite.name) : '', g.a5 ? both(g.a5.name) : '', tags.map(both).join(' ')].join(' '), url: (priv ? 'travel.html' : 'academic.html') + '#place=' + encodeURIComponent(p.id) });
      }
    }
    return out;
  }
  async function buildIndex() {
    const items = [];
    const c = await getJson('content.json');
    if (c) {
      for (const p of (c.publications || [])) {
        const year = p.year === 'book' ? LB('Book', '著作') : p.year;
        items.push({ g: 'pub', id: p.id, title: B(strip(p.title)), sub: J([strip(p.authors).slice(0, 90), strip(p.venue).split(',')[0], year, p.status]),
          text: [p.title, p.title_short, strip(p.authors), p.venue, p.year, p.status, p.doi, p.abstract].join(' '), url: 'publications.html#pub=' + encodeURIComponent(p.id) });
      }
      (c.research_interests || []).forEach(t => items.push({ g: 'about', title: B(t), sub: LB('Research interest', '研究方向'), text: both(t), url: 'index.html#research' }));
      (c.education || []).forEach(e => items.push({ g: 'about', title: B(e.degree), sub: J([e.school, e.period]), text: [both(e.degree), both(e.school), e.period, (e.supervisors || []).map(both).join(' ')].join(' '), url: 'index.html#education' }));
      (c.awards || []).forEach(a => items.push({ g: 'about', title: B(a.text), sub: J([LB('Award', '获奖'), a.year]), text: [both(a.text), a.year, a.note].join(' '), url: 'index.html#awards' }));
    }
    if (!onTravel) { const a = await getJson('academic/academic.json'); if (a) items.push(...placeItems(a, false)); }
    items.forEach(it => { it.n = norm(it.title.en + ' ' + it.title.zh + ' ' + it.text); it.nt = norm(it.title.en + ' ' + it.title.zh); });
    return items;
  }
  function privateItems() {
    // travel.html after unlocking: its decrypted list lives in the page (DATA); read it, never store it
    try { if (onTravel && typeof DATA !== 'undefined' && DATA && DATA.places) return placeItems(DATA, true).map(it => Object.assign(it, { n: norm(it.title.en + ' ' + it.title.zh + ' ' + it.text), nt: norm(it.title.en + ' ' + it.title.zh) })); } catch (e) {}
    return [];
  }
  function search(q) {
    const terms = norm(q).split(/\s+/).filter(Boolean); if (!terms.length) return [];
    const all = (INDEX || []).concat(privateItems());
    const hits = [];
    for (const it of all) {
      if (!terms.every(t => it.n.includes(t))) continue;
      const qn = terms.join(' ');
      const score = (it.nt === qn || norm(it.title.en) === qn || norm(it.title.zh) === qn ? 50 : 0) + (it.nt.startsWith(qn) ? 20 : 0) + (it.nt.includes(qn) ? 15 : 0) + (it.n.includes(qn) ? 8 : 0) + (terms.every(t => it.nt.includes(t)) ? 10 : 0) + ({ pub: 3, place: 2, trip: 2, sight: 1, about: 0 }[it.g] || 0);
      hits.push([score, it]);
    }
    hits.sort((a, b) => b[0] - a[0]);
    const seen = new Set(), out = [];
    for (const [, it] of hits) { const k = it.g + it.title.en + it.sub.en; if (seen.has(k)) continue; seen.add(k); out.push(it); }
    return out;
  }

  // ── UI ──
  const GROUPS = [['pub', ['Publications', '论文']], ['place', ['Conferences & visits', '学术足迹']], ['trip', ['Travel (private)', '旅行（私密）']], ['sight', ['Sights', '景点']], ['about', ['About', '个人信息']]];
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
  const css = `
  .ss-btn svg { width: 18px; height: 18px; }
  .ss-back { position: fixed; inset: 0; z-index: 3000; background: rgba(13, 27, 42, 0.42); display: flex; align-items: flex-start; justify-content: center; padding: 10vh 16px 16px; opacity: 0; transition: opacity 0.15s ease; }
  .ss-back.show { opacity: 1; }
  .ss-panel { width: 100%; max-width: 640px; max-height: 75vh; display: flex; flex-direction: column; background: var(--card, var(--card-bg, #fff)); color: var(--ink, #0d1b2a); border: 1px solid var(--subtle, #d3dce7); border-radius: 14px; box-shadow: 0 24px 60px rgba(13, 27, 42, 0.3); overflow: hidden; }
  .ss-top { display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--subtle, #d3dce7); }
  .ss-top svg { width: 20px; height: 20px; color: var(--muted, #647387); flex: none; }
  .ss-top input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; color: inherit; font: inherit; font-size: 1.1rem; padding: 0.3rem 0; }
  .ss-top kbd, .ss-foot kbd { font: inherit; font-size: 0.75rem; color: var(--muted, #647387); border: 1px solid var(--subtle, #d3dce7); border-radius: 5px; padding: 0.05rem 0.35rem; }
  .ss-top input::-webkit-search-cancel-button { display: none; }
  .ss-close { border: none; background: none; color: var(--muted, #647387); cursor: pointer; font-size: 0.85rem; padding: 0.2rem 0.4rem; }
  .ss-list { overflow-y: auto; padding: 0.4rem 0 0.6rem; }
  .ss-h { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted, #647387); padding: 0.7rem 1rem 0.3rem; }
  .ss-item { display: block; padding: 0.55rem 1rem; text-decoration: none; color: inherit; border-left: 3px solid transparent; cursor: pointer; }
  .ss-item .t { font-weight: 600; line-height: 1.35; }
  .ss-item .s { font-size: 0.85rem; color: var(--muted, #647387); margin-top: 0.1rem; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ss-item mark { background: var(--highlight, #d6e3f5); color: inherit; border-radius: 3px; padding: 0 1px; }
  .ss-item.on, .ss-item:hover { background: var(--highlight, #d6e3f5); border-left-color: var(--accent, #1b4f8a); }
  .ss-item.on mark, .ss-item:hover mark { background: transparent; text-decoration: underline; }
  .ss-empty { padding: 1.4rem 1rem; color: var(--muted, #647387); text-align: center; }
  .ss-foot { display: flex; gap: 1rem; justify-content: flex-end; padding: 0.5rem 1rem; border-top: 1px solid var(--subtle, #d3dce7); font-size: 0.78rem; color: var(--muted, #647387); }
  .ss-flash { animation: ss-flash 1.8s ease; }
  @keyframes ss-flash { 0%, 40% { box-shadow: 0 0 0 4px rgba(var(--accent-rgb, 27, 79, 138), 0.45); } 100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb, 27, 79, 138), 0); } }
  @media (max-width: 600px) { .ss-back { padding: 8px; } .ss-panel { max-height: 88vh; } .ss-foot { display: none; } }`;
  let back = null, input = null, list = null, sel = 0, cur = [];
  function mark(text, terms) {
    let h = esc(text);
    for (const t of terms) { if (!t) continue; const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'); h = h.replace(re, m => `<mark>${m}</mark>`); }
    return h;
  }
  function render() {
    const q = input.value.trim();
    if (!q) { list.innerHTML = `<div class="ss-empty">${L('Search publications, places, sights …', '搜索论文、去过的地方、景点……')}</div>`; cur = []; return; }
    if (!INDEX) { list.innerHTML = `<div class="ss-empty">${L('Loading …', '加载中……')}</div>`; return; }
    SHOW_ZH = /[\u3400-\u9fff]/.test(q) || (zh() && !/[a-z]/i.test(q));
    const res = search(q), terms = q.split(/\s+/).filter(Boolean);
    cur = [];
    let html = '';
    for (const [g, [en, z]] of GROUPS) {
      const rows = res.filter(r => r.g === g).slice(0, g === 'sight' ? 10 : 8); if (!rows.length) continue;
      html += `<div class="ss-h">${L(en, z)}</div>` + rows.map(r => { cur.push(r); return `<a class="ss-item" href="${esc(r.url)}" data-k="${cur.length - 1}"><div class="t">${mark(pick(r.title), terms)}</div>${pick(r.sub) ? `<div class="s">${mark(pick(r.sub), terms)}</div>` : ''}</a>`; }).join('');
    }
    list.innerHTML = html || `<div class="ss-empty">${L('No results.', '没有找到结果。')}</div>`;
    sel = 0; highlight();
  }
  function highlight() { list.querySelectorAll('.ss-item').forEach(a => a.classList.toggle('on', Number(a.dataset.k) === sel)); list.querySelector('.ss-item.on')?.scrollIntoView({ block: 'nearest' }); }
  function go(r) {
    close();
    const u = new URL(r.url, location.href);
    if (u.pathname === location.pathname) { if (location.hash === u.hash) handleHash(); else location.hash = u.hash; }
    else location.href = r.url;
  }
  function open() {
    if (back) return;
    back = document.createElement('div'); back.className = 'ss-back';
    back.innerHTML = `<div class="ss-panel" role="dialog" aria-modal="true" aria-label="${L('Search', '搜索')}"><div class="ss-top">${ICON}<input type="search" placeholder="${L('Search publications, places, sights …', '搜索论文、地点、景点……')}" autocomplete="off" spellcheck="false"><button class="ss-close" type="button">Esc</button></div><div class="ss-list"></div><div class="ss-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> ${L('move', '选择')}</span><span><kbd>Enter</kbd> ${L('open', '打开')}</span><span><kbd>Esc</kbd> ${L('close', '关闭')}</span></div></div>`;
    document.body.appendChild(back); requestAnimationFrame(() => back.classList.add('show'));
    input = back.querySelector('input'); list = back.querySelector('.ss-list');
    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    back.querySelector('.ss-close').onclick = close;
    input.addEventListener('input', render);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, cur.length - 1); highlight(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); highlight(); }
      else if (e.key === 'Enter' && cur[sel]) { e.preventDefault(); go(cur[sel]); }
      else if (e.key === 'Escape') close();
    });
    list.addEventListener('click', e => { const a = e.target.closest('.ss-item'); if (!a) return; e.preventDefault(); go(cur[Number(a.dataset.k)]); });
    input.focus(); render();
    if (!INDEX) (LOADING ||= buildIndex()).then(ix => { INDEX = ix; if (back) render(); });
  }
  function close() { if (!back) return; const b = back; back = null; b.classList.remove('show'); setTimeout(() => b.remove(), 150); }

  // ── Jump targets: #pub=<id> on publications.html, #place=<id> on academic.html / travel.html ──
  function waitFor(fn, ms = 10000) { return new Promise(res => { const t0 = Date.now(); (function poll() { const v = fn(); if (v) return res(v); if (Date.now() - t0 > ms) return res(null); setTimeout(poll, 150); })(); }); }
  async function handleHash() {
    const m = location.hash.match(/^#(pub|place)=(.+)$/); if (!m) return;
    const id = decodeURIComponent(m[2]);
    if (m[1] === 'pub') {
      const el = await waitFor(() => document.querySelector(`.pub-card[data-id="${CSS.escape(id)}"]`)); if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (!el.classList.contains('expanded') && el.querySelector('.pub-abstract')) el.click();
      el.classList.remove('ss-flash'); void el.offsetWidth; el.classList.add('ss-flash');
    } else {
      const el = await waitFor(() => document.querySelector(`.city[data-pid="${CSS.escape(id)}"]`)); if (!el) return;
      if (typeof revealCity === 'function') revealCity(id); else el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { el.classList.remove('ss-flash'); void el.offsetWidth; el.classList.add('ss-flash'); }, 350);
    }
  }

  function init() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    // the button: next to the theme toggle, with the same look
    const theme = document.querySelector('[data-theme-toggle]');
    if (theme) {
      const b = document.createElement('button'); b.type = 'button'; b.className = theme.className.replace(/\btheme-btn\b/, '').trim() + ' ss-btn';
      b.innerHTML = ICON; b.setAttribute('aria-label', 'Search'); b.title = L('Search (/ or Ctrl+K)', '搜索（/ 或 Ctrl+K）');
      b.onclick = open; theme.parentNode.insertBefore(b, theme);
      // pages where the theme button has no generic class (publications): copy its look
      if (b.className.trim() === 'ss-btn') { const cs = getComputedStyle(theme); Object.assign(b.style, { width: cs.width, height: cs.height, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: cs.borderRadius, border: cs.border, background: cs.backgroundColor, color: cs.color, cursor: 'pointer', padding: '0', marginRight: '0.5rem' }); }
    }
    document.addEventListener('keydown', e => {
      const t = e.target, typing = t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); back ? close() : open(); }
      else if (e.key === '/' && !typing && !back) { e.preventDefault(); open(); }
    });
    window.addEventListener('hashchange', handleHash);
    handleHash();
  }
  window.SiteSearch = { open, close, search: q => search(q).map(r => Object.assign({}, r, { title: pick(r.title), sub: pick(r.sub) })) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
