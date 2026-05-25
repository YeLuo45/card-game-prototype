'use strict';
const fs = require('fs');
const path = require('path');

// PRE-MOCKS
global.localStorage = {
  _store: {},
  getItem(k) { return this._store.hasOwnProperty(k) ? this._store[k] : null; },
  setItem(k, v) { this._store[k] = v; },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};
global.window = global;
global.document = { addEventListener: () => {} };

// LOAD AIMemory
const aiMemoryCode = fs.readFileSync(path.join(__dirname, 'ai-memory.js'), 'utf8');
eval(aiMemoryCode);
global.AIMemory = AIMemory;

// LOAD DreamManager (from appended code)
const dmCode = fs.readFileSync(path.join(__dirname, 'dream-code.txt'), 'utf8');
eval(dmCode);
global.DreamManager = DreamManager;

// MOCK DATA
const mockAiMemory = new AIMemory();
mockAiMemory.L1 = [
  { id: 1001, timestamp: new Date().toISOString(), victory: true, chapter: 1, floor: 3, finalHp: 65, maxHp: 80, gold: 50, relicsGained: ['relic1'], enemyName: 'Slime', enemyType: 'normal', keyEvents: [], keyCards: ['打击', '防御', '重击'], comboCount: 4, damageDealt: 120, damageTaken: 15, cardsPlayed: 18, finalL0: { turn: 12, hpRatio: 0.8125 } },
  { id: 1002, timestamp: new Date().toISOString(), victory: true, chapter: 1, floor: 5, finalHp: 20, maxHp: 80, gold: 30, relicsGained: [], enemyName: 'Elite Guard', enemyType: 'elite', keyEvents: [], keyCards: ['防守', '反击', '治疗'], comboCount: 2, damageDealt: 80, damageTaken: 60, cardsPlayed: 22, finalL0: { turn: 15, hpRatio: 0.25 } },
  { id: 1003, timestamp: new Date().toISOString(), victory: false, chapter: 1, floor: 7, finalHp: 35, maxHp: 80, gold: 0, relicsGained: [], enemyName: 'Boss Dragon', enemyType: 'boss', keyEvents: [], keyCards: ['攻击', '攻击', '攻击'], comboCount: 0, damageDealt: 50, damageTaken: 45, cardsPlayed: 10, finalL0: { turn: 8, hpRatio: 0.4375 } }
];
mockAiMemory.L4 = { totalMatches: 3, winRate: 0.667, opponentProfiles: {} };

