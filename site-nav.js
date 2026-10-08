// Site navigation rule, shared by every page: going from page A to page B, "back" on B returns to A.
//
// The back controls on a page (the "← Home" link at the top left, and anything marked data-back) go back in the
// browser history to the page the visitor came from, when that page is part of this site; opened directly (a bookmark,
// a new tab, another website), they follow their own link (the homepage). A page's own views (detail pages, a country
// on a phone …) add history entries as the visitor moves between them, so this script counts them: every entry made on
// this page carries its depth (history.state.__d), and back from the page skips them all, landing exactly on page A.
// The views' own ← buttons keep stepping back one view at a time, which also ends on page A.
//
// Load it in <head>, before the page's scripts, so it sees every history entry the page makes.
(function () {
  'use strict';
  var H = window.history;
  if (!H || !H.pushState) return;
  var push = H.pushState.bind(H), replace = H.replaceState.bind(H);
  var tagged = function (st, d) { var o = {}, k; if (st && typeof st === 'object') for (k in st) o[k] = st[k]; o.__d = d; return o; };
  var depthOf = function (st) { return st && typeof st.__d === 'number' ? st.__d : null; };
  // entries made on this page since it was entered; restored from the entry after a reload or a return from another page
  var depth = depthOf(H.state);
  if (depth === null) { depth = 0; replace(tagged(H.state, 0), ''); }

  H.pushState = function (st, title, url) { depth++; push(tagged(st, depth), title, url); };
  H.replaceState = function (st, title, url) { replace(tagged(st, depth), title, url); };
  // moving back and forth inside the page
  window.addEventListener('popstate', function (e) { var d = depthOf(e.state); if (d !== null) depth = d; });
  // a new entry made by a plain hash change (location.hash = …) has no state yet: give it the next depth
  window.addEventListener('hashchange', function () { if (depthOf(H.state) === null) { depth++; replace(tagged(H.state, depth), ''); } });

  // the page this one was opened from, when it is another page of this site
  function cameFrom() {
    try {
      var r = new URL(document.referrer);
      return r.origin === location.origin && r.pathname !== location.pathname ? r : null;
    } catch (e) { return null; }
  }
  function back() {
    if (!cameFrom() || H.length < 2) return false;
    H.go(-(depth + 1));
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.back-link, [data-back]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (back()) e.preventDefault();
  });
  window.SiteNav = { back: back, cameFrom: cameFrom, depth: function () { return depth; } };
})();
