'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
global.localStorage = (function () {
  var store = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    clear: function () { store = {}; }
  };
})();
eval(fs.readFileSync(path.join(__dirname, 'plugin-registry.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'plugin-marketplace.js'), 'utf8'));
var PluginRegistry = window.PluginRegistry;
var PluginMarketplace = window.PluginMarketplace;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var m = new PluginMarketplace();
  assertEq(m.getInstalled().length, 0, 'PM: 0 installed');
  var s = m.getSummary();
  assertEq(s.installedCount, 0, 'PM: 0 installed');
}

function testWithRegistry() {
  var r = new PluginRegistry();
  r.register({ id: 'p1', name: 'P1', category: 'ui' });
  r.register({ id: 'p2', name: 'P2', category: 'data' });
  r.register({ id: 'p3', name: 'P3', category: 'ui' });
  var m = new PluginMarketplace({ registry: r });
  var all = m.listAll();
  assertEq(all.length, 3, 'PM: 3 all');
  var ui = m.listByCategory('ui');
  assertEq(ui.length, 2, 'PM: 2 ui');
}

function testSearch() {
  var r = new PluginRegistry();
  r.register({ id: 'card-shuffler', name: 'Card Shuffler', tags: ['cards'] });
  r.register({ id: 'deck-builder', name: 'Deck Builder', tags: ['cards', 'build'] });
  r.register({ id: 'ai-player', name: 'AI Player', tags: ['ai'] });
  var m = new PluginMarketplace({ registry: r });
  var cards = m.search('cards');
  assertEq(cards.length, 2, 'PM: 2 cards');
  var ui = m.search(null, { category: 'ui' });
  assertEq(ui.length, 0, 'PM: 0 ui (none)');
  var m2 = m.search(null, { tags: ['cards', 'build'] });
  assertEq(m2.length, 1, 'PM: 1 cards+build');
  var min = m.search(null, { minRating: 4 });
  assertEq(min.length, 0, 'PM: 0 minRating');
  // metrics (4 search calls made)
  assertEq(m.getMetrics().searches, 4, 'PM: 4 searches');
}

function testFeatured() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  r.register({ id: 'p2' });
  r.register({ id: 'p3' });
  var m = new PluginMarketplace({ registry: r });
  var s = m.setFeatured(['p1', 'p2']);
  assertEq(s.success, true, 'PM: set featured');
  assertEq(m.listFeatured().length, 2, 'PM: 2 featured');
  m.addFeatured('p3');
  assertEq(m.listFeatured().length, 3, 'PM: 3 featured');
  m.removeFeatured('p1');
  assertEq(m.listFeatured().length, 2, 'PM: 2 after remove');
  // errors
  var e = m.setFeatured(null);
  assertEq(e.error, 'invalid_input', 'PM: invalid');
}

function testTrending() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  r.register({ id: 'p2' });
  var m = new PluginMarketplace({ registry: r });
  m.bumpTrending('p1', 5);
  m.bumpTrending('p2', 3);
  m.bumpTrending('p1', 2);  // p1 = 7
  var t = m.listTrending(2);
  assertEq(t.length, 2, 'PM: 2 trending');
  assertEq(t[0].id, 'p1', 'PM: p1 top');
  // invalid
  var e = m.bumpTrending(null);
  assertEq(e.error, 'invalid_id', 'PM: invalid');
}

function testInstall() {
  var m = new PluginMarketplace();
  var r = m.install('p1');
  assertEq(r.success, true, 'PM: install');
  assertEq(m.isInstalled('p1'), true, 'PM: installed');
  var d = m.install('p1');
  assertEq(d.error, 'already_installed', 'PM: dup');
  var list = m.getInstalled();
  assertEq(list.length, 1, 'PM: 1 list');
  // errors
  var e = m.install(null);
  assertEq(e.error, 'invalid_id', 'PM: null');
  var e2 = m.uninstall('not_in');
  assertEq(e2.error, 'not_installed', 'PM: not in');
}

function testUninstall() {
  var m = new PluginMarketplace();
  m.install('p1');
  var r = m.uninstall('p1');
  assertEq(r.success, true, 'PM: uninstall');
  assertEq(m.isInstalled('p1'), false, 'PM: gone');
  var m2 = m.getMetrics();
  assertEq(m2.installations, 1, 'PM: 1 install');
  assertEq(m2.uninstallations, 1, 'PM: 1 uninstall');
}

function testDownloadTracking() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  var m = new PluginMarketplace({ registry: r });
  var t1 = m.trackDownload('p1');
  assertEq(t1.success, true, 'PM: track 1');
  assertEq(t1.count, 1, 'PM: count 1');
  m.trackDownload('p1');
  m.trackDownload('p1');
  assertEq(m.getDownloadCount('p1'), 3, 'PM: 3 dl');
  var p = r.get('p1');
  assertEq(p.downloadCount, 3, 'PM: reg dlCount 3');
  // errors
  var e = m.trackDownload(null);
  assertEq(e.error, 'invalid_id', 'PM: null');
}