// TESTS
let passed = 0, failed = 0;
function assert(c, msg) {
  if (c) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ ${msg}`); }
}

(async () => {
  console.log('\n=== DreamManager Tests ===\n');

  // Test 1: Constructor
  console.log('Test 1: Constructor');
  const dm = new DreamManager(mockAiMemory);
  assert(dm, 'DreamManager instance created');
  assert(dm.aiMemory === mockAiMemory, 'aiMemory reference set');
  assert(dm.dreams.length === 0, 'dreams array initialized empty');
  assert(dm.maxDreams === 50, 'maxDreams set to 50');

  // Test 2: generateDreamSummary with no sessions
  console.log('\nTest 2: generateDreamSummary with empty sessions');
  const emptyAi = new AIMemory();
  const emptyDm = new DreamManager(emptyAi);
  const dream1 = emptyDm.generateDreamSummary(9999);
  assert(dream1 === null, 'returns null when no sessions');

  // Test 3: generateDreamSummary basic
  console.log('\nTest 3: generateDreamSummary basic generation');
  const dream2 = dm.generateDreamSummary(1001);
  assert(dream2 !== null, 'generated dream from session 1001');
  assert(typeof dream2.id === 'string' && dream2.id.startsWith('dream_'), 'dream id format correct');
  assert(dream2.gameId === 1001, 'gameId set correctly');
  assert(typeof dream2.title === 'string', 'title is string');
  assert(typeof dream2.summary === 'string', 'summary is string');
  assert(Array.isArray(dream2.keyDecisions), 'keyDecisions is array');

  // Test 4: Emotion analysis
  console.log('\nTest 4: Emotion analysis');
  const tenseDream = dm.generateDreamSummary(1002); // low HP victory
  assert(tenseDream.emotion === 'tense', 'low HP victory = tense emotion');
  const excitingDream = dm.generateDreamSummary(1001); // high HP victory
  assert(excitingDream.emotion === 'exciting', 'high HP victory = exciting emotion');

  // Test 5: Archetype analysis
  console.log('\nTest 5: Archetype analysis');
  const archResult = dm._analyzeArchetype({ keyCards: ['防御'], damageDealt: 120, damageTaken: 15 });
  assert(archResult === 'defensive', '防御 card → defensive archetype');
  const balancedArch = dm._analyzeArchetype({ keyCards: ['治疗'], damageDealt: 50, damageTaken: 50 });
  assert(balancedArch === 'balanced', 'no match → balanced archetype');

  // Test 6: Save and retrieve dream
  console.log('\nTest 6: Save and retrieve dream');
  const savedDream = await dm.saveDream(dream2);
  assert(savedDream === dream2, 'saveDream returns the dream');
  assert(dm.dreams.length === 1, 'dream saved to dreams array');

  // Test 7: getDreamFragments
  console.log('\nTest 7: getDreamFragments');
  const fragments = dm.getDreamFragments('player1', 5);
  assert(Array.isArray(fragments) && fragments.length === 1, 'returns array with 1 fragment');
  assert(fragments[0].id === dream2.id, 'fragment has correct id');
  assert(!('keyDecisions' in fragments[0]), 'fragment excludes keyDecisions');

  // Test 8: getDreamDetail
  console.log('\nTest 8: getDreamDetail');
  const detail = dm.getDreamDetail(dream2.id);
  assert(detail && detail.id === dream2.id, 'detail found with correct id');
  assert(Array.isArray(detail.keyDecisions), 'detail includes keyDecisions');
  const notFound = dm.getDreamDetail('nonexistent');
  assert(notFound === null, 'returns null for nonexistent id');

  // Test 9: Multiple dreams
  console.log('\nTest 9: Multiple dreams');
  await dm.saveDream(dm.generateDreamSummary(1002));
  await dm.saveDream(dm.generateDreamSummary(1003));
  assert(dm.dreams.length === 3, '3 dreams stored');
  const recentFragments = dm.getDreamFragments('player1', 10);
  assert(recentFragments.length === 3, 'getDreamFragments returns all 3');

  // Test 10: Max dreams limit
  console.log('\nTest 10: Max dreams limit');
  const smallDm = new DreamManager(mockAiMemory);
  smallDm.maxDreams = 2;
  await smallDm.saveDream(dm.generateDreamSummary(1001));
  await smallDm.saveDream(dm.generateDreamSummary(1002));
  await smallDm.saveDream(dm.generateDreamSummary(1003));
  assert(smallDm.dreams.length === 2, 'max dreams enforced at 2');

  // Test 11: Prune old dreams
  console.log('\nTest 11: Prune old dreams');
  const pruneDm = new DreamManager(mockAiMemory);
  pruneDm.dreams = ['a', 'b', 'c', 'd', 'e'];
  await pruneDm.pruneOldDreams(3);
  assert(pruneDm.dreams.length === 3, 'pruned to 3 dreams');

  // Test 12: Stats
  console.log('\nTest 12: Stats');
  const stats = dm.getStats();
  assert(stats.dreamCount === 3, 'dreamCount is 3');
  assert(typeof stats.emotionDistribution === 'object', 'emotionDistribution is object');
  assert(typeof stats.archetypeDistribution === 'object', 'archetypeDistribution is object');

  // Test 13: _analyzeEmotion edge cases
  console.log('\nTest 13: _analyzeEmotion edge cases');
  const dm3 = new DreamManager(mockAiMemory);
  const comboSession = { ...mockAiMemory.L1[0], comboCount: 8, victory: false, finalHp: 60, maxHp: 80 };
  const comboResult = dm3._analyzeEmotion(comboSession);
  assert(comboResult.primary === 'strategic', 'non-victory high combo = strategic');
  const highDmgSession = { victory: false, finalHp: 50, maxHp: 80, comboCount: 0, damageDealt: 150 };
  const highDmgResult = dm3._analyzeEmotion(highDmgSession);
  assert(highDmgResult.primary === 'strategic', 'high damage non-victory = strategic');

  // Test 14: _analyzeArchetype edge cases
  console.log('\nTest 14: _analyzeArchetype edge cases');
  const defResult = dm3._analyzeArchetype({ keyCards: [], damageDealt: 30, damageTaken: 100 });
  assert(defResult === 'defensive', 'high damage taken = defensive');
  const ctrlResult = dm3._analyzeArchetype({ keyCards: ['抽牌', '过牌'], damageDealt: 50, damageTaken: 50 });
  assert(ctrlResult === 'control', 'draw cards = control');
  const aggResult = dm3._analyzeArchetype({ keyCards: ['攻击'], damageDealt: 50, damageTaken: 50 });
  assert(aggResult === 'aggressive', 'attack card = aggressive');

  // Test 15: _extractKeyDecisions
  console.log('\nTest 15: _extractKeyDecisions');
  const decisions1 = dm3._extractKeyDecisions({ finalHp: 15, maxHp: 80, victory: true, comboCount: 0, finalL0: { turn: 10 } });
  assert(decisions1.length >= 1 && decisions1[0].outcome === '惊险逆转', 'low HP victory = 惊险逆转');
  const decisions2 = dm3._extractKeyDecisions({ finalHp: 70, maxHp: 80, victory: true, comboCount: 5, finalL0: { turn: 10 }, damageDealt: 100 });
  assert(decisions2.some(d => d.context && d.context.includes('5连击')), 'combo >= 3 = 连击决策');

  // Test 16: _generateTitle
  console.log('\nTest 16: _generateTitle');
  const title1 = dm3._generateTitle({ victory: true, finalHp: 70, maxHp: 80 }, { primary: 'exciting' });
  assert(title1.includes('HP') || title1.includes('高压') || title1.includes('完美'), 'title generated for exciting');
  const title2 = dm3._generateTitle({ victory: false, finalHp: 30, maxHp: 80 }, { primary: 'defensive' });
  assert(title2.includes('HP') || title2.includes('防守') || title2.includes('代价'), 'title generated for defensive loss');

  // Test 17: _generateSummary
  console.log('\nTest 17: _generateSummary');
  const summary1 = dm3._generateSummary({ enemyName: 'Slime', victory: true, finalHp: 65, maxHp: 80, comboCount: 2 }, { primary: 'exciting' }, 'aggressive');
  assert(summary1.includes('Slime') && summary1.includes('获胜') && summary1.includes('进攻型'), 'summary includes all fields');

  // Test 18: generateFromSessions
  console.log('\nTest 18: generateFromSessions');
  const freshDm = new DreamManager(mockAiMemory);
  await freshDm.generateFromSessions();
  assert(freshDm.dreams.length >= 1, 'generated dreams from sessions');

  // Test 19: Dream data integrity
  console.log('\nTest 19: Dream data integrity');
  const testDream = dm.generateDreamSummary(1001);
  assert(testDream.timestamp > 0 && typeof testDream.emotion === 'string' && ['exciting', 'tense', 'strategic', 'defensive', 'neutral'].includes(testDream.emotion), 'emotion is valid');
  assert(['aggressive', 'defensive', 'control', 'balanced'].includes(testDream.archetype), 'archetype is valid');

  // Test 20: IndexedDB fallback
  console.log('\nTest 20: IndexedDB fallback');
  const dbFallbackDm = new DreamManager(mockAiMemory);
  assert(dbFallbackDm.dbName === 'DreamDB' && dbFallbackDm.storeName === 'dreams', 'dbName and storeName set correctly');

  // Test 21: Dream title - tense victory
  console.log('\nTest 21: Dream title variations');
  const tenseTitle = dm3._generateTitle({ victory: true, finalHp: 10, maxHp: 80 }, { primary: 'tense' });
  assert(tenseTitle.includes('逆转') || tenseTitle.includes('HP'), 'tense victory title generated');

  // Test 22: Dream title - strategic loss
  const stratLossTitle = dm3._generateTitle({ victory: false, finalHp: 60, maxHp: 80 }, { primary: 'strategic' });
  assert(stratLossTitle.includes('HP') || stratLossTitle.includes('策略'), 'strategic loss title generated');

  // RESULTS
  const total = passed + failed;
  const passRate = passed / total;
  console.log(`\n=== Results: ${passed}/${total} passed (${(passRate*100).toFixed(1)}%) ===\n`);
  if (failed > 0 || passRate < 0.8) {
    console.log(`FAIL: pass_rate ${passRate.toFixed(2)} < 0.80 threshold`);
    process.exit(1);
  }
  process.exit(0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });