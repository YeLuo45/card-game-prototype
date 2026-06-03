'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'plugin-version.js'), 'utf8'));
var PluginVersion = window.PluginVersion;
var BUMP_TYPE = window.BUMP_TYPE;
var parseSemver = window.parseSemver;
var compareSemver = window.compareSemver;
var satisfiesConstraint = window.satisfiesConstraint;
var bump = window.bump;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testParseSemver() {
  var v = parseSemver('1.2.3');
  assertEq(v.major, 1, 'PV: 1');
  assertEq(v.minor, 2, 'PV: 2');
  assertEq(v.patch, 3, 'PV: 3');
  assertEq(v.prerelease, null, 'PV: no pre');
  // with prerelease
  var v2 = parseSemver('2.0.0-alpha');
  assertEq(v2.major, 2, 'PV: 2');
  assertEq(v2.prerelease, 'alpha', 'PV: alpha');
  // invalid
  assertEq(parseSemver('1.2'), null, 'PV: invalid');
  assertEq(parseSemver(null), null, 'PV: null');
  assertEq(parseSemver(123), null, 'PV: num');
  assertEq(parseSemver('abc'), null, 'PV: abc');
}

function testCompare() {
  assertEq(compareSemver({ major: 1, minor: 0, patch: 0, prerelease: null }, { major: 1, minor: 0, patch: 0, prerelease: null }), 0, 'PV: equal');
  assertEq(compareSemver(parseSemver('1.0.0'), parseSemver('2.0.0')) < 0, true, 'PV: 1<2');
  assertEq(compareSemver(parseSemver('2.0.0'), parseSemver('1.0.0')) > 0, true, 'PV: 2>1');
  assertEq(compareSemver(parseSemver('1.0.0'), parseSemver('1.1.0')) < 0, true, 'PV: 1.0<1.1');
  assertEq(compareSemver(parseSemver('1.0.0'), parseSemver('1.0.1')) < 0, true, 'PV: 1.0.0<1.0.1');
  // prerelease
  assertEq(compareSemver(parseSemver('1.0.0'), parseSemver('1.0.0-alpha')) > 0, true, 'PV: 1.0.0>1.0.0-alpha');
}

function testSatisfies() {
  assertEq(satisfiesConstraint('1.0.0', '^1.0.0'), true, 'PV: 1.0.0 ^1.0.0');
  assertEq(satisfiesConstraint('1.5.0', '^1.0.0'), true, 'PV: 1.5.0 ^1.0.0');
  assertEq(satisfiesConstraint('2.0.0', '^1.0.0'), false, 'PV: 2.0.0 !^1.0.0');
  assertEq(satisfiesConstraint('1.5.0', '~1.0.0'), false, 'PV: 1.5.0 !~1.0.0');
  assertEq(satisfiesConstraint('1.0.5', '~1.0.0'), true, 'PV: 1.0.5 ~1.0.0');
  assertEq(satisfiesConstraint('1.0.0', '>=1.0.0'), true, 'PV: >=1.0.0');
  assertEq(satisfiesConstraint('0.9.0', '>=1.0.0'), false, 'PV: <1.0.0');
  assertEq(satisfiesConstraint('1.0.0', '>1.0.0'), false, 'PV: 1.0.0 !>1.0.0');
  assertEq(satisfiesConstraint('1.0.1', '>1.0.0'), true, 'PV: 1.0.1 >1.0.0');
  assertEq(satisfiesConstraint('1.0.0', '<=1.0.0'), true, 'PV: <=1.0.0');
  assertEq(satisfiesConstraint('1.0.0', '<1.0.0'), false, 'PV: 1.0.0 !<1.0.0');
  assertEq(satisfiesConstraint('1.0.0', '1.0.0'), true, 'PV: exact');
  assertEq(satisfiesConstraint('1.0.1', '1.0.0'), false, 'PV: not exact');
  assertEq(satisfiesConstraint('1.0.0', '*'), true, 'PV: *');
  // OR
  assertEq(satisfiesConstraint('2.0.0', '^1.0.0 || ^2.0.0'), true, 'PV: OR 2.0');
  assertEq(satisfiesConstraint('3.0.0', '^1.0.0 || ^2.0.0'), false, 'PV: OR fail');
  // invalid
  assertEq(satisfiesConstraint('xxx', '^1.0.0'), false, 'PV: invalid ver');
  assertEq(satisfiesConstraint('1.0.0', 'invalid'), false, 'PV: invalid cons');
}

