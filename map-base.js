/* map-base.js: base map for the footprint pages.
 *
 * OpenStreetMap covers the whole world. On top of it, a Gaode (AutoNavi) layer is drawn and clipped
 * to China's outline (cn-outline.json: incl. Taiwan, Hong Kong, Macau, Zangnan, Aksai Chin and the
 * South China Sea islands), so inside China every border and label comes from Gaode, which follows
 * the official Chinese map, while everywhere else OSM keeps its full detail.
 *
 * Clipping is done per tile on a canvas, in the tile's own pixel space, so it stays correct while
 * panning and during zoom animations. Tiles that do not touch China are never requested from Gaode.
 *
 * Gaode tiles use GCJ-02 coordinates while all site data stay in WGS84. Instead of converting every
 * marker and polygon, the Gaode tile grid is shifted by the GCJ-02 offset near the view centre (the
 * offset changes very slowly, so the error across one screen is below a pixel), and the clip outline
 * is converted to GCJ-02 so it lines up with the Gaode tile content.
 *
 * If Gaode tiles keep failing, the clipped layer switches to a label-free, border-free terrain base
 * (Esri World Terrain Base), so OSM's borders are never shown inside China.
 *
 * China's seas (cn-scs.json: the South China Sea inside the dash line; the Bohai, Yellow Sea and East China
 * Sea incl. the Diaoyu Islands) are added to the clip as separate ring sets, so these seas also show Gaode,
 * and the South China Sea dash line itself is drawn as a vector layer on top.
 *
 * Usage: MapBase.attach(map, lang) once after creating the map; MapBase.setLang(lang) on language change.
 */
