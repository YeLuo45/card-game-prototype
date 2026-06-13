'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'dream-memory-store.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'memory-encryption.js'), 'utf8'));
var DreamMemoryStore = window.DreamMemoryStore;
var MemoryEncryption = window.MemoryEncryption;
var ENCRYPTION_ALGO = window.ENCRYPTION_ALGO;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  // Init
  var e = new MemoryEncryption();
  assertEq(typeof e.encrypt, 'function', 'Encrypt: init');
  assertEq(e.algo, 'XOR', 'Encrypt: default algo XOR');
  assertEq(e.getStats().hasKey, false, 'Encrypt: no key initially');

  // No key
  var r0 = e.encrypt('secret');
  assertEq(r0.error, 'no_key', 'Encrypt: no_key error');
  assertEq(r0.success, undefined, 'Encrypt: no success');

  // Set key + encrypt
  e.setKey('mySecretKey');
  assertEq(e.getStats().hasKey, true, 'Encrypt: key set');

  var enc = e.encrypt('hello world');
  assertEq(enc.success, true, 'Encrypt: success');
  assert(enc.ciphertext.indexOf('XOR:') === 0, 'Encrypt: XOR prefix');
  assert(enc.ciphertext.indexOf('hello world') === -1, 'Encrypt: plaintext not in ciphertext');

  // Decrypt roundtrip
  var dec = e.decrypt(enc.ciphertext);
  assertEq(dec, 'hello world', 'Encrypt: roundtrip XOR');

  // Different keys produce different ciphertext
  var e2 = new MemoryEncryption({ key: 'keyA' });
  var e3 = new MemoryEncryption({ key: 'keyB' });
  var cA = e2.encrypt('test');
  var cB = e3.encrypt('test');
  assert(cA.ciphertext !== cB.ciphertext, 'Encrypt: different keys → different ct');

  // Wrong key fails decryption (garbled text, not original)
  var garbled = e3.decrypt(cA.ciphertext);
  assert(garbled !== 'test', 'Encrypt: wrong key produces garbled text');

  // AES-GCM mode
  var eAes = new MemoryEncryption({ algo: 'AES-GCM', key: 'k' });
  var cAes = eAes.encrypt('classified');
  assert(cAes.ciphertext.indexOf('AES:') === 0, 'Encrypt: AES-GCM prefix');
  var dAes = eAes.decrypt(cAes.ciphertext);
  assertEq(dAes, 'classified', 'Encrypt: AES roundtrip');

  // BASE64 mode (obfuscation, but should be reversible)
  var eB64 = new MemoryEncryption({ algo: 'BASE64', key: 'k' });
  var cB64 = eB64.encrypt('visible');
  assert(cB64.ciphertext.indexOf('B64:') === 0, 'Encrypt: B64 prefix');
  var dB64 = eB64.decrypt(cB64.ciphertext);
  assertEq(dB64, 'visible', 'Encrypt: B64 roundtrip');

  // Unknown format
  var unk = e.decrypt('plain_string');
  assertEq(unk.error, 'unknown_format', 'Encrypt: unknown format');

  // Sensitive field detection
  var e3 = new MemoryEncryption({ key: 'k' });
  assertEq(e3.isSensitive('content'), true, 'Encrypt: content is sensitive');
  assertEq(e3.isSensitive('metadata'), true, 'Encrypt: metadata is sensitive');
  assertEq(e3.isSensitive('type'), false, 'Encrypt: type not sensitive');

  // Custom sensitive fields are MERGED with defaults (not replaced)
  var e4 = new MemoryEncryption({ key: 'k', sensitiveFields: ['cardId', 'amount'] });
  assertEq(e4.isSensitive('cardId'), true, 'Encrypt: custom sensitive');
  assertEq(e4.isSensitive('content'), true, 'Encrypt: default still sensitive after merge');
  assertEq(e4.isSensitive('amount'), true, 'Encrypt: amount sensitive');
  assertEq(e4.isSensitive('type'), false, 'Encrypt: type not sensitive');

  // encryptEntry
  var entry = { id: 'm1', type: 'episodic', layer: 'L4', content: 'private content', createdAt: 1 };
  var encEntry = e4.encryptEntry(entry);
  assertEq(encEntry.type, 'episodic', 'Encrypt: type preserved');
  assertEq(encEntry.layer, 'L4', 'Encrypt: layer preserved');
  assert(encEntry.content.indexOf('private') === -1, 'Encrypt: content encrypted');
  // Decrypt roundtrip on entry
  var decEntry = e4.decryptEntry(encEntry);
  assertEq(decEntry.content, 'private content', 'Encrypt: entry content roundtrip');
  // Non-sensitive field (with custom config, type isn't sensitive)
  assertEq(decEntry.type, 'episodic', 'Encrypt: type unchanged');

  // Default sensitive field (content) should be encrypted
  var eDefault = new MemoryEncryption({ key: 'k' });
  var enc2 = eDefault.encryptEntry({ id: 'm2', type: 'episodic', layer: 'L4', content: 'top secret' });
  assert(enc2.content.indexOf('top secret') === -1, 'Encrypt: default sensitive content encrypted');
  var dec2 = eDefault.decryptEntry(enc2);
  assertEq(dec2.content, 'top secret', 'Encrypt: default roundtrip');

  // Hash one-way
  var h1 = e.hash('value');
  var h2 = e.hash('value');
  assertEq(h1, h2, 'Encrypt: hash deterministic');
  var h3 = e.hash('other');
  assert(h1 !== h3, 'Encrypt: different values → different hash');

  // Verify
  assertEq(e.verify('value', h1), true, 'Encrypt: verify passes');
  assertEq(e.verify('value', 'wrong'), false, 'Encrypt: verify fails');

  // encryptStore integration
  var store = new DreamMemoryStore();
  store.save('episodic', 'L4', 'memory1', { sessionId: 's1' });
  store.save('semantic', 'L2', 'knowledge1');
  var eS = new MemoryEncryption({ key: 'k' });
  var encrypted = eS.encryptStore(store);
  assertEq(encrypted.length, 2, 'Encrypt: store 2 entries');
  // All content fields should be encrypted
  for (var i = 0; i < encrypted.length; i++) {
    assert(encrypted[i].content.indexOf('memory') === -1 && encrypted[i].content.indexOf('knowledge') === -1,
      'Encrypt: store content encrypted: ' + encrypted[i].content);
  }

  // Stats
  var stats = eS.getStats();
  assert(stats.encryptedCount > 0, 'Encrypt: stats encryptedCount');
  assertEq(stats.algo, 'XOR', 'Encrypt: stats algo');

  // Null handling
  var rN = e.encrypt(null);
  assertEq(rN, null, 'Encrypt: null returns null');
  var rU = e.encrypt(undefined);
  assertEq(rU, null, 'Encrypt: undefined returns null');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