function testViews() {
  var m = new PluginMarketplace();
  m.trackView('p1');
  m.trackView('p1');
  assertEq(m.getViewCount('p1'), 2, 'PM: 2 views');
  var e = m.trackView(null);
  assertEq(e.error, 'invalid_id', 'PM: null');
}

function testAddReview() {
  var r = new PluginRegistry();
  r.register({ id: 'p1' });
  var m = new PluginMarketplace({ registry: r });
  var r1 = m.addReview('p1', { author: 'alice', rating: 5, title: 'Great!', body: 'Loved it' });
  assertEq(r1.success, true, 'PM: review 1');
  var r2 = m.addReview('p1', { author: 'bob', rating: 3, title: 'OK' });
  assertEq(r2.success, true, 'PM: review 2');
  var reviews = m.getReviews('p1');
  assertEq(reviews.length, 2, 'PM: 2 reviews');
  var rating = m.getRating('p1');
  assertEq(rating.count, 2, 'PM: 2 count');
  assertEq(rating.average, 4, 'PM: 4 avg');
  // plugin rating updated
  var p = r.get('p1');
  assertEq(p.rating, 4, 'PM: plugin rating 4');
  assertEq(p.ratingCount, 2, 'PM: plugin count 2');
  // errors
  var e1 = m.addReview(null, { rating: 5 });
  assertEq(e1.error, 'invalid_id', 'PM: null id');
  var e2 = m.addReview('p1', null);
  assertEq(e2.error, 'invalid_review', 'PM: null review');
  var e3 = m.addReview('p1', { rating: 0 });
  assertEq(e3.error, 'invalid_rating', 'PM: 0 rating');
  var e4 = m.addReview('p1', { rating: 6 });
  assertEq(e4.error, 'invalid_rating', 'PM: 6 rating');
  var e5 = m.addReview('p1', { rating: 'high' });
  assertEq(e5.error, 'invalid_rating', 'PM: string rating');
}

function testGetReviews() {
  var m = new PluginMarketplace();
  for (var i = 0; i < 5; i++) {
    m.addReview('p1', { author: 'u' + i, rating: (i % 5) + 1 });
  }
  var all = m.getReviews('p1');
  assertEq(all.length, 5, 'PM: 5 all');
  var limited = m.getReviews('p1', 2);
  assertEq(limited.length, 2, 'PM: 2 limited');
  var none = m.getReviews('not_in');
  assertEq(none.length, 0, 'PM: 0 none');
}

function testGetRatingEmpty() {
  var m = new PluginMarketplace();
  var r = m.getRating('not_in');
  assertEq(r.count, 0, 'PM: 0 count');
  assertEq(r.average, 0, 'PM: 0 avg');
}

function testAuthorProfile() {
  var r = new PluginRegistry();
  r.register({ id: 'p1', author: 'alice' });
  r.register({ id: 'p2', author: 'alice' });
  r.register({ id: 'p3', author: 'bob' });
  var m = new PluginMarketplace({ registry: r });
  m.trackDownload('p1');
  m.trackDownload('p1');
  m.trackDownload('p2');
  m.addReview('p1', { rating: 5 });
  m.addReview('p2', { rating: 3 });
  var ap = m.getAuthorProfile('alice');
  assertEq(ap.author, 'alice', 'PM: author');
  assertEq(ap.pluginCount, 2, 'PM: 2 plugins');
  assertEq(ap.totalDownloads, 3, 'PM: 3 dl');
  assert(ap.averageRating > 0, 'PM: avg rating');
  // unknown
  var none = m.getAuthorProfile('nobody');
  assertEq(none.pluginCount, 0, 'PM: 0 plugins nobody');
}

function testMetrics() {
  var m = new PluginMarketplace();
  m.install('p1');
  m.addReview('p1', { rating: 5 });
  m.trackDownload('p1');
  var metrics = m.getMetrics();
  assertEq(metrics.installations, 1, 'PM: 1 install');
  assertEq(metrics.reviews, 1, 'PM: 1 review');
  assertEq(metrics.downloads, 1, 'PM: 1 dl');
}

function testSummary() {
  var m = new PluginMarketplace();
  m.install('p1');
  m.install('p2');
  m.setFeatured(['p1']);
  var s = m.getSummary();
  assertEq(s.installedCount, 2, 'PM: 2 installed');
  assertEq(s.featuredCount, 1, 'PM: 1 featured');
}

testEmpty();
testWithRegistry();
testSearch();
testFeatured();
testTrending();
testInstall();
testUninstall();
testDownloadTracking();
testViews();
testAddReview();
testGetReviews();
testGetRatingEmpty();
testAuthorProfile();
testMetrics();
testSummary();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
