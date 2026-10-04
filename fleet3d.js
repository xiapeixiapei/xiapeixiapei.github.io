/* fleet3d.js: procedural 3D airliners in airline liveries for the hangar on flights.html.
 *
 * Each model is built from the type's real dimensions (length, span, fuselage diameter, wing sweep,
 * engine size, engine and tail layout, winglets); liveries are simplified renderings of the airlines'
 * standard schemes (colours, cheatlines, titles, logos inside the real fin outline, engines, winglets),
 * painted onto canvas textures. They are approximations, not official artwork.
 *
 * Memory: Three.js (vendor/three.min.js) is loaded on demand; the hangar uses ONE shared WebGL renderer,
 * draws each card once as a still picture when it scrolls into view, and builds a live model only for
 * the card under the mouse (rotating while hovered) or for the full-size viewer. Models are disposed as
 * soon as they are no longer shown.
 *
 * Usage: Fleet3D.load().then(ok => …); Fleet3D.card(canvas, { type, airline }); Fleet3D.setAirline(canvas, al);
 *        Fleet3D.setTheme('light' | 'dark'); Fleet3D.viewer(host, { type, airline }) → { setAirline, setTheme, destroy };
 *        Fleet3D.liveryName(iata, lang); Fleet3D.sprite({ type, airline }) → data URL of a top-down view (route animation)
 */
