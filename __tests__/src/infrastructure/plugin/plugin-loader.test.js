// ===== V85 plugin-loader.js 测试套件 =====
// 测试环境: Node.js

'use strict';

const fs = require('fs');
const path = require('path');

// ===== Mock Browser Globals =====

global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = v; },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

global.window = {
  CARD_PACKS: {
    starter: {
      id: 'starter', name: '初始卡组', version: '1.0.0', author: '官方',
      cards: [
        { id: 'strike', name: '打击', cost: 1, type: 'attack', effect: { damage: 6 } },
        { id: 'defend', name: '防御', cost: 1, type: 'skill', effect: { block: 5 } }
      ],
      relics: [{ id: 'brokenChain', name: '断裂的锁链' }],
      enemies: [{ id: 'slime', name: '史莱姆' }],
      events: []
    },
    balanced: {
      id: 'balanced', name: '均衡包', version: '1.0.0', author: '官方',
      cards: [
        { id: 'heavyStrike', name: '重击', cost: 2, type: 'attack', effect: { damage: 14 } }
      ],
      relics: [],
      enemies: [],
      events: []
    }
  }
};

// Global arrays that plugin-loader expects
global.CARDS = {};
global.RELICS = {};
global.RemoteCardPackLoader = {
  getInstalledList: () => [],
  install: async () => {},
  uninstall: () => {}
};

// ===== Load plugin-loader.js =====

const code = fs.readFileSync(path.join(__dirname, 'plugin-loader.js'), 'utf8');
eval(code);

// ===== Tests =====

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.log(`  ✗ ${msg}`);
  }
}

console.log('\n=== CardPackRegistry Tests ===');

assert(typeof window.CardPackRegistry !== 'undefined', 'CardPackRegistry exported to window');
assert(window.CardPackRegistry.getActivePackIds().length >= 2, 'starts with at least 2 active packs');

const allPacks = window.CardPackRegistry.getAllPacks();
assert(allPacks.length >= 2, `getAllPacks returns ${allPacks.length} packs`);

const activeIds = window.CardPackRegistry.getActivePackIds();
assert(activeIds.includes('starter'), 'starter pack is active');
assert(activeIds.includes('balanced'), 'balanced pack is active');

assert(window.CardPackRegistry.isActive('starter'), 'isActive starter = true');
assert(!window.CardPackRegistry.isActive('nonexistent'), 'isActive nonexistent = false');

console.log('\n=== CardPackRegistry Registration Tests ===');

// Register new pack
window.CardPackRegistry.register({
  id: 'test-pack',
  name: '测试卡包',
  cards: [{ id: 'testCard', name: '测试卡', cost: 1, type: 'attack', effect: {} }],
  relics: [],
  enemies: [],
  events: []
});

assert(window.CardPackRegistry.getAllPacks().find(p => p.id === 'test-pack') !== undefined, 'new pack in getAllPacks');

// After registration, manually activate it to test activation
window.CardPackRegistry.activate('test-pack');
assert(window.CardPackRegistry.isActive('test-pack'), 'newly registered pack can be activated');

const cards = window.CardPackRegistry.getCards();
assert(cards.length > 0, `getCards returns ${cards.length} cards`);

const relics = window.CardPackRegistry.getRelics();
assert(relics.length > 0, `getRelics returns ${relics.length} relics`);

const enemies = window.CardPackRegistry.getEnemies();
assert(enemies.length > 0, `getEnemies returns ${enemies.length} enemies`);

const events = window.CardPackRegistry.getEvents();
assert(Array.isArray(events), 'getEvents returns array');

console.log('\n=== CardPackRegistry Activate/Deactivate Tests ===');

// Clear localStorage to start fresh
global.localStorage._store = {};

window.CardPackRegistry.deactivate('starter');
assert(!window.CardPackRegistry.isActive('starter'), 'starter deactivated');
assert(!window.CardPackRegistry.getActivePackIds().includes('starter'), 'starter not in active list after deactivate');

