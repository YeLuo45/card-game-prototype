'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'strategy-share.js'), 'utf8'));
var StrategyShare = window.StrategyShare;
var SHARE_FORMATS = window.SHARE_FORMATS;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testBase32() {
  // Test base32 directly
  var bytes = [72, 101, 108, 108, 111]; // "Hello"
  // Can't access internal functions but can test through encode/decode
  var ss = new StrategyShare();
  var deck = { name: 'Test', cards: ['c1', 'c2', 'c3'] };
  var enc = ss.encodeDeck(deck);
  var dec = ss.decode(enc.code);
  assertEq(dec.success, true, 'SS: base32 roundtrip');
  assertEq(dec.data.name, 'Test', 'SS: data preserved');
}

function testEncodeDeck() {
  var ss = new StrategyShare();
  var r = ss.encodeDeck({ name: 'Aggro', cards: ['c1', 'c2', 'c3'] });
  assertEq(r.success, true, 'SS: deck encode success');
  assertEq(r.format, 'deck', 'SS: format deck');
  assert(r.code.indexOf('CGP-') === 0, 'SS: code starts with CGP-');
  assert(r.code.length > 10, 'SS: code non-trivial');
  // errors
  var e1 = ss.encodeDeck(null);
  assertEq(e1.error, 'invalid_deck', 'SS: null deck');
  var e2 = ss.encodeDeck({});
  assertEq(e2.error, 'invalid_cards', 'SS: no cards');
  var e3 = ss.encodeDeck({ cards: 'not array' });
  assertEq(e3.error, 'invalid_cards', 'SS: not array');
  // long deck (truncated to 60)
  var bigCards = [];
  for (var i = 0; i < 100; i++) bigCards.push('c' + i);
  var r2 = ss.encodeDeck({ name: 'Big', cards: bigCards });
  assertEq(r2.success, true, 'SS: big deck');
  var dec = ss.decode(r2.code);
  assertEq(dec.data.cards.length, 60, 'SS: truncated to 60');
}

function testEncodeProfile() {
  var ss = new StrategyShare();
  var profile = {
    playerName: 'Alice',
    playerId: 'p1',
    totalGames: 100,
    totalWins: 60,
    archetype: 'aggro',
    rating: { mmr: 1500 },
    decks: { d1: {}, d2: {}, d3: {} }
  };
  var r = ss.encodeProfile(profile);
  assertEq(r.success, true, 'SS: profile encode');
  var dec = ss.decode(r.code);
  assertEq(dec.format, 'profile', 'SS: profile format');
  assertEq(dec.data.playerName, 'Alice', 'SS: playerName');
  assertEq(dec.data.totalGames, 100, 'SS: games');
  assertEq(dec.data.rating, 1500, 'SS: rating');
  assertEq(dec.data.archetype, 'aggro', 'SS: archetype');
  assertEq(dec.data.topDecks.length, 3, 'SS: top decks');
  // empty profile
  var r2 = ss.encodeProfile({});
  assertEq(r2.success, true, 'SS: empty profile');
  // errors
  var e1 = ss.encodeProfile(null);
  assertEq(e1.error, 'invalid_profile', 'SS: null profile');
}

function testEncodeBuild() {
  var ss = new StrategyShare();
  var r = ss.encodeBuild({ name: 'Build1', items: ['sword', 'shield'], skills: ['fireball'] });
  assertEq(r.success, true, 'SS: build encode');
  var dec = ss.decode(r.code);
  assertEq(dec.format, 'build', 'SS: build format');
  assertEq(dec.data.name, 'Build1', 'SS: build name');
  // errors
  var e1 = ss.encodeBuild(null);
  assertEq(e1.error, 'invalid_build', 'SS: null build');
}

function testDecode() {
  var ss = new StrategyShare();
  var r = ss.encodeDeck({ name: 'D', cards: ['a', 'b'] });
  var dec = ss.decode(r.code);
  assertEq(dec.success, true, 'SS: decode success');
  assert(dec.timestamp > 0, 'SS: timestamp');
  // errors
  var e1 = ss.decode(null);
  assertEq(e1.error, 'invalid_code', 'SS: null code');
  var e2 = ss.decode('not a code');
  assertEq(e2.error, 'invalid_format', 'SS: bad format');
  var e3 = ss.decode('XYZ-AAAA-AA');
  assertEq(e3.error, 'wrong_prefix', 'SS: wrong prefix');
  // bad checksum
  var parts = r.code.split('-');
  var badCode = parts[0] + '-' + parts[1] + '-ZZ';
  var e4 = ss.decode(badCode);
  assertEq(e4.error, 'checksum_mismatch', 'SS: bad checksum');
}

function testValidate() {
  var ss = new StrategyShare();
  var r = ss.encodeDeck({ name: 'D', cards: ['a'] });
  var v = ss.validateCode(r.code);
  assertEq(v.valid, true, 'SS: valid code');
  // invalid
  var v2 = ss.validateCode(null);
  assertEq(v2.valid, false, 'SS: null invalid');
  var v3 = ss.validateCode('bad');
  assertEq(v3.valid, false, 'SS: short invalid');
  var v4 = ss.validateCode('CGP-AAA-A');
  assertEq(v4.valid, false, 'SS: bad checksum');
  var v5 = ss.validateCode('CGP--AA');
  assertEq(v5.valid, false, 'SS: empty body');
}

