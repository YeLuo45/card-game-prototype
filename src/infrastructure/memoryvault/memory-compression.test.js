'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-compression.js'), 'utf8'));
var MemoryCompression = window.MemoryCompression;
var COMPRESSION_STRATEGY = window.COMPRESSION_STRATEGY;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var c = new MemoryCompression();
  assertEq(typeof c.compress, 'function', 'Compress: init');
  assertEq(c.strategy, 'head_tail', 'Compress: default strategy');

  // TRUNCATE
  var r1 = c.compress('this is a long string that should be truncated', { strategy: 'truncate', maxChars: 10 });
  assertEq(r1.content.length, 10, 'Compress: truncate length');
  assertEq(r1.content, 'this is a ', 'Compress: truncate content');

  // HEAD_TAIL
  var r2 = c.compress('abcdefghijklmnopqrstuvwxyz', { strategy: 'head_tail', maxChars: 10 });
  assert(r2.content.indexOf('...') !== -1, 'Compress: head_tail has ellipsis');
  assert(r2.content.indexOf('abc') === 0, 'Compress: head_tail starts with head');
  assert(r2.content.indexOf('xyz') !== -1, 'Compress: head_tail ends with tail');

  // SENTENCE_RANK
  var text = 'I lost the battle. The dragon attacked me hard. I learned a new strategy. Cards were discarded.';
  var r3 = c.compress(text, { strategy: 'sentence_rank', maxChars: 50 });
  assert(r3.content.length <= 60, 'Compress: sentence_rank under budget');
  // 'dragon' is a keyword, so the dragon sentence should be present
  assert(r3.content.toLowerCase().indexOf('dragon') !== -1, 'Compress: sentence_rank picks keyword sentence');

  // KEYWORD
  var r4 = c.compress('dragon dragon attack attack win win strategy strategy dragon', { strategy: 'keyword', maxChars: 50 });
  assert(r4.content.indexOf('dragon') !== -1, 'Compress: keyword includes dragon');
  assert(r4.content.indexOf('attack') !== -1, 'Compress: keyword includes attack');

  // LAYER_AWARE: per-layer budget
  var entries = [
    { id: 'm1', layer: 'L0', content: 'rule' },
    { id: 'm2', layer: 'L4', content: 'session' },
    { id: 'm3', layer: 'L2', content: 'global knowledge' },
    { id: 'm4', layer: 'L4', content: 'another session' }
  ];
  var c2 = new MemoryCompression();
  var grouped = c2.compressEntries(entries, 1000);
  assertEq(grouped.length, 4, 'Compress: layer_aware 4 entries');
  var l0 = grouped.filter(function (x) { return x.layer === 'L0'; })[0];
  assertEq(l0.compressed, 'rule', 'Compress: L0 preserved');
  // L4 should have 2 entries
  var l4s = grouped.filter(function (x) { return x.layer === 'L4'; });
  assertEq(l4s.length, 2, 'Compress: L4 has 2 entries');

  // budgetChars
  var c3 = new MemoryCompression({ charPerToken: 4 });
  assertEq(c3.budgetChars(100), 400, 'Compress: budget 100 tokens = 400 chars');

  // budgetForLayer
  assertEq(c3.budgetForLayer('L0', 1000), 1000, 'Compress: L0 gets 100%');
  assertEq(c3.budgetForLayer('L1', 1000), 800, 'Compress: L1 gets 80%');
  assertEq(c3.budgetForLayer('L4', 1000), 200, 'Compress: L4 gets 20%');

  // estimateTokens
  assertEq(c3.estimateTokens('12345678'), 2, 'Compress: estimate 8 chars = 2 tokens');
  assertEq(c3.estimateTokens(''), 0, 'Compress: empty = 0');
  assertEq(c3.estimateTokens(null), 0, 'Compress: null = 0');

  // Compression ratio
  var c4 = new MemoryCompression();
  c4.compress('a long string that should be compressed', { strategy: 'truncate', maxChars: 20 });
  var st = c4.getStats();
  assert(st.count > 0, 'Compress: stats count > 0');
  assert(st.totalOriginal > 0, 'Compress: stats totalOrig > 0');
  assert(st.avgRatio > 0 && st.avgRatio < 1, 'Compress: stats ratio < 1');

  // Empty / null content
  var r5 = c4.compress('', { strategy: 'truncate', maxChars: 100 });
  assertEq(r5.content, '', 'Compress: empty content');
  assertEq(r5.originalLength, 0, 'Compress: empty original 0');

  var r6 = c4.compress(null, { strategy: 'truncate', maxChars: 100 });
  assertEq(r6.content, '', 'Compress: null content');

  // Compression within budget
  var longText = '';
  for (var i = 0; i < 1000; i++) longText += 'word' + i + ' ';
  var r7 = c4.compress(longText, { strategy: 'head_tail', maxChars: 100 });
  assert(r7.content.length <= 110, 'Compress: long text under 100+10');
  assert(r7.ratio < 0.2, 'Compress: long text ratio < 20%');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