function testBump() {
  var v = parseSemver('1.2.3');
  assertEq(bump(v, 'major'), '2.0.0', 'PV: bump major');
  assertEq(bump(v, 'minor'), '1.3.0', 'PV: bump minor');
  assertEq(bump(v, 'patch'), '1.2.4', 'PV: bump patch');
  assertEq(bump('1.2.3', 'major'), '2.0.0', 'PV: string bump');
  assertEq(bump(v, 'invalid'), null, 'PV: invalid bump');
  assertEq(bump('invalid', 'major'), null, 'PV: invalid ver');
}

function testRegister() {
  var v = new PluginVersion();
  var r = v.register('p1', '1.0.0');
  assertEq(r.success, true, 'PV: register 1.0.0');
  v.register('p1', '1.1.0');
  v.register('p1', '2.0.0');
  v.register('p1', '1.0.5');
  var list = v.list('p1');
  assertEq(list[0], '1.0.0', 'PV: list[0]');
  assertEq(list[3], '2.0.0', 'PV: list[3]');
  // errors
  var e1 = v.register(null, '1.0.0');
  assertEq(e1.error, 'invalid_id', 'PV: null id');
  var e2 = v.register('p2', 'invalid');
  assertEq(e2.error, 'invalid_version', 'PV: invalid ver');
  // duplicate
  var e3 = v.register('p1', '1.0.0');
  assertEq(e3.error, 'duplicate_version', 'PV: dup');
}

function testSetCurrent() {
  var v = new PluginVersion();
  v.register('p1', '1.0.0');
  v.register('p1', '1.1.0');
  v.setCurrent('p1', '1.0.0');
  assertEq(v.getCurrent('p1'), '1.0.0', 'PV: current 1.0.0');
  v.setCurrent('p1', '1.1.0');
  assertEq(v.getCurrent('p1'), '1.1.0', 'PV: current 1.1.0');
  // errors
  v.register('p1', '1.2.0');
  var e1 = v.setCurrent('p1', '1.5.0');
  assertEq(e1.error, 'version_not_found', 'PV: not in');  // 1.5.0 not registered
  var e2 = v.setCurrent('p1', 'invalid');
  assertEq(e2.error, 'invalid_version', 'PV: invalid');
  var e3 = v.setCurrent('not_reg', '1.0.0');
  assertEq(e3.error, 'not_registered', 'PV: not reg');
}

function testLatest() {
  var v = new PluginVersion();
  v.register('p1', '1.0.0');
  v.register('p1', '1.1.0');
  v.register('p1', '2.0.0');
  assertEq(v.getLatest('p1'), '2.0.0', 'PV: latest');
  // none
  assertEq(v.getLatest('not_in'), null, 'PV: no latest');
}

function testLatestSatisfying() {
  var v = new PluginVersion();
  v.register('p1', '1.0.0');
  v.register('p1', '1.1.0');
  v.register('p1', '1.2.0');
  v.register('p1', '2.0.0');
  assertEq(v.latestSatisfying('p1', '^1.0.0'), '1.2.0', 'PV: 1.x');
  assertEq(v.latestSatisfying('p1', '^2.0.0'), '2.0.0', 'PV: 2.x');
  assertEq(v.latestSatisfying('p1', '^3.0.0'), null, 'PV: no 3.x');
  assertEq(v.latestSatisfying('not_in', '*'), null, 'PV: not in');
}

