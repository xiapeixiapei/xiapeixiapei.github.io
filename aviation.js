/* aviation.js: shared helpers for the flight log (flights.html) and its editor in the Site Manager.
 *
 * - Aircraft types: ICAO type designator → name, manufacturer, body class (the 3D models in
 *   fleet3d.js are built from each type's dimensions; a blueprint silhouette is the fallback).
 * - Chinese names for common airlines and manufacturers.
 * - Great-circle distance, estimated flight time and great-circle paths for the map.
 *
 * Usage: window.Aviation.type('B77W'), Aviation.typeName(code, lang), Aviation.silhouette(kind), …
 */
(function () {
  'use strict';

  // ── Aircraft types: [ICAO code, name, manufacturer, body] ──
  // body: narrow | wide | quad (four engines) | regional | turboprop
  const TYPES = [
    ['A318', 'Airbus A318', 'Airbus', 'narrow'],
    ['A319', 'Airbus A319', 'Airbus', 'narrow'],
    ['A320', 'Airbus A320', 'Airbus', 'narrow'],
    ['A20N', 'Airbus A320neo', 'Airbus', 'narrow'],
    ['A321', 'Airbus A321', 'Airbus', 'narrow'],
    ['A21N', 'Airbus A321neo', 'Airbus', 'narrow'],
    ['BCS1', 'Airbus A220-100', 'Airbus', 'narrow'],
    ['BCS3', 'Airbus A220-300', 'Airbus', 'narrow'],
    ['A332', 'Airbus A330-200', 'Airbus', 'wide'],
    ['A333', 'Airbus A330-300', 'Airbus', 'wide'],
    ['A339', 'Airbus A330-900neo', 'Airbus', 'wide'],
    ['A343', 'Airbus A340-300', 'Airbus', 'quad'],
    ['A346', 'Airbus A340-600', 'Airbus', 'quad'],
    ['A359', 'Airbus A350-900', 'Airbus', 'wide'],
    ['A35K', 'Airbus A350-1000', 'Airbus', 'wide'],
    ['A388', 'Airbus A380-800', 'Airbus', 'quad'],
    ['B733', 'Boeing 737-300', 'Boeing', 'narrow'],
    ['B737', 'Boeing 737-700', 'Boeing', 'narrow'],
    ['B738', 'Boeing 737-800', 'Boeing', 'narrow'],
    ['B739', 'Boeing 737-900', 'Boeing', 'narrow'],
    ['B38M', 'Boeing 737 MAX 8', 'Boeing', 'narrow'],
    ['B39M', 'Boeing 737 MAX 9', 'Boeing', 'narrow'],
    ['B744', 'Boeing 747-400', 'Boeing', 'quad'],
    ['B748', 'Boeing 747-8', 'Boeing', 'quad'],
    ['B752', 'Boeing 757-200', 'Boeing', 'narrow'],
    ['B763', 'Boeing 767-300', 'Boeing', 'wide'],
    ['B772', 'Boeing 777-200', 'Boeing', 'wide'],
    ['B77L', 'Boeing 777-200LR', 'Boeing', 'wide'],
    ['B77W', 'Boeing 777-300ER', 'Boeing', 'wide'],
    ['B779', 'Boeing 777-9', 'Boeing', 'wide'],
    ['B788', 'Boeing 787-8', 'Boeing', 'wide'],
    ['B789', 'Boeing 787-9', 'Boeing', 'wide'],
    ['B78X', 'Boeing 787-10', 'Boeing', 'wide'],
    ['C919', 'COMAC C919', 'COMAC', 'narrow'],
    ['AJ27', 'COMAC ARJ21 (C909)', 'COMAC', 'regional'],
    ['E170', 'Embraer 170', 'Embraer', 'regional'],
    ['E175', 'Embraer 175', 'Embraer', 'regional'],
    ['E190', 'Embraer 190', 'Embraer', 'regional'],
    ['E195', 'Embraer 195', 'Embraer', 'regional'],
    ['E290', 'Embraer 190-E2', 'Embraer', 'regional'],
    ['E295', 'Embraer 195-E2', 'Embraer', 'regional'],
    ['CRJ9', 'Bombardier CRJ900', 'Bombardier', 'regional'],
    ['DH8D', 'De Havilland Dash 8-400', 'De Havilland Canada', 'turboprop'],
    ['AT76', 'ATR 72-600', 'ATR', 'turboprop'],
    ['F100', 'Fokker 100', 'Fokker', 'regional'],
  ].map(([code, name, mfr, body]) => ({ code, name, mfr, body }));
  const BY_CODE = new Map(TYPES.map(t => [t.code, t]));

  const MFR_ZH = { Airbus: '空客', Boeing: '波音', COMAC: '中国商飞', Embraer: '巴航工业', Bombardier: '庞巴迪', 'De Havilland Canada': '德哈维兰', ATR: 'ATR', Fokker: '福克' };
  // Chinese short names; everything else shows its English name in both languages
  const AIRLINE_ZH = {
    CA: '中国国际航空', MU: '中国东方航空', CZ: '中国南方航空', HU: '海南航空', '3U': '四川航空', ZH: '深圳航空', MF: '厦门航空',
    FM: '上海航空', HO: '吉祥航空', '9C': '春秋航空', KN: '中国联合航空', SC: '山东航空', GS: '天津航空', JD: '首都航空', PN: '西部航空',
    TV: '西藏航空', EU: '成都航空', G5: '华夏航空', '8L': '祥鹏航空', BK: '奥凯航空', NS: '河北航空', GJ: '长龙航空', QW: '青岛航空', DR: '瑞丽航空',
    CX: '国泰航空', HX: '香港航空', UO: '香港快运', NX: '澳门航空', CI: '中华航空', BR: '长荣航空', JX: '星宇航空',
    KL: '荷兰皇家航空', AF: '法国航空', LH: '汉莎航空', BA: '英国航空', AY: '芬兰航空', SK: '北欧航空', LX: '瑞士国际航空', OS: '奥地利航空',
    IB: '西班牙国家航空', AZ: '意大利航空', TP: '葡萄牙航空', EI: '爱尔兰航空', LO: '波兰航空', TK: '土耳其航空', SU: '俄罗斯航空',
    U2: '易捷航空', FR: '瑞安航空', HV: '泛航航空', W6: '维兹航空', VY: '伏林航空', EW: '欧洲之翼', DY: '挪威航空',
    EK: '阿联酋航空', QR: '卡塔尔航空', EY: '阿提哈德航空', SQ: '新加坡航空', TG: '泰国国际航空', MH: '马来西亚航空', GA: '印尼鹰航',
    VN: '越南航空', PR: '菲律宾航空', NH: '全日空', JL: '日本航空', KE: '大韩航空', OZ: '韩亚航空', AI: '印度航空',
    QF: '澳洲航空', NZ: '新西兰航空', AA: '美国航空', UA: '美国联合航空', DL: '达美航空', AC: '加拿大航空', ET: '埃塞俄比亚航空',
  };

  // ── Distance and time ──
  const R = 6371.0088, rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  function distKm(a, b) {
    if (!a || !b || typeof a.lat !== 'number' || typeof b.lat !== 'number') return 0;
    const p1 = rad(a.lat), p2 = rad(b.lat), dp = p2 - p1, dl = rad(b.lon - a.lon);
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  // Block time estimate when none was entered: ~30 min taxi/climb plus cruise at ~830 km/h
  const estMinutes = km => km ? Math.round(30 + km / 830 * 60) : 0;
  // Points along the great circle, longitudes unwrapped so the line never jumps across the map
  function greatCircle(a, b, n = 64) {
    const p1 = rad(a.lat), l1 = rad(a.lon), p2 = rad(b.lat), l2 = rad(b.lon);
    const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
    if (!d) return [[a.lat, a.lon], [b.lat, b.lon]];
    const out = []; let prev = null;
    for (let i = 0; i <= n; i++) {
      const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
      const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
      const z = A * Math.sin(p1) + B * Math.sin(p2);
      let lon = deg(Math.atan2(y, x)); const lat = deg(Math.atan2(z, Math.sqrt(x * x + y * y)));
      if (prev !== null) { while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360; }
      prev = lon; out.push([lat, lon]);
    }
    return out;
  }

  // ── Names ──
  const type = code => BY_CODE.get(String(code || '').toUpperCase()) || null;
  const mfrName = (m, lang) => lang === 'zh' ? (MFR_ZH[m] || m) : m;
  function typeName(code, lang, fallback) {
    const t = type(code); if (!t) return fallback || code || '';
    if (lang !== 'zh') return t.name;
    return (MFR_ZH[t.mfr] || t.mfr) + t.name.replace(/^(Airbus|Boeing|COMAC|Embraer|Bombardier|De Havilland|ATR|Fokker)\s+/, '');   // 波音777-300ER, 空客A350-900
  }
  const airlineName = (al, lang) => !al ? '' : (lang === 'zh' ? (al.zh || AIRLINE_ZH[al.iata] || al.name || al.iata || '') : (al.name || al.iata || ''));
  // Country of an airport for statistics: Hong Kong, Macau and Taiwan count as China
  const statCC = cc => ({ TW: 'CN', HK: 'CN', MO: 'CN' })[String(cc || '').toUpperCase()] || String(cc || '').toUpperCase();
  const DN = {};
  function countryName(cc, lang) {
    cc = String(cc || '').toUpperCase(); if (!cc) return '';
    if (cc === 'CN') return lang === 'zh' ? '中国' : 'China';
    try { DN[lang] ||= new Intl.DisplayNames([lang === 'zh' ? 'zh-Hans' : 'en'], { type: 'region' }); return DN[lang].of(cc) || cc; } catch (e) { return cc; }
  }

  // ── Blueprint silhouettes (top view, nose up) for when WebGL is not available ──
  function silhouette(body) {
    const wide = body === 'wide' || body === 'quad', prop = body === 'turboprop', reg = body === 'regional';
    const fw = wide ? 6 : 4.2, x0 = 50 - fw, x1 = 50 + fw;
    const fus = `M50 5 C${50 + fw * 0.7} 5 ${x1} 10 ${x1} 18 L${x1} 80 L${50 + fw * 0.45} 93 L${50 - fw * 0.45} 93 L${x0} 80 L${x0} 18 C${x0} 10 ${50 - fw * 0.7} 5 50 5 Z`;
    const span = wide ? 46 : reg ? 34 : 40;
    const wing = prop
      ? `M${x0} 37 L${50 - span} 38 L${50 - span} 44 L${x0} 46 Z M${x1} 37 L${50 + span} 38 L${50 + span} 44 L${x1} 46 Z`
      : `M${x0} 36 L${50 - span} ${wide ? 58 : 56} L${50 - span} ${wide ? 62 : 60} L${x0} 52 Z M${x1} 36 L${50 + span} ${wide ? 58 : 56} L${50 + span} ${wide ? 62 : 60} L${x1} 52 Z`;
    const tail = `M${x0 + 1} 78 L${50 - (wide ? 16 : 13)} 88 L${50 - (wide ? 16 : 13)} 91 L${x0 + 1} 87 Z M${x1 - 1} 78 L${50 + (wide ? 16 : 13)} 88 L${50 + (wide ? 16 : 13)} 91 L${x1 - 1} 87 Z`;
    const eng = (x, y, w, h) => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="${w / 2}"/>`;
    let engines = '';
    if (prop) engines = [30, 70].map(x => eng(x, 33, 4, 10) + `<path d="M${x - 6} 33 H${x + 6}"/>`).join('');
    else if (body === 'quad') engines = [24, 36, 64, 76].map((x, i) => eng(x, (i === 0 || i === 3) ? 50 : 44, 4.4, 10)).join('');
    else if (reg) engines = eng(x0 - 2.5, 72, 3.4, 8) + eng(x1 + 2.5, 72, 3.4, 8);
    else engines = eng(wide ? 31 : 33, wide ? 45 : 44, wide ? 5.4 : 4.2, wide ? 11 : 9) + eng(wide ? 69 : 67, wide ? 45 : 44, wide ? 5.4 : 4.2, wide ? 11 : 9);
    return `<svg class="ac-sil" viewBox="0 0 100 100" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="0.9" stroke-linejoin="round" aria-hidden="true">
      <path d="M50 2 V98 M2 50 H98" stroke-opacity="0.18" stroke-dasharray="1.5 2" fill="none"/>
      <path d="${wing}"/><path d="${tail}"/><path d="${fus}"/><g>${engines}</g></svg>`;
  }

  window.Aviation = { TYPES, type, typeName, mfrName, airlineName, AIRLINE_ZH, countryName, statCC, distKm, estMinutes, greatCircle, silhouette };
})();
