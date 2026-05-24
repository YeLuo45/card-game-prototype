// ===== V84 AIMemory 测试套件 =====
'use strict';

const fs = require('fs');
const path = require('path');
const aiMemoryCode = fs.readFileSync(path.join(__dirname, 'ai-memory.js'), 'utf8');

global.window = {};
global.indexedDB = null;
eval(aiMemoryCode);

const AIMemory = window.AIMemory;
const getAISessionResult = window.getAISessionResult;

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

function assertApprox(actual, expected, msg, tolerance = 0.05) {
  if (Math.abs(actual - expected) <= tolerance) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ FAIL: ${msg} (expected ~${expected}, got ${actual})`); }
}

async function runTests() {
  console.log('=== AIMemory L0-L4 Layered Memory Tests ===\n');

  // Test 1: Constructor
  console.log('--- Constructor ---');
  const memory = new AIMemory();
  assert(memory.initialized === true, 'AIMemory initialized');
  assertEq(memory.maxL1, 20, 'maxL1 = 20');
  assertEq(memory.L1.length, 0, 'L1 starts empty');
  assert(typeof memory.L2.entries === 'object', 'L2.entries initialized');
  assert(typeof memory.L3.patterns === 'object', 'L3.patterns initialized');

  // Test 2: L0 capture
  console.log('\n--- L0 Instant Memory ---');
  const mockGameState = {
    playerHp: 60, playerMaxHp: 80, playerShield: 10, energy: 2, maxEnergy: 3, turn: 3,
    hand: [{ id: 'fireball' }], drawPile: [{ id: 'strike' }], discardPile: [],
    gold: 50, relics: [{ id: 'r1' }],
    enemyHp: 30, enemyMaxHp: 100, enemyArmor: 5,
    playerDebuffs: [], enemyDebuffs: [{ id: 'burn', stacks: 3 }]
  };
  const l0 = memory.captureL0(mockGameState, 'test_action');
  assert(typeof l0.timestamp === 'number', 'L0 has timestamp');
  assertEq(l0.playerHp, 60, 'L0 captures playerHp');
  assertEq(l0.energy, 2, 'L0 captures energy');
  assertEq(l0.turn, 3, 'L0 captures turn');
  assert(l0.hpRatio > 0 && l0.hpRatio < 1, 'L0 hpRatio valid');
  assertEq(l0.enemyHpRatio, 0.3, 'L0 enemyHpRatio correct');
  const retrievedL0 = memory.getL0();
  assertEq(retrievedL0.playerHp, 60, 'getL0() returns correct data');

  // Test 3: L1 archive basic
  console.log('\n--- L1 Situational Memory ---');
  memory.L1 = [];
  const result1 = {
    victory: true, chapter: 1, floor: 5, finalHp: 45, maxHp: 80, gold: 120,
    relicsGained: [{ id: 'new_relic' }], enemyName: 'Goblin Scout',
    keyCards: ['fireball', 'shield', 'strike'], comboCount: 3,
    damageDealt: 85, damageTaken: 35, cardsPlayed: 12
  };
  memory.archiveSession(result1);
  assertEq(memory.L1.length, 1, 'L1 has 1 entry after archive');
  assert(memory.L1[0].victory === true, 'L1 entry has victory=true');
  assertEq(memory.L1[0].enemyType, 'normal', 'Goblin Scout classified as normal');
  assert(memory.L1[0].performance > 0.5, 'Performance score valid');

  // Test 4: L1 with Boss
  memory.L1 = [];
  memory.archiveSession({ victory: true, enemyName: 'Boss Dragon Lord', finalHp: 50, maxHp: 80 });
  assertEq(memory.L1[0].enemyType, 'boss', 'Boss Dragon Lord classified as boss');

  // Test 5: L1 getL1 filter
  console.log('\n--- L1 Filtering ---');
  memory.L1 = [
    { id: 1, victory: true, enemyType: 'normal' },
    { id: 2, victory: false, enemyType: 'boss' },
    { id: 3, victory: true, enemyType: 'normal' },
    { id: 4, victory: false, enemyType: 'elite' }
  ];
  assertEq(memory.getL1({ enemyType: 'normal' }).length, 2, 'filter enemyType=normal → 2');
  assertEq(memory.getL1({ victory: true }).length, 2, 'filter victory=true → 2');
  assertEq(memory.getL1({ recentN: 3 }).length, 3, 'filter recentN=3 → 3');

  // Test 6: L2 card relations
  console.log('\n--- L2 Semantic Memory ---');
  memory.L2 = { entries: {} };
  memory.learnCardRelation('fireball', 'burn', 'synergy', 0.8);
  memory.learnCardRelation('fireball', 'burn', 'synergy', 0.7);
  assertEq(Object.keys(memory.L2.entries).length, 1, 'L2 entry created for fireball_burn');
  const l2Results = memory.getL2('fireball');
  assert(l2Results.length > 0, 'getL2 returns related cards');
  assertApprox(l2Results[0].strength, 0.75, 'L2 relation strength normalized to average');

  // Test 7: L3 pattern extraction
  console.log('\n--- L3 Procedural Memory ---');
  memory.L3 = { patterns: {} };
  memory.L1 = [
    { victory: true, keyCards: ['fireball', 'strike'], finalL0: { hpRatio: 0.8 } },
    { victory: true, keyCards: ['fireball'], finalL0: { hpRatio: 0.7 } },
    { victory: false, keyCards: ['fireball'], finalL0: { hpRatio: 0.3 } }
  ];
  memory._extractPatternsFromL1();
  assert(Object.keys(memory.L3.patterns).length > 0, 'L3 patterns extracted from L1');
  const l3Results = memory.getL3({ hpRatio: 0.75 });
  assert(l3Results.length > 0, 'getL3 with hpRatio=0.75 returns patterns');

  // Test 8: L4 meta memory
  console.log('\n--- L4 Meta Memory ---');
  memory.L4 = { learningRate: 0.1, adaptationRate: 0.05, totalMatches: 0, winRate: 0.5, opponentProfiles: {} };
  memory._updateL4({ victory: true, enemyType: 'boss', finalHp: 50 });
  assertEq(memory.L4.totalMatches, 1, 'L4 totalMatches incremented');
  assert(memory.L4.winRate > 0.5, 'L4 winRate updated after win');

  memory._updateL4({ victory: false, enemyType: 'boss', finalHp: 10 });
  assertEq(memory.L4.totalMatches, 2, 'L4 totalMatches = 2 after second session');
  assert(memory.L4.winRate > 0 && memory.L4.winRate <= 1, 'L4 winRate is valid (1 win / 2 total)');

  // Test 9: getL4
  const bossInfo = memory.getL4('boss');
  assert(bossInfo.totalMatches === 2, 'getL4(boss) returns totalMatches=2');
  assert(typeof bossInfo.winRate === 'number', 'getL4(boss) returns winRate');
  assert(bossInfo.winRate > 0 && bossInfo.winRate <= 1, 'boss profile winRate is valid');

  const unknownInfo = memory.getL4('unknown');
  assert(typeof unknownInfo.totalMatches === 'number', 'getL4(unknown) returns totalMatches');
  assert(typeof unknownInfo.winRate === 'number', 'getL4(unknown) returns winRate (base value)');

  // Test 10: Decision advice
  console.log('\n--- Decision Advice ---');
  const advice1 = memory.getDecisionAdvice({ hpRatio: 0.8, energy: 3, enemyType: 'normal' });
  assert(advice1.aggression > 0.5, 'High HP → aggression > 0.5');
  assert(advice1.recommendedAction === 'attack', 'High HP → recommend attack');

  const advice2 = memory.getDecisionAdvice({ hpRatio: 0.2, energy: 2, enemyType: 'normal' });
  assert(advice2.aggression < 0.5, 'Low HP → aggression < 0.5');
  assert(advice2.recommendedAction === 'defend', 'Low HP → recommend defend');

  const advice3 = memory.getDecisionAdvice({ hpRatio: 0.5, enemyHpRatio: 0.1, energy: 3, enemyType: 'normal' });
  assert(advice3.aggression > 0.8, 'Enemy low HP → high aggression (kill shot)');

  // Test 11: Stats
  console.log('\n--- Stats ---');
  const stats = memory.getStats();
  assert(typeof stats.L1Count === 'number', 'getStats returns L1Count');
  assert(typeof stats.L2Relations === 'number', 'getStats returns L2Relations');
  assert(typeof stats.L3Patterns === 'number', 'getStats returns L3Patterns');
  assert(typeof stats.L4.totalMatches === 'number', 'getStats returns L4.totalMatches');

  // Test 12: Clear
  console.log('\n--- Clear ---');
  memory.clear();
  assertEq(memory.L1.length, 0, 'clear() resets L1');
  assertEq(Object.keys(memory.L2.entries).length, 0, 'clear() resets L2');
  assertEq(Object.keys(memory.L3.patterns).length, 0, 'clear() resets L3');
  assert(memory.L4.totalMatches === 0, 'clear() resets L4.totalMatches');

  // Test 13: getAISessionResult
  console.log('\n--- getAISessionResult ---');
  window.gameState = {
    playerHp: 55, playerMaxHp: 80, gold: 100, currentFloor: 3,
    relics: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }],
    enemy: { name: 'Elite Ghost' },
    battleLog: [
      { message: '使用火球术，造成 15 伤害' },
      { message: '打出护盾' },
      { message: '受到 8 伤害' }
    ]
  };
  window.chapterState = { currentChapter: 2 };

  const sessionResult = getAISessionResult(true);
  assert(sessionResult.victory === true, 'getAISessionResult returns victory');
  assertEq(sessionResult.finalHp, 55, 'getAISessionResult captures finalHp');
  assert(typeof sessionResult.chapter === 'number', 'getAISessionResult captures chapter as number');
  assert(Array.isArray(sessionResult.keyCards), 'getAISessionResult returns keyCards array');

  // Test 14: Enemy classification edge cases
  console.log('\n--- Enemy Classification ---');
  memory.L1 = [];
  const tests = [
    { name: 'Boss of the Underworld', expected: 'boss' },
    { name: 'Elite Knight', expected: 'elite' },
    { name: 'Slime', expected: 'slime' },
    { name: 'Ghost Warrior', expected: 'ghost' },
    { name: 'Demon Lord', expected: 'demon' },
    { name: 'Ancient Dragon', expected: 'dragon' },
    { name: 'Goblin Scout', expected: 'normal' }
  ];
  for (const t of tests) {
    memory.archiveSession({ victory: true, enemyName: t.name, finalHp: 50, maxHp: 80 });
    assertEq(memory.L1[0].enemyType, t.expected, `Classifies "${t.name}" as ${t.expected}`);
    memory.L1 = [];
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  const passRate = ((passed / (passed + failed)) * 100).toFixed(1);
  console.log(`Pass Rate: ${passRate}%`);
  console.log(`Required: 80%`);

  if (passed / (passed + failed) >= 0.8 && failed === 0) {
    console.log('\n✓ All AIMemory L0-L4 tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});