(function () {
  'use strict';

  // ── Config ──
  const GAODE_LANG = { zh: 'zh_cn', en: 'en' };   // Gaode English labels (mixed with Chinese for minor places)
  const GAODE_FAIL_LIMIT = 6;       // consecutive tile errors before falling back to the terrain base
  const OUTLINE_URL = 'cn-outline.json';
  const SCS_URL = 'cn-scs.json';       // South China Sea dash line + the sea area it encloses
  const DASH_STYLE = { color: '#7a4e8c', weight: 2.5, opacity: 0.9, lineCap: 'butt', interactive: false };
  const ATTR_GAODE = '&copy; <a href="https://www.amap.com/" target="_blank" rel="noopener">高德地图 AutoNavi</a> · GS(2025)5996号';
  const ATTR_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  const ATTR_ESRI = 'Tiles &copy; Esri';
  const gaodeUrl = lang => `https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=${lang}&size=1&scl=1&style=7`;

  // ── WGS84 -> GCJ-02 (standard public algorithm) ──
  const A = 6378245.0, EE = 0.00669342162296594323;
  function tLat(x, y) {
    let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    r += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
    r += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
    return r;
  }
  function tLon(x, y) {
    let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    r += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
    r += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
    return r;
  }
  function gcjDelta(lat, lon) {
    let dLat = tLat(lon - 105, lat - 35), dLon = tLon(lon - 105, lat - 35);
    const rad = lat / 180 * Math.PI; let m = Math.sin(rad); m = 1 - EE * m * m; const s = Math.sqrt(m);
    dLat = (dLat * 180) / ((A * (1 - EE)) / (m * s) * Math.PI);
    dLon = (dLon * 180) / (A / s * Math.cos(rad) * Math.PI);
    return [dLat, dLon];
  }
  function wgs84ToGcj02(lat, lon) { const [a, b] = gcjDelta(lat, lon); return [lat + a, lon + b]; }

  // ── China outline, pre-projected to zoom-0 pixels (256 px world), in WGS84 and in GCJ-02 ──
  // { wgs: [[ring]], gcj: [[ring]] }: ring sets, each clipped on its own so overlapping sets add up;
  // ring = { pts: Float64Array [x0,y0,x1,y1,...], bbox }
  let OUTLINE = null, SCS = null;
  function prepRings(polys, toLatLon) {
    return polys.map(poly => {
      const pts = new Float64Array(poly.length * 2);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      poly.forEach(([lon, lat], i) => {
        const [la, lo] = toLatLon(lat, lon), p = L.CRS.EPSG3857.latLngToPoint(L.latLng(la, lo), 0);
        pts[2 * i] = p.x; pts[2 * i + 1] = p.y;
        if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
      });
      return { pts, bbox: [x0, y0, x1, y1] };
    });
  }
  function loadOutline() {
    const scs = fetch(SCS_URL).then(r => r.json()).catch(() => null);
    return loadOutline.p ||= Promise.all([fetch(OUTLINE_URL).then(r => r.json()), scs]).then(([d, s]) => {
      SCS = s;
      const sets = s ? [d.polygons, ...s.sea.map(r => [r])] : [d.polygons];   // each sea ring is its own set
      OUTLINE = {
        wgs: sets.map(polys => prepRings(polys, (la, lo) => [la, lo])),
        gcj: sets.map(polys => prepRings(polys, wgs84ToGcj02))
      };
    }).catch(() => { OUTLINE = null; });
  }

  // ── Gaode grid shift: tiles are placed as if the view were centred on GCJ02(centre) ──
  // The offset is taken at the nearest point of China's bounding box, so it does not jump at the border.
  function toGcj(c) {
    if (!c) return c;
    const la = Math.max(18, Math.min(54, c.lat)), lo = Math.max(73, Math.min(135, ((c.lng + 180) % 360 + 360) % 360 - 180));
    const [dLat, dLon] = gcjDelta(la, lo);
    return L.latLng(c.lat + dLat, c.lng + dLon);
  }

  // ── Tile layer clipped to China's outline ──
  const ClippedTileLayer = L.TileLayer.extend({
    options: { gcj: false },
    _setZoomTransform(level, center, zoom) {
      return L.TileLayer.prototype._setZoomTransform.call(this, level, this.options.gcj ? toGcj(center) : center, zoom);
    },
    _update(center) {
      if (!this._map) return;
      const c = center === undefined ? this._map.getCenter() : center;
      return L.TileLayer.prototype._update.call(this, this.options.gcj ? toGcj(c) : c);
    },
    // Ring sets that touch this tile, rings in tile pixels; [] when the tile lies outside China
    _clipRings(coords, size) {
      if (!OUTLINE) return null;                   // no outline: draw the tile unclipped
      const w = this._wrapCoords(coords), k = Math.pow(2, w.z);
      const tx0 = w.x * size.x / k, ty0 = w.y * size.y / k, tx1 = tx0 + size.x / k, ty1 = ty0 + size.y / k;
      const out = [];
      for (const set of (this.options.gcj ? OUTLINE.gcj : OUTLINE.wgs)) {
        const rings = [];
        for (const r of set) {
          const b = r.bbox;
          if (b[2] < tx0 || b[0] > tx1 || b[3] < ty0 || b[1] > ty1) continue;
          const pts = new Float64Array(r.pts.length);
          for (let i = 0; i < r.pts.length; i += 2) { pts[i] = (r.pts[i] - tx0) * k; pts[i + 1] = (r.pts[i + 1] - ty0) * k; }
          rings.push(pts);
        }
        if (rings.length) out.push(rings);
      }
      return out;
    },
    createTile(coords, done) {
      const size = this.getTileSize(), tile = document.createElement('canvas');
      tile.width = size.x; tile.height = size.y; tile.complete = false;
      const finish = err => { tile.complete = true; done(err, tile); };
      const sets = this._clipRings(coords, size);
      if (sets && !sets.length) { setTimeout(() => finish(null), 0); return tile; }   // outside China: nothing to fetch
      const img = new Image();
      img.onload = () => {
        const ctx = tile.getContext('2d');
        if (!sets) ctx.drawImage(img, 0, 0, size.x, size.y);
        else for (const rings of sets) {           // one clip per set: the land outline and the sea ring overlap
          ctx.save();
          ctx.beginPath();
          for (const p of rings) { ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
          ctx.clip();
          ctx.drawImage(img, 0, 0, size.x, size.y);
          ctx.restore();
        }
        finish(null);
      };
      img.onerror = e => finish(e || new Error('tile'));
      img.src = this.getTileUrl(coords);
      return tile;
    }
  });

  // ── Public API ──
  const S = { map: null, osm: null, china: null, lang: 'en', fails: 0, fallback: false };

  function makeGaode(lang) {
    const l = new ClippedTileLayer(gaodeUrl(GAODE_LANG[lang] || 'zh_cn'), { gcj: true, subdomains: '1234', maxZoom: 18, maxNativeZoom: 18, zIndex: 2, attribution: ATTR_GAODE });
    l.on('tileload', () => { S.fails = 0; });
    l.on('tileerror', () => {
      if (S.fallback || ++S.fails < GAODE_FAIL_LIMIT) return;
      S.fallback = true;                            // Gaode unreachable: keep China covered by a border-free base
      S.map.removeLayer(l);
      S.china = new ClippedTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
        { gcj: false, maxZoom: 18, maxNativeZoom: 13, zIndex: 2, attribution: ATTR_ESRI }).addTo(S.map);
    });
    return l;
  }

  function attach(map, lang) {
    S.map = map; S.lang = lang || 'en';
    // Wait for the outline so OSM's China is never shown on its own, not even for a moment
    loadOutline().then(() => {
      S.osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, zIndex: 1, attribution: ATTR_OSM }).addTo(map);
      S.china = makeGaode(S.lang).addTo(map);
      // South China Sea dash line, drawn in WGS84 like all site data
      if (SCS) L.layerGroup(SCS.dashes.map(d => L.polyline(d.map(([lon, lat]) => [lat, lon]), DASH_STYLE))).addTo(map);
    });
  }

  function setLang(lang) {
    if (lang === S.lang) return;
    S.lang = lang;
    if (S.china && !S.fallback) S.china.setUrl(gaodeUrl(GAODE_LANG[lang] || 'zh_cn'));
  }

  window.MapBase = { attach, setLang, wgs84ToGcj02 };
})();
