'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-encoder.js'), 'utf8'));
var MemoryEncoder = window.MemoryEncoder;
var ENCODING = window.ENCODING;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertClose(a, b, eps, msg) { assert(Math.abs(a - b) < eps, msg + ' (expected ~' + b + ', got ' + a + ')'); }

{
  var e = new MemoryEncoder();
  assertEq(typeof e.encode, 'function', 'Encoder: init');
  assertEq(e.getStats().total, 0, 'Encoder: empty stats');
  assertEq(e.getStats().dim, 16, 'Encoder: default dim 16');

  // Plain
  var p = e.encode('hello world', ENCODING.PLAIN);
  assertEq(p.encoding, 'plain', 'Encoder: plain mode');
  assertEq(p.value, 'hello world', 'Encoder: plain value');

  // Hash
  var h = e.encode('hello world', ENCODING.HASH);
  assertEq(h.encoding, 'hash', 'Encoder: hash mode');
  assertEq(typeof h.value, 'string', 'Encoder: hash is string');
  assertEq(h.value.length > 0, true, 'Encoder: hash non-empty');
  var h2 = e.encode('hello world', ENCODING.HASH);
  assertEq(h.value, h2.value, 'Encoder: hash deterministic');

  // Base64
  var b = e.encode('hello', ENCODING.BASE64);
  assertEq(b.encoding, 'base64', 'Encoder: base64 mode');
  assertEq(b.value, 'aGVsbG8=', 'Encoder: base64 value');

  // Vector
  var v = e.encode('dragon attack wins battle', ENCODING.VECTOR);
  assertEq(v.encoding, 'vector', 'Encoder: vector mode');
  assertEq(v.value.length, 16, 'Encoder: vector dim=16');
  // Normalized: sum of squares ≈ 1
  var sumsq = 0;
  for (var i = 0; i < v.value.length; i++) sumsq += v.value[i] * v.value[i];
  assertClose(sumsq, 1.0, 0.01, 'Encoder: vector normalized');

  // Structured
  var s = e.encode({ foo: 'bar', n: 42 }, ENCODING.STRUCTURED);
  assertEq(s.encoding, 'structured', 'Encoder: structured mode');
  var parsed = JSON.parse(s.value);
  assertEq(parsed.foo, 'bar', 'Encoder: structured roundtrip');

  // null/undefined content
  var n = e.encode(null);
  assertEq(n.encoding, 'plain', 'Encoder: null → plain');
  assertEq(n.value, '', 'Encoder: null → empty value');

  // Similarity
  var sim1 = e.similarity('dragon attack wins', 'dragon attack wins');
  assertClose(sim1, 1.0, 0.01, 'Encoder: identical = 1.0');
  var sim2 = e.similarity('dragon attack wins', 'totally unrelated text');
  assert(sim2 < sim1, 'Encoder: similar > unrelated');
  assert(sim2 >= 0 && sim2 <= 1, 'Encoder: sim in [0,1]');

  // Custom dim
  var e8 = new MemoryEncoder({ dim: 8 });
  var v8 = e8.encode('test text', ENCODING.VECTOR);
  assertEq(v8.value.length, 8, 'Encoder: custom dim 8');

  // Stats accumulate — 7 encodings (null skipped since early-return, so 1+2+1+1+1+1=7, then +2 = 9... actually null skipped = 6+2=8)
  e.encode('a', ENCODING.HASH);
  e.encode('b', ENCODING.VECTOR);
  var st = e.getStats();
  assertEq(st.total, 8, 'Encoder: stats total=8 (null skipped + 2)');
  assertEq(st.byMode.hash, 3, 'Encoder: hash count=3 (2+1)');
  assertEq(st.byMode.vector, 2, 'Encoder: vector count=2 (1+1)');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
