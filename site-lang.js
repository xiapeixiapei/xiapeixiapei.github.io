/* Shared language preference and a runtime translator.
 * - SiteLang.initial(): the language a page should start in: ?lang=zh|en in the URL, else the choice remembered
 *   from any page of this site (localStorage 'site-lang'), else the browser language.
 * - SiteLang.set(lang): remember a choice so every other page opens in the same language.
 * - SiteLang.translator(dict, root): translate UI text at runtime from an English → Chinese dictionary.
 *   Text nodes, placeholders, titles and aria-labels whose trimmed text matches a key are swapped; originals are kept so
 *   the page can switch back. A MutationObserver keeps newly rendered content translated. Used by pages whose markup
 *   is generated from many templates (the Site Manager); the public pages carry data-en / data-zh attributes instead. */
(function () {
  const KEY = 'site-lang';
  const valid = l => l === 'zh' || l === 'en';
  function stored() { try { const v = localStorage.getItem(KEY); return valid(v) ? v : null; } catch (e) { return null; } }
  function initial() {
    const q = new URLSearchParams(location.search).get('lang');
    if (valid(q)) { set(q); return q; }   // a link with ?lang= also sets the preference
    return stored() || (/^zh/i.test(navigator.language || '') ? 'zh' : 'en');
  }
  function set(lang) { if (!valid(lang)) return; try { localStorage.setItem(KEY, lang); } catch (e) { /* private mode */ } }

  function translator(dict, root) {
    root = root || document.body;
    const ORIG = new WeakMap();   // text node → original text; element → { attr: original }
    const ATTRS = ['placeholder', 'title', 'aria-label'];
    let on = false, observer = null, busy = false;
    const lookup = s => { const t = s.replace(/\s+/g, ' ').trim(); if (!t) return null; const z = dict[t]; return z == null ? null : z; };
    const keepSpace = (orig, repl) => (orig.match(/^\s*/)[0]) + repl + (orig.match(/\s*$/)[0]);
    function textNode(n) {
      const cur = n.nodeValue; let orig = ORIG.get(n);
      if (orig === undefined || (cur !== orig && lookup(orig) !== null && cur.trim() !== lookup(orig))) { orig = cur; ORIG.set(n, cur); }   // a script rewrote the node: new original
      if (on) { const z = lookup(orig); if (z !== null && cur !== keepSpace(orig, z)) n.nodeValue = keepSpace(orig, z); }
      else if (cur !== orig) n.nodeValue = orig;
    }
    function attrs(el) {
      let o = ORIG.get(el); if (!o) { o = {}; ORIG.set(el, o); }
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        const cur = el.getAttribute(a);
        if (o[a] === undefined || (cur !== o[a] && cur !== lookup(o[a]))) o[a] = cur;
        if (on) { const z = lookup(o[a]); if (z !== null && cur !== z) el.setAttribute(a, z); }
        else if (cur !== o[a]) el.setAttribute(a, o[a]);
      }
    }
    function walk(node) {
      if (node.nodeType === 3) { if (!['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.parentElement?.tagName)) textNode(node); return; }
      if (node.nodeType !== 1) return;
      if (['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.tagName)) return;
      attrs(node);
      for (let c = node.firstChild; c; c = c.nextSibling) walk(c);
    }
    function run(node) { busy = true; try { walk(node || root); } finally { busy = false; } }
    function apply(enable) {
      on = !!enable; run();
      if (on && !observer) {
        observer = new MutationObserver(ms => { if (busy) return; for (const m of ms) { if (m.type === 'characterData') { if (!busy) run(m.target); } else if (m.type === 'attributes') { if (!busy) attrs(m.target); } else m.addedNodes.forEach(n => run(n)); } });
        observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      }
      if (!on && observer) { observer.disconnect(); observer = null; }
    }
    return { apply, refresh: () => run(), get on() { return on; } };
  }
  window.SiteLang = { initial, stored, set, translator, KEY };
})();