(function () {
  'use strict';
  let T = null;   // THREE, once loaded

  // ── Type geometry: [length m, span m, fuselage diameter m, wing sweep °, options] ──
  // eng: engine count; mount: wing | rear | prop; tail: low | T; wing: low | high; tip: fence | sharklet | blended | max | small | none;
  // ed: engine (fan) diameter m; hump: 747 upper deck; deck2: A380 double deck
  const N = (ed, tip, o = {}) => ({ eng: 2, mount: 'wing', tail: 'low', wing: 'low', tip, ed, ...o });
  const DIMS = {
    A318: [31.4, 34.1, 3.95, 25, N(2.0, 'fence')], A319: [33.8, 34.1, 3.95, 25, N(2.0, 'fence')], A320: [37.6, 34.1, 3.95, 25, N(2.0, 'fence')],
    A20N: [37.6, 35.8, 3.95, 25, N(2.2, 'sharklet')], A321: [44.5, 34.1, 3.95, 25, N(2.0, 'fence')], A21N: [44.5, 35.8, 3.95, 25, N(2.2, 'sharklet')],
    BCS1: [35.0, 35.1, 3.7, 25, N(1.9, 'none')], BCS3: [38.7, 35.1, 3.7, 25, N(1.9, 'none')],
    A332: [58.8, 60.3, 5.64, 30, N(2.9, 'small')], A333: [63.7, 60.3, 5.64, 30, N(2.9, 'small')], A339: [63.7, 64.0, 5.64, 30, N(3.0, 'sharklet')],
    A343: [63.6, 60.3, 5.64, 30, N(2.2, 'small', { eng: 4 })], A346: [75.4, 63.4, 5.64, 31, N(2.5, 'small', { eng: 4 })],
    A359: [66.8, 64.75, 5.96, 31.9, N(3.3, 'sharklet')], A35K: [73.8, 64.75, 5.96, 31.9, N(3.4, 'sharklet')],
    A388: [72.7, 79.8, 7.14, 33.5, N(3.0, 'fence', { eng: 4, deck2: true })],
    B733: [33.4, 28.9, 3.76, 25, N(1.6, 'none')], B737: [33.6, 35.8, 3.76, 25, N(1.75, 'blended')], B738: [39.5, 35.8, 3.76, 25, N(1.75, 'blended')],
    B739: [42.1, 35.8, 3.76, 25, N(1.75, 'blended')], B38M: [39.5, 35.9, 3.76, 25, N(2.0, 'max')], B39M: [42.2, 35.9, 3.76, 25, N(2.0, 'max')],
    B744: [70.7, 64.4, 6.5, 37.5, N(2.6, 'small', { eng: 4, hump: true })], B748: [76.3, 68.4, 6.5, 37.5, N(2.8, 'none', { eng: 4, hump: true })],
    B752: [47.3, 38.1, 3.76, 25, N(2.1, 'none')], B763: [54.9, 47.6, 5.03, 31.5, N(2.6, 'none')],
    B772: [63.7, 60.9, 6.2, 31.6, N(3.2, 'none')], B77L: [63.7, 64.8, 6.2, 31.6, N(3.4, 'none')], B77W: [73.9, 64.8, 6.2, 31.6, N(3.4, 'none')],
    B779: [76.7, 71.8, 6.2, 31.6, N(3.6, 'none')], B788: [56.7, 60.1, 5.77, 32.2, N(3.0, 'none')], B789: [62.8, 60.1, 5.77, 32.2, N(3.0, 'none')],
    B78X: [68.3, 60.1, 5.77, 32.2, N(3.0, 'none')], C919: [38.9, 35.8, 3.96, 25, N(2.1, 'sharklet')],
    AJ27: [33.5, 27.3, 3.3, 25, N(1.5, 'small', { mount: 'rear', tail: 'T' })],
    E170: [29.9, 26.0, 3.0, 23, N(1.4, 'small')], E175: [31.7, 26.0, 3.0, 23, N(1.4, 'small')], E190: [36.2, 28.7, 3.0, 23, N(1.6, 'small')],
    E195: [38.7, 28.7, 3.0, 23, N(1.6, 'small')], E290: [36.3, 33.7, 3.0, 23, N(1.8, 'none')], E295: [41.5, 35.1, 3.0, 23, N(1.8, 'none')],
    CRJ9: [36.2, 24.9, 2.7, 26, N(1.4, 'small', { mount: 'rear', tail: 'T' })],
    DH8D: [32.8, 28.4, 2.7, 2, N(1.1, 'none', { mount: 'prop', tail: 'T', wing: 'high' })],
    AT76: [27.2, 27.1, 2.6, 2, N(1.1, 'none', { mount: 'prop', tail: 'T', wing: 'high' })],
    F100: [35.5, 28.1, 3.3, 17, N(1.4, 'none', { mount: 'rear', tail: 'T' })],
  };
  const FALLBACK = { narrow: 'A320', wide: 'B788', quad: 'B744', regional: 'E190', turboprop: 'AT76' };

  // ── Liveries: simplified renderings of each airline's standard scheme, laid out after real livery textures ──
  // Fuselage coordinates: u along the length (0 nose … 1 tail), v around (0 crown, 0.205 window line, 0.25 side, 0.5 belly).
  // under(P): paint below the windows (belly, cheatlines, ribbons); over(P): titles, logos and flags on top.
  // engine / lip / winglet: colours; belly: belly-fairing colour; tail: painter in TAILS.
  const W = '#f7f8fa';
  const FONT = '"Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  const SERIF = 'Georgia, "Times New Roman", "Songti SC", serif';
  const KAI = '"Kaiti SC", STKaiti, KaiTi, "AR PL UKai CN", "Noto Serif CJK SC", "Songti SC", serif';
  const OPTIMA = 'Optima, Candara, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const ROUND = '"Arial Rounded MT Bold", "Varela Round", Nunito, "Helvetica Neue", Arial, sans-serif';
  const tv = hv => 0.184 - hv * 0.56;   // v of a title of cap height hv, sitting just above the windows
  const LIV = {
    CA: { name: 'Air China', zh: '中国国际航空', belly: '#a6aaaf', engine: '#a6aaaf', lip: '#d5d9de', winglet: '#f2f3f5', tail: 'ca',
      under: P => { P.below(0.236, '#a6aaaf'); P.band(0.218, 0.222, '#2b5aa8', 0.008, 0.975); P.band(0.226, 0.235, '#1b3a7a', 0.008, 0.975); },
      over: P => { const a = P.title([{ flag: 'cn' }], 0.14, tv(0.038), 0.04); const b = P.title([{ t: 'AIR CHINA', i: 1, w: 900 }], a[1] + 0.012, tv(0.04), 0.04, { col: '#111' });
        P.title('中国国际航空公司', b[1] + 0.045, tv(0.062), 0.062, { col: '#111', f: KAI, w: 400, cjk: 1, sp: 0.4 }); } },
    CZ: { name: 'China Southern', zh: '中国南方航空', engine: W, winglet: '#1793d1', tail: 'cz',
      under: P => { P.band(0.219, 0.225, '#1aa0dc', 0.012, 0.955); P.band(0.229, 0.241, '#0c2c66', 0.012, 0.955); P.band(0.246, 0.25, '#1aa0dc', 0.012, 0.955); },
      over: P => { const a = P.title('中国南方航空', 0.12, tv(0.05), 0.05, { col: '#14284b', w: 500, cjk: 1, sp: 0.3 }); P.title('CHINA SOUTHERN', a[1] + 0.03, tv(0.048), 0.048, { col: '#14284b', f: OPTIMA, w: 600 }); } },
    MU: { name: 'China Eastern', zh: '中国东方航空', engine: W, winglet: '#f2f3f5', tail: 'mu',
      over: P => { const a = P.title('中國東方航空', 0.11, tv(0.048), 0.048, { col: '#e3171f', w: 500, cjk: 1, sp: 0.15 }); P.title('CHINA EASTERN', a[1] + 0.035, tv(0.046), 0.046, { col: '#2a2774', w: 800 }); } },
    MF: { name: 'Xiamen Air', zh: '厦门航空', belly: '#1f7fcc', engine: W, winglet: '#1f86d0', tail: 'mf',
      under: P => {   // blue lower fuselage rising into the tail, a light-blue line under the windows, darker belly with a white sweep
        const top = u => 0.3 - 0.06 * Math.min(1, u / 0.8) - 0.22 * Math.max(0, (u - 0.8) / 0.2) ** 1.4 + 0.12 * Math.max(0, (0.06 - u) / 0.06);
        P.ribbon(top, () => 0.5, -0.01, 1.01, '#1f7fcc');
        P.ribbon(u => Math.min(0.236, top(u) - 0.022), u => Math.min(0.243, top(u) - 0.015), 0.01, 1.01, '#62b8ea');
        const dk = u => 0.4 - 0.1 * Math.sin(Math.PI * Math.max(0, Math.min(1, (u - 0.3) / 0.55)));
        P.ribbon(dk, () => 0.5, 0.3, 0.85, '#174f9e'); P.ribbon(u => dk(u) - 0.006, dk, 0.3, 0.85, '#ffffff'); },
      over: P => { P.logo('mfegret', 0.125, tv(0.05), 0.09, '#1a5fae');
        const a = P.title('厦门航空', 0.165, tv(0.046), 0.046, { col: '#1a5fae', w: 600, cjk: 1, sp: 0.15 });
        P.title([{ t: 'XIAMEN', w: 800 }, { t: 'AIR', w: 400 }], a[1] + 0.015, tv(0.044), 0.044, { col: '#1a5fae' }); } },
    HU: { name: 'Hainan Airlines', zh: '海南航空', engine: W, winglet: '#c8102e', tail: 'hu',
      under: P => {   // red and gold ribbon from the tail, sweeping down under the windows to a point below the forward cabin
        const s = u => Math.max(0, Math.min(1, (u - 0.17) / 0.83));
        const rt = u => 0.45 - 0.25 * s(u) ** 0.6 - 0.2 * s(u) ** 4, rb = u => 0.45 - 0.17 * s(u) ** 0.5, gb = u => rb(u) + 0.004 + 0.03 * s(u) ** 0.5;
        P.ribbon(rb, gb, 0.17, 1, '#e0a526'); P.ribbon(rt, rb, 0.17, 1, '#c8102e'); },
      over: P => { const a = P.title([{ logo: 'hna', col: '#c8102e' }], 0.13, tv(0.05), 0.055); const b = P.title('海南航空', a[1] + 0.008, tv(0.048), 0.048, { col: '#c8102e', w: 600, cjk: 1, sp: 0.15 });
        P.title('Hainan Airlines', b[1] + 0.025, tv(0.046), 0.046, { col: '#c8102e', w: 700 }); } },
    '3U': { name: 'Sichuan Airlines', zh: '四川航空', engine: W, winglet: '#c8102e', tail: '3u', text: ['四川航空', 'SICHUAN AIRLINES'], textColor: '#b5121b' },
    ZH: { name: 'Shenzhen Airlines', zh: '深圳航空', engine: W, winglet: '#c8102e', tail: 'zh', text: ['深圳航空', 'SHENZHEN AIRLINES'], textColor: '#b5121b' },
    FM: { name: 'Shanghai Airlines', zh: '上海航空', engine: W, winglet: '#c8102e', tail: 'fm', text: ['上海航空', 'SHANGHAI AIRLINES'], textColor: '#b5121b' },
    KL: { name: 'KLM', zh: '荷兰皇家航空', body: '#dfe2e6', belly: '#dfe2e6', engine: '#dfe2e6', lip: '#c9d0d8', winglet: '#00a1de', tail: 'klm',
      under: P => { P.band(0, 0.262, '#00a1de'); P.band(0.262, 0.268, '#13286b', 0.004, 0.99); },
      over: P => { P.title([{ t: 'KLM', w: 900, above: { logo: 'klm', s: 0.9, dy: 1.15 } }, { gap: 0.25 }, { t: 'Royal Dutch Airlines', s: 0.42, w: 500, dy: 0.06 }], 0.09, tv(0.04) + 0.006, 0.04, { col: '#fff' }); } },
    AF: { name: 'Air France', zh: '法国航空', engine: W, winglet: '#002157', tail: 'af',
      over: P => { P.title([{ t: 'AIRFRANCE', w: 900 }, { gap: 0.06 }, { slash: '#e2001a' }], 0.11, tv(0.058), 0.058, { col: '#002157' }); } },
    LH: { name: 'Lufthansa', zh: '汉莎航空', engine: '#0a1d4f', lip: '#c9ced6', winglet: '#0a1d4f', tail: 'lh',
      under: P => { P.poly([[0.84, 0], [1.01, 0], [1.01, 0.13], [0.93, 0.07]], '#0a1d4f'); },   // the navy tail wraps onto the fuselage at the fin root
      over: P => { P.title('Lufthansa', 0.11, tv(0.078), 0.078, { col: '#0a1d4f', w: 800 }); } },
    AY: { name: 'Finnair', zh: '芬兰航空', engine: W, winglet: '#0b86c8', tail: 'ay',
      over: P => { P.title([{ t: 'FINNAIR', i: 1, w: 900, sp: 0.06 }], 0.09, tv(0.066), 0.066, { col: '#0b86c8' }); } },
    BA: { name: 'British Airways', zh: '英国航空', belly: '#1b2b5a', engine: '#d9dee5', winglet: '#1b2b5a', tail: 'ba',
      under: P => { P.below(0.258, '#1b2b5a'); P.band(0.248, 0.254, '#c8102e', 0.03, 0.96); },
      over: P => { P.title('BRITISH AIRWAYS', 0.12, tv(0.044), 0.044, { col: '#1b2b5a', w: 700 }); } },
    CX: { name: 'Cathay Pacific', zh: '国泰航空', engine: '#d9dee5', winglet: '#005d63', tail: 'cx',
      under: P => { P.band(0.226, 0.236, '#8fa8a5', 0.02, 0.9); },
      over: P => { const a = P.title('CATHAY PACIFIC', 0.12, tv(0.044), 0.044, { col: '#005d63', w: 700 }); P.title('國泰航空', a[1] + 0.03, tv(0.046), 0.046, { col: '#005d63', cjk: 1, w: 500 }); } },
    SQ: { name: 'Singapore Airlines', zh: '新加坡航空', engine: '#d9dee5', winglet: '#0b2a6f', tail: 'sq',
      under: P => { P.band(0.226, 0.231, '#f0ab00', 0.02, 0.92); P.band(0.234, 0.244, '#0b2a6f', 0.02, 0.92); },
      over: P => { P.title('SINGAPORE AIRLINES', 0.12, tv(0.042), 0.042, { col: '#0b2a6f', w: 600 }); } },
    EK: { name: 'Emirates', zh: '阿联酋航空', engine: '#d9dee5', winglet: '#d0021b', tail: 'ek',
      over: P => { P.title('Emirates', 0.28, tv(0.07), 0.07, { col: '#9a7b2f', f: SERIF, w: 700 }); } },
    TK: { name: 'Turkish Airlines', zh: '土耳其航空', engine: '#e9ecef', winglet: '#c8102e', tail: 'tk',
      over: P => { const a = P.title('TURKISH AIRLINES', 0.12, tv(0.048), 0.048, { col: '#1b4f9c', w: 800 }); P.title([{ flag: 'tr' }], a[1] + 0.02, tv(0.03), 0.03); } },
    NH: { name: 'ANA', zh: '全日空', belly: '#e4e6e9', engine: '#e4e6e9', winglet: '#1d3c97', tail: 'nh',
      under: P => {   // Triton blue and Mohican blue bands: under the windows at the front, sweeping up the rear fuselage into the fin
        const s = u => Math.max(0, Math.min(1, (u - 0.06) / 0.94)), c = u => 0.272 - 0.21 * s(u) ** 1.35, th = u => 0.005 + 0.05 * s(u) ** 1.6;
        P.below(0.3, '#e4e6e9');
        P.ribbon(c, u => c(u) + 0.006 + 0.004 * (1 - s(u)), 0.06, 1.01, '#00a0e9');
        P.ribbon(u => c(u) - th(u), c, 0.06, 1.01, '#1d3c97');
        P.ribbon(u => Math.max(0, c(u) - th(u) - 0.016 * s(u) ** 2), u => c(u) - th(u), 0.5, 1.01, '#00a0e9'); },
      over: P => { const a = P.title([{ t: 'ANA', i: 1, w: 900 }, { gap: 0.05 }, { slash: '#1d3c97' }], 0.12, tv(0.052), 0.052, { col: '#1d3c97' });
        const b = P.title([{ t: 'Inspiration of JAPAN', w: 500 }], a[1] + 0.012, tv(0.024), 0.024, { col: '#1d3c97' }); P.title([{ flag: 'jp' }], b[1] + 0.01, tv(0.024), 0.024); } },
    TO: { name: 'Transavia', zh: '泛航航空', engine: W, winglet: '#00d26a', tail: 'to',
      over: P => { P.title([{ t: 'transavia', w: 800, sp: -0.02 }], 0.15, tv(0.1) + 0.004, 0.1, { col: '#00d26a', f: ROUND }); } },
    HV: { name: 'Transavia', zh: '泛航航空', engine: W, winglet: '#00d26a', tail: 'to', over: P => LIV.TO.over(P) },
    OS: { name: 'Austrian', zh: '奥地利航空', engine: W, winglet: '#d8001a', tail: 'os',
      over: P => { const a = P.title([{ logo: 'osarrow', col: '#d8001a', s: 1.25, dy: -0.05 }], 0.1, tv(0.06), 0.06); P.title('Austrian', a[1] + 0.006, tv(0.064), 0.064, { col: '#d8001a', f: SERIF, w: 400 }); } },
    FR: { name: 'Ryanair', zh: '瑞安航空', belly: '#073590', engine: '#073590', lip: '#c9d0d8', winglet: '#073590', tail: 'fr',
      under: P => {   // navy belly under a yellow line that dips at the nose and rises towards the tail
        const vb = u => 0.246 + 0.17 * Math.max(0, (0.13 - u) / 0.13) ** 1.6 - 0.035 * Math.max(0, (u - 0.8) / 0.2) ** 1.3;
        P.ribbon(vb, () => 0.5, -0.01, 1.01, '#073590'); P.ribbon(u => vb(u) - 0.009, vb, -0.01, 1.01, '#f1c933'); },
      over: P => { const a = P.title([{ logo: 'harp', col: '#073590', s: 1.35 }], 0.15, tv(0.082), 0.082); P.title([{ t: 'RYANAIR', w: 900, sp: 0.04 }], a[1] + 0.008, tv(0.082), 0.082, { col: '#073590', f: '"Arial Black", ' + FONT }); } },
    VY: { name: 'Vueling', zh: '伏林航空', engine: '#ffcc00', lip: '#d5d9de', winglet: '#ffcc00', tail: 'vy',
      under: P => {   // the tail's grey dots spill onto the rear fuselage
        for (let u = 0.8; u < 1; u += 0.012) for (let v = 0.01; v < 0.2; v += 0.022) { const t = (u - 0.8) / 0.2 - v * 2.2; if (t > 0.05) P.dot(u, v, Math.min(0.009, 0.0095 * t), '#8f8f8f'); } },
      over: P => { P.title([{ t: 'vueling', col: '#6b6b6b', w: 700 }, { dot: '#ffcc00' }, { t: 'com', col: '#ffcc00', w: 700 }], 0.11, tv(0.05), 0.05, { f: ROUND }); } },
    QR: { name: 'Qatar Airways', zh: '卡塔尔航空', engine: '#5c0632', winglet: '#5c0632', tail: 'qr',
      over: P => { P.title('QATAR AIRWAYS', 0.12, tv(0.046), 0.046, { col: '#5c0632', w: 700 }); } },
  };
  const liveryOf = al => {
    const k = String(al?.iata || '').toUpperCase();
    if (LIV[k]) return { key: k, ...LIV[k] };
    return { key: 'gen:' + (al?.name || ''), name: al?.name || '', text: [String(al?.name || '').toUpperCase()].filter(Boolean), textColor: '#2b3440', engine: W, tail: 'gen', code: k };
  };

  // ── Canvas helpers ──
  const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function tex(canvas) {
    const t = new T.CanvasTexture(canvas); t.flipY = false; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t;
  }
  function star(x, cx, cy, r, rot = -Math.PI / 2) {
    x.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, rr = i % 2 ? r * 0.4 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill();
  }
  // Flags in a w × h box at the origin
  const FLAG = {
    cn(x, w, h) { x.fillStyle = '#de2910'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffde00'; star(x, w * 0.17, h * 0.27, h * 0.15);
      [[0.33, 0.1], [0.4, 0.2], [0.4, 0.35], [0.33, 0.45]].forEach(([a, b]) => star(x, w * a, h * b, h * 0.05)); },
    jp(x, w, h) { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#bc002d'; x.beginPath(); x.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2); x.fill(); },
    tr(x, w, h) { x.fillStyle = '#e30a17'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.beginPath(); x.arc(w * 0.38, h / 2, h * 0.25, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#e30a17'; x.beginPath(); x.arc(w * 0.42, h / 2, h * 0.2, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fff'; star(x, w * 0.58, h / 2, h * 0.12, Math.PI); },
  };
  // A run of title parts drawn left to right from the origin (vertical centre), in square units; returns its width.
  // part: 'text' | { t, col, s, w, f, i, sp, dy, above: { logo, s, dy } } | { gap } | { slash } | { flag } | { logo, col, s, dy } | { dot }
  function runParts(x, parts, size, base, dry) {
    let cx = 0;
    for (const p0 of parts) {
      const p = typeof p0 === 'string' ? { t: p0 } : p0, sz = size * (p.s || 1), col = p.col || base.col;
      if (p.gap != null) { cx += p.gap * size; continue; }
      if (p.slash) { const h = sz * 0.74, w = h * 0.62; if (!dry) { x.fillStyle = p.slash; x.beginPath(); x.moveTo(cx + w * 0.6, -h / 2); x.lineTo(cx + w, -h / 2); x.lineTo(cx + w * 0.4, h / 2); x.lineTo(cx, h / 2); x.fill(); } cx += w; continue; }
      if (p.flag) { const h = sz * 0.72, w = h * 1.5; if (!dry) { x.save(); x.translate(cx, -h / 2); FLAG[p.flag](x, w, h); x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = h * 0.05; x.strokeRect(0, 0, w, h); x.restore(); } cx += w; continue; }
      if (p.logo) { if (!dry) LOGO[p.logo](x, cx + sz / 2, (p.dy || 0) * size, sz, col); cx += sz; continue; }
      if (p.dot) { const r = size * 0.11; if (!dry) { x.fillStyle = p.dot; x.beginPath(); x.arc(cx + r * 1.7, size * 0.22, r, 0, Math.PI * 2); x.fill(); } cx += r * 3.4; continue; }
      x.font = `${p.w || base.w || 700} ${sz}px ${p.f || base.f || FONT}`;
      if ('letterSpacing' in x) x.letterSpacing = `${(p.sp ?? base.sp ?? 0) * sz}px`;
      const w = x.measureText(p.t).width;
      if (!dry) {
        x.save(); x.translate(cx, (p.dy || 0) * size); if (p.i ?? base.i) x.transform(1, 0, -0.2, 1, 0, 0);
        x.fillStyle = col; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(p.t, 0, 0); x.restore();
        if (p.above) LOGO[p.above.logo](x, cx + w / 2, -(p.above.dy || 1) * sz, (p.above.s || 1) * sz, p.above.col || col);
      }
      cx += w;
    }
    if ('letterSpacing' in x) x.letterSpacing = '0px';
    return cx;
  }

  function taper(x, p, w0, wm, w1) {   // a cubic Bézier stroke [p0, c1, c2, p3] whose width goes w0 → wm → w1 (brush-like)
    const n = 32, A = [], Bk = [], B = (t, i) => (1 - t) ** 3 * p[0][i] + 3 * (1 - t) ** 2 * t * p[1][i] + 3 * (1 - t) * t * t * p[2][i] + t ** 3 * p[3][i];
    for (let j = 0; j <= n; j++) {
      const t = j / n, t0 = Math.max(0, t - 0.01), t1 = Math.min(1, t + 0.01), dx = B(t1, 0) - B(t0, 0), dy = B(t1, 1) - B(t0, 1), l = Math.hypot(dx, dy) || 1;
      const w = (t < 0.5 ? w0 + (wm - w0) * t * 2 : wm + (w1 - wm) * (t - 0.5) * 2) / 2, px = B(t, 0), py = B(t, 1);
      A.push([px - dy / l * w, py + dx / l * w]); Bk.push([px + dy / l * w, py - dx / l * w]);
    }
    x.beginPath(); A.concat(Bk.reverse()).forEach(([a, b], i) => x[i ? 'lineTo' : 'moveTo'](a, b)); x.closePath(); x.fill();
  }

  // ── Logos, drawn around (cx, cy) with size s, nose to the left ──
  const LOGO = {
    klm(x, cx, cy, s, col = '#fff') {   // crown: band, four balls on top, cross in the middle
      x.save(); x.fillStyle = col; x.translate(cx, cy); x.scale(s, s);
      x.beginPath(); x.roundRect(-0.42, 0.12, 0.84, 0.13, 0.03); x.fill();
      [[-0.33, 0.0], [-0.12, -0.06], [0.12, -0.06], [0.33, 0.0]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 0.105, 0, Math.PI * 2); x.fill(); });
      x.beginPath(); x.arc(0, -0.08, 0.06, 0, Math.PI * 2); x.fill(); x.fillRect(-0.035, -0.42, 0.07, 0.3); x.fillRect(-0.12, -0.33, 0.24, 0.07); x.restore();
    },
    kapok(x, cx, cy, s, col = '#e5131d') {   // China Southern: red kapok flower with a white outline
      x.save(); x.translate(cx, cy); x.scale(s, s); x.lineJoin = 'round'; x.lineCap = 'round';
      const shape = () => {
        x.beginPath();   // cup with a lotus base
        x.moveTo(-0.26, -0.04); x.bezierCurveTo(-0.3, 0.2, -0.2, 0.34, -0.12, 0.38); x.quadraticCurveTo(-0.06, 0.47, 0, 0.42); x.quadraticCurveTo(0.06, 0.47, 0.12, 0.38);
        x.bezierCurveTo(0.2, 0.34, 0.3, 0.2, 0.26, -0.04); x.quadraticCurveTo(0, 0.06, -0.26, -0.04);
        [-1, 1].forEach(d => {   // scroll petals curling outwards
          x.moveTo(d * 0.22, -0.02); x.bezierCurveTo(d * 0.46, -0.04, d * 0.5, -0.26, d * 0.36, -0.3); x.bezierCurveTo(d * 0.26, -0.32, d * 0.24, -0.2, d * 0.33, -0.19);
          x.bezierCurveTo(d * 0.3, -0.1, d * 0.2, -0.08, d * 0.1, -0.02); x.closePath();
        });
        [[0, -0.36, 0], [-0.15, -0.3, -0.07], [0.15, -0.3, 0.07]].forEach(([a, b, c0]) => { x.moveTo(c0 + 0.03, 0); x.lineTo(a + 0.025, b + 0.06); x.lineTo(a - 0.025, b + 0.06); x.lineTo(c0 - 0.03, 0); x.closePath(); x.moveTo(a + 0.075, b); x.arc(a, b, 0.075, 0, Math.PI * 2); });
      };
      shape(); x.strokeStyle = '#fff'; x.lineWidth = 0.07; x.stroke(); x.fillStyle = col; x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 0.022;   // petal lines
      x.beginPath(); x.moveTo(-0.12, 0.02); x.quadraticCurveTo(-0.13, 0.24, 0, 0.38); x.moveTo(0.12, 0.02); x.quadraticCurveTo(0.13, 0.24, 0, 0.38); x.moveTo(-0.2, 0.3); x.quadraticCurveTo(0, 0.24, 0.2, 0.3); x.stroke();
      x.restore();
    },
    phoenix(x, cx, cy, s, col = '#e8141f') {   // Air China: red phoenix (the stylised "VIP"): head and U at the front, two plumes and a curl sweeping down
      x.save(); x.translate(cx, cy); x.scale(s, s); x.fillStyle = col; x.strokeStyle = col; x.lineCap = 'round'; x.lineJoin = 'round';
      taper(x, [[0.48, -0.52], [0.22, -0.46], [-0.02, -0.36], [-0.02, -0.12]], 0, 0.08, 0.12);   // outer plume: flame tip, then down and forward
      taper(x, [[-0.02, -0.12], [-0.02, 0.18], [-0.1, 0.4], [-0.38, 0.44]], 0.12, 0.11, 0.02);
      taper(x, [[0.44, -0.3], [0.25, -0.3], [0.1, -0.2], [0.1, -0.02]], 0, 0.07, 0.1);            // inner plume
      taper(x, [[0.1, -0.02], [0.1, 0.26], [0.0, 0.46], [-0.26, 0.5]], 0.1, 0.09, 0.02);
      taper(x, [[0.32, 0.05], [0.35, 0.35], [0.15, 0.5], [-0.14, 0.56]], 0.09, 0.09, 0.01);      // curl and its tail
      x.lineWidth = 0.07; x.beginPath(); x.arc(0.25, 0.05, 0.07, 0, -Math.PI * 1.45, true); x.stroke();
      x.lineWidth = 0.1; x.beginPath(); x.moveTo(-0.3, -0.13); x.lineTo(-0.3, 0.17); x.quadraticCurveTo(-0.3, 0.33, -0.22, 0.33); x.quadraticCurveTo(-0.14, 0.33, -0.14, 0.17); x.lineTo(-0.14, -0.04); x.stroke();   // the U
      taper(x, [[-0.28, -0.15], [-0.36, -0.16], [-0.44, -0.15], [-0.53, -0.13]], 0.06, 0.035, 0);  // beak
      taper(x, [[-0.3, -0.13], [-0.3, -0.22], [-0.24, -0.29], [-0.17, -0.27]], 0.06, 0.035, 0.01); // crest
      x.restore();
    },
    swallow(x, cx, cy, s) {   // China Eastern: red swallow chevron with a blue crescent
      x.save(); x.translate(cx, cy); x.scale(s, s);
      x.fillStyle = '#e8261f'; x.beginPath(); x.moveTo(0.46, -0.38); x.lineTo(-0.02, -0.38); x.lineTo(-0.4, 0.02); x.quadraticCurveTo(-0.2, 0.26, 0.04, 0.42);
      x.lineTo(0.2, 0.42); x.quadraticCurveTo(-0.02, 0.22, -0.14, 0.04); x.lineTo(0.12, -0.2); x.lineTo(0.46, -0.2); x.closePath(); x.fill();
      x.fillStyle = '#1d2a80'; x.beginPath(); x.moveTo(0.48, -0.02); x.quadraticCurveTo(0.12, 0.05, -0.1, 0.07); x.quadraticCurveTo(0.1, 0.27, 0.48, 0.15); x.closePath(); x.fill();
      x.restore();
    },
    egret(x, cx, cy, s, col = '#fff') {   // egret in flight: raised wings, S-shaped neck reaching forward (to the left)
      x.save(); x.fillStyle = col; x.strokeStyle = col; x.lineCap = 'round';
      x.beginPath(); x.ellipse(cx, cy + s * 0.06, s * 0.2, s * 0.08, -0.15, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(cx - s * 0.02, cy); x.quadraticCurveTo(cx + s * 0.05, cy - s * 0.42, cx + s * 0.45, cy - s * 0.46); x.quadraticCurveTo(cx + s * 0.14, cy - s * 0.24, cx + s * 0.12, cy + s * 0.02); x.fill();
      x.beginPath(); x.moveTo(cx - s * 0.08, cy - s * 0.01); x.quadraticCurveTo(cx - s * 0.12, cy - s * 0.34, cx + s * 0.1, cy - s * 0.4); x.quadraticCurveTo(cx - s * 0.02, cy - s * 0.2, cx + s * 0.02, cy + s * 0.01); x.fill();
      x.lineWidth = s * 0.05; x.beginPath(); x.moveTo(cx - s * 0.16, cy + s * 0.04); x.bezierCurveTo(cx - s * 0.3, cy - s * 0.02, cx - s * 0.22, cy - s * 0.16, cx - s * 0.36, cy - s * 0.16); x.stroke();
      x.lineWidth = s * 0.025; x.beginPath(); x.moveTo(cx - s * 0.36, cy - s * 0.16); x.lineTo(cx - s * 0.5, cy - s * 0.14); x.stroke();
      x.beginPath(); x.moveTo(cx + s * 0.16, cy + s * 0.09); x.lineTo(cx + s * 0.46, cy + s * 0.16); x.stroke(); x.restore();
    },
    mfegret(x, cx, cy, s, col = '#fff') {   // Xiamen Air: egret with a long beak and one crescent wing swept up and back
      x.save(); x.translate(cx, cy); x.scale(s, s); x.fillStyle = col;
      taper(x, [[-0.52, 0.0], [-0.2, -0.07], [0.08, 0.2], [0.46, 0.08]], 0, 0.13, 0.02);   // beak, head and body
      x.beginPath(); x.moveTo(-0.14, 0.04); x.quadraticCurveTo(-0.02, -0.32, 0.46, -0.36); x.quadraticCurveTo(0.12, -0.16, 0.1, 0.1); x.closePath(); x.fill();
      x.restore();
    },
    crane(x, cx, cy, s, col = '#fff') {   // Lufthansa: crane in flight inside a ring
      x.save(); x.strokeStyle = col; x.lineWidth = s * 0.05; x.beginPath(); x.arc(cx, cy, s * 0.48, 0, Math.PI * 2); x.stroke(); x.restore();
      LOGO.egret(x, cx + s * 0.02, cy + s * 0.05, s * 0.74, col);
    },
    tkbird(x, cx, cy, s, col = '#fff') {   // Turkish Airlines: wild goose in a ring
      x.save(); x.translate(cx, cy); x.scale(s, s); x.strokeStyle = col; x.fillStyle = col;
      x.lineWidth = 0.035; x.beginPath(); x.arc(0, 0, 0.46, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.moveTo(-0.02, -0.4); x.bezierCurveTo(0.34, -0.3, 0.38, 0.06, 0.2, 0.2); x.lineTo(-0.44, 0.12); x.lineTo(0.02, 0.08);
      x.bezierCurveTo(0.2, -0.02, 0.18, -0.24, -0.02, -0.4); x.fill(); x.restore();
    },
    harp(x, cx, cy, s, col = '#f1c933') {   // Ryanair: winged harp
      x.save(); x.translate(cx, cy); x.scale(s, s); x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round'; x.lineJoin = 'round';
      x.lineWidth = 0.075; x.beginPath(); x.moveTo(-0.28, -0.3); x.bezierCurveTo(-0.42, -0.06, -0.24, 0.22, 0.24, 0.46); x.stroke();   // body / pillar
      x.beginPath(); x.arc(-0.27, -0.36, 0.06, 0, Math.PI * 2); x.fill();   // head
      x.beginPath(); x.moveTo(-0.26, -0.3); x.bezierCurveTo(-0.06, -0.38, 0.18, -0.46, 0.4, -0.44); x.lineTo(0.32, -0.36); x.lineTo(0.38, -0.32); x.lineTo(0.28, -0.26); x.lineTo(0.32, -0.2);
      x.bezierCurveTo(0.08, -0.22, -0.1, -0.2, -0.24, -0.2); x.closePath(); x.fill();   // wing
      x.lineWidth = 0.045; [-0.12, 0.0, 0.12, 0.24].forEach((a, i) => { x.beginPath(); x.moveTo(a, -0.22 + i * 0.01); x.lineTo(a - 0.02, 0.14 + i * 0.08); x.stroke(); });
      x.restore();
    },
    hna(x, cx, cy, s, col = '#c8102e') {   // Hainan: stylised roc (concentric arcs over a curl)
      x.save(); x.translate(cx, cy); x.scale(s, s); x.strokeStyle = col; x.lineCap = 'round';
      [0.42, 0.32, 0.22].forEach((r, i) => { x.lineWidth = 0.07 - i * 0.012; x.beginPath(); x.arc(0.08, 0.1, r, Math.PI * 1.02, Math.PI * 1.75); x.stroke(); });
      x.lineWidth = 0.07; x.beginPath(); x.arc(-0.12, 0.22, 0.13, -Math.PI * 0.2, Math.PI * 1.4); x.stroke();
      x.beginPath(); x.moveTo(0.0, 0.18); x.quadraticCurveTo(0.2, 0.44, 0.44, 0.38); x.stroke(); x.restore();
    },
    osarrow(x, cx, cy, s, col = '#d8001a') {   // Austrian: swept arrow with a grey shadow
      x.save(); x.translate(cx, cy); x.scale(s, s);
      x.fillStyle = '#9aa1a8'; x.beginPath(); x.moveTo(-0.4, 0.1); x.lineTo(0.42, 0.06); x.lineTo(0.16, 0.42); x.lineTo(0.2, 0.16); x.closePath(); x.fill();
      x.fillStyle = col; x.beginPath(); x.moveTo(-0.46, -0.28); x.lineTo(0.46, -0.12); x.lineTo(0.12, 0.3); x.lineTo(0.2, -0.06); x.closePath(); x.fill(); x.restore();
    },
  };

  // ── Tails: painted inside the real fin outline (finFrame). f.m = the art is for the right-hand side ──
  // The right-hand side is seen mirrored, so emblems (drawn nose-left) face the nose there too; text is flipped back to read normally.
  function finFrame(F, w, h, m) {
    const P = F.poly.map(([u, v]) => [u * w, v * h]);   // root LE, root TE, tip TE, tip LE
    const at = a => ({ xl: P[3][0] * (1 - a) + P[0][0] * a, xt: P[2][0] * (1 - a) + P[1][0] * a, y: a * h });
    const mid = at(0.45), chord = mid.xt - mid.xl;
    return { P, at, m, h, c0: P[1][0] - P[0][0], cx: mid.xl + chord * 0.52, cy: mid.y, s: Math.min(chord * 0.8, h * 0.44) };
  }
  function band(x, fr, aL0, aL1, aR0, aR1, col) {   // a band from the leading edge (heights aL) to the trailing edge (heights aR)
    x.fillStyle = col; x.beginPath(); x.moveTo(fr.at(aL0).xl - 4, aL0 * fr.h); x.lineTo(fr.at(aR0).xt + 4, aR0 * fr.h); x.lineTo(fr.at(aR1).xt + 4, aR1 * fr.h); x.lineTo(fr.at(aL1).xl - 4, aL1 * fr.h); x.fill();
  }
  function along(x, f, d0, d1, col, fromTE) {   // a stripe parallel to the leading (or trailing) edge, offsets in root chords
    const [r, t] = fromTE ? [f.P[1], f.P[2]] : [f.P[0], f.P[3]], sg = fromTE ? -1 : 1, c = f.c0, ext = 0.1 * f.h;
    const dx = (t[0] - r[0]) / (t[1] - r[1]);   // x change per unit y along the edge
    const pt = (d, y) => [r[0] + (y - r[1]) * dx + sg * d * c, y];
    x.fillStyle = col; x.beginPath(); [pt(d0, f.h + ext), pt(d0, -ext), pt(d1, -ext), pt(d1, f.h + ext)].forEach(([a, b], i) => x[i ? 'lineTo' : 'moveTo'](a, b)); x.fill();
  }
  const bg = (x, w, h, c) => { x.fillStyle = c; x.fillRect(0, 0, w, h); };
  function lab(x, f, s, cx, cy, size, col, o = {}) {   // text that reads normally on both sides
    x.save(); x.translate(cx, cy); let r = o.rot || 0; if (f.m) { x.scale(-1, 1); r = -r; } x.rotate(r); if (o.i) x.transform(1, 0, -0.2, 1, 0, 0);
    x.font = `${o.w || 800} ${size}px ${o.f || FONT}`; x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, 0, 0); x.restore();
  }
  const disc = (x, cx, cy, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); };
  const TAILS = {
    ca(x, w, h, f) { bg(x, w, h, '#f4f5f7'); LOGO.phoenix(x, f.cx - f.s * 0.02, f.cy - f.s * 0.06, f.s * 1.08); },
    cz(x, w, h, f) { bg(x, w, h, '#1793d1'); LOGO.kapok(x, f.cx, f.cy - f.s * 0.04, f.s * 0.95); },
    mu(x, w, h, f) { bg(x, w, h, '#fbfbfc'); LOGO.swallow(x, f.cx, f.cy, f.s * 1.05); },
    mf(x, w, h, f) { bg(x, w, h, '#1f86d0'); LOGO.mfegret(x, f.cx, f.cy + f.s * 0.05, f.s * 1.3); },
    hu(x, w, h, f) { bg(x, w, h, '#c8102e'); LOGO.hna(x, f.cx + f.s * 0.05, f.cy - f.s * 0.05, f.s * 1.1, '#e0a526'); },
    '3u'(x, w, h, f) { bg(x, w, h, '#c8102e'); x.strokeStyle = '#f5c400'; x.lineWidth = f.s * 0.06; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(f.cx - f.s * 0.2 + i * f.s * 0.13, f.cy + f.s * 0.35 - i * f.s * 0.12, f.s * 0.45, Math.PI * 1.15, Math.PI * 1.75); x.stroke(); } },
    zh(x, w, h, f) { bg(x, w, h, '#c8102e'); disc(x, f.cx, f.cy, f.s * 0.4, '#f2b632'); LOGO.egret(x, f.cx, f.cy, f.s * 0.55, '#c8102e'); },
    fm(x, w, h, f) { bg(x, w, h, '#c8102e'); LOGO.egret(x, f.cx, f.cy, f.s * 0.95, '#ffffff'); },
    klm(x, w, h, f) { bg(x, w, h, '#e2e5e9'); LOGO.klm(x, f.cx, f.cy - f.s * 0.24, f.s * 0.42, '#00a1de'); lab(x, f, 'KLM', f.cx, f.cy + f.s * 0.1, f.s * 0.4, '#00a1de', { w: 900 }); },
    af(x, w, h, f) { bg(x, w, h, '#ffffff'); [[0.36, 0.47], [0.52, 0.62], [0.67, 0.76]].forEach(([a, b]) => along(x, f, a, b, '#002157')); along(x, f, 0.81, 0.95, '#e2001a'); },
    lh(x, w, h, f) { bg(x, w, h, '#0a1d4f'); LOGO.crane(x, f.cx, f.cy + f.s * 0.04, f.s * 0.95, '#ffffff'); },
    ay(x, w, h, f) { bg(x, w, h, '#0b8bd0'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#2aa3e2' : '#0a6fb2'; x.fillRect(0, h * (0.42 + i * 0.07), w, h * 0.028); }
      const dx = f.cx + f.s * 0.12, dy = f.cy - f.s * 0.28; disc(x, dx, dy, f.s * 0.3, '#fff'); lab(x, f, 'F', dx + f.s * 0.05, dy, f.s * 0.34, '#0b8bd0', { w: 900, i: 1 });
      x.fillStyle = '#0b8bd0'; x.fillRect(dx - f.s * 0.24, dy + f.s * 0.02, f.s * 0.26, f.s * 0.05); },
    tk(x, w, h, f) { bg(x, w, h, '#c8102e'); LOGO.tkbird(x, f.cx, f.cy + f.s * 0.05, f.s * 1.05); },
    nh(x, w, h, f) { bg(x, w, h, '#1d3c97'); along(x, f, -0.3, 0.1, '#00a0e9', true);
      const a = f.at(0.5), rot = Math.atan2(f.P[3][1] - f.P[0][1], f.P[3][0] - f.P[0][0]);
      lab(x, f, 'ANA', a.xl + (a.xt - a.xl) * 0.4, a.y, f.s * 0.5, '#ffffff', { w: 900, rot }); },
    to(x, w, h, f) { bg(x, w, h, '#f2f3f5'); const a = f.at(0.66), r = h * 0.42, cx = a.xt - r * 0.55; disc(x, cx, a.y, r, '#00d26a'); lab(x, f, 't', cx, a.y - r * 0.08, r * 1.45, '#ffffff', { w: 800, f: ROUND }); },
    os(x, w, h, f) { bg(x, w, h, '#d8001a'); x.fillStyle = '#ffffff'; x.fillRect(0, h * 0.34, w, h * 0.32); LOGO.osarrow(x, f.cx, h * 0.5, f.s * 0.62); },
    fr(x, w, h, f) { bg(x, w, h, '#073590'); LOGO.harp(x, f.cx, f.cy + f.s * 0.04, f.s * 1.05); },
    vy(x, w, h, f) { bg(x, w, h, '#f6f6f6'); const d = h / 11;   // halftone dots, growing towards the top and the trailing edge
      for (let y = d / 2; y < h; y += d) for (let i = -2; i < 30; i++) { const xx = i * d + (Math.round(y / d) % 2) * d / 2, a = f.at(y / h), t = (xx - a.xl) / Math.max(1, a.xt - a.xl) * 0.7 + (1 - y / h) * 0.6 - 0.25;
        if (t > 0.05) disc(x, xx, y, Math.min(0.46, 0.46 * t) * d, '#8f8f8f'); }
      disc(x, f.cx, f.cy, d * 0.4, '#ffcc00'); },
    ba(x, w, h, f) { bg(x, w, h, '#ffffff'); band(x, f, 0.18, 0.38, 0.05, 0.25, '#c8102e'); band(x, f, 0.44, 0.66, 0.3, 0.5, '#1b2b5a'); band(x, f, 0.7, 0.78, 0.56, 0.64, '#c8102e'); },
    cx(x, w, h, f) { bg(x, w, h, '#005d63'); x.strokeStyle = '#fff'; x.lineWidth = f.s * 0.12; x.lineCap = 'round'; x.beginPath(); x.moveTo(f.cx - f.s * 0.4, f.cy + f.s * 0.25); x.quadraticCurveTo(f.cx, f.cy - f.s * 0.55, f.cx + f.s * 0.45, f.cy - f.s * 0.1); x.stroke(); },
    sq(x, w, h, f) { bg(x, w, h, '#0b2a6f'); LOGO.egret(x, f.cx, f.cy, f.s * 0.9, '#f0ab00'); },
    ek(x, w, h, f) { bg(x, w, h, '#ffffff'); band(x, f, 0.2, 0.36, 0.1, 0.26, '#00843d'); band(x, f, 0.52, 0.68, 0.42, 0.58, '#111111'); x.fillStyle = '#d0021b'; x.fillRect(0, 0, f.at(0.5).xl + (f.at(0.5).xt - f.at(0.5).xl) * 0.25, h); },
    qr(x, w, h, f) { bg(x, w, h, '#5c0632'); x.strokeStyle = '#e8e2e5'; x.lineWidth = f.s * 0.05; x.beginPath(); x.moveTo(f.cx - f.s * 0.2, f.cy + f.s * 0.4); x.quadraticCurveTo(f.cx - f.s * 0.1, f.cy - f.s * 0.3, f.cx + f.s * 0.4, f.cy - f.s * 0.45); x.moveTo(f.cx - f.s * 0.05, f.cy + f.s * 0.4); x.quadraticCurveTo(f.cx + f.s * 0.05, f.cy - f.s * 0.2, f.cx + f.s * 0.5, f.cy - f.s * 0.32); x.stroke(); },
    gen(x, w, h, f, liv) { bg(x, w, h, '#c9d1dc'); if (liv.code) lab(x, f, liv.code, f.cx, f.cy, f.s * 0.5, '#2b3440'); },
  };
  function paintTail(liv, mirror, F) {
    const h = 512, w = Math.min(1024, Math.round(h * F.aspect)), c = cnv(w, h), x = c.getContext('2d');
    (TAILS[liv.tail] || TAILS.gen)(x, w, h, finFrame(F, w, h, mirror), liv);
    return c;
  }

  // Fuselage texture: u along the length (nose → tail), v around (0 top, .25 side z+, .5 belly, .75 side z−)
  function paintFuselage(liv, L, R, hf = 1.03) {
    const cw = 2048, ch = 512, c = cnv(cw, ch), x = c.getContext('2d');
    const k = (2 * Math.PI * R / ch) / (L / cw);   // texel aspect: a texel is k times taller (around) than long
    const U = u => u * cw, V = v => v * ch;
    const sides = fn => { fn(); x.save(); x.translate(0, ch); x.scale(1, -1); fn(); x.restore(); };   // the z− side mirrors the z+ side about the belly
    const path = pts => { x.beginPath(); pts.forEach(([u, v], i) => x[i ? 'lineTo' : 'moveTo'](U(u), V(v))); x.closePath(); };
    const P = {
      poly: (pts, col) => sides(() => { x.fillStyle = col; path(pts); x.fill(); }),
      band: (v0, v1, col, u0 = -0.01, u1 = 1.01) => P.poly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], col),
      below: (v, col) => { x.fillStyle = col; x.fillRect(0, V(v), cw, V(1 - 2 * v)); },   // everything under v, both sides
      ribbon: (top, bot, u0, u1, col, n = 80) => { const pts = []; for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n; pts.push([u, top(u)]); } for (let i = n; i >= 0; i--) { const u = u0 + (u1 - u0) * i / n; pts.push([u, bot(u)]); } P.poly(pts, col); },
      dot: (u, v, r, col) => sides(() => { x.fillStyle = col; x.beginPath(); x.ellipse(U(u), V(v), V(r) * k, V(r), 0, 0, Math.PI * 2); x.fill(); }),
      logo: (name, u, v, hv, col) => sides(() => { x.save(); x.translate(U(u), V(v)); x.scale(1, 1 / k); LOGO[name](x, 0, 0, V(hv) * k, col); x.restore(); }),
      // Titles: hv = cap height (v units); both sides read upright, occupying the same stretch [u0, u1] of the fuselage
      title(parts, u, v, hv, o = {}) {
        parts = [].concat(parts);
        const size = V(hv) * k / (o.cjk ? 0.86 : 0.72), base = { col: o.col, f: o.f, w: o.w, i: o.i, sp: o.sp };
        const w = runParts(x, parts, size, base, true);
        if (w > 0.4 * cw) return P.title(parts, u, v, hv * 0.4 * cw / w, o);   // keep long names off the tail
        const x0 = U(u) - (o.anchor === 'end' ? w : o.anchor === 'center' ? w / 2 : 0);
        x.save(); x.translate(x0, V(v)); x.scale(1, 1 / k); runParts(x, parts, size, base); x.restore();
        x.save(); x.translate(x0 + w, ch - V(v)); x.rotate(Math.PI); x.scale(1, 1 / k); runParts(x, parts, size, base); x.restore();
        return [x0 / cw, (x0 + w) / cw];
      },
    };
    x.fillStyle = liv.body || W; x.fillRect(0, 0, cw, ch);
    if (liv.under) liv.under(P); else P.below(0.4, '#e3e7ec');
    // windows (both sides), cockpit, doors
    const winV = 0.205, winH = 0.022 * ch, winW = Math.max(3, 0.42 / L * cw);
    x.fillStyle = '#1d2733';
    for (let u = 0.13; u < 0.82; u += 0.53 / L) {
      x.beginPath(); x.roundRect(u * cw, winV * ch - winH / 2, winW, winH, winW / 2); x.fill();
      x.beginPath(); x.roundRect(u * cw, (1 - winV) * ch - winH / 2, winW, winH, winW / 2); x.fill();
    }
    // cockpit windows: one band at windshield height, worked out from the nose profile so it wraps round the front without a break
    const tn = Math.min(0.13, 2.1 * R / L), cs = 1; x.fillStyle = '#121a24';
    for (let px = 0; px < tn * cw; px += cs) for (let py = 0; py < 0.3 * ch; py += cs) {
      const a = (px + cs / 2) / (tn * cw), e = Math.sqrt(Math.max(0, 1 - (1 - a) ** 2)), th = (py + cs / 2) / ch * 2 * Math.PI;
      const y = (-0.28 * (1 - a) ** 2 + hf * e * Math.cos(th)) / 0.27 - 0.2 / 0.27, z = Math.abs(e * Math.sin(th));   // y: 0…1 across the windshield height
      if (y < 0 || y > 1 || a < 0.06 || a > 0.66 - 0.12 * y || z < 0.025 || Math.abs(z - 0.42) < 0.02 || Math.abs(z - 0.74) < 0.02) continue;
      x.fillRect(px, py, cs, cs); x.fillRect(px, ch - py - cs, cs, cs);
    }
    x.strokeStyle = 'rgba(40,50,62,0.35)'; x.lineWidth = 2;
    [0.1, 0.42, 0.86].forEach(u => [0.19, 0.81].forEach(v => x.strokeRect(u * cw, (v - 0.045) * ch, 0.9 / L * cw, 0.11 * ch)));
    if (liv.over) liv.over(P);
    else if (liv.text?.length) {   // generic: a main title with an optional second line underneath
      const t = liv.text, col = liv.textColor;
      if (t.length > 1) { const a = P.title(t[0], 0.12, tv(0.046) - 0.03, 0.046, { col, cjk: /[^\x00-\x7f]/.test(t[0]) }); P.title(t[1], a[0], tv(0.022), 0.022, { col, w: 600 }); }
      else P.title(t[0], 0.12, tv(0.046), 0.046, { col });
    }
    return c;
  }

  // ── Geometry ──
  // Loft between polygon sections (same vertex count); faces facing z≥0 → group 0, z<0 → group 1 (two-sided liveries)
  function loft(sections, uvFn, caps = true) {
    const A = [], B = [];
    const push = (arr, a, b, c) => arr.push(a, b, c);
    const tri = (a, b, c) => { const n = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(c, a)); push(n.z >= 0 ? A : B, a, b, c); };
    for (let s = 0; s < sections.length - 1; s++) {
      const p = sections[s], q = sections[s + 1], n = p.length;
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; tri(p[i], q[i], q[j]); tri(p[i], q[j], p[j]); }
    }
    if (caps) [sections[0], sections[sections.length - 1]].forEach((poly, ci) => { const c0 = poly.reduce((m, v) => m.add(v), new T.Vector3()).multiplyScalar(1 / poly.length);
      for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length; ci ? tri(c0, poly[i], poly[j]) : tri(c0, poly[j], poly[i]); } });
    const all = A.concat(B), pos = new Float32Array(all.length * 3), uv = new Float32Array(all.length * 2);
    all.forEach((v, i) => { pos.set([v.x, v.y, v.z], i * 3); const t = uvFn ? uvFn(v) : [0, 0]; uv.set(t, i * 2); });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.addGroup(0, A.length, 0); g.addGroup(A.length, B.length, 1); g.computeVertexNormals(); return g;
  }
  // NACA-like section: points (along chord 0..1, thickness offset) going round from the trailing edge
  const XS = [1, 0.75, 0.5, 0.3, 0.15, 0.05, 0, 0.05, 0.15, 0.3, 0.5, 0.75];
  const yt = x => 5 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
  const airfoil = t => XS.map((x, i) => [x, (i <= 6 ? 1 : -0.75) * t * yt(x)]);
  // Horizontal surface section at spanwise z: chord along x, thickness along y
  const hSec = (xle, y, z, c, t) => airfoil(t).map(([a, b]) => new T.Vector3(xle + a * c, y + b * c, z));
  // Vertical surface section at height y: chord along x, thickness along z
  const vSec = (xle, y, z0, c, t) => airfoil(t).map(([a, b]) => new T.Vector3(xle + a * c, y, z0 + b * c));

  function buildAircraft(code, airline) {
    const d = DIMS[code] || DIMS[FALLBACK[window.Aviation?.type(code)?.body] || 'A320'];
    const [L, S, D, sweep, o] = d, R = D / 2, liv = liveryOf(airline);
    const grp = new T.Group();
    const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.12, side: T.DoubleSide, ...extra });
    const hf = o.deck2 ? 1.2 : 1.03;   // height factor of the cross-section

    // Fuselage profile: centre height, vertical and horizontal radius at t = 0 (nose) … 1 (tail)
    const tn = Math.min(0.13, 2.1 * R / L), tt = 1 - Math.min(0.34, 5.2 * R / L);
    const prof = t => {
      let top = R * hf, bot = -R * hf, rz = R;
      if (t < tn) { const a = t / tn, e = Math.sqrt(Math.max(0, 1 - (1 - a) ** 2)); const droop = -0.28 * R * (1 - a) ** 2; top = droop + (top) * e; bot = droop + bot * e; rz = R * e; }
      if (t > tt) { const s = (t - tt) / (1 - tt); top = R * hf * (1 - 0.32 * s ** 1.4); bot = -R * hf + (R * hf * 2 - R * 0.32 - R * hf * 0.32) * s ** 1.25; rz = R * (1 - 0.86 * s ** 1.15); }
      if (o.hump) { const h = t < 0.06 ? 0 : t < 0.12 ? (t - 0.06) / 0.06 : t < 0.3 ? 1 : t < 0.42 ? 1 - (t - 0.3) / 0.12 : 0; top += 0.42 * R * Math.sin(h * Math.PI / 2); }
      return { yc: (top + bot) / 2, ry: Math.max(0.001, (top - bot) / 2), rz: Math.max(0.001, rz) };
    };
    const NS = 72, NC = 40, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const t = i / NS, p = prof(t), x = t * L - L / 2;
      for (let j = 0; j <= NC; j++) { const th = j / NC * Math.PI * 2; pos.push(x, p.yc + p.ry * Math.cos(th), p.rz * Math.sin(th)); uv.push(t, j / NC); }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NC; j++) { const a = i * (NC + 1) + j, b = a + NC + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }   // counter-clockwise seen from outside
    const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); fg.setIndex(idx); fg.computeVertexNormals();
    grp.add(new T.Mesh(fg, new T.MeshStandardMaterial({ map: tex(paintFuselage(liv, L, R, hf)), roughness: 0.35, metalness: 0.1 })));

    // Wings
    const high = o.wing === 'high', yw = high ? R * 0.82 : -R * 0.5, zr = R * 0.75, b = S / 2 - zr;
    const cr = (o.mount === 'prop' ? 0.082 : 0.19) * S * (L > 60 ? 0.85 : 1), ct = cr * (o.mount === 'prop' ? 0.55 : 0.27);
    const xr = -L / 2 + L * (o.mount === 'rear' ? 0.43 : o.mount === 'prop' ? 0.42 : 0.37), le = Math.tan((sweep + 4) * Math.PI / 180), dih = high ? -0.02 : Math.tan(5.5 * Math.PI / 180);
    const wingMat = mat('#c5ccd6'), wlMat = mat(liv.winglet || '#c5ccd6');
    const wingAt = f => ({ x: xr + le * b * f, y: yw + dih * b * f, c: cr + (ct - cr) * f });
    [1, -1].forEach(sd => {
      const st = [0, 0.33, 1].map(f => { const w = wingAt(f); return hSec(w.x, w.y, sd * (zr + b * f), w.c, f ? 0.1 : 0.13); });
      grp.add(new T.Mesh(loft(st), [wingMat, wingMat]));
      // winglets
      const tip = wingAt(1), tz = sd * (zr + b);
      const up = (h, cant, ch, back = 0) => { const s0 = hSec(tip.x, tip.y, tz, ch, 0.08), s1 = hSec(tip.x + h * 0.9 + back, tip.y + h, tz + sd * cant, ch * 0.45, 0.08); grp.add(new T.Mesh(loft([s0, s1]), [wlMat, wlMat])); };
      if (o.tip === 'sharklet') up(S * 0.07, S * 0.012, ct * 0.9);
      else if (o.tip === 'blended') up(S * 0.07, S * 0.02, ct * 0.85);
      else if (o.tip === 'max') { up(S * 0.07, S * 0.015, ct * 0.85); const s0 = hSec(tip.x, tip.y, tz, ct * 0.6, 0.08), s1 = hSec(tip.x + S * 0.03, tip.y - S * 0.035, tz, ct * 0.3, 0.08); grp.add(new T.Mesh(loft([s0, s1]), [wingMat, wingMat])); }
      else if (o.tip === 'small') up(S * 0.045, S * 0.008, ct * 0.8);
      else if (o.tip === 'fence') { const s0 = hSec(tip.x - ct * 0.1, tip.y - S * 0.012, tz, ct * 0.75, 0.06), s1 = hSec(tip.x + ct * 0.15, tip.y + S * 0.025, tz, ct * 0.45, 0.06); grp.add(new T.Mesh(loft([s0, s1]), [wlMat, wlMat])); }
    });
    // belly fairing
    if (!high) { const fair = new T.Mesh(new T.SphereGeometry(1, 24, 12), mat(liv.belly || '#e6e9ee')); fair.scale.set(cr * 0.75, R * 0.42, R * 0.82); fair.position.set(xr + cr * 0.5, -R * 0.68, 0); grp.add(fair); }

    // Engines
    const engMat = mat(liv.engine || '#e9ecf0'), lipMat = mat(liv.lip || '#b8c1cb', { metalness: 0.55, roughness: 0.3 }), darkMat = mat('#1a2028', { roughness: 0.6 }), metal = mat('#9aa3ad', { metalness: 0.6, roughness: 0.3 });
    const nacelle = (ed, len) => {
      const pts = [[0, ed * 0.42], [0.04, ed * 0.5], [0.12, ed * 0.5], [0.55, ed * 0.47], [0.85, ed * 0.36], [1, ed * 0.28]].map(([a, r]) => new T.Vector2(r, a * len));
      const g = new T.Group(), shell = new T.Mesh(new T.LatheGeometry(pts, 40), engMat); g.add(shell);
      const lip = new T.Mesh(new T.TorusGeometry(ed * 0.46, ed * 0.045, 8, 40), lipMat); lip.rotation.x = Math.PI / 2; lip.position.y = len * 0.015; g.add(lip);
      const fan = new T.Mesh(new T.CircleGeometry(ed * 0.43, 32), darkMat); fan.position.y = 0.06 * len; fan.rotation.x = Math.PI / 2; g.add(fan);
      const spin = new T.Mesh(new T.ConeGeometry(ed * 0.13, ed * 0.3, 20), metal); spin.position.y = 0.04 * len; spin.rotation.x = Math.PI; g.add(spin);
      const noz = new T.Mesh(new T.CylinderGeometry(ed * 0.2, ed * 0.27, len * 0.18, 24), metal); noz.position.y = len * 1.05; g.add(noz);
      g.rotation.z = -Math.PI / 2;   // lathe axis (+y, inlet → exhaust) → +x, so the inlet faces forward (−x is the nose)
      return g;
    };
    if (o.mount === 'wing') {
      const ed = o.ed, len = ed * 2.1, spots = o.eng === 4 ? [0.36, 0.66] : [0.34];
      spots.forEach(f => [1, -1].forEach(sd => {
        const w = wingAt(f), z = sd * (zr + b * f), e = nacelle(ed, len);
        e.position.set(w.x - len * 0.62, w.y - ed * 0.55, z); grp.add(e);
        const py = new T.Mesh(new T.BoxGeometry(len * 0.7, ed * 0.42, ed * 0.12), engMat); py.position.set(w.x - len * 0.05, w.y - ed * 0.18, z); grp.add(py);
      }));
    } else if (o.mount === 'rear') {
      const ed = o.ed, len = ed * 2.4;
      [1, -1].forEach(sd => { const e = nacelle(ed, len), x0 = -L / 2 + L * 0.7; e.position.set(x0, R * 0.35, sd * (R + ed * 0.72)); grp.add(e);
        const py = new T.Mesh(new T.BoxGeometry(len * 0.5, ed * 0.16, ed * 0.8), engMat); py.position.set(x0 + len * 0.5, R * 0.35, sd * (R + ed * 0.2)); grp.add(py); });
    } else {   // turboprops: nacelle on the high wing, propeller in front
      [1, -1].forEach(sd => {
        const f = 0.3, w = wingAt(f), z = sd * (zr + b * f), len = L * 0.2;
        const nac = new T.Mesh(new T.CapsuleGeometry(o.ed * 0.55, len, 8, 20), engMat); nac.rotation.z = Math.PI / 2; nac.position.set(w.x + len * 0.2, w.y - o.ed * 0.3, z); grp.add(nac);
        const prop = new T.Group(); prop.position.set(w.x - len * 0.42, w.y - o.ed * 0.3, z);
        const hub = new T.Mesh(new T.ConeGeometry(o.ed * 0.35, o.ed * 0.8, 20), metal); hub.rotation.z = Math.PI / 2; prop.add(hub);
        const disc = new T.Mesh(new T.CircleGeometry(S * 0.07, 40), new T.MeshBasicMaterial({ color: '#c9d6e3', transparent: true, opacity: 0.1, side: T.DoubleSide, depthWrite: false })); disc.rotation.y = Math.PI / 2; prop.add(disc);
        const blades = new T.Group(); for (let i = 0; i < 6; i++) { const bl = new T.Mesh(new T.BoxGeometry(0.04, S * 0.068, 0.16), mat('#3a434e')); bl.position.y = S * 0.035; const p0 = new T.Group(); p0.add(bl); p0.rotation.x = i * Math.PI / 3; blades.add(p0); }
        prop.add(blades); prop.userData.spin = blades; grp.add(prop);
      });
    }

    // Tail: fin with the livery on both sides, horizontal stabiliser
    const tFin = o.tail === 'T', finH = D * (tFin ? 1.45 : 1.55) * (o.deck2 ? 1.05 : 1), crf = L * (tFin ? 0.13 : 0.15), ctf = crf * (tFin ? 0.75 : 0.38);
    const xf = L / 2 - crf - L * 0.015, yb = prof(0.88).yc + prof(0.88).ry * 0.7, fsw = Math.tan((tFin ? 38 : 40) * Math.PI / 180);
    const xMin = xf, xMax = xf + finH * fsw + ctf, yMin = yb, yMax = yb + finH;
    const finUV = v => [(v.x - xMin) / (xMax - xMin), 1 - (v.y - yMin) / (yMax - yMin)];
    const fin = loft([vSec(xf, yb, 0, crf, 0.11), vSec(xf + finH * 0.5 * fsw, yb + finH * 0.5, 0, (crf + ctf) / 2, 0.1), vSec(xf + finH * fsw, yb + finH, 0, ctf, 0.09)], finUV);
    // fin outline in texture coordinates (0..1, top = 0), so tail art is placed inside the real fin shape
    const bw = xMax - xMin, finShape = { aspect: bw / finH, poly: [[0, 1], [crf / bw, 1], [(finH * fsw + ctf) / bw, 0], [finH * fsw / bw, 0]] };
    const tailMat = mir => new T.MeshStandardMaterial({ map: tex(paintTail(liv, mir, finShape)), roughness: 0.35, metalness: 0.1, side: T.DoubleSide });
    grp.add(new T.Mesh(fin, [tailMat(false), tailMat(true)]));
    const hs = S * (tFin ? 0.32 : 0.36) / 2, crh = L * 0.085, cth = crh * 0.38, hsw = Math.tan((sweep + 7) * Math.PI / 180);
    const yh = tFin ? yMax - finH * 0.02 : prof(0.9).yc, xh = tFin ? xf + finH * fsw - crh * 0.25 : L / 2 - L * 0.135;
    const stabMat = mat(tFin ? '#d9dee5' : '#c5ccd6');
    [1, -1].forEach(sd => grp.add(new T.Mesh(loft([hSec(xh, yh, 0, crh, 0.1), hSec(xh + hs * hsw, yh + (tFin ? 0 : hs * 0.1), sd * hs, cth, 0.09)]), [stabMat, stabMat])));

    // Normalise: centred, longest dimension = 2 units
    const box = new T.Box3().setFromObject(grp), size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
    const sc = 2 / Math.max(size.x, size.z); grp.children.forEach(m => m.position.sub(ctr));
    const wrap = new T.Group(); wrap.add(grp); wrap.scale.setScalar(sc);
    wrap.userData = { liv, code, L, S };
    return wrap;
  }

  // ── Scene: lights and a holographic ring, coloured for the light or dark theme ──
  let THEME = 'dark';
  function makeScene(theme) {
    const sc = new T.Scene(), light = theme === 'light', accent = light ? '#0a7ea6' : '#4de1ff';
    sc.add(new T.HemisphereLight(light ? '#ffffff' : '#e6f0ff', light ? '#9fb0c4' : '#1a2840', light ? 1.35 : 1.15));
    const sun = new T.DirectionalLight('#ffffff', light ? 1.6 : 1.9); sun.position.set(-2, 3, 2.5); sc.add(sun);
    const rim = new T.DirectionalLight(accent, light ? 0.35 : 0.9); rim.position.set(2, 1, -3); sc.add(rim);
    const ring = new T.Group(), lineMat = new T.MeshBasicMaterial({ color: accent, transparent: true, opacity: light ? 0.45 : 0.35, side: T.DoubleSide, depthWrite: false });
    [1.05, 1.25].forEach((r, i) => { const m = new T.Mesh(new T.RingGeometry(r - 0.006, r, 96), lineMat.clone()); m.material.opacity = i ? lineMat.opacity / 2 : lineMat.opacity; ring.add(m); });
    for (let i = 0; i < 24; i++) { const t = new T.Mesh(new T.PlaneGeometry(0.004, i % 6 ? 0.04 : 0.09), lineMat); const a = i / 24 * Math.PI * 2; t.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0); t.rotation.z = a + Math.PI / 2; ring.add(t); }
    ring.add(new T.Mesh(new T.CircleGeometry(1.05, 64), new T.MeshBasicMaterial({ color: accent, transparent: true, opacity: light ? 0.07 : 0.05, depthWrite: false })));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -0.32; sc.add(ring);
    return sc;
  }
  function frameCamera(cam, zoom = 1) { cam.position.set(-1.25 / zoom, 0.62 / zoom, 2.6 / zoom); cam.lookAt(0, -0.1, 0); }
  function dispose(obj) { obj.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose(); }); }); }
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Hangar cards: one shared renderer, a still picture per card, rotation only while hovered ──
  // Models exist only while they are drawn (a card snapshot) or hovered, so memory stays low.
  const RW = 560, RH = 350, YAW0 = -0.15;
  let R0 = null, SCENE = null, CAM = null, IO = null, HOVER = null;
  const CARDS = new Map(), QUEUE = [], SPRITES = new Map();
  function ensureShared() {
    if (R0) return;
    R0 = new T.WebGLRenderer({ canvas: cnv(RW, RH), antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    R0.setPixelRatio(1); R0.setSize(RW, RH, false); R0.outputColorSpace = T.SRGBColorSpace; R0.toneMapping = T.ACESFilmicToneMapping; R0.toneMappingExposure = 1.05;
    SCENE = makeScene(THEME); CAM = new T.PerspectiveCamera(30, RW / RH, 0.1, 50); frameCamera(CAM, 1.08);
    IO = new IntersectionObserver(es => es.forEach(e => { const st = CARDS.get(e.target); if (!st) return; st.visible = e.isIntersecting; if (st.visible && !st.done) enqueue(e.target); }), { rootMargin: '600px' });
  }
  function draw(cv, model, yaw, pitch) {
    SCENE.add(model); model.rotation.set(pitch, yaw, 0); R0.render(SCENE, CAM); SCENE.remove(model);
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(R0.domElement, 0, 0, cv.width, cv.height);
  }
  function enqueue(cv) { if (!QUEUE.includes(cv)) QUEUE.push(cv); if (QUEUE.length === 1) setTimeout(work, 0); }
  function work() {   // one snapshot per task, so a long hangar never blocks the page
    const cv = QUEUE.shift(); if (!cv) return;
    const st = CARDS.get(cv);
    if (st && cv.isConnected && !st.done && HOVER?.cv !== cv) { const m = buildAircraft(st.type, st.airline); draw(cv, m, st.yaw, st.pitch); dispose(m); st.done = true; }
    if (QUEUE.length) setTimeout(work, 16);
  }
  function startHover(cv) {
    const st = CARDS.get(cv); if (!st || reduced()) return;
    stopHover();
    HOVER = { cv, st, model: buildAircraft(st.type, st.airline), last: performance.now(), raf: 0 };
    const tick = now => {
      if (!HOVER || HOVER.cv !== cv) return;
      if (!st.dragging) st.yaw += (now - HOVER.last) * 0.0009;
      HOVER.last = now; draw(cv, HOVER.model, st.yaw, st.pitch); HOVER.raf = requestAnimationFrame(tick);
    };
    HOVER.raf = requestAnimationFrame(tick);
  }
  function stopHover() { if (!HOVER) return; cancelAnimationFrame(HOVER.raf); dispose(HOVER.model); HOVER = null; }
  function wireCard(cv, st) {
    cv.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') startHover(cv); });
    cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && HOVER?.cv === cv) { stopHover(); } });
    let p0 = null;
    cv.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; p0 = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch, moved: false }; st.dragging = true; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!p0) return; const dx = e.clientX - p0.x, dy = e.clientY - p0.y; if (Math.abs(dx) + Math.abs(dy) > 4) p0.moved = true; st.yaw = p0.yaw + dx * 0.01; st.pitch = Math.max(-0.5, Math.min(0.5, p0.pitch + dy * 0.006)); });
    const up = () => { if (!p0) return; cv.dataset.dragged = p0.moved ? '1' : ''; p0 = null; st.dragging = false; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }

  let LOADING = null;
  const Fleet3D = {
    load() {
      if (T) return Promise.resolve(true);
      return LOADING ||= new Promise(res => {
        const probe = cnv(2, 2); if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return res(false);
        const s = document.createElement('script'); s.src = 'vendor/three.min.js'; s.onload = () => { T = window.THREE; res(!!T); }; s.onerror = () => res(false); document.head.appendChild(s);
      });
    },
    has: code => !!DIMS[String(code || '').toUpperCase()],
    liveryName: (iata, lang) => { const l = LIV[String(iata || '').toUpperCase()]; return l ? (lang === 'zh' ? l.zh : l.name) : ''; },
    // Register a hangar card canvas (16:10); it is drawn once when it scrolls into view
    card(cv, { type, airline }) {
      ensureShared();
      const dpr = Math.min(1.5, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
      cv.width = Math.round((r.width || 280) * dpr); cv.height = Math.round(cv.width * RH / RW);
      const st = { type, airline, yaw: YAW0, pitch: 0, visible: false, done: false };
      CARDS.set(cv, st); wireCard(cv, st); IO.observe(cv);
    },
    setAirline(cv, airline) { const st = CARDS.get(cv); if (!st) return; st.airline = airline; st.done = false; if (HOVER?.cv === cv) { stopHover(); startHover(cv); } else enqueue(cv); },
    setTheme(theme) {
      const t = theme === 'light' ? 'light' : 'dark';
      if (t === THEME) return;
      THEME = t;
      if (!R0) return;
      dispose(SCENE); SCENE = makeScene(THEME);
      for (const [cv, st] of CARDS) { if (!cv.isConnected) { CARDS.delete(cv); IO.unobserve(cv); continue; } st.done = false; if (st.visible) enqueue(cv); }
    },
    // Top-down picture (nose up) of a type in an airline's livery, as a PNG data URL; drawn with the shared renderer and cached
    sprite({ type, airline }, px = 192) {
      const key = `${type}|${airline?.iata || airline?.name || ''}|${px}`;
      if (SPRITES.has(key)) return SPRITES.get(key);
      ensureShared();
      const sc = new T.Scene(); sc.add(new T.HemisphereLight('#ffffff', '#8a97a8', 1.5));
      const sun = new T.DirectionalLight('#ffffff', 1.5); sun.position.set(-1, 4, 1.5); sc.add(sun);
      const cam = new T.OrthographicCamera(-1.04, 1.04, 1.04, -1.04, 0.1, 20); cam.position.set(0, 6, 2.2); cam.up.set(-1, 0, 0); cam.lookAt(0, 0, 0);
      const m = buildAircraft(type, airline); sc.add(m);
      R0.setSize(px, px, false); R0.render(sc, cam); const url = R0.domElement.toDataURL('image/png');
      R0.setSize(RW, RH, false); dispose(m); dispose(sc);
      SPRITES.set(key, url); return url;
    },
    // Full-size viewer with its own renderer: slow rotation, drag to turn, wheel / pinch to zoom
    viewer(host, { type, airline, yaw = YAW0, zoom = 1 }) {
      const cv = cnv(10, 10); cv.className = 'v3d-canvas'; host.appendChild(cv);
      const rnd = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      rnd.outputColorSpace = T.SRGBColorSpace; rnd.toneMapping = T.ACESFilmicToneMapping; rnd.toneMappingExposure = 1.05; rnd.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      let scene = makeScene(THEME); const cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
      const st = { yaw, pitch: 0, zoom, dragging: false };
      let model = buildAircraft(type, airline); scene.add(model);
      const size = () => { const w = host.clientWidth, h = host.clientHeight; rnd.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
      size(); const ro = new ResizeObserver(size); ro.observe(host);
      let p0 = null;
      cv.addEventListener('pointerdown', e => { p0 = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; st.dragging = true; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', e => { if (!p0) return; st.yaw = p0.yaw + (e.clientX - p0.x) * 0.01; st.pitch = Math.max(-0.6, Math.min(0.6, p0.pitch + (e.clientY - p0.y) * 0.006)); });
      const up = () => { p0 = null; st.dragging = false; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', e => { e.preventDefault(); st.zoom = Math.max(0.6, Math.min(3, st.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); }, { passive: false });
      let pinch = null;
      cv.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), z: st.zoom }; }, { passive: true });
      cv.addEventListener('touchmove', e => { if (pinch && e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); st.zoom = Math.max(0.6, Math.min(3, pinch.z * d / pinch.d)); } }, { passive: true });
      cv.addEventListener('touchend', () => { pinch = null; });
      let raf = 0, last = performance.now();
      const tick = now => { raf = requestAnimationFrame(tick); if (!st.dragging && !reduced()) st.yaw += (now - last) * 0.00025; last = now;
        model.rotation.set(st.pitch, st.yaw, 0); model.traverse(o => { if (o.userData.spin) o.userData.spin.rotation.x = now * 0.02; });
        frameCamera(cam, st.zoom * Math.min(1, Math.max(0.58, cam.aspect / 1.3))); rnd.render(scene, cam); };
      raf = requestAnimationFrame(tick);
      return {
        setAirline(al) { scene.remove(model); dispose(model); model = buildAircraft(type, al); scene.add(model); },
        setTheme(t) { scene.remove(model); dispose(scene); scene = makeScene(t === 'light' ? 'light' : 'dark'); scene.add(model); },
        destroy() { cancelAnimationFrame(raf); ro.disconnect(); dispose(model); dispose(scene); rnd.dispose(); rnd.forceContextLoss?.(); cv.remove(); },
      };
    },
  };
  window.Fleet3D = Fleet3D;
})();
