// ===== relics-loader.js 测试套件 =====
// 测试环境: Node.js

'use strict';

const fs = require('fs');
const path = require('path');

// ===== Mock Browser Globals =====

global.window = global;  // Node.js global object serves as window

// Mock document for relics-loader.js (which injects CSS styles)
global.document = {
  createElement: (tag) => ({ tag, textContent: '', appendChild: () => {} }),
  head: { appendChild: () => {} }
};

global.gameState = {
  playerHp: 50,
  playerMaxHp: 100,
  playerShield: 0,
  energy: 3,
  relics: []
};

global.addLog = function(msg, type) {
  // console.log(`[${type}] ${msg}`);
};

// Global arrays that relics-loader expects
global.CARDS = {};
global.RELICS = {};

// ===== Load relics-loader.js =====

const code = fs.readFileSync(path.join(__dirname, 'relics-loader.js'), 'utf8');
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

console.log('\n=== RELICS_V62 Structure Tests ===');

assert(typeof window.RELICS_V62 !== 'undefined', 'RELICS_V62 is defined');
assert(typeof window.RELICS_V62 === 'object', 'RELICS_V62 is an object');

const relicIds = Object.keys(window.RELICS_V62);
assert(relicIds.length > 0, `RELICS_V62 has ${relicIds.length} relics`);

console.log('\n=== Relic Properties Tests ===');

// Test known relics have required properties
const testRelics = ['relic_ankh', 'relic_skull', 'relic_shield', 'rustyRing', 'burningCore', 'darkHeart'];

testRelics.forEach(relicId => {
  const relic = window.RELICS_V62[relicId];
  assert(relic !== undefined, `Relic ${relicId} exists`);
  if (relic) {
    assert(relic.id === relicId, `${relicId} has correct id`);
    assert(typeof relic.name === 'string' && relic.name.length > 0, `${relicId} has valid name`);
    assert(typeof relic.description === 'string' && relic.description.length > 0, `${relicId} has valid description`);
    assert(['common', 'uncommon', 'rare', 'legendary', 'boss'].includes(relic.rarity), `${relicId} has valid rarity`);
    assert(typeof relic.icon === 'string' && relic.icon.length > 0, `${relicId} has valid icon`);
  }
});

console.log('\n=== Function Export Tests ===');

assert(typeof window.getRelicInfo === 'function', 'getRelicInfo exported');
assert(typeof window.getEquippedRelics === 'function', 'getEquippedRelics exported');
assert(typeof window.hasRelicV62 === 'function', 'hasRelicV62 exported');
assert(typeof window.addRelic === 'function', 'addRelic exported');
assert(typeof window.getRandomRelicId === 'function', 'getRandomRelicId exported');
assert(typeof window.getRelicIcon === 'function', 'getRelicIcon exported');
assert(typeof window.getRelicRarityColor === 'function', 'getRelicRarityColor exported');
assert(typeof window.triggerRelicHook === 'function', 'triggerRelicHook exported');

console.log('\n=== getRelicInfo Tests ===');

const ankhRelic = getRelicInfo('relic_ankh');
assert(ankhRelic !== null, 'getRelicInfo returns relic for known id');
assert(ankhRelic.name === '生命之符', 'relic_ankh name is correct');
assert(ankhRelic.rarity === 'rare', 'relic_ankh rarity is rare');

const nullRelic = getRelicInfo('nonexistent_relic');
assert(nullRelic === null, 'getRelicInfo returns null for unknown id');

console.log('\n=== addRelic / getEquippedRelics Tests ===');

gameState.relics = [];
addRelic('relic_ankh');
assert(gameState.relics.includes('relic_ankh'), 'addRelic adds relic to gameState');
assert(getEquippedRelics().includes('relic_ankh'), 'getEquippedRelics returns added relic');

// Adding duplicate should not create duplicates
addRelic('relic_ankh');
assert(gameState.relics.filter(r => r === 'relic_ankh').length === 1, 'addRelic does not create duplicates');

addRelic('relic_skull');
assert(gameState.relics.length === 2, 'addRelic allows multiple unique relics');

console.log('\n=== hasRelicV62 Tests ===');

assert(hasRelicV62('relic_ankh') === true, 'hasRelicV62 returns true for owned relic');
assert(hasRelicV62('relic_shield') === false, 'hasRelicV62 returns false for non-owned relic');

console.log('\n=== getRelicIcon Tests ===');

assert(getRelicIcon('relic_ankh') === '☥', 'getRelicIcon returns correct icon for relic_ankh');
assert(getRelicIcon('relic_skull') === '💀', 'getRelicIcon returns correct icon for relic_skull');
assert(getRelicIcon('unknown') === '❓', 'getRelicIcon returns ❓ for unknown relic');

console.log('\n=== getRelicRarityColor Tests ===');

