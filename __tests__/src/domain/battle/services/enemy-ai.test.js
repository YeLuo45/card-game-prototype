// ===== V85 enemy-ai.js 测试套件 =====
// 测试环境: Node.js

'use strict';

const fs = require('fs');
const path = require('path');

// 加载 enemy-ai.js 到当前作用域
const enemyAiCode = fs.readFileSync(path.join(__dirname, 'enemy-ai.js'), 'utf8');
eval(enemyAiCode);

// Mock window for browser globals
global.window = global.window || {};

// ===== 测试辅助 =====

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

// ===== Fixture =====

function makeState(overrides = {}) {
  return Object.assign({
    enemyHp: 100, enemyMaxHp: 100, enemyEnergy: 3,
    playerHp: 80, playerMaxHp: 100, playerShield: 0,
    onBossPhaseChange: null
  }, overrides);
}

// ===== Tests =====

console.log('\n=== EnemyAI Basic Tests ===');

const aiRandom = new EnemyAI('random', { difficulty: 1.0 });
assert(aiRandom.type === 'random', 'random AI type');
assert(aiRandom.difficulty === 1.0, 'difficulty config');
assert(aiRandom.getTypeName() === '随机', 'getTypeName random');
assert(aiRandom.getState().type === 'random', 'getState returns type');

const aiAggro = new EnemyAI('aggressive', { difficulty: 1.5 });
assert(aiAggro.type === 'aggressive', 'aggressive AI type');
assert(aiAggro.difficulty === 1.5, 'aggressive difficulty');

const aiDef = new EnemyAI('defensive');
assert(aiDef.type === 'defensive', 'defensive AI type');

const aiCtrl = new EnemyAI('control');
assert(aiCtrl.type === 'control', 'control AI type');

const aiBoss = new EnemyAI('boss', {
  difficulty: 2.0,
  specialAbility: { every: 3 },
  secondPhaseThreshold: 0.5
});
assert(aiBoss.type === 'boss', 'boss AI type');
assert(aiBoss.secondPhaseThreshold === 0.5, 'secondPhaseThreshold');

console.log('\n=== chooseIntent Tests ===');

const intents = ['attack', 'defend', 'heavy', 'buff'];

const choice = aiRandom.chooseIntent(intents, makeState());
assert(intents.includes(choice), `random chooseIntent returns valid intent: ${choice}`);

// 连续决策不会报错
for (let i = 0; i < 5; i++) {
  aiRandom.chooseIntent(intents, makeState({ enemyHp: 20 }));
}
assert(true, 'multiple chooseIntent calls succeed');

const aggChoice = aiAggro.chooseIntent(intents, makeState({ enemyHp: 15, enemyEnergy: 4 }));
assert(intents.includes(aggChoice), `aggressive chooseIntent returns: ${aggChoice}`);

const defChoice = aiDef.chooseIntent(intents, makeState({ enemyHp: 40, playerShield: 20 }));
assert(intents.includes(defChoice), `defensive chooseIntent returns: ${defChoice}`);

const ctrlChoice = aiCtrl.chooseIntent(intents, makeState({ enemyHp: 80, enemyEnergy: 1 }));
assert(intents.includes(ctrlChoice), `control chooseIntent returns: ${ctrlChoice}`);

const bossChoice = aiBoss.chooseIntent(intents, makeState({ enemyHp: 100 }));
assert(intents.includes(bossChoice), `boss chooseIntent returns: ${bossChoice}`);

// 传入空intents不应崩溃
const emptyChoice = aiRandom.chooseIntent([], makeState());
assert(emptyChoice === 'attack', 'empty intents defaults to attack');

// 缺少gameState不应崩溃
const noStateChoice = aiRandom.chooseIntent(intents, {});
assert(intents.includes(noStateChoice) || noStateChoice === 'attack', 'no gameState handled');

console.log('\n=== Boss Second Phase Tests ===');

const bossFresh = new EnemyAI('boss', { secondPhaseThreshold: 0.5 });
bossFresh.chooseIntent(intents, makeState({ enemyHp: 100, enemyMaxHp: 100 }));
assert(bossFresh.getState().inSecondPhase === false, 'boss not in second phase at full HP');

bossFresh.chooseIntent(intents, makeState({ enemyHp: 49, enemyMaxHp: 100 }));
assert(bossFresh.getState().inSecondPhase === true, 'boss enters second phase below threshold');

console.log('\n=== evaluateHand Tests ===');

const hand = [
  { name: '火球术', cost: 2, effect: { damage: 10 } },
  { name: '格挡', cost: 1, effect: { block: 5 } },
  { name: '重击', cost: 3, effect: { damage: 20, heavy: true } }
];

