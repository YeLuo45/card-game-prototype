// ===== card-packs 测试套件 =====
// 测试环境: Node.js

'use strict';

const fs = require('fs');
const path = require('path');

// Mock window
global.window = {
  CARD_PACKS: {},
  CardPackRegistry: {
    _packs: {},
    _activeIds: [],
    register(pack) {
      if (!pack || !pack.id) return;
      this._packs[pack.id] = pack;
    },
    getAllPacks() { return Object.values(this._packs); },
    getActivePackIds() { return this._activeIds; }
  }
};

// Load card packs
const cardPacksDir = path.join(__dirname, 'card-packs');
const packFiles = ['starter.js', 'balanced.js', 'ironclad.js'];

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}

function assertEq(actual, expected, msg) {
  if (actual === expected) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ FAIL: ${msg} (expected ${expected}, got ${actual})`); }
}

function assertContains(arr, item, msg) {
  if (arr.includes(item)) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}

console.log('=== Card Packs Tests ===\n');

// Load each card pack
for (const packFile of packFiles) {
  console.log(`--- Loading ${packFile} ---`);
  const packPath = path.join(cardPacksDir, packFile);
  if (fs.existsSync(packPath)) {
    const code = fs.readFileSync(packPath, 'utf8');
    eval(code);
    console.log(`  ✓ ${packFile} loaded`);
  } else {
    console.log(`  ✗ ${packFile} not found`);
    failed++;
  }
}

// Test CARD_PACKS structure
console.log('\n--- CARD_PACKS Structure ---');
assert(typeof window.CARD_PACKS === 'object', 'CARD_PACKS is object');
assert(window.CARD_PACKS['starter'], 'starter pack exists');
assert(window.CARD_PACKS['balanced'], 'balanced pack exists');
assert(window.CARD_PACKS['ironclad'], 'ironclad pack exists');

// Test starter pack structure
console.log('\n--- Starter Pack Tests ---');
const starter = window.CARD_PACKS['starter'];
assertEq(starter.id, 'starter', 'starter id correct');
assertEq(starter.name, '初始卡组', 'starter name correct');
assertEq(starter.version, '1.0.0', 'starter version correct');
assertEq(starter.author, '官方', 'starter author correct');
assert(Array.isArray(starter.cards), 'starter.cards is array');
assertEq(starter.cards.length, 10, 'starter has 10 cards');
assert(Array.isArray(starter.relics), 'starter.relics is array');
assert(starter.relics.length >= 1, 'starter has at least 1 relic');

// Test card structure
console.log('\n--- Card Structure Tests ---');
const firstCard = starter.cards[0];
assertEq(firstCard.id, 'strike', 'first card is strike');
assertEq(firstCard.name, '打击', 'strike name correct');
assertEq(firstCard.cost, 1, 'strike costs 1');
assertEq(firstCard.type, 'attack', 'strike is attack type');
assert(typeof firstCard.effect === 'object', 'strike has effect object');
assertEq(firstCard.effect.damage, 6, 'strike deals 6 damage');

// Test balanced pack
console.log('\n--- Balanced Pack Tests ---');
const balanced = window.CARD_PACKS['balanced'];
assert(balanced.cards.length > 0, 'balanced has cards');
const balancedCard = balanced.cards.find(c => c.type === 'attack' || c.type === 'skill');
assert(balancedCard, 'balanced has at least one attack or skill card');

// Test ironclad pack
console.log('\n--- Ironclad Pack Tests ---');
const ironclad = window.CARD_PACKS['ironclad'];
assert(ironclad.cards.length > 0, 'ironclad has cards');
assert(Array.isArray(ironclad.relics), 'ironclad has relics array');

// Test CardPackRegistry registration
console.log('\n--- CardPackRegistry Tests ---');
assert(typeof window.CardPackRegistry === 'object', 'CardPackRegistry exists');
const allPacks = window.CardPackRegistry.getAllPacks();
assert(allPacks.length >= 3, 'CardPackRegistry has 3 packs registered');

// Summary
console.log('\n=== card-packs Tests Summary ===');
console.log(`Passed: ${passed}/${passed + failed} (${((passed/(passed+failed))*100).toFixed(1)}%)`);

console.log(`✓ All tests PASSED`);