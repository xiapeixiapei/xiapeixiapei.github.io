// Site appearance, shared by every page: the font pairing chosen in the Site Manager
// (window.SITE_FONTS from site-fonts.js) and the light / dark theme.
// Load it synchronously in <head>, after site-fonts.js, so the page never flashes the wrong theme.
(function () {
  'use strict';
  var root = document.documentElement;

  // ── Font catalog (all from Google Fonts) ──
  var FONTS = {
    en: {
      A: { adjust: 1, name: 'Crimson Pro + DM Sans', note: 'The original pairing. Warm book serif, soft geometric sans.',
           head: { family: 'Crimson Pro', q: 'ital,wght@0,300;0,400;0,600;1,300;1,400' }, body: { family: 'DM Sans', q: 'wght@400;500;600;700' } },
      B: { adjust: 1.05, name: 'Source Serif 4 + Source Sans 3', note: 'Scholarly pair from Adobe. Calm and readable at small sizes.',
           head: { family: 'Source Serif 4', q: 'ital,wght@0,300;0,400;0,600;1,400' }, body: { family: 'Source Sans 3', q: 'wght@400;500;600;700' } },
      C: { adjust: 0.97, name: 'Newsreader + Public Sans', note: 'Journal-like headings with a neutral, sturdy body.',
           head: { family: 'Newsreader', q: 'ital,wght@0,300;0,400;0,600;1,400' }, body: { family: 'Public Sans', q: 'wght@400;500;600;700' } },
      D: { adjust: 1.03, name: 'EB Garamond + Work Sans', note: 'Classic Garamond, the most traditional feel.',
           head: { family: 'EB Garamond', q: 'ital,wght@0,400;0,600;1,400' }, body: { family: 'Work Sans', q: 'wght@400;500;600;700' } },
      E: { adjust: 0.99, name: 'IBM Plex Serif + IBM Plex Sans', note: 'One family, engineered look. Suits data-heavy research.',
           head: { family: 'IBM Plex Serif', q: 'ital,wght@0,300;0,400;0,600;1,400' }, body: { family: 'IBM Plex Sans', q: 'wght@400;500;600;700' } },
      F: { adjust: 1, name: 'Literata + Figtree', note: 'Made for long reading on screens. Friendly and modern.',
           head: { family: 'Literata', q: 'ital,wght@0,300;0,400;0,600;1,400' }, body: { family: 'Figtree', q: 'wght@400;500;600;700' } }
    },
    zh: {
      '1': { name: '思源宋体 Noto Serif SC', note: '正文和标题都用宋体，书卷气。',
             head: { family: 'Noto Serif SC', q: 'wght@300;400;600', kind: 'serif' }, body: { family: 'Noto Serif SC', q: 'wght@300;400;600', kind: 'serif' } },
      '2': { name: '思源黑体 Noto Sans SC', note: '正文和标题都用黑体，手机上最清晰。',
             head: { family: 'Noto Sans SC', q: 'wght@400;500;600;700', kind: 'sans' }, body: { family: 'Noto Sans SC', q: 'wght@400;500;600;700', kind: 'sans' } },
      '3': { name: '黑体正文 + 宋体标题', note: '正文易读，标题保留典雅。',
             head: { family: 'Noto Serif SC', q: 'wght@300;400;600', kind: 'serif' }, body: { family: 'Noto Sans SC', q: 'wght@400;500;600;700', kind: 'sans' } },
      '4': { name: '宋体正文 + 站酷小薇标题', note: '标题更有个性，略带文艺感。',
             head: { family: 'ZCOOL XiaoWei', q: '', kind: 'serif' }, body: { family: 'Noto Serif SC', q: 'wght@300;400;600', kind: 'serif' } }
    }
  };
  var DEFAULT_FONTS = { en: 'B', zh: '3' };
  var CJK_FALLBACK = { serif: "'Songti SC', 'STSong', 'SimSun'", sans: "'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB'" };

  function pick(sel) {
    sel = sel || {};
    var en = FONTS.en[sel.en] ? sel.en : DEFAULT_FONTS.en, zh = FONTS.zh[sel.zh] ? sel.zh : DEFAULT_FONTS.zh;
    return { en: en, zh: zh, E: FONTS.en[en], Z: FONTS.zh[zh] };
  }
  // CSS font stacks: the English face first (Latin glyphs), then the Chinese face (CJK glyphs), then system fallbacks
  function stacks(sel) {
    var p = pick(sel);
    return {
      head: "'" + p.E.head.family + "', '" + p.Z.head.family + "', " + CJK_FALLBACK[p.Z.head.kind] + ', Georgia, serif',
      body: "'" + p.E.body.family + "', '" + p.Z.body.family + "', " + CJK_FALLBACK[p.Z.body.kind] + ', system-ui, sans-serif'
    };
  }
  function fontsUrl(list) {
    var seen = {}, parts = [];
    list.forEach(function (f) {
      if (seen[f.family]) return; seen[f.family] = 1;
      parts.push('family=' + f.family.replace(/ /g, '+') + (f.q ? ':' + f.q : ''));
    });
    return 'https://fonts.googleapis.com/css2?' + parts.join('&') + '&display=swap';
  }
  function addLink(id, href, before) {
    var link = document.getElementById(id);
    if (!link) { link = document.createElement('link'); link.rel = 'stylesheet'; link.id = id; document.head.insertBefore(link, before || null); }
    if (link.getAttribute('href') !== href) link.href = href;
  }
  // Text size. Faces differ in how big they look at the same font-size (Source Sans 3 has shorter
  // capitals and x-height than DM Sans), so each English body face carries an `adjust` factor that
  // keeps body text as large as the original DM Sans. `size` (percent, from the Site Manager) scales
  // every face on top of that. Both are applied with @font-face size-adjust, so the page's own
  // font-size values and layout stay untouched.
  var SIZES = [90, 95, 100, 105, 110, 115];
  function sizeMap(sel) {
    var p = pick(sel), size = Number((sel || {}).size) || 100, m = {};
    [p.E.head, p.Z.head, p.Z.body].forEach(function (f) { m[f.family] = size; });
    m[p.E.body.family] = Math.round((p.E.adjust || 1) * size);
    return m;
  }
  function withSizeAdjust(css, map) {
    return css.replace(/@font-face\s*\{([^}]*)\}/g, function (all, body) {
      var fam = /font-family:\s*['"]?([^;'"]+)/.exec(body), pct = fam && map[fam[1].trim()];
      return pct && pct !== 100 ? '@font-face {' + body.replace(/\s*$/, '') + '\n  size-adjust: ' + pct + '%;\n}' : all;
    });
  }
  var fontsReq = 0;
  function applyFonts(sel) {
    var p = pick(sel), s = stacks(sel), url = fontsUrl([p.E.head, p.E.body, p.Z.head, p.Z.body]), map = sizeMap(sel);
    root.style.setProperty('--font-head', s.head);
    root.style.setProperty('--font-body', s.body);
    var style = document.getElementById('site-fonts-css');
    if (!style) { style = document.createElement('style'); style.id = 'site-fonts-css'; document.head.appendChild(style); }
    var needAdjust = Object.keys(map).some(function (k) { return map[k] !== 100; });
    var req = ++fontsReq;
    if (!needAdjust || !window.fetch) { style.textContent = '@import url("' + url + '");'; return p; }
    // Google Fonts CSS allows cross-origin reads; on any failure fall back to the plain stylesheet
    fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (css) { if (req === fontsReq) style.textContent = withSizeAdjust(css, map); })
      .catch(function () { if (req === fontsReq) style.textContent = '@import url("' + url + '");'; });
    return p;
  }
  // Every option at once (the Site Manager's font picker)
  function loadAllFonts() {
    var list = [];
    Object.keys(FONTS.en).forEach(function (k) { list.push(FONTS.en[k].head, FONTS.en[k].body); });
    Object.keys(FONTS.zh).forEach(function (k) { list.push(FONTS.zh[k].head, FONTS.zh[k].body); });
    // Placed before the site's own font rules, so the chosen faces keep their size adjustment
    addLink('site-fonts-all-css', fontsUrl(list), document.getElementById('site-fonts-css'));
  }

  // ── Colour palettes (chosen in the Site Manager; window.SITE_PALETTE from site-fonts.js) ──
  // Each palette gives a few base colours per theme; every other token is derived from them below.
  var PALETTES = {
    ocean: { name: 'Deep ocean', zh: '深海蓝', note: 'The current look. Navy ink, ocean-blue accent.',
      light: { ink: '#0d1b2a', paper: '#f5f7fa', card: '#ffffff', accent: '#1b4f8a', accentLight: '#3b7dd8', subtle: '#d3dce7', muted: '#647387', highlight: '#d6e3f5', badge: '#2f74e0' },
      dark:  { ink: '#e3e9f1', paper: '#0e141c', card: '#151e2a', accent: '#8fb9ef', accentLight: '#6fa3e6', subtle: '#2a3747', muted: '#97a5b7', highlight: '#1c2d44', badge: '#3d84ea' } },
    glacier: { name: 'Glacier', zh: '冰川蓝', note: 'Brighter sky blue, crisp and airy.',
      light: { ink: '#0a1f2e', paper: '#f3f8fb', card: '#ffffff', accent: '#0d6aa6', accentLight: '#2a9ae0', subtle: '#cfe0eb', muted: '#5b7385', highlight: '#d3e9f6', badge: '#1287d4' },
      dark:  { ink: '#e0edf5', paper: '#0a141b', card: '#102029', accent: '#7cc4f2', accentLight: '#3fa3e0', subtle: '#213645', muted: '#8fa7b8', highlight: '#123049', badge: '#1f8fd8' } },
    lagoon: { name: 'Lagoon', zh: '潟湖青', note: 'Teal and sea green, calm and fresh.',
      light: { ink: '#0b1f24', paper: '#f3f7f7', card: '#ffffff', accent: '#0f6b6f', accentLight: '#2a9d9a', subtle: '#cfe0e0', muted: '#5d7476', highlight: '#d3ebea', badge: '#11908b' },
      dark:  { ink: '#e1eeee', paper: '#0b1517', card: '#122023', accent: '#6fd1cb', accentLight: '#3fb3ad', subtle: '#24393c', muted: '#93aaab', highlight: '#15393b', badge: '#1a9f99' } },
    forest: { name: 'Forest', zh: '森林绿', note: 'Deep green for ecology and conservation.',
      light: { ink: '#13201a', paper: '#f4f7f3', card: '#ffffff', accent: '#2f6b3f', accentLight: '#4f9a5e', subtle: '#d4e0d4', muted: '#627567', highlight: '#dcebdc', badge: '#2f8f4a' },
      dark:  { ink: '#e3eee5', paper: '#0d1510', card: '#142019', accent: '#8fd19e', accentLight: '#5fb173', subtle: '#263a2c', muted: '#97ab9c', highlight: '#183524', badge: '#2f9a50' } },
    graphite: { name: 'Graphite', zh: '石墨灰', note: 'Quiet slate greys, minimal and neutral.',
      light: { ink: '#0f172a', paper: '#f6f7f9', card: '#ffffff', accent: '#2b3a4f', accentLight: '#5b6b82', subtle: '#d8dee6', muted: '#64748b', highlight: '#e2e8f0', badge: '#3f5875' },
      dark:  { ink: '#e7eaee', paper: '#0f1114', card: '#171a1f', accent: '#c3cfdd', accentLight: '#8ea0b6', subtle: '#2b3038', muted: '#9aa3ae', highlight: '#242a33', badge: '#56708f' } },
    walnut: { name: 'Walnut', zh: '胡桃棕', note: 'The site’s original warm look: walnut brown on warm paper.',
      light: { ink: '#1a1a2e', paper: '#faf8f5', card: '#ffffff', accent: '#6b4c3b', accentLight: '#a67c52', subtle: '#d4cdc4', muted: '#8a8279', highlight: '#f0ebe4', badge: '#9a6a3f' },
      dark:  { ink: '#efe8e1', paper: '#15110e', card: '#1e1915', accent: '#d9b08c', accentLight: '#b98a5e', subtle: '#3a3029', muted: '#a89b8f', highlight: '#2e241d', badge: '#a8703f' } },
    pku: { name: 'Peking red', zh: '北大红', note: 'Deep Peking University red, formal and classic.',
      light: { ink: '#1d1112', paper: '#f9f6f5', card: '#ffffff', accent: '#94070a', accentLight: '#c0262d', subtle: '#e6d6d4', muted: '#7a6463', highlight: '#f5e1df', badge: '#b3141b' },
      dark:  { ink: '#f2e8e8', paper: '#140f0f', card: '#1d1616', accent: '#f0898a', accentLight: '#d9545a', subtle: '#3b2b2b', muted: '#ad9898', highlight: '#3b1c1d', badge: '#c62a31' } }
  };
  var DEFAULT_PALETTE = 'ocean';
  function hexRgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function rgbHex(c) { return '#' + c.map(function (v) { return ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2); }).join(''); }
  function mix(a, b, t) { var x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map(function (v, i) { return v + (y[i] - v) * t; })); }
  function trip(h) { return hexRgb(h).join(', '); }
  // All page tokens for one theme of one palette
  function paletteTokens(id, mode) {
    var P = PALETTES[id] || PALETTES[DEFAULT_PALETTE], b = P[mode], L = P.light, dark = mode === 'dark';
    var onAccent = dark ? mix(b.paper, '#000000', 0.2) : '#ffffff';
    return {
      '--ink': b.ink, '--ink-2': mix(b.ink, b.muted, dark ? 0.3 : 0.35), '--paper': b.paper, '--paper-rgb': trip(b.paper),
      '--accent': b.accent, '--accent-rgb': trip(b.accent), '--accent-light': b.accentLight, '--accent-light-rgb': trip(b.accentLight),
      '--subtle': b.subtle, '--subtle-rgb': trip(b.subtle), '--muted': b.muted,
      '--highlight': b.highlight, '--highlight-rgb': trip(b.highlight), '--highlight-2': mix(b.highlight, b.card, dark ? 0.4 : 0.55),
      '--card-bg': b.card, '--card': b.card, '--card-rgb': trip(b.card), '--card-2': dark ? mix(b.card, b.ink, 0.03) : mix(b.card, b.paper, 0.4),
      '--hover-border': mix(b.subtle, b.accent, dark ? 0.3 : 0.25), '--note-bg': mix(b.highlight, b.accent, dark ? 0.12 : 0.08), '--note-fg': mix(b.accent, b.ink, dark ? 0.35 : 0.25),
      '--on-accent': onAccent, '--on-accent-2': mix(onAccent, b.accent, dark ? 0.25 : 0.3), '--badge-blue': b.badge,
      '--map-dot': b.accent, '--map-line': b.accent, '--map-ring': dark ? b.paper : b.card, '--net-node': mix(b.accentLight, b.subtle, dark ? 0.55 : 0.5),
      '--ramp-lo': dark ? mix(b.highlight, b.paper, 0.2) : b.highlight, '--ramp-hi': mix(b.accent, b.ink, dark ? 0.3 : 0.45),
      '--map-bg': dark ? mix(b.paper, b.card, 0.5) : mix(b.paper, b.subtle, 0.4), '--map-sphere': mix(b.paper, b.card, dark ? 0.3 : 0.5),
      '--map-empty': dark ? mix(b.card, b.subtle, 0.4) : mix(b.subtle, b.paper, 0.5), '--map-border': dark ? b.paper : b.card,
      '--hint': dark ? mix(b.subtle, b.muted, 0.35) : b.subtle, '--tip-sub': dark ? mix(b.muted, b.paper, 0.5) : mix(b.highlight, b.ink, 0.1),
      '--cover-a': L.accent, '--cover-b': mix(L.accent, '#000000', 0.4)
    };
  }
  function tokensCss(map) { return Object.keys(map).map(function (k) { return k + ': ' + map[k] + ';'; }).join(' '); }
  // Higher specificity than the pages' own :root / html[data-theme="dark"] blocks, so order does not matter
  function applyPalette(id) {
    var style = document.getElementById('site-palette-css');
    if (!style) { style = document.createElement('style'); style.id = 'site-palette-css'; document.head.appendChild(style); }
    id = PALETTES[id] ? id : DEFAULT_PALETTE;
    root.setAttribute('data-palette', id);
    style.textContent = id === DEFAULT_PALETTE ? '' :
      'html:root:not([data-theme="dark"]) { ' + tokensCss(paletteTokens(id, 'light')) + ' }\n' +
      'html:root[data-theme="dark"] { ' + tokensCss(paletteTokens(id, 'dark')) + ' }';
    try { window.dispatchEvent(new CustomEvent('palettechange', { detail: id })); } catch (e) {}
    return id;
  }

  // ── Theme: a saved choice wins, otherwise follow the system setting ──
  var KEY = 'site-theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  function saved() { try { var v = localStorage.getItem(KEY); return v === 'dark' || v === 'light' ? v : null; } catch (e) { return null; } }
  function current() { return saved() || (mq.matches ? 'dark' : 'light'); }
  var ICON_MOON = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var ICON_SUN = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  function label(dark) {
    var zh = /^zh/i.test(root.lang || '');
    return dark ? (zh ? '切换到浅色模式' : 'Switch to light mode') : (zh ? '切换到深色模式' : 'Switch to dark mode');
  }
  function paintButtons() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b.getAttribute('data-icon') !== (dark ? 'sun' : 'moon')) { b.innerHTML = dark ? ICON_SUN : ICON_MOON; b.setAttribute('data-icon', dark ? 'sun' : 'moon'); }
      b.title = label(dark); b.setAttribute('aria-label', label(dark)); b.setAttribute('aria-pressed', dark ? 'true' : 'false');
    }
  }
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    root.style.colorScheme = t;
    paintButtons();
    try { window.dispatchEvent(new CustomEvent('themechange', { detail: t })); } catch (e) {}
  }
  function toggle() {
    var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, t); } catch (e) {}
    // A short colour cross-fade, skipped for people who prefer reduced motion
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm) { root.classList.add('theme-fade'); clearTimeout(toggle._t); toggle._t = setTimeout(function () { root.classList.remove('theme-fade'); }, 450); }
    applyTheme(t);
  }

  // Run now, before the page's own CSS is parsed
  applyTheme(current());
  applyFonts(window.SITE_FONTS || DEFAULT_FONTS);
  applyPalette(window.SITE_PALETTE || DEFAULT_PALETTE);
  var st = document.createElement('style');
  st.id = 'site-theme-css';
  st.textContent =
    '.theme-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border:1px solid var(--subtle);border-radius:100px;background:var(--card-bg,var(--card,#fff));color:var(--muted);cursor:pointer;flex-shrink:0;transition:color .25s,border-color .25s,transform .35s}' +
    '.theme-btn:hover{color:var(--accent);border-color:var(--accent)}' +
    '.theme-btn:active{transform:rotate(-25deg) scale(.92)}' +
    '.theme-btn:focus-visible{outline:2px solid var(--accent-light);outline-offset:2px}' +
    '.theme-btn svg{width:15px;height:15px;display:block}' +
    'html.theme-fade,html.theme-fade *,html.theme-fade *::before,html.theme-fade *::after{transition:background-color .4s ease,color .4s ease,border-color .4s ease,fill .4s ease,stroke .4s ease!important}';
  document.head.appendChild(st);
  if (mq.addEventListener) mq.addEventListener('change', function () { if (!saved()) applyTheme(current()); });
  else if (mq.addListener) mq.addListener(function () { if (!saved()) applyTheme(current()); });

  function wire() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-theme-toggle]');
      if (b) { e.preventDefault(); toggle(); }
    });
    paintButtons();
    // Button labels follow the page language (the pages set <html lang> when EN / 中 is switched)
    if (window.MutationObserver) new MutationObserver(paintButtons).observe(root, { attributes: true, attributeFilter: ['lang'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();

  window.SiteTheme = {
    FONTS: FONTS, DEFAULT_FONTS: DEFAULT_FONTS, SIZES: SIZES,
    PALETTES: PALETTES, DEFAULT_PALETTE: DEFAULT_PALETTE, paletteTokens: paletteTokens, applyPalette: applyPalette, stacks: stacks, applyFonts: applyFonts, loadAllFonts: loadAllFonts,
    toggle: toggle, isDark: function () { return root.getAttribute('data-theme') === 'dark'; }, paintButtons: paintButtons
  };
})();