function testQR() {
  var ss = new StrategyShare();
  var r = ss.encodeDeck({ name: 'D', cards: ['a'] });
  var qr = ss.generateQRMatrix(r.code);
  assertEq(qr.size, 21, 'SS: QR size 21');
  assertEq(qr.matrix.length, 21, 'SS: QR matrix 21 rows');
  assertEq(qr.matrix[0].length, 21, 'SS: QR matrix 21 cols');
  // 3 corner finders
  assertEq(qr.matrix[0][0], 1, 'SS: TL finder');
  assertEq(qr.matrix[0][6], 1, 'SS: TL finder right');
  assertEq(qr.matrix[6][0], 1, 'SS: TL finder bottom');
  assertEq(qr.matrix[6][6], 1, 'SS: TL finder corner');
  // inner empty space
  assertEq(qr.matrix[1][1], 0, 'SS: TL finder white');
  // inner 3x3
  assertEq(qr.matrix[2][2], 1, 'SS: TL finder center');
  assertEq(qr.matrix[3][3], 1, 'SS: TL finder center 3x3');
  // text
  var txt = ss.qrToText(qr);
  assertEq(typeof txt.text, 'string', 'SS: text string');
  assert(txt.text.indexOf('██') !== -1 || txt.text.indexOf('  ') !== -1, 'SS: text has blocks');
  // errors
  var e1 = ss.generateQRMatrix(null);
  assertEq(e1.error, 'invalid_code', 'SS: null QR');
  var e2 = ss.qrToText(null);
  assertEq(e2.error, 'invalid_qr', 'SS: null text');
  var e3 = ss.qrToText({});
  assertEq(e3.error, 'invalid_qr', 'SS: empty QR');
}

function testPrefix() {
  var ss = new StrategyShare({ prefix: 'XYZ' });
  var r = ss.encodeDeck({ name: 'D', cards: ['a'] });
  assert(r.code.indexOf('XYZ-') === 0, 'SS: custom prefix');
  var dec = ss.decode(r.code);
  assertEq(dec.success, true, 'SS: custom prefix decode');
  // default prefix still rejected
  var e = ss.decode(r.code.replace('XYZ-', 'CGP-'));
  // This actually has same body+checksum, so check still passes
  // But prefix check fails for new ss with default prefix
  var ss2 = new StrategyShare();
  var e2 = ss2.decode(r.code);
  assertEq(e2.error, 'wrong_prefix', 'SS: default rejects custom');
}

function testPrivacy() {
  var ss = new StrategyShare();
  // mock privacy manager
  var mockPM = {
    redactForCloud: function (data, cat) {
      if (data.private) return { level: 'local', data: null };
      return { level: 'full', data: data };
    }
  };
  var r1 = ss.encodeWithPrivacy({ name: 'D', cards: ['a'] }, 'deck', mockPM);
  assertEq(r1.success, true, 'SS: privacy full allowed');
  var r2 = ss.encodeWithPrivacy({ name: 'D', cards: ['a'], private: true }, 'deck', mockPM);
  assertEq(r2.error, 'privacy_local_block', 'SS: privacy local blocked');
  // invalid format
  var r3 = ss.encodeWithPrivacy({}, 'invalid', mockPM);
  assertEq(r3.error, 'invalid_format', 'SS: invalid format');
}

function testStats() {
  var ss = new StrategyShare();
  var s = ss.getStats();
  assertEq(s.prefix, 'CGP', 'SS: default prefix');
  assertEq(s.alphabetSize, 32, 'SS: alphabet 32');
  assertEq(s.includeMetadata, true, 'SS: include metadata default');
  var ss2 = new StrategyShare({ includeMetadata: false });
  assertEq(ss2.getStats().includeMetadata, false, 'SS: no metadata');
}

function testSpecialChars() {
  var ss = new StrategyShare();
  var deck = { name: '测试牌组 🎴', cards: ['c1', 'c2'] };
  var r = ss.encodeDeck(deck);
  assertEq(r.success, true, 'SS: unicode encode');
  var dec = ss.decode(r.code);
  assertEq(dec.success, true, 'SS: unicode decode');
  assertEq(dec.data.name, '测试牌组 🎴', 'SS: unicode preserved');
}

function testFormats() {
  assertEq(SHARE_FORMATS.DECK, 'deck', 'SS: DECK format');
  assertEq(SHARE_FORMATS.PROFILE, 'profile', 'SS: PROFILE format');
  assertEq(SHARE_FORMATS.BUILD, 'build', 'SS: BUILD format');
}

testBase32();
testEncodeDeck();
testEncodeProfile();
testEncodeBuild();
testDecode();
testValidate();
testQR();
testPrefix();
testPrivacy();
testStats();
testSpecialChars();
testFormats();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
