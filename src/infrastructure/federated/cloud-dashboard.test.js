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
eval(fs.readFileSync(path.join(__dirname, 'sync-manager.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'cloud-dashboard.js'), 'utf8'));
var CloudDashboard = window.CloudDashboard;
var DASHBOARD_CHART_TYPES = window.DASHBOARD_CHART_TYPES;
var DASHBOARD_TIME_BUCKETS = window.DASHBOARD_TIME_BUCKETS;
var FederatedSyncManager = window.FederatedSyncManager;
var InMemoryCloudStore = window.InMemoryCloudStore;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var cd = new CloudDashboard();
  assertEq(Object.keys(cd.widgets).length, 0, 'CD: no widgets');
  assertEq(cd.snapshots.length, 0, 'CD: no snapshots');
  assertEq(cd.alerts.length, 0, 'CD: no alerts');
  var summary = cd.getSummary();
  assertEq(summary.widgetCount, 0, 'CD: summary 0 widgets');
}

function testWidget() {
  var cd = new CloudDashboard();
  var r = cd.registerWidget('w1', { type: 'line', title: 'Win Rate', dataSource: 'profile' });
  assertEq(r.success, true, 'CD: register widget');
  assertEq(cd.getWidget('w1').title, 'Win Rate', 'CD: title');
  // update data
  var u = cd.updateWidgetData('w1', [1, 2, 3, 4, 5]);
  assertEq(u.success, true, 'CD: update data');
  assertEq(cd.getWidget('w1').data.length, 5, 'CD: 5 data points');
  // unregister
  var un = cd.unregisterWidget('w1');
  assertEq(un.success, true, 'CD: unregister');
  assertEq(cd.getWidget('w1'), null, 'CD: gone');
  // errors
  var e1 = cd.registerWidget(null, {});
  assertEq(e1.error, 'invalid_widget_id', 'CD: invalid id');
  var e2 = cd.registerWidget('w2', null);
  assertEq(e2.error, 'invalid_config', 'CD: invalid config');
  var e3 = cd.updateWidgetData('w1', []);
  assertEq(e3.error, 'not_found', 'CD: not found update');
  // re-register for not-array test
  cd.registerWidget('w1', { type: 'line' });
  var e4 = cd.updateWidgetData('w1', 'not array');
  assertEq(e4.error, 'data_must_be_array', 'CD: not array');
  // list
  cd.registerWidget('w1', { type: 'bar' });
  cd.registerWidget('w2', { type: 'pie' });
  var list = cd.listWidgets();
  assertEq(list.length, 2, 'CD: 2 widgets');
}

function testTrend() {
  var cd = new CloudDashboard();
  // empty
  var t0 = cd.computeTrend([], 7);
  assertEq(t0.direction, 'unknown', 'CD: empty trend');
  // up
  var t1 = cd.computeTrend([1, 2, 3, 4, 5], 7);
  assertEq(t1.direction, 'up', 'CD: up trend');
  assertEq(t1.slope, 1, 'CD: slope 1');
  // down
  var t2 = cd.computeTrend([5, 4, 3, 2, 1], 7);
  assertEq(t2.direction, 'down', 'CD: down trend');
  // flat
  var t3 = cd.computeTrend([5, 5, 5, 5], 7);
  assertEq(t3.direction, 'flat', 'CD: flat');
  assertEq(t3.slope, 0, 'CD: slope 0');
  // custom window
  var t4 = cd.computeTrend([1, 2, 3, 100, 200], 2);
  assertEq(t4.direction, 'up', 'CD: custom window');
  // single value
  var t5 = cd.computeTrend([5], 7);
  assertEq(t5.direction, 'unknown', 'CD: single value');
}

function testMovingAverage() {
  var cd = new CloudDashboard();
  var ma = cd.computeMovingAverage([1, 2, 3, 4, 5], 3);
  assertEq(ma[0], 1, 'CD: MA 0');
  assertEq(ma[1], 1.5, 'CD: MA 1');
  assertEq(ma[2], 2, 'CD: MA 2');
  assertEq(ma[3], 3, 'CD: MA 3');
  assertEq(ma[4], 4, 'CD: MA 4');
  // empty
  var empty = cd.computeMovingAverage([], 3);
  assertEq(empty.length, 0, 'CD: empty MA');
  // period 1
  var ma1 = cd.computeMovingAverage([10, 20, 30], 1);
  assertEq(ma1[0], 10, 'CD: period 1');
}

function testBucketByTime() {
  var cd = new CloudDashboard();
  var day = 24 * 60 * 60 * 1000;
  var now = Date.now();
  var data = [
    { ts: now, value: 10 },
    { ts: now + 1000, value: 20 },
    { ts: now + day, value: 30 },
    { ts: now + day + 1000, value: 40 },
    { ts: now + day * 2, value: 50 }
  ];
  var buckets = cd.bucketByTime(data, day);
  assertEq(buckets.length, 3, 'CD: 3 buckets');
  assertEq(buckets[0].count, 2, 'CD: 2 in first');
  assertEq(buckets[0].sum, 30, 'CD: sum 30');
  assertEq(buckets[0].avg, 15, 'CD: avg 15');
  assertEq(buckets[0].min, 10, 'CD: min 10');
  assertEq(buckets[0].max, 20, 'CD: max 20');
  // invalid data
  var bad = cd.bucketByTime([{ ts: 'now', value: 1 }, null, undefined], day);
  assertEq(bad.length, 0, 'CD: bad data empty');
  // empty
  var empty = cd.bucketByTime([], day);
  assertEq(empty.length, 0, 'CD: empty data');
}

function testHeatmap() {
  var cd = new CloudDashboard();
  var matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
  var heat = cd.computeHeatmap(matrix);
  assertEq(heat.min, 1, 'CD: min 1');
  assertEq(heat.max, 9, 'CD: max 9');
  assertEq(heat.matrix.length, 3, 'CD: 3 rows');
  assertEq(heat.matrix[0][0].value, 1, 'CD: [0][0] value');
  assertEq(heat.matrix[0][0].intensity, 0, 'CD: [0][0] intensity 0');
  assertEq(heat.matrix[2][2].intensity, 1, 'CD: [2][2] intensity 1');
  // same value
  var flat = cd.computeHeatmap([[5, 5], [5, 5]]);
  assertEq(flat.min, 5, 'CD: flat min');
  assertEq(flat.matrix[0][0].intensity, 0, 'CD: flat intensity');
  // empty
  var empty = cd.computeHeatmap([]);
  assertEq(empty.length, 0, 'CD: empty heatmap');
}

function testAggregate() {
  var cd = new CloudDashboard();
  var r = cd.aggregateFromSources([
    { name: 'src1', data: [1, 2, 3] },
    { name: 'src2', data: [10, 20] }
  ]);
  assertEq(r.count, 5, 'CD: 5 total');
  assertEq(r.totalValue, 36, 'CD: sum 36');
  assertEq(r.bySource.src1.count, 3, 'CD: src1 3');
  assertEq(r.bySource.src1.sum, 6, 'CD: src1 sum 6');
  // errors
  var e1 = cd.aggregateFromSources(null);
  assertEq(e1.error, 'invalid_sources', 'CD: null sources');
  // no data
  var r2 = cd.aggregateFromSources([{ name: 'empty' }]);
  assertEq(r2.count, 0, 'CD: empty count');
  // mixed
  var r3 = cd.aggregateFromSources([
    { name: 'a', data: [1, 'bad', 3] },
    { name: 'b' }
  ]);
  assertEq(r3.totalValue, 4, 'CD: non-numeric skipped');
}

function testAlerts() {
  var cd = new CloudDashboard();
  var r = cd.addAlert({ level: 'warning', message: 'High CPU', source: 'monitor' });
  assertEq(r.success, true, 'CD: alert added');
  assertEq(cd.getAlerts().length, 1, 'CD: 1 alert');
  var ack = cd.acknowledgeAlert(r.alertId);
  assertEq(ack.success, true, 'CD: ack');
  assertEq(cd.getAlerts().length, 0, 'CD: 0 unack');
  assertEq(cd.getAlerts(true).length, 1, 'CD: 1 all');
  // not found
  var nf = cd.acknowledgeAlert('nonexistent');
  assertEq(nf.error, 'not_found', 'CD: not found');
  // invalid alert
  var e1 = cd.addAlert(null);
  assertEq(e1.error, 'invalid_alert', 'CD: null alert');
  // many alerts
  for (var i = 0; i < 105; i++) {
    cd.addAlert({ level: 'info', message: 'm' + i });
  }
  assertEq(cd.getAlerts(true).length, 100, 'CD: 100 max');
}

function testSnapshots() {
  var cd = new CloudDashboard();
  var r1 = cd.takeSnapshot('snap1', { x: 1 });
  assertEq(r1.success, true, 'CD: snap1');
  // ensure different timestamp
  var startTs = Date.now();
  while (Date.now() === startTs) { /* spin */ }
  var r2 = cd.takeSnapshot('snap2', { x: 2 });
  assertEq(r2.success, true, 'CD: snap2');
  var snaps = cd.getSnapshots();
  assertEq(snaps.length, 2, 'CD: 2 snaps');
  var cmp = cd.compareSnapshots('snap1', 'snap2');
  assertEq(cmp.timeDelta > 0, true, 'CD: time delta');
  // not found
  var e1 = cd.takeSnapshot('', {});
  assertEq(e1.error, 'invalid_name', 'CD: invalid name');
  var cmp2 = cd.compareSnapshots('nope', 'snap1');
  assertEq(cmp2.error, 'snapshot_not_found', 'CD: not found');
  // limited
  var limited = cd.getSnapshots(1);
  assertEq(limited.length, 1, 'CD: limited');
  // over limit
  for (var i = 0; i < 55; i++) {
    cd.takeSnapshot('s' + i, {});
  }
  assertEq(cd.getSnapshots(true).length <= 50, true, 'CD: 50 max');
}

function testRefresh() {
  var cd = new CloudDashboard();
  cd.registerWidget('w1', { type: 'line' });
  var r = cd.refresh({ w1: [1, 2, 3] });
  assertEq(r.success, true, 'CD: refresh');
  assertEq(cd.getLastRefresh() > 0, true, 'CD: last refresh set');
  assertEq(cd.getWidget('w1').data.length, 3, 'CD: data updated');
  // no dataSources
  var r2 = cd.refresh();
  assertEq(r2.success, true, 'CD: refresh no data');
}

function testTrendsPersistence() {
  var cd = new CloudDashboard();
  var r1 = cd.setTrend('wins', { direction: 'up', change: 5 });
  assertEq(r1.success, true, 'CD: set trend');
  var g = cd.getTrend('wins');
  assertEq(g.value.direction, 'up', 'CD: get trend');
  var all = cd.getAllTrends();
  assertEq(all.length, 1, 'CD: 1 trend');
  // invalid key
  var e1 = cd.setTrend(null, {});
  assertEq(e1.error, 'invalid_key', 'CD: invalid key');
  var e2 = cd.getTrend('nonexistent');
  assert(e2 === null, 'CD: null trend');
}

function testCloudSync() {
  var sharedCloud = new InMemoryCloudStore();
  var fsm = new FederatedSyncManager({ cloudStore: sharedCloud });
  var cd = new CloudDashboard(fsm);
  cd.registerWidget('w1', { type: 'bar' });
  cd.updateWidgetData('w1', [1, 2, 3]);
  cd.takeSnapshot('s1', { x: 1 });
  var pub = cd.publishToCloud();
  assertEq(pub.success, true, 'CD: publish');
  var fsm2 = new FederatedSyncManager({ cloudStore: sharedCloud });
  var cd2 = new CloudDashboard(fsm2);
  var load = cd2.loadFromCloud();
  assertEq(load.success, true, 'CD: load');
  assertEq(Object.keys(cd2.widgets).length, 1, 'CD: widget loaded');
  // no sync
  var cd3 = new CloudDashboard(null);
  var ns1 = cd3.publishToCloud();
  assertEq(ns1.error, 'no_sync', 'CD: no sync pub');
  var ns2 = cd3.loadFromCloud();
  assertEq(ns2.error, 'no_sync', 'CD: no sync load');
}

function testExportImport() {
  var cd = new CloudDashboard();
  cd.registerWidget('w1', { type: 'bar' });
  cd.updateWidgetData('w1', [1, 2, 3]);
  var exp = cd.exportDashboard();
  assertEq(typeof exp, 'string', 'CD: export string');
  var parsed = JSON.parse(exp);
  assertEq(parsed.format, 'cloud-dashboard-v1', 'CD: format');
  var cd2 = new CloudDashboard();
  var imp = cd2.importDashboard(exp);
  assertEq(imp.success, true, 'CD: import');
  assertEq(Object.keys(cd2.widgets).length, 1, 'CD: widget imported');
  // errors
  var e1 = cd2.importDashboard(null);
  assertEq(e1.error, 'invalid_input', 'CD: null import');
  var e2 = cd2.importDashboard('not json');
  assertEq(e2.error, 'parse_error', 'CD: parse error');
  var e3 = cd2.importDashboard('{"format":"other"}');
  assertEq(e3.error, 'unknown_format', 'CD: bad format');
}

function testClear() {
  var cd = new CloudDashboard();
  cd.registerWidget('w1', { type: 'bar' });
  cd.takeSnapshot('s1', {});
  cd.addAlert({ level: 'info', message: 'm' });
  var c = cd.clear();
  assertEq(c.success, true, 'CD: clear');
  assertEq(Object.keys(cd.widgets).length, 0, 'CD: clear widgets');
  assertEq(cd.snapshots.length, 0, 'CD: clear snaps');
}

function testConstants() {
  assertEq(DASHBOARD_CHART_TYPES.LINE, 'line', 'CD: CHART.LINE');
  assertEq(DASHBOARD_TIME_BUCKETS.DAY, 86400000, 'CD: TIME.DAY');
}

testEmpty();
testWidget();
testTrend();
testMovingAverage();
testBucketByTime();
testHeatmap();
testAggregate();
testAlerts();
testSnapshots();
testRefresh();
testTrendsPersistence();
testCloudSync();
testExportImport();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