function testSatisfiesCurrent() {
  var v = new PluginVersion();
  v.register('p1', '1.0.0');
  v.setCurrent('p1', '1.0.0');
  assertEq(v.satisfies('p1', '^1.0.0'), true, 'PV: satisfies');
  assertEq(v.satisfies('not_in', '*'), false, 'PV: not in');
}

function testCompatibility() {
  var v = new PluginVersion();
  v.setCompatibility('p1', '>=1.0.0', '<2.0.0');
  assertEq(v.isCompatible('p1', '1.5.0'), true, 'PV: 1.5.0 compat');
  assertEq(v.isCompatible('p1', '2.0.0'), false, 'PV: 2.0.0 !compat');
  assertEq(v.isCompatible('p1', '0.9.0'), false, 'PV: 0.9.0 !compat');
  // unset
  assertEq(v.isCompatible('p2', '1.0.0'), true, 'PV: no compat = true');
}

function testBumpManager() {
  var v = new PluginVersion();
  v.register('p1', '1.2.3');
  v.setCurrent('p1', '1.2.3');
  var r1 = v.bump('p1', 'major');
  assertEq(r1.success, true, 'PV: bump major');
  assertEq(v.getCurrent('p1'), '1.2.3', 'PV: cur unchanged');
  v.setCurrent('p1', r1.entry.raw);
  assertEq(v.getCurrent('p1'), '2.0.0', 'PV: 2.0.0');
  // invalid
  var e1 = v.bump('p1', 'invalid');
  assertEq(e1.error, 'invalid_bump_type', 'PV: invalid bump');
  var e2 = v.bump('not_in', 'major');
  assertEq(e2.error, 'no_current_version', 'PV: no cur');
}

function testUpgradePath() {
  var v = new PluginVersion();
  v.register('p1', '1.0.0');
  v.register('p1', '1.1.0');
  v.register('p1', '1.2.0');
  v.register('p1', '2.0.0');
  v.setCurrent('p1', '1.0.0');
  var r = v.upgradePath('p1', '2.0.0');
  assertEq(r.success, true, 'PV: upgrade');
  assertEq(r.path.length, 3, 'PV: 3 steps');
  assertEq(r.path[0], '1.1.0', 'PV: step 0');
  assertEq(r.path[2], '2.0.0', 'PV: step 2');
  // errors
  var e1 = v.upgradePath('p1', 'invalid');
  assertEq(e1.error, 'invalid_target', 'PV: invalid target');
  var e2 = v.upgradePath('not_in', '1.0.0');
  assertEq(e2.error, 'not_registered', 'PV: not reg');
}

function testCompareMethods() {
  var v = new PluginVersion();
  assertEq(v.compareVersions('1.0.0', '2.0.0') < 0, true, 'PV: cmp <');
  assertEq(v.isNewer('2.0.0', '1.0.0'), true, 'PV: isNewer');
  assertEq(v.isOlder('1.0.0', '2.0.0'), true, 'PV: isOlder');
  // invalid
  assertEq(v.compareVersions('invalid', '1.0.0'), null, 'PV: cmp null');
}

function testClear() {
  var v = new PluginVersion();
  v.register('p1', '1.0.0');
  var c = v.clear();
  assertEq(c.success, true, 'PV: clear');
  assertEq(v.list('p1').length, 0, 'PV: 0 list');
}

function testConstants() {
  assertEq(BUMP_TYPE.MAJOR, 'major', 'PV: MAJOR');
  assertEq(BUMP_TYPE.MINOR, 'minor', 'PV: MINOR');
}

testParseSemver();
testCompare();
testSatisfies();
testBump();
testRegister();
testSetCurrent();
testLatest();
testLatestSatisfying();
testSatisfiesCurrent();
testCompatibility();
testBumpManager();
testUpgradePath();
testCompareMethods();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