const scoredAgg = aiAggro.evaluateHand(hand, makeState({ enemyHp: 20 }));
assert(scoredAgg.length === 3, 'aggressive evaluateHand returns all cards');
assert(scoredAgg[0].score >= scoredAgg[1].score, 'aggressive prefers damage');

const scoredDef = aiDef.evaluateHand(hand, makeState({ playerHp: 30, playerMaxHp: 100 }));
assert(scoredDef.length === 3, 'defensive evaluateHand returns all cards');
assert(scoredDef.find(s => s.card.name === '格挡').score > 0, 'defensive values block');

const scoredCtrl = aiCtrl.evaluateHand(hand, makeState({}));
assert(scoredCtrl.length === 3, 'control evaluateHand returns all cards');

const preferAgg = aiAggro.getPreferredCard(scoredAgg);
assert(preferAgg !== null, 'getPreferredCard returns a card');
assert(preferAgg.name === '重击', `aggressive prefers heavy attack: ${preferAgg.name}`);

const preferDef = aiDef.getPreferredCard(scoredDef);
assert(preferDef !== null, 'defensive getPreferredCard returns a card');

assert(aiAggro.getPreferredCard([]) === null, 'getPreferredCard handles empty array');
assert(aiAggro.getPreferredCard(null) === null, 'getPreferredCard handles null');

console.log('\n=== shouldUseSpecialAbility Tests ===');

const specBoss = new EnemyAI('boss', { specialAbility: { every: 3 } });
specBoss._state.turnCount = 2;
assert(!specBoss.shouldUseSpecialAbility({}), 'turn 2 not special (every 3)');
specBoss._state.turnCount = 3;
assert(specBoss.shouldUseSpecialAbility({}), 'turn 3 triggers special');
specBoss._state.turnCount = 6;
assert(specBoss.shouldUseSpecialAbility({}), 'turn 6 triggers special');
specBoss._state.turnCount = 7;
assert(!specBoss.shouldUseSpecialAbility({}), 'turn 7 no special');

const noSpecBoss = new EnemyAI('boss');
assert(!noSpecBoss.shouldUseSpecialAbility({}), 'no specialAbility returns false');

console.log('\n=== SkillCrystallizer Integration Tests (V85) ===');

// Mock skillCrystallizer on window
let mockSkillInvoked = false;
global.window.skillCrystallizer = {
  matchSkill(ctx) {
    mockSkillInvoked = true;
    if (ctx.enemyType === 'boss' && ctx.hpRatio < 0.3) {
      return { confidence: 0.9, action: { aggressionLevel: 0.8, preferredCards: ['火球术'] } };
    }
    return null;
  }
};

const aiWithSkill = new EnemyAI('aggressive');
aiWithSkill.chooseIntent(['attack', 'defend'], makeState({ playerHp: 20, playerMaxHp: 100, enemyHp: 80, enemyMaxHp: 100 }));
assert(mockSkillInvoked, 'skillCrystallizer.matchSkill is called during chooseIntent');

// Skill advice with high confidence overrides intent
mockSkillInvoked = false;
global.window.skillCrystallizer.matchSkill = () => ({
  confidence: 0.9,
  action: { aggressionLevel: 0.8, preferredCards: ['火球术'] }
});
const overriddenChoice = aiWithSkill.chooseIntent(['attack', 'defend', 'heavy'], makeState({ playerHp: 20, playerMaxHp: 100, enemyHp: 80, enemyMaxHp: 100 }));
assert(overriddenChoice === 'attack', `skill advice overrides to attack, got: ${overriddenChoice}`);

console.log('\n=== Error Handling Tests ===');

const badAi = new EnemyAI('nonexistent');
assert(badAi.type === 'nonexistent', 'unknown type handled');
const badChoice = badAi.chooseIntent(['attack'], makeState());
assert(badChoice === 'attack', 'unknown type defaults to attack');

// 无效state不崩溃
const nullStateChoice = aiAggro.chooseIntent(intents, { enemyHp: 50, enemyMaxHp: 100, enemyEnergy: 3, playerHp: 50, playerMaxHp: 100 });
assert(intents.includes(nullStateChoice) || nullStateChoice === 'attack', 'null state handled');

console.log('\n=== getState Isolation Tests ===');

const state1 = aiBoss.getState();
state1.turnCount = 999;
const state2 = aiBoss.getState();
assert(state2.turnCount !== 999, 'getState returns copy, not reference');

// ===== Summary =====

const rate = ((passed / (passed + failed)) * 100).toFixed(1);
console.log(`\n=== enemy-ai.js Tests Summary ===`);
console.log(`Passed: ${passed}/${passed + failed} (${rate}%)`);
console.log(`Required: 80%`);

if (passed / (passed + failed) >= 0.8 && failed === 0) {
  console.log('✅ All enemy-ai.js tests PASSED!');
} else {
  console.log('❌ Some tests FAILED');
}