assert(getRelicRarityColor('common') === '#aaa', 'common rarity color is #aaa');
assert(getRelicRarityColor('uncommon') === '#2ecc71', 'uncommon rarity color is #2ecc71');
assert(getRelicRarityColor('rare') === '#3498db', 'rare rarity color is #3498db');
assert(getRelicRarityColor('legendary') === '#f39c12', 'legendary rarity color is #f39c12');
assert(getRelicRarityColor('boss') === '#e74c3c', 'boss rarity color is #e74c3c');
assert(getRelicRarityColor('unknown') === '#888', 'unknown rarity color is #888');

console.log('\n=== getRandomRelicId Tests ===');

gameState.relics = [];
const randomId1 = getRandomRelicId();
assert(randomId1 !== null, 'getRandomRelicId returns a value when no relics equipped');
assert(window.RELICS_V62[randomId1] !== undefined, 'getRandomRelicId returns valid relic id');

// Exclude test
const excludeId = 'relic_ankh';
const randomExcluded = getRandomRelicId([excludeId]);
assert(randomExcluded !== excludeId, `getRandomRelicId respects excludeIds (excludes ${excludeId})`);

// When all relics are excluded/owned, returns null
gameState.relics = Object.keys(window.RELICS_V62);
assert(getRandomRelicId([]) === null, 'getRandomRelicId returns null when all relics owned');

console.log('\n=== Relic Hook Functions Tests ===');

// Test onStartOfCombat hook for relic_healing_charm
gameState.relics = ['lifeCharm'];
gameState.playerHp = 50;
triggerRelicHook('onStartOfCombat');
assert(gameState.playerHp === 53, 'lifeCharm onStartOfCombat heals 3 HP');

// Test onTurnStart hook (relic_skull gives +1 energy)
gameState.relics = ['relic_skull'];
gameState.energy = 3;
triggerRelicHook('onTurnStart');
assert(gameState.energy === 4, 'relic_skull onTurnStart gives +1 energy');

// Test onAttackDealt hook (rustyRing)
gameState.relics = ['rustyRing'];
const rustyRingRelic = window.RELICS_V62['rustyRing'];
if (rustyRingRelic && typeof rustyRingRelic.onAttackDealt === 'function') {
  const modifiedDamage = rustyRingRelic.onAttackDealt({}, 10);
  assert(modifiedDamage === 11, 'rustyRing onAttackDealt adds +1 damage');
}

// Test burningCore attack bonus percent
gameState.relics = ['burningCore'];
const burningCoreRelic = window.RELICS_V62['burningCore'];
if (burningCoreRelic && typeof burningCoreRelic.onAttackDealt === 'function') {
  const modifiedDamage = burningCoreRelic.onAttackDealt({}, 10);
  assert(modifiedDamage === 12, 'burningCore onAttackDealt adds 20% damage');
}

console.log('\n=== V67 New Relics Tests ===');

// Test rustyRing effect
const rustyRing = window.RELICS_V62['rustyRing'];
assert(rustyRing.effect.attackBonus === 1, 'rustyRing has attackBonus: 1');

// Test lifeCharm effect
const lifeCharm = window.RELICS_V62['lifeCharm'];
assert(lifeCharm.effect.healOnCombatStart === 3, 'lifeCharm has healOnCombatStart: 3');

// Test swiftBoots effect
const swiftBoots = window.RELICS_V62['swiftBoots'];
assert(swiftBoots.effect.energyOnFirstCard === 1, 'swiftBoots has energyOnFirstCard: 1');

// Test burningCore effect
const burningCore = window.RELICS_V62['burningCore'];
assert(burningCore.effect.attackBonusPercent === 20, 'burningCore has attackBonusPercent: 20');
assert(burningCore.effect.burn === true, 'burningCore has burn: true');

// Test cursedBottle effect
const cursedBottle = window.RELICS_V62['cursedBottle'];
assert(cursedBottle.effect.weakChance === 0.15, 'cursedBottle has weakChance: 0.15');

// Test darkHeart effect
const darkHeart = window.RELICS_V62['darkHeart'];
assert(darkHeart.effect.attackBonus === 2, 'darkHeart has attackBonus: 2');
assert(darkHeart.effect.healOnKill === 5, 'darkHeart has healOnKill: 5');

// ===== Summary =====

const rate = ((passed / (passed + failed)) * 100).toFixed(1);
console.log(`\n=== relics-loader.js Tests Summary ===`);
console.log(`Passed: ${passed}/${passed + failed} (${rate}%)`);
console.log(`Required: 80%`);

if (passed / (passed + failed) >= 0.8 && failed === 0) {
  console.log('✅ All relics-loader.js tests PASSED!');
} else {
  console.log('❌ Some tests FAILED');
}