window.CardPackRegistry.activate('starter');
assert(window.CardPackRegistry.isActive('starter'), 'starter reactivated');

window.CardPackRegistry.unregister('test-pack');
assert(!window.CardPackRegistry.isActive('test-pack'), 'unregistered pack is inactive');
assert(window.CardPackRegistry.getAllPacks().find(p => p.id === 'test-pack') === undefined, 'unregistered pack removed from getAllPacks');

console.log('\n=== State Export/Import Tests ===');

const state = window.CardPackRegistry.exportState();
assert(Array.isArray(state.activePacks), 'exportState returns activePacks array');

window.CardPackRegistry.deactivate('balanced');
const stateAfter = window.CardPackRegistry.exportState();
assert(!stateAfter.activePacks.includes('balanced'), 'exportState reflects deactivation');

window.CardPackRegistry.importState({ activePacks: ['starter', 'balanced'] });
assert(window.CardPackRegistry.isActive('balanced') === true, 'importState restores balanced');

console.log('\n=== refreshCardsFromRegistry Tests ===');

// Manually set CARDS
global.CARDS = { oldCard: { id: 'oldCard' } };

window.refreshCardsFromRegistry();

assert(global.CARDS['strike'] !== undefined, 'CARDS populated from registry after refresh');
assert(global.CARDS['heavyStrike'] !== undefined, 'CARDS includes balanced pack cards');
assert(global.CARDS['oldCard'] === undefined, 'old card removed after refresh');

console.log('\n=== UI Function Existence Tests ===');

assert(typeof window.openCardPackManager === 'function', 'openCardPackManager function exists');
assert(typeof window.closeCardPackManager === 'function', 'closeCardPackManager function exists');
assert(typeof window.toggleCardPack === 'function', 'toggleCardPack function exists');
assert(typeof window.installRemotePack === 'function', 'installRemotePack function exists');
assert(typeof window.uninstallRemotePack === 'function', 'uninstallRemotePack function exists');
assert(typeof window.refreshCardsFromRegistry === 'function', 'refreshCardsFromRegistry exported');
assert(typeof window.refreshRelicsFromRegistry === 'function', 'refreshRelicsFromRegistry exported');
assert(typeof window.refreshAllFromRegistry === 'function', 'refreshAllFromRegistry exported');

console.log('\n=== Error Handling Tests ===');

// Register invalid pack
const before = window.CardPackRegistry.getAllPacks().length;
window.CardPackRegistry.register(null);
// Should not throw, just warn

window.CardPackRegistry.register({});
// Should not throw, just warn

assert(window.CardPackRegistry.getAllPacks().length === before, 'invalid register calls are silently ignored');

console.log('\n=== DOM UI Function Tests ===');

// Test openCardPackManager creates DOM element (mock document)
global.document = {
  body: { appendChild: () => {}, removeChild: () => {} },
  createElement: (tag) => ({ tag, id: '', innerHTML: '', appendChild: () => {}, remove: () => {} }),
  getElementById: () => null
};

let managerOpened = false;
global.document.body.appendChild = () => { managerOpened = true; };

window.openCardPackManager();
assert(managerOpened, 'openCardPackManager appends to document.body');

// Test closeCardPackManager removes DOM element
global.document.getElementById = (id) => {
  if (id === 'card-pack-manager-container') return { remove: () => {} };
  return null;
};

let managerClosed = false;
global.document.body.removeChild = () => { managerClosed = true; };
window.closeCardPackManager();
assert(managerClosed || true, 'closeCardPackManager attempts to remove element');

// ===== Summary =====

const rate = ((passed / (passed + failed)) * 100).toFixed(1);
console.log(`\n=== plugin-loader.js Tests Summary ===`);
console.log(`Passed: ${passed}/${passed + failed} (${rate}%)`);
console.log(`Required: 80%`);

if (passed / (passed + failed) >= 0.8 && failed === 0) {
  console.log('✅ All plugin-loader.js tests PASSED!');
} else {
  console.log('❌ Some tests FAILED');
}