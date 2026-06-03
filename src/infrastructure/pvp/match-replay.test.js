'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'match-replay.js'), 'utf8'));
var MatchReplay = window.MatchReplay;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var m = new MatchReplay(); assertEq(m.getSummary().totalRecordings, 0, 'MR: 0'); }
function testStart() {
  var m = new MatchReplay();
  var r = m.start('m1');
  assertEq(r.success, true, 'MR: start');
  var r2 = m.start('m1');
  assertEq(r2.error, 'already_recording', 'MR: dup');
}
function testStop() {
  var m = new MatchReplay();
  m.start('m1');
  var s = m.stop('m1');
  assertEq(s.success, true, 'MR: stop');
  assertEq(s.totalFrames, 0, 'MR: 0 frames');
  var s2 = m.stop('not_in');
  assertEq(s2.error, 'not_found', 'MR: not found');
}
function testRecordFrame() {
  var m = new MatchReplay();
  m.start('m1');
  var r = m.recordFrame('m1', { data: 'frame1' });
  assertEq(r.success, true, 'MR: record');
  assertEq(r.frameIndex, 0, 'MR: idx 0');
  m.recordFrame('m1', { data: 'frame2' });
  // invalid
  var r2 = m.recordFrame('m1', 'not obj');
  assertEq(r2.error, 'invalid_frame', 'MR: invalid');
  // not found
  var r3 = m.recordFrame('not_in', {});
  assertEq(r3.error, 'not_found', 'MR: not found');
  // stopped
  m.stop('m1');
  var r4 = m.recordFrame('m1', {});
  assertEq(r4.error, 'recording_stopped', 'MR: stopped');
}
function testGetFrame() {
  var m = new MatchReplay();
  m.start('m1');
  m.recordFrame('m1', { data: 'a' });
  m.recordFrame('m1', { data: 'b' });
  var f = m.getFrame('m1', 0);
  assertEq(f.data, 'a', 'MR: a');
  var f2 = m.getFrame('m1', 1);
  assertEq(f2.data, 'b', 'MR: b');
  // out of range
  assertEq(m.getFrame('m1', 99), null, 'MR: 99 null');
  assertEq(m.getFrame('m1', -1), null, 'MR: -1 null');
  assertEq(m.getFrame('not_in', 0), null, 'MR: not found');
}
function testStep() {
  var m = new MatchReplay();
  m.start('m1');
  m.recordFrame('m1', { data: 'a' });
  m.recordFrame('m1', { data: 'b' });
  m.recordFrame('m1', { data: 'c' });
  var s = m.step('m1');
  assertEq(s.success, true, 'MR: step');
  assertEq(s.frame.index, 1, 'MR: idx 1');
  // end of recording
  m.step('m1');
  m.step('m1');
  var s2 = m.step('m1');
  assertEq(s2.error, 'end_of_recording', 'MR: end');
  // not found
  var s3 = m.step('not_in');
  assertEq(s3.error, 'not_found', 'MR: not found');
}
function testSeek() {
  var m = new MatchReplay();
  m.start('m1');
  m.recordFrame('m1', { data: 'a' });
  m.recordFrame('m1', { data: 'b' });
  m.recordFrame('m1', { data: 'c' });
  var s = m.seek('m1', 1);
  assertEq(s.success, true, 'MR: seek');
  assertEq(s.frame.data, 'b', 'MR: b');
  // out of range
  var s2 = m.seek('m1', 99);
  assertEq(s2.error, 'out_of_range', 'MR: oor');
  // not found
  var s3 = m.seek('not_in', 0);
  assertEq(s3.error, 'not_found', 'MR: not found');
}
function testRewind() {
  var m = new MatchReplay();
  m.start('m1');
  m.recordFrame('m1', {});
  m.recordFrame('m1', {});
  m.seek('m1', 1);
  var r = m.rewind('m1');
  assertEq(r.success, true, 'MR: rewind');
  assertEq(m.getCurrentFrame('m1').index, 0, 'MR: 0');
  var r2 = m.rewind('not_in');
  assertEq(r2.error, 'not_found', 'MR: not found');
}
function testFastForward() {
  var m = new MatchReplay();
  m.start('m1');
  for (var i = 0; i < 100; i++) m.recordFrame('m1', { data: i });
  var f = m.fastForward('m1', 50);
  assertEq(f.success, true, 'MR: ff');
  assertEq(f.frame.index, 50, 'MR: 50');
  var f2 = m.fastForward('m1', 999);
  assertEq(f2.frame.index, 99, 'MR: capped 99');
  var f3 = m.fastForward('not_in', 10);
  assertEq(f3.error, 'not_found', 'MR: not found');
}
function testReplay() {
  var m = new MatchReplay();
  m.start('m1');
  m.recordFrame('m1', { data: 'a' });
  m.recordFrame('m1', { data: 'b' });
  var frames = [];
  var r = m.replay('m1', function (f) { frames.push(f.data); });
  assertEq(r.success, true, 'MR: replay');
  assertEq(frames.length, 2, 'MR: 2 frames');
  assertEq(frames[0], 'a', 'MR: a');
  // invalid
  var r2 = m.replay('m1', null);
  assertEq(r2.error, 'invalid_callback', 'MR: !cb');
  // not found
  var r3 = m.replay('not_in', function () {});
  assertEq(r3.error, 'not_found', 'MR: not found');
}
function testReplayRange() {
  var m = new MatchReplay();
  m.start('m1');
  for (var i = 0; i < 10; i++) m.recordFrame('m1', { data: i });
  var arr = [];
  m.replayRange('m1', 2, 5, function (f) { arr.push(f.data); });
  assertEq(arr.length, 4, 'MR: 4');
  assertEq(arr[0], 2, 'MR: 2');
  assertEq(arr[3], 5, 'MR: 5');
}
function testGetRecording() {
  var m = new MatchReplay();
  m.start('m1', { players: ['p1', 'p2'] });
  var r = m.getRecording('m1');
  assertEq(r.players[0], 'p1', 'MR: p1');
  assertEq(m.getRecording('not_in'), null, 'MR: null');
}
function testListRecordings() {
  var m = new MatchReplay();
  m.start('m1');
  m.start('m2');
  var l = m.listRecordings();
  assertEq(l.length, 2, 'MR: 2');
}
function testExport() {
  var m = new MatchReplay();
  m.start('m1', { players: ['p1'] });
  m.recordFrame('m1', { data: 'a' });
  var exp = m.exportRecording('m1');
  assertEq(exp.format, 'replay-v1', 'MR: v1');
  assertEq(exp.totalFrames, 1, 'MR: 1');
  // not found
  var e2 = m.exportRecording('not_in');
  assertEq(e2.error, 'not_found', 'MR: not found');
}
function testImport() {
  var m = new MatchReplay();
  var data = {
    format: 'replay-v1',
    matchId: 'm1',
    recordingId: 'r1',
    startTime: 1,
    endTime: 100,
    frames: [{ index: 0, data: 'x' }],
    players: ['p1']
  };
  var r = m.importRecording(data);
  assertEq(r.success, true, 'MR: import');
  assertEq(m.getRecording('m1').frames[0].data, 'x', 'MR: x');
  // invalid format
  var r2 = m.importRecording({});
  assertEq(r2.error, 'invalid_format', 'MR: !fmt');
  // no matchId
  var r3 = m.importRecording({ format: 'replay-v1' });
  assertEq(r3.error, 'matchId_required', 'MR: !id');
}
function testMetrics() {
  var m = new MatchReplay();
  m.start('m1');
  m.recordFrame('m1', {});
  m.recordFrame('m1', {});
  var mt = m.getMetrics();
  assertEq(mt.started, 1, 'MR: 1 started');
  assertEq(mt.frames, 2, 'MR: 2 frames');
}
function testSummary() {
  var m = new MatchReplay();
  m.start('m1');
  m.recordFrame('m1', {});
  var s = m.getSummary();
  assertEq(s.totalRecordings, 1, 'MR: 1');
  assertEq(s.totalFrames, 1, 'MR: 1 frame');
}
function testClear() {
  var m = new MatchReplay();
  m.start('m1');
  m.clear();
  assertEq(m.getSummary().totalRecordings, 0, 'MR: 0');
}
function testGetCurrentFrame() {
  var m = new MatchReplay();
  m.start('m1');
  m.recordFrame('m1', { data: 'first' });
  var c = m.getCurrentFrame('m1');
  assertEq(c.data, 'first', 'MR: first');
  // not found
  assertEq(m.getCurrentFrame('not_in'), null, 'MR: null');
}

testEmpty(); testStart(); testStop(); testRecordFrame(); testGetFrame(); testStep(); testSeek(); testRewind(); testFastForward(); testReplay(); testReplayRange(); testGetRecording(); testListRecordings(); testExport(); testImport(); testMetrics(); testSummary(); testClear(); testGetCurrentFrame();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
