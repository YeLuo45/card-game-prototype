'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'build-pipeline.js'), 'utf8'));
var BuildPipeline = window.BuildPipeline;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var b = new BuildPipeline(); assertEq(b.getSummary().pipelines, 0, 'BP: 0'); }
function testDefinePipeline() {
  var b = new BuildPipeline();
  var r = b.definePipeline('build', {
    stages: [
      { name: 'lint', action: function () { return 'linted'; } },
      { name: 'test', action: function () { return 'tested'; } }
    ]
  });
  assertEq(r.success, true, 'BP: define');
  // errors
  var e1 = b.definePipeline('', { stages: [] });
  assertEq(e1.error, 'invalid_name', 'BP: !name');
  var e2 = b.definePipeline('x', {});
  assertEq(e2.error, 'stages_required', 'BP: !stages');
}
function testRemovePipeline() {
  var b = new BuildPipeline();
  b.definePipeline('x', { stages: [{ name: 'a', action: function () {} }] });
  var r = b.removePipeline('x');
  assertEq(r.success, true, 'BP: remove');
  assertEq(b.getPipeline('x'), null, 'BP: null');
  var r2 = b.removePipeline('nope');
  assertEq(r2.error, 'not_found', 'BP: !found');
}
function testGetPipeline() {
  var b = new BuildPipeline();
  b.definePipeline('x', { stages: [{ name: 'a', action: function () {} }] });
  assert(b.getPipeline('x'), 'BP: got');
  assertEq(b.getPipeline('nope'), null, 'BP: null');
}
function testListPipelines() {
  var b = new BuildPipeline();
  b.definePipeline('a', { stages: [{ name: 's', action: function () {} }] });
  b.definePipeline('b', { stages: [{ name: 's', action: function () {} }] });
  var l = b.listPipelines();
  assertEq(l.length, 2, 'BP: 2');
}
function testExecute() {
  var b = new BuildPipeline();
  b.definePipeline('build', {
    stages: [
      { name: 'step1', action: function () { return 1; } },
      { name: 'step2', action: function (ctx, exec) { exec.context.sum = (exec.context.sum || 0) + 2; return 2; } }
    ]
  });
  var r = b.execute('build', { initial: 0 });
  assertEq(r.success, true, 'BP: success');
  assertEq(r.execution.status, 'completed', 'BP: completed');
  assertEq(r.execution.stages.length, 2, 'BP: 2 stages');
  assertEq(r.execution.context.sum, 2, 'BP: 2 sum');
  // not found
  var e = b.execute('nope', {});
  assertEq(e.error, 'pipeline_not_found', 'BP: !found');
}
function testExecuteFail() {
  var b = new BuildPipeline();
  b.definePipeline('test', {
    stages: [
      { name: 'fail', action: function () { throw new Error('boom'); } }
    ]
  });
  var r = b.execute('test', {});
  assertEq(r.success, false, 'BP: fail');
  assertEq(r.execution.status, 'failed', 'BP: failed');
  assert(r.execution.error.indexOf('boom') !== -1, 'BP: error msg');
}
function testExecuteOptional() {
  var b = new BuildPipeline();
  b.definePipeline('test', {
    stages: [
      { name: 'optional', required: false, action: function () { throw new Error('x'); } },
      { name: 'required', action: function () { return 'ok'; } }
    ]
  });
  var r = b.execute('test', {});
  assertEq(r.success, true, 'BP: opt fail skipped');
  assertEq(r.execution.stages.length, 2, 'BP: both ran');
}
function testRetries() {
  var b = new BuildPipeline();
  var count = 0;
  b.definePipeline('retry', {
    stages: [
      { name: 'flaky', retries: 3, action: function () { count++; if (count < 3) throw new Error('try'); return 'ok'; } }
    ]
  });
  var r = b.execute('retry', {});
  assertEq(r.success, true, 'BP: retry ok');
  assertEq(count, 3, 'BP: 3 tries');
}
function testCaching() {
  var b = new BuildPipeline();
  var count = 0;
  b.definePipeline('cache', {
    stages: [
      { name: 'cached', cacheKey: 'k1', action: function () { count++; return 'data'; } },
      { name: 'cached2', cacheKey: 'k1', action: function () { count++; return 'data2'; } }
    ]
  });
  var r = b.execute('cache', {});
  assertEq(r.success, true, 'BP: cache exec');
  // second stage should be cached
  assertEq(r.execution.stages[1].cached, true, 'BP: stage 2 cached');
  assertEq(count, 1, 'BP: 1 actual call');
}
function testHooks() {
  var b = new BuildPipeline();
  var successCalled = false;
  var failureCalled = false;
  b.definePipeline('hooks', {
    stages: [
      { name: 's', action: function () { return 'ok'; }, onSuccess: function () { successCalled = true; } },
      { name: 'f', action: function () { throw new Error('e'); }, onFailure: function () { failureCalled = true; }, required: false }
    ]
  });
  b.execute('hooks', {});
  assertEq(successCalled, true, 'BP: onSuccess');
  assertEq(failureCalled, true, 'BP: onFailure');
}
function testCommandAction() {
  var b = new BuildPipeline();
  b.definePipeline('cmd', {
    stages: [
      { name: 'shell', action: { command: 'ls' } }
    ]
  });
  var r = b.execute('cmd', {});
  assertEq(r.success, true, 'BP: cmd');
  assertEq(r.execution.stages[0].result.executed, true, 'BP: executed');
}
function testGetExecution() {
  var b = new BuildPipeline();
  b.definePipeline('p', { stages: [{ name: 's', action: function () {} }] });
  var r = b.execute('p', {});
  assert(b.getExecution(r.execution.executionId), 'BP: got exec');
  assertEq(b.getExecution('nope'), null, 'BP: null');
}
function testListExecutions() {
  var b = new BuildPipeline();
  b.definePipeline('p', { stages: [{ name: 's', action: function () {} }] });
  b.execute('p', {});
  b.execute('p', {});
  var l = b.listExecutions();
  assertEq(l.length, 2, 'BP: 2');
}
function testValidate() {
  var b = new BuildPipeline();
  b.definePipeline('good', { stages: [{ name: 's', action: function () {} }] });
  var r = b.validatePipeline('good');
  assertEq(r.valid, true, 'BP: valid');
  // invalid
  b.definePipeline('bad', { stages: [{ name: 'noaction' }, { name: 'noactiontype' }] });
  var r2 = b.validatePipeline('bad');
  assertEq(r2.valid, false, 'BP: !valid');
  assertEq(r2.errors.length, 2, 'BP: 2 errs');
  // not found
  var e = b.validatePipeline('nope');
  assertEq(e.error, 'not_found', 'BP: !found');
}
function testMetrics() {
  var b = new BuildPipeline();
  b.definePipeline('p', { stages: [{ name: 'a', action: function () {} }, { name: 'b', action: function () {} }] });
  b.execute('p', {});
  var m = b.getMetrics();
  assertEq(m.pipelines, 1, 'BP: 1 pipe');
  assertEq(m.stages, 2, 'BP: 2 stages');
  assertEq(m.executions, 1, 'BP: 1 exec');
}
function testSummary() {
  var b = new BuildPipeline();
  b.definePipeline('p', { stages: [{ name: 'a', action: function () {} }] });
  b.execute('p', {});
  var s = b.getSummary();
  assertEq(s.pipelines, 1, 'BP: 1');
  assertEq(s.executions, 1, 'BP: 1 exec');
}
function testClearCache() {
  var b = new BuildPipeline();
  b._setCache('k', 'v');
  b.clearCache();
  assertEq(b._getCache('k'), null, 'BP: cache cleared');
}
function testClear() {
  var b = new BuildPipeline();
  b.definePipeline('p', { stages: [{ name: 'a', action: function () {} }] });
  b.execute('p', {});
  b.clear();
  assertEq(b.getSummary().pipelines, 0, 'BP: 0');
}

testEmpty(); testDefinePipeline(); testRemovePipeline(); testGetPipeline(); testListPipelines(); testExecute(); testExecuteFail(); testExecuteOptional(); testRetries(); testCaching(); testHooks(); testCommandAction(); testGetExecution(); testListExecutions(); testValidate(); testMetrics(); testSummary(); testClearCache(); testClear();